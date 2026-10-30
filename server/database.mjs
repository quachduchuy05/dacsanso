import { DatabaseSync } from 'node:sqlite';
import {assertFinancialIntegrity} from './financial-integrity.mjs';
import {auditMetadata} from './audit-context.mjs';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createSeedState } from '../src/data/seed.ts';
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';

export class Database {
  constructor(filename, { demo = false, adminPhone, encryptionKey } = {}) {
    if(encryptionKey&&!/^[a-f0-9]{64}$/i.test(encryptionKey))throw new Error('DATA_ENCRYPTION_KEY phải gồm 64 ký tự hex.');
    this.encryptionKey=encryptionKey?Buffer.from(encryptionKey,'hex'):null;
    this.provider='sqlite';
    this.requestQueue=Promise.resolve();
    if (filename !== ':memory:') mkdirSync(dirname(filename), {recursive:true});
    this.sql = new DatabaseSync(filename);
    this.sql.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (access_hash TEXT PRIMARY KEY, refresh_hash TEXT UNIQUE NOT NULL, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, refresh_expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS otp_challenges (id TEXT PRIMARY KEY, phone TEXT NOT NULL, purpose TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS password_credentials (user_id TEXT PRIMARY KEY,password_hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS password_attempts (phone TEXT PRIMARY KEY,failures INTEGER NOT NULL,locked_until INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS account_links (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS feature_records (id TEXT PRIMARY KEY,kind TEXT NOT NULL,owner_id TEXT NOT NULL,data TEXT NOT NULL,expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS receipts (user_id TEXT NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, response TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(user_id,request_id));
      CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, action TEXT NOT NULL, target TEXT, at TEXT NOT NULL, detail TEXT);
      CREATE TABLE IF NOT EXISTS export_jobs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL, filters TEXT NOT NULL, data_as_of TEXT NOT NULL, version INTEGER NOT NULL, filename TEXT, content TEXT, expires_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS exports_queue_idx ON export_jobs(status,data_as_of);
      CREATE INDEX IF NOT EXISTS feature_kind_owner_idx ON feature_records(kind,owner_id);
      CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS webhook_events (provider TEXT NOT NULL,event_id TEXT NOT NULL,fingerprint TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(provider,event_id));
      CREATE TABLE IF NOT EXISTS revoked_tokens (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
      CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;
      CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;`);
    const auditColumns=this.sql.prepare('PRAGMA table_info(audit_events)').all();
    if(!auditColumns.some(c=>c.name==='outcome'))this.sql.exec("ALTER TABLE audit_events ADD COLUMN outcome TEXT NOT NULL DEFAULT 'unknown'");
    if(!auditColumns.some(c=>c.name==='correlation_id'))this.sql.exec('ALTER TABLE audit_events ADD COLUMN correlation_id TEXT');
    this.sql.exec('CREATE INDEX IF NOT EXISTS audit_correlation ON audit_events(correlation_id); CREATE INDEX IF NOT EXISTS audit_outcome ON audit_events(outcome,id);');
    if (!this.sql.prepare('SELECT id FROM app_state WHERE id=1').get()) {
      const seed = createSeedState(new Date());
      if (!demo) {
        for (const [k,v] of Object.entries(seed)) if (Array.isArray(v) && !['wards','giftBoxTypes'].includes(k)) seed[k]=[];
        for (const k of ['carts','favorites','follows','savedVouchers','seasonWatches','seasonAlerts','chatReads','lowStockAlerts']) seed[k]={};
        delete seed.demoAccess;
        if (adminPhone) seed.users=[{id:'bootstrap-root',phone:adminPhone,name:'Quản trị hệ thống',role:'admin',adminGroup:'root',status:'active',createdAt:new Date().toISOString()}];
      }
      this.sql.prepare('INSERT INTO app_state VALUES(1,1,?)').run(this.encodeJSON(seed));
    }
  }
  encodeJSON(value) {const text=JSON.stringify(value);if(!this.encryptionKey)return text;const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.encryptionKey,nonce);const encrypted=Buffer.concat([cipher.update(text,'utf8'),cipher.final()]);return 'aes1:'+Buffer.concat([nonce,cipher.getAuthTag(),encrypted]).toString('base64');}
  decodeJSON(value) {if(!value.startsWith('aes1:'))return JSON.parse(value);if(!this.encryptionKey)throw new Error('Cần DATA_ENCRYPTION_KEY để mở cơ sở dữ liệu.');const packed=Buffer.from(value.slice(5),'base64'),decipher=createDecipheriv('aes-256-gcm',this.encryptionKey,packed.subarray(0,12));decipher.setAuthTag(packed.subarray(12,28));return JSON.parse(Buffer.concat([decipher.update(packed.subarray(28)),decipher.final()]).toString('utf8'));}
  read() { const row=this.sql.prepare('SELECT version,data FROM app_state WHERE id=1').get(); return {version:row.version,state:this.decodeJSON(row.data)}; }
  save(state,{allowFinancialReset=false}={}) {if(!allowFinancialReset)assertFinancialIntegrity(this.read().state,state);this.sql.prepare('UPDATE app_state SET version=version+1,data=? WHERE id=1').run(this.encodeJSON(state)); }
  async transaction(fn) {
    this.sql.exec('BEGIN IMMEDIATE');
    try { const result=await fn(); this.sql.exec('COMMIT'); return result; }
    catch(e) { this.sql.exec('ROLLBACK'); throw e; }
  }
  async withRequest(fn) {
    const previous=this.requestQueue;let release;
    this.requestQueue=new Promise(resolve=>{release=resolve;});
    await previous;
    try{return await fn();}finally{release();}
  }
  audit(userId,action,target='',detail='') {const m=auditMetadata(action);this.sql.prepare('INSERT INTO audit_events(user_id,action,target,at,detail,outcome,correlation_id) VALUES(?,?,?,?,?,?,?)').run(userId??null,action,target,new Date().toISOString(),detail,m.outcome,m.correlationId); }
  rate(key, max, windowMs) {
    const now=Date.now();
    this.sql.prepare('DELETE FROM rate_limits WHERE reset_at<=?').run(now);
    const row=this.sql.prepare('SELECT count FROM rate_limits WHERE key=?').get(key);
    if (row && row.count>=max) return false;
    this.sql.prepare('INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+windowMs);
    return true;
  }
  close() { this.sql.close(); }
}
