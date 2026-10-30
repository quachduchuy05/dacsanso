import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApplication} from '../app.mjs';
import {issueSession} from '../security.mjs';
import {reportBounds} from '../report-filters.mjs';
import {issueBootstrapLink} from '../account-security.mjs';
import {Database} from '../database.mjs';
import {accountDeletionChecks} from '../deletion-requests.mjs';
import {opsSetAccountLocked} from '../../src/domain/account.ts';
import {qualitySetSellingRights} from '../../src/domain/coopProfile.ts';
import {actorOf} from '../../src/domain/auth.ts';
import {processExportQueue} from '../export-queue.mjs';
import {hashPassword} from '../passwords.mjs';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';

async function fixture(t,options={}) {
  const app=await createApplication({demo:true,databasePath:':memory:',...options});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>app.server.close(resolve)));
  const users=(await app.db.read()).state.users;
  const user=(role,group)=>users.find(u=>u.role===role&&(!group||u.adminGroup===group));
  async function request(path,{as,body,token,key,method=body===undefined?'GET':'POST'}={}) {
    const access=token??(as?(await issueSession(app.db,as.id)).accessToken:null);
    const response=await fetch(`http://127.0.0.1:${app.server.address().port}${path}`,{method,headers:{'Content-Type':'application/json',...(access?{Authorization:`Bearer ${access}`} :{}),...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,data:await response.json(),requestId:response.headers.get('X-Request-ID')};
  }
  return {...app,user,request};
}

test('report days use Vietnam midnight, validate actual dates and include seven calendar days',()=>{
  const now=new Date('2026-10-28T09:00:00Z');
  const day=reportBounds({from:'2026-10-28',to:'2026-10-28'},now);
  assert.equal(new Date(day.from).toISOString(),'2026-10-27T17:00:00.000Z');
  assert.equal(new Date(day.to).toISOString(),'2026-10-28T17:00:00.000Z');
  assert.equal(new Date(reportBounds({range:'7d'},now).from).toISOString(),'2026-10-21T17:00:00.000Z');
  for(const filters of [{from:'2026-02-30'},{from:'2026-10-29',to:'2026-10-28'},{from:'garbage'},{range:'bad'}])assert.throws(()=>reportBounds(filters,now));
});

test('password reset link is single use and revokes existing sessions',async t=>{
  const f=await fixture(t),customer=f.user('customer');
  const session=await issueSession(f.db,customer.id);
  const recovery=await f.request('/api/v1/auth/password/forgot',{body:{phone:customer.phone}});
  assert.equal(recovery.status,200);
  const token=new URL(recovery.data.setupLink).searchParams.get('setup');
  const body={token,password:'Reset@123'};
  assert.equal((await f.request('/api/v1/auth/password/reset',{body})).status,200);
  assert.equal((await f.request('/api/v1/me',{token:session.accessToken})).status,401);
  assert.equal((await f.request('/api/v1/auth/password/reset',{body})).status,400);
  assert.equal((await f.request('/api/v1/auth/password/login',{body:{phone:customer.phone,password:body.password}})).status,200);
});

test('password login locks an account after five failures and rejects weak passwords',async t=>{
  const f=await fixture(t),customer=f.user('customer');
  assert.equal((await f.request('/api/v1/auth/password/register',{body:{name:'Khách mới',phone:'0912345678',password:'aaaaaaaa'}})).status,400);
  for(let i=0;i<5;i++)assert.equal((await f.request('/api/v1/auth/password/login',{body:{phone:customer.phone,password:'Wrong@123'}})).status,401);
  assert.equal((await f.request('/api/v1/auth/password/login',{body:{phone:customer.phone,password:'Dacsan@123'}})).status,429);
});

test('product drafts preserve category and photos, enforce ownership and expire',async t=>{
  const f=await fixture(t),as=f.user('admin','quality'),other={...as,id:'other-quality',phone:'0911111122'};
  const initial=(await f.db.read()).state;initial.users.push(other);await f.db.save(initial);
  const images=['data:image/png;base64,aGVsbG8='];
  const created=await f.request('/api/v1/product-drafts',{as,body:{form:{name:'Bản nháp',catalogCategoryId:'category-1'},images}});
  assert.equal(created.status,200);
  const listing=await f.request('/api/v1/product-drafts',{as});
  assert.equal(listing.data.items[0].form.catalogCategoryId,'category-1');
  assert.deepEqual(listing.data.items[0].images,images);
  assert.equal((await f.request('/api/v1/product-drafts/'+created.data.id,{as:other,body:{form:{name:'Sửa trái phép'}}})).status,404);
  assert.equal((await f.request('/api/v1/product-drafts',{as:f.user('customer')})).status,403);
  await f.db.sql.prepare('UPDATE feature_records SET expires_at=? WHERE id=?').run(Date.now()-1,created.data.id);
  assert.equal((await f.request('/api/v1/product-drafts',{as})).data.items.length,0);
});

test('lot trace is public for the exact product and prevents foreign ownership and duplicate codes',async t=>{
  const f=await fixture(t),as=f.user('coop'),state=(await f.db.read()).state;
  const product=state.products.find(p=>p.coopId===as.coopId&&p.status==='active');
  const other=state.products.find(p=>p.coopId!==as.coopId);
  const body={productId:product.id,code:'LOT-001',harvestedOn:'2026-01-01',packedOn:'2026-01-02'};
  assert.equal((await f.request('/api/v1/lots',{as,body:{...body,productId:other.id}})).status,403);
  const created=await f.request('/api/v1/lots',{as,body});assert.equal(created.status,200);
  assert.equal((await f.request('/api/v1/lots',{as,body})).status,409);
  const trace=await f.request('/api/v1/lots/'+created.data.lot.id);
  assert.equal(trace.status,200);assert.equal(trace.data.product.id,product.id);assert.equal(trace.data.lot.code,body.code);
  assert(!JSON.stringify(trace.data).includes(as.phone));
});

test('review export applies status and date filters and rejects future dataAsOf',async t=>{
  const f=await fixture(t),as=f.user('admin','cskh'),state=(await f.db.read()).state;
  const product=state.products.find(p=>p.status==='active');
  state.reviews=[{id:'visible-review',productId:product.id,stars:5,status:'visible',createdAt:'2026-10-27T18:00:00Z'},{id:'hidden-review',productId:product.id,stars:1,status:'hidden',createdAt:'2026-10-27T18:00:00Z'},{id:'outside-review',productId:product.id,stars:5,status:'visible',createdAt:'2026-10-28T18:00:00Z'}];
  await f.db.save(state);
  const job=await f.request('/api/v1/exports',{as,body:{kind:'reviews',filters:{status:'visible',from:'2026-10-28',to:'2026-10-28'}}});
  assert.equal(job.status,201);
  const file=await f.request(`/api/v1/exports/${job.data.id}/download?as=json`,{as});
  assert(file.data.content.includes('visible-review'));assert(!file.data.content.includes('hidden-review'));assert(!file.data.content.includes('outside-review'));
  assert.equal((await f.request('/api/v1/exports',{as,body:{kind:'reviews',dataAsOf:'2099-01-01T00:00:00Z'}})).status,409);
  assert.equal((await f.request(`/api/v1/exports/${job.data.id}/download?as=json`,{as:f.user('admin','root')})).status,404);
});

test('reconciliation CSV is idempotent, detects differences and rolls back invalid batches',async t=>{
  const f=await fixture(t),as=f.user('admin','finance'),state=(await f.db.read()).state,order=state.orders[0];
  order.codCollected=100000;await f.db.save(state);
  const body={provider:'Partner',kind:'cod',csv:`orderId,amount,reference\n${order.id},100000,REF-001`};
  const created=await f.request('/api/v1/reconciliations',{as,body});assert.equal(created.status,200);assert.equal(created.data.rows[0].status,'matched');
  assert.equal((await f.request('/api/v1/reconciliations',{as,body})).data.duplicate,true);
  const difference=await f.request('/api/v1/reconciliations',{as,body:{...body,csv:`orderId,amount,reference\n${order.id},99999,REF-002`}});
  assert.equal(difference.data.rows[0].status,'difference');
  assert.equal((await f.request('/api/v1/reconciliations',{as:f.user('customer')})).status,403);
  const before=(await f.request('/api/v1/reconciliations',{as})).data.items.length;
  assert.equal((await f.request('/api/v1/reconciliations',{as,body:{...body,csv:`orderId,amount,reference\n${order.id},100000,REF-003\n${order.id},bad,REF-004`}})).status,400);
  assert.equal((await f.request('/api/v1/reconciliations',{as})).data.items.length,before);
});

test('catalog exports omit private contacts and XLSX downloads contain an OOXML workbook',async t=>{
  const f=await fixture(t),as=f.user('regulator');
  for(const kind of ['coops','products']){
    const job=await f.request('/api/v1/exports',{as,body:{kind,format:'xlsx'}});
    assert.equal(job.status,201);
    const download=await f.request(`/api/v1/exports/${job.data.id}/download?as=json`,{as});
    assert.equal(download.data.encoding,'base64');
    const buffer=Buffer.from(download.data.content,'base64');
    assert.equal(buffer.readUInt32LE(0),0x04034b50);
    const xml=buffer.toString();assert(xml.includes('xl/worksheets/sheet1.xml'));
    assert(!xml.includes('receiverPhone'));assert(!xml.includes('payoutAccount'));assert(!xml.includes('password_hash'));
  }
});

test('operations cannot take over root using password activation',async t=>{
  const f=await fixture(t),root=f.user('admin','root');
  assert.equal((await f.request('/api/v1/auth/password/activation',{as:f.user('admin','operations'),body:{userId:root.id}})).status,403);
  assert.equal((await f.request('/api/v1/auth/password/activation',{as:root,body:{userId:f.user('admin','quality').id}})).status,200);
});

test('bootstrap activation only issues a link before the root password is set',async t=>{
  const db=new Database(':memory:',{demo:false,adminPhone:'0912345678'});t.after(()=>db.close());
  const link=await issueBootstrapLink(db,{publicUrl:'https://example.com'});
  assert.equal(new URL(link.link).origin,'https://example.com');
  assert.equal(new URL(link.link).searchParams.get('setup').length,43);
  await db.sql.prepare('INSERT INTO password_credentials VALUES(?,?)').run('bootstrap-root','existing');
  await assert.rejects(()=>issueBootstrapLink(db,{publicUrl:'https://example.com'}),/đã có mật khẩu/);
});

test('export history is private, keeps filter snapshot and reports expiry immediately',async t=>{
  const f=await fixture(t),as=f.user('admin','operations'),filters={status:'active'};
  const created=await f.request('/api/v1/exports',{as,body:{kind:'products',filters}});
  assert.equal(created.status,201);assert(created.data.rowCount>0);
  const listing=await f.request('/api/v1/exports',{as});
  const job=listing.data.items.find(j=>j.id===created.data.id);
  assert.deepEqual(job.filters,filters);assert.equal(job.checksum,created.data.checksum);
  assert.equal(job.rowCount,created.data.rowCount);assert(!('content' in job));
  assert.equal((await f.request('/api/v1/exports',{as:f.user('admin','finance')})).data.items.length,0);
  assert.equal((await f.request('/api/v1/exports',{as:f.user('customer')})).status,403);
  await f.db.sql.prepare('UPDATE export_jobs SET expires_at=? WHERE id=?').run(Date.now()-1,job.id);
  assert.equal((await f.request('/api/v1/exports',{as})).data.items[0].status,'EXPIRED');
  assert.equal((await f.request(`/api/v1/exports/${job.id}/download?as=json`,{as})).status,410);
});

test('CSV and XLSX checksums match downloaded bytes and detect modified content',async t=>{
  const f=await fixture(t),as=f.user('admin','operations');
  for(const format of ['csv','xlsx']){
    const created=await f.request('/api/v1/exports',{as,body:{kind:'products',format}});
    const download=await f.request(`/api/v1/exports/${created.data.id}/download?as=json`,{as});
    const bytes=format==='xlsx'?Buffer.from(download.data.content,'base64'):Buffer.from(download.data.content);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),created.data.checksum);
    await f.db.sql.prepare('UPDATE export_jobs SET content=? WHERE id=?').run(format==='xlsx'?Buffer.from('modified').toString('base64'):'modified',created.data.id);
    assert.equal((await f.request(`/api/v1/exports/${created.data.id}/download?as=json`,{as})).status,409);
  }
});

