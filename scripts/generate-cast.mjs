#!/usr/bin/env node
// 입주자 이미지 풀(woman-05 ~ woman-30)을 OpenRouter의 Qwen Image 2.1 Turbo로 생성합니다.
// 사용법
//   npm run cast:generate                  없는 파일만 생성(woman-09 ~ 30)
//   npm run cast:generate -- --redo        woman-05~08도 새 인상으로 다시 생성
//   npm run cast:generate -- --only woman-09,woman-10
//   npm run cast:generate -- --force       이미 있는 파일도 덮어씀
//   npm run cast:ready                     생성은 하지 않고 cast-ready.js 만 갱신
// OPENROUTER_API_KEY 는 환경변수 또는 로컬 .env 에서 읽습니다. 키를 출력하거나 저장하지 않습니다.
import {readFile,writeFile,access,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROSTER,promptFor} from './cast-roster.mjs';
import {IMAGE_MODEL} from '../resident-images.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const castDir=resolve(root,'assets/cast');
const args=process.argv.slice(2);
const flag=name=>args.includes('--'+name);
const value=name=>{const i=args.indexOf('--'+name);return i>=0?args[i+1]:null;};
const exists=async p=>{try{await access(p);return true;}catch{return false;}};

async function apiKey(){
  if(process.env.OPENROUTER_API_KEY)return process.env.OPENROUTER_API_KEY;
  try{const env=await readFile(resolve(root,'.env'),'utf8');const m=env.match(/^OPENROUTER_API_KEY=(.+)$/m);if(m)return m[1].trim().replace(/^["']|["']$/g,'');}catch{}
  return '';
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const isPng=buffer=>buffer.length>8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));

async function request(key,prompt,aspect){
  const response=await fetch('https://openrouter.ai/api/v1/images',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','HTTP-Referer':'https://ordinarypeople1.github.io/room19-yongsan/','X-Title':'ROOM19 cast generation'},body:JSON.stringify({model:IMAGE_MODEL,n:1,resolution:'1K',aspect_ratio:aspect,prompt}),signal:AbortSignal.timeout(180000)});
  if(!response.ok)throw Object.assign(Error('HTTP '+response.status),{status:response.status});
  const data=await response.json(),image=data.data?.[0];
  if(!image||typeof image.b64_json!=='string')throw Error('이미지 응답이 올바르지 않습니다.');
  return Buffer.from(image.b64_json,'base64');
}

async function generate(key,entry){
  const prompt=promptFor(entry);let buffer;
  try{buffer=await request(key,prompt,'2:3');}
  catch(error){if(error.status===400)buffer=await request(key,prompt,'3:4');else throw error;}
  if(!isPng(buffer))console.warn(`  ! ${entry.file}: PNG가 아닌 형식으로 받았습니다. 브라우저에서는 표시되지만 파일 확장자와 다릅니다.`);
  await writeFile(resolve(castDir,entry.file+'.png'),buffer);
}

export async function writeReady(){
  const ready=[];
  for(const n of ['woman-01','woman-02','woman-03','woman-04',...ROSTER.map(r=>r.file)])if(await exists(resolve(castDir,n+'.png')))ready.push(n);
  const body=`// 이미지 파일(assets/cast/woman-NN.png)이 실제로 있는 인물 목록입니다.\n// 'npm run cast:ready' 또는 'npm run cast:generate' 가 이 파일을 자동으로 갱신합니다.\nexport const READY_FILES=${JSON.stringify(ready)};\n`;
  await writeFile(resolve(root,'cast-ready.js'),body);
  return ready;
}

async function main(){
  await mkdir(castDir,{recursive:true});
  if(flag('ready')){const ready=await writeReady();console.log(`cast-ready.js 갱신: ${ready.length}명`);return;}
  const key=await apiKey();
  if(!key){console.error('OPENROUTER_API_KEY 가 없습니다. .env 또는 환경변수에 설정해주세요.');process.exit(1);}
  const only=value('only')?.split(',').map(v=>v.trim());
  const targets=[];
  for(const entry of ROSTER){
    if(only&&!only.includes(entry.file))continue;
    if(entry.redo&&!flag('redo')&&!only)continue;
    if(!flag('force')&&!entry.redo&&await exists(resolve(castDir,entry.file+'.png')))continue;
    targets.push(entry);
  }
  console.log(`모델 ${IMAGE_MODEL} · 생성 대상 ${targets.length}명`);
  let ok=0,failed=[];
  for(const entry of targets){
    process.stdout.write(`- ${entry.file} (${entry.age}세 · ${entry.label}) … `);
    let done=false;
    for(let attempt=1;attempt<=3&&!done;attempt++){
      try{await generate(key,entry);done=true;ok++;console.log('완료');}
      catch(error){if(attempt===3){failed.push(entry.file);console.log('실패 ('+error.message+')');}else await sleep(2500*attempt);}
    }
    await sleep(800);
  }
  const ready=await writeReady();
  console.log(`\n성공 ${ok} · 실패 ${failed.length}${failed.length?' ('+failed.join(', ')+')':''}\ncast-ready.js: ${ready.length}명 등록`);
  if(failed.length)process.exitCode=2;
}
if(import.meta.url===`file://${process.argv[1]}`||process.argv[1]?.endsWith('generate-cast.mjs'))main().catch(error=>{console.error(error.message);process.exit(1);});
