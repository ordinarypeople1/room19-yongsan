export const ACTIVITY_LOG_LIMIT=240;
function hash(day,minute,id){let n=Math.imul(day*1440+minute,2654435761)^Math.imul(id,1597334677);n^=n>>>16;return n>>>0;}
// 화면에는 내부용 꼬리표(' · 비공개')와 '속옷' 표기를 드러내지 않는다.
export const displayActivity=a=>String(a??'').replace('속옷 갈아입기','옷 갈아입기').replace(/\s*·\s*비공개$/,'');
// 19+ 기록: 성인 연인·본인의 사적인 밤. 장면은 분위기와 감각까지만 쓰고 신체 부위·행위의 직접 묘사는 하지 않는다.
const COUPLE=[
  '{q}와 문을 걸어 잠그고 오래 입을 맞춘다. 서로의 옷이 한 겹씩 바닥으로 떨어지고 방 안의 공기가 뜨거워진다.',
  '{q}의 목덜미에 입술을 묻은 채 침대로 쓰러진다. 숨이 엉키고 손끝이 맨살을 따라 느리게 내려간다.',
  '불을 낮춘 방, {q}의 품에서 달아오른 숨을 삼킨다. 이불 아래에서 두 사람의 몸이 천천히 포개진다.',
  '{q}가 귓가에 낮게 속삭이자 온몸이 달아오른다. 서로를 놓지 못한 채 밤이 깊어간다.',
  '입술이 떨어질 틈 없이 이어지고 {q}의 손이 허리를 끌어당긴다. 침대 시트가 구겨지는 소리가 난다.',
  '{q}와 살결을 맞댄 채 가쁜 숨을 나눈다. 땀에 젖은 이마를 맞대고 낮게 웃는다.',
  '블라인드를 내리고 {q}를 침대 위로 끌어당긴다. 서두르지 않고 서로의 몸을 오래 확인한다.',
  '{q}의 셔츠 단추를 하나씩 풀며 입을 맞춘다. 두 사람의 숨소리가 방 안에 낮게 번진다.',
];
const SOLO=[
  '불을 끄고 침대에 누워 이불 속에서 자기 몸을 천천히 어루만진다. 달뜬 숨이 조금씩 깊어진다.',
  '혼자 있는 밤, 오래 참았던 열기를 달래듯 몸 구석구석에 손을 올린다. 입술을 깨물어 소리를 삼킨다.',
  '달아오른 몸을 어쩌지 못해 베개를 끌어안는다. 눈을 감고 스스로를 달래며 숨을 고른다.',
  '스탠드를 낮추고 이불 속으로 파고든다. 떨리는 손끝을 따라 몸이 느리게 달아오른다.',
];
const SHOWER=[
  '뜨거운 물줄기 아래서 목덜미와 어깨를 천천히 씻어 내린다. 욕실 거울이 뿌옇게 흐려진다.',
  '물소리 속에서 머리를 감고 한참 가만히 서 있다. 김이 욕실 가득 차오른다.',
  '따뜻한 물이 몸의 선을 따라 흘러내린다. 하루의 긴장이 풀려간다.',
];
const CHANGE=[
  '젖은 머리를 수건으로 털며 속옷 차림으로 옷장 앞에 선다. 무엇을 입을지 한참 고른다.',
  '거울 앞에서 몸을 살피며 편한 옷으로 갈아입는다. 단추를 채우며 작게 숨을 내쉰다.',
];
const lines={
  '수면':['고른 숨을 쉬며 잠들어 있다.','조용한 방에서 휴식을 이어간다.'],
  '출근':['직장에서 자신의 일을 하고 있다.','출근한 뒤 업무 시간을 보내고 있다.'],
  '식사':['식탁에서 천천히 식사를 하고 있다.','한 끼를 먹으며 잠시 쉬고 있다.'],
  '함께 식사':['당신과 함께 식사하며 이야기를 나눈다.'],
  '이웃과 대화':['당신과 이야기를 나누며 잠시 쉬고 있다.'],
  '함께 정리':['당신과 물건을 제자리에 놓으며 정리한다.'],
  '청소':['방 안의 물건을 정돈하고 있다.','조금씩 방을 청소하고 있다.'],
  '빨래':['빨랫감을 정리하며 집안일을 하고 있다.'],
  '독서':['책장을 천천히 넘기고 있다.','읽던 책에 조용히 집중한다.'],
  '휴식':['방에서 느긋하게 쉬고 있다.','잠시 하던 일을 내려놓고 숨을 고른다.'],
  '휴대폰':['휴대폰으로 소식을 확인하고 있다.'],
  '음악 감상':['좋아하는 음악을 들으며 시간을 보낸다.'],
  '차 마시기':['따뜻한 차를 마시며 쉬고 있다.'],
  '스트레칭':['굳은 어깨를 천천히 풀고 있다.'],
  '친구 방문':['찾아온 친구와 편안하게 이야기를 나눈다.'],
  '연인 방문':['방문한 연인과 둘만의 대화를 나눈다.'],
  '연인 집에 감':['연인의 집에서 함께 시간을 보내고 있다.'],
  '외출':['집 밖에서 자신의 시간을 보내고 있다.'],
};
export function activityEntry(s,p){
  const n=hash(s.day,s.minute,p.id),h=s.minute/60;let kind='life',text,tag;
  if(p.activity==='둘만의 시간 · 비공개'){
    const partner=s.rooms?.find(r=>r.tenant?.id===p.partner)?.tenant?.name||'연인';
    kind='adult';tag='연인과의 시간';text=COUPLE[n%COUPLE.length].replaceAll('{q}',partner);
  }else if(p.activity.includes('샤워')){kind='private';tag='샤워';text=SHOWER[n%SHOWER.length];
  }else if(p.activity.includes('갈아입기')){kind='private';tag='옷 갈아입기';text=CHANGE[n%CHANGE.length];
  }else if(p.activity.includes('비공개')){kind='private';tag='혼자만의 시간';text='문을 닫고 혼자만의 시간을 보낸다. 방 안의 불빛이 은은하다.';
  }else if((h>=20||h<1)&&p.activity==='휴식'&&p.desire>45&&n%29===0){
    kind='adult';tag='혼자만의 밤';text=SOLO[n%SOLO.length];
  }else {const choices=lines[p.activity]||[`${displayActivity(p.activity)} 중이다.`];text=choices[n%choices.length];}
  const entry={day:s.day,minute:s.minute,activity:p.activity,kind,text};
  if(tag)entry.tag=tag;
  return entry;
}
export function recordActivities(s){for(const r of s.rooms){const p=r.tenant;if(!p)continue;p.activityLog??=[];const now=s.day*1440+s.minute,last=p.activityLog.at(-1);if(last&&last.day*1440+last.minute>now)p.activityLog=p.activityLog.filter(e=>e.day*1440+e.minute<now);const previous=p.activityLog.at(-1);if(previous?.activity===p.activity)continue;if(previous?.day===s.day&&previous?.minute===s.minute)p.activityLog[p.activityLog.length-1]=activityEntry(s,p);else p.activityLog.push(activityEntry(s,p));if(p.activityLog.length>ACTIVITY_LOG_LIMIT)p.activityLog.splice(0,p.activityLog.length-ACTIVITY_LOG_LIMIT);}}
export function compactActivityLogs(s){for(const p of [...s.rooms.map(r=>r.tenant).filter(Boolean),...s.applications])if(p.activityLog)p.activityLog=p.activityLog.filter((e,i,all)=>i===0||e.activity!==all[i-1].activity);}
export function validActivityLog(v){return v===undefined||(Array.isArray(v)&&v.length<=ACTIVITY_LOG_LIMIT&&v.every((e,i)=>e&&Number.isSafeInteger(e.day)&&e.day>=1&&Number.isInteger(e.minute)&&e.minute>=0&&e.minute<1440&&typeof e.activity==='string'&&e.activity.length<=100&&['life','private','adult'].includes(e.kind)&&typeof e.text==='string'&&e.text.length<=160&&(e.tag===undefined||(typeof e.tag==='string'&&e.tag.length<=20))&&(i===0||e.day*1440+e.minute>v[i-1].day*1440+v[i-1].minute)));}
