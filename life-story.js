// Canonical interaction rules. Language models never write game state.
import {clock} from './interactions.js';

export const LIFE_ACTIONS = [
  {id:'talk',label:'말 걸기',input:'오늘 하루 어땠는지 물어보기'},
  {id:'meal',label:'같이 먹기',input:'저녁을 같이 먹자고 제안하기'},
  {id:'gift',label:'도시락 건네기',input:'도시락을 건네기'},
  {id:'help',label:'정리 도와주기',input:'방 정리를 도와주겠다고 제안하기'},
  {id:'message',label:'메시지 남기기',input:'오늘도 수고했다고 메시지 남기기'},
];
export const INTENTS = [...LIFE_ACTIONS.map(a=>a.id),'unknown'];
const cap = n=>Math.max(0,Math.min(100,n));
export const away = p=>['출근','외출','연인 집에 감'].includes(p?.activity);
export const privateTime = p=>p?.activity==='수면'||p?.activity?.includes('비공개');
export function relationship(p) {const n=p?.playerBond||0;return n>=60?'마음을 나누는 이웃':n>=30?'편안한 이웃':n>=10?'인사를 나누는 사이':'아직 알아가는 사이';}
export function inferIntent(input) {
  // Deliberately conservative offline grammar; unsupported commands never become actions.
  const t=input.trim().replace(/[.!?。！？]+$/,'');
  const exact=LIFE_ACTIONS.find(a=>a.input===t||a.label===t);if(exact)return exact.id;
  if(/^(안녕(하세요)?|반가워요?|오늘( 하루)? (어땠어|어땠어요|어때|어때요)|말 걸기|인사하기)$/.test(t))return 'talk';
  if(/^(같이|함께) (밥|저녁|식사)(을)? (먹자|먹어요|먹을래|먹을래요|하기)$/.test(t))return 'meal';
  if(/^도시락(을)? (건네기|주기|선물하기)$/.test(t))return 'gift';
  if(/^(방 )?(정리|청소)(를)? 도와(주기|줄게|줄까요)$/.test(t))return 'help';
  if(/^메시지(를)? 남기기$/.test(t))return 'message';
  return 'unknown';
}
export function canAct(s,p,intent) {
  if(!p)return '아직 입주자가 없는 방이에요.';
  if(intent==='unknown')return '아직 이해하지 못한 행동이에요. 아래 행동 버튼을 이용하거나, 한 가지 행동으로 다시 적어주세요.';
  if((p.storyNextAt||0)>clock(s))return `조금 전의 만남이 이어지고 있어요. 게임 시간 ${p.storyNextAt-clock(s)}분 후 다시 이야기해요.`;
  if(intent==='message')return null;
  if(away(p))return '지금은 외출 중이에요. 메시지를 남겨보세요.';
  if(privateTime(p))return '지금은 혼자만의 시간이에요. 메시지를 남겨보세요.';
  return null;
}
export function act(s,roomId,intent,input) {
  const r=s.rooms.find(r=>r.id===roomId),p=r?.tenant;
  if(!INTENTS.includes(intent))intent='unknown';
  const error=canAct(s,p,intent);if(error)return {error};
  if(typeof input!=='string'||!input.trim()||input.length>500)return {error:'1–500자로 행동을 적어주세요.'};
  p.playerBond??=0;p.memories??=[];p.story??=[];
  const previous=p.memories.at(-1),unavailable=away(p)||privateTime(p);
  let accepted=true,summary='',reply='',effect='',activity=null,bond=0;
  if(intent==='message') {
    summary=unavailable?'문 앞에 안부 메시지를 남겼다. 다음에 여유가 생기면 읽을 것이다.':'안부 메시지를 건넸다.';
    reply=unavailable?'':previous?'기억해주셨네요. 고마워요.':'안부 고마워요. 오늘도 잘 보내세요.';
    bond=unavailable?0:2;effect=unavailable?'메시지 전달 대기':'친밀감 +2';
  } else if(intent==='meal'&&(p.energy<30||(p.quiet&&p.playerBond<10))) {
    accepted=false;summary='함께 식사하자는 제안을 조심스럽게 거절했다.';
    reply=p.energy<30?'오늘은 너무 지쳐서요. 조금 쉬고 싶어요.':'아직은 조금 어색하네요. 먼저 이야기부터 나눌까요?';effect='오늘은 각자의 저녁';
  } else if(intent==='help'&&p.quiet&&p.playerBond<6) {
    accepted=false;summary='정리를 돕겠다는 제안을 정중하게 사양했다.';reply='마음은 고마운데, 제 물건은 제가 정리하고 싶어요.';effect='개인적인 공간을 존중했어요';
  } else if(intent==='talk') {
    summary='잠시 하던 일을 멈추고 오늘 하루에 대해 이야기를 나눴다.';
    reply=previous?`지난번 ${previous.label}, 기억나요. 다시 보니 반갑네요.`:p.quiet?'오늘은 조용히 보내고 있었어요. 당신은요?':'마침 누군가와 이야기하고 싶었어요. 오늘 어땠어요?';
    bond=4;activity='이웃과 대화';p.connection=cap(p.connection+6);effect='친밀감 +4 · 교류 +6';
  } else if(intent==='meal') {
    summary='식탁에 자리를 내어주고 함께 식사를 시작했다.';reply='좋아요. 같이 먹으면 더 맛있겠네요.';
    bond=6;activity='함께 식사';p.hunger=cap(p.hunger-25);p.connection=cap(p.connection+8);effect='친밀감 +6 · 허기 −25';
  } else if(intent==='gift') {
    summary='건넨 도시락을 고맙게 받아 식탁 위에 올려두었다.';reply='이걸 저 주려고 챙겨오셨어요? 잘 먹을게요.';
    bond=5;p.happiness=cap(p.happiness+3);effect='친밀감 +5 · 만족 +3';
  } else if(intent==='help') {
    summary='함께 물건을 제자리에 놓으며 방을 정리했다.';reply='혼자 하면 미루게 되는데, 같이 하니까 금방이네요.';
    bond=4;activity='함께 정리';r.mess=cap(r.mess-25);effect='친밀감 +4 · 어지러움 −25';
  }
  p.playerBond=cap(p.playerBond+bond);p.storyNextAt=clock(s)+20;
  if(activity){p.activity=activity;p.storyUntil=clock(s)+20;}
  const label={talk:'나눴던 이야기',meal:'함께한 식사',gift:'챙겨준 도시락',help:'함께한 방 정리',message:'남겨준 메시지'}[intent];
  const event={id:s.nextId++,day:s.day,minute:s.minute,intent,input:input.trim(),summary,reply,effect,accepted,pending:intent==='message'&&unavailable,source:'local'};
  p.story.push(event);p.story=p.story.slice(-24);
  if(accepted&&!event.pending){p.memories.push({day:s.day,label});p.memories=p.memories.slice(-8);}
  s.logs.unshift({day:s.day,minute:s.minute,text:`${r.id}호 ${p.name} · ${summary}`,type:'social'});s.logs=s.logs.slice(0,100);
  return {event};
}
export function tickStories(s) {
  for(const r of s.rooms){const p=r.tenant;if(!p||away(p)||privateTime(p))continue;
    for(const e of p.story||[])if(e.pending){
      e.pending=false;e.summary='남겨둔 안부 메시지를 읽고 답장을 보냈다.';e.reply='이제야 봤어요. 챙겨줘서 고마워요.';e.effect='메시지 읽음 · 친밀감 +2';
      p.playerBond=cap((p.playerBond||0)+2);p.memories??=[];p.memories.push({day:s.day,label:'남겨준 메시지'});p.memories=p.memories.slice(-8);
      s.logs.unshift({day:s.day,minute:s.minute,text:`${r.id}호 ${p.name}에게 답장이 왔습니다.`,type:'social'});s.logs=s.logs.slice(0,100);
    }
  }
}
export function sceneText(r) {
  const p=r.tenant;if(!p)return '아직 아무도 살지 않는 방. 창으로 들어온 빛이 바닥에 길게 놓여 있다.';
  if(away(p))return p.activity==='출근'?`${p.name}은 일을 하러 나갔다. 빈방에는 아침의 흔적이 남아 있다.`:`${p.name}은 ${p.activity==='연인 집에 감'?'연인의 집에':'밖에'} 있다. 돌아오면 읽을 메시지를 남길 수 있다.`;
  const scenes={'수면':'방 안이 조용하다. 잠든 이웃에게 잠시 편안한 시간을 남겨둔다.','식사':'식탁 앞에서 천천히 한 끼를 먹고 있다.','함께 식사':'둘이 앉은 식탁 위로 소소한 이야기가 오간다.','이웃과 대화':'잠시 하던 일을 내려놓고 당신의 이야기에 귀를 기울인다.','함께 정리':'함께 정리한 자리마다 방이 조금씩 넓어진다.','독서':'책장을 천천히 넘기고 있다. 창밖의 소리는 조금 멀어진다.','휴식':'익숙한 방에서 잠깐 숨을 고르고 있다.','청소':'물건들을 하나씩 제자리로 옮기고 있다.','빨래':'쌓인 빨랫감을 정리하며 하루를 돌보고 있다.','차 마시기':'따뜻한 잔을 손에 쥐고 잠시 쉬고 있다.','휴대폰':'휴대폰을 살펴보며 누군가의 소식을 기다린다.','음악 감상':'좋아하는 음악을 틀어놓고 시간을 보내고 있다.','스트레칭':'굳었던 어깨와 등을 천천히 펴고 있다.','친구 방문':'찾아온 친구와 오랜만의 이야기를 나누고 있다.','연인 방문':'연인과 함께 익숙한 방에서 저녁을 보내고 있다.'};
  if(p.activity.includes('샤워'))return '닫힌 욕실 문 너머에서 물소리가 들린다. 잠시 혼자만의 시간이다.';
  if(p.activity.includes('비공개'))return '문을 닫고 사적인 시간을 보내고 있다. 방 안의 불빛이 은은하다.';
  return scenes[p.activity]||`${p.name}은 ${p.activity} 중이다.`;
}
export function validStory(p) {
  const num=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
  if(p.playerBond!==undefined&&!num(p.playerBond,100))return false;
  if(p.storyUntil!==undefined&&!num(p.storyUntil))return false;
  if(p.storyNextAt!==undefined&&!num(p.storyNextAt))return false;
  if(p.lastSeenStory!==undefined&&!num(p.lastSeenStory))return false;
  if(p.memories!==undefined&&(!Array.isArray(p.memories)||p.memories.length>8||!p.memories.every(m=>m&&num(m.day)&&typeof m.label==='string'&&m.label.length<=80)))return false;
  return p.story===undefined||(Array.isArray(p.story)&&p.story.length<=24&&p.story.every(e=>e&&num(e.id)&&num(e.day)&&num(e.minute,1439)&&INTENTS.includes(e.intent)&&typeof e.accepted==='boolean'&&typeof e.pending==='boolean'&&['local','openrouter'].includes(e.source)&&['input','summary','reply','effect'].every(k=>typeof e[k]==='string'&&e[k].length<=600)));
}
