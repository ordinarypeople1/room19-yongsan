export const ACTIVITY_LOG_LIMIT=240;
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
function hash(day,minute,id){let n=Math.imul(day*1440+minute,2654435761)^Math.imul(id,1597334677);n^=n>>>16;return n>>>0;}
export function activityEntry(s,p){
  const n=hash(s.day,s.minute,p.id),h=s.minute/60;let kind='life',text;
  if(p.activity==='둘만의 시간 · 비공개'){
    kind='adult';text=['연인과 문을 닫고 사적인 시간을 보낸다. 자세한 내용은 비공개다.','연인과 서로에게 집중하며 친밀한 시간을 나눈다.'][n%2];
  }else if(p.activity.includes('샤워')){kind='private';text='닫힌 욕실에서 샤워하고 있다. 사생활은 비공개로 남긴다.';
  }else if(p.activity.includes('갈아입기')){kind='private';text='편안한 옷으로 갈아입으며 개인적인 시간을 갖는다.';
  }else if(p.activity.includes('비공개')){kind='private';text='문을 닫고 혼자만의 사적인 시간을 보내고 있다.';
  }else if((h>=20||h<1)&&p.activity==='휴식'&&p.desire>45&&n%29===0){
    kind='adult';text='늦은 시간, 혼자만의 사적인 여유를 즐긴다. 자세한 내용은 비공개다.';
  }else {const choices=lines[p.activity]||[`${p.activity} 중이다.`];text=choices[n%choices.length];}
  return {day:s.day,minute:s.minute,activity:p.activity,kind,text};
}
export function recordActivities(s){for(const r of s.rooms){const p=r.tenant;if(!p)continue;p.activityLog??=[];const now=s.day*1440+s.minute,last=p.activityLog.at(-1);if(last&&last.day*1440+last.minute>now)p.activityLog=p.activityLog.filter(e=>e.day*1440+e.minute<now);if(p.activityLog.at(-1)?.day===s.day&&p.activityLog.at(-1)?.minute===s.minute){if(p.activityLog.at(-1).activity!==p.activity)p.activityLog[p.activityLog.length-1]=activityEntry(s,p);continue;}p.activityLog.push(activityEntry(s,p));if(p.activityLog.length>ACTIVITY_LOG_LIMIT)p.activityLog.splice(0,p.activityLog.length-ACTIVITY_LOG_LIMIT);}}
export function validActivityLog(v){return v===undefined||(Array.isArray(v)&&v.length<=ACTIVITY_LOG_LIMIT&&v.every((e,i)=>e&&Number.isSafeInteger(e.day)&&e.day>=1&&Number.isInteger(e.minute)&&e.minute>=0&&e.minute<1440&&typeof e.activity==='string'&&e.activity.length<=100&&['life','private','adult'].includes(e.kind)&&typeof e.text==='string'&&e.text.length<=160&&(i===0||e.day*1440+e.minute>v[i-1].day*1440+v[i-1].minute)));}
