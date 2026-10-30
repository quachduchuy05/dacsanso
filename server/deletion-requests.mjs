import {randomUUID} from 'node:crypto';
import {assert} from './security.mjs';
import {verifyPassword} from './passwords.mjs';
import {isTicketOpen} from '../src/domain/complaint.ts';

export function accountDeletionChecks(state,userId){
  const user=state.users.find(u=>u.id===userId);
  if(!user)return {accountExists:false,policyPending:true,activeOrders:0,pendingPayments:0,pendingRefunds:0,openTickets:0,unpaidPeriods:0,unsettledDeliveredOrders:0,externalIdentity:false};
  const owns=item=>(!!user.customerId&&item.customerId===user.customerId)||(!!user.coopId&&item.coopId===user.coopId);
  const orderIds=new Set(state.orders.filter(owns).map(o=>o.id));
  const settled=new Set(state.payoutPeriods.filter(p=>p.coopId===user.coopId).flatMap(p=>p.lines.map(l=>l.orderId)));
  return {accountExists:true,policyPending:true,
    activeOrders:state.orders.filter(o=>owns(o)&&!['delivered','cancelled','returned'].includes(o.status)).length,
    pendingPayments:state.transactions.filter(t=>t.status==='pending'&&(t.customerId===user.customerId||t.orderIds.some(id=>orderIds.has(id)))).length,
    pendingRefunds:state.refunds.filter(r=>(owns(r)||orderIds.has(r.orderId))&&r.status!=='refunded').length,
    openTickets:state.tickets.filter(t=>owns(t)&&isTicketOpen(t)).length,
    unpaidPeriods:user.coopId?state.payoutPeriods.filter(p=>p.coopId===user.coopId&&p.status!=='paid').length:0,
    unsettledDeliveredOrders:user.coopId?state.orders.filter(o=>o.coopId===user.coopId&&o.status==='delivered'&&!settled.has(o.id)).length:0,
    externalIdentity:!!user.supabaseId||!!user.google};
}

