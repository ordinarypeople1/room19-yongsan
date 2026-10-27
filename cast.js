// Individual assets, never columns sliced from a shared group photograph.
// woman-01~04 와 남성 4종은 기존 저장의 인덱스를 보존합니다. woman-05 이후는 scripts/cast-roster.mjs 와 같은 내용입니다.
// 이미지 파일이 실제로 있는 인물만 cast-ready.js 에 등록되어 새 입주자에게 배정됩니다.
import {READY_FILES} from './cast-ready.js';
const READY=new Set(READY_FILES);
export const CAST = [
  // Legacy indices remain stable so older saves can be migrated safely.
  {file:'man-01',gender:'남',age:36,label:'둥근 얼굴 · 짧은 머리',scale:.94},
  {file:'man-02',gender:'남',age:28,label:'긴 얼굴 · 곱슬머리 · 안경',scale:1.04},
  {file:'man-03',gender:'남',age:25,label:'각진 얼굴 · 운동형 체격',scale:1.02},
  {file:'man-04',gender:'남',age:39,label:'수염 · 넓은 이마',scale:.98},
  {file:'woman-01',gender:'여',age:29,label:'주근깨 · 웨이브 단발',scale:.93},
  {file:'woman-02',gender:'여',age:32,label:'짧은 커트 · 뚜렷한 턱선',scale:1.04},
  {file:'woman-03',gender:'여',age:24,label:'긴 생머리 · 하트형 얼굴',scale:.96},
  {file:'woman-04',gender:'여',age:38,label:'곱슬머리 · 사각 안경',scale:.98},
  {file:'woman-05',gender:'여',age:21,label:'양갈래 낮은 묶음 · 밝은 갭티스 미소',scale:0.96},
  {file:'woman-06',gender:'여',age:26,label:'허리까지 오는 버건디 웨이브 · 짙은 눈썹',scale:0.98},
  {file:'woman-07',gender:'여',age:34,label:'코퍼 컬러 짧은 레이어드 · 높은 콧대',scale:1},
  {file:'woman-08',gender:'여',age:39,label:'낮은 시뇽 · 넓은 이마 · 진주 귀걸이',scale:0.98},
  {file:'woman-09',gender:'여',age:23,label:'하이 포니테일 · 햇볕에 그을린 러너',scale:1.01},
  {file:'woman-10',gender:'여',age:30,label:'허리 아래 생머리 · 일자 앞머리 · 붉은 입술',scale:1.03},
  {file:'woman-11',gender:'여',age:27,label:'볼륨 오번 펌 · 코 피어싱 · 장난스러운 미소',scale:0.93},
  {file:'woman-12',gender:'여',age:35,label:'은회색 짧은 크롭 · 각진 턱 · 데님 셔츠',scale:1},
  {file:'woman-13',gender:'여',age:22,label:'라벤더 양쪽 땋은 머리 · 교정기 · 동그란 얼굴',scale:0.98},
  {file:'woman-14',gender:'여',age:33,label:'굵은 외줄 땋은 머리 · 풍성한 체형 · 입가 점',scale:0.97},
  {file:'woman-15',gender:'여',age:28,label:'비대칭 버건디 단발 · 날카로운 턱 · 여러 개의 귀걸이',scale:1},
  {file:'woman-16',gender:'여',age:25,label:'구릿빛 하이라이트 웨이브 · 통통한 볼 · 꽃 핀',scale:0.95},
  {file:'woman-17',gender:'여',age:36,label:'깊은 옆 가르마 밤색 롭 · 높은 이마 · 단정한 인상',scale:1.01},
  {file:'woman-18',gender:'여',age:20,label:'보울 컷 · 짧은 앞머리 · 작고 둥근 얼굴',scale:0.94},
  {file:'woman-19',gender:'여',age:31,label:'가운데 가르마 긴 흑발 · 짙은 일자 눈썹 · 벌어진 앞니',scale:1},
  {file:'woman-20',gender:'여',age:37,label:'따뜻한 갈색 레이어드 · 관자놀이 새치 · 큰 웃음',scale:0.95},
  {file:'woman-21',gender:'여',age:24,label:'울프컷 · 남색 빛 흑발 · 눈 밑 점',scale:1.02},
  {file:'woman-22',gender:'여',age:29,label:'볼륨 오번 웨이브 · 하트형 얼굴 · 자신감 있는 미소',scale:0.98},
  {file:'woman-23',gender:'여',age:32,label:'반묶음 애쉬브라운 · 긴 얼굴 · 주근깨',scale:1.03},
  {file:'woman-24',gender:'여',age:38,label:'짧은 자연 웨이브 · 푸근한 얼굴 · 따뜻한 갈색 피부',scale:0.97},
  {file:'woman-25',gender:'여',age:26,label:'뿌리 보이는 허니 블론드 · 작은 하트 얼굴',scale:0.97},
  {file:'woman-26',gender:'여',age:34,label:'헝클어진 탑 넛 · 야외 활동으로 그을린 피부',scale:1},
  {file:'woman-27',gender:'여',age:39,label:'자두빛 갈색 웨이브 · 높은 광대 · 단정한 붉은 립',scale:1.01},
  {file:'woman-28',gender:'여',age:21,label:'쌍 올림머리 · 통통하고 둥근 얼굴 · 환한 웃음',scale:0.94},
  {file:'woman-29',gender:'여',age:28,label:'귀 뒤로 넘긴 턱선 단발 · 짙은 피부 · 시크한 미소',scale:1.03},
  {file:'woman-30',gender:'여',age:30,label:'구름 같은 펌 · 에어리 앞머리 · 동그란 안경',scale:0.94},
];
export const isReady=i=>CAST[i]?.gender==='남'||READY.has(CAST[i]?.file);
export const matchesGender=(index,gender)=>Number.isInteger(index)&&CAST[index]?.gender===gender;
export const matchesAppearance=(index,p)=>matchesGender(index,p.gender)&&isReady(index)&&Math.abs(CAST[index].age-p.age)<=2;
export function candidates(gender,age){return CAST.map((_,i)=>i).filter(i=>matchesGender(i,gender)&&isReady(i)&&Math.abs(CAST[i].age-age)<=2);}
export function visualIndex(p){return matchesAppearance(p.visualId,p)?p.visualId:nextAppearance({rooms:[],applications:[]},p.gender,p.age);}
export function nextAppearance(s,gender,age=29){
  const eligible=candidates(gender,age);
  if(!eligible.length)throw Error('나이에 맞는 인물 이미지가 없습니다.');
  const people=[...(s.rooms||[]).map(r=>r.tenant),...(s.applications||[])];
  return eligible.reduce((best,i)=>people.filter(p=>p?.visualId===i).length<people.filter(p=>p?.visualId===best).length?i:best,eligible[0]);
}
export function migrateAppearances(s){
  const people=[...s.rooms.map(r=>r.tenant).filter(Boolean),...s.applications];
  for(const p of people)if(p.visualId===undefined)p.visualId=nextAppearance(s,p.gender,p.age);
  return s;
}
