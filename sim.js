import { activeInteraction, validInteraction } from './interactions.js';
import { nextAppearance, migrateAppearances, matchesGender, matchesAppearance } from './cast.js';
import { elapsedGameMinutes } from './pace.js';
import { tickStories, validStory } from './life-story.js';
import { recordActivities, validActivityLog, compactActivityLogs } from './activity-log.js';

export const VERSION = 3;

const surnames = ['김', '이', '박', '최', '정', '강', '윤', '임', '한', '오'];
const names = {
  남: ['도현', '지훈', '준서', '현우', '시우', '민재', '선우', '태윤'],
  여: ['서연', '지우', '수빈', '하은', '서윤', '민서', '예진', '소연'],
};
// [직업, 월 소득, 출근, 퇴근, 근무 형태]
const jobs = [
  ['디자이너', 320, 9, 18, 'office'],
  ['개발자', 430, 10, 19, 'office'],
  ['간호사', 340, 14, 23, 'shift'],
  ['카페 매니저', 280, 7, 16, 'shift'],
  ['대학원생', 180, 10, 17, 'office'],
  ['프리랜서', 300, 11, 16, 'free'],
  ['출판 편집자', 310, 9, 18, 'office'],
  ['호텔 직원', 290, 14, 23, 'shift'],
];
const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

export const rand = (n, rng = Math.random) => Math.floor(rng() * n);
export const clamp = n => Math.max(0, Math.min(100, n));
export const weekday = s => (s.day - 1) % 7; // 0 = 월요일
export const AWAY_ACTIVITIES = ['출근', '연인 집에 감', '외출'];
export const isAway = p => AWAY_ACTIVITIES.includes(p.activity);
const isPrivate = p => p.activity.includes('비공개');
const isFree = p => !isAway(p) && !isPrivate(p) && p.activity !== '수면';

// 근무 요일: 사무직은 주 5일, 교대직은 요일이 사람마다 다른 주 5일, 프리랜서는 주 3일
export function workdaysFor(type, offset) {
  if (type === 'office') return [0, 1, 2, 3, 4];
  if (type === 'free') return [offset % 7, (offset + 2) % 7, (offset + 4) % 7].sort();
  return [0, 1, 2, 3, 4].map(d => (d + offset) % 7).sort();
}
const jobType = name => jobs.find(j => j[0] === name)?.[4] || 'office';

function pickAttraction(rng) {
  const r = rand(10, rng);
  return r < 8 ? 'opposite' : r < 9 ? 'same' : 'both';
}

export function person(s) {
  rand(2, s.rng); // Preserve the random stream used by existing simulations.
  const gender = '여';
  const j = jobs[rand(jobs.length, s.rng)];
  const name = surnames[rand(10, s.rng)] + names.여[rand(8, s.rng)];
  const age = 20 + rand(20, s.rng);
  return {
    id: s.nextId++,
    name,
    gender,
    visualId: nextAppearance(s, gender, age),
    age,
    job: j[0], income: j[1], start: j[2], end: j[3],
    workdays: workdaysFor(j[4], rand(7, s.rng)),
    attraction: pickAttraction(s.rng),
    quiet: rand(2, s.rng) === 0,
    social: 30 + rand(65, s.rng),
    tidy: 30 + rand(65, s.rng),
    budget: 55 + rand(50, s.rng),
    deposit: 500 + rand(11, s.rng) * 100,
    energy: 80, hunger: 20, hygiene: 85, connection: 50,
    desire: 20 + rand(50, s.rng), happiness: 75,
    activity: '휴식', visitor: null, visitorId: null, partner: null,
    relations: {}, lowDays: 0, recent: [], busy: null,
  };
}

export function log(s, text, type = 'life') {
  s.logs.unshift({ day: s.day, minute: s.minute, text, type });
  s.logs = s.logs.slice(0, 100);
}

const leaseTerm = s => 28 + rand(5, s.rng) * 7; // 게임 4~8주

