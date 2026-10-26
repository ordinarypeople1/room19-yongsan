// Individual assets, never columns sliced from a shared group photograph.
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
  {file:'woman-05',gender:'여',age:21,label:'부드러운 얼굴 · 어깨 길이 머리',scale:.96},
  {file:'woman-06',gender:'여',age:26,label:'옆 가르마 · 단정한 단발',scale:.98},
  {file:'woman-07',gender:'여',age:34,label:'자연스러운 미소 · 낮게 묶은 머리',scale:1},
  {file:'woman-08',gender:'여',age:39,label:'얇은 안경 · 차분한 레이어드 헤어',scale:.98},
];
export const matchesGender=(index,gender)=>Number.isInteger(index)&&CAST[index]?.gender===gender;
export const matchesAppearance=(index,p)=>matchesGender(index,p.gender)&&Math.abs(CAST[index].age-p.age)<=2;
export function candidates(gender,age){return CAST.map((_,i)=>i).filter(i=>matchesGender(i,gender)&&Math.abs(CAST[i].age-age)<=2);}
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
