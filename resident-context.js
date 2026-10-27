import {playerStage,knownNeighbors} from './relationships.js';
import {relevantConversations} from './dialogue-memory.js';
// Small, stable character context shared by UI and model requests.
export function personality(p){
  const hobbies=['소설 읽기','산책과 사진','집에서 요리하기','음악과 차','영화 감상','식물 돌보기'];
  const values=['서로의 약속을 지키는 것','개인적인 공간을 존중하는 것','솔직하게 마음을 나누는 것','작은 배려를 기억하는 것'];
  return {temperament:p.quiet?'차분하고 신중하며 혼자 충전하는 편':'먼저 안부를 묻고 대화에서 힘을 얻는 편',
    sociability:p.social>=65?'사교적':p.social>=45?'천천히 친해짐':'낯을 가리는 편',
    tidiness:p.tidy>=65?'물건을 제자리에 두는 편':'편안하고 자연스러운 생활을 선호',
    hobby:hobbies[(p.id-1)%hobbies.length],value:values[(p.id-1)%values.length],
    speech:p.quiet?'짧고 차분한 존댓말, 친해질수록 조금 더 솔직해짐':'부드럽고 친근한 존댓말, 질문을 돌려주며 대화를 이어감'};
}
export function modelContext(s,r,event,input=event.input||''){const p=r.tenant;const result={
  personality:personality(p),
  social:{playerStage:playerStage(p),dates:p.playerDates||0,neighbors:knownNeighbors(s,p)},
  conversationNotes:relevantConversations(p,input,event.id),
  housing:{monthlyRent:r.rent,deposit:r.deposit,monthlyBudget:p.budget,leaseDaysRemaining:Math.max(0,Math.min(1000000,(r.lease?.end??s.day)-s.day)),fault:r.fault?.name||null},
  context:{day:s.day,minute:s.minute,room:r.id,activity:p.activity,energy:Math.round(p.energy),hunger:Math.round(p.hunger),happiness:Math.round(p.happiness),connection:Math.round(p.connection),playerBond:p.playerBond||0,partner:p.partner?s.rooms.find(x=>x.tenant?.id===p.partner)?.tenant.name||null:null},
  memories:(p.memories||[]).slice(-8).map(m=>({day:m.day,label:m.label})),
  history:(p.story||[]).filter(e=>e.id!==event.id&&!e.pending).slice(-8).map(e=>({day:e.day,input:e.input.slice(0,500),reply:e.reply.slice(0,400),summary:e.summary.slice(0,160)})),
  recentActions:(p.activityLog||[]).slice(-8).map(e=>({day:e.day,minute:e.minute,activity:e.activity,text:e.text})),
};
  while(new TextEncoder().encode(JSON.stringify(result)).length>22000){if(result.history.length>2)result.history.shift();else if(result.conversationNotes.length)result.conversationNotes.pop();else break;}
  return result;
}
