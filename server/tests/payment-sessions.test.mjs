import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Database} from '../database.mjs';
import {createPaymentSession,paymentAdapterConfigured} from '../payment-sessions.mjs';

const options={publicUrl:'https://shop.example.com',paymentAdapter:{url:'https://adapter.example.com/create',token:'adapter-secret-for-tests',checkoutOrigins:['https://checkout.example.com']}};
function fixture(t){
  const db=new Database(':memory:',{demo:true});t.after(()=>db.close());
  const {state}=db.read(),user=state.users.find(u=>u.role==='customer'),tx={id:'TX-SESSION',customerId:user.customerId,kind:'checkout',status:'pending',amount:183000,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+600000).toISOString(),orderIds:[],amounts:{}};
  state.transactions.push(tx);db.save(state);
  const valid={transactionId:tx.id,amount:tx.amount,currency:'VND',checkoutUrl:'https://checkout.example.com/pay/one',expiresAt:tx.expiresAt};
  const create=(fetchImpl,overrides={})=>createPaymentSession(tx.id,{db,auth:{user},options,fetchImpl,...overrides});
  return {db,user,tx,valid,create};
}
test('payment sessions fail closed when unconfigured, wrong owner or expired',async t=>{
  const f=fixture(t);assert(paymentAdapterConfigured(options));assert(!paymentAdapterConfigured({}));
  await assert.rejects(f.create(()=>{}, {options:{}}),error=>error.status===503);
  await assert.rejects(f.create(()=>{}, {auth:{user:{...f.user,customerId:'other'}}}),error=>error.status===404);
  const {state}=f.db.read();state.transactions.find(tx=>tx.id===f.tx.id).expiresAt=new Date(Date.now()-1000).toISOString();f.db.save(state);
  await assert.rejects(f.create(()=>{}),error=>error.status===409);
});
test('session creation binds amount to server state, reuses checkout and never marks payment paid',async t=>{
  const f=fixture(t),ledger=f.db.read().state.ledgerEntries;let calls=0;
  const fetchImpl=async(url,request)=>{calls++;const body=JSON.parse(request.body);assert.equal(body.amount,183000);assert.equal(body.currency,'VND');assert.equal(body.returnUrl,'https://shop.example.com/?paymentReturn=1');assert.equal(request.redirect,'error');assert.equal(request.headers['Idempotency-Key'],'payment-session:TX-SESSION');return Response.json(f.valid);};
  assert.equal((await f.create(fetchImpl)).checkoutUrl,f.valid.checkoutUrl);await f.create(fetchImpl);assert.equal(calls,1);
  assert.equal(f.db.read().state.transactions.find(tx=>tx.id===f.tx.id).status,'pending');assert.deepEqual(f.db.read().state.ledgerEntries,ledger);
});
test('gateway responses cannot change amount, transaction, currency, checkout origin or payment deadline',async t=>{
  const f=fixture(t);
  for(const override of [{amount:1},{transactionId:'other'},{currency:'USD'},{checkoutUrl:'javascript:alert(1)'},{checkoutUrl:'https://evil.example.com/pay'},{checkoutUrl:'https://name:pass@checkout.example.com/pay'},{expiresAt:new Date(Date.now()+3600000).toISOString()},{expiresAt:'invalid'}])await assert.rejects(f.create(async()=>Response.json({...f.valid,...override})),error=>error.status===502);
});
test('ambiguous network failures retry with the same idempotency key',async t=>{
  const f=fixture(t),keys=[];
  await assert.rejects(f.create(async(url,request)=>{keys.push(request.headers['Idempotency-Key']);throw new Error('timeout');}),error=>error.status===502);
  await f.create(async(url,request)=>{keys.push(request.headers['Idempotency-Key']);return Response.json(f.valid);});
  assert.deepEqual(keys,['payment-session:TX-SESSION','payment-session:TX-SESSION']);
});
