import '../server/register.mjs';
import {readFileSync} from 'node:fs';
import {configuration} from '../server/config.mjs';
const {PostgresDatabase}=await import('../server/postgres-database.mjs');
const options=configuration();
if(!options.connectionString)throw new Error('Chưa có SUPABASE_DB_URL. Làm theo docs/SUPABASE_SETUP.md trước.');
const db=new PostgresDatabase(options);
try{
  await db.transaction(async()=>{
    const client=db.context.getStore();
    for(const file of ['202610270001_backend.sql','202610270002_storage.sql','202610270003_password_credentials.sql','202610280001_account_security.sql','202610280002_audit_trace.sql','202610290001_srs_followup.sql'])await client.query(readFileSync(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
  });
  console.log('Đã tạo cấu trúc backend và bucket ảnh riêng tư trên Supabase.');
}catch(e){console.error('Migration chưa hoàn tất:',e.code??e.name);process.exitCode=1;}
finally{await db.close();}
