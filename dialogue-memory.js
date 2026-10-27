// Private to each resident; transcript excerpts are evidence, never model instructions.
export const STORY_LIMIT=80, MEMORY_LIMIT=24;
const important=t=>/저는|나는|제가|우리 |제 |내 |못 먹|못 마|이름|좋아|싫어|기억|약속|알레르기|월세|임대료|보증금|수리|고장|사귀|데이트|헤어|가족|강아지|고양이|반려|취미|생일|부탁|걱정/.test(t);
export function rememberConversation(p,e){
 if(!e||e.pending||!e.reply)return;
 if(!important(e.input)&&!['date','confess','breakup','introduce'].includes(e.intent))return;
 const note={id:e.id,day:e.day,minute:e.minute,input:e.input.slice(0,500),reply:e.reply.slice(0,400)};
 p.dialogueMemory=[...(p.dialogueMemory||[]).filter(n=>n.id!==e.id),note].slice(-MEMORY_LIMIT);
}
export function hydrateDialogueMemory(p){if(p.dialogueMemory===undefined){p.dialogueMemory=[];for(const e of p.story||[])rememberConversation(p,e);}}
const COMMON=new Set(['어요','해요','세요','까요','나요','네요','예요','이에','이예','니다','습니','합니','말씀','저는','제가','하는','하고','해서','건물','주님','기억','게요','해주','주세','셨어','셨죠']);
function grams(t){const compact=t.toLowerCase().replace(/[^가-힣a-z0-9]/g,'');const set=new Set();for(let i=0;i<compact.length-1;i++)!COMMON.has(compact.slice(i,i+2))&&set.add(compact.slice(i,i+2));return set;}
export function relevantConversations(p,input,currentId){
 const entries=new Map();for(const e of [...(p.dialogueMemory||[]),...(p.story||[])])if(e.id!==currentId&&!e.pending&&e.reply)entries.set(e.id,e);
 const query=grams(input),recentIds=new Set((p.story||[]).slice(-2).map(e=>e.id));
 return [...entries.values()].map(e=>{const words=grams(e.input+' '+e.reply);let score=0;for(const g of query)if(words.has(g))score++;return {e,score};})
 .filter(x=>x.score>0).sort((a,b)=>(b.score-a.score)||(b.e.id-a.e.id))
 .filter(x=>!recentIds.has(x.e.id)).slice(0,6).map(({e})=>({id:e.id,day:e.day,minute:e.minute,input:e.input.slice(0,240),reply:e.reply.slice(0,240)}));
}
export function validDialogueMemory(list){return list===undefined||Array.isArray(list)&&list.length<=MEMORY_LIMIT&&list.every(e=>e&&['id','day','minute'].every(k=>Number.isSafeInteger(e[k])&&e[k]>=0)&&e.minute<1440&&typeof e.input==='string'&&e.input.length<=500&&typeof e.reply==='string'&&e.reply.length<=400);}
