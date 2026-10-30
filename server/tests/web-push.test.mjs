import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createECDH,randomBytes} from 'node:crypto';
import webpush from 'web-push';
import {Database} from '../database.mjs';
import {pushConfigured,pushRoute,processPushQueue,validatePushSubscription} from '../web-push.mjs';
import {createApplication} from '../app.mjs';
import {issueSession} from '../security.mjs';

const options={webPush:{subject:'mailto:ops@example.com',...webpush.generateVAPIDKeys()}};
function subscription(suffix='one'){
  const key=createECDH('prime256v1');key.generateKeys();
  return {endpoint:'https://fcm.googleapis.com/fcm/send/'+suffix,keys:{p256dh:key.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
}
async function fixture(t){
  const db=new Database(':memory:',{demo:true,encryptionKey:'ab'.repeat(32)});t.after(()=>db.close());
  const state=(await db.read()).state,user=state.users.find(u=>u.role==='customer');
  const auth={user};
  const route=(method,body={},as=auth)=>pushRoute(method,body,{db,auth:as,options});
  return {db,user,auth,route};
}
async function notify(db,user,id='notification-one',at=Date.now()+1000){
  const {state}=await db.read();state.notifications.push({id,userId:user.id,at:new Date(at).toISOString(),title:'Private title',body:'Private address',read:false});await db.save(state);
}

test('VAPID checks reject missing and mismatched key pairs; trusted endpoint and actual curve are required',()=>{
  assert(pushConfigured(options));assert(!pushConfigured({}));
  assert(!pushConfigured({webPush:{...options.webPush,privateKey:webpush.generateVAPIDKeys().privateKey}}));
  assert(validatePushSubscription(subscription()));
  for(const endpoint of ['http://fcm.googleapis.com/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.test/x','https://user:pass@fcm.googleapis.com/x','https://fcm.googleapis.com:444/x'])assert.throws(()=>validatePushSubscription({...subscription(),endpoint}));
  assert.throws(()=>validatePushSubscription({...subscription(),keys:{p256dh:'a'.repeat(87),auth:'x'}}));
});

test('subscriptions bind to their owner, redact endpoints, cap devices and cannot be stolen or deleted by another user',async t=>{
  const f=await fixture(t),sub=subscription(),first=await f.route('POST',{action:'subscribe',subscription:sub});
  assert.equal((await f.route('POST',{action:'subscribe',subscription:sub})).id,first.id);
  const other={user:(await f.db.read()).state.users.find(u=>u.role==='coop')};
  await assert.rejects(f.route('POST',{action:'subscribe',subscription:sub},other),error=>error.status===409);
  await f.route('POST',{action:'remove',id:first.id},other);
  assert.equal((await f.route('GET')).devices.length,1);
  assert(!JSON.stringify(await f.route('GET')).includes(sub.endpoint));
  for(let index=0;index<4;index++)await f.route('POST',{action:'subscribe',subscription:subscription('device-'+index)});
  await assert.rejects(f.route('POST',{action:'subscribe',subscription:subscription('sixth')}),error=>error.status===409);
  await f.route('POST',{action:'remove',id:first.id});assert.equal((await f.route('GET')).devices.length,4);
});

test('delivery uses generic content, only new unread owner notifications, and persists deduplication',async t=>{
  const f=await fixture(t);await f.route('POST',{action:'subscribe',subscription:subscription()});
  await notify(f.db,f.user,'old',Date.now()-10000);await notify(f.db,f.user);
  const {state}=await f.db.read();state.notifications.push({id:'wrong-owner',userId:'someone-else',at:new Date(Date.now()+1000).toISOString(),read:false});await f.db.save(state);
  const sent=[];const send=async(sub,payload,settings)=>{sent.push(JSON.parse(payload));assert.equal(settings.TTL,86400);assert.equal(settings.timeout,5000);};
  assert.equal((await processPushQueue(f.db,options,{send})).sent,1);
  assert.equal((await processPushQueue(f.db,options,{send})).sent,0);
  assert.equal(sent.length,1);assert(!JSON.stringify(sent).includes('Private'));
  const raw=f.db.sql.prepare("SELECT data FROM feature_records WHERE kind='web-push-subscription'").get();assert(raw.data.startsWith('aes1:'));
});

test('temporary failures back off; expired endpoints are removed; inactive users receive nothing',async t=>{
  const f=await fixture(t);await f.route('POST',{action:'subscribe',subscription:subscription()});await notify(f.db,f.user);
  let attempts=0;const now=Date.now();const send=async()=>{attempts++;throw Object.assign(new Error('upstream'),{statusCode:503});};
  await processPushQueue(f.db,options,{send,now});await processPushQueue(f.db,options,{send,now:now+1000});assert.equal(attempts,1);
  await processPushQueue(f.db,options,{send:async()=>{throw Object.assign(new Error('gone'),{statusCode:410});},now:now+120000});
  assert.equal((await f.route('GET')).devices.length,0);
  await f.route('POST',{action:'subscribe',subscription:subscription('locked')});
  const {state}=await f.db.read();state.users.find(u=>u.id===f.user.id).status='locked';await f.db.save(state);
  await processPushQueue(f.db,options,{send});assert.equal(attempts,1);assert.equal((await f.route('GET')).devices.length,0);
});

test('push HTTP routes require authentication; Root may configure its own devices without business privileges',async t=>{
  const app=await createApplication({demo:true,databasePath:':memory:',...options});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>app.server.close(resolve)));
  const url=`http://127.0.0.1:${app.server.address().port}/api/v1/me/push`;
  assert.equal((await fetch(url)).status,401);
  const root=(await app.db.read()).state.users.find(u=>u.adminGroup==='root'),tokens=await issueSession(app.db,root.id);
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tokens.accessToken},body:JSON.stringify({action:'subscribe',subscription:subscription('root')})});assert.equal(response.status,200);
});
