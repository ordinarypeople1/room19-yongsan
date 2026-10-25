import {test} from 'node:test';
import assert from 'node:assert/strict';
import {elapsedGameMinutes} from '../pace.js';
import {createAgent,setActivity,updateAgent} from '../motion.js';
import {actorArt} from '../live-art.js';
test('slow clock advances ten minutes per eighteen real seconds',()=>{assert.equal(elapsedGameMinutes(17999),0);assert.equal(elapsedGameMinutes(18000),10);assert.equal(elapsedGameMinutes(54000),30);});
test('residents linger at destinations and pause preserves the remaining time',()=>{const a=createAgent(1);setActivity(a,'독서');a.x=a.target.x;a.y=a.target.y;updateAgent(a,.016);assert(a.wait>=12);const left=a.wait;updateAgent(a,.05,0);assert.equal(a.wait,left);for(let i=0;i<5*60;i++)updateAgent(a,1/60);assert(a.wait>0);});
test('photographic actors use one intact layer and the alpha asset',()=>{const html=actorArt({id:1,gender:'남'});assert(html.includes('assets/cast/'));assert(html.includes('whole-person'));assert(!html.includes('leg-left'));assert(!html.includes('body-upper'));});
