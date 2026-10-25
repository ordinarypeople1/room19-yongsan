// Every item belongs to a fictional adult NPC. No real-person data is used.
export const furniture=[{id:'wardrobe',name:'옷장',x:75,y:30,icon:'▥'},{id:'desk',name:'책상 서랍',x:48,y:58,icon:'▤'},{id:'bedside',name:'침대 옆 서랍',x:12,y:67,icon:'▧'},{id:'kitchen',name:'주방 수납장',x:67,y:54,icon:'▦'}];
export function canInspect(room,physicallyAway=true){return Boolean(room?.tenant&&room.tenant.activity==='출근'&&physicallyAway);}
export function belongings(p,object){const tone=p.quiet?'조용한 저녁':'이웃과 나눌 주말';const all={
wardrobe:[{icon:'♧',name:'일상복과 출근 옷',description:`${p.job}의 하루를 함께하는 옷들이 걸려 있다.`},{icon:'▱',name:'속옷과 양말',description:'깨끗하게 세탁해 종류별로 개어 둔 평범한 의류.'},{icon:'☾',name:'집에서 입는 옷',description:'면 티셔츠, 편한 반바지와 잠옷.'}],
desk:[{icon:'▤',name:'개인 노트',description:`“${tone}에 하고 싶은 것들을 천천히 적어 두자.”`},{icon:'✎',name:'작업 도구',description:p.job==='개발자'?'키보드, 충전선과 작은 메모지.':p.job==='간호사'?'교대 일정표와 펜, 접힌 메모.':'펜과 노트, 업무와 취미를 위한 작은 도구.'},{icon:'▣',name:'교통카드와 영수증',description:'용산에서 보낸 소소한 일상의 흔적.'}],
bedside:[{icon:'▧',name:'작은 사진',description:'친구들과 함께했던 평범하고 즐거운 어느 날.'},{icon:'♡',name:p.partner?'접어 둔 편지':'빈 편지지',description:p.partner?'“오늘도 잘 쉬었으면 좋겠어. 내일 또 보자.”':'마음이 생기면 무언가를 써 보고 싶어 남겨 둔 종이.'},{icon:'▥',name:'읽다 만 책',description:p.quiet?'책갈피와 오래 접힌 페이지.':'추천받아 읽기 시작한 에세이.'}],
kitchen:[{icon:'☕',name:'머그와 차',description:'하루를 천천히 시작할 때 사용하는 컵과 티백.'},{icon:'▦',name:'그릇과 식재료',description:p.tidy>65?'그릇이 가지런하고 식재료에 작은 날짜 표시가 있다.':'즐겨 먹는 간편식과 몇 가지 양념.'},{icon:'♨',name:'세탁·생활용품',description:'세제, 섬유유연제와 새 수건을 보관해 두었다.'}]
};return all[object]||[];}
