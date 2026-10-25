import {nextAppearance,migrateAppearances,matchesGender} from './cast.js';
import {elapsedGameMinutes} from './pace.js';
export const VERSION=1;
const surnames=['김','이','박','최','정','강','윤','임','한','오'];
const names={남:['도현','지훈','준서','현우','시우','민재','선우','태윤'],여:['서연','지우','수빈','하은','서윤','민서','예진','소연']};
const jobs=[['디자이너',320,9,18],['개발자',430,10,19],['간호사',340,14,23],['카페 매니저',280,7,16],['대학원생',180,10,17],['프리랜서',300,11,16],['출판 편집자',310,9,18],['호텔 직원',290,14,23]];
export const rand=(n,rng=Math.random)=>Math.floor(rng()*n);
export const clamp=n=>Math.max(0,Math.min(100,n));
export function person(s){const gender=rand(2,s.rng)?'여':'남';const j=jobs[rand(jobs.length,s.rng)];return {id:s.nextId++,name:surnames[rand(10,s.rng)]+names[gender][rand(8,s.rng)],gender,visualId:nextAppearance(s,gender),age:20+rand(20,s.rng),job:j[0],income:j[1],start:j[2],end:j[3],quiet:rand(2,s.rng)===0,social:30+rand(65,s.rng),tidy:30+rand(65,s.rng),budget:55+rand(50,s.rng),deposit:500+rand(11,s.rng)*100,energy:80,hunger:20,hygiene:85,connection:50,desire:20+rand(50,s.rng),happiness:75,activity:'휴식',visitor:null,partner:null,relations:{},lowDays:0};}
export function log(s,text,type='life'){s.logs.unshift({day:s.day,minute:s.minute,text,type});s.logs=s.logs.slice(0,100);}
export function createGame(rng=Math.random,mode='cozy'){const s={version:VERSION,mode,day:1,minute:480,cash:1800,depositHeld:0,nextId:1,rooms:[],applications:[],logs:[],upgrades:{insulation:0,plumbing:0,lounge:0},earned:0,spent:0,issues:[],rng};for(let f=1;f<=5;f++)for(let n=1;n<=4;n++)s.rooms.push({id:f*100+n,rent:65+(f-1)*3,deposit:500,tenant:null,fault:null,level:0});for(let i=0;i<9;i++){const p=person(s);s.rooms[i*2].tenant=p;s.depositHeld+=500;}generateApplications(s);log(s,'한강로 19길의 새 관리인이 되었습니다. 공실의 임대 조건을 확인하고 첫 입주자를 맞아보세요.','system');return s;}
export function generateApplications(s){const empty=s.rooms.filter(r=>!r.tenant);const capacity=Math.min(6,empty.length*2);while(s.applications.length<capacity){const p=person(s);s.applications.push({...p,applied:s.day});}if(!empty.length)s.applications=[];}
export function approve(s,id,roomId){const a=s.applications.find(a=>a.id===id),r=s.rooms.find(r=>r.id===roomId);if(!a||!r||r.tenant)return '빈 호실을 선택해주세요.';if(a.budget<r.rent||a.deposit<r.deposit)return '지원자의 예산보다 임대 조건이 높습니다.';r.tenant={...a};s.cash+=0;s.depositHeld+=r.deposit;s.applications=s.applications.filter(p=>p.id!==id);log(s,`${r.id}호 ${a.name} 입주. 월세 ${r.rent}만 원 / 보증금 ${r.deposit}만 원 별도 예치.`,'finance');if(s.rooms.every(r=>r.tenant))s.applications=[];return null;}
export function reject(s,id){s.applications=s.applications.filter(p=>p.id!==id);}
export function repair(s,id){const r=s.rooms.find(r=>r.id===id);if(!r?.fault)return '수리가 필요하지 않습니다.';const cost=r.fault.cost;if(s.cash<cost)return '운영 자금이 부족합니다.';s.cash-=cost;s.spent+=cost;log(s,`${id}호 ${r.fault.name} 수리 완료. −${cost}만 원`,'finance');r.fault=null;if(r.tenant)r.tenant.happiness=clamp(r.tenant.happiness+15);return null;}
export const upgradeInfo={insulation:{name:'층간소음 방음',cost:280,desc:'소음 민원 발생 확률 감소'},plumbing:{name:'급배수 설비',cost:320,desc:'고장 확률 감소'},lounge:{name:'옥상 라운지',cost:240,desc:'교류와 만족도 증가'}};
export function upgrade(s,key){const u=upgradeInfo[key];if(!u||s.upgrades[key]>=3)return '최대 단계입니다.';const cost=u.cost*(s.upgrades[key]+1);if(s.cash<cost)return '운영 자금이 부족합니다.';s.cash-=cost;s.spent+=cost;s.upgrades[key]++;log(s,`${u.name} ${s.upgrades[key]}단계 완료. −${cost}만 원`,'finance');return null;}
export function mediate(s,id){const issue=s.issues.find(x=>x.id===id);if(!issue)return;for(const rid of issue.rooms){const p=s.rooms.find(r=>r.id===rid)?.tenant;if(p)p.happiness=clamp(p.happiness+8);}s.issues=s.issues.filter(x=>x.id!==id);log(s,`${issue.text} → 대화로 중재했습니다.`,'social');}
function socialEvent(s){const home=s.rooms.filter(r=>r.tenant&&!['출근','수면'].includes(r.tenant.activity));if(home.length<2)return;const a=home[rand(home.length,s.rng)],b=home.filter(r=>r!==a)[rand(home.length-1,s.rng)];const p=a.tenant,q=b.tenant;const relation=p.relations[q.id]||0;if((p.quiet!==q.quiet)&&rand(5+s.upgrades.insulation*3,s.rng)===0){if(s.issues.length<8){s.issues.push({id:s.nextId++,rooms:[a.id,b.id],text:`${a.id}호와 ${b.id}호 생활 소음 갈등`,day:s.day});p.happiness=clamp(p.happiness-7);q.happiness=clamp(q.happiness-5);log(s,`${a.id}호 ${p.name}: 늦은 생활 소음이 불편하다는 민원.`,'issue');}return;}p.relations[q.id]=relation+10;q.relations[p.id]=(q.relations[p.id]||0)+10;p.connection=clamp(p.connection+20);q.connection=clamp(q.connection+20);p.happiness=clamp(p.happiness+3);q.happiness=clamp(q.happiness+3);if(relation>=30&&!p.partner&&!q.partner){p.partner=q.id;q.partner=p.id;log(s,`${p.name} · ${q.name}, 서로의 마음을 확인했습니다. 함께하는 시간이 늘어납니다.`,'social');}else log(s,`${a.id}호 ${p.name}와 ${b.id}호 ${q.name}, ${s.upgrades.lounge?'옥상 라운지':'공동 현관'}에서 대화를 나눴습니다.`,'social');}
function midnight(s){s.day++;s.cash-=24;s.spent+=24;let income=0;for(const r of s.rooms){const p=r.tenant;if(!p)continue;if(s.mode==='cozy'&&r.fault){r.fault=null;p.happiness=clamp(p.happiness+10);log(s,`${r.id}호의 설비를 정기 점검으로 고쳤습니다.`,'life');}const daily=r.rent/30;income+=daily;p.happiness=clamp(p.happiness+(r.fault?-8:2)+s.upgrades.lounge-r.level*0.2);p.lowDays=p.happiness<25?p.lowDays+1:0;if(p.lowDays>=3&&s.mode!=='cozy'){log(s,`${r.id}호 ${p.name}, 생활 불편으로 퇴거했습니다. 보증금 반환.`,'issue');s.depositHeld-=r.deposit;for(const other of s.rooms)if(other.tenant?.partner===p.id)other.tenant.partner=null;r.tenant=null;}else if(!r.fault&&rand(12+s.upgrades.plumbing*12,s.rng)===0){r.fault={name:['온수기 이상','배수관 누수','냉난방기 고장'][rand(3,s.rng)],cost:35+rand(4,s.rng)*10};log(s,`${r.id}호 ${r.fault.name}. 수리를 요청했습니다.`,'issue');}}
s.cash+=income;s.earned+=income;if(s.mode==='cozy'){s.cash=Math.max(s.cash,300);s.issues=s.issues.filter(i=>s.day-i.day<2);}log(s,`일일 정산: 월세 일할 +${income.toFixed(1)}만 / 운영비 −24만`,'finance');s.applications=s.applications.filter(p=>s.day-p.applied<4);generateApplications(s);}
export function step(s,minutes=10){for(let i=0;i<minutes;i+=10){s.minute+=10;if(s.minute>=1440){s.minute-=1440;midnight(s);}const h=s.minute/60;for(const r of s.rooms){const p=r.tenant;if(!p)continue;p.energy=clamp(p.energy-.35);p.hunger=clamp(p.hunger+.65);p.hygiene=clamp(p.hygiene-.4);p.connection=clamp(p.connection-.2);p.desire=clamp(p.desire+.12);p.visitor=null;
if(h<6.5||h>=24-(p.end>22?0:1)){p.activity='수면';p.outfit='home';p.energy=clamp(p.energy+2.5);}
else if(h>=p.start&&h<p.end&&s.day%7!==0){p.activity='출근';p.outfit='street';}
else if(p.hygiene<50&&!r.fault){p.activity='샤워 · 비공개';p.hygiene=clamp(p.hygiene+18);}
else if(p.activity==='샤워 · 비공개'||(h>=p.end&&h<p.end+1/6)){p.activity='속옷 갈아입기 · 비공개';}
else if(p.hunger>60){p.activity='식사';p.hunger=clamp(p.hunger-22);}
else if(h>=20&&h<22&&p.partner&&p.desire>45){p.activity='둘만의 시간 · 비공개';p.desire=clamp(p.desire-8);p.connection=clamp(p.connection+8);}
else if(h>=19&&h<21&&p.social>65){p.activity=p.partner?'연인 방문':'친구 방문';p.visitor=p.partner?'연인':'외부 친구';p.connection=clamp(p.connection+3);}
else if(p.energy<40){p.activity='휴식';p.energy=clamp(p.energy+1.2);}
else {const routines=['청소','빨래','음악 감상','스트레칭','차 마시기','휴대폰','독서'];p.activity=routines[(Math.floor(s.minute/30)+p.id+s.day)%routines.length];}
p.outfit=p.activity==='출근'?'street':'home';}

if(s.minute%120===0&&h>=18&&h<=22)socialEvent(s);}}
export function serialize(s){return JSON.stringify(s,(k,v)=>k==='rng'?undefined:v);}
export function restore(text){const s=JSON.parse(text);if(s.version!==VERSION||!Number.isInteger(s.day)||s.day<1||!Number.isInteger(s.minute)||s.minute<0||s.minute>=1440||!Number.isFinite(s.cash)||!Array.isArray(s.rooms)||s.rooms.length!==20||!Array.isArray(s.applications)||!Array.isArray(s.logs)||!Array.isArray(s.issues)||!s.upgrades||!Number.isInteger(s.nextId))throw Error('호환되지 않는 저장 파일입니다.');const ids=new Set();for(const r of s.rooms){if(!Number.isInteger(r.id)||r.id%100<1||r.id%100>4||Math.floor(r.id/100)<1||Math.floor(r.id/100)>5||ids.has(r.id)||!Number.isFinite(r.rent)||!Number.isFinite(r.deposit)||r.rent<30||r.rent>150||r.deposit<0||r.deposit>2000)throw Error('호실 정보가 올바르지 않습니다.');ids.add(r.id);if(r.tenant&&(!Number.isInteger(r.tenant.age)||r.tenant.age<20||!r.tenant.relations||typeof r.tenant.name!=='string'))throw Error('입주자 정보가 올바르지 않습니다.');}if(s.applications.some(p=>!Number.isInteger(p.age)||p.age<20||typeof p.name!=='string'))throw Error('지원자 정보가 올바르지 않습니다.');for(const key of Object.keys(upgradeInfo))if(!Number.isInteger(s.upgrades[key])||s.upgrades[key]<0||s.upgrades[key]>3)throw Error('시설 정보가 올바르지 않습니다.');s.mode=s.mode||'cozy';if(!['cozy','management'].includes(s.mode))throw Error('지원하지 않는 생활 모드입니다.');validateSaveDetails(s);migrateAppearances(s);s.rng=Math.random;return s;}

