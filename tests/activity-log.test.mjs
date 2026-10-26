import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,restore,serialize} from '../sim.js';
import {act} from '../life-story.js';
import {activityEntry,ACTIVITY_LOG_LIMIT} from '../activity-log.js';
import {personality,modelContext} from '../resident-context.js';
test('minute progression records every game minute including midnight',()=>{
  const s=createGame(()=>.3),p=s.rooms[0].tenant;s.minute=1438;step(s,4);
  assert.deepEqual(p.activityLog.slice(-4).map(e=>[e.day,e.minute]),[[1,1439],[2,0],[2,1],[2,2]]);
  assert.equal(s.minute,2);assert.equal(s.day,2);
});
test('history is bounded, persists and validates imported minute entries',()=>{
  const s=createGame(()=>.3);step(s,400);const p=s.rooms[0].tenant;
  assert.equal(p.activityLog.length,ACTIVITY_LOG_LIMIT);assert.deepEqual(restore(serialize(s)).rooms[0].tenant.activityLog,p.activityLog);
  p.activityLog[0].minute=1440;assert.throws(()=>restore(serialize(s)));
});
test('private descriptions follow actual activity and stay non-graphic',()=>{
  const s=createGame(()=>.3),p=s.rooms[0].tenant;p.activity='샤워 · 비공개';assert.equal(activityEntry(s,p).kind,'private');
  p.activity='둘만의 시간 · 비공개';assert.equal(activityEntry(s,p).kind,'adult');assert.match(activityEntry(s,p).text,/비공개|친밀/);
  p.activity='출근';for(let m=1200;m<1300;m++){s.minute=m;assert.equal(activityEntry(s,p).kind,'life');}
});
test('late private rest notes vary deterministically and only in eligible situations',()=>{
  const s=createGame(()=>.3),p=s.rooms[0].tenant;p.activity='휴식';p.desire=99;let count=0;
  for(let m=1200;m<1440;m++){s.minute=m;const entry=activityEntry(s,p);assert.deepEqual(activityEntry(s,p),entry);if(entry.kind==='adult')count++;}
  assert(count>0&&count<50);s.minute=600;assert.equal(activityEntry(s,p).kind,'life');p.activity='독서';s.minute=1300;assert.equal(activityEntry(s,p).kind,'life');
});
test('own personality, recent actions and relevant dialogue memory reach the context',()=>{
  const s=createGame(()=>.3),r=s.rooms[0],p=r.tenant,q=s.rooms[2].tenant;s.minute=1000;p.activity='독서';
  q.story=[{input:'다른 입주자의 비밀 대화'}];p.memories=[{day:1,label:'건네준 도시락'}];
  p.story=[{id:1000,day:1,input:'무슨 책 좋아해?',reply:'소설을 좋아해요.',summary:'책 이야기를 나눴다.',pending:false}];
  const input='지난번 도시락 괜찮았어?',{event}=act(s,r.id,'talk',input),context=modelContext(s,r,event);
  assert.equal(context.context.activity,'이웃과 대화');assert.equal(context.context.room,r.id);assert(context.memories.some(m=>m.label==='건네준 도시락'));
  assert.equal(context.history[0].input,'무슨 책 좋아해?');assert(context.recentActions.length);assert(!JSON.stringify(context).includes('다른 입주자의 비밀 대화'));
  assert.deepEqual(personality(p),personality(p));assert.notEqual(personality(p).hobby,personality(q).hobby);
});