export function createGame(rng = Math.random, mode = 'cozy') {
  const s = {
    version: VERSION, mode, day: 1, minute: 480, cash: 1800, depositHeld: 0, nextId: 1,
    residenceType: 'women-only',
    rooms: [], applications: [], logs: [], upgrades: { insulation: 0, plumbing: 0, lounge: 0 },
    earned: 0, spent: 0, issues: [], rng,
  };
  for (let f = 1; f <= 5; f++)
    for (let n = 1; n <= 4; n++)
      s.rooms.push({ id: f * 100 + n, rent: 65 + (f - 1) * 3, deposit: 500, tenant: null, fault: null, level: 0, lease: null, mess: 0, laundry: 0 });
  for (let i = 0; i < 9; i++) {
    const r = s.rooms[i * 2];
    r.tenant = person(s);
    // 기존 입주자는 계약 만료일이 흩어지도록 1~6주 남은 상태로 시작
    r.lease = { start: 1, end: 8 + rand(36, s.rng) };
    r.mess = 10 + rand(30, s.rng);
    r.laundry = 10 + rand(30, s.rng);
    s.depositHeld += 500;
  }
  generateApplications(s);
  recordActivities(s);
  log(s, '한강로 19길의 새 관리인이 되었습니다. 공실의 임대 조건을 확인하고 첫 입주자를 맞아보세요.', 'system');
  return s;
}

export function generateApplications(s) {
  const empty = s.rooms.filter(r => !r.tenant);
  const capacity = Math.min(6, empty.length * 2);
  while (s.applications.length < capacity) s.applications.push({ ...person(s), applied: s.day });
  if (!empty.length) s.applications = [];
}

export function approve(s, id, roomId) {
  const a = s.applications.find(a => a.id === id), r = s.rooms.find(r => r.id === roomId);
  if (!a || !r || r.tenant) return '빈 호실을 선택해주세요.';
  if (a.budget < r.rent || a.deposit < r.deposit) return '지원자의 예산보다 임대 조건이 높습니다.';
  const { applied, ...tenant } = a;
  r.tenant = tenant;
  r.lease = { start: s.day, end: s.day + leaseTerm(s) };
  r.mess = 0;
  r.laundry = 0;
  s.depositHeld += r.deposit;
  s.applications = s.applications.filter(p => p.id !== id);
  log(s, `${r.id}호 ${a.name} 입주. 월세 ${r.rent}만 원 / 보증금 ${r.deposit}만 원 별도 예치. 계약 ${r.lease.end - r.lease.start}일.`, 'finance');
  if (s.rooms.every(r => r.tenant)) s.applications = [];
  return null;
}

export function reject(s, id) { s.applications = s.applications.filter(p => p.id !== id); }

export function repair(s, id) {
  const r = s.rooms.find(r => r.id === id);
  if (!r?.fault) return '수리가 필요하지 않습니다.';
  const cost = r.fault.cost;
  if (s.cash < cost) return '운영 자금이 부족합니다.';
  s.cash -= cost; s.spent += cost;
  log(s, `${id}호 ${r.fault.name} 수리 완료. −${cost}만 원`, 'finance');
  r.fault = null;
  if (r.tenant) r.tenant.happiness = clamp(r.tenant.happiness + 15);
  return null;
}

export const upgradeInfo = {
  insulation: { name: '층간소음 방음', cost: 280, desc: '소음 민원 발생 확률 감소' },
  plumbing: { name: '급배수 설비', cost: 320, desc: '고장 확률 감소' },
  lounge: { name: '옥상 라운지', cost: 240, desc: '교류와 만족도 증가' },
};

export function upgrade(s, key) {
  const u = upgradeInfo[key];
  if (!u || s.upgrades[key] >= 3) return '최대 단계입니다.';
  const cost = u.cost * (s.upgrades[key] + 1);
  if (s.cash < cost) return '운영 자금이 부족합니다.';
  s.cash -= cost; s.spent += cost; s.upgrades[key]++;
  log(s, `${u.name} ${s.upgrades[key]}단계 완료. −${cost}만 원`, 'finance');
  return null;
}

