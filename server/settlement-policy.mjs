import {assert} from './security.mjs';
import {audit} from '../src/domain/state.ts';

export async function saveSettlementPolicy(body,{db,auth}){
  assert(auth.user.role==='admin'&&auth.user.adminGroup==='operations',403,'Chỉ Vận hành lưu chính sách chi trả đã được phê duyệt.');
  assert(body.confirmed===true,400,'Xác nhận chính sách đã được đơn vị vận hành phê duyệt.');
  for(const [key,max]of [['reservePercent',100],['reserveDays',365],['minimumPayout',1000000000],['payoutFee',10000000]])assert(Number.isSafeInteger(body[key])&&body[key]>=0&&body[key]<=max,400,'Tham số chi trả phải là số nguyên trong giới hạn.');
  assert(body.reservePercent===0||body.reserveDays>=1,400,'Giữ lại tiền phải có thời gian giữ ít nhất 1 ngày.');
  assert(typeof body.approvalReference==='string'&&body.approvalReference.trim().length>=10&&body.approvalReference.length<=1000,400,'Nhập căn cứ phê duyệt từ 10–1.000 ký tự.');
  const {state}=await db.read(),previous=state.params.settlementPolicy;
  assert(body.revision===(previous?.revision??0),409,'Chính sách đã được người khác cập nhật. Tải lại trước khi lưu.');
  const at=new Date(),policy={revision:(previous?.revision??0)+1,reservePercent:body.reservePercent,reserveDays:body.reserveDays,minimumPayout:body.minimumPayout,payoutFee:body.payoutFee,approvalReference:body.approvalReference.trim(),approvedBy:auth.user.id,approvedAt:at.toISOString()};
  state.params={...state.params,settlementPolicy:policy};
  state.paramHistory.unshift({key:'settlementPolicy',code:'OI-16',by:auth.user.name,at:at.toISOString(),oldValue:previous??null,newValue:policy,reason:policy.approvalReference});
  await db.save(audit(state,auth.actor,'Lưu chính sách chi trả HTX','OI-16',at,policy.approvalReference));
  await db.audit(auth.user.id,'settlement-policy-saved',String(policy.revision));
  return {policy};
}