test('reconciliation scope finds missing partner rows and records investigations without changing money',async t=>{
  const f=await fixture(t),as=f.user('admin','finance'),state=(await f.db.read()).state,order=state.orders[0];
  order.codCollected=100000;order.createdAt='2026-10-01T06:00:00Z';
  state.orders.push({...structuredClone(order),id:'missing-partner-order',codCollected:200000});await f.db.save(state);
  const body={provider:'Partner',kind:'cod',scope:{from:'2026-10-01',to:'2026-10-01'},csv:`orderId,amount,reference\n${order.id},100000,REF-SCOPE`};
  const created=await f.request('/api/v1/reconciliations',{as,body});assert.equal(created.status,200);
  const index=created.data.rows.findIndex(r=>r.orderId==='missing-partner-order');
  assert(index>=0);assert.equal(created.data.rows[index].status,'missing_partner');
  const note={reviewSessionId:created.data.id,rowIndex:index,status:'reviewed',note:'Đã yêu cầu đối tác bổ sung chứng từ.'};
  assert.equal((await f.request('/api/v1/reconciliations',{as:f.user('customer'),body:note})).status,403);
  assert.equal((await f.request('/api/v1/reconciliations',{as,body:note})).status,200);
  const session=(await f.request('/api/v1/reconciliations',{as})).data.items[0];
  assert.equal(session.reviews[0].note,note.note);assert.equal(session.rows[index].status,'missing_partner');
  const missing=(await f.db.read()).state.orders.find(o=>o.id==='missing-partner-order');assert.equal(missing.codCollected,200000);assert(!missing.reconciledCod);
  assert.equal((await f.request('/api/v1/reconciliations',{as,body:{...body,scope:{from:'2026-10-02',to:'2026-10-02'}}})).status,400);
});

test('product edit leases prevent competing tabs, check commands and expire safely',async t=>{
  const f=await fixture(t),as=f.user('admin','quality'),state=(await f.db.read()).state,product=state.products.find(p=>p.status==='active');
  const path=`/api/v1/products/${product.id}/edit-lock`;
  assert.equal((await f.request(path,{as:f.user('customer'),body:{}})).status,403);
  const first=await f.request(path,{as,body:{}});assert.equal(first.status,200);
  assert.equal((await f.request(path,{as,body:{}})).status,409);
  assert.equal((await f.request(path,{as,body:{token:first.data.token}})).data.token,first.data.token);
  const content={name:product.name,description:'Mô tả sản phẩm hợp lệ để gửi duyệt.',unit:product.unit,region:product.region,category:product.category,harvestMonths:[2,3]};
  const edit='/api/v1/catalog/products/'+product.id;
  assert.equal((await f.request(edit,{as,body:{action:'content',input:content}})).status,409);
  const saved=await f.request(edit,{as,body:{action:'content',input:content,editToken:first.data.token}});assert.equal(saved.status,200,JSON.stringify(saved.data));
  await f.db.sql.prepare("UPDATE feature_records SET expires_at=? WHERE kind='product-edit-lock'").run(Date.now()-1);
  const next=await f.request(path,{as,body:{}});assert.equal(next.status,200);assert.notEqual(next.data.token,first.data.token);
  assert.equal((await f.request(path,{as,method:'DELETE',body:{token:first.data.token}})).status,409);
  assert.equal((await f.request(path,{as,method:'DELETE',body:{token:next.data.token}})).status,200);
});