export function mediate(s, id) {
  const issue = s.issues.find(x => x.id === id);
  if (!issue) return;
  for (const rid of issue.rooms) {
    const p = s.rooms.find(r => r.id === rid)?.tenant;
    if (p) p.happiness = clamp(p.happiness + 8);
  }
  s.issues = s.issues.filter(x => x.id !== id);
  log(s, `${issue.text} → 대화로 중재했습니다.`, 'social');
}

// ── 관계 ──────────────────────────────────────────────

const likes = (p, q) =>
  p.attraction === 'both' || (p.attraction === 'same' ? p.gender === q.gender : p.gender !== q.gender);
export const compatible = (p, q) => likes(p, q) && likes(q, p);
// 두 사람 사이의 고정된 궁합(0~1). 같은 쌍이면 항상 같은 값.
export function chemistry(p, q) {
  const a = Math.min(p.id, q.id), b = Math.max(p.id, q.id);
  return ((a * 7919 + b * 104729) % 101) / 100;
}
const tenantById = (s, id) => s.rooms.find(r => r.tenant?.id === id)?.tenant || null;
const roomOf = (s, p) => s.rooms.find(r => r.tenant === p);

function breakUp(s, p, q, reason) {
  p.partner = null;
  q.partner = null;
  p.happiness = clamp(p.happiness - 12);
  q.happiness = clamp(q.happiness - 12);
  log(s, `${p.name} · ${q.name}, ${reason}`, 'social');
}

function socialEvent(s) {
  const home = s.rooms.filter(r => r.tenant && isFree(r.tenant));
  if (home.length < 2) return;
  const a = home[rand(home.length, s.rng)], b = home.filter(r => r !== a)[rand(home.length - 1, s.rng)];
  const p = a.tenant, q = b.tenant;
  const relation = p.relations[q.id] || 0;
  if (p.quiet !== q.quiet && rand(5 + s.upgrades.insulation * 3, s.rng) === 0) {
    if (s.issues.length < 8) {
      s.issues.push({ id: s.nextId++, rooms: [a.id, b.id], text: `${a.id}호와 ${b.id}호 생활 소음 갈등`, day: s.day });
      p.happiness = clamp(p.happiness - 7);
      q.happiness = clamp(q.happiness - 5);
      if (p.partner === q.id) {
        p.relations[q.id] = Math.max(0, relation - 8);
        q.relations[p.id] = Math.max(0, (q.relations[p.id] || 0) - 8);
      }
      log(s, `${a.id}호 ${p.name}: 늦은 생활 소음이 불편하다는 민원.`, 'issue');
    }
    return;
  }
  // 성향이 비슷할수록 대화로 쌓이는 친밀도가 크다
  const gain = 6 + Math.round(6 * (1 - Math.abs(p.social - q.social) / 65)) + (p.quiet === q.quiet ? 2 : 0);
  p.relations[q.id] = relation + gain;
  q.relations[p.id] = (q.relations[p.id] || 0) + gain;
  p.connection = clamp(p.connection + 20);
  q.connection = clamp(q.connection + 20);
  p.happiness = clamp(p.happiness + 3);
  q.happiness = clamp(q.happiness + 3);
  const spark = 0.25 + chemistry(p, q) * 0.6;
  if (relation >= 60 && !p.partner && !q.partner && compatible(p, q) && s.rng() < spark) {
    p.partner = q.id;
    q.partner = p.id;
    log(s, `${p.name} · ${q.name}, 서로의 마음을 확인했습니다. 함께하는 시간이 늘어납니다.`, 'social');
  } else
    log(s, `${a.id}호 ${p.name}와 ${b.id}호 ${q.name}, ${s.upgrades.lounge ? '옥상 라운지' : '공동 현관'}에서 대화를 나눴습니다.`, 'social');
}

// ── 생활 행동 결정 (utility AI) ───────────────────────

