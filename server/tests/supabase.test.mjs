import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {PostgresDatabase,postgresSql} from '../postgres-database.mjs';
import {createApplication} from '../app.mjs';
import {issueSession,requestOtp,verifyOtp} from '../security.mjs';
import {canReadMedia,uploadMedia,signMedia,validateMediaReferences} from '../media.mjs';
import {enqueueExport,processExportQueue} from '../export-queue.mjs';
import {actorOf} from '../../src/domain/auth.ts';
import {reconciliationRoute} from '../reconciliation.mjs';
import {adjustmentRoute} from '../reconciliation-adjustments.mjs';
import {recordManualRefund} from '../manual-refunds.mjs';
import {savePickupPoint} from '../pickup-points.mjs';
import {deletionRequestsRoute} from '../deletion-requests.mjs';
import {pushRoute,processPushQueue} from '../web-push.mjs';
import {createPaymentSession} from '../payment-sessions.mjs';
import webpush from 'web-push';
import {createECDH,randomBytes} from 'node:crypto';

async function pgFixture(t){
  const engine=new PGlite();await engine.exec(readFileSync(new URL('../../supabase/migrations/202610270001_backend.sql',import.meta.url),'utf8'));
  await engine.exec(readFileSync(new URL('../../supabase/migrations/202610270003_password_credentials.sql',import.meta.url),'utf8'));
  await engine.exec(readFileSync(new URL('../../supabase/migrations/202610280001_account_security.sql',import.meta.url),'utf8'));
  await engine.exec(readFileSync(new URL('../../supabase/migrations/202610280002_audit_trace.sql',import.meta.url),'utf8'));
  await engine.exec(readFileSync(new URL('../../supabase/migrations/202610290001_srs_followup.sql',import.meta.url),'utf8'));
  let queue=Promise.resolve();
  async function acquire(){const prior=queue;let release;queue=new Promise(r=>{release=r;});await prior;return release;}
  const pool={query:async(sql,args)=>{const release=await acquire();try{return await engine.query(sql,args);}finally{release();}},connect:async()=>{const release=await acquire();return {query:(sql,args)=>engine.query(sql,args),release};},end:()=>engine.close()};
  const db=new PostgresDatabase({pool,encryptionKey:'ab'.repeat(32)});await db.initialize({demo:true});
  const app=await createApplication({db,demo:true});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  t.after(async()=>{await new Promise(r=>app.server.close(r));await db.close();});
  const base=`http://127.0.0.1:${app.server.address().port}`;
  async function command(name,args,key=crypto.randomUUID()){
    const s=await issueSession(db,'u-kh1');const r=await fetch(base+'/api/v1/commands',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${s.accessToken}`,'Idempotency-Key':key},body:JSON.stringify({commands:[{name,args}]})});return {status:r.status,body:await r.json()};
  }
  return {db,engine,command,base};
}

test('PostgreSQL persists encrypted Web Push subscriptions and delivery claims without duplicate sends',async t=>{
  const f=await pgFixture(t),user=(await f.db.read()).state.users.find(u=>u.role==='customer');
  const options={webPush:{subject:'mailto:ops@example.com',...webpush.generateVAPIDKeys()}};
  const key=createECDH('prime256v1');key.generateKeys();
  const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/pg-test',keys:{p256dh:key.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
  await f.db.transaction(()=>pushRoute('POST',{action:'subscribe',subscription},{db:f.db,auth:{user},options}));
  await f.db.transaction(async()=>{const {state}=await f.db.read();state.notifications.push({id:'pg-push-notification',userId:user.id,at:new Date(Date.now()+1000).toISOString(),read:false});await f.db.save(state);});
  let calls=0;const send=async()=>{calls++;};
  await Promise.all([processPushQueue(f.db,options,{send}),processPushQueue(f.db,options,{send})]);
  assert.equal(calls,1);
  const rows=await f.db.sql.prepare("SELECT data FROM feature_records WHERE kind='web-push-subscription'").all();assert(rows.every(row=>row.data.startsWith('aes1:')));
});

test('PostgreSQL payment sessions retain idempotency metadata without recording a payment',async t=>{
  const f=await pgFixture(t),{state}=await f.db.read(),user=state.users.find(u=>u.role==='customer');
  const tx={id:'TX-PG-SESSION',customerId:user.customerId,kind:'checkout',status:'pending',amount:183000,expiresAt:new Date(Date.now()+600000).toISOString(),orderIds:[],amounts:{}};
  state.transactions.push(tx);await f.db.save(state);
  const options={publicUrl:'https://shop.example.com',paymentAdapter:{url:'https://adapter.example.com/create',token:'adapter-token-only-test',checkoutOrigins:['https://checkout.example.com']}};
  let calls=0;const fetchImpl=async()=>{calls++;return Response.json({transactionId:tx.id,amount:tx.amount,currency:'VND',checkoutUrl:'https://checkout.example.com/pay',expiresAt:tx.expiresAt});};
  for(let index=0;index<2;index++)await createPaymentSession(tx.id,{db:f.db,auth:{user},options,fetchImpl});
  assert.equal(calls,1);assert.equal((await f.db.read()).state.transactions.find(item=>item.id===tx.id).status,'pending');
});
test('PostgreSQL migration, encrypted persistence, rate limits and backend command work',async t=>{
  const f=await pgFixture(t);
  assert.equal((await f.db.read()).state.users[0].id,'u-kh1');
  const credentials={name:'Khách Postgres',phone:'0988888888',password:'Postgres@123'};
  const challenge=await requestOtp(f.db,{phone:credentials.phone,purpose:'register'},{demo:true},'pg-register');
  for(const action of ['register','login']){
    const response=await fetch(f.base+`/api/v1/auth/password/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...credentials,...(action==='register'?{challengeId:challenge.challengeId,otp:'123456'}:{})})});
    assert.equal(response.status,200);assert((await response.json()).accessToken);
  }
  const raw=(await f.engine.query('SELECT data FROM app_private.app_state')).rows[0].data;assert(raw.startsWith('aes1:'));
  assert.equal(await f.db.rate('limited',1,60000),true);assert.equal(await f.db.rate('limited',1,60000),false);
  const key=crypto.randomUUID();assert.equal((await f.command('addToCart',[null,'prod-che',1,null],key)).status,200);
  assert.equal((await f.command('addToCart',[null,'prod-che',1,null],key)).status,200);
  assert.equal((await f.db.read()).state.carts['cust-1'].find(l=>l.productId==='prod-che').quantity,1);
  const {rows}=await f.engine.query("SELECT relname,relrowsecurity FROM pg_class WHERE relnamespace='app_private'::regnamespace AND relkind='r'");assert(rows.every(r=>r.relrowsecurity));
  await f.engine.exec("CREATE ROLE anon; GRANT USAGE ON SCHEMA public TO anon; SET ROLE anon;");
  await assert.rejects(()=>f.engine.query('SELECT * FROM app_private.app_state'),/permission denied/);await f.engine.exec('RESET ROLE;');
  await f.engine.exec('CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
  await f.engine.exec(readFileSync(new URL('../../supabase/migrations/202610270002_storage.sql',import.meta.url),'utf8'));
  assert.equal((await f.engine.query("SELECT public FROM storage.buckets WHERE id='app-images'")).rows[0].public,false);
});
test('PostgreSQL rolls back failed writes and audit remains immutable',async t=>{
  const f=await pgFixture(t),before=await f.db.read();
  await assert.rejects(()=>f.db.transaction(async()=>{const {state}=await f.db.read();state.users=[];await f.db.save(state);throw new Error('rollback');}));
  assert.deepEqual(await f.db.read(),before);
  await f.db.audit('u-ad-root','test');await assert.rejects(()=>f.engine.query("UPDATE app_private.audit_events SET action='tamper'"),/append-only/);
  const challenge=await requestOtp(f.db,{phone:'0900000001'},{demo:true},'test');
  const attempts=await Promise.allSettled([verifyOtp(f.db,{challengeId:challenge.challengeId,otp:'123456'},'login'),verifyOtp(f.db,{challengeId:challenge.challengeId,otp:'123456'},'login')]);
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
});

