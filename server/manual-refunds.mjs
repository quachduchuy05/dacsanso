import {assert} from './security.mjs';
import {confirmRefundBySimBank} from '../src/domain/finance.ts';
import {deriveNotifications} from '../src/domain/notifications.ts';

// Records checked evidence of a bank transfer performed outside this application.
// It cannot send funds or substitute for an original-source gateway refund.
export async function recordManualRefund(id,body,{db,auth}){
  assert(auth.user.role==='admin'&&auth.user.adminGroup==='finance',403,'Chỉ Tài chính ghi nhận chứng từ hoàn tiền.');
  const {state}=await db.read(),refund=state.refunds.find(r=>r.id===id);assert(refund,404,'Không tìm thấy khoản hoàn.');
  assert(refund.destination==='bank_account',409,'Hoàn về nguồn thanh toán ban đầu phải nhận kết quả từ cổng; không dùng chứng từ chuyển khoản khác nguồn.');
  assert(Number.isSafeInteger(body.amount)&&body.amount===refund.amount&&body.amount>0,400,'Số tiền phải khớp khoản hoàn.');
  assert(typeof body.reference==='string'&&body.reference.trim().length>=3&&body.reference.length<=100&&!/[\x00-\x1f]/.test(body.reference),400,'Mã chứng từ từ 3–100 ký tự.');
  assert(typeof body.note==='string'&&body.note.trim().length>=20&&body.note.length<=2000&&body.confirmed===true,400,'Cần căn cứ ít nhất 20 ký tự và xác nhận đã kiểm tra chuyển khoản đúng người nhận.');
  const reference=body.reference.trim();
  if(refund.status==='refunded'){assert(refund.bankRef===reference,409,'Khoản hoàn đã ghi nhận bằng chứng từ khác.');return {refund,duplicate:true};}
  assert(refund.status==='refunding',409,'Cần bắt đầu xử lý khoản hoàn trước khi ghi chứng từ.');
  assert(!state.refunds.some(r=>r.id!==id&&r.status==='refunded'&&r.bankRef===reference),409,'Chứng từ đã dùng cho khoản hoàn khác.');
  const account=state.customers.find(c=>c.id===refund.customerId)?.refundAccount;assert(account,409,'Khách chưa khai tài khoản nhận hoàn.');
  assert(body.accountNumber===account.accountNumber,409,'Tài khoản nhận hoàn đã thay đổi; tải lại và kiểm tra người nhận.');
  const oldLedgerIds=new Set(state.ledgerEntries.map(e=>e.id)),at=new Date(),result=confirmRefundBySimBank(state,id,auth.actor,at);assert(result.ok,422,result.error);
  const next={...result.value,auditLogs:state.auditLogs,refunds:result.value.refunds.map(r=>r.id===id?{...r,bankRef:reference}:r),ledgerEntries:result.value.ledgerEntries.map(e=>oldLedgerIds.has(e.id)?e:{...e,note:'Chứng từ hoàn ngoài hệ thống: '+reference})};
  await db.save(deriveNotifications(state,next,at));
  await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run('refund-proof:'+id,'manual-refund-proof',auth.user.id,db.encodeJSON({refundId:id,reference,amount:refund.amount,note:body.note.trim(),recipientLast4:account.accountNumber.slice(-4),by:auth.user.id,at:at.toISOString()}),0);
  await db.audit(auth.user.id,'manual-refund-recorded',id,JSON.stringify({reference,amount:refund.amount,recipientLast4:account.accountNumber.slice(-4)}));
  return {refund:next.refunds.find(r=>r.id===id)};
}
