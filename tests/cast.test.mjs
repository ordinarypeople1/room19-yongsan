import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,serialize,restore,person} from '../sim.js';
import {CAST,visualIndex,candidates,matchesAppearance,newAppearance} from '../cast.js';
import {appearance,portrait} from '../live-art.js';
import {readFileSync,existsSync} from 'node:fs';
import {ROSTER,promptFor} from '../scripts/cast-roster.mjs';
import {RETIRED_FILES} from '../cast-retired.js';
import {READY_FILES} from '../cast-ready.js';
test('all residents and applicants are women with age-matched individual faces',()=>{
  const s=createGame(()=>.1),people=s.rooms.map(r=>r.tenant).filter(Boolean);
  for(const p of [...people,...s.applications]){assert.equal(p.gender,'여');assert(matchesAppearance(p.visualId,p));}
  assert.equal(CAST.filter(p=>p.gender==='여').length,30);
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
  for(let age=20;age<=49;age++){
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

test('resident pool has 30 distinct women and the roster matches the game cast',()=>{
  const women=CAST.filter(p=>p.gender==='여');
  assert.equal(women.length,30);assert.equal(new Set(women.map(p=>p.file)).size,30);
  assert.equal(new Set(women.map(p=>p.label)).size,30);
  for(const entry of ROSTER){const cast=CAST.find(c=>c.file===entry.file);assert(cast,entry.file);assert.equal(cast.age,entry.age);assert.equal(cast.label,entry.label);assert.equal(cast.gender,'여');assert(entry.age>=20&&entry.age<=49);}
  assert.equal(new Set(ROSTER.map(r=>r.subject)).size,ROSTER.length);
  assert.deepEqual(ROSTER.filter(r=>r.redo).map(r=>r.file),['woman-05','woman-06','woman-07','woman-08']);
});
test('once every portrait exists, each adult age has at least one active face within two years',()=>{
  const all=CAST.map((c,i)=>[c,i]).filter(([c])=>c.gender==='여');
  for(let age=20;age<=49;age++)assert(all.filter(([c])=>Math.abs(c.age-age)<=2).length>=1,'age '+age);
});
test('only portraits whose image file exists are registered as ready',()=>{
  for(const file of READY_FILES)assert(existsSync(new URL('../assets/cast/'+file+'.png',import.meta.url)),file);
  for(const file of ['woman-03'])assert(READY_FILES.includes(file));
  const s=createGame(()=>.1);for(const p of [...s.rooms.map(r=>r.tenant).filter(Boolean),...s.applications])assert(READY_FILES.includes(CAST[p.visualId].file));
});
test('generation prompts keep adult, modest, single-subject and flat-backdrop requirements',()=>{
  for(const entry of ROSTER){const prompt=promptFor(entry);assert(prompt.includes('adult'));assert(prompt.includes('ONE PERSON ONLY'));assert(prompt.includes('flat solid #26233D'));assert(prompt.includes(`age of ${entry.age}`));assert(!/nude|lingerie|underwear|sexy/i.test(prompt));}
});

test('new arrivals exhaust all ready portraits before repeating a face',()=>{
  const s={rooms:[],applications:[]};
  for(let n=0;n<READY_FILES.length;n++){
    const p={gender:'여',...newAppearance(s,'여',21)};
    assert(matchesAppearance(p.visualId,p));
    assert(!s.applications.some(q=>q.visualId===p.visualId));
    s.applications.push(p);
  }
  assert.equal(new Set(s.applications.map(p=>p.visualId)).size,READY_FILES.length);
});

test('40s residents keep their age and appearance through save round trips',()=>{
  const s=createGame(()=>.2),p=s.rooms[0].tenant;
  p.age=49;p.visualId=CAST.findIndex(c=>c.file==='woman-27');
  const loaded=restore(serialize(s)).rooms[0].tenant;
  assert.equal(loaded.age,49);assert.equal(loaded.visualId,p.visualId);
  p.age=50;assert.throws(()=>restore(serialize(s)));
});

test('all twenty-six active female portraits are actually ready and cover every decade',()=>{
  assert.equal(READY_FILES.length,26);
  for(const decade of [20,30,40])assert(CAST.some(c=>c.gender==='여'&&c.age>=decade&&c.age<decade+10));
});

test('removed portraits are absent and existing saves migrate only those identities',()=>{
 for(const file of RETIRED_FILES){
  assert(!READY_FILES.includes(file));assert(!existsSync(new URL('../assets/cast/'+file+'.png',import.meta.url)));
  const s=createGame(()=>.2),p=s.rooms[0].tenant,index=CAST.findIndex(c=>c.file===file);
  p.age=CAST[index].age;p.visualId=index;const before={name:p.name,age:p.age,id:p.id};
  const loaded=restore(serialize(s)).rooms[0].tenant;
  assert.deepEqual({name:loaded.name,age:loaded.age,id:loaded.id},before);
  assert(matchesAppearance(loaded.visualId,loaded));assert(!RETIRED_FILES.includes(CAST[loaded.visualId].file));
  assert.equal(restore(serialize(restore(serialize(s)))).rooms[0].tenant.visualId,loaded.visualId);
 }
});

test('every active resident has centered responsive face and bust assets',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../assets/portraits/crops.json',import.meta.url),'utf8'));
 assert.deepEqual(Object.keys(manifest).sort(),[...READY_FILES].sort());
 for(const file of READY_FILES){
  const {face,faceCrop,bustCrop}=manifest[file],cx=face[0]+face[2]/2,cy=face[1]+face[3]/2;
  assert(Math.abs((cx-faceCrop[0])/(faceCrop[2]-faceCrop[0])-.5)<.01,file);
  assert(Math.abs((cy-faceCrop[1])/(faceCrop[3]-faceCrop[1])-.5)<.04,file);
  assert(cx>bustCrop[0]&&cx<bustCrop[2]&&cy>bustCrop[1]&&cy<bustCrop[3],file);
  for(const variant of ['face-96','face-192','face-320','bust-240','bust-480']){
   const image=readFileSync(new URL('../assets/portraits/'+file+'-'+variant+'.webp',import.meta.url));
   assert.equal(image.toString('ascii',0,4),'RIFF');assert.equal(image.toString('ascii',8,12),'WEBP');
  }
 }
});
