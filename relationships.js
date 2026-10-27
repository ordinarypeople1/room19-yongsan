const cap=n=>Math.max(0,Math.min(100,n));
export const playerInterested=p=>p.id%7!==0;
export function playerStage(p){return p.playerStatus==='dating'?'dating':p.playerStatus==='ex'?'ex':(p.playerBond||0)>=60?'close':(p.playerBond||0)>=30?'friends':(p.playerBond||0)>=10?'acquaintances':'strangers';}
export const PLAYER_STAGE_LABELS={strangers:'아직 알아가는 사이',acquaintances:'인사를 나누는 사이',friends:'편안한 사이',close:'마음을 나누는 사이',dating:'나와 연인',ex:'교제를 마친 사이'};
export function sharedNeighborMemory(s,p,q,label){
 for(const [a,b] of [[p,q],[q,p]])a.neighborMemories=[...(a.neighborMemories||[]),{otherId:b.id,day:s.day,label}].slice(-8);
}
export function knownNeighbors(s,p){
 return s.rooms.filter(r=>r.tenant&&r.tenant.id!==p.id&&((p.relations[r.tenant.id]||0)>0||p.partner===r.tenant.id)).map(r=>{
  const q=r.tenant,bond=Math.min(p.relations[q.id]||0,q.relations[p.id]||0),conflict=s.issues.some(i=>i.rooms.includes(r.id)&&i.rooms.some(id=>s.rooms.find(x=>x.id===id)?.tenant?.id===p.id));
  return {name:q.name,room:r.id,relationship:p.partner===q.id&&q.partner===p.id?'연인':conflict?'갈등 중인 이웃':bond>=45?'친구':'인사를 나눈 이웃',lastEvent:(p.neighborMemories||[]).filter(e=>e.otherId===q.id).at(-1)?.label||null,bond};
 }).sort((a,b)=>(Number(b.relationship==='연인')-Number(a.relationship==='연인'))||b.bond-a.bond).slice(0,8).map(({bond,...visible})=>visible);
}
export function relationshipAction(s,r,intent){const p=r.tenant,n=p.playerBond||0;
 if(intent==='introduce'){
  const target=s.rooms.find(q=>q.tenant&&q.tenant!==p&&!(p.relations[q.tenant.id]>0)&&!['출근','외출','수면','연인 집에 감'].includes(q.tenant.activity)&&!q.tenant.activity.includes('비공개'));
  if(!target)return {accepted:false,summary:'새로 인사할 이웃이 지금은 없어 소개를 미뤘다.',reply:'아직 모르는 분 중에는 지금 만날 수 있는 분이 없네요. 다음에 같이 인사해요.',effect:'다음 만남을 기다려요',bond:0};
  const q=target.tenant;p.relations[q.id]=cap((p.relations[q.id]||0)+12);q.relations[p.id]=cap((q.relations[p.id]||0)+12);
  sharedNeighborMemory(s,p,q,'건물주의 소개로 공동 현관에서 인사를 나눴다.');
  return {accepted:true,summary:`${target.id}호 ${q.name}와 서로 인사를 나눴다.`,reply:`${q.name} 씨와는 처음 제대로 인사했네요. 소개해주셔서 고마워요.`,effect:'서로 아는 이웃이 됐어요',bond:2};
 }
 if(intent==='breakup'){
  if(p.playerStatus!=='dating')return {accepted:false,summary:'현재 교제 중인 관계가 아님을 확인했다.',reply:'우리가 사귀는 사이는 아니잖아요.',effect:'관계 유지',bond:0};
  p.playerStatus='ex';p.romanceNextDay=s.day+3;
  return {accepted:true,summary:'서로의 교제를 끝내고 입주민과 건물주 관계로 돌아갔다.',reply:'알겠어요. 마음은 정리할게요. 집에 관한 일은 서로 불편하지 않게 했으면 해요.',effect:'교제 종료 · 임대 조건 유지',bond:-10};
 }
 const other=s.rooms.find(q=>q.tenant!==p&&q.tenant?.playerStatus==='dating');
 const refuse=reply=>({accepted:false,summary:intent==='date'?'데이트 제안을 사양했다.':'교제 제안을 받아들이지 않았다.',reply,effect:'상대의 의사를 존중했어요',bond:0});
 if(p.partner)return refuse('저는 지금 만나는 사람이 있어요. 그 관계를 존중해주셨으면 해요.');
 if(other)return refuse('지금 만나고 계신 분과의 관계부터 정리하는 게 맞을 것 같아요.');
 if((p.romanceNextDay||0)>s.day)return refuse('이 이야기는 조금 시간을 두고 다시 했으면 해요.');
 if(!playerInterested(p))return refuse('저는 건물주님과는 좋은 이웃으로 지내고 싶어요.');
 if(p.energy<30||p.happiness<35)return refuse('오늘은 제 마음을 돌볼 여유가 없어요. 다음에 이야기해요.');
 if(intent==='date'){
  if(n<(p.quiet?45:35))return refuse('아직은 조금 조심스러워요. 서로를 더 알아가고 싶어요.');
  if(p.lastPlayerDateDay===s.day)return refuse('오늘 함께한 시간은 좋았어요. 다음 데이트는 다른 날로 잡아요.');
  p.playerDates=(p.playerDates||0)+1;p.lastPlayerDateDay=s.day;
  return {accepted:true,summary:'제안을 받아들여 함께 차를 마시며 데이트했다.',reply:p.playerStatus==='dating'?'좋아요. 오늘은 우리 둘이 느긋하게 차 마셔요.':'좋아요. 부담 없이 차부터 마시면서 이야기해요.',effect:'함께한 데이트 +1 · 친밀감 +5',bond:5,activity:'함께 차 마시기'};
 }
 if(p.playerStatus==='dating')return {accepted:true,summary:'이미 교제 중인 서로의 마음을 다시 확인했다.',reply:'우리 이미 사귀고 있잖아요. 그래도 다시 들으니 좋네요.',effect:'연인 관계 유지',bond:0};
 if(n<65||(p.playerDates||0)<2){p.romanceNextDay=s.day+2;return refuse('아직 연인이 되겠다고 말하기는 어려워요. 둘이 시간을 더 보내고 서로 알아가고 싶어요.');}
 p.playerStatus='dating';p.playerRomanceSince=s.day;
 return {accepted:true,summary:'서로의 마음을 확인하고 교제하기로 명확히 합의했다.',reply:'저도 마음이 있어요. 우리 연인으로 만나봐요. 집에 관한 일과는 별개로요.',effect:'명시적으로 교제 수락 · 나와 연인',bond:4};
}
export function validRelationships(p){const num=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000;
 return (p.playerStatus===undefined||['neighbors','dating','ex'].includes(p.playerStatus))&&!(p.playerStatus==='dating'&&p.partner)&&['playerDates','lastPlayerDateDay','playerRomanceSince','romanceNextDay'].every(k=>p[k]===undefined||num(p[k]))&&(p.playerStatus!=='dating'||(p.playerDates>=2&&num(p.playerRomanceSince)))&&(p.neighborMemories===undefined||Array.isArray(p.neighborMemories)&&p.neighborMemories.length<=8&&p.neighborMemories.every(e=>e&&num(e.otherId)&&num(e.day)&&typeof e.label==='string'&&e.label.length<=100));
}