// OI-19 leaves retention/anonymization undecided. This workflow never deletes records.
export async function deletionRequestsRoute(method,body,{db,auth}){
  const user=auth.user,operations=user.role==='admin'&&user.adminGroup==='operations',owner=['customer','coop'].includes(user.role);
  assert(owner||operations,403,'Chỉ khách/HTX gửi yêu cầu và Vận hành xử lý.');
  const records=await db.sql.prepare("SELECT id,owner_id,data FROM feature_records WHERE kind='account-deletion-request'").all();
  const items=records.filter(r=>operations||r.owner_id===user.id).map(r=>({id:r.id,userId:r.owner_id,...db.decodeJSON(r.data)}));
  if(method==='GET'){const {state}=await db.read();return {items:items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(item=>({...item,checks:accountDeletionChecks(state,item.userId)}))};}
  assert(method==='POST',405,'Thao tác không hỗ trợ.');
  if(body.action==='submit'){
    assert(owner,403,'Chỉ gửi yêu cầu xóa tài khoản của mình.');
    assert(body.confirm===true,400,'Cần xác nhận gửi yêu cầu.');
    const credential=await db.sql.prepare('SELECT password_hash FROM password_credentials WHERE user_id=?').get(user.id);
    assert(credential&&await verifyPassword(body.currentPassword,credential.password_hash),401,'Xác thực mật khẩu hiện tại. Nếu dùng Google, hãy thiết lập mật khẩu riêng trước.');
    const pending=items.find(r=>['pending','needs_information','retention_review'].includes(r.status));if(pending)return {id:pending.id,duplicate:true};
    assert(typeof body.reason==='string'&&body.reason.trim().length>=10&&body.reason.trim().length<=1000,400,'Lý do từ 10–1.000 ký tự.');
    const id=randomUUID(),data={status:'pending',reason:body.reason.trim(),createdAt:new Date().toISOString(),history:[]};
    await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(id,'account-deletion-request',user.id,db.encodeJSON(data),0);
    await db.audit(user.id,'account-deletion-requested',id);return {id,status:data.status};
  }
  const record=records.find(r=>r.id===body.id&&(operations||r.owner_id===user.id));assert(record,404,'Không tìm thấy yêu cầu.');const data=db.decodeJSON(record.data);
  if(body.action==='close_access'){
    assert(operations,403,'Chỉ Vận hành được đóng quyền truy cập theo yêu cầu.');
    if(data.status==='access_closed')return {ok:true,duplicate:true};
    assert(['pending','retention_review','needs_information'].includes(data.status),409,'Yêu cầu đã đóng.');
    assert(body.confirmed===true&&typeof body.note==='string'&&body.note.trim().length>=20&&body.note.length<=2000,400,'Xác nhận đã kiểm tra yêu cầu và ghi căn cứ từ 20–2.000 ký tự.');
    const {state}=await db.read(),target=state.users.find(u=>u.id===record.owner_id);assert(target&&['customer','coop'].includes(target.role),409,'Chỉ xử lý yêu cầu của khách/HTX còn tồn tại.');
    const checks=accountDeletionChecks(state,target.id);
    assert(['activeOrders','pendingPayments','pendingRefunds','openTickets','unpaidPeriods','unsettledDeliveredOrders'].every(key=>checks[key]===0),409,'Còn nghiệp vụ chưa hoàn tất. Xử lý đơn, tiền, ticket và đối soát trước khi đóng quyền truy cập.');
    const at=new Date().toISOString();target.status='locked';target.accessClosedAt=at;
    if(target.coopId){const coop=state.coops.find(c=>c.id===target.coopId);if(coop){coop.status='suspended';coop.suspendReason='Đại diện HTX đã đóng quyền truy cập theo yêu cầu xóa tài khoản.';}}
    await db.save(state);
    for(const table of ['sessions','account_links','password_credentials'])await db.sql.prepare(`DELETE FROM ${table} WHERE user_id=?`).run(target.id);
    if(target.phone)await db.sql.prepare('DELETE FROM otp_challenges WHERE phone=?').run(target.phone);
    data.history.push({from:data.status,to:'access_closed',by:user.id,at,note:body.note.trim()});data.status='access_closed';
    await db.sql.prepare('UPDATE feature_records SET data=? WHERE id=?').run(db.encodeJSON(data),record.id);
    await db.audit(user.id,'account-access-closed',target.id,JSON.stringify({requestId:record.id,note:body.note.trim(),retentionPending:true}));
    return {ok:true,message:'Đã đóng quyền truy cập; dữ liệu lịch sử chưa bị xóa hoặc ẩn danh.'};
  }
  assert(!['withdrawn','rejected','access_closed'].includes(data.status),409,'Yêu cầu đã đóng.');
  if(body.action==='withdraw'){assert(owner&&record.owner_id===user.id,403,'Chỉ chủ tài khoản được rút yêu cầu.');body.status='withdrawn';}
  else {assert(body.action==='review'&&operations,403,'Chỉ Vận hành được xử lý yêu cầu.');assert(['needs_information','retention_review','rejected'].includes(body.status),400,'Chưa cho phép xác nhận đã xóa khi chính sách lưu trữ chưa được duyệt.');}
  assert(typeof body.note==='string'&&body.note.trim().length>=10&&body.note.trim().length<=2000,400,'Ghi chú từ 10–2.000 ký tự.');
  data.history.push({from:data.status,to:body.status,note:body.note.trim(),by:user.id,at:new Date().toISOString()});data.status=body.status;
  await db.sql.prepare('UPDATE feature_records SET data=? WHERE id=?').run(db.encodeJSON(data),record.id);
  await db.audit(user.id,'account-deletion-'+body.action,record.id,body.status);return {ok:true};
}