// 행동별 1틱(게임 10분) 효과와 기본 지속 틱 수
const ACTIONS = {
  식사: { ticks: 3, apply: (p, r) => { p.hunger = clamp(p.hunger - 12); r.mess = clamp(r.mess + 3); } },
  휴식: { ticks: 3, apply: p => { p.energy = clamp(p.energy + 1.2); } },
  청소: { ticks: 3, apply: (p, r) => { r.mess = clamp(r.mess - 14); p.happiness = clamp(p.happiness + 0.4); } },
  빨래: { ticks: 3, apply: (p, r) => { r.laundry = clamp(r.laundry - 16); } },
  독서: { ticks: 3, apply: p => { p.happiness = clamp(p.happiness + 0.3); } },
  '음악 감상': { ticks: 2, apply: p => { p.happiness = clamp(p.happiness + 0.3); } },
  스트레칭: { ticks: 2, apply: p => { p.energy = clamp(p.energy + 0.4); } },
  '차 마시기': { ticks: 2, apply: p => { p.happiness = clamp(p.happiness + 0.2); } },
  휴대폰: { ticks: 2, apply: p => { p.connection = clamp(p.connection + 0.8); } },
  '친구 방문': { ticks: 6, apply: p => { p.connection = clamp(p.connection + 3); } },
  '연인 방문': { ticks: 6, apply: p => { p.connection = clamp(p.connection + 3); } },
  '둘만의 시간 · 비공개': { ticks: 3, apply: p => { p.desire = clamp(p.desire - 8); p.connection = clamp(p.connection + 8); } },
  외출: { ticks: 12, apply: p => { p.connection = clamp(p.connection + 1.5); p.happiness = clamp(p.happiness + 0.3); } },
};

function candidates(s, p, r, h, workday) {
  const list = [
    ['식사', (p.hunger - 30) * 1.5],
    ['휴식', (60 - p.energy) * 1.3],
    ['청소', (r.mess - 25) * 0.9 + (p.tidy - 50) * 0.3],
    ['빨래', (r.laundry - 30) * 0.8 + (p.tidy - 50) * 0.15],
    ['독서', 15 + (p.quiet ? 15 : 0)],
    ['음악 감상', 18 + (p.quiet ? 4 : 10)],
    ['스트레칭', 12 + (p.energy > 60 ? 8 : 0) + (h < 10 ? 8 : 0)],
    ['차 마시기', 14 + (h >= 15 && h < 18 ? 10 : 0)],
    ['휴대폰', 16 + (100 - p.connection) * 0.15],
  ];
  if (h >= 19 && h < 21 && p.social > 55)
    list.push([p.partner ? '연인 방문' : '친구 방문', (p.social - 50) * 1.2 + (100 - p.connection) * 0.3]);
  if (h >= 20 && h < 22 && p.partner && p.desire > 45)
    list.push(['둘만의 시간 · 비공개', (p.desire - 30) * 1.2]);
  if (!workday && h >= 11 && h < 18 && p.social > 50)
    list.push(['외출', (p.social - 40) * 0.8 + (100 - p.connection) * 0.2]);
  return list;
}

function choose(s, p, r, h, workday) {
  const list = candidates(s, p, r, h, workday).map(([name, score]) => [
    name,
    score - (p.recent.includes(name) ? 25 : 0) + s.rng() * 6,
  ]);
  list.sort((a, b) => b[1] - a[1]);
  const best = list[0];
  // 하던 일이 아직 유효하면 더 급한 일이 생기기 전까지 이어간다
  const current = p.busy && p.busy.activity === p.activity && p.busy.ticks > 0 ? list.find(([n]) => n === p.activity) : null;
  if (current && best[1] < current[1] + 25 + (p.recent.includes(p.activity) ? 25 : 0)) {
    p.busy.ticks--;
    return p.activity;
  }
  return best[0];
}

function remember(p, activity) {
  if (p.activity === activity) return;
  p.recent = [activity, ...p.recent.filter(a => a !== activity)].slice(0, 4);
  p.busy = ACTIONS[activity] ? { activity, ticks: ACTIONS[activity].ticks - 1 } : null;
}