test('audit outcome and correlation filters match the HTTP request and exported file',async t=>{
  const f=await fixture(t),root=f.user('admin','root');
  const denied=await f.request('/api/v1/audit',{as:f.user('customer')});assert.equal(denied.status,403);
  assert(denied.requestId);
  const query=new URLSearchParams({outcome:'failure',correlationId:denied.requestId});
  const audit=await f.request('/api/v1/audit?'+query,{as:root});assert.equal(audit.status,200);
  assert.equal(audit.data.items.length,1);assert.equal(audit.data.items[0].action,'access-denied');
  assert.equal(audit.data.items[0].correlation_id,denied.requestId);
  assert.equal((await f.request('/api/v1/audit?outcome=success&correlationId='+denied.requestId,{as:root})).data.items.length,0);
  const job=await f.request('/api/v1/exports',{as:root,body:{kind:'audit',filters:{outcome:'failure',correlationId:denied.requestId}}});
  assert.equal(job.status,201);const file=await f.request(`/api/v1/exports/${job.data.id}/download?as=json`,{as:root});
  assert(file.data.content.includes(denied.requestId));assert(file.data.content.includes('access-denied'));
  assert.equal((await f.request('/api/v1/audit?outcome=invalid',{as:root})).status,400);
});

test('dashboard exports use the same data snapshot after later state changes and enforce expiry/ownership',async t=>{
  const f=await fixture(t),root=f.user('admin','operations');
  const preview=await f.request('/api/v1/reports/dashboard?range=all',{as:root});assert.equal(preview.status,200);
  assert(preview.data.snapshotId);assert(!JSON.stringify(preview.data).includes('receiverPhone'));
  const input={kind:'summary',snapshotId:preview.data.snapshotId,filters:{range:'all'}};
  const first=await f.request('/api/v1/exports',{as:root,body:input});assert.equal(first.status,201);
  const before=await f.request(`/api/v1/exports/${first.data.id}/download?as=json`,{as:root});
  const state=(await f.db.read()).state;state.orders=[];await f.db.save(state);
  const second=await f.request('/api/v1/exports',{as:root,body:input});assert.equal(second.status,201);
  assert.equal(second.data.version,preview.data.version);assert.equal(second.data.dataAsOf,preview.data.dataAsOf);
  const after=await f.request(`/api/v1/exports/${second.data.id}/download?as=json`,{as:root});assert.equal(after.data.content,before.data.content);
  assert.equal((await f.request('/api/v1/exports',{as:f.user('regulator'),body:input})).status,410);
  await f.db.sql.prepare('UPDATE feature_records SET expires_at=? WHERE id=?').run(Date.now()-1,preview.data.snapshotId);
  assert.equal((await f.request('/api/v1/exports',{as:root,body:input})).status,410);
});

test('production SMS adapter sends a generated OTP privately and provider failure removes the challenge',async t=>{
  let payload,authorization,fail=false;
  const provider=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;payload=JSON.parse(raw);authorization=req.headers.authorization;res.writeHead(fail?503:200);res.end('{}');});
  await new Promise(resolve=>provider.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>provider.close(resolve)));
  const f=await fixture(t,{demo:false,smsUrl:`http://127.0.0.1:${provider.address().port}/sms`,smsToken:'test-provider-token'});
  const sent=await f.request('/api/v1/auth/otp',{body:{phone:'0912345678',purpose:'register'}});assert.equal(sent.status,200);
  assert.equal(authorization,'Bearer test-provider-token');assert.equal(payload.phone,'0912345678');assert.match(payload.code,/^\d{6}$/);
  assert(!JSON.stringify(sent.data).includes(payload.code));assert.equal(sent.data.demo,false);
  const registered=await f.request('/api/v1/auth/register',{body:{challengeId:sent.data.challengeId,otp:payload.code,name:'Khách SMS thử nghiệm'}});assert.equal(registered.status,200);
  fail=true;assert.equal((await f.request('/api/v1/auth/otp',{body:{phone:'0912345679',purpose:'register'}})).status,502);
  assert.equal((await f.db.sql.prepare('SELECT COUNT(*) AS count FROM otp_challenges').get()).count,0);
});

test('unified SRS: only Quality publishes products and content cannot inject price, ownership or stock',async t=>{
  const f=await fixture(t),quality=f.user('admin','quality'),state=(await f.db.read()).state,coop=state.coops.find(c=>c.status==='active'&&c.profileStatus==='approved');
  const input={name:'Sản phẩm theo SRS mới',description:'Mô tả sản phẩm theo SRS hợp nhất, có thông tin nguồn gốc.',unit:'gói 100 g',category:'dry',region:coop.region,kind:'ready',price:80000,stockOnHand:10,images:['data:image/png;base64,aGVsbG8='],traceUrl:'https://trace.example.com/lot-1'};
  for(const as of [f.user('coop'),f.user('admin','root'),f.user('admin','finance')])assert.equal((await f.request('/api/v1/catalog/products',{as,body:{coopId:coop.id,input}})).status,403);
  const created=await f.request('/api/v1/catalog/products',{as:quality,body:{coopId:coop.id,input}});assert.equal(created.status,200,JSON.stringify(created.data));
  const product=created.data.product;assert.equal(product.status,'active');
  const path='/api/v1/catalog/products/'+product.id;
  const lease=await f.request(`/api/v1/products/${product.id}/edit-lock`,{as:quality,body:{}});
  const edited=await f.request(path,{as:quality,body:{action:'content',editToken:lease.data.token,input:{...input,price:1,stockOnHand:-100,coopId:'foreign',status:'rejected'}}});assert.equal(edited.status,200,JSON.stringify(edited.data));
  assert.equal(edited.data.product.price,80000);assert.equal(edited.data.product.stockOnHand,10);assert.equal(edited.data.product.coopId,coop.id);assert.equal(edited.data.product.status,'active');
  const changed=await f.request(path,{as:quality,body:{action:'price',price:90000}});assert.equal(changed.status,200);
  const logs=await f.db.sql.prepare("SELECT detail FROM audit_events WHERE action='catalog-price' AND target=?").all(product.id);assert(JSON.stringify(logs).includes('80000'));assert(JSON.stringify(logs).includes('90000'));
  assert.equal((await f.request(path,{as:quality,body:{action:'visibility',hidden:true}})).data.product.status,'hidden');
});

