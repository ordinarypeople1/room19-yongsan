import {decoration} from './motion.js';
import {CAST,visualIndex} from './cast.js';
export const spriteIndex=visualIndex;
export function appearance(p,guest=false){const index=guest?(visualIndex(p)+1)%8:visualIndex(p),look=CAST[index];return `--character-image:url('assets/cast/${look.file}.png');--person-scale:${look.scale};--atlas-ratio:2/3;`;}
export function portrait(p){return `<div class="portrait individual-portrait" style="${appearance(p)}"><i></i></div>`;}
export function actorArt(p,guest=false){return `<div class="actor ${guest?'guest':''}" data-actor="${guest?'guest':'resident'}" style="${appearance(p,guest)}"><div class="actor-shadow"></div><div class="actor-body"><i class="whole-person"></i></div></div>`;}
export function roomScene(r){const d=decoration(r.tenant);return `<div class="room-stage ${r.tenant?'furnished':'vacant'}" data-scene="${r.id}" data-theme="${d.key}" style="--room-accent:${d.accent}"><img class="room-plate" src="assets/${d.key}.png" alt="${r.tenant?d.name+' 인테리어':'가구 없는 공실'}" draggable="false">${r.tenant?actorArt(r.tenant):''}<div class="guest-layer"></div><div class="privacy-layer" hidden><span class="blur-shape" aria-label="수증기와 강한 블러로 처리한 비식별 실루엣"></span><i class="private-heart">♡</i></div><div class="sleep-cover" hidden></div><div class="bath-steam" hidden><i></i><i></i><i></i></div><div class="fault-light" ${r.fault?'':'hidden'}></div></div>`;}

