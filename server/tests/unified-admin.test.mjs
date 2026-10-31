import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApplication} from '../app.mjs';
import {issueSession} from '../security.mjs';

async function fixture(t){
  const app=await createApplication({demo:true,databasePath:':memory:'});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>app.server.close(resolve)));
  const state=(await app.db.read()).state,root=state.users.find(user=>user.adminGroup==='root');
  async function request(path,{user=root,body,method=body===undefined?'GET':'POST'}={}){
    const session=await issueSession(app.db,user.id);
    const response=await fetch(`http://127.0.0.1:${app.server.address().port}${path}`,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.accessToken,'Idempotency-Key':crypto.randomUUID()},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,data:await response.json()};
  }
  return {...app,state,root,request};
}

test('unified Admin publishes and edits products while preserving its real identity in audit',async t=>{
  const f=await fixture(t),coop=f.state.coops.find(item=>item.status==='active'&&item.profileStatus==='approved');
  const input={name:'Đặc sản quản trị tổng hợp',description:'Mô tả kiểm thử sản phẩm do quản trị tổng hợp đăng và quản lý.',unit:'gói',category:'dry',region:coop.region,kind:'ready',price:80000,stockOnHand:10,images:['data:image/png;base64,aGVsbG8=']};
  const created=await f.request('/api/v1/catalog/products',{body:{coopId:coop.id,input}});assert.equal(created.status,200,JSON.stringify(created.data));
  const id=created.data.product.id;
  const lease=await f.request('/api/v1/products/'+id+'/edit-lock',{body:{}});assert.equal(lease.status,200);
  assert.equal((await f.request('/api/v1/catalog/products/'+id,{body:{action:'price',price:90000,editToken:lease.data.token}})).status,200);
  const audit=await f.db.sql.prepare("SELECT user_id FROM audit_events WHERE action='catalog-price' AND target=?").get(id);assert.equal(audit.user_id,f.root.id);
  assert.equal((await f.db.read()).state.users.find(user=>user.id===f.root.id).adminGroup,'root');
  const other=f.state.users.find(user=>user.adminGroup==='operations');assert.equal((await f.request('/api/v1/catalog/products',{user:other,body:{coopId:coop.id,input}})).status,403);
});

test('unified Admin uses operations commands and sees operational, finance, support and audit data together',async t=>{
  const f=await fixture(t);
  const result=await f.request('/api/v1/commands',{body:{commands:[{name:'opsUpdateParam',args:[null,'lowStockThreshold',17,'Thay đổi kiểm thử quản trị tổng hợp',null]}]}});assert.equal(result.status,200,JSON.stringify(result.data));
  const state=(await f.db.read()).state;assert.equal(state.params.lowStockThreshold,17);
  const log=state.auditLogs.find(item=>item.action.includes('Sửa tham số'));assert.equal(log.actor.userId,f.root.id);assert.equal(log.actor.adminGroup,'root');
  const view=(await f.request('/api/v1/state')).data.state;
  assert.equal(view.orders.length,state.orders.length);assert.equal(view.ledgerEntries.length,state.ledgerEntries.length);assert.equal(view.users.length,state.users.length);assert.equal(view.tickets.length,state.tickets.length);
  for(const kind of ['summary','ledger','tickets','audit','settlements'])assert.equal((await f.request('/api/v1/exports',{body:{kind}})).status,201,kind);
});

test('unified Admin records financial evidence once and can create and activate a shipper account',async t=>{
  const f=await fixture(t),state=(await f.db.read()).state;
  state.payoutPeriods.push({id:'KY-ROOT-TEST',coopId:state.coops[0].id,start:'2026-10-01T00:00:00Z',end:'2026-10-08T00:00:00Z',status:'closed',lines:[],retained:100000,commission:5000,payout:95000,closedAt:'2026-10-08T00:00:00Z',closedBy:'Kiểm thử'});await f.db.save(state);
  const body={amount:95000,reference:'ROOT-BANK-TEST',note:'Đã kiểm tra chứng từ chuyển khoản của kỳ thử nghiệm.',confirmed:true};
  const path='/api/v1/payouts/KY-ROOT-TEST/record';assert.equal((await f.request(path,{body})).status,200);assert.equal((await f.request(path,{body})).data.duplicate,true);
  const command={name:'opsCreateAccount',args:[null,{name:'Shipper do Admin tổng hợp cấp',phone:'0986540101',role:'shipper'},null]};
  const created=await f.request('/api/v1/commands',{body:{commands:[command]}});assert.equal(created.status,200,JSON.stringify(created.data));
  const user=(await f.db.read()).state.users.find(user=>user.phone==='0986540101');assert.equal(user.role,'shipper');
  assert.equal((await f.request('/api/v1/auth/password/activation',{body:{userId:user.id}})).status,200);
});

test('unified Admin cannot act as customer or assigned shipper; legacy groups remain limited',async t=>{
  const f=await fixture(t);
  for(const name of ['carrierSimulate','shipperPickUp','addToCart']){
    const result=await f.request('/api/v1/commands',{body:{commands:[{name,args:[]}]}});assert.equal(result.status,403,name);
  }
  const staff=f.state.users.find(user=>user.adminGroup==='cskh');
  assert.equal((await f.request('/api/v1/exports',{user:staff,body:{kind:'ledger'}})).status,403);
  assert.equal((await f.request('/api/v1/auth/password/activation',{user:f.state.users.find(user=>user.adminGroup==='operations'),body:{userId:f.root.id}})).status,403);
});
