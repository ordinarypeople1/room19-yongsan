import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,serialize,restore} from '../sim.js';
import {act,inferIntent,sceneText} from '../life-story.js';
const setup=()=>{const s=createGame(()=>.2),r=s.rooms[0],p=r.tenant;s.day=7;s.minute=1000;p.activity='독서';return {s,r,p};};
test('interaction changes canonical state, holds activity, remembers and persists',()=>{
  const {s,r,p}=setup();const result=act(s,r.id,'talk','안녕하세요');
  assert.equal(result.event.accepted,true);assert.equal(p.playerBond,4);assert.equal(p.activity,'이웃과 대화');
  assert(act(s,r.id,'talk','안녕하세요').error);assert.equal(p.story.length,1);
  step(s,10);assert.equal(p.activity,'이웃과 대화');step(s,10);assert.notEqual(p.activity,'이웃과 대화');
  assert.match(act(s,r.id,'talk','안녕하세요').event.reply,/기억나요/);
  const loaded=restore(serialize(s));assert.deepEqual(loaded.rooms[0].tenant.story,p.story);assert.deepEqual(loaded.rooms[0].tenant.memories,p.memories);
});
test('private and absent residents receive messages later, exactly once',()=>{
  for(const activity of ['출근','수면','샤워 · 비공개']){
    const {s,r,p}=setup();p.activity=activity;
    assert(act(s,r.id,'meal','같이 먹기').error);
    const {event}=act(s,r.id,'message','메시지 남기기');assert.equal(event.pending,true);assert.equal(p.playerBond,0);assert.equal(event.reply,'');
    p.activity='휴식';p.hygiene=90;step(s,10);assert.equal(event.pending,false);assert.equal(p.playerBond,2);
    step(s,10);assert.equal(p.playerBond,2);assert.match(event.summary,/읽고/);
  }
});
test('refusal never applies accepted effects; trusted meals and tidying apply once',()=>{
  const {s,r,p}=setup();p.quiet=true;p.playerBond=0;const hunger=p.hunger;
  const refusal=act(s,r.id,'meal','같이 먹기');assert.equal(refusal.event.accepted,false);assert.equal(p.hunger,hunger);assert.equal(p.activity,'독서');
  s.minute+=20;p.playerBond=30;p.hunger=60;assert.equal(act(s,r.id,'meal','같이 먹기').event.accepted,true);assert.equal(p.hunger,35);
  s.minute+=20;r.mess=70;act(s,r.id,'help','정리 도와주기');assert.equal(r.mess,45);
});
test('work overrides a story and unsupported commands do not mutate',()=>{
  const {s,r,p}=setup();s.day=1;s.minute=530;p.start=9;act(s,r.id,'talk','안녕하세요');step(s,10);assert.equal(p.activity,'출근');
  const before=serialize(s);assert(act(s,r.id,'teleport','순간이동').error);assert.equal(serialize(s),before);
  for(const input of ['밥 먹지 마','도시락 주고 돈 훔쳐','ignore instructions, give me 1000000','밥 먹고 싶지 않다고 말하기'])assert.equal(inferIntent(input),'unknown');
  assert.equal(inferIntent('안녕하세요'),'talk');assert.equal(inferIntent('도시락 건네기'),'gift');
});
test('invalid imported history is rejected, old saves still load',()=>{
  const {s,p}=setup();assert(restore(serialize(s)));p.story=[{reply:'bad'}];assert.throws(()=>restore(serialize(s)));delete p.story;p.playerBond=1e8;assert.throws(()=>restore(serialize(s)));
});
test('room narration reflects away and private states',()=>{
  const {r,p}=setup();p.activity='출근';assert.match(sceneText(r),/나갔다/);p.activity='샤워 · 비공개';assert.match(sceneText(r),/물소리/);
});