function decide(s, r, h, workday) {
  const p = r.tenant;
  p.visitor = null;
  p.visitorId = null;
  let next;
  if (h < 6.5 || h >= 24 - (p.end > 22 ? 0 : 1)) {
    next = '수면';
    p.energy = clamp(p.energy + 2.5);
  } else if (workday && h >= p.start && h < p.end) next = '출근';
  else if (activeInteraction(s, p) || p.storyUntil > s.day * 1440 + s.minute) return;
  else if (p.hygiene < 50 && !r.fault) {
    next = '샤워 · 비공개';
    p.hygiene = clamp(p.hygiene + 18);
    r.laundry = clamp(r.laundry + 3);
  } else if (p.activity === '샤워 · 비공개' || (workday && h >= p.end && h < p.end + 1 / 6)) next = '속옷 갈아입기 · 비공개';
  else next = choose(s, p, r, h, workday);
  if (next === '친구 방문' || next === '연인 방문') p.visitor = next === '연인 방문' ? '연인' : '외부 친구';
  remember(p, next);
  p.activity = next;
}

// 연인과 함께하는 활동은 상대가 실제로 이 방에 와 있어야 성립한다
function resolveVisits(s) {
  const claimed = new Set();
  const hosts = s.rooms
    .filter(r => r.tenant && (r.tenant.activity === '연인 방문' || r.tenant.activity === '둘만의 시간 · 비공개'))
    .sort((a, b) => a.id - b.id);
  for (const r of hosts) {
    const p = r.tenant;
    if (claimed.has(p.id)) continue; // 이미 상대 방으로 갔다
    const q = tenantById(s, p.partner);
    const mutual = q && q.partner === p.id;
    const available = mutual && !claimed.has(q.id) && (isFree(q) || q.activity === p.activity || q.activity === '연인 집에 감');
    if (!available) {
      p.activity = '휴대폰';
      p.visitor = null;
      p.busy = null;
      continue;
    }
    claimed.add(p.id);
    claimed.add(q.id);
    p.visitor = '연인';
    p.visitorId = q.id;
    if (q.activity !== '연인 집에 감') q.busy = null;
    q.activity = '연인 집에 감';
    q.visitor = null;
    q.visitorId = null;
    q.outfit = 'street';
    const bond = 2;
    p.relations[q.id] = (p.relations[q.id] || 0) + bond;
    q.relations[p.id] = (q.relations[p.id] || 0) + bond;
    q.connection = clamp(q.connection + 3);
  }
}

// ── 계약과 생활 변화 ───────────────────────────────────

export function moveOut(s, r, text) {
  const p = r.tenant;
  if (!p) return;
  for (const other of s.rooms) if (other.tenant?.partner === p.id) other.tenant.partner = null;
  s.depositHeld -= r.deposit;
  log(s, `${r.id}호 ${p.name}, ${text} 보증금 ${r.deposit}만 원 반환.`, 'finance');
  r.tenant = null;
  r.lease = null;
  r.mess = 0;
  r.laundry = 0;
}

function leaseEnd(s, r) {
  const p = r.tenant;
  const q = tenantById(s, p.partner);
  if (q && (p.relations[q.id] || 0) >= 95 && s.rng() < 0.5) {
    const qr = roomOf(s, q);
    moveOut(s, r, `${q.name}와 함께 살 집을 구해 이사했습니다.`);
    moveOut(s, qr, `${p.name}와 함께 살 집으로 이사했습니다.`);
    return;
  }
  const leaveChance = p.happiness < 50 ? 0.7 : p.happiness < 75 ? 0.3 : 0.12;
  if (s.rng() < leaveChance) {
    const reasons = ['직장 근처로 이사했습니다.', '본가로 돌아갔습니다.', '조금 더 넓은 집으로 옮겼습니다.'];
    moveOut(s, r, `계약 만료로 ${reasons[rand(reasons.length, s.rng)]}`);
  } else {
    r.lease = { start: s.day, end: s.day + leaseTerm(s) };
    log(s, `${r.id}호 ${p.name}, 같은 조건으로 계약을 ${r.lease.end - r.lease.start}일 연장했습니다.`, 'finance');
  }
}

