import '../server/register.mjs';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {configuration} from '../server/config.mjs';
const {createBackup,restoreBackup}=await import('../server/backups.mjs');

const options=configuration(),[action,sourceArg,targetArg]=process.argv.slice(2);
if(options.databaseProvider!=='sqlite')throw new Error('Công cụ này dành cho SQLite. PostgreSQL cần backup/PITR của nhà cung cấp và kiểm tra phục hồi riêng.');
if(!options.demo&&!options.encryptionKey)throw new Error('Cần DATA_ENCRYPTION_KEY của môi trường thật.');
if(action==='create'){
  const target=resolve(sourceArg??`data/backups/app-${new Date().toISOString().replaceAll(':','-')}-${randomUUID().slice(0,8)}.sqlite`);
  const result=await createBackup(options.databasePath,target,options.encryptionKey);
  console.log(JSON.stringify({path:target,...result},null,2));
}else if(action==='restore'){
  if(!sourceArg||!targetArg)throw new Error('Cách dùng: npm run backup:restore -- <backup.sqlite> <tệp-mới.sqlite>');
  const result=await restoreBackup(sourceArg,targetArg,options.encryptionKey);
  console.log(JSON.stringify({path:resolve(targetArg),...result},null,2));
}else throw new Error('Chọn create hoặc restore.');