test('PostgreSQL claims durable queued exports and writes downloadable metadata',async t=>{
  const f=await pgFixture(t),state=(await f.db.read()).state,user=state.users.find(u=>u.adminGroup==='finance');
  const job=await enqueueExport(f.db,{user,actor:actorOf(user)},{kind:'orders',format:'xlsx'});
  const result=await processExportQueue(f.db);assert.equal(result.status,'SUCCEEDED');
  const token=(await issueSession(f.db,user.id)).accessToken;
  const response=await fetch(f.base+'/api/v1/exports/'+job.id+'/download?as=json',{headers:{Authorization:'Bearer '+token}});
  assert.equal(response.status,200);const data=await response.json();assert.equal(data.encoding,'base64');assert.match(data.checksum,/^[a-f0-9]{64}$/);
});

test('PostgreSQL posts a separately approved reconciliation adjustment without changing orders',async t=>{
  const f=await pgFixture(t),{state}=await f.db.read(),creator=state.users.find(u=>u.adminGroup==='finance'),approver={...creator,id:'pg-finance-reviewer',phone:'0995550789'};
  state.users.push(approver);await f.db.save(state);const order=state.orders[0];
  const session=await f.db.transaction(()=>reconciliationRoute('POST',{provider:'PG-BANK',kind:'cod',csv:`orderId,amount,reference\n${order.id},${order.codCollected+1000},PG-REF`},{db:f.db,auth:{user:creator}}));
  const proposal=await f.db.transaction(()=>adjustmentRoute('POST',{action:'propose',sessionId:session.id,rowIndex:0,amount:1000,evidence:'PG-EVIDENCE',note:'Confirmed external evidence for this discrepancy.',confirm:true},{db:f.db,auth:{user:creator}}));
  const decision=await f.db.transaction(()=>adjustmentRoute('POST',{action:'approve',id:proposal.id,note:'Independent review of external transaction evidence.',confirm:true},{db:f.db,auth:{user:approver}}));
  assert.equal(decision.status,'posted');const final=(await f.db.read()).state;assert.deepEqual(final.orders,state.orders);assert.equal(final.ledgerEntries.at(-1).amount,1000);
});

