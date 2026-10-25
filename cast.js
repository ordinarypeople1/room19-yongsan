// Individual assets, never columns sliced from a shared group photograph.
export const CAST = [
  {file:'man-01',label:'둥근 얼굴 · 짧은 머리',scale:.94},
  {file:'man-02',label:'긴 얼굴 · 곱슬머리 · 안경',scale:1.04},
  {file:'man-03',label:'각진 얼굴 · 운동형 체격',scale:1.02},
  {file:'man-04',label:'수염 · 넓은 이마',scale:.98},
  {file:'woman-01',label:'주근깨 · 웨이브 단발',scale:.93},
  {file:'woman-02',label:'짧은 커트 · 뚜렷한 턱선',scale:1.04},
  {file:'woman-03',label:'긴 생머리 · 하트형 얼굴',scale:.96},
  {file:'woman-04',label:'곱슬머리 · 사각 안경',scale:.98},
];
export const matchesGender=(index,gender)=>Number.isInteger(index)&&index>=(gender==='여'?4:0)&&index<(gender==='여'?8:4);
export function visualIndex(p){return matchesGender(p.visualId,p.gender)?p.visualId:(p.gender==='여'?4:0)+Math.abs(Number(p.id)||0)%4;}
export function nextAppearance(s,gender){
  const start=gender==='여'?4:0,counts=[0,0,0,0];
  for(const p of [...(s.rooms||[]).map(r=>r.tenant),...(s.applications||[])]){
    if(p&&p.gender===gender&&matchesGender(p.visualId,gender))counts[p.visualId-start]++;
  }
  return start+counts.indexOf(Math.min(...counts));
}
export function migrateAppearances(s){
  const people=[...s.rooms.map(r=>r.tenant).filter(Boolean),...s.applications];
  for(const p of people)if(p.visualId===undefined)p.visualId=nextAppearance(s,p.gender);
  return s;
}
