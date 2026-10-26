import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer} from './http-server.mjs';
const envFile=resolve(import.meta.dirname,'.env');
if(existsSync(envFile))process.loadEnvFile(envFile);
const port=Number(process.env.PORT)||4173;
createServer().listen(port,'127.0.0.1',()=>console.log(`ROOM19 http://127.0.0.1:${port}`));
