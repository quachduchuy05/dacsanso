import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Database} from '../database.mjs';
import {mergeGuest} from '../guest-cart.mjs';
import {productMediaRoute,validateAsset} from '../product-media.mjs';
import {phase2Events} from '../phase2-events.mjs';
import {verifyExpiredPayments} from '../payment-verification.mjs';
import {runScheduledJobs} from '../../src/domain/jobs.ts';
import {makeState,line,placeInput,CUSTOMER} from '../../src/domain/__tests__/fixtures.ts';
import {placeCheckout} from '../../src/domain/checkout.ts';
import {createApplication} from '../app.mjs';
import {issueSession} from '../security.mjs';
import {beginMediaUpload,completeMediaUpload,cleanProductMedia} from '../product-media-storage.mjs';
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNk+M/AwMDAxMDAwMDAAAAZNAIBWxOnMQAAAABJRU5ErkJggg==','base64');
test('responsive assets share approval and access checks with the full image',async t=>{
  const {db,state,root}=fixture(t),path='/api/v1/products/'+state.products[0].id+'/media';
  const webp=Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(4),Buffer.from('WEBP'),Buffer.from('full')]);
  const small=Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(4),Buffer.from('WEBP'),Buffer.from('small')]);
  const call=body=>productMediaRoute(path+'/upload','POST',body,{db,auth:root});
  await assert.rejects(call({mime:'image/webp',base64:webp.toString('base64'),variants:[{width:100,base64:small.toString('base64')}]}),e=>e.status===400);
  const asset=await call({mime:'image/webp',base64:webp.toString('base64'),variants:[{width:480,base64:small.toString('base64')}]});
  let output;const res={writeHead:()=>{},end:bytes=>{output=bytes;}};
  const get=()=>productMediaRoute('/api/v1/products/media-assets/'+asset.id,'GET',{}, {db,auth:null,res,imageWidth:'480'});
  await assert.rejects(get(),e=>e.status===404);
  const result=await productMediaRoute(path,'POST',{action:'submit',item:{kind:'image',group:'main',order:0,alt:'Responsive product',files:[asset.id],source:'self'}},{db,auth:root});
  await productMediaRoute(path,'POST',{action:'review',id:result.entries[0].id,status:'approved'},{db,auth:root});
  await get();assert.deepEqual(output,small);
  await productMediaRoute('/api/v1/products/media-assets/'+asset.id,'GET',{}, {db,auth:null,res});assert.deepEqual(output,webp);
});
function fixture(t){const db=new Database(':memory:',{demo:true,encryptionKey:'ab'.repeat(32)});t.after(()=>db.close());const state=db.read().state;return {db,state,root:{user:state.users.find(u=>u.adminGroup==='root')},customer:{user:state.users.find(u=>u.role==='customer')}};}

test('guest merge caps combined stock, preserves unrelated lines and deduplicates retries',async t=>{
  const {db,state,customer}=fixture(t),p=state.products.find(p=>p.kind==='ready');p.stockOnHand=5;state.orders=[];state.carts[customer.user.customerId]=[{productId:p.id,quantity:3,seenPrice:p.price}];await db.save(state);
  const body={batchId:'cart-batch-one',updatedAt:Date.now(),lines:[{productId:p.id,quantity:4,seenPrice:1}]};
  const run=()=>db.transaction(()=>mergeGuest(body,{db,auth:customer}));
  const result=await run();assert.equal(result.state.carts[customer.user.customerId][0].quantity,5);assert.equal(result.adjustments.length,1);await run();assert.equal(db.read().state.carts[customer.user.customerId][0].quantity,5);
});

