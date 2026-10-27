import {RETIRED_FILES} from './cast-retired.js';
export const IMAGE_MODEL='qwen/qwen-image-2.1-turbo';
export const PORTRAIT_ORIGIN='https://ordinarypeople1.github.io/room19-yongsan/assets/cast/';
// 방 촬영용 실내 설명. 방 이미지는 서버가 허용한 3종만 쓰고, 입력 문자열을 그대로 프롬프트에 넣지 않는다.
export const ROOM_STYLES={
  'minimal-v2':'a calm minimalist Seoul officetel studio room with pale walls, a neatly made bed, a small desk and soft muted blue-gray tones',
  'warm-v2':'a warm natural Seoul officetel room with wooden furniture, houseplants, linen bedding and amber lamp light',
  'creative-v2':'a cozy creative Seoul officetel room with shelves of collected objects, posters, a desk with art supplies and mixed warm and violet lighting',
};
export const LIGHT_STYLES={day:'soft natural daylight from the window',evening:'warm golden early-evening light mixed with a lamp',night:'dim warm lamp light at night, the city dark outside the window'};
export function validPhotoRequest(p){return !!p&&typeof p.prompt==='string'&&p.prompt.trim().length>0&&p.prompt.length<=600&&/^woman-(0[1-9]|[12]\d|30)$/.test(p.portrait)&&!RETIRED_FILES.includes(p.portrait)&&Number.isInteger(p.age)&&p.age>=20&&p.age<=49&&(p.room===undefined||Object.hasOwn(ROOM_STYLES,p.room))&&(p.light===undefined||Object.hasOwn(LIGHT_STYLES,p.light));}
export async function generateResidentPhoto(p,{apiKey,fetchImpl=fetch}={}){
  if(!validPhotoRequest(p))throw Error('Invalid photo request');
  const response=await fetchImpl('https://openrouter.ai/api/v1/images',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','HTTP-Referer':'https://ordinarypeople1.github.io/room19-yongsan/','X-Title':'ROOM19 resident photos'},body:JSON.stringify({model:IMAGE_MODEL,n:1,resolution:'1K',aspect_ratio:'3:4',prompt:`Create one natural cinematic photograph of the SAME fictional adult Korean woman shown in the reference portrait. She is ${p.age} years old. Preserve her facial structure, eyes, hairstyle, skin tone and apparent adult age. Warm, intimate everyday-life atmosphere in Yongsan, Seoul. Ordinary clothing, sleepwear, underwear or lingerie may be shown as fashion/editorial photography of this adult.  ${p.room?`Setting: her own room, ${ROOM_STYLES[p.room]}${p.light?', '+LIGHT_STYLES[p.light]:''}. Compose it as a candid photograph taken inside her room, with the room's furniture and atmosphere clearly visible. `:''}The requested scene (apply only scene, clothes, pose and lighting; keep the reference identity): ${p.prompt.trim()}`,input_references:[{type:'image_url',image_url:{url:PORTRAIT_ORIGIN+p.portrait+'.png'}}]}),signal:AbortSignal.timeout(150000)});
  if(!response.ok)throw Error('Image generation unavailable');
  const data=await response.json(),image=data.data?.[0];
  if(!image||typeof image.b64_json!=='string'||image.b64_json.length>12000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(image.b64_json))throw Error('Invalid image response');
  const mediaType=image.media_type||'image/png';if(!['image/png','image/jpeg','image/webp'].includes(mediaType))throw Error('Unsupported image type');
  return {image:'data:'+mediaType+';base64,'+image.b64_json,model:IMAGE_MODEL};
}