function lifeEvents(s, r) {
  const p = r.tenant;
  if (rand(150, s.rng) === 0) {
    const j = jobs[rand(jobs.length, s.rng)];
    if (j[0] !== p.job) {
      Object.assign(p, { job: j[0], income: j[1], start: j[2], end: j[3], workdays: workdaysFor(j[4], rand(7, s.rng)) });
      p.happiness = clamp(p.happiness + 6);
      log(s, `${r.id}호 ${p.name}, ${j[0]}(으)로 일을 옮겼습니다. 생활 시간이 바뀝니다.`, 'life');
    }
  }
  const q = tenantById(s, p.partner);
  if (q && q.partner === p.id && p.id < q.id) {
    const bond = Math.max(0, (p.relations[q.id] || 0) - 1.5);
    p.relations[q.id] = bond;
    q.relations[p.id] = Math.max(0, (q.relations[p.id] || 0) - 1.5);
    if (bond < 45) breakUp(s, p, q, '조금 멀어진 끝에 각자의 시간을 갖기로 했습니다.');
  }
}

function midnight(s) {
  s.day++;
  s.cash -= 24;
  s.spent += 24;
  let income = 0;
  for (const r of s.rooms) {
    const p = r.tenant;
    if (!p) continue;
    if (s.mode === 'cozy' && r.fault) {
      r.fault = null;
      p.happiness = clamp(p.happiness + 10);
      log(s, `${r.id}호의 설비를 정기 점검으로 고쳤습니다.`, 'life');
    }
    income += r.rent / 30;
    const homeComfort = (r.mess > 70 ? -2 : 0) + (r.laundry > 80 ? -1 : 0);
    p.happiness = clamp(p.happiness + (r.fault ? -8 : 2) + s.upgrades.lounge - r.level * 0.2 + homeComfort);
    r.laundry = clamp(r.laundry + 8);
    p.lowDays = p.happiness < 25 ? p.lowDays + 1 : 0;
    if (p.lowDays >= 3 && s.mode !== 'cozy') {
      moveOut(s, r, '생활 불편으로 퇴거했습니다.');
      continue;
    }
    if (!r.fault && rand(12 + s.upgrades.plumbing * 12, s.rng) === 0) {
      r.fault = { name: ['온수기 이상', '배수관 누수', '냉난방기 고장'][rand(3, s.rng)], cost: 35 + rand(4, s.rng) * 10 };
      log(s, `${r.id}호 ${r.fault.name}. 수리를 요청했습니다.`, 'issue');
    }
    lifeEvents(s, r);
  }
  for (const r of s.rooms) if (r.tenant && r.lease && s.day >= r.lease.end) leaseEnd(s, r);
  s.cash += income;
  s.earned += income;
  if (s.mode === 'cozy') {
    s.cash = Math.max(s.cash, 300);
    s.issues = s.issues.filter(i => s.day - i.day < 2);
  }
  log(s, `일일 정산: 월세 일할 +${income.toFixed(1)}만 / 운영비 −24만`, 'finance');
  s.applications = s.applications.filter(p => s.day - p.applied < 4);
  generateApplications(s);
}

export function step(s, minutes = 10) {
  for (let i = 0; i < minutes; i++) {
    s.minute++;
    if (s.minute >= 1440) {
      s.minute -= 1440;
      midnight(s);
    }
    if(s.minute%10!==0)continue;
    const h = s.minute / 60;
    const today = weekday(s);
    for (const r of s.rooms) {
      const p = r.tenant;
      if (!p) continue;
      p.energy = clamp(p.energy - 0.35);
      p.hunger = clamp(p.hunger + 0.65);
      p.hygiene = clamp(p.hygiene - 0.4);
      p.connection = clamp(p.connection - 0.2);
      p.desire = clamp(p.desire + 0.12);
      if (!isAway(p) && p.activity !== '수면') r.mess = clamp(r.mess + 0.12);
      decide(s, r, h, p.workdays.includes(today));
    }
    resolveVisits(s);
    tickStories(s);
    for (const r of s.rooms) {
      const p = r.tenant;
      if (!p) continue;
      ACTIONS[p.activity]?.apply(p, r);
      p.outfit = isAway(p) ? 'street' : 'home';
    }
    if (s.minute % 120 === 0 && h >= 18 && h <= 22) socialEvent(s);
    recordActivities(s);
  }
}

export const dayName = s => DAYS[weekday(s)];

// ── 저장 ──────────────────────────────────────────────

export function serialize(s) { return JSON.stringify(s, (k, v) => (k === 'rng' ? undefined : v)); }