test('media review preserves old approved content and never exposes pending assets or consent',async t=>{
  const {db,state,root,customer}=fixture(t),p=state.products[0];const path='/api/v1/products/'+p.id+'/media';
  const call=(method,body,auth=root,url=path)=>db.transaction(()=>productMediaRoute(url,method,body,{db,auth}));
  const upload=()=>call('POST',{mime:'image/png',base64:PNG.toString('base64')},root,path+'/upload');
  const first=await upload();const item={kind:'image',group:'main',order:0,alt:'Product front',files:[first.id],source:'self',hasPeople:false};
  const submitted=await call('POST',{action:'submit',item});const id=submitted.entries[0].id;
  assert.equal((await call('GET',{},null)).items.length,0);
  await assert.rejects(call('POST',{action:'review',id,status:'approved'},customer),e=>e.status===403);
  await call('POST',{action:'review',id,status:'approved'});assert.equal((await call('GET',{},null)).items[0].files[0],'/api/v1/products/media-assets/'+first.id);
  const next=await upload();await call('POST',{action:'submit',id,item:{...item,files:[next.id]}});
  assert.equal((await call('GET',{},null)).items[0].files[0],'/api/v1/products/media-assets/'+first.id);
  await assert.rejects(call('POST',{action:'review',id,status:'needs_changes',reason:''}),e=>e.status===400);
  await call('POST',{action:'review',id,status:'needs_changes',reason:'Label not clear'});
  assert.equal((await call('GET',{},null)).items.length,1);
  await assert.rejects(call('POST',{action:'submit',item:{...item,source:'supplier'}}),e=>e.status===400);
  const raw=db.sql.prepare("SELECT data FROM feature_records WHERE kind='product-media-manifest'").get();assert(raw.data.startsWith('aes1:'));
});

test('binary validation rejects bad MIME, oversized images, invalid video and remote model dependencies',()=>{
  validateAsset('image/png',PNG);assert.throws(()=>validateAsset('image/jpeg',PNG));assert.throws(()=>validateAsset('image/png',Buffer.alloc(400000)));assert.throws(()=>validateAsset('video/mp4',Buffer.alloc(100)));
  const json=Buffer.from(JSON.stringify({asset:{version:'2.0'},buffers:[{uri:'https://evil.invalid/file'}]}).padEnd(140,' '));const glb=Buffer.alloc(20+json.length);glb.write('glTF');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(json.length,12);glb.writeUInt32LE(0x4e4f534a,16);json.copy(glb,20);assert.throws(()=>validateAsset('model/gltf-binary',glb));
});

test('experience events reject personal fields and delivery interest requires consent',async t=>{
  const {db}=fixture(t);const call=(path,body)=>db.transaction(()=>phase2Events(path,'POST',body,{db,auth:null}));
  await assert.rejects(call('/events',{session:'a'.repeat(36),event:'add',phone:'0900000001'}),e=>e.status===400);
  await call('/events',{session:'a'.repeat(36),event:'add'});
  await assert.rejects(call('/delivery-interest',{phone:'0900000001',region:'Da Nang',consent:false}),e=>e.status===400);
  await call('/delivery-interest',{phone:'0900000001',region:'Da Nang',consent:true});
  const row=db.sql.prepare("SELECT data FROM feature_records WHERE kind='delivery-interest'").get();assert(!row.data.includes('0900000001'));
});

test('expiry checks the merchant before cancelling and a timeout never releases an ambiguous hold',async t=>{
  const {db}=fixture(t),state=makeState(),at=new Date(Date.now()-20*60000),p=state.products.find(p=>p.kind==='ready');
  const placed=placeCheckout(state,placeInput([line(p.id,1,p.price)],{},{experience:'phase2'}),CUSTOMER,at);assert(placed.ok&&placed.transaction);await db.save(placed.state,{allowFinancialReset:true});const tx=placed.transaction;
  await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run('payment-session:'+tx.id,'payment-session','owner',db.encodeJSON({status:'requested'}),Date.now()+86400000);
  const options={demo:false,paymentAdapter:{url:'https://merchant.example/session',statusUrl:'https://merchant.example/status',token:'isolated-test-adapter-key'}};
  const protectedIds=await verifyExpiredPayments(db,options,async()=>{throw Error('timeout');});assert(protectedIds.has(tx.id));assert.equal(runScheduledJobs(db.read().state,new Date(),protectedIds).state.transactions[0].status,'pending');
  await db.sql.prepare('DELETE FROM rate_limits').run();
  await verifyExpiredPayments(db,options,async()=>Response.json({transactionId:tx.id,amount:tx.amount,currency:'VND',status:'paid',paidAt:new Date(Date.parse(tx.expiresAt)-1000).toISOString(),providerRef:'merchant-paid-before-deadline'}));
  assert.equal(db.read().state.transactions[0].status,'paid');assert.equal(db.read().state.orders[0].status,'preparing');assert.equal(db.read().state.refunds.length,0);
});

