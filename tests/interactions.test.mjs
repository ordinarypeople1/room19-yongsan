import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,restore,serialize} from '../sim.js';
import {intervene,available,bubble,activeInteraction} from '../interactions.js';
function setup(){const s=createGame(()=>.2),r=s.rooms[0];s.day=7;s.minute=1000;r.tenant.activity='독서';return {s,r,p:r.tenant};}
test('bell changes route activity, persists and cannot be spammed',()=>{
  const {s,r,p}=setup();assert.equal(intervene(s,r.id,'bell'),null);
  assert.equal(p.activity,'현관 확인');assert.equal(bubble(s,p).kind,'speech');
  const mood=p.happiness;assert(intervene(s,r.id,'bell'));assert.equal(p.happiness,mood);
  assert.deepEqual(restore(serialize(s)).rooms[0].tenant.interaction,p.interaction);
  step(s,10);assert.equal(p.activity,'현관 확인');step(s,10);assert.equal(activeInteraction(s,p),null);
  step(s,20);assert.equal(available(s,p),null);
});
test('repeated interruptions produce one complaint and reduce mood',()=>{
  const {s,r,p}=setup();p.quiet=false;
  for(let i=0;i<3;i++){p.activity='독서';assert.equal(intervene(s,r.id,'broadcast'),null);s.minute+=40;}
  assert.equal(s.issues.length,1);assert.equal(p.interaction.annoyed,true);
  assert.equal(p.happiness,75);p.activity='독서';intervene(s,r.id,'music');assert.equal(s.issues.length,1);
});
test('private, sleeping, absent and empty rooms cannot be interrupted',()=>{
  const {s,r,p}=setup();for(const activity of ['출근','수면','샤워 · 비공개','속옷 갈아입기 · 비공개']){p.activity=activity;assert(intervene(s,r.id,'light'));assert.equal(bubble(s,p),null);}
  assert(intervene(s,102,'bell'));assert(intervene(s,r.id,'unknown'));
});
test('work overrides an active intervention and malformed imported state is rejected',()=>{
  const {s,r,p}=setup();s.day=1;s.minute=530;p.start=9;intervene(s,r.id,'bell');step(s);assert.equal(p.activity,'출근');
  p.interaction.until='forever';assert.throws(()=>restore(serialize(s)));
});