test('unified SRS: Root creates admins, operations cannot create admins and Root cannot do business',async t=>{
  const f=await fixture(t),root=f.user('admin','root'),ops=f.user('admin','operations');
  const command={name:'opsCreateAccount',args:[null,{name:'Nhân viên Chất lượng mới',phone:'0919999888',role:'admin',adminGroup:'quality'},null]};
  assert.equal((await f.request('/api/v1/commands',{as:ops,key:crypto.randomUUID(),body:{commands:[command]}})).status,403);
  const created=await f.request('/api/v1/commands',{as:root,key:crypto.randomUUID(),body:{commands:[command]}});assert.equal(created.status,200,JSON.stringify(created.data));
  assert.equal((await f.db.read()).state.users.find(u=>u.phone==='0919999888').adminGroup,'quality');
  assert.equal((await f.request('/api/v1/reconciliations',{as:root,body:{}})).status,403);
  assert.equal((await f.request('/api/v1/exports',{as:root,body:{kind:'summary'}})).status,403);
  assert.equal((await f.request('/api/v1/exports',{as:root,body:{kind:'audit'}})).status,201);
});

test('unified SRS: OTP expires in 120 seconds, three active local sessions, and expired QLNN is refused',async t=>{
  const f=await fixture(t),customer=f.user('customer');
  const otp=await f.request('/api/v1/auth/otp',{body:{phone:'0912345678',purpose:'register'}});assert.equal(otp.data.expiresIn,120);
  const challenge=await f.db.sql.prepare('SELECT created_at,expires_at FROM otp_challenges WHERE id=?').get(otp.data.challengeId);assert.equal(challenge.expires_at-challenge.created_at,120000);
  const sessions=[];for(let i=0;i<4;i++)sessions.push(await issueSession(f.db,customer.id));
  const remaining=await f.db.sql.prepare('SELECT COUNT(*) AS count FROM sessions WHERE user_id=?').get(customer.id);assert.equal(remaining.count,3);
  assert.equal((await f.request('/api/v1/me',{token:sessions[3].accessToken})).status,200);
  const gov=f.user('regulator'),session=await issueSession(f.db,gov.id),state=(await f.db.read()).state;state.users.find(u=>u.id===gov.id).expiresAt='2020-01-01T00:00:00Z';await f.db.save(state);
  assert.equal((await f.request('/api/v1/me',{token:session.accessToken})).status,401);
});

test('unified SRS: HTX exports only its own anonymous data and CSKH never gets refund bank accounts',async t=>{
  const f=await fixture(t),as=f.user('coop'),other=(await f.db.read()).state.coops.find(c=>c.id!==as.coopId);
  assert.equal((await f.request('/api/v1/exports',{as,body:{kind:'orders',filters:{coopId:other.id}}})).status,403);
  const job=await f.request('/api/v1/exports',{as,body:{kind:'orders'}});assert.equal(job.status,201,JSON.stringify(job.data));
  assert.equal(job.data.filters.coopId,as.coopId);
  const file=await f.request(`/api/v1/exports/${job.data.id}/download?as=json`,{as});assert.equal(file.status,200);assert(!file.data.content.includes('receiverPhone'));assert(!file.data.content.includes('receiverName'));
  const cskh=await f.request('/api/v1/state',{as:f.user('admin','cskh')});assert(cskh.data.state.customers.every(c=>!c.refundAccount));
});

test('unified SRS: manual external payout requires evidence and cannot post twice',async t=>{
  const f=await fixture(t),as=f.user('admin','finance'),state=(await f.db.read()).state;
  state.payoutPeriods.push({id:'PERIOD-MANUAL',coopId:state.coops[0].id,start:'2026-10-01T00:00:00Z',end:'2026-10-08T00:00:00Z',status:'closed',lines:[],retained:100000,commission:5000,payout:95000,closedAt:'2026-10-08T00:00:00Z',closedBy:'Tài chính'});await f.db.save(state);
  const path='/api/v1/payouts/PERIOD-MANUAL/record',body={amount:95000,reference:'BANK-TRANSFER-001',note:'Đã đối chiếu chứng từ chuyển khoản ngoài hệ thống.',confirmed:true};
  assert.equal((await f.request(path,{as:f.user('admin','root'),body})).status,403);
  assert.equal((await f.request(path,{as,body:{...body,amount:1}})).status,400);
  const before=(await f.db.read()).state.ledgerEntries.length;
  const paid=await f.request(path,{as,body});assert.equal(paid.status,200,JSON.stringify(paid.data));assert.equal(paid.data.period.paidRef,body.reference);
  assert.equal((await f.request(path,{as,body})).data.duplicate,true);assert.equal((await f.db.read()).state.ledgerEntries.length,before+2);
});

test('unified SRS: only operations edits homepage and dictionaries, public content is projected',async t=>{
  const f=await fixture(t),ops=f.user('admin','operations'),state=(await f.db.read()).state,product=state.products.find(p=>p.status==='active');
  const body={title:'Đặc sản Lào Cai',subtitle:'Từ HTX đến Hà Nội',description:'Sản phẩm theo mùa được Admin chọn.',collectionTitle:'Mùa thu',featuredProductIds:[product.id],image:''};
  assert.equal((await f.request('/api/v1/homepage',{as:f.user('admin','root'),body})).status,403);
  assert.equal((await f.request('/api/v1/homepage',{as:ops,body})).status,200);
  const publicState=await f.request('/api/v1/state');assert.equal(publicState.data.state.homepage.title,body.title);
  const item=await f.request('/api/v1/catalog-dictionaries',{as:ops,body:{kind:'unit',name:product.unit,active:true}});assert.equal(item.status,200);
  assert.equal((await f.request('/api/v1/catalog-dictionaries',{as:ops,body:{...item.data.item,active:false}})).status,409);
  assert.equal((await f.request('/api/v1/homepage',{as:ops,body:{...body,image:'javascript:alert(1)'}})).status,400);
});

test('unified SRS: phone change verifies password and new number OTP, then revokes old local sessions',async t=>{
  const f=await fixture(t),credentials={name:'Khách đổi số',phone:'0987777666',password:'Phonechange@123'};
  const challenge=await f.request('/api/v1/auth/otp',{body:{phone:credentials.phone,purpose:'register'}});
  const registration=await f.request('/api/v1/auth/password/register',{body:{...credentials,challengeId:challenge.data.challengeId,otp:'123456'}});assert.equal(registration.status,200);
  const as=registration.data.user;
  assert.equal((await f.request('/api/v1/me/phone/start',{as,body:{phone:'0987777667',currentPassword:'Wrong@123'}})).status,401);
  const started=await f.request('/api/v1/me/phone/start',{as,body:{phone:'0987777667',currentPassword:credentials.password}});assert.equal(started.status,200);assert.equal(started.data.expiresIn,120);
  const token=await issueSession(f.db,as.id);
  const confirmed=await f.request('/api/v1/me/phone/confirm',{token:token.accessToken,body:{challengeId:started.data.challengeId,otp:'123456',currentPassword:credentials.password}});assert.equal(confirmed.status,200);
  assert.equal((await f.request('/api/v1/me',{token:token.accessToken})).status,401);
  const logged=await f.request('/api/v1/auth/password/login',{body:{phone:'0987777667',password:credentials.password}});assert.equal(logged.status,200);
  assert.equal((await f.db.read()).state.customers.find(c=>c.id===as.customerId).phone,'0987777667');
});

test('unified SRS: financial records cannot be edited or removed, adjustments append new rows',async t=>{
  const f=await fixture(t),state=(await f.db.read()).state;
  state.ledgerEntries.push({id:'IMMUTABLE-ENTRY',type:'commission',amount:1000,at:new Date().toISOString()});await f.db.save(state);
  const changed=structuredClone(state);changed.ledgerEntries.find(e=>e.id==='IMMUTABLE-ENTRY').amount=2000;
  await assert.rejects(async()=>f.db.save(changed),/Không sửa hoặc xóa dòng sổ/);
  const removed=structuredClone(state);removed.ledgerEntries=removed.ledgerEntries.filter(e=>e.id!=='IMMUTABLE-ENTRY');await assert.rejects(async()=>f.db.save(removed),/Không sửa hoặc xóa dòng sổ/);
  state.ledgerEntries.push({id:'ADJUSTMENT-ENTRY',type:'commission',amount:-1000,at:new Date().toISOString()});await f.db.save(state);
  assert.equal((await f.db.read()).state.ledgerEntries.find(e=>e.id==='IMMUTABLE-ENTRY').amount,1000);
});

