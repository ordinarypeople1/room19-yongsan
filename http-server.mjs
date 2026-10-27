import {generateResidentPhoto,validPhotoRequest,IMAGE_MODEL} from './resident-images.mjs';
import http from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {complete,validatePayload} from './openrouter.mjs';

const PUBLIC=new Set(['index.html','favicon.ico','cast-preview.html','cast-preview.js','cast-preview.css','horizon.css','romantic.css','readability.css','horizon-app.js','ai-config.js','photos.js','photos.css','midnight.css','fx.js','cast-ready.js','cast-retired.js','sim.js','life-story.js','activity-log.js','resident-context.js','interactions.js','cast.js','motion.js','pace.js']);
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function bodyOf(req){let bytes=0,parts=[];for await(const part of req){bytes+=part.length;if(bytes>32768)throw Error('large');parts.push(part);}return JSON.parse(Buffer.concat(parts).toString());}
export function createServer({root=import.meta.dirname,apiKey=process.env.OPENROUTER_API_KEY,model=process.env.OPENROUTER_MODEL,format=process.env.OPENROUTER_RESPONSE_FORMAT,fetchImpl=fetch}={}){
  let active=0,windowStart=Date.now(),requests=0;
  const configured=!!apiKey&&!!model;
  return http.createServer(async(req,res)=>{
    try{
      // Local-only API: disallow remote Host headers and cross-origin spending requests.
      if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host||'')){json(res,403,{error:'Forbidden host'});return;}
      const base=`http://${req.headers.host}`,url=new URL(req.url,base),path=decodeURIComponent(url.pathname);
      if(path==='/api/status'&&req.method==='GET'){json(res,200,{configured,model:configured?model:null,imageModel:IMAGE_MODEL});return;}
      if(path.startsWith('/api/')){
        if(req.method!=='POST'){json(res,405,{error:'Method not allowed'});return;}
        if(req.headers.origin!==base){json(res,403,{error:'Same-origin requests only'});return;}
        if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'JSON required'});return;}
        const kind=path==='/api/intent'?'intent':path==='/api/dialogue'?'dialogue':path==='/api/photo'?'photo':null;
        if(!kind){json(res,404,{error:'Not found'});return;}
        const input=await bodyOf(req);if(!(kind==='photo'?validPhotoRequest(input):validatePayload(kind,input))){json(res,400,{error:'Invalid request'});return;}
        if(!configured){json(res,503,{error:'AI not configured',fallback:true});return;}
        if(Date.now()-windowStart>60000){requests=0;windowStart=Date.now();}
        if(active>=2||requests>=20){json(res,429,{error:'Please try again later',fallback:true});return;}
        requests++;active++;
        try{json(res,200,await (kind==='photo'?generateResidentPhoto(input,{apiKey,fetchImpl}):complete(kind,input,{apiKey,model,format,fetchImpl})));}
        catch{json(res,502,{error:'AI unavailable',fallback:true});}finally{active--;}
        return;
      }
      if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
      const relative=path==='/'?'index.html':path.slice(1);
      if(!PUBLIC.has(relative)&&!/^assets\/(?:(?:cast|portraits)\/)?[a-zA-Z0-9_-]+\.(?:png|jpg|webp|svg)$/.test(relative)){res.writeHead(404).end('Not found');return;}
      const actual=await realpath(resolve(root,relative)),realRoot=await realpath(root);
      if(!actual.startsWith(realRoot+sep)){res.writeHead(403).end();return;}
      const data=await readFile(actual);res.writeHead(200,{'Content-Type':TYPES[extname(actual)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:data);
    }catch(error){if(!res.headersSent)json(res,error.message==='large'?413:error instanceof SyntaxError||error instanceof URIError?400:404,{error:'Request could not be processed'});else res.end();}
  });
}
