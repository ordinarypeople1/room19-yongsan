import {decoration} from './motion.js';
const bounds=[[30,282],[290,538],[540,806],[812,1050],[1071,1287],[1317,1541],[1550,1802],[1814,2023]];
export const spriteIndex=p=>(p.gender==='여'?4:0)+Math.abs(p.id)%4;
export function atlas(i,home=false){const sheet=home?[[28,286],[290,546],[546,805],[805,1057],[1062,1292],[1310,1543],[1559,1793],[1807,2025]]:bounds;const [x,end]=sheet[i%8],w=end-x;return `--atlas-size:${2048/w*100}%;--atlas-pos:${x/(2048-w)*100}%;--atlas-ratio:${w}/768;`;}
export function portrait(p){return `<div class="portrait" style="${atlas(spriteIndex(p))}"><i></i></div>`;}
export function appearance(p,guest=false){const index=guest?(spriteIndex(p)+2)%8:spriteIndex(p);return atlas(index,true)+`--character-image:url('assets/residents-cutout.png');`;}
export function actorArt(p,guest=false){const index=guest?(spriteIndex(p)+2)%8:spriteIndex(p);return `<div class="actor ${guest?'guest':''}" data-actor="${guest?'guest':'resident'}" style="${appearance(p,guest)}"><div class="actor-shadow"></div><div class="actor-body"><i class="whole-person"></i></div></div>`;}
export function roomScene(r){const d=decoration(r.tenant);return `<div class="room-stage ${r.tenant?'furnished':'vacant'}" data-scene="${r.id}" data-theme="${d.key}" style="--room-accent:${d.accent}"><img class="room-plate" src="assets/${d.key}.png" alt="${r.tenant?d.name+' 인테리어':'가구 없는 공실'}" draggable="false">${r.tenant?actorArt(r.tenant):''}<div class="guest-layer"></div><div class="privacy-layer" hidden><span class="blur-shape" aria-label="수증기와 강한 블러로 처리한 비식별 실루엣"></span><i class="private-heart">♡</i></div><div class="sleep-cover" hidden></div><div class="bath-steam" hidden><i></i><i></i><i></i></div><div class="fault-light" ${r.fault?'':'hidden'}></div></div>`;}

