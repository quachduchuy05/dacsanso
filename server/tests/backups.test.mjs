import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,appendFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Database} from '../database.mjs';
import {issueSession} from '../security.mjs';
import {createBackup,restoreBackup,inspectBackup} from '../backups.mjs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('online encrypted SQLite backup restores state, revokes sessions and never overwrites files',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'dac-san-backup-')),source=join(dir,'source.sqlite'),copy=join(dir,'backup.sqlite'),restored=join(dir,'restored.sqlite'),key='ab'.repeat(32);
  const db=new Database(source,{demo:true,encryptionKey:key});t.after(()=>db.close());
  await issueSession(db,'u-kh1');const before=db.read();
  const metadata=await createBackup(source,copy,key);assert.equal(metadata.encrypted,true);assert.equal(metadata.version,before.version);
  await assert.rejects(()=>createBackup(source,copy,key),/EEXIST/);
  await restoreBackup(copy,restored,key);
  const recovered=new Database(restored,{demo:true,encryptionKey:key});t.after(()=>recovered.close());
  assert.deepEqual(recovered.read().state,before.state);
  assert.equal(recovered.sql.prepare('SELECT COUNT(*) AS count FROM sessions').get().count,0);
  assert.equal(db.sql.prepare('SELECT COUNT(*) AS count FROM sessions').get().count,1);
  assert.equal(recovered.sql.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE action='backup-restored'").get().count,1);
  await assert.rejects(()=>restoreBackup(copy,source,key),/EEXIST/);
  assert.throws(()=>inspectBackup(copy,'cd'.repeat(32)));
  appendFileSync(copy,'modified');await assert.rejects(()=>restoreBackup(copy,join(dir,'bad.sqlite'),key),/Checksum/);
});

test('maintenance CLIs load domain code without a preloaded loader and operate on isolated paths',t=>{
  const dir=mkdtempSync(join(tmpdir(),'dac-san-cli-')),source=join(dir,'source.sqlite'),key='ab'.repeat(32);
  const db=new Database(source,{demo:true,encryptionKey:key});t.after(()=>db.close());
  const env={...process.env,DEMO_MODE:'true',DATABASE_PROVIDER:'sqlite',DATABASE_PATH:source,DATA_ENCRYPTION_KEY:key,SUPABASE_DB_URL:'',PUBLIC_URL:'https://example.com'};
  const run=(script,args=[],extra={})=>spawnSync(process.execPath,[fileURLToPath(new URL('../../scripts/'+script,import.meta.url)),...args],{cwd:dir,env:{...env,...extra},encoding:'utf8',timeout:20000});
  const copy=join(dir,'cli.sqlite'),created=run('backup.mjs',['create',copy]);assert.equal(created.status,0,created.stderr);
  assert.equal(JSON.parse(created.stdout).encrypted,true);
  const restored=run('backup.mjs',['restore',copy,join(dir,'restored.sqlite')]);assert.equal(restored.status,0,restored.stderr);
  const bootstrap=run('bootstrap-account.mjs',[],{DEMO_MODE:'false',DATABASE_PATH:join(dir,'bootstrap.sqlite'),BOOTSTRAP_ADMIN_PHONE:'0912345678'});
  assert.equal(bootstrap.status,0,bootstrap.stderr);assert(bootstrap.stdout.includes('https://example.com/dang-nhap?setup='));
  for(const script of ['supabase-migrate.mjs','supabase-import.mjs']){
    const result=run(script);assert.notEqual(result.status,0);assert(!result.stderr.includes('ERR_MODULE_NOT_FOUND'));assert(result.stderr.includes('SUPABASE_DB_URL'));
  }
});