// 이전 버전 세이브를 현재 형식으로 올린다. 버전마다 한 단계씩 추가한다.
const migrations = {
  1: s => {
    const fill = p => {
      if (!p) return;
      p.workdays ??= workdaysFor(jobType(p.job), p.id % 7);
      p.attraction ??= 'opposite';
      p.recent ??= [];
      p.busy ??= null;
      p.visitorId ??= null;
    };
    for (const r of s.rooms) {
      fill(r.tenant);
      r.mess ??= 20;
      r.laundry ??= 20;
      r.lease ??= r.tenant ? { start: s.day, end: s.day + 14 + (r.id % 5) * 7 } : null;
    }
    s.applications.forEach(fill);
    s.version = 2;
  },
  2: s => {
    const people=[...s.rooms.map(r=>r.tenant).filter(Boolean),...s.applications],renames=[];
    for(const p of people){
      if(!p||!['남','여'].includes(p.gender)||!Number.isInteger(p.age)||p.age<20||p.age>39||typeof p.name!=='string')throw Error('입주자 정보가 올바르지 않습니다.');
      if(p.visualId!==undefined&&!matchesGender(p.visualId,p.gender))throw Error('인물 이미지 정보가 올바르지 않습니다.');
      if(p.gender==='남'){
        const old=p.name,given=names.여[(p.id-1)%names.여.length];
        p.gender='여';p.name=p.name.slice(0,1)+given;renames.push([old,p.name]);
      }
      if(!matchesAppearance(p.visualId,p))delete p.visualId;
    }
    migrateAppearances(s);
    for(const item of [...(s.logs||[]),...(s.issues||[])])if(typeof item.text==='string')for(const [old,name] of renames)item.text=item.text.replaceAll(old,name);
    s.residenceType='women-only';s.version=3;
  },
};

export function restore(text) {
  const s = JSON.parse(text);
  if (!s || typeof s !== 'object' || !Number.isInteger(s.version) || s.version < 1 || s.version > VERSION)
    throw Error('호환되지 않는 저장 파일입니다.');
  if (!Array.isArray(s.rooms) || !Array.isArray(s.applications)) throw Error('호환되지 않는 저장 파일입니다.');
  while (s.version < VERSION) migrations[s.version](s);
  if (!Number.isInteger(s.day) || s.day < 1 || !Number.isInteger(s.minute) || s.minute < 0 || s.minute >= 1440 || !Number.isFinite(s.cash) || s.rooms.length !== 20 || !Array.isArray(s.logs) || !Array.isArray(s.issues) || !s.upgrades || !Number.isInteger(s.nextId))
    throw Error('호환되지 않는 저장 파일입니다.');
  const ids = new Set();
  for (const r of s.rooms) {
    if (!Number.isInteger(r.id) || r.id % 100 < 1 || r.id % 100 > 4 || Math.floor(r.id / 100) < 1 || Math.floor(r.id / 100) > 5 || ids.has(r.id) || !Number.isFinite(r.rent) || !Number.isFinite(r.deposit) || r.rent < 30 || r.rent > 150 || r.deposit < 0 || r.deposit > 2000)
      throw Error('호실 정보가 올바르지 않습니다.');
    ids.add(r.id);
    if (r.tenant && (!Number.isInteger(r.tenant.age) || r.tenant.age < 20 || !r.tenant.relations || typeof r.tenant.name !== 'string'))
      throw Error('입주자 정보가 올바르지 않습니다.');
  }
  if (s.applications.some(p => !Number.isInteger(p.age) || p.age < 20 || typeof p.name !== 'string'))
    throw Error('지원자 정보가 올바르지 않습니다.');
  for (const key of Object.keys(upgradeInfo))
    if (!Number.isInteger(s.upgrades[key]) || s.upgrades[key] < 0 || s.upgrades[key] > 3) throw Error('시설 정보가 올바르지 않습니다.');
  s.mode = s.mode || 'cozy';
  if (!['cozy', 'management'].includes(s.mode)) throw Error('지원하지 않는 생활 모드입니다.');
  validateSaveDetails(s);
  migrateAppearances(s);
  compactActivityLogs(s);
  recordActivities(s);
  s.rng = Math.random;
  return s;
}

