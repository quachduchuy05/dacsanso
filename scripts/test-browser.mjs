import '../server/register.mjs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const { createApplication } = await import('../server/app.mjs');
const { createServer } = await import('vite');
const testIdentity={id:'11111111-1111-4111-8111-111111111111',email:'browser@example.com',email_confirmed_at:new Date().toISOString(),user_metadata:{name:'Khách Supabase thử nghiệm'}};
const app = await createApplication({ demo: true, databasePath: resolve(`data/e2e-${Date.now()}.sqlite`),supabase:{auth:{getUser:async token=>token.split('.').length===3?{data:{user:testIdentity},error:null}:{data:{user:null},error:{message:'Invalid'}}}} });
await new Promise(r => app.server.listen(4000, '127.0.0.1', r));
const vite = await createServer({ server: { port: 3000, strictPort: true },define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('https://codex-test.supabase.co'),'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('sb_publishable_test_only')} });
await vite.listen();
let code = 1;
try {
    const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.backend.config.ts',...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, E2E_EXTERNAL_SERVER: 'true' } });
    code = await new Promise((r, reject) => { child.on('exit', c => r(c ?? 1)); child.on('error', reject); });
}
finally {
    await vite.close();
    await new Promise(r => app.server.close(r));
}
process.exit(code);