test('PostgreSQL stores pickup instructions and an idempotent external refund proof',async t=>{
  const f=await pgFixture(t),state=(await f.db.read()).state,order=state.orders[0],ops=state.users.find(u=>u.adminGroup==='operations'),finance=state.users.find(u=>u.adminGroup==='finance');
  order.status='preparing';const customer=state.customers.find(c=>c.id===order.customerId);customer.refundAccount={...state.customers.find(c=>c.refundAccount).refundAccount};
  state.refunds.push({id:'PG-MANUAL-REFUND',orderId:order.id,customerId:order.customerId,amount:1000,status:'refunding',source:'customer_cancel',reason:'Test bank evidence',destination:'bank_account',createdAt:new Date().toISOString()});await f.db.save(state);
  const result=await f.db.transaction(()=>savePickupPoint(order.id,{name:'Test pickup',address:'Test pickup address Hanoi',contactName:'Test operator',contactPhone:'0901234567',note:'Check packaging',reason:'Updated agreed pickup location.'},{db:f.db,auth:{user:ops,actor:actorOf(ops)}}));assert.equal(result.pickupPoint.name,'Test pickup');
  const body={amount:1000,accountNumber:customer.refundAccount.accountNumber,reference:'PG-EXTERNAL-BANK-REF',note:'Verified bank receipt and account details.',confirmed:true},auth={user:finance,actor:actorOf(finance)};
  const recorded=await f.db.transaction(()=>recordManualRefund('PG-MANUAL-REFUND',body,{db:f.db,auth}));assert.equal(recorded.refund.status,'refunded');
  assert.equal((await f.db.transaction(()=>recordManualRefund('PG-MANUAL-REFUND',body,{db:f.db,auth}))).duplicate,true);
  assert.equal((await f.db.read()).state.ledgerEntries.filter(e=>e.refId==='PG-MANUAL-REFUND').length,1);
});

test('PostgreSQL closes requested seller access and revokes its existing local session',async t=>{
  const f=await pgFixture(t),state=(await f.db.read()).state,seller=state.users.find(u=>u.role==='coop'&&!state.orders.some(o=>o.coopId===u.coopId)),ops=state.users.find(u=>u.adminGroup==='operations'),session=await issueSession(f.db,seller.id);
  await f.db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run('PG-CLOSE-REQUEST','account-deletion-request',seller.id,f.db.encodeJSON({status:'pending',reason:'Owner requested account closure.',createdAt:new Date().toISOString(),history:[]}),0);
  const response=await f.db.transaction(()=>deletionRequestsRoute('POST',{action:'close_access',id:'PG-CLOSE-REQUEST',note:'Verified owner request and checked all open obligations.',confirmed:true},{db:f.db,auth:{user:ops,actor:actorOf(ops)}}));assert.equal(response.ok,true);
  const after=(await f.db.read()).state;assert.ok(after.users.find(u=>u.id===seller.id).accessClosedAt);assert.equal(after.coops.find(c=>c.id===seller.coopId).status,'suspended');
  const blocked=await fetch(f.base+'/api/v1/me',{headers:{Authorization:'Bearer '+session.accessToken}});assert.equal(blocked.status,401);assert.deepEqual(after.ledgerEntries,state.ledgerEntries);
});
test('SQL adapter numbers placeholders and does not double-qualify a table',()=>{
  assert.equal(postgresSql('SELECT * FROM app_state WHERE id=?'),'SELECT * FROM app_private.app_state WHERE id=$1');
  assert.equal(postgresSql('SELECT app_private.rate_limits.count FROM rate_limits WHERE key=?'),'SELECT app_private.rate_limits.count FROM app_private.rate_limits WHERE key=$1');
  assert.equal(postgresSql("SELECT '?' FROM app_state WHERE id=?"),"SELECT '?' FROM app_private.app_state WHERE id=$1");
});