test('unified SRS: customer can reset password with a single-use purpose-bound OTP',async t=>{
  const f=await fixture(t),customer=f.user('customer'),session=await issueSession(f.db,customer.id);
  const sent=await f.request('/api/v1/auth/password/forgot-otp',{body:{phone:customer.phone}});assert.equal(sent.status,200);assert.equal(sent.data.expiresIn,120);
  const body={challengeId:sent.data.challengeId,otp:'123456',password:'Otpreset@123'};
  const reset=await f.request('/api/v1/auth/password/reset-otp',{body});assert.equal(reset.status,200,JSON.stringify(reset.data));
  assert.equal((await f.request('/api/v1/me',{token:session.accessToken})).status,401);
  assert.equal((await f.request('/api/v1/auth/password/reset-otp',{body})).status,401);
  assert.equal((await f.request('/api/v1/auth/password/login',{body:{phone:customer.phone,password:body.password}})).status,200);
});

test('SRS coop review requires a delivered owned order, cannot repeat, and public data stays anonymous',async t=>{
  const f=await fixture(t),customer=f.user('customer'),initial=(await f.db.read()).state,order=initial.orders[0];
  order.customerId=customer.customerId;order.status='delivered';order.deliveredAt=new Date().toISOString();await f.db.save(initial);
  const endpoint='/api/v1/coop-reviews',body={action:'submit',orderId:order.id,stars:2,comment:'Đóng gói chưa tốt, mong hợp tác xã cải thiện.'};
  const foreign=initial.users.find(u=>u.role==='customer'&&u.customerId!==customer.customerId);
  assert.equal((await f.request(endpoint,{as:foreign,body})).status,403);
  assert.equal((await f.request(endpoint,{as:customer,body:{...body,comment:'Ngắn'}})).status,400);
  const created=await f.request(endpoint,{as:customer,body});assert.equal(created.status,200);
  assert.equal((await f.request(endpoint,{as:customer,body})).status,409);
  const publicData=await f.request(endpoint+'?coopId='+order.coopId),item=publicData.data.items[0];
  assert.equal(item.verifiedPurchase,true);assert.equal(item.orderId,undefined);assert.equal(item.customerId,undefined);assert.equal(publicData.data.rating.average,2);
  const seller=initial.users.find(u=>u.role==='coop'&&u.coopId===order.coopId),other=initial.users.find(u=>u.role==='coop'&&u.coopId!==order.coopId);
  assert.equal((await f.request(endpoint,{as:other,body:{action:'reply',id:item.id,reply:'Cảm ơn góp ý'}})).status,403);
  assert.equal((await f.request(endpoint,{as:seller,body:{action:'reply',id:item.id,reply:'Cảm ơn góp ý'}})).status,200);
  assert.equal((await f.request(endpoint,{as:seller,body:{action:'reply',id:item.id,reply:'Sửa phản hồi'}})).status,409);
  const cskh=f.user('admin','cskh');
  assert.equal((await f.request(endpoint,{as:cskh,body:{action:'moderate',id:item.id,status:'hidden',reason:'Sao thấp'}})).status,400);
  assert.equal((await f.request(endpoint,{as:cskh,body:{action:'moderate',id:item.id,status:'hidden',reason:'Chứa thông tin cá nhân (SĐT, địa chỉ…)'}})).status,200);
  const hidden=await f.request(endpoint+'?coopId='+order.coopId);assert.equal(hidden.data.items.length,0);assert.equal(hidden.data.rating.average,null);
  assert.equal((await f.request(endpoint,{as:f.user('admin','root'),body:{action:'moderate',id:item.id,status:'visible'}})).status,403);
});

test('SRS coop moderation policy and review window apply separately from product reviews',async t=>{
  const f=await fixture(t),customer=f.user('customer'),state=(await f.db.read()).state,order=state.orders[0];
  order.customerId=customer.customerId;order.status='delivered';order.deliveredAt=new Date(Date.now()-31*86400000).toISOString();state.reviewPolicy={windowDays:30,requireModeration:true};await f.db.save(state);
  const body={action:'submit',orderId:order.id,stars:5,comment:'Hài lòng với HTX'};
  assert.equal((await f.request('/api/v1/coop-reviews',{as:customer,body})).status,422);
  order.deliveredAt=new Date().toISOString();await f.db.save(state);
  const created=await f.request('/api/v1/coop-reviews',{as:customer,body});assert.equal(created.data.status,'pending');
  assert.equal((await f.request('/api/v1/coop-reviews')).data.items.length,0);
  assert.equal((await f.request('/api/v1/coop-reviews',{as:customer})).data.items.length,1);
  assert.equal((await f.request('/api/v1/coop-reviews',{as:f.user('admin','cskh'),body:{action:'moderate',id:created.data.id,status:'visible'}})).status,200);
  assert.equal((await f.request('/api/v1/coop-reviews')).data.items.length,1);
  assert.deepEqual((await f.db.read()).state.reviews,state.reviews);
});

test('SRS deletion requests verify identity, isolate owners, and preserve orders and financial records',async t=>{
  const f=await fixture(t),customer=f.user('customer'),ops=f.user('admin','operations'),before=(await f.db.read()).state;
  await f.db.sql.prepare('INSERT INTO password_credentials VALUES(?,?)').run(customer.id,await hashPassword('Delete@123'));
  const path='/api/v1/account-deletion-requests',body={action:'submit',currentPassword:'Delete@123',reason:'Tôi không còn nhu cầu sử dụng tài khoản.',confirm:true};
  assert.equal((await f.request(path,{as:customer,body:{...body,currentPassword:'Wrong@123'}})).status,401);
  const submitted=await f.request(path,{as:customer,body});assert.equal(submitted.status,200);
  assert.equal((await f.request(path,{as:customer,body})).data.duplicate,true);
  const other=before.users.find(u=>u.role==='customer'&&u.id!==customer.id);
  assert.equal((await f.request(path,{as:other})).data.items.length,0);
  assert.equal((await f.request(path,{as:other,body:{action:'withdraw',id:submitted.data.id,note:'Tôi muốn rút yêu cầu này.'}})).status,404);
  assert.equal((await f.request(path,{as:f.user('admin','cskh')})).status,403);
  assert.equal((await f.request(path,{as:ops,body:{action:'review',id:submitted.data.id,status:'deleted',note:'Xóa ngay tài khoản này.'}})).status,400);
  assert.equal((await f.request(path,{as:ops,body:{action:'review',id:submitted.data.id,status:'retention_review',note:'Chờ xác nhận chính sách lưu trữ dữ liệu.'}})).status,200);
  assert.equal((await f.request(path,{as:customer})).data.items[0].history.length,1);
  assert.equal((await f.request(path,{as:customer,body:{action:'withdraw',id:submitted.data.id,note:'Tôi muốn tiếp tục sử dụng tài khoản.'}})).status,200);
  const after=(await f.db.read()).state;for(const key of ['orders','ledgerEntries','payoutPeriods','users'])assert.deepEqual(after[key],before[key]);
});

