import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, serialize, restore, isAway, compatible, VERSION } from '../sim.js';

function seeded(seed = 7) {
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const tenants = s => s.rooms.filter(r => r.tenant).map(r => r.tenant);
const setAt = (s, day, minute) => { s.day = day; s.minute = minute; };

test('office workers stay home on weekends, shift workers follow their own days', () => {
  const s = createGame(seeded()), p = s.rooms[0].tenant;
  p.workdays = [0, 1, 2, 3, 4]; p.start = 9; p.end = 18;
  setAt(s, 6, 590); step(s); // 토요일 10:00
  assert.notEqual(p.activity, '출근');
  p.workdays = [5, 6]; setAt(s, 6, 590); step(s);
  assert.equal(p.activity, '출근');
});

test('needs drive choices: a messy room gets cleaned, hunger leads to a meal', () => {
  const s = createGame(seeded()), r = s.rooms[0], p = r.tenant;
  p.workdays = []; p.hunger = 0; p.energy = 90; p.hygiene = 90; p.tidy = 80; r.mess = 95; p.busy = null;
  setAt(s, 2, 650); step(s);
  assert.equal(p.activity, '청소');
  const before = r.mess;
  step(s);
  assert(r.mess < before);
  p.hunger = 95; p.busy = null; step(s);
  assert.equal(p.activity, '식사');
});

test('a visiting partner leaves their own room for the duration of the visit', () => {
  const s = createGame(seeded()), hostRoom = s.rooms[0], guestRoom = s.rooms[2];
  const p = hostRoom.tenant, q = guestRoom.tenant;
  for (const t of tenants(s)) { t.workdays = []; t.social = 20; t.desire = 0; }
  p.partner = q.id; q.partner = p.id; p.relations[q.id] = 80; q.relations[p.id] = 80;
  p.social = 95; p.connection = 0; p.hunger = 0; p.energy = 90; p.hygiene = 90; p.recent = [];
  q.hunger = 0; q.energy = 90; q.hygiene = 90;
  setAt(s, 2, 1140); step(s);
  assert.equal(p.activity, '연인 방문');
  assert.equal(p.visitorId, q.id);
  assert.equal(q.activity, '연인 집에 감');
  assert(isAway(q));
  // 한쪽만 연인이라고 생각하면 방문은 성립하지 않는다
  q.partner = null; p.busy = null; step(s);
  assert.notEqual(p.activity, '연인 방문');
  assert.notEqual(q.activity, '연인 집에 감');
});

test('romance needs mutual attraction', () => {
  const s = createGame(seeded()), [p, q] = tenants(s);
  p.gender = '남'; q.gender = '남'; p.attraction = 'opposite'; q.attraction = 'opposite';
  assert.equal(compatible(p, q), false);
  p.attraction = 'same'; q.attraction = 'both';
  assert.equal(compatible(p, q), true);
});

test('expiring leases renew or end with the deposit returned and the room reopened', () => {
  let renewed = 0, left = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const s = createGame(seeded(seed)), r = s.rooms[0], id = r.tenant.id;
    r.tenant.happiness = 40; r.tenant.partner = null;
    r.lease.end = 2;
    const held = s.depositHeld;
    setAt(s, 1, 1430); step(s);
    if (r.tenant?.id === id) {
      renewed++;
      assert(r.lease.end > s.day);
    } else {
      left++;
      assert.equal(r.tenant, null);
      assert.equal(r.lease, null);
      assert.equal(s.depositHeld, held - r.deposit);
      assert(s.applications.length > 0);
    }
  }
  assert(renewed > 0 && left > 0, `renewed ${renewed}, left ${left}`);
});

test('a long-term couple can move out together at lease end', () => {
  const s = createGame(() => 0.01), a = s.rooms[0], b = s.rooms[2], p = a.tenant, q = b.tenant;
  p.partner = q.id; q.partner = p.id; p.relations[q.id] = 99; q.relations[p.id] = 99;
  a.lease.end = 2;
  setAt(s, 1, 1430); step(s);
  assert.equal(a.tenant, null);
  assert.equal(b.tenant, null);
  assert(s.logs.some(l => l.text.includes('함께 살 집')));
});

test('couples who drift apart break up', () => {
  const s = createGame(seeded()), p = s.rooms[0].tenant, q = s.rooms[2].tenant;
  p.partner = q.id; q.partner = p.id; p.relations[q.id] = 45.5; q.relations[p.id] = 45.5;
  setAt(s, 1, 1430); step(s);
  assert.equal(p.partner, null);
  assert.equal(q.partner, null);
});

test('version 1 saves are migrated instead of rejected', () => {
  const s = createGame(seeded());
  step(s, 300);
  const raw = JSON.parse(serialize(s));
  raw.version = 1;
  for (const r of raw.rooms) {
    delete r.lease; delete r.mess; delete r.laundry;
    if (r.tenant) for (const k of ['workdays', 'attraction', 'recent', 'busy', 'visitorId']) delete r.tenant[k];
  }
  for (const p of raw.applications) for (const k of ['workdays', 'attraction', 'recent', 'busy', 'visitorId']) delete p[k];
  const loaded = restore(JSON.stringify(raw));
  assert.equal(loaded.version, VERSION);
  for (const r of loaded.rooms) {
    if (r.tenant) {
      assert(Array.isArray(r.tenant.workdays));
      assert(r.lease.end > loaded.day);
    } else assert.equal(r.lease, null);
  }
  step(loaded, 1440);
  assert.throws(() => restore(JSON.stringify({ ...raw, version: 3 })));
});

test('months of idle life keep the building consistent and keep residents turning over', () => {
  for (const seed of [3, 11, 29]) {
    const s = createGame(seeded(seed));
    const firstIds = new Set(tenants(s).map(p => p.id));
    for (let d = 0; d < 120; d++) {
      step(s, 1440);
      // 공실이 생기면 자동으로 지원자를 받아 승인되었다고 가정한다
      for (const r of s.rooms) if (!r.tenant && s.applications[0] && s.applications[0].budget >= r.rent) {
        const a = s.applications.shift();
        const { applied, ...t } = a;
        r.tenant = t; r.lease = { start: s.day, end: s.day + 30 }; s.depositHeld += r.deposit;
      }
      const held = s.rooms.filter(r => r.tenant).reduce((n, r) => n + r.deposit, 0);
      assert(Math.abs(s.depositHeld - held) < 1e-6, 'held deposits match occupied rooms');
      const ids = new Set(tenants(s).map(p => p.id));
      const guests = new Set();
      for (const p of tenants(s)) {
        if (p.partner !== null) assert(ids.has(p.partner), "partner must still live here");
        if (p.visitorId !== null) {
          assert(!guests.has(p.visitorId), 'a partner cannot be in two rooms');
          guests.add(p.visitorId);
        }
      }
    }
    const stayed = tenants(s).filter(p => firstIds.has(p.id)).length;
    assert(stayed < firstIds.size, `seed ${seed}: someone should have moved on`);
  }
});