const identity={id:'abc-verified-supabase-user',email:'customer@example.com',email_confirmed_at:new Date().toISOString(),user_metadata:{name:'Khách Supabase',role:'admin',adminGroup:'root'}};
const jwt=()=>`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({sub:identity.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.verified-by-supabase-server`;
test('Supabase identity creates customer, ignores role claims, verifies every request and honors logout',async t=>{
  let checks=0;const supabase={auth:{getUser:async()=>{checks++;return {data:{user:identity},error:null};}}};
  const app=await createApplication({databasePath:':memory:',demo:false,supabase});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>app.server.close(r)));
  const base=`http://127.0.0.1:${app.server.address().port}`,token=jwt(),headers={'Content-Type':'application/json',Authorization:`Bearer ${token}`};
  const exchanged=await fetch(base+'/api/v1/auth/supabase',{method:'POST',headers,body:JSON.stringify({accessToken:token,role:'admin'})});assert.equal(exchanged.status,200);const data=await exchanged.json();assert.equal(data.user.role,'customer');assert.equal(data.user.supabaseId,identity.id);
  assert.equal((await fetch(base+'/api/v1/state',{headers})).status,200);assert(checks>=2);
  assert.equal((await fetch(base+'/api/v1/auth/logout',{method:'POST',headers,body:'{}'})).status,200);
  assert.equal((await fetch(base+'/api/v1/state',{headers})).status,401);
  assert.equal((await fetch(base+'/api/v1/auth/supabase',{method:'POST',headers,body:JSON.stringify({accessToken:token})})).status,401);
});
test('Supabase rejects unconfirmed identity and root comes only from server configuration',async t=>{
  let current={...identity,email_confirmed_at:null};
  const app=await createApplication({databasePath:':memory:',demo:false,supabaseAdminEmail:'customer@example.com',supabase:{auth:{getUser:async()=>({data:{user:current},error:null})}}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>app.server.close(r)));
  const url=`http://127.0.0.1:${app.server.address().port}/api/v1/auth/supabase`,options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:jwt()})};
  assert.equal((await fetch(url,options)).status,401);current=identity;const r=await fetch(url,options);assert.equal(r.status,200);assert.equal((await r.json()).user.adminGroup,'root');
});
test('private media only signs visible or owned references and upload checks file magic',async()=>{
  const own={id:'U-owner',role:'customer',customerId:'cust-1'};
  const reference='sb://app-images/U-other/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png';
  const {createSeedState}=await import('../../src/data/seed.ts');const state=createSeedState(new Date());
  assert.equal(canReadMedia(state,own,reference),false);assert.throws(()=>validateMediaReferences({photos:[reference]},state,own),/quyền/);
  let calls=0;const admin={storage:{from:()=>({upload:async()=>{calls++;return {error:null};},createSignedUrl:async()=>{calls++;return {data:{signedUrl:'https://storage.example/signed'},error:null};}})}};
  await assert.rejects(()=>uploadMedia(admin,own,'data:image/png;base64,aGVsbG8='),/định dạng/);assert.equal(calls,0);
  const data='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNk+M/AwMDAxMDAwMDAAAAZNAIBWxOnMQAAAABJRU5ErkJggg==';
  const uploaded=await uploadMedia(admin,own,data);assert(uploaded.reference.startsWith('sb://app-images/U-owner/'));
  assert.equal((await signMedia(admin,state,own,uploaded.reference)).expiresIn,300);
  await assert.rejects(()=>signMedia(admin,state,own,reference),/quyền/);
});
