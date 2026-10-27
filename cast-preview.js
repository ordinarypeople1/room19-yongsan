import {CAST} from './cast.js';
import {READY_FILES} from './cast-ready.js';
const ready=new Set(READY_FILES),women=CAST.filter(p=>p.gender==='여'&&ready.has(p.file));
function render(decade='all'){
 const visible=women.filter(p=>decade==='all'||Math.floor(p.age/10)*10===Number(decade));
 document.querySelector('#count').textContent=`${visible.length}명 · 이미지 준비 ${visible.filter(p=>ready.has(p.file)).length}명 · 한국인 성인 여성`;
 document.querySelector('#cast').innerHTML=visible.map(p=>`<article>${ready.has(p.file)?`<img src="assets/cast/${p.file}.png" alt="${p.age}세 · ${p.label}" loading="lazy">`:'<div class="pending">이미지 준비 중</div>'}<footer><div><strong>${p.file.replace('woman-','NO. ')}</strong><span>${p.age}세</span></div><p>${p.label}</p></footer></article>`).join('');
}
for(const button of document.querySelectorAll('[data-decade]'))button.addEventListener('click',()=>{
 for(const item of document.querySelectorAll('[data-decade]'))item.setAttribute('aria-pressed',String(item===button));
 render(button.dataset.decade);
});
render();
