import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../http-server.mjs';
import {parseOutput} from '../openrouter.mjs';
import {complete,validatePayload} from '../openrouter.mjs';
import {createGame} from '../sim.js';
import {act} from '../life-story.js';
import {modelContext} from '../resident-context.js';
async function using(t,options={}){const server=createServer({...options});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));return `http://127.0.0.1:${server.address().port}`;}
test('public assets serve, server files and credentials never serve',async t=>{
  const base=await using(t);assert.equal((await fetch(base)).status,200);assert.equal((await fetch(base+'/assets/cast/woman-01.png')).status,200);assert.equal((await fetch(base+'/romantic.css')).status,200);assert.equal((await fetch(base+'/assets/yongsan-bluehour-v2.png')).status,200);
  for(const path of ['/.env','/.env.example','/.git/config','/server.mjs','/openrouter.mjs','/package.json','/assets/../.env','/%2e%2e/.env'])assert.equal((await fetch(base+path)).status,404,path);
  const status=await(await fetch(base+'/api/status')).json();assert.equal(status.configured,false);
});
test('unconfigured AI returns fallback and cross-origin requests are blocked',async t=>{
  const base=await using(t);const post=origin=>fetch(base+'/api/intent',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({input:'안녕하세요'})});
  assert.equal((await post('https://example.org')).status,403);assert.equal((await post(base)).status,503);
  assert.equal((await fetch(base+'/api/intent',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{'})).status,400);
});
test('OpenRouter credentials stay upstream; response is validated',async t=>{
  let called=0;const base=await using(t,{apiKey:'test-secret',model:'test/model',fetchImpl:async(url,options)=>{called++;assert.equal(options.headers.Authorization,'Bearer test-secret');assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(JSON.parse(options.body).model,'test/model');return {ok:true,json:async()=>({choices:[{message:{content:'{"intent":"talk"}'}}]})};}});
  const res=await fetch(base+'/api/intent',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({input:'안녕'})});assert.deepEqual(await res.json(),{intent:'talk'});assert.equal(called,1);
  assert(!(await(await fetch(base+'/api/status')).text()).includes('test-secret'));
});
test('provider errors and malformed output do not leak upstream contents',async t=>{
  const base=await using(t,{apiKey:'test-secret',model:'test/model',fetchImpl:async()=>({ok:true,json:async()=>({choices:[{message:{content:'<script>test-secret</script>'}}]})})});
  const res=await fetch(base+'/api/intent',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({input:'안녕'})});assert.equal(res.status,502);assert.deepEqual(await res.json(),{error:'AI unavailable',fallback:true});
  assert.throws(()=>parseOutput('intent','{"intent":"steal","money":999}'));assert.throws(()=>parseOutput('dialogue','{"reply":42}'));assert.deepEqual(parseOutput('intent','```json\n{"intent":"meal"}\n```'),{intent:'meal'});
});
test('model request contains scoped personality, needs, activity and memories',async()=>{
  const s=createGame(()=>.3),r=s.rooms[0],p=r.tenant;s.minute=1000;p.activity='독서';p.memories=[{day:1,label:'챙겨준 도시락'}];const input='네가 좋아하는 건 뭐야?',{event}=act(s,r.id,'talk',input);
  const payload={input,person:{name:p.name,age:p.age,job:p.job,quiet:p.quiet},outcome:{intent:'talk',accepted:true,summary:event.summary,reply:event.reply},...modelContext(s,r,event)};
  assert(validatePayload('dialogue',payload));let seen;
  const result=await complete('dialogue',payload,{apiKey:'test-secret',model:'test/model',fetchImpl:async(url,options)=>{seen=JSON.parse(options.body);return {ok:true,json:async()=>({choices:[{message:{content:'{"reply":"소설을 읽는 시간이 좋아요."}'}}]})};}});
  const sent=JSON.parse(seen.messages[1].content);assert.equal(sent.personality.hobby,payload.personality.hobby);assert.equal(sent.context.activity,'이웃과 대화');assert(sent.memories.some(m=>m.label==='챙겨준 도시락'));assert.equal(result.reply,'소설을 읽는 시간이 좋아요.');assert(!JSON.stringify(sent).includes('test-secret'));
  payload.context.energy=500;assert(!validatePayload('dialogue',payload));
});


test('resident photos use the fixed Qwen model and trusted resident reference without leaking secrets',async t=>{
  let called=0;const base=await using(t,{apiKey:'test-secret',model:'test/model',fetchImpl:async(url,options)=>{called++;assert.equal(url,'https://openrouter.ai/api/v1/images');const body=JSON.parse(options.body);assert.equal(body.model,'qwen/qwen-image-2.1-turbo');assert.equal(body.n,1);assert.equal(body.input_references[0].image_url.url,'https://ordinarypeople1.github.io/room19-yongsan/assets/cast/woman-02.png');return Response.json({data:[{b64_json:'aGVsbG8=',media_type:'image/png'}]});}});
  const post=body=>fetch(base+'/api/photo',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const payload={prompt:'창가에서 차를 마시는 모습',portrait:'woman-02',age:32};
  for(const invalid of [{...payload,portrait:'https://evil.example/x.png'},{...payload,age:17},{...payload,prompt:''},{...payload,prompt:'x'.repeat(601)}])assert.equal((await post(invalid)).status,400);
  const response=await post(payload);assert.equal(response.status,200);const text=await response.text();assert(!text.includes('test-secret'));assert.equal(JSON.parse(text).image,'data:image/png;base64,aGVsbG8=');assert.equal(called,1);
});
test('provider failures never return an invented generated photo',async t=>{
  const base=await using(t,{apiKey:'test-secret',model:'test/model',fetchImpl:async()=>Response.json({error:'provider failed'},{status:502})});
  const response=await fetch(base+'/api/photo',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({prompt:'차 마시는 모습',portrait:'woman-02',age:32})});assert.equal(response.status,502);assert.equal((await response.json()).image,undefined);
});