function validateSaveDetails(s){
const finite=(v,min=-Infinity,max=Infinity)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const fail=()=>{throw Error('저장 파일의 상세 정보가 올바르지 않습니다.');};
if(!finite(s.earned,0)||!finite(s.spent,0)||!finite(s.depositHeld,0)||s.applications.length>6||s.logs.length>100||s.issues.length>8||s.nextId<1)fail();
const people=[...s.rooms.map(r=>r.tenant).filter(Boolean),...s.applications];
for(const p of people){if(p.visualId!==undefined&&!matchesGender(p.visualId,p.gender))fail();if(!Number.isSafeInteger(p.id)||p.id<1||typeof p.name!=='string'||p.name.length>30||!['남','여'].includes(p.gender)||typeof p.job!=='string'||p.job.length>50||typeof p.quiet!=='boolean'||!p.relations||Array.isArray(p.relations))fail();
for(const k of ['energy','hunger','hygiene','connection','desire','happiness','social','tidy'])if(!finite(p[k],0,100))fail();
for(const k of ['income','budget','deposit','start','end','lowDays'])if(!finite(p[k],0,10000))fail();
if(p.start>=p.end||p.end>24||!Object.values(p.relations).every(v=>finite(v,0)))fail();
if(p.partner!==null&&!Number.isSafeInteger(p.partner))fail();
if(p.visitor!==null&&typeof p.visitor!=='string')fail();
if(typeof p.activity!=='string'||p.activity.length>100)fail();}
for(const p of s.applications)if(!Number.isInteger(p.applied)||p.applied<1||p.applied>s.day)fail();
for(const r of s.rooms)if(r.fault&&(typeof r.fault.name!=='string'||!finite(r.fault.cost,0,1000)))fail();
for(const l of s.logs)if(typeof l.text!=='string'||typeof l.type!=='string'||!Number.isInteger(l.day)||!finite(l.minute,0,1439))fail();
for(const i of s.issues)if(!Number.isSafeInteger(i.id)||typeof i.text!=='string'||!Array.isArray(i.rooms)||!i.rooms.every(id=>s.rooms.some(r=>r.id===id)))fail();
}

export function resumeIdle(s,now=Date.now()){s.mode=s.mode||'cozy';if(s.paused){s.lastSavedAt=now;return 0;}const last=s.lastSavedAt;const elapsed=Number.isFinite(last)&&last<=now?Math.min(7*1440,elapsedGameMinutes(now-last)):0;if(elapsed>0)step(s,elapsed);s.lastSavedAt=now;return elapsed;}