function validateSaveDetails(s) {
  const finite = (v, min = -Infinity, max = Infinity) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const fail = () => { throw Error('저장 파일의 상세 정보가 올바르지 않습니다.'); };
  if(s.residenceType!=='women-only')fail();
  if (!finite(s.earned, 0) || !finite(s.spent, 0) || !finite(s.depositHeld, 0) || s.applications.length > 6 || s.logs.length > 100 || s.issues.length > 8 || s.nextId < 1) fail();
  const people = [...s.rooms.map(r => r.tenant).filter(Boolean), ...s.applications];
  for (const p of people) {
    if (!validStory(p)) fail();
    if (!validActivityLog(p.activityLog)) fail();
    if (!validInteraction(p.interaction)) fail();
    if (p.visualId !== undefined && !matchesAppearance(p.visualId, p)) fail();
    if (!Number.isSafeInteger(p.id) || p.id < 1 || typeof p.name !== 'string' || p.name.length > 30 || p.gender !== '여' || p.age>39 || typeof p.job !== 'string' || p.job.length > 50 || typeof p.quiet !== 'boolean' || !p.relations || Array.isArray(p.relations)) fail();
    for (const k of ['energy', 'hunger', 'hygiene', 'connection', 'desire', 'happiness', 'social', 'tidy']) if (!finite(p[k], 0, 100)) fail();
    for (const k of ['income', 'budget', 'deposit', 'start', 'end', 'lowDays']) if (!finite(p[k], 0, 10000)) fail();
    if (p.start >= p.end || p.end > 24 || !Object.values(p.relations).every(v => finite(v, 0))) fail();
    if (p.partner !== null && !Number.isSafeInteger(p.partner)) fail();
    if (p.visitor !== null && typeof p.visitor !== 'string') fail();
    if (p.visitorId !== null && !Number.isSafeInteger(p.visitorId)) fail();
    if (typeof p.activity !== 'string' || p.activity.length > 100) fail();
    if (!Array.isArray(p.workdays) || p.workdays.length > 7 || !p.workdays.every(d => Number.isInteger(d) && d >= 0 && d <= 6)) fail();
    if (!['opposite', 'same', 'both'].includes(p.attraction)) fail();
    if (!Array.isArray(p.recent) || p.recent.length > 6 || !p.recent.every(a => typeof a === 'string' && a.length <= 100)) fail();
    if (p.busy !== null && (typeof p.busy !== 'object' || typeof p.busy.activity !== 'string' || !finite(p.busy.ticks, 0, 100))) fail();
  }
  for (const p of s.applications) if (!Number.isInteger(p.applied) || p.applied < 1 || p.applied > s.day) fail();
  for (const r of s.rooms) {
    if (r.fault && (typeof r.fault.name !== 'string' || !finite(r.fault.cost, 0, 1000))) fail();
    if (!finite(r.mess, 0, 100) || !finite(r.laundry, 0, 100)) fail();
    if (r.tenant ? !(r.lease && Number.isInteger(r.lease.start) && Number.isInteger(r.lease.end) && r.lease.end > r.lease.start) : r.lease !== null) fail();
  }
  for (const l of s.logs) if (typeof l.text !== 'string' || typeof l.type !== 'string' || !Number.isInteger(l.day) || !finite(l.minute, 0, 1439)) fail();
  for (const i of s.issues) if (!Number.isSafeInteger(i.id) || typeof i.text !== 'string' || !Array.isArray(i.rooms) || !i.rooms.every(id => s.rooms.some(r => r.id === id))) fail();
}

export function resumeIdle(s, now = Date.now()) {
  s.mode = s.mode || 'cozy';
  if (s.paused) { s.lastSavedAt = now; return 0; }
  const last = s.lastSavedAt;
  const elapsed = Number.isFinite(last) && last <= now ? Math.min(7 * 1440, elapsedGameMinutes(now - last)) : 0;
  if (elapsed > 0) step(s, elapsed);
  s.lastSavedAt = now;
  return elapsed;
}
