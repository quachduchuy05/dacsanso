import {DatabaseSync,backup} from 'node:sqlite';
import {createReadStream} from 'node:fs';
import {open,readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {Database} from './database.mjs';

async function digest(path){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
export function inspectBackup(path,encryptionKey){
  const db=new DatabaseSync(path,{readOnly:true});
  try{
    const integrity=db.prepare('PRAGMA integrity_check').all();
    if(integrity.length!==1||Object.values(integrity[0])[0]!=='ok')throw new Error('SQLite integrity_check không đạt.');
    const row=db.prepare('SELECT version,data FROM app_state WHERE id=1').get();
    if(!row)throw new Error('Bản sao không có dữ liệu ứng dụng.');
    if(encryptionKey&&!/^[a-f\d]{64}$/i.test(encryptionKey))throw new Error('Khóa mã hóa không hợp lệ.');
    const state=Database.prototype.decodeJSON.call({encryptionKey:encryptionKey?Buffer.from(encryptionKey,'hex'):null},row.data);
    if(!Array.isArray(state.users)||!Array.isArray(state.orders))throw new Error('Cấu trúc dữ liệu không hợp lệ.');
    return {version:row.version,encrypted:row.data.startsWith('aes1:')};
  }finally{db.close();}
}
export async function createBackup(source,target,encryptionKey){
  source=resolve(source);target=resolve(target);
  if(source.toLowerCase()===target.toLowerCase())throw new Error('Bản sao phải khác tệp nguồn.');
  inspectBackup(source,encryptionKey);
  await mkdir(dirname(target),{recursive:true});
  // Reserve a new path: existing backups are never overwritten.
  const handle=await open(target,'wx',0o600);await handle.close();
  const db=new DatabaseSync(source,{readOnly:true});
  try{await backup(db,target);}finally{db.close();}
  const metadata={...inspectBackup(target,encryptionKey),createdAt:new Date().toISOString(),sha256:await digest(target)};
  await writeFile(target+'.manifest.json',JSON.stringify(metadata,null,2),{flag:'wx',mode:0o600});
  return metadata;
}
export async function restoreBackup(source,target,encryptionKey){
  source=resolve(source);target=resolve(target);
  if(source.toLowerCase()===target.toLowerCase())throw new Error('Không được khôi phục đè lên bản sao.');
  const manifest=JSON.parse(await readFile(source+'.manifest.json','utf8'));
  if(manifest.sha256!==await digest(source))throw new Error('Checksum bản sao không khớp.');
  const metadata=inspectBackup(source,encryptionKey);
  await mkdir(dirname(target),{recursive:true});
  await copyFile(source,target,constants.COPYFILE_EXCL);
  const db=new DatabaseSync(target);
  try{
    db.exec('BEGIN IMMEDIATE; DELETE FROM sessions; DELETE FROM otp_challenges; DELETE FROM account_links; DELETE FROM password_attempts;');
    db.exec("DELETE FROM feature_records WHERE kind='product-edit-lock';");
    db.prepare('INSERT INTO audit_events(user_id,action,target,at,detail) VALUES(?,?,?,?,?)').run(null,'backup-restored','',new Date().toISOString(),'Local sessions, challenges and edit leases invalidated');
    db.exec('COMMIT');
  }catch(e){if(db.isTransaction)db.exec('ROLLBACK');throw e;}finally{db.close();}
  return {...metadata,restoredAt:new Date().toISOString()};
}