test('SRS queued exports keep frozen data, validate owner and preserve checksums across download',async t=>{
  const f=await fixture(t),finance=f.user('admin','finance');
  const queued=await f.request('/api/v1/exports',{as:finance,body:{kind:'orders',format:'xlsx',background:true}});assert.equal(queued.status,202);assert.equal(queued.data.status,'QUEUED');
  const original=(await f.db.read()).state,expected=original.orders.length;
  original.orders.push({...original.orders[0],id:'ORDER-AFTER-QUEUE'});await f.db.save(original);
  assert.equal((await processExportQueue(f.db)).status,'SUCCEEDED');
  const history=(await f.request('/api/v1/exports',{as:finance})).data.items[0];assert.equal(history.status,'SUCCEEDED');assert.equal(history.rowCount,expected);assert.ok(history.checksum);
  const download=await f.request('/api/v1/exports/'+queued.data.id+'/download?as=json',{as:finance});assert.equal(download.status,200);assert.equal(download.data.checksum,history.checksum);
  assert.equal((await f.request('/api/v1/exports/'+queued.data.id+'/download?as=json',{as:f.user('admin','operations')})).status,404);
});

test('SRS queued export failure can retry only by owner with current permission and original seller scope',async t=>{
  const f=await fixture(t),finance=f.user('admin','finance'),request={kind:'orders',background:true};
  const queued=await f.request('/api/v1/exports',{as:finance,body:request}),state=(await f.db.read()).state;
  state.users.find(u=>u.id===finance.id).adminGroup='quality';await f.db.save(state);
  assert.equal((await processExportQueue(f.db)).status,'FAILED');
  const record=await f.db.sql.prepare('SELECT status FROM export_jobs WHERE id=?').get(queued.data.id);assert.equal(record.status,'FAILED');
  assert.equal((await f.request('/api/v1/exports/'+queued.data.id+'/retry',{as:finance,body:{}})).status,403);
  state.users.find(u=>u.id===finance.id).adminGroup='finance';await f.db.save(state);
  assert.equal((await f.request('/api/v1/exports/'+queued.data.id+'/retry',{as:f.user('admin','operations'),body:{}})).status,404);
  assert.equal((await f.request('/api/v1/exports/'+queued.data.id+'/retry',{as:finance,body:{}})).status,202);
  assert.equal((await processExportQueue(f.db)).status,'SUCCEEDED');
  const seller=f.user('coop'),other=state.coops.find(c=>c.id!==seller.coopId);
  assert.equal((await f.request('/api/v1/exports',{as:seller,body:{...request,filters:{coopId:other.id}}})).status,403);
  const sellerJob=await f.request('/api/v1/exports',{as:seller,body:request});assert.equal(sellerJob.status,202);
  state.users.find(u=>u.id===seller.id).coopId=other.id;await f.db.save(state);
  assert.equal((await processExportQueue(f.db)).status,'FAILED');
});

test('SRS password signup requires purpose-bound OTP for exactly the submitted phone',async t=>{
  const f=await fixture(t),credentials={phone:'0985550101',name:'Khách xác minh',password:'Signup@123'};
  assert.equal((await f.request('/api/v1/auth/password/register',{body:credentials})).status,401);
  const login=await f.request('/api/v1/auth/otp',{body:{phone:credentials.phone,purpose:'login'}});
  assert.equal((await f.request('/api/v1/auth/password/register',{body:{...credentials,challengeId:login.data.challengeId,otp:'123456'}})).status,401);
  const sent=await f.request('/api/v1/auth/otp',{body:{phone:'0985550102',purpose:'register'}});
  const payload={...credentials,challengeId:sent.data.challengeId,otp:'123456'};
  assert.equal((await f.request('/api/v1/auth/password/register',{body:payload})).status,403);
  assert.equal((await f.request('/api/v1/auth/password/register',{body:payload})).status,401);
  assert.equal((await f.db.read()).state.users.some(u=>u.phone===credentials.phone),false);
});

test('SRS reconciliation adjustments need independent finance approval and append once without rewriting money',async t=>{
  const f=await fixture(t),creator=f.user('admin','finance'),initial=(await f.db.read()).state;
  const approver={...creator,id:'finance-independent',phone:'0995550123'};initial.users.push(approver);await f.db.save(initial);
  const order=initial.orders[0],amount=order.codCollected+15000;
  const imported=await f.request('/api/v1/reconciliations',{as:creator,body:{provider:'BANK-TEST',kind:'cod',csv:`orderId,amount,reference\n${order.id},${amount},BANK-REF-01`}});assert.equal(imported.status,200);
  const path='/api/v1/reconciliation-adjustments',body={action:'propose',sessionId:imported.data.id,rowIndex:0,amount:15000,evidence:'BANK-EVIDENCE-01',note:'Chung tu ngan hang da duoc kiem tra day du.',confirm:true};
  assert.equal((await f.request(path,{as:f.user('admin','operations'),body})).status,403);
  assert.equal((await f.request(path,{as:creator,body:{...body,amount:16000}})).status,400);
  const proposal=await f.request(path,{as:creator,body});assert.equal(proposal.status,200);
  assert.equal((await f.request(path,{as:creator,body})).data.duplicate,true);
  const decision={action:'approve',id:proposal.data.id,note:'Da xac minh chung tu doc lap va so tien chenh lech.',confirm:true};
  assert.equal((await f.request(path,{as:creator,body:decision})).status,403);
  assert.equal((await f.request(path,{as:approver,body:decision})).data.status,'posted');
  assert.equal((await f.request(path,{as:approver,body:decision})).data.duplicate,true);
  const final=(await f.db.read()).state;assert.deepEqual(final.orders,initial.orders);assert.deepEqual(final.payoutPeriods,initial.payoutPeriods);assert.equal(final.ledgerEntries.length,initial.ledgerEntries.length+1);
  const entry=final.ledgerEntries.at(-1);assert.equal(entry.type,'reconciliation_adjustment');assert.equal(entry.amount,15000);assert.equal(entry.refId,'reconcile-adjustment:'+proposal.data.id);assert.equal(JSON.parse(entry.note).approvedBy,approver.id);
  const exportFile=await f.request('/api/v1/exports',{as:creator,body:{kind:'ledger'}});assert.equal(exportFile.status,201);
  const download=await f.request('/api/v1/exports/'+exportFile.data.id+'/download?as=json',{as:creator});assert.ok(download.data.content.includes('reconciliation_adjustment'));
});

test('SRS refund adjustment sign follows cash direction and withdrawn proposals cannot post',async t=>{
  const f=await fixture(t),as=f.user('admin','finance'),state=(await f.db.read()).state,order=state.orders[0];
  const expected=state.refunds.filter(r=>r.orderId===order.id&&r.status==='refunded').reduce((sum,r)=>sum+r.amount,0);
  const session=await f.request('/api/v1/reconciliations',{as,body:{provider:'REFUND-TEST',kind:'refund',csv:`orderId,amount,reference\n${order.id},${expected+2500},REFUND-REF`}});
  const path='/api/v1/reconciliation-adjustments',body={action:'propose',sessionId:session.data.id,rowIndex:0,amount:-2500,evidence:'REFUND-EVIDENCE',note:'Kiem tra chung tu hoan tien co chenh lech.',confirm:true};
  assert.equal((await f.request(path,{as,body:{...body,amount:2500}})).status,400);
  const proposed=await f.request(path,{as,body});assert.equal(proposed.status,200);
  const cancel=await f.request(path,{as,body:{action:'cancel',id:proposed.data.id,note:'Rut de xac minh lai chung tu hoan tien.'}});assert.equal(cancel.data.status,'cancelled');
  assert.equal((await f.request(path,{as,body:{action:'approve',id:proposed.data.id,note:'Kiem tra doc lap lai chung tu hoan tien.',confirm:true}})).status,409);
  assert.equal((await f.db.read()).state.ledgerEntries.length,state.ledgerEntries.length);
});

