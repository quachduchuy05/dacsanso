import pg from 'pg';
import {assertFinancialIntegrity} from './financial-integrity.mjs';
import {auditMetadata} from './audit-context.mjs';
import {AsyncLocalStorage} from 'node:async_hooks';
import {Database} from './database.mjs';
import {createSeedState} from '../src/data/seed.ts';

export function postgresSql(sql) {
  let index=0;
  return sql.replace(/(?<![\w.])(feature_records|password_attempts|account_links|password_credentials|app_state|sessions|otp_challenges|receipts|audit_events|export_jobs|rate_limits|webhook_events|revoked_tokens)\b/g,'app_private.$1').replace(/'(?:''|[^'])*'|\?/g,value=>value==='?'?`$${++index}`:value);
}
export class PostgresDatabase {
  constructor(options={}) {
    if(options.encryptionKey&&!/^[a-f\d]{64}$/i.test(options.encryptionKey))throw new Error('DATA_ENCRYPTION_KEY phải gồm 64 ký tự hex.');
    this.encryptionKey=options.encryptionKey?Buffer.from(options.encryptionKey,'hex'):null;
    this.provider='supabase';this.context=new AsyncLocalStorage();
    let connectionString=options.connectionString;
    if(connectionString){
      let uri;try{uri=new URL(connectionString);}catch{throw new Error('SUPABASE_DB_URL không hợp lệ.');}
      if(!['postgres:','postgresql:'].includes(uri.protocol))throw new Error('SUPABASE_DB_URL phải là URI PostgreSQL.');
      for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])uri.searchParams.delete(key);
      connectionString=uri.toString();
    }
    this.pool=options.pool??new pg.Pool({connectionString,max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:30000,statement_timeout:20000,ssl:options.ssl===false?false:{rejectUnauthorized:true,...(options.ca?{ca:options.ca}:{})},types:{getTypeParser:(oid,format)=>oid===20?value=>Number(value):pg.types.getTypeParser(oid,format)}});
    this.pool.on?.('error',e=>console.error('PostgreSQL idle connection error:',e.code??e.name));
    this.sql={prepare:sql=>({
      get:async(...args)=>(await this.query(sql,args)).rows[0],
      all:async(...args)=>(await this.query(sql,args)).rows,
      run:async(...args)=>({changes:(await this.query(sql,args)).rowCount}),
    })};
  }
  query(sql,args=[]) {return (this.context.getStore()??this.pool).query(postgresSql(sql),args);}
  encodeJSON(value){return Database.prototype.encodeJSON.call(this,value);}
  decodeJSON(value){return Database.prototype.decodeJSON.call(this,value);}
  async initialize(options={}) {
    await this.transaction(async()=>{
      if(await this.sql.prepare('SELECT id FROM app_state WHERE id=1').get())return;
      const seed=createSeedState(new Date());
      if(!options.demo){
        for(const [key,value] of Object.entries(seed))if(Array.isArray(value)&&!['wards','giftBoxTypes'].includes(key))seed[key]=[];
        for(const key of ['carts','favorites','follows','savedVouchers','seasonWatches','seasonAlerts','chatReads','lowStockAlerts'])seed[key]={};
        delete seed.demoAccess;
        if(options.adminPhone)seed.users=[{id:'bootstrap-root',phone:options.adminPhone,name:'Quản trị hệ thống',role:'admin',adminGroup:'root',status:'active',createdAt:new Date().toISOString()}];
      }
      await this.sql.prepare('INSERT INTO app_state VALUES(1,1,?) ON CONFLICT(id) DO NOTHING').run(this.encodeJSON(seed));
    });
  }
  async read(){const row=await this.sql.prepare('SELECT version,data FROM app_state WHERE id=1').get();if(!row)throw new Error('Chưa khởi tạo cơ sở dữ liệu.');return {version:Number(row.version),state:this.decodeJSON(row.data)};}
  async save(state,{allowFinancialReset=false}={}){if(!allowFinancialReset)assertFinancialIntegrity((await this.read()).state,state);await this.sql.prepare('UPDATE app_state SET version=version+1,data=? WHERE id=1').run(this.encodeJSON(state));}
  async transaction(fn) {
    if(this.context.getStore())return fn();
    const client=await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Transaction-level lock works with Supabase's session and transaction poolers.
      await client.query('SELECT pg_advisory_xact_lock(71263421)');
      const result=await this.context.run(client,fn);
      await client.query('COMMIT');return result;
    }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}
    finally{client.release();}
  }
  withRequest(fn){return fn();}
  async audit(userId,action,target='',detail=''){const m=auditMetadata(action);await this.sql.prepare('INSERT INTO audit_events(user_id,action,target,at,detail,outcome,correlation_id) VALUES(?,?,?,?,?,?,?)').run(userId??null,action,target,new Date().toISOString(),detail,m.outcome,m.correlationId);}
  async rate(key,max,windowMs){
    const now=Date.now();
    const result=await this.query(`INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?)
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN app_private.rate_limits.reset_at<=? THEN 1 ELSE app_private.rate_limits.count+1 END,
      reset_at=CASE WHEN app_private.rate_limits.reset_at<=? THEN EXCLUDED.reset_at ELSE app_private.rate_limits.reset_at END
      WHERE app_private.rate_limits.reset_at<=? OR app_private.rate_limits.count<? RETURNING count`,[key,now+windowMs,now,now,now,max]);
    return result.rows.length>0;
  }
  async close(){await this.pool.end();}
}
export async function openDatabase(options={}) {
  const provider=options.databaseProvider??'sqlite';
  if(provider==='sqlite')return new Database(options.databasePath??'data/app.sqlite',options);
  if(provider!=='supabase')throw new Error('DATABASE_PROVIDER chỉ nhận sqlite hoặc supabase.');
  if(!options.demo&&!options.encryptionKey)throw new Error('Cần DATA_ENCRYPTION_KEY khi dùng Supabase ở chế độ thật.');
  if(!options.connectionString&&!options.pool)throw new Error('Thiếu SUPABASE_DB_URL. Xem docs/SUPABASE_SETUP.md.');
  const db=new PostgresDatabase(options);
  try{await db.initialize(options);return db;}catch(e){await db.close();if(e.code==='42P01'||e.code==='3F000')throw new Error('Chưa chạy migration Supabase. Chạy npm run supabase:migrate trước.');throw e;}
}
