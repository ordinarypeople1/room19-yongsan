import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,serialize,restore,person} from '../sim.js';
import {CAST,visualIndex,candidates,matchesAppearance} from '../cast.js';
import {appearance,portrait} from '../live-art.js';
test('all residents and applicants are women with age-matched individual faces',()=>{
  const s=createGame(()=>.1),people=s.rooms.map(r=>r.tenant).filter(Boolean);
  for(const p of [...people,...s.applications]){assert.equal(p.gender,'여');assert(matchesAppearance(p.visualId,p));}
  assert.equal(CAST.filter(p=>p.gender==='여').length,8);
  assert.equal(new Set(CAST.map(p=>p.file)).size,CAST.length);
});
test('old saves gain balanced appearance identities without changing their people',()=>{
  const s=createGame(()=>.1),people=s.rooms.map(r=>r.tenant).filter(Boolean),before=people.map(p=>[p.id,p.name,p.age]);
  for(const p of [...people,...s.applications])delete p.visualId;
  const loaded=restore(serialize(s)),residents=loaded.rooms.map(r=>r.tenant).filter(Boolean);
  assert.deepEqual(residents.map(p=>[p.id,p.name,p.age]),before);
  assert(residents.every(p=>matchesAppearance(p.visualId,p)));
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
  const eligible=candidates(p.gender,p.age),counts=eligible.map(i=>all.filter(p=>p.visualId===i).length);
  assert.equal(all.filter(q=>q.visualId===p.visualId).length,Math.min(...counts));
});

test('every supported adult age has a matching female portrait and no male guest sprite',()=>{
  const s=createGame(()=>.1);
  for(let age=20;age<=39;age++){
    assert(candidates('여',age).length>0);
    const p={id:age,age,gender:'여',visualId:candidates('여',age)[0]};
    assert(matchesAppearance(visualIndex(p),p));assert(!appearance(p,true).includes('/man-'));
  }
});

test('version 2 saves become women-only while preserving progress, ages and relationships',()=>{
  const s=createGame(()=>.2),p=s.rooms[0].tenant,q=s.rooms[2].tenant;
  s.version=2;delete s.residenceType;p.gender='남';p.name='김준서';p.visualId=0;
  p.partner=q.id;q.partner=p.id;p.relations[q.id]=77;
  p.memories=[{day:1,label:'나눴던 이야기'}];s.logs[0].text='김준서의 하루';
  const old={id:p.id,age:p.age,cash:s.cash,day:s.day,partner:p.partner,memories:p.memories};
  const loaded=restore(serialize(s)),converted=loaded.rooms[0].tenant;
  assert.equal(loaded.version,3);assert.equal(loaded.residenceType,'women-only');
  assert.equal(converted.gender,'여');assert.notEqual(converted.name,'김준서');assert(matchesAppearance(converted.visualId,converted));
  for(const k of ['id','age','partner','memories'])assert.deepEqual(converted[k],old[k]);
  assert.equal(loaded.cash,old.cash);assert.equal(loaded.day,old.day);assert.equal(converted.relations[q.id],77);
  assert(!loaded.logs[0].text.includes('김준서'));
  assert.deepEqual(restore(serialize(loaded)).rooms,loaded.rooms);
});

test('new saves reject male residents and portraits from a different age group',()=>{
  const s=createGame(()=>.2),p=s.rooms[0].tenant;p.gender='남';p.visualId=0;assert.throws(()=>restore(serialize(s)));
  p.gender='여';p.age=21;p.visualId=11;assert.throws(()=>restore(serialize(s)));
});
