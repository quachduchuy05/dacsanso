import {assert} from './security.mjs';
import {recordPayout} from '../src/domain/settlement.ts';
import {audit,addLedger} from '../src/domain/state.ts';
import {payoutSchedule} from '../src/domain/payoutSchedule.ts';
import {isTicketOpen} from '../src/domain/complaint.ts';

export async function recordManualPayout(id,body,{db,auth}){
  assert(auth.user.role==='admin'&&auth.user.adminGroup==='finance',403,'Chỉ Tài chính ghi nhận kết quả chi trả ngoài hệ thống.');
  assert(typeof body.reference==='string'&&body.reference.trim().length>=3&&body.reference.length<=100&&!/[\r\n\x00-\x1f]/.test(body.reference),400,'Nhập mã chuyển khoản/chứng từ từ 3–100 ký tự.');
  assert(typeof body.note==='string'&&body.note.trim().length>=10&&body.note.length<=2000,400,'Ghi căn cứ xác nhận từ 10–2.000 ký tự.');
  assert(body.confirmed===true,400,'Cần xác nhận đã kiểm tra chứng từ chuyển tiền.');
  const {state}=await db.read(),period=state.payoutPeriods.find(p=>p.id===id),reference=body.reference.trim();
  assert(period,404,'Không tìm thấy kỳ chi trả.');
  const previous=state.payoutPeriods.flatMap(item=>(item.disbursements??[]).map(payment=>({...payment,periodId:item.id}))).find(payment=>payment.reference===reference);
  if(previous){assert(previous.periodId===id&&previous.amount===body.amount,409,'Chứng từ đã ghi nhận cho khoản chi khác.');return {period,duplicate:true};}
  assert(!state.payoutPeriods.some(p=>p.status==='paid'&&p.paidRef===reference&&p.id!==id),409,'Chứng từ đã ghi nhận cho kỳ khác.');
  if(period.policy){
    assert(period.status==='closed',409,'Kỳ đã chi trả xong.');
    const at=new Date(),schedule=payoutSchedule(period,at);
    assert(Number.isSafeInteger(body.amount)&&body.amount>0&&body.amount<=schedule.available,400,'Số tiền vượt phần được chi trả hoặc phần giữ lại chưa đến hạn.');
    assert(!state.tickets.some(ticket=>period.lines.some(line=>line.orderId===ticket.orderId)&&isTicketOpen(ticket)),409,'Có khiếu nại chưa đóng của đơn trong kỳ. Kiểm tra trước khi chi trả.');
    assert(!state.refunds.some(refund=>period.lines.some(line=>line.orderId===refund.orderId)&&refund.status!=='refunded'),409,'Có khoản hoàn chưa hoàn tất. Kiểm tra trước khi chi trả.');
    assert(period.lines.every(line=>state.refunds.filter(refund=>refund.orderId===line.orderId&&refund.source==='return'&&refund.status==='refunded').reduce((sum,refund)=>sum+refund.amount,0)<=line.refunded),409,'Có tiền hoàn mới sau khi chốt kỳ. Cần xử lý chênh lệch trước khi chi trả, không tự sửa kỳ cũ.');
    const complete=body.amount===schedule.remaining;
    const payment={amount:body.amount,reference,at:at.toISOString(),recordedBy:auth.user.id,note:body.note.trim()};
    const updated={...period,disbursements:[...(period.disbursements??[]),payment],...(complete?{status:'paid',paidAt:at.toISOString(),paidRef:reference}:{} )};
    let next={...state,payoutPeriods:state.payoutPeriods.map(item=>item.id===id?updated:item)};
    next=addLedger(next,{type:'payout_out',amount:-body.amount,coopId:period.coopId,refId:id,note:'Chuyển khoản ngoài hệ thống: '+reference},at);
    if(complete){
      next=addLedger(next,{type:'commission',amount:period.commission,coopId:period.coopId,refId:id,note:'Hoa hồng sàn của kỳ'},at);
      if(period.payoutFee)next=addLedger(next,{type:'payout_fee',amount:period.payoutFee,coopId:period.coopId,refId:id,note:'Phí chi trả theo chính sách đã chốt'},at);
    }
    next=audit(next,auth.actor,'Ghi nhận chi trả từng phần',id,at,`${reference}: ${body.amount}`);
    await db.save(next);await db.audit(auth.user.id,'manual-payout-installment-recorded',id,reference);
    return {period:updated};
  }
  assert(Number.isSafeInteger(body.amount)&&body.amount===period.payout,400,'Số tiền phải khớp kỳ đã chốt.');
  if(period.status==='paid'){assert(period.paidRef===reference,409,'Kỳ đã ghi nhận chi trả bằng chứng từ khác.');return {period,duplicate:true};}
  assert(!state.payoutPeriods.some(p=>p.status==='paid'&&p.paidRef===reference),409,'Chứng từ đã ghi nhận cho kỳ khác.');
  const at=new Date(),result=recordPayout(state,id,auth.actor,at);assert(result.ok,422,result.error);
  let next={...result.value,auditLogs:state.auditLogs,payoutPeriods:result.value.payoutPeriods.map(p=>p.id===id?{...p,paidRef:reference,recordedBy:auth.user.id,paymentNote:body.note.trim(),paymentMethod:'external_transfer'}:p),ledgerEntries:result.value.ledgerEntries.map(entry=>entry.refId===id?{...entry,note:'Chuyển khoản ngoài hệ thống: '+reference}:entry)};
  next=audit(next,auth.actor,'Ghi nhận chi trả ngoài hệ thống',id,at,reference);
  await db.save(next);await db.audit(auth.user.id,'manual-payout-recorded',id,reference);
  return {period:next.payoutPeriods.find(p=>p.id===id)};
}
