// 버튼·방 타일·탭에 번지는 물결 효과와 가벼운 진동 피드백. 동작은 CSS(midnight.css)가 담당하고 여기서는 좌표만 전달합니다.
const REDUCED=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)');
const HAPTIC='.send,.shutter,.primary,.room-tile,[data-action],[data-room-tab],.chip,.scene-shoot';
export function initFx(root=document){
  root.addEventListener('pointerdown',e=>{
    const button=e.target.closest?.('button');
    if(!button||button.disabled)return;
    if(!REDUCED?.matches){
      const rect=button.getBoundingClientRect(),size=Math.max(rect.width,rect.height)*2.2,ripple=document.createElement('span');
      ripple.className='fx-ripple';
      ripple.style.cssText=`width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
      button.append(ripple);
      ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});
      setTimeout(()=>ripple.remove(),900);
    }
    if(button.matches(HAPTIC)&&e.pointerType==='touch')navigator.vibrate?.(8);
  },{passive:true});
}
