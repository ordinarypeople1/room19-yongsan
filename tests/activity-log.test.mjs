import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,restore,serialize} from '../sim.js';
import {act} from '../life-story.js';
import {activityEntry,recordActivities,ACTIVITY_LOG_LIMIT,displayActivity,validActivityLog} from '../activity-log.js';
import {personality,modelContext} from '../resident-context.js';
test('unchanged activities are not recorded again; changes keep minute timestamps across midnight',()=>{
  const s=createGame(()=>.3),p=s.rooms[0].tenant;const count=p.activityLog.length;step(s,1);assert.equal(p.activityLog.length,count);
  s.minute=1439;p.activity='독서';recordActivities(s);s.day=2;s.minute=2;p.activity='휴식';recordActivities(s);
  assert.deepEqual(p.activityLog.slice(-2).map(e=>[e.day,e.minute]),[[1,1439],[2,2]]);
});
test('history is bounded, persists and validates imported entries',()=>{
  const s=createGame(()=>.3),p=s.rooms[0].tenant;
  for(let i=0;i<300;i++){s.minute=500+i;p.activity=i%2?'독서':'휴식';recordActivities(s);}
  assert.equal(p.activityLog.length,ACTIVITY_LOG_LIMIT);assert.deepEqual(restore(serialize(s)).rooms[0].tenant.activityLog,p.activityLog);
  p.activityLog[0].minute=1440;assert.throws(()=>restore(serialize(s)));
});
test('old minute logs compact consecutive duplicates while keeping the original change time',()=>{
  const s=createGame(()=>.3),p=s.rooms[0].tenant;p.activityLog=[];
  for(const [minute,activity] of [[480,'휴식'],[481,'휴식'],[482,'독서'],[483,'독서']]){s.minute=minute;p.activity=activity;p.activityLog.push(activityEntry(s,p));}
  assert.deepEqual(restore(serialize(s)).rooms[0].tenant.activityLog.map(e=>[e.minute,e.activity]),[[480,'휴식'],[482,'독서']]);
});

test('private descriptions follow actual activity and never use the vague 비공개 wording',()=>{
  const s=createGame(()=>.3),p=s.rooms[0].tenant;p.activity='샤워 · 비공개';assert.equal(activityEntry(s,p).kind,'private');
  p.activity='둘만의 시간 · 비공개';const adult=activityEntry(s,p);assert.equal(adult.kind,'adult');assert.equal(adult.tag,'연인과의 시간');assert(!adult.text.includes('비공개'));assert(adult.text.length<=160);assert(!adult.text.includes('{q}'));
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

test('display labels hide internal privacy suffixes and 속옷 wording',()=>{
  assert.equal(displayActivity('샤워 · 비공개'),'샤워');assert.equal(displayActivity('둘만의 시간 · 비공개'),'둘만의 시간');
  assert.equal(displayActivity('속옷 갈아입기 · 비공개'),'옷 갈아입기');assert.equal(displayActivity('독서'),'독서');
});
test('adult couple entries name the partner, vary by time and stay within the stored length limit',()=>{
  const s=createGame(()=>.3),[a,b]=s.rooms.map(r=>r.tenant).filter(Boolean);a.partner=b.id;b.partner=a.id;a.activity='둘만의 시간 · 비공개';
  const seen=new Set();
  for(let m=0;m<400;m++){s.minute=m;const e=activityEntry(s,a);assert.equal(e.kind,'adult');assert(e.text.includes(b.name));assert(e.text.length<=160);seen.add(e.text);}
  assert(seen.size>=6);
  a.activityLog=[activityEntry(s,a)];assert.equal(validActivityLog(a.activityLog),true);
  assert.equal(validActivityLog([{...a.activityLog[0],tag:'x'.repeat(21)}]),false);
});
test('solo late-night adult entries carry their own tag',()=>{
  const s=createGame(()=>.3),p=s.rooms[0].tenant;p.activity='휴식';p.desire=99;let found=null;
  for(let m=1200;m<1440&&!found;m++){s.minute=m;const e=activityEntry(s,p);if(e.kind==='adult')found=e;}
  assert.equal(found.tag,'혼자만의 밤');assert(!found.text.includes('비공개'));
});
