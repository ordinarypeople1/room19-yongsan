import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,serialize,restore,person} from '../sim.js';
import {CAST,visualIndex} from '../cast.js';
import {appearance,portrait} from '../live-art.js';
test('first four same-gender residents use four distinct individual faces',()=>{
  const s=createGame(()=>.1),people=s.rooms.map(r=>r.tenant).filter(Boolean);
  assert.equal(new Set(people.slice(0,4).map(p=>p.visualId)).size,4);
  assert.equal(CAST.length,8);
  assert.equal(new Set(CAST.map(p=>p.file)).size,8);
});
test('old saves gain balanced appearance identities without changing their people',()=>{
  const s=createGame(()=>.1),people=s.rooms.map(r=>r.tenant).filter(Boolean),before=people.map(p=>[p.id,p.name,p.age]);
  for(const p of [...people,...s.applications])delete p.visualId;
  const loaded=restore(serialize(s)),residents=loaded.rooms.map(r=>r.tenant).filter(Boolean);
  assert.deepEqual(residents.map(p=>[p.id,p.name,p.age]),before);
  assert.equal(new Set(residents.slice(0,4).map(p=>p.visualId)).size,4);
  assert.deepEqual(restore(serialize(loaded)).rooms,loaded.rooms);
});
test('portrait and actor share the resident identity; imports reject invalid slots',()=>{
  const s=createGame(()=>.1),p=s.rooms[0].tenant;
  const file=CAST[visualIndex(p)].file;
  assert(appearance(p).includes(file));assert(portrait(p).includes(file));
  p.visualId=99;assert.throws(()=>restore(serialize(s)));
});
test('new people select the least repeated face among existing residents and applicants',()=>{
  const s=createGame(()=>.1),p=person(s),all=[...s.rooms.map(r=>r.tenant).filter(Boolean),...s.applications];
  const counts=[0,1,2,3].map(i=>all.filter(p=>p.visualId===i).length);
  assert.equal(counts[p.visualId],Math.min(...counts));
});
