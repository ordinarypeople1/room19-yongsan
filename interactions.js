export const ACTIONS = [
  {id:'bell',label:'초인종 누르기',icon:'home',activity:'현관 확인'},
  {id:'broadcast',label:'익명 안내방송',icon:'people',activity:'방송 듣기'},
  {id:'music',label:'음악 틀기',icon:'next',activity:'음악 감상'},
  {id:'light',label:'조명 낮추기',icon:'care',activity:'조명 확인'},
];
export const clock = s => s.day*1440+s.minute;
export function available(s,p){
  if(!p)return '입주자가 없습니다.';
  if(p.activity==='출근')return '외출 중입니다.';
  if(p.activity==='수면'||p.activity.includes('비공개'))return '지금은 개인 시간입니다.';
  const wait=(p.interaction?.nextAt||0)-clock(s);
  return wait>0?`게임 시간 ${Math.ceil(wait)}분 뒤 다시 가능`:null;
}
export function activeInteraction(s,p){return p?.interaction?.until>clock(s)?p.interaction:null;}
export function intervene(s,roomId,actionId){
  const r=s.rooms.find(r=>r.id===roomId),p=r?.tenant,a=ACTIONS.find(a=>a.id===actionId);
  if(!a)return '알 수 없는 행동입니다.';
  const error=available(s,p);if(error)return error;
  const count=p.interaction?.day===s.day?p.interaction.count+1:1;
  const annoyed=count>=3||((a.id==='bell'||a.id==='music')&&p.quiet);
  const lines={
    bell:annoyed?'누구세요? 장난은 그만해요.':'어? 아무도 없네…',
    broadcast:annoyed?'방송이 너무 잦은데…':'오늘도 수고했어요? 누구 목소리지?',
    music:annoyed?'조금 조용히 해주면 좋겠어.':'이 노래, 꽤 괜찮네.',
    light:annoyed?'불은 내가 조절할게요.':'조금 어두우니 편안하네.',
  };
  p.interaction={action:a.id,until:clock(s)+20,nextAt:clock(s)+40,day:s.day,count,text:lines[a.id],annoyed};
  p.activity=a.activity;
  p.happiness=Math.max(0,Math.min(100,p.happiness+(annoyed?-4:2)));
  if(count===3&&s.issues.length<8)s.issues.push({id:s.nextId++,rooms:[r.id],text:`${r.id}호: 잦은 생활 방해`,day:s.day});
  s.logs.unshift({day:s.day,minute:s.minute,text:`${r.id}호 · ${a.label} — ${lines[a.id]}`,type:annoyed?'issue':'life'});
  s.logs=s.logs.slice(0,100);
  return null;
}
export function bubble(s,p){
  if(!p||p.activity==='출근'||p.activity==='수면'||p.activity.includes('비공개'))return null;
  const event=activeInteraction(s,p);
  if(event)return {kind:'speech',text:event.text};
  if(p.energy<40)return {kind:'thought',text:'잠깐 쉬고 싶다…'};
  if(p.hunger>55)return {kind:'thought',text:'뭘 먹을까?'};
  if(p.connection<35)return {kind:'thought',text:'누군가와 얘기하고 싶네.'};
  const thoughts={'독서':'한 장만 더 읽자.','음악 감상':'이 곡은 다시 듣고 싶네.','차 마시기':'따뜻한 차 한 잔.','청소':'조금만 정리할까.','빨래':'빨래가 잘 말랐으면.','휴대폰':'답장이 왔을까?','휴식':'오늘은 천천히.','스트레칭':'어깨가 좀 뻐근하네.'};
  return {kind:'thought',text:thoughts[p.activity]||'오늘은 무슨 일이 생길까?'};
}
export function validInteraction(v){
  if(v===undefined)return true;
  return !!v&&ACTIONS.some(a=>a.id===v.action)&&['until','nextAt','day','count'].every(k=>Number.isSafeInteger(v[k])&&v[k]>=0)&&v.count>=1&&typeof v.annoyed==='boolean'&&typeof v.text==='string'&&v.text.length<=100;
}