test('SRS pickup points are operations-only, scoped to seller/assigned shipper and frozen after pickup',async t=>{
  const f=await fixture(t),state=(await f.db.read()).state,order=state.orders[0],ops=f.user('admin','operations'),shipper=f.user('shipper');
  order.status='preparing';order.shipment={shipperId:shipper.id,shipperName:shipper.name,assignedAt:new Date().toISOString(),assignedBy:ops.name};await f.db.save(state);
  const path='/api/v1/orders/'+order.id+'/pickup-point',body={name:'Điểm nhận kiểm thử',address:'Địa chỉ điểm trung chuyển thử nghiệm Hà Nội',contactName:'Nhân viên bàn giao mẫu',contactPhone:'0901234567',note:'Kiểm đếm và kiểm tra bao gói trước khi nhận.',reason:'Cập nhật điểm nhận theo lịch bàn giao đã thống nhất.'};
  assert.equal((await f.request(path,{as:f.user('admin','root'),body})).status,403);
  assert.equal((await f.request(path,{as:shipper,body})).status,403);
  assert.equal((await f.request(path,{as:ops,body:{...body,contactPhone:'bad'}})).status,400);
  assert.equal((await f.request(path,{as:ops,body})).status,200);
  const assigned=(await f.request('/api/v1/state',{as:shipper})).data.state;assert.equal(assigned.orders.find(o=>o.id===order.id).pickupPoint.contactPhone,body.contactPhone);assert.ok(assigned.notifications.some(n=>n.title==='Cập nhật điểm bàn giao'));
  const seller=state.users.find(u=>u.role==='coop'&&u.coopId===order.coopId);assert.ok((await f.request('/api/v1/state',{as:seller})).data.state.orders.find(o=>o.id===order.id).pickupPoint);
  const customer=state.users.find(u=>u.customerId===order.customerId),customerState=(await f.request('/api/v1/state',{as:customer})).data.state;assert.equal(customerState.orders.find(o=>o.id===order.id).pickupPoint,undefined);
  const other=state.users.find(u=>u.role==='shipper'&&u.id!==shipper.id);assert.equal((await f.request('/api/v1/state',{as:other})).data.state.orders.some(o=>o.id===order.id),false);
  const latest=(await f.db.read()).state;latest.orders.find(o=>o.id===order.id).shipment.pickedUpAt=new Date().toISOString();await f.db.save(latest);
  assert.equal((await f.request(path,{as:ops,body})).status,409);
});

test('SRS manual bank refund works without demo bypass, records once, requires exact amount and account',async t=>{
  const db=new Database(':memory:',{demo:true}),f=await fixture(t,{db,demo:false});t.after(()=>db.close());
  const state=(await db.read()).state,order=state.orders[0],finance=f.user('admin','finance'),customer=state.customers.find(c=>c.id===order.customerId);
  customer.refundAccount={...state.customers.find(c=>c.refundAccount).refundAccount};
  const refund={id:'MANUAL-REFUND-TEST',orderId:order.id,customerId:order.customerId,amount:12000,status:'refunding',source:'customer_cancel',reason:'Khoản hoàn đã được duyệt kiểm thử',destination:'bank_account',createdAt:new Date().toISOString()};state.refunds.push(refund);await db.save(state);
  const path='/api/v1/refunds/'+refund.id+'/record',body={amount:refund.amount,accountNumber:customer.refundAccount.accountNumber,reference:'BANK-TRANSFER-TEST-01',note:'Đã đối chiếu chứng từ chuyển khoản và người nhận hoàn tiền.',confirmed:true};
  assert.equal((await f.request(path,{as:f.user('admin','operations'),body})).status,403);
  assert.equal((await f.request(path,{as:finance,body:{...body,amount:1}})).status,400);
  assert.equal((await f.request(path,{as:finance,body:{...body,accountNumber:'different'}})).status,409);
  assert.equal((await f.request(path,{as:finance,body:{...body,confirmed:false}})).status,400);
  const recorded=await f.request(path,{as:finance,body});assert.equal(recorded.status,200);assert.equal(recorded.data.refund.bankRef,body.reference);
  assert.equal((await f.request(path,{as:finance,body})).data.duplicate,true);
  assert.equal((await f.request(path,{as:finance,body:{...body,reference:'DIFFERENT-REF'}})).status,409);
  const after=(await db.read()).state,rows=after.ledgerEntries.filter(e=>e.refId===refund.id);assert.equal(rows.length,1);assert.equal(rows[0].amount,-refund.amount);
  for(const old of state.ledgerEntries)assert.deepEqual(after.ledgerEntries.find(e=>e.id===old.id),old);
  const proof=await db.sql.prepare("SELECT data FROM feature_records WHERE id=? AND kind='manual-refund-proof'").get('refund-proof:'+refund.id);assert.ok(proof);assert.equal(db.decodeJSON(proof.data).recipientLast4,body.accountNumber.slice(-4));
  const otherRefund={...refund,id:'MANUAL-REFUND-SECOND'};after.refunds.push(otherRefund);await db.save(after);
  assert.equal((await f.request('/api/v1/refunds/'+otherRefund.id+'/record',{as:finance,body})).status,409);
});

test('SRS manual refund cannot bypass the original-source gateway or an unstarted refund',async t=>{
  const f=await fixture(t),state=(await f.db.read()).state,order=state.orders[0],as=f.user('admin','finance');
  const refund={id:'GATEWAY-REFUND-ONLY',orderId:order.id,customerId:order.customerId,amount:1000,status:'refunding',source:'customer_cancel',reason:'Test original source',destination:'original_source',createdAt:new Date().toISOString()};state.refunds.push(refund);await f.db.save(state);
  const body={amount:1000,accountNumber:'000000000001',reference:'BANK-REF',note:'Không được chuyển khoản khác nguồn thanh toán gốc.',confirmed:true};
  assert.equal((await f.request('/api/v1/refunds/'+refund.id+'/record',{as,body})).status,409);
  refund.destination='bank_account';refund.status='refund_pending';await f.db.save(state);
  assert.equal((await f.request('/api/v1/refunds/'+refund.id+'/record',{as,body})).status,409);
  assert.equal((await f.db.read()).state.ledgerEntries.length,state.ledgerEntries.length);
});

test('SRS deletion preflight shows only owner counts and never declares deletion approved',async t=>{
  const f=await fixture(t),customer=f.user('customer'),state=(await f.db.read()).state,order=state.orders.find(o=>o.customerId===customer.customerId);
  state.tickets.push({id:'DELETE-CHECK-TICKET',orderId:order.id,customerId:customer.customerId,coopId:order.coopId,status:'processing'});
  state.refunds.push({id:'DELETE-CHECK-REFUND',orderId:order.id,customerId:customer.customerId,amount:5000,status:'refund_pending'});await f.db.save(state);
  const request={status:'pending',reason:'Test deletion review',createdAt:new Date().toISOString(),history:[]};
  await f.db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run('DELETE-CHECK-REQUEST','account-deletion-request',customer.id,f.db.encodeJSON(request),0);
  const response=await f.request('/api/v1/account-deletion-requests',{as:customer});assert.equal(response.status,200);
  const checks=response.data.items[0].checks;assert.equal(checks.accountExists,true);assert.equal(checks.policyPending,true);assert.equal(checks.openTickets,1);assert.ok(checks.pendingRefunds>=1);assert.equal(checks.unpaidPeriods,0);
  assert.equal(checks.readyToDelete,undefined);assert.equal(JSON.stringify(checks).includes('accountNumber'),false);assert.equal(JSON.stringify(checks).includes(order.id),false);
  const other=state.users.find(u=>u.role==='customer'&&u.id!==customer.id);assert.equal((await f.request('/api/v1/account-deletion-requests',{as:other})).data.items.length,0);
  assert.equal((await f.request('/api/v1/account-deletion-requests',{as:f.user('admin','operations')})).data.items[0].checks.pendingRefunds,checks.pendingRefunds);
});

