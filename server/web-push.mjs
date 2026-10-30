import {pushConfigured} from './provider-config.mjs';
export {pushConfigured} from './provider-config.mjs';
import webpush from 'web-push';
import {ECDH,createHash} from 'node:crypto';
import {assert} from './security.mjs';

const SUB='web-push-subscription',JOB='web-push-delivery',DAY=86400000;
const digest=value=>createHash('sha256').update(value).digest('hex');
export function validatePushSubscription(value){
  let url;try{url=new URL(value?.endpoint);}catch{assert(false,400,'Địa chỉ nhận thông báo không hợp lệ.');}
  const host=url.hostname;
  const trusted=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(host)||host.endsWith('.notify.windows.com');
  assert(url.protocol==='https:'&&!url.username&&!url.password&&!url.hash&&(!url.port||url.port==='443')&&trusted&&value.endpoint.length<=2048,400,'Dịch vụ Web Push chưa được hỗ trợ.');
  const keys=value.keys;
  assert(keys&&typeof keys.p256dh==='string'&&typeof keys.auth==='string'&&keys.p256dh.length<=100&&keys.auth.length<=32&&/^[\w-]+$/.test(keys.p256dh)&&/^[\w-]+$/.test(keys.auth),400,'Khóa thiết bị không hợp lệ.');
  const publicKey=Buffer.from(keys.p256dh,'base64url');
  assert(publicKey.length===65&&Buffer.from(keys.auth,'base64url').length===16,400,'Khóa thiết bị không hợp lệ.');
  try{ECDH.convertKey(publicKey,'prime256v1');}catch{assert(false,400,'Khóa thiết bị không hợp lệ.');}
  return {endpoint:url.href,keys:{p256dh:keys.p256dh,auth:keys.auth}};
}

export async function pushRoute(method,body,{db,auth,options}){
  const userId=auth.user.id,configured=pushConfigured(options);
  if(method==='GET'){
    const rows=await db.sql.prepare('SELECT id,data FROM feature_records WHERE kind=? AND owner_id=?').all(SUB,userId);
    return {configured,publicKey:configured?options.webPush.publicKey:null,devices:rows.map(row=>{const data=db.decodeJSON(row.data);return {id:row.id,createdAt:data.createdAt};})};
  }
  assert(method==='POST',405,'Thao tác không hỗ trợ.');
  if(body.action==='remove'){
    assert(typeof body.id==='string',400,'Cần mã thiết bị.');
    await db.sql.prepare('DELETE FROM feature_records WHERE id=? AND kind=? AND owner_id=?').run(body.id,SUB,userId);
    return {ok:true};
  }
  assert(body.action==='subscribe',400,'Thao tác không hợp lệ.');
  assert(configured,503,'Thông báo thiết bị chưa được cấu hình trên máy chủ.');
  const subscription=validatePushSubscription(body.subscription),id='push-'+digest(subscription.endpoint);
  const existing=await db.sql.prepare('SELECT owner_id,data FROM feature_records WHERE id=? AND kind=?').get(id,SUB);
  assert(!existing||existing.owner_id===userId,409,'Thiết bị đang liên kết tài khoản khác. Hãy tắt thông báo ở tài khoản cũ trước.');
  const devices=await db.sql.prepare('SELECT id FROM feature_records WHERE kind=? AND owner_id=?').all(SUB,userId);
  assert(existing||devices.length<5,409,'Tối đa 5 thiết bị nhận thông báo. Hãy xóa thiết bị cũ.');
  const createdAt=existing?db.decodeJSON(existing.data).createdAt:new Date().toISOString();
  const data=db.encodeJSON({subscription,createdAt});
  if(existing)await db.sql.prepare('UPDATE feature_records SET data=? WHERE id=?').run(data,id);
  else await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(id,SUB,userId,data,0);
  await db.audit(userId,'web-push-subscribed',id);
  return {ok:true,id};
}

// Network calls happen outside the database request queue. One backend worker is supported.
export async function processPushQueue(db,options,{send=webpush.sendNotification.bind(webpush),now=Date.now()}={}){
  if(!pushConfigured(options))return {sent:0};
  const tasks=await db.withRequest(()=>db.transaction(async()=>{
    const {state}=await db.read();
    const rows=await db.sql.prepare('SELECT id,owner_id,data FROM feature_records WHERE kind=?').all(SUB),tasks=[];
    await db.sql.prepare('DELETE FROM feature_records WHERE kind=? AND expires_at<?').run(JOB,now);
    for(const row of rows){
      const user=state.users.find(u=>u.id===row.owner_id);
      if(!user||user.status!=='active'||user.accessClosedAt||(user.expiresAt&&Date.parse(user.expiresAt)<=now)){
        await db.sql.prepare('DELETE FROM feature_records WHERE id=?').run(row.id);continue;
      }
      const device=db.decodeJSON(row.data);
      for(const notification of state.notifications.filter(n=>n.userId===user.id&&!n.read&&Date.parse(n.at)>=Math.max(Date.parse(device.createdAt),now-DAY))){
        if(tasks.length>=10)break;
        const id='push-job-'+digest(row.id+':'+notification.id);
        const previous=await db.sql.prepare('SELECT data FROM feature_records WHERE id=?').get(id);
        const job=previous?db.decodeJSON(previous.data):{attempts:0,status:'pending',nextAt:0};
        if(job.status!=='pending'||job.nextAt>now)continue;
        // Persist the attempt before sending; retries use the same notification tag.
        job.attempts++;job.nextAt=now+Math.min(3600000,30000*2**job.attempts);
        if(previous)await db.sql.prepare('UPDATE feature_records SET data=? WHERE id=?').run(db.encodeJSON(job),id);
        else await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(id,JOB,user.id,db.encodeJSON(job),now+2*DAY);
        tasks.push({id,deviceId:row.id,ownerId:user.id,subscription:device.subscription,job,notificationId:notification.id});
      }
      if(tasks.length>=10)break;
    }
    return tasks;
  }));
  let sent=0;
  for(const task of tasks){
    const active=await db.withRequest(async()=>{
      const device=await db.sql.prepare('SELECT owner_id FROM feature_records WHERE id=? AND kind=?').get(task.deviceId,SUB);
      const user=(await db.read()).state.users.find(u=>u.id===task.ownerId);
      return device?.owner_id===task.ownerId&&user?.status==='active'&&!user.accessClosedAt&&(!user.expiresAt||Date.parse(user.expiresAt)>Date.now());
    });
    if(!active)continue;
    // Do not put order/customer/message details on a lock screen or a shared device.
    const payload=JSON.stringify({title:'Đặc Sản Số',body:'Bạn có thông báo mới. Mở ứng dụng để xem.',tag:'dss-'+task.notificationId,url:'/'});
    let status='sent',expired=false;
    try{await send(task.subscription,payload,{vapidDetails:options.webPush,TTL:86400,timeout:5000,urgency:'normal'});sent++;}
    catch(error){expired=[404,410].includes(error.statusCode);status=expired||task.job.attempts>=5?'failed':'pending';}
    await db.withRequest(async()=>{
      if(expired)await db.sql.prepare('DELETE FROM feature_records WHERE id=? AND owner_id=?').run(task.deviceId,task.ownerId);
      await db.sql.prepare('UPDATE feature_records SET data=? WHERE id=?').run(db.encodeJSON({...task.job,status}),task.id);
    });
  }
  return {sent};
}
