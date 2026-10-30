import { spawn } from 'node:child_process';
import {loadEnvironment} from '../server/config.mjs';
loadEnvironment();
const env={...process.env,DEMO_MODE:process.env.DEMO_MODE??'true'};
const children=[spawn(process.execPath,['server/start.mjs'],{stdio:'inherit',env}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--port','3000','--host','0.0.0.0'],{stdio:'inherit',env})];
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill();process.exitCode=code;}
for(const child of children){child.on('error',e=>{console.error(e);stop(1);});child.on('exit',code=>stop(code??0));}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