test('SRS seller deletion preflight counts unsettled deliveries and excludes other sellers',async t=>{
  const f=await fixture(t),state=(await f.db.read()).state,delivered=state.orders.find(o=>o.status==='delivered'),seller=state.users.find(u=>u.coopId===delivered.coopId);
  const initial=accountDeletionChecks(state,seller.id);assert.equal(initial.unsettledDeliveredOrders,1);
  const other=state.users.find(u=>u.role==='coop'&&u.coopId!==seller.coopId);assert.equal(accountDeletionChecks(state,other.id).unsettledDeliveredOrders,0);
  assert.equal(accountDeletionChecks(state,'missing-user').accountExists,false);assert.equal(accountDeletionChecks(state,'missing-user').policyPending,true);
  state.payoutPeriods.push({id:'DELETE-CHECK-PERIOD',coopId:seller.coopId,status:'closed',lines:[{orderId:delivered.id}],payout:1});
  const after=accountDeletionChecks(state,seller.id);assert.equal(after.unsettledDeliveredOrders,0);assert.equal(after.unpaidPeriods,1);
  assert.equal(accountDeletionChecks(state,other.id).unpaidPeriods,0);
});

test('SRS closing requested account access revokes sessions without deleting retained financial history',async t=>{
  const f=await fixture(t),credentials={phone:'0986660101',name:'Khách đóng tài khoản',password:'Close@123'},otp=await f.request('/api/v1/auth/otp',{body:{phone:credentials.phone,purpose:'register'}});
  const registration=await f.request('/api/v1/auth/password/register',{body:{...credentials,challengeId:otp.data.challengeId,otp:'123456'}});assert.equal(registration.status,200);const customer=registration.data.user;
  const path='/api/v1/account-deletion-requests',submitted=await f.request(path,{as:customer,body:{action:'submit',currentPassword:credentials.password,reason:'Tôi muốn đóng tài khoản không còn sử dụng.',confirm:true}});assert.equal(submitted.status,200);
  const session=await issueSession(f.db,customer.id),before=(await f.db.read()).state,body={action:'close_access',id:submitted.data.id,note:'Đã xác minh yêu cầu chủ tài khoản và kiểm tra nghiệp vụ.',confirmed:true},ops=f.user('admin','operations');
  assert.equal((await f.request(path,{as:customer,body})).status,403);assert.equal((await f.request(path,{as:f.user('admin','root'),body})).status,403);
  assert.equal((await f.request(path,{as:ops,body:{...body,confirmed:false}})).status,400);
  assert.equal((await f.request(path,{as:ops,body})).status,200);assert.equal((await f.request(path,{as:ops,body})).data.duplicate,true);
  const after=(await f.db.read()).state,user=after.users.find(u=>u.id===customer.id);assert.equal(user.status,'locked');assert.ok(user.accessClosedAt);
  assert.equal((await f.request('/api/v1/me',{token:session.accessToken})).status,401);
  assert.equal((await f.request('/api/v1/auth/refresh',{body:{refreshToken:session.refreshToken}})).status,401);
  assert.equal((await f.request('/api/v1/auth/password/login',{body:credentials})).status,401);
  assert.equal(await f.db.sql.prepare('SELECT user_id FROM password_credentials WHERE user_id=?').get(customer.id),undefined);
  for(const key of ['orders','ledgerEntries','payoutPeriods'])assert.deepEqual(after[key],before[key]);
  assert.equal(opsSetAccountLocked(after,actorOf(ops),customer.id,false,'Mở lại',new Date()).ok,false);
});

test('SRS closure blocks pending business and suspends a closed seller without reopening through selling rights',async t=>{
  const f=await fixture(t),state=(await f.db.read()).state,ops=f.user('admin','operations'),pendingSeller=state.users.find(u=>u.role==='coop'&&state.orders.some(o=>o.coopId===u.coopId&&o.status==='awaiting_confirmation'));
  async function requestFor(user,id){await f.db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(id,'account-deletion-request',user.id,f.db.encodeJSON({status:'pending',reason:'Yêu cầu kiểm thử của chủ tài khoản.',createdAt:new Date().toISOString(),history:[]}),0);return {action:'close_access',id,note:'Đã xác minh yêu cầu và kiểm tra các nghiệp vụ liên quan.',confirmed:true};}
  const pending=await requestFor(pendingSeller,'CLOSE-PENDING-SELLER');assert.equal((await f.request('/api/v1/account-deletion-requests',{as:ops,body:pending})).status,409);
  assert.equal((await f.db.read()).state.users.find(u=>u.id===pendingSeller.id).status,'active');
  const seller=state.users.find(u=>u.role==='coop'&&!state.orders.some(o=>o.coopId===u.coopId)),body=await requestFor(seller,'CLOSE-EMPTY-SELLER');
  assert.equal((await f.request('/api/v1/account-deletion-requests',{as:ops,body})).status,200);
  const after=(await f.db.read()).state;assert.equal(after.coops.find(c=>c.id===seller.coopId).status,'suspended');
  const quality=f.user('admin','quality');assert.equal(qualitySetSellingRights(after,actorOf(quality),seller.coopId,true,'Mở bán',new Date()).ok,false);
});

test('confirmed policy: operations cannot report delivery and carrier webhooks cannot replace the assigned shipper',async t=>{
  const f=await fixture(t),state=(await f.db.read()).state,order=state.orders.find(o=>o.status==='awaiting_confirmation'),shipper=f.user('shipper'),other=state.users.find(u=>u.role==='shipper'&&u.id!==shipper.id);
  order.status='shipping';order.shipment={shipperId:shipper.id,shipperName:shipper.name,assignedAt:new Date().toISOString(),assignedBy:'Test operations',pickedUpAt:new Date().toISOString()};await f.db.save(state);
  const carrier={commands:[{name:'carrierSimulate',args:[order.id,null,'delivered_reported','',null]}]};
  assert.equal((await f.request('/api/v1/commands',{as:f.user('admin','operations'),body:carrier,key:'no-ops-carrier'})).status,403);
  assert.equal((await f.request('/api/v1/webhooks/carrier',{body:{eventId:'carrier-not-allowed',orderId:order.id,event:'delivered_reported'}})).status,403);
  const report={commands:[{name:'shipperFailed',args:[null,order.id,'Người nhận vắng nhà','Giao lại theo lịch hẹn.',null]}]};
  assert.equal((await f.request('/api/v1/commands',{as:f.user('admin','operations'),body:report,key:'no-ops-report'})).status,403);
  assert.notEqual((await f.request('/api/v1/commands',{as:other,body:report,key:'no-other-shipper'})).status,200);
  assert.equal((await f.request('/api/v1/commands',{as:shipper,body:report,key:'assigned-shipper-report'})).status,200);
  const after=(await f.db.read()).state.orders.find(o=>o.id===order.id);assert.equal(after.deliveryAttempts,order.deliveryAttempts+1);assert.equal(after.deliveryLog.at(-1).by,shipper.name);
});
