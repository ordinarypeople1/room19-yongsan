import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../http-server.mjs';
import {parseOutput} from '../openrouter.mjs';
async function using(t,options={}){const server=createServer({...options});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));return `http://127.0.0.1:${server.address().port}`;}
test('public assets serve, server files and credentials never serve',async t=>{
  const base=await using(t);assert.equal((await fetch(base)).status,200);assert.equal((await fetch(base+'/assets/cast/woman-01.png')).status,200);
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
