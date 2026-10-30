import {assert,hash} from './security.mjs';
import {randomUUID} from 'node:crypto';

export async function adjustmentRoute(method,body,{db,auth}){
  const user=auth.user;
  assert(user.role==='admin'&&user.adminGroup==='finance',403,'Chỉ Tài chính xử lý bút toán chênh lệch.');
  const records=await db.sql.prepare("SELECT id,data FROM feature_records WHERE kind='reconciliation-adjustment'").all();
  const items=records.map(r=>({id:r.id,...db.decodeJSON(r.data)}));
  if(method==='GET')return {items:items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))};
  assert(method==='POST',405,'Thao tác không hỗ trợ.');
  const {state}=await db.read();
  if(body.action==='propose'){
    assert(typeof body.sessionId==='string'&&Number.isInteger(body.rowIndex),400,'Chọn phiên và dòng đối soát.');
    const sessionRecord=await db.sql.prepare("SELECT data FROM feature_records WHERE id=? AND kind='reconciliation'").get(body.sessionId);assert(sessionRecord,404,'Không tìm thấy phiên đối soát.');
    const session=db.decodeJSON(sessionRecord.data),row=session.rows[body.rowIndex];
    assert(row&&['difference','missing_partner'].includes(row.status)&&Number.isSafeInteger(row.difference)&&row.difference!==0,422,'Chỉ lập bút toán cho dòng chênh lệch xác định được số tiền và đơn.');
    const order=state.orders.find(o=>o.id===row.orderId);assert(order,409,'Đơn không còn trong hệ thống.');
    assert(typeof body.evidence==='string'&&body.evidence.trim().length>=3&&body.evidence.trim().length<=100,400,'Mã chứng từ từ 3–100 ký tự.');
    assert(typeof body.note==='string'&&body.note.trim().length>=20&&body.note.trim().length<=2000,400,'Giải trình từ 20–2.000 ký tự.');
    assert(body.confirm===true,400,'Cần xác nhận đã kiểm tra chứng từ.');
    const amount=(session.kind==='refund'?-1:1)*row.difference;
    assert(body.amount===amount,400,'Số tiền điều chỉnh phải đúng chênh lệch có dấu của dòng đối soát.');
    const fingerprint=hash(JSON.stringify([session.provider,session.kind,row.orderId,row.reference,row.amount,row.expected]));
    const existing=items.find(i=>i.fingerprint===fingerprint&&!['rejected','cancelled'].includes(i.status));
    if(existing)return {id:existing.id,status:existing.status,duplicate:true};
    const id=randomUUID(),item={sessionId:body.sessionId,rowIndex:body.rowIndex,orderId:order.id,coopId:order.coopId,provider:session.provider,kind:session.kind,amount,fingerprint,evidence:body.evidence.trim(),note:body.note.trim(),status:'proposed',createdBy:user.id,createdAt:new Date().toISOString(),history:[]};
    await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(id,'reconciliation-adjustment',user.id,db.encodeJSON(item),0);
    await db.audit(user.id,'adjustment-proposed',id,JSON.stringify({sessionId:item.sessionId,rowIndex:item.rowIndex,amount}));return {id,status:item.status};
  }
  const item=items.find(i=>i.id===body.id);assert(item,404,'Không tìm thấy đề xuất.');
  if(item.status==='posted'&&body.action==='approve')return {id:item.id,status:'posted',duplicate:true};
  assert(item.status==='proposed',409,'Đề xuất đã được xử lý.');
  assert(['approve','reject','cancel'].includes(body.action),400,'Thao tác không hợp lệ.');
  assert(typeof body.note==='string'&&body.note.trim().length>=20&&body.note.trim().length<=2000,400,'Ghi rõ căn cứ xử lý từ 20–2.000 ký tự.');
  if(body.action==='cancel')assert(item.createdBy===user.id,403,'Chỉ người lập được rút đề xuất.');
  else assert(item.createdBy!==user.id,403,'Người lập không tự duyệt hoặc từ chối đề xuất của mình. Cần một nhân viên Tài chính khác.');
  if(body.action==='approve'){
    assert(body.confirm===true,400,'Xác nhận đã kiểm tra chứng từ và số tiền.');
    assert(state.users.some(u=>u.id===item.createdBy&&u.status==='active'&&u.role==='admin'&&u.adminGroup==='finance'),409,'Người lập không còn quyền Tài chính. Cần lập lại đề xuất.');
    assert(state.orders.some(o=>o.id===item.orderId&&o.coopId===item.coopId),409,'Đơn/HTX của đề xuất không còn hợp lệ.');
    const ledgerRef='reconcile-adjustment:'+item.id;
    assert(!state.ledgerEntries.some(e=>e.refId===ledgerRef),409,'Đã có dòng sổ cho đề xuất.');
    const ledgerId=randomUUID();
    state.ledgerEntries.push({id:ledgerId,at:new Date().toISOString(),type:'reconciliation_adjustment',amount:item.amount,orderId:item.orderId,coopId:item.coopId,refId:ledgerRef,note:JSON.stringify({evidence:item.evidence,reason:item.note,approval:body.note.trim(),createdBy:item.createdBy,approvedBy:user.id,sessionId:item.sessionId,rowIndex:item.rowIndex})});
    await db.save(state);item.status='posted';item.ledgerId=ledgerId;item.approvedBy=user.id;
  }else item.status=body.action==='cancel'?'cancelled':'rejected';
  item.history.push({action:body.action,by:user.id,at:new Date().toISOString(),note:body.note.trim()});
  const {id,...data}=item;
  await db.sql.prepare('UPDATE feature_records SET data=? WHERE id=?').run(db.encodeJSON(data),id);
  await db.audit(user.id,'adjustment-'+body.action,id,JSON.stringify({amount:item.amount,status:item.status}));return {id,status:item.status};
}
