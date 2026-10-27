import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,restore,serialize,step} from '../sim.js';
import {act,inferIntent,relationship} from '../life-story.js';
import {knownNeighbors,playerStage,relationshipAction} from '../relationships.js';
import {rememberConversation,STORY_LIMIT} from '../dialogue-memory.js';
import {modelContext} from '../resident-context.js';
import {complete,validatePayload} from '../openrouter.mjs';
const setup=()=>{const s=createGame(()=>.2),r=s.rooms[0],p=r.tenant;s.day=7;s.minute=1000;p.activity='독서';p.quiet=false;p.energy=90;p.happiness=80;return {s,r,p};};
const later=s=>{s.day++;s.minute=1000;for(const r of s.rooms)if(r.tenant){r.tenant.activity='휴식';r.tenant.storyNextAt=0;}};
test('existing neighbors know each other through actual public encounters, not private chats',()=>{
 const {s,r,p}=setup(),q=s.rooms[2].tenant;q.story=[{reply:'남에게 보여주면 안 되는 비밀'}];
 const c=modelContext(s,r,{id:-1},'다른 이웃 알아요?');assert(c.social.neighbors.some(n=>n.name===q.name));assert(!JSON.stringify(c).includes('남에게 보여주면 안 되는 비밀'));assert(c.social.neighbors.every(n=>n.lastEvent));
 const target=s.rooms.find(x=>x.tenant&&x.tenant!==p&&!(p.relations[x.tenant.id]>0));target.tenant.activity='휴식';
 const before=s.cash,answer=relationshipAction(s,r,'introduce');assert(answer.accepted);assert(p.relations[target.tenant.id]>0);assert(target.tenant.relations[p.id]>0);assert.equal(s.cash,before);
 assert(knownNeighbors(s,p).some(n=>n.room===target.id));
});
test('closeness alone does not create dating; dates and explicit agreement do, and housing stays unchanged',()=>{
 const {s,r,p}=setup();p.playerBond=90;const housing=[r.rent,r.deposit,r.lease,s.cash];
 let e=act(s,r.id,'confess','우리 사귀자').event;assert.equal(e.accepted,false);assert.notEqual(p.playerStatus,'dating');
 later(s);later(s);e=act(s,r.id,'date','데이트하자').event;assert(e.accepted);assert.equal(p.playerDates,1);
 later(s);assert(act(s,r.id,'date','데이트하자').event.accepted);assert.equal(p.playerDates,2);
 later(s);assert(act(s,r.id,'confess','우리 사귀자').event.accepted);assert.equal(playerStage(p),'dating');assert.equal(relationship(p),'나와 연인');
 assert.deepEqual([r.rent,r.deposit,r.lease,s.cash],housing);const loaded=restore(serialize(s));assert.equal(loaded.rooms[0].tenant.playerStatus,'dating');assert.equal(loaded.rooms[0].tenant.playerDates,2);
 later(s);assert(act(s,r.id,'breakup','우리 헤어지자').event.accepted);assert.equal(playerStage(p),'ex');assert.deepEqual([r.rent,r.deposit,r.lease,s.cash],housing);
});
test('refusals, existing partners and daily date limits cannot be bypassed',()=>{
 const {s,r,p}=setup();p.playerBond=0;assert.equal(relationshipAction(s,r,'date').accepted,false);assert.equal(p.playerDates,undefined);
 p.playerBond=90;p.partner=s.rooms[2].tenant.id;assert.equal(relationshipAction(s,r,'confess').accepted,false);assert.equal(p.playerStatus,undefined);p.partner=null;
 assert(relationshipAction(s,r,'date').accepted);assert(!relationshipAction(s,r,'date').accepted);assert.equal(p.playerDates,1);
 const raw=JSON.parse(serialize(s));raw.rooms[0].tenant.playerStatus='dating';assert.throws(()=>restore(JSON.stringify(raw)));
 assert.equal(inferIntent('우리 사귀자'),'confess');assert.equal(inferIntent('우리 헤어지자'),'breakup');assert.equal(inferIntent('사귀고 있는 사람이 있어요?'),'unknown');
});
test('official player relationships prevent simultaneous automatic NPC romances and duplicate player partners',()=>{
 const {s,r,p}=setup(),q=s.rooms[2].tenant;p.playerStatus='dating';p.playerDates=2;p.playerRomanceSince=7;p.playerBond=80;p.attraction='both';q.attraction='both';p.relations[q.id]=90;q.relations[p.id]=90;
 s.rng=()=>.1;for(const room of s.rooms)if(room.tenant){room.tenant.start=7;room.tenant.end=16;room.tenant.quiet=true;}s.minute=1070;step(s);assert.equal(p.partner,null);assert.equal(p.playerStatus,'dating');
 const raw=JSON.parse(serialize(s));Object.assign(raw.rooms[2].tenant,{playerStatus:'dating',playerDates:2,playerRomanceSince:7,partner:null});assert.throws(()=>restore(JSON.stringify(raw)));
});
test('specific old conversation survives recent history turnover and save/reload without leaking another resident',()=>{
 const {s,r,p}=setup();const first=act(s,r.id,'talk','제 강아지 이름은 몽실이예요. 기억해주세요.').event;first.reply='몽실이군요. 다음에 안부도 물어볼게요.';rememberConversation(p,first);
 for(let i=0;i<STORY_LIMIT+6;i++){s.minute=1000+i;act(s,r.id,'talk','오늘은 날이 괜찮네요.');}
 assert.equal(p.story.length,STORY_LIMIT);assert(!p.story.some(e=>e.id===first.id));
 const loaded=restore(serialize(s)),room=loaded.rooms[0];const c=modelContext(loaded,room,{id:-1},'지난번에 말한 강아지 이름 기억해요?');assert(c.conversationNotes.some(n=>n.input.includes('몽실이')));assert(c.conversationNotes.some(n=>n.reply.includes('몽실이')));
 const unrelated=modelContext(loaded,room,{id:-1},'103호 이웃은 어떻게 알게 됐어요?');assert(!unrelated.conversationNotes.some(n=>n.input.includes('몽실이')));
 assert.equal(room.tenant.dialogueMemory.find(n=>n.id===first.id).reply,first.reply);
 delete room.tenant.dialogueMemory;room.tenant.story=[first];assert(restore(serialize(loaded)).rooms[0].tenant.dialogueMemory.some(n=>n.id===first.id));
});
test('model payload fixes landlord roles, passes housing/relationship facts, and bounds recalled context',async()=>{
 const {s,r,p}=setup(),context=modelContext(s,r,{id:-1},'월세 좀 올려볼까요?');
 const payload={input:'월세 좀 올려볼까요?',person:{name:p.name,age:p.age,job:p.job,quiet:p.quiet},outcome:{intent:'talk',accepted:true,summary:'월세 이야기를 한다.',reply:'이야기를 듣는다.'},roles:{speaker:'landlord',listener:'tenant'},...context};
 let seen;await complete('dialogue',payload,{apiKey:'test-secret',model:'test/model',fetchImpl:async(u,options)=>{seen=JSON.parse(options.body);return Response.json({choices:[{message:{content:'{"reply":"얼마나 올리시려고요? 저는 지금도 생활비 맞추기가 빠듯해서요."}'}}]});}});
 const sent=JSON.parse(seen.messages[1].content);assert.equal(sent.roles.listener,'landlord');assert.equal(sent.roles.speaker,'tenant');assert.equal(sent.housing.monthlyRent,r.rent);assert.equal(sent.social.playerStage,'strangers');assert(seen.messages[0].content.includes('YOUR LANDLORD'));assert(seen.messages[0].content.includes('conversationNotes'));
 const legacy={...payload};delete legacy.social;delete legacy.housing;delete legacy.conversationNotes;assert(validatePayload('dialogue',legacy));
 assert(!validatePayload('dialogue',{...payload,housing:{...payload.housing,monthlyRent:-1}}));assert(!validatePayload('dialogue',{...payload,social:{...payload.social,playerStage:'forced'}}));
 p.story??=[];for(let i=0;i<80;i++){const e={id:s.nextId++,day:7,minute:1000,input:'약속 기억 '+('가'.repeat(490)),reply:'나'.repeat(400),summary:'대화',pending:false};p.story.push(e);rememberConversation(p,e);}p.story=p.story.slice(-80);
 const packed=modelContext(s,r,{id:-1},'약속 기억해요?');assert(new TextEncoder().encode(JSON.stringify(packed)).length<=22000);
});
