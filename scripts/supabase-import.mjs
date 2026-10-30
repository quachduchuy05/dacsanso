import '../server/register.mjs';
import {resolve} from 'node:path';
import {configuration} from '../server/config.mjs';
const {Database}=await import('../server/database.mjs');
const {PostgresDatabase}=await import('../server/postgres-database.mjs');
import {DatabaseSync} from 'node:sqlite';
const options=configuration(),sourcePath=process.argv[2];
if(!options.connectionString||!sourcePath)throw new Error('Dùng npm run supabase:import -- data/app.sqlite sau khi cấu hình SUPABASE_DB_URL.');
if(!options.demo&&!options.encryptionKey)throw new Error('Cần DATA_ENCRYPTION_KEY để mã hóa dữ liệu chuyển lên Supabase.');
// Read existing data only; never create a missing source file.
const {existsSync}=await import('node:fs');if(!existsSync(sourcePath))throw new Error('Không tìm thấy file SQLite nguồn.');
const source=new DatabaseSync(resolve(sourcePath),{readOnly:true}),target=new PostgresDatabase(options);
try{
  const row=source.prepare('SELECT data FROM app_state WHERE id=1').get();
  if(!row)throw new Error('Nguồn không có dữ liệu nghiệp vụ.');
  const key=process.env.SQLITE_SOURCE_ENCRYPTION_KEY||options.encryptionKey;
  const state=Database.prototype.decodeJSON.call({encryptionKey:key?Buffer.from(key,'hex'):null},row.data);
  await target.transaction(async()=>{
    const existing=await target.sql.prepare('SELECT id FROM app_state WHERE id=1').get();
    if(existing)throw new Error('Đích đã có dữ liệu. Không ghi đè cơ sở dữ liệu Supabase.');
    await target.sql.prepare('INSERT INTO app_state VALUES(1,1,?)').run(target.encodeJSON(state));
    await target.audit(null,'sqlite-import','','Imported business data only; sessions and OTP were not copied.');
  });
  console.log('Đã chuyển dữ liệu nghiệp vụ lên Supabase. Phiên đăng nhập và OTP cũ không được sao chép.');
}catch(e){console.error('Chưa nhập dữ liệu:',e.message.startsWith('Đích')?e.message:(e.code??e.name));process.exitCode=1;}
finally{source.close();await target.close();}
