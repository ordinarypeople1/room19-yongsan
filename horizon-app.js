import {createGame,step,approve,reject,repair,upgrade,upgradeInfo,mediate,serialize,restore,resumeIdle} from './sim.js';
import {CAST,visualIndex} from './cast.js';
import {decoration} from './motion.js';
import {REAL_SECONDS_PER_STEP,GAME_MINUTES_PER_STEP} from './pace.js';
import {LIFE_ACTIONS,away,privateTime,relationship,canAct,act,sceneText} from './life-story.js';
import {personality,modelContext} from './resident-context.js';
import {AI_SERVER_URL} from './ai-config.js';

const $=q=>document.querySelector(q),saveKey='room19-save-v1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const money=n=>n.toLocaleString('ko-KR',{maximumFractionDigits:1})+'만';
const face=p=>`<span class="face" style="--face:url('assets/cast/${CAST[visualIndex(p)].file}.png')" aria-hidden="true"></span>`;
let s,selected=null,selectedPerson=null,speed=1,elapsed=0,last=performance.now(),epoch=0,hovered=null,panel=null;
let api={configured:false},busy=null,controller=null,storySignature='';
let roomTab='activity',diaryLimit=60,privateOnly=false,diarySignature='';
const apiBase=location.hostname.endsWith('.github.io')?AI_SERVER_URL:'/api';
let apiToken=null,apiTokenExpires=0;
try{s=restore(localStorage.getItem(saveKey));}catch{s=createGame();}
const offline=resumeIdle(s);speed=s.paused?0:1;
function save(){s.lastSavedAt=Date.now();try{localStorage.setItem(saveKey,serialize(s));$('#save-status').textContent='이 기기에 저장됨';}catch{$('#save-status').textContent='저장 공간 부족 · 파일로 내보내세요';}}
function toast(message){const el=$('#toast');(document.querySelector('dialog[open]')||document.body).append(el);el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,4000);}
function hideTooltip(){hovered=null;$('#resident-tooltip').hidden=true;document.querySelectorAll('[aria-describedby="resident-tooltip"]').forEach(el=>el.removeAttribute('aria-describedby'));}
function showTooltip(tile){if(!tile||$('#room-dialog').open||$('#panel-dialog').open)return;document.querySelectorAll('[aria-describedby="resident-tooltip"]').forEach(el=>el.removeAttribute('aria-describedby'));hovered=Number(tile.dataset.room);const r=s.rooms.find(r=>r.id===hovered),p=r.tenant,tip=$('#resident-tooltip');
  tip.innerHTML=`<small>ROOM ${r.id} · ${Math.floor(r.id/100)}F</small><h3>${p?esc(p.name):'입주를 기다리는 방'}</h3><p>${p?`${p.age}세 · ${esc(p.job)}<br>${p.quiet?'조용한 시간을 좋아해요':'이웃과 어울리는 걸 좋아해요'}`:`월세 ${r.rent}만 · 보증금 ${r.deposit}만`}</p><p class="tooltip-activity">${p?esc(p.activity.replace('속옷 갈아입기','옷 갈아입기')):'새 이웃을 맞이할 수 있어요'}</p>${p?`<small>${relationship(p)}</small>`:''}`;
  tip.hidden=false;tile.setAttribute('aria-describedby','resident-tooltip');const rect=tile.getBoundingClientRect();tip.style.left=`${Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,rect.right+12))}px`;tip.style.top=`${Math.max(8,Math.min(innerHeight-tip.offsetHeight-8,rect.top))}px`;
}
function build(){hideTooltip();$('#building').innerHTML=[5,4,3,2,1].map(f=>`<div class="floor"><span class="floor-label">${f}F</span>${s.rooms.filter(r=>Math.floor(r.id/100)===f).map(r=>`<button class="room-tile" data-room="${r.id}"><span class="tile-content"></span><span class="room-id">${r.id}</span><span class="event-dot" hidden></span></button>`).join('')}</div>`).join('');render();}
function render(){
  $('#clock').textContent=time(s.minute);$('#date').textContent=`DAY ${String(s.day).padStart(2,'0')} · ${'월화수목금토일'[(s.day-1)%7]}요일`;
  document.body.dataset.time=s.minute<390||s.minute>=1170?'night':s.minute>=990?'evening':'day';
  document.querySelectorAll('[data-speed]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.speed)===speed);b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===speed));});
  $('#application-count').textContent=s.applications.length;
  for(const r of s.rooms){const tile=$(`[data-room="${r.id}"]`),p=r.tenant,sig=`${p?.id}:${p?.visualId}`;
    if(tile.dataset.signature!==sig){tile.querySelector('.tile-content').innerHTML=p?face(p):'<span class="empty-mark" aria-hidden="true">＋</span>';tile.dataset.signature=sig;}
    tile.classList.toggle('empty',!p);tile.classList.toggle('away',!!p&&away(p));tile.classList.toggle('private',!!p&&privateTime(p));
    tile.setAttribute('aria-label',`${r.id}호 ${p?`${p.name} · ${p.activity}`:'빈방'} 보기`);
    tile.querySelector('.event-dot').hidden=!(r.fault||p?.story?.some(e=>!e.pending&&e.id>(p.lastSeenStory||0)));
  }
  const residents=s.rooms.filter(r=>r.tenant),home=residents.filter(r=>!away(r.tenant));$('#home-count').textContent=`${residents.length}명의 이웃 · 지금 집에 ${home.length}명`;
  $('#world-summary').textContent=s.logs.find(l=>l.type==='social'||l.type==='life')?.text||'아직 서로의 이름을 알아가는 중. 작은 인사로 하루를 시작해보세요.';
  if(hovered)showTooltip($(`[data-room="${hovered}"]`));
  if(selected){const r=s.rooms.find(r=>r.id===selected);if(r.tenant?.id!==selectedPerson){closeRoom();toast('이 방의 입주자가 바뀌었어요. 다시 살펴보세요.');}else updateRoom();}
}
function openRoom(id){hideTooltip();if($('#room-dialog').open)closeRoom();selected=id;const r=s.rooms.find(r=>r.id===id),p=r.tenant;selectedPerson=p?.id;storySignature='';roomTab='activity';diaryLimit=60;privateOnly=false;diarySignature='';const decor=decoration(p);
  $('#room-content').innerHTML=`<div class="detail-header"><button data-close="room-dialog" class="back">← 건물로</button><div class="detail-heading"><span class="eyebrow">ROOM ${r.id} · ${Math.floor(r.id/100)}F</span><h2 id="room-title">${p?esc(p.name)+'의 방':'아직 비어 있는 방'}${p?`<small>${p.age}세 · ${esc(p.job)}</small>`:''}</h2></div><button data-close="room-dialog" class="close" aria-label="방 닫기">×</button></div><div class="room-layout"><section class="room-visual"><div class="scene-still"><img src="assets/${decor.key}.png" alt="${decor.name} 방 내부"><div class="scene-shade"></div><span id="scene-tag" class="scene-tag"></span>${p?`<div class="scene-person">${face(p)}</div>`:''}<div class="scene-caption"><span>${decor.name}</span><small>ROOM ${r.id}</small></div></div><p id="scene-description" class="scene-description"></p>${p?`<div class="resident-info"><span>${p.quiet?'조용한 생활':'활발한 교류'}</span><span>근무 ${p.start}–${p.end}시</span><span id="relationship" class="pill"></span></div><div class="needs">${[['energy','활력'],['fullness','포만감'],['connection','교류']].map(([k,label])=>`<div class="need"><label>${label}<span data-need-value="${k}"></span></label><i><b data-need="${k}"></b></i></div>`).join('')}</div><p class="memories-label">함께 쌓은 기억</p><ul id="memories" class="memories-list"></ul>`:`<p class="panel-note">월세 ${r.rent}만 · 보증금 ${r.deposit}만<br>새로운 이웃이 이 방에 자기만의 취향을 채울 거예요.</p>`}</section>${p?`<section class="story-panel" aria-label="이웃과의 이야기"><div class="story-heading"><h3>우리 사이의 작은 이야기</h3><span id="mode-label" class="mode-label"></span></div><div id="story-feed" class="story-feed" aria-label="대화와 사건 기록"></div><form id="command-form" class="composer"><div class="quick-actions">${LIFE_ACTIONS.map(a=>`<button type="button" data-action="${a.id}">${a.label}</button>`).join('')}</div><div class="command-field"><textarea id="command" aria-label="이웃에게 제안할 행동" maxlength="500" placeholder="어떤 말을 건네고 싶나요?" rows="2"></textarea><button class="send" type="submit" aria-label="행동 보내기">↑</button></div><p id="command-status" class="composer-note" role="status"></p></form></section>`:`<section class="empty-room-actions"><h3>새로운 생활을 기다리며</h3><p>입주 신청자 중 이 방에 어울리는 이웃을 맞아보세요.</p><button data-panel="applications" class="primary">입주 신청자 보기</button><label>월세 (30–150만)<input id="rent" type="number" min="30" max="150" value="${r.rent}"></label><label>보증금 (0–2000만)<input id="deposit" type="number" min="0" max="2000" value="${r.deposit}"></label><button id="save-lease">임대 조건 저장</button></section>`}</div>`;
  if(p)mountProfile(p);$('#room-dialog').showModal();updateRoom();
}
function mountProfile(p){const traits=personality(p);
  $('.room-visual').insertAdjacentHTML('afterbegin',`<section class="resident-profile" aria-label="입주자 프로필"><div class="profile-photo" role="img" aria-label="${esc(p.name)} 프로필 사진">${face(p)}</div><div class="profile-copy"><span class="eyebrow">YOUR NEIGHBOR</span><h3>${esc(p.name)}</h3><p>${p.age}세 · 여성 · ${esc(p.job)}</p><div class="profile-traits"><span>${esc(traits.sociability)}</span><span>${p.quiet?'차분한 성격':'다정한 성격'}</span></div><p class="profile-hobby">좋아하는 것 · ${esc(traits.hobby)}</p><p class="profile-value">${esc(traits.value)}</p></div></section>`);
  $('.story-panel').insertAdjacentHTML('afterbegin','<nav class="room-tabs" aria-label="입주자 기록 보기"><button data-room-tab="activity">행동 기록</button><button data-room-tab="conversation">대화와 기억</button></nav>');
  $('#story-feed').insertAdjacentHTML('afterend','<div id="activity-feed" class="activity-feed" aria-label="행동 기록"><div class="diary-toolbar"><label><input type="checkbox" id="private-only"> 19+ · 사적인 기록만</label><span>행동이 바뀔 때 시각을 기록</span></div><div id="diary-entries"></div></div>');
}
function updateDiary(p){
  $('#story-feed').hidden=roomTab!=='conversation';$('#activity-feed').hidden=roomTab!=='activity';$('.story-heading h3').textContent=roomTab==='activity'?'이 방에서 흐르는 하루':'우리 사이의 작은 이야기';
  document.querySelectorAll('[data-room-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.roomTab===roomTab);b.setAttribute('aria-pressed',String(b.dataset.roomTab===roomTab));});
  const entries=(p.activityLog||[]).filter(e=>!privateOnly||e.kind!=='life').slice().reverse(),shown=entries.slice(0,diaryLimit),signature=JSON.stringify([shown,diaryLimit,privateOnly]);
  if(signature===diarySignature)return;diarySignature=signature;
  $('#diary-entries').innerHTML=`<p class="diary-summary">최근 ${p.activityLog?.length||0}개의 행동 · 최대 240개 보관</p>`+(shown.length?`<ol class="minute-log">${shown.map(e=>`<li class="minute-entry ${e.kind}"><time>DAY ${e.day}<b>${time(e.minute)}</b></time><div><strong>${esc(e.activity.replace('속옷 갈아입기','옷 갈아입기'))}</strong>${e.kind!=='life'?`<span class="private-tag">${e.kind==='adult'?'19+ · 비공개':'사적인 시간'}</span>`:''}<p>${esc(e.text)}</p></div></li>`).join('')}</ol>`:'<p class="diary-empty">아직 표시할 기록이 없어요. 시간이 흐르면 이곳에 쌓입니다.</p>')+(entries.length>diaryLimit?'<button id="more-diary">이전 기록 더 보기</button>':'');
}
function updateRoom(){const r=s.rooms.find(r=>r.id===selected),p=r.tenant;
  $('#scene-description').textContent=sceneText(r);$('#scene-tag').textContent=p?p.activity.replace('속옷 갈아입기','옷 갈아입기'):'입주 대기';
  $('.scene-still').dataset.private=String(!!p&&(away(p)||privateTime(p)));
  if(!p)return;updateDiary(p);$('#relationship').textContent=relationship(p);
  for(const [k,v] of [['energy',p.energy],['fullness',100-p.hunger],['connection',p.connection]]){$(`[data-need="${k}"]`).style.width=`${v}%`;$(`[data-need-value="${k}"]`).textContent=Math.round(v);}
  $('#memories').innerHTML=p.memories?.length?p.memories.slice(-3).map(m=>`<li>DAY ${m.day} · ${esc(m.label)}</li>`).join(''):'<li>아직 함께한 기억이 없어요.</li>';
  const signature=JSON.stringify(p.story||[]);if(signature!==storySignature){const feed=$('#story-feed'),atEnd=feed.scrollHeight-feed.clientHeight-feed.scrollTop<60||!storySignature;storySignature=signature;
    feed.innerHTML=p.story?.length?p.story.map(e=>`<article class="story-event"><time>DAY ${e.day} · ${time(e.minute)}</time><p class="player-input">${esc(e.input)}</p><p class="event-summary">${esc(e.summary)}</p>${e.reply?`<p class="reply">“${esc(e.reply)}”</p>`:''}<span class="event-effect">${esc(e.effect)}</span></article>`).join(''):'<div class="story-empty"><span>“</span>아직 나누지 못한 이야기들.<br>작은 인사부터 시작해볼까요?</div>';
    if(atEnd)feed.scrollTop=feed.scrollHeight;
    p.lastSeenStory=Math.max(p.lastSeenStory||0,...(p.story||[]).filter(e=>!e.pending).map(e=>e.id));
  }
  $('#mode-label').textContent=api.configured?'AI 대화 연결됨':'AI 연결 확인 필요';
  const isBusy=busy===p.id;$('#command-form').setAttribute('aria-busy',String(isBusy));
  document.querySelectorAll('[data-action]').forEach(b=>{const reason=canAct(s,p,b.dataset.action);b.disabled=isBusy||!!reason;b.title=reason||'';});
  $('#command').disabled=isBusy;$('.send').disabled=isBusy;
  $('#command-status').textContent=isBusy?'이웃의 이야기를 기다리고 있어요…':canAct(s,p,'message')||(api.configured?'Enter로 보내기 · Shift+Enter로 줄바꿈':'AI 연결을 확인한 뒤 대화를 보내주세요.');
}
function closeRoom(){if(!selected)return;const id=selected;selected=null;selectedPerson=null;$('#room-dialog').close();hideTooltip();save();render();$(`[data-room="${id}"]`)?.focus();}
async function refreshApiSession(){if(!api.requiresSession)return;const response=await fetch(apiBase+'/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:controller?.signal});if(!response.ok)throw Error('AI 연결을 잠시 뒤 다시 시도해주세요.');const value=await response.json();apiToken=value.token;apiTokenExpires=value.expiresAt;}
async function request(path,body,retry=true){if(api.requiresSession&&(!apiToken||Date.now()>apiTokenExpires-5000))await refreshApiSession();const response=await fetch(apiBase+'/'+path.split('/').at(-1),{method:'POST',headers:{'Content-Type':'application/json',...(apiToken?{Authorization:'Bearer '+apiToken}:{})},body:JSON.stringify(body),signal:controller?.signal});if(response.status===401&&api.requiresSession&&retry){await refreshApiSession();return request(path,body,false);}if(!response.ok)throw Error(response.status===429?'대화 요청이 많아요. 잠시 뒤 다시 이야기해주세요.':'AI 답변을 받지 못했어요. 연결 상태를 확인하고 다시 보내주세요.');return response.json();}
async function submitAction(actionId=null){if(!selected||busy!==null)return;const state=s,version=epoch,r=s.rooms.find(r=>r.id===selected),p=r.tenant;if(!p)return;
  const input=actionId?LIFE_ACTIONS.find(a=>a.id===actionId)?.input:$('#command').value.trim();if(!input){$('#command').focus();return;}
  const intent=actionId||'talk',reason=canAct(s,p,intent);if(reason){toast(reason);return;}if(input.length>500){toast('500자 이내로 적어주세요.');return;}
  busy=p.id;controller=new AbortController();updateRoom();
  try{
    let reply=null;
    if(intent==='talk'){
      if(!api.configured)await checkConnection();
      if(!api.configured)throw Error('AI에 연결하지 못했어요. 잠시 뒤 다시 보내주세요.');
      const response=await request('/api/dialogue',{input,person:{name:p.name,age:p.age,job:p.job,quiet:p.quiet},outcome:{intent,accepted:true,summary:'당신과 이야기를 나눈다.',reply:'당신의 말에 답한다.'},...modelContext(s,r,{id:-1})});
      if(typeof response.reply!=='string'||!response.reply.trim()||response.reply.length>400)throw Error('AI 답변을 받지 못했어요. 다시 보내주세요.');
      reply=response.reply;
    }
    if(epoch!==version||s!==state||r.tenant!==p)return;
    const result=act(s,r.id,intent,input);if(result.error){toast(result.error);return;}
    const event=result.event;if(reply){event.reply=reply;event.source='openrouter';}
    if(selected===r.id){$('#command').value='';roomTab='conversation';storySignature='';}save();render();
    if(intent!=='talk'&&api.configured&&event.reply&&!event.pending){try{
      const response=await request('/api/dialogue',{input,person:{name:p.name,age:p.age,job:p.job,quiet:p.quiet},outcome:{intent,accepted:event.accepted,summary:event.summary,reply:event.reply},...modelContext(s,r,event)});
      if(epoch===version&&s===state&&r.tenant===p&&p.story.includes(event)&&typeof response.reply==='string'&&response.reply.length<=400){event.reply=response.reply;event.source='openrouter';save();}
    }catch(error){if(error.name!=='AbortError')toast(error.message);}}
  }catch(error){if(error.name!=='AbortError')toast(error.message);}
  finally{if(epoch===version){busy=null;controller=null;render();if(selected===r.id)$('#command')?.focus();}}
}
function setSpeed(value){speed=value;s.paused=value===0;last=performance.now();save();render();}
function openPanel(name){if(selected)closeRoom();hideTooltip();panel=name;renderPanel();if(!$('#panel-dialog').open)$('#panel-dialog').showModal();}
function renderPanel(){const titles={journal:'작은 생활의 기록',applications:'새로운 이웃',management:'집 돌보기',save:'나의 용산 생활'};$('#panel-title').textContent=titles[panel];const host=$('#panel-content');
  if(panel==='journal'){host.innerHTML='<p class="panel-note">자리를 비운 동안에도 이웃들의 하루는 이어집니다.</p>'+s.logs.map(l=>`<article class="journal-entry"><time>DAY ${l.day} · ${time(l.minute)}</time><p>${esc(l.text)}</p></article>`).join('');return;}
  if(panel==='applications'){const empty=s.rooms.filter(r=>!r.tenant);host.innerHTML=`<p class="panel-note">빈방 ${empty.length}개 · 입주를 기다리는 이웃 ${s.applications.length}명<br>예산에 맞는 방을 골라 새로운 생활을 맞아주세요.</p>`+s.applications.map(p=>`<article class="applicant"><div class="applicant-head"><div class="mini-face">${face(p)}</div><div><h3>${esc(p.name)} · ${p.age}세</h3><p>${esc(p.job)} · ${p.quiet?'조용한 생활':'활발한 교류'}<br>월세 상한 ${p.budget}만 · 보증금 ${p.deposit}만</p></div></div><div class="applicant-controls"><select aria-label="${esc(p.name)} 입주할 방" data-app-room="${p.id}">${empty.map(r=>`<option value="${r.id}" ${r.rent>p.budget||r.deposit>p.deposit?'disabled':''}>${r.id}호 · ${r.rent}만 / ${r.deposit}만</option>`).join('')}</select><button data-approve="${p.id}" class="primary">맞이하기</button><button data-reject="${p.id}" aria-label="${esc(p.name)} 입주 거절">×</button></div></article>`).join('')+(s.applications.length?'':'<p class="panel-note">다음 입주 신청을 기다리고 있어요.</p>');return;}
  if(panel==='management'){host.innerHTML=`<p class="panel-note">운영 자금 ${money(s.cash)} · 별도 보관 보증금 ${money(s.depositHeld)}</p><h3 class="section-title">수리와 이웃의 부탁</h3>${s.rooms.filter(r=>r.fault).map(r=>`<div class="management-row"><span>${r.id}호 · ${esc(r.fault.name)}</span><button data-repair="${r.id}">${r.fault.cost}만 · 수리</button></div>`).join('')}${s.issues.map(i=>`<div class="management-row"><span>${esc(i.text)}</span><button data-mediate="${i.id}">대화 중재</button></div>`).join('')}${!s.issues.length&&!s.rooms.some(r=>r.fault)?'<p class="panel-note">지금은 모두 평온하게 지내고 있어요.</p>':''}<h3 class="section-title">조금 더 편안한 집</h3>${Object.entries(upgradeInfo).map(([k,u])=>`<div class="management-row"><span>${u.name} · ${s.upgrades[k]}/3<small>${u.desc}</small></span><button data-upgrade="${k}" ${s.upgrades[k]>=3?'disabled':''}>${s.upgrades[k]>=3?'완료':money(u.cost*(s.upgrades[k]+1))+' · 개선'}</button></div>`).join('')}`;return;}
  host.innerHTML=`<p class="panel-note">진행 상황과 이웃과의 기억은 이 브라우저에 저장됩니다.<br>다른 기기로 옮길 때는 저장 파일을 가져가세요.</p><div class="save-actions"><button id="export-save">저장 파일 내보내기</button><label class="file-label">저장 파일 불러오기<input id="import-save" type="file" accept="application/json"></label><button id="reset-game" class="danger">새 생활 시작</button></div><div class="connection-state"><b>${api.configured?'OpenRouter 연결 준비됨':'AI 연결 확인 필요'}</b><br>${api.configured?esc(api.model):'AI 연결을 확인해주세요. 생활 행동 버튼은 계속 사용할 수 있어요.'}<br><button id="refresh-connection">연결 상태 확인</button></div><p class="panel-note" style="margin-top:20px">현재 버전은 개인 플레이용이며 계정 로그인과 기기 간 동기화는 제공하지 않습니다.</p>`;
}
function replaceGame(next){controller?.abort();epoch++;busy=null;controller=null;closeRoom();s=next;elapsed=0;speed=s.paused?0:1;last=performance.now();build();save();if(panel)renderPanel();}
async function checkConnection(){try{const response=await fetch(apiBase+'/status',{cache:'no-store'});api=response.ok?await response.json():{configured:false};if(api.configured&&api.requiresSession)await refreshApiSession();}catch{api={configured:false};apiToken=null;}if(selected)updateRoom();if(panel==='save')renderPanel();}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.room){openRoom(Number(d.room));return;}if(d.close){if(d.close==='room-dialog')closeRoom();else{$('#panel-dialog').close();panel=null;}return;}
  if(d.panel){openPanel(d.panel);return;}if(d.speed!==undefined){setSpeed(Number(d.speed));return;}if(d.action){submitAction(d.action);return;}
  if(d.roomTab){roomTab=d.roomTab;if(roomTab==='conversation')storySignature='';updateRoom();return;}if(b.id==='more-diary'){diaryLimit+=60;updateRoom();return;}
  let changed=false,error=null;
  if(d.approve){error=approve(s,Number(d.approve),Number($(`[data-app-room="${d.approve}"]`).value));changed=!error;toast(error||'새로운 이웃이 이사 왔어요.');}
  if(d.reject){reject(s,Number(d.reject));changed=true;}if(d.repair){error=repair(s,Number(d.repair));changed=!error;toast(error||'수리가 끝났어요.');}
  if(d.upgrade){error=upgrade(s,d.upgrade);changed=!error;toast(error||'집이 조금 더 편안해졌어요.');}if(d.mediate){mediate(s,Number(d.mediate));changed=true;}
  if(b.id==='next-morning'){if(busy!==null){toast('이웃의 답변을 받은 뒤 시간을 넘겨주세요.');return;}closeRoom();step(s,s.minute<480?480-s.minute:1920-s.minute);elapsed=0;changed=true;toast('새로운 아침이 밝았어요.');}
  if(b.id==='save-lease'){const rent=Number($('#rent').value),deposit=Number($('#deposit').value);if(!Number.isInteger(rent)||rent<30||rent>150||!Number.isInteger(deposit)||deposit<0||deposit>2000){toast('월세와 보증금 범위를 확인해주세요.');return;}Object.assign(s.rooms.find(r=>r.id===selected),{rent,deposit});changed=true;toast('임대 조건을 저장했어요.');}
  if(b.id==='export-save'){save();const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([serialize(s)],{type:'application/json'}));link.download=`room19-day${s.day}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
  if(b.id==='reset-game'&&confirm('현재 생활과 기억을 초기화할까요? 먼저 저장 파일을 내보낼 수 있어요.'))replaceGame(createGame());
  if(b.id==='refresh-connection')checkConnection();if(changed){render();save();if(panel)renderPanel();}
});
document.addEventListener('submit',e=>{if(e.target.id==='command-form'){e.preventDefault();submitAction();}});
document.addEventListener('keydown',e=>{if(e.target.id==='command'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submitAction();return;}if(e.key==='Escape')hideTooltip();if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;if(e.code==='Space'&&!$('#panel-dialog').open){e.preventDefault();setSpeed(speed?0:1);}});
$('#building').addEventListener('pointerover',e=>showTooltip(e.target.closest('[data-room]')));$('#building').addEventListener('pointerout',e=>{if(!e.relatedTarget?.closest?.('[data-room]'))hideTooltip();});
$('#building').addEventListener('focusin',e=>showTooltip(e.target.closest('[data-room]')));$('#building').addEventListener('focusout',hideTooltip);window.addEventListener('resize',hideTooltip);window.addEventListener('scroll',hideTooltip);
$('#room-dialog').addEventListener('cancel',e=>{e.preventDefault();closeRoom();});$('#panel-dialog').addEventListener('close',()=>panel=null);
document.addEventListener('change',async e=>{if(e.target.id==='private-only'){privateOnly=e.target.checked;diaryLimit=60;updateRoom();return;}if(e.target.id!=='import-save')return;const file=e.target.files[0];try{if(!file||file.size>2000000)throw Error();const loaded=restore(await file.text());replaceGame(loaded);toast('이웃들의 생활을 불러왔어요.');}catch{toast('호환되는 저장 파일이 아니에요.');}e.target.value='';});
document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden)save();else{resumeIdle(s);render();save();}});window.addEventListener('pagehide',save);
setInterval(()=>{const now=performance.now(),dt=Math.min((now-last)/1000,2);last=now;if(document.hidden||!speed)return;elapsed+=dt*speed;const secondsPerMinute=REAL_SECONDS_PER_STEP/GAME_MINUTES_PER_STEP;if(elapsed>=secondsPerMinute){const n=Math.floor(elapsed/secondsPerMinute);elapsed%=secondsPerMinute;step(s,n);render();save();}},250);
build();save();checkConnection();if(offline)toast('자리를 비운 동안에도 이웃들의 하루가 이어졌어요.');
