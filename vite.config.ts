import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
function buildId() { if(process.env.VERCEL_GIT_COMMIT_SHA)return process.env.VERCEL_GIT_COMMIT_SHA.slice(0,7); try{return execSync('git rev-parse --short=7 HEAD',{stdio:['ignore','pipe','ignore']}).toString().trim();}catch{return 'local';} }
export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'');
  const proxy={'/api':{target:env.API_PROXY_TARGET || 'http://127.0.0.1:4000',changeOrigin:true}};
  return {plugins:[react(),tailwindcss()],define:{__APP_BUILD__:JSON.stringify(buildId())},resolve:{alias:{'@':path.resolve(import.meta.dirname,'.')}},server:{proxy,hmr:process.env.DISABLE_HMR!=='true'},preview:{proxy}};
});
