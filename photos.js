const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let viewer=null,dbPromise=null;const albums=new Map(),jobs=new Map();
export const ALBUM_LIMIT=12;
export const SHOT_PRESETS=[
  {label:'지금 모습 그대로',scene:'current'},
  {label:'창가에서 차 한 잔',scene:'창가에 앉아 따뜻한 차를 마시는 모습, 자연스러운 미소'},
  {label:'침대에 기대어 독서',scene:'침대에 기대어 책을 읽는 모습, 편안한 표정'},
  {label:'책상에서 집중',scene:'책상에서 무언가에 집중하는 옆모습'},
  {label:'주방에서 요리',scene:'주방에서 간단한 요리를 하다 카메라를 돌아보는 모습'},
  {label:'거울 앞 셀카',scene:'거울 앞에서 휴대폰으로 셀카를 찍는 모습, 장난스러운 표정'},
  {label:'잠들기 전 스탠드 불빛',scene:'스탠드 불빛 아래 침대 가장자리에 앉아 쉬는 모습, 나른한 분위기'},
];
const keyFor=(p,portrait)=>[p.id,p.name,p.age,portrait].join(':');
function db(){return dbPromise??=new Promise((resolve,reject)=>{const request=indexedDB.open('room19-photos',1);request.onupgradeneeded=()=>request.result.createObjectStore('albums');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('사진 저장 공간을 열지 못했어요.'));});}
async function load(key){
  if(albums.has(key))return albums.get(key);
  try{const database=await db();const value=await new Promise((resolve,reject)=>{const req=database.transaction('albums').objectStore('albums').get(key);req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);});if(!albums.has(key))albums.set(key,value);}
  catch{albums.set(key,[]);}
  return albums.get(key);
}
async function store(key,photos){
  const database=await db();
  await new Promise((resolve,reject)=>{const tx=database.transaction('albums','readwrite');tx.objectStore('albums').put(photos,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}
export function showPhoto(src,title){
  if(!viewer){
    viewer=document.createElement('dialog');viewer.id='photo-viewer';viewer.setAttribute('aria-labelledby','photo-viewer-title');
    viewer.innerHTML='<header><h2 id="photo-viewer-title"></h2><button type="button" class="viewer-close" aria-label="확대 사진 닫기">×</button></header><img alt=""><footer><a class="viewer-save" download="room19-photo.png">이 기기에 저장</a><p>사진 밖을 누르거나 Esc를 누르면 닫힙니다.</p></footer>';
    document.body.append(viewer);
    viewer.querySelector('.viewer-close').onclick=()=>viewer.close();
    viewer.addEventListener('click',e=>{if(e.target===viewer){const r=viewer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)viewer.close();}});
  }
  viewer.querySelector('h2').textContent=title;const img=viewer.querySelector('img');img.src=src;img.alt=title;
  const save=viewer.querySelector('.viewer-save');save.href=src;save.hidden=!src.startsWith('data:');
  if(!viewer.open)viewer.showModal();
}
export function setPhotoTab(visible){const panel=document.querySelector('#photo-panel');if(panel)panel.hidden=!visible;}
export function refreshPhotos(){document.querySelector('#photo-panel')?.dispatchEvent(new Event('guard-refresh'));}
export function focusShutter(){const panel=document.querySelector('#photo-panel');panel?.querySelector('#photo-prompt')?.focus({preventScroll:false});panel?.scrollIntoView?.({block:'nearest'});}

// options: {room:{key,name,image}, guard:()=>string|null, current:()=>string, light:()=>'day'|'evening'|'night'}
export function mountPhotos(p,portrait,generate,options={}){
  const key=keyFor(p,portrait),room=options.room||null,host=document.createElement('section');
  host.id='photo-panel';host.className='photo-panel';host.hidden=true;host.setAttribute('aria-label',p.name+'의 사진첩');
  host.innerHTML=`<div class="photo-intro"><span class="eyebrow">MOMENTS OF ${esc(p.name)}</span><h3>방에서 사진 찍기</h3><p>${esc(p.name)}의 방${room?` (${esc(room.name)})`:''}에서 장면을 정해 촬영합니다. 얼굴과 나이는 프로필 그대로 유지돼요.</p></div>`+
  `<form class="photo-form"><div class="viewfinder" aria-hidden="true">${room?`<img src="${esc(room.image)}" alt="">`:''}<i class="vf-corner tl"></i><i class="vf-corner tr"></i><i class="vf-corner bl"></i><i class="vf-corner br"></i><span class="vf-grid"></span><span class="vf-info"><b class="vf-dot"></b>${esc(room?.name||'ROOM')}</span><span class="vf-flash"></span></div>`+
  `<div class="shot-presets" role="group" aria-label="추천 장면">${SHOT_PRESETS.map(s=>`<button type="button" class="chip" data-scene="${esc(s.scene)}">${esc(s.label)}</button>`).join('')}</div>`+
  `<label for="photo-prompt">어떤 순간을 담고 싶나요?</label><textarea id="photo-prompt" maxlength="600" rows="3" placeholder="예: 창가에서 따뜻한 차를 마시는 모습, 오후 햇살, 자연스러운 미소" required></textarea>`+
  `<div class="shutter-row"><button type="submit" class="shutter" aria-label="촬영하기"><span class="shutter-ring"><i></i></span><b>촬영</b></button></div><p class="photo-status" role="status"></p><small>Qwen Image 2.1 Turbo · 한 번에 사진 1장<br>생성 사진은 이 기기에 최근 ${ALBUM_LIMIT}장까지 저장됩니다.</small></form><div class="photo-gallery"></div>`;
  document.querySelector('#activity-feed').after(host);
  const form=host.querySelector('form'),status=host.querySelector('.photo-status'),button=form.querySelector('.shutter'),prompt=form.querySelector('textarea'),gallery=host.querySelector('.photo-gallery'),finder=host.querySelector('.viewfinder');
  const reason=()=>options.guard?.()||null;
  const update=()=>{const job=jobs.get(key),blocked=reason();button.disabled=!!job?.busy||!!blocked;prompt.disabled=!!job?.busy;host.querySelectorAll('.chip').forEach(c=>c.disabled=!!job?.busy);form.setAttribute('aria-busy',String(!!job?.busy));finder.classList.toggle('busy',!!job?.busy);status.textContent=job?.busy?job.text:(blocked||job?.text||'');status.classList.toggle('warn',!job?.busy&&!!blocked);};
  const paint=(fresh=null)=>{
    gallery.replaceChildren();const photos=albums.get(key)||[];
    if(jobs.get(key)?.busy){const sk=document.createElement('article');sk.className='photo-skeleton';sk.innerHTML='<div class="skeleton-frame"><i></i></div><p>현상 중…</p>';gallery.append(sk);}
    if(!photos.length&&!jobs.get(key)?.busy){const empty=document.createElement('p');empty.className='photo-empty';empty.textContent='아직 담아둔 순간이 없어요. 첫 사진을 찍어보세요.';gallery.append(empty);return;}
    for(const photo of photos){
      const card=document.createElement('article'),open=document.createElement('button'),img=document.createElement('img'),caption=document.createElement('p');
      open.type='button';open.className='generated-photo'+(photo.created===fresh?' fresh':'');open.setAttribute('aria-label',p.name+' 생성 사진 확대');img.src=photo.image;img.alt=p.name+' · '+photo.prompt;img.loading='lazy';
      open.append(img);open.onclick=()=>showPhoto(photo.image,p.name+' · '+photo.prompt);caption.textContent=photo.prompt;card.append(open,caption);gallery.append(card);
    }
  };
  host.querySelector('.shot-presets').addEventListener('click',e=>{
    const chip=e.target.closest('.chip');if(!chip||chip.disabled)return;
    prompt.value=chip.dataset.scene==='current'?(options.current?.()||'지금 하고 있는 일을 자연스럽게'):chip.dataset.scene;
    host.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c===chip));prompt.focus();
  });
  update();load(key).then(()=>{if(host.isConnected)paint();});
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(jobs.get(key)?.busy)return;
    const blocked=reason();if(blocked){update();return;}
    const text=prompt.value.trim();if(!text||text.length>600)return;
    jobs.set(key,{busy:true,text:'셔터를 눌렀어요. 사진을 현상하고 있어요…'});finder.classList.remove('flash');void finder.offsetWidth;finder.classList.add('flash');update();paint();
    let fresh=null;
    try{
      const body={prompt:text,portrait,age:p.age};if(room)body.room=room.key;const light=options.light?.();if(light)body.light=light;
      const response=await generate(body);
      if(typeof response.image!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(response.image))throw Error('사진 응답을 받지 못했어요. 다시 시도해주세요.');
      await load(key);fresh=Date.now();
      const photos=[{image:response.image,prompt:text,created:fresh,model:response.model,room:room?.key},...(albums.get(key)||[])].slice(0,ALBUM_LIMIT);albums.set(key,photos);
      let note='사진이 완성됐어요. 눌러서 크게 볼 수 있어요.';
      try{await store(key,photos);}catch{note='사진이 완성됐어요. 저장 공간이 부족해 이번 화면에서만 볼 수 있어요.';}
      jobs.set(key,{busy:false,text:note});
      if(host.isConnected){paint(fresh);showPhoto(response.image,p.name+' · '+text);}
    }catch(error){jobs.set(key,{busy:false,text:error.name==='AbortError'?'생성이 중단됐어요. 다시 시도해주세요.':error.message||'사진 생성에 실패했어요. 다시 시도해주세요.'});}
    finally{if(host.isConnected){update();paint(fresh);}else{const current=document.querySelector('#photo-panel');if(current?.dataset.person===key)current.dispatchEvent(new Event('photo-update'));}}
  });
  host.dataset.person=key;host.addEventListener('photo-update',()=>{update();paint();});host.addEventListener('guard-refresh',update);
}
