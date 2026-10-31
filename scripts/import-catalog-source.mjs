import '../server/register.mjs';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {configuration} from '../server/config.mjs';
const {PostgresDatabase}=await import('../server/postgres-database.mjs');
const {buildCatalogImport,applyCatalogImport}=await import('../server/catalog-source-import.mjs');
const args=process.argv.slice(2),input=args.find(value=>!value.startsWith('--'));
if(!input)throw new Error('Usage: node scripts/import-catalog-source.mjs data/imports/source.json [--apply]');
const source=JSON.parse(readFileSync(resolve(input),'utf8'));
const links=resolve('data/imports/laocai-drive-links.json');if(existsSync(links))source.richSourceCells=JSON.parse(readFileSync(links,'utf8'));
const config=configuration();if(config.databaseProvider!=='supabase'||!config.connectionString||!config.encryptionKey)throw new Error('Cần cấu hình Supabase và khóa mã hóa hiện hành.');
const uri=new URL(config.connectionString),project=decodeURIComponent(uri.username).split('.')[1]??uri.hostname.match(/^db\.([^.]+)\.supabase\.co$/)?.[1];
if(project!=='hggmgvblecqnvnuxbabm')throw new Error('Project không khớp đích Supabase của đợt nhập này.');
const db=new PostgresDatabase(config);
try{
  await db.transaction(async()=>{
    const {state,version}=await db.read(),owner=state.users.find(user=>user.role==='admin'&&user.adminGroup==='root'&&user.status==='active'&&!user.accessClosedAt);
    if(!owner)throw new Error('Không có Admin gốc để sở hữu các bản nháp.');
    const plan=buildCatalogImport(source,owner.id);
    console.log(JSON.stringify({mode:args.includes('--apply')?'apply':'preview',project,ownerId:owner.id,existingProducts:state.products.length,...plan.summary}));
    if(!args.includes('--apply'))return;
    // Encrypted backup of business state and feature records; never copy credentials or sessions.
    const backup=resolve('data/import-backups/catalog-'+Date.now()+'.json');mkdirSync(resolve('data/import-backups'),{recursive:true});
    writeFileSync(backup,JSON.stringify({at:new Date().toISOString(),project,version,state:db.encodeJSON(state),featureRecords:await db.sql.prepare('SELECT id,kind,owner_id,data,expires_at FROM feature_records').all()}),{flag:'wx'});
    const result=await applyCatalogImport(db,plan);console.log(JSON.stringify({result,backup}));
  });
}catch(error){console.error('Import failed:',error.code??error.message);process.exitCode=1;}
finally{await db.close();}