test('HTTP media assets stay private until approval; guest merge is authenticated',async t=>{
  const app=await createApplication({demo:true,databasePath:':memory:'});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>app.server.close(resolve)));
  const base='http://127.0.0.1:'+app.server.address().port,state=(await app.db.read()).state,root=state.users.find(u=>u.adminGroup==='root'),session=await issueSession(app.db,root.id),p=state.products[0],path='/api/v1/products/'+p.id+'/media';
  const post=async(url,body)=>fetch(base+url,{method:'POST',headers:{Authorization:'Bearer '+session.accessToken,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await fetch(base+'/api/v1/cart/merge',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
  const upload=await post(path+'/upload',{mime:'image/png',base64:PNG.toString('base64')});assert.equal(upload.status,200);const asset=await upload.json();assert.equal((await fetch(base+'/api/v1/products/media-assets/'+asset.id)).status,404);
  const submitted=await post(path,{action:'submit',item:{kind:'image',group:'main',order:0,alt:'Approved fixture image',files:[asset.id],source:'self',hasPeople:false}});const data=await submitted.json();assert.equal(submitted.status,200);
  assert.equal((await post(path,{action:'review',id:data.entries[0].id,status:'approved'})).status,200);
  const publicAsset=await fetch(base+'/api/v1/products/media-assets/'+asset.id);assert.equal(publicAsset.status,200);assert.equal(publicAsset.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await publicAsset.arrayBuffer()),PNG);
  const range=await fetch(base+'/api/v1/products/media-assets/'+asset.id,{headers:{Range:'bytes=0-7'}});assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),`bytes 0-7/${PNG.length}`);assert.deepEqual(Buffer.from(await range.arrayBuffer()),PNG.subarray(0,8));
});

test('direct Storage uploads are checked before publication, retry safely and expired staging is removed',async t=>{
  const {db,state,root}=fixture(t),p=state.products[0],removed=[];
  const options={supabaseUrl:'https://media.example',supabaseAdmin:{storage:{getBucket:async()=>({data:{public:false,file_size_limit:10*1024*1024}}),from:()=>({createSignedUploadUrl:async path=>({data:{signedUrl:'https://media.example/upload/'+path+'?token=upload-only'}}),download:async()=>({data:new Blob([PNG],{type:'image/png'})}),createSignedUrl:async path=>({data:{signedUrl:'https://media.example/read/'+path+'?token=short-read'}}),remove:async paths=>{removed.push(...paths);return {};}})}}};
  const context={db,auth:root,options},upload=await beginMediaUpload(p.id,{mime:'image/png',size:PNG.length},context);
  const completed=await completeMediaUpload(p.id,upload.id,context,validateAsset);assert.equal(completed.id,upload.id);assert.equal((await completeMediaUpload(p.id,upload.id,context,validateAsset)).id,upload.id);
  const manifest=await db.transaction(()=>productMediaRoute('/api/v1/products/'+p.id+'/media','POST',{action:'submit',item:{kind:'image',group:'main',order:0,alt:'Storage fixture',files:[upload.id],source:'self',hasPeople:false}},context));
  await db.transaction(()=>productMediaRoute('/api/v1/products/'+p.id+'/media','POST',{action:'review',id:manifest.entries[0].id,status:'approved'},context));
  let status,headers;await productMediaRoute('/api/v1/products/media-assets/'+upload.id,'GET',{}, {...context,auth:null,res:{writeHead:(s,h)=>{status=s;headers=h;},end:()=>{}}});assert.equal(status,307);assert(headers.Location.startsWith('https://media.example/read/'));
  const orphan=await beginMediaUpload(p.id,{mime:'image/png',size:PNG.length},context);await db.sql.prepare('UPDATE feature_records SET expires_at=? WHERE id=?').run(Date.now()-1,orphan.id);await cleanProductMedia(db,options);assert.equal(removed.length,1);assert.equal(db.sql.prepare('SELECT id FROM feature_records WHERE id=?').get(orphan.id),undefined);assert(db.sql.prepare('SELECT id FROM feature_records WHERE id=?').get(upload.id));
});
