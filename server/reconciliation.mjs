import {hash,assert} from './security.mjs';
import {parseCsv} from './xlsx.mjs';
import {reportBounds} from './report-filters.mjs';
import {randomUUID} from 'node:crypto';
export async function reconciliationRoute(method,body,{db,auth}){
  assert(auth.user.role==='admin'&&['root','finance'].includes(auth.user.adminGroup),403,'Chỉ Tài chính đối soát.');
  if(method==='GET'){const rows=await db.sql.prepare("SELECT * FROM feature_records WHERE kind='reconciliation' ORDER BY expires_at DESC LIMIT 100").all();const reviews=await db.sql.prepare("SELECT * FROM feature_records WHERE kind='reconciliation-review' ORDER BY expires_at DESC").all();return {items:rows.map(r=>({id:r.id,...db.decodeJSON(r.data),reviews:reviews.filter(x=>x.owner_id===r.id).map(x=>db.decodeJSON(x.data))}))};}
  if(method==='POST'&&body.reviewSessionId){
    assert(typeof body.reviewSessionId==='string'&&body.reviewSessionId.length<=100,400,'Mã phiên đối soát không hợp lệ.');
    const record=await db.sql.prepare("SELECT data FROM feature_records WHERE id=? AND kind='reconciliation'").get(body.reviewSessionId);assert(record,404,'Không tìm thấy phiên đối soát.');
    const session=db.decodeJSON(record.data),row=session.rows[body.rowIndex];
    assert(Number.isInteger(body.rowIndex)&&row&&row.status!=='matched',400,'Chọn dòng chênh lệch cần kiểm tra.');
    assert(['reviewed','reopened'].includes(body.status)&&typeof body.note==='string'&&body.note.trim().length>=10&&body.note.length<=2000,400,'Chọn trạng thái và ghi kết luận ít nhất 10 ký tự, tối đa 2.000.');
    const review={rowIndex:body.rowIndex,status:body.status,note:body.note.trim(),by:auth.user.id,at:new Date().toISOString()};
    await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(randomUUID(),'reconciliation-review',body.reviewSessionId,db.encodeJSON(review),Date.now());
    await db.audit(auth.user.id,'reconciliation-review',body.reviewSessionId,`${body.rowIndex}: ${body.status}`);return {review};
  }
  assert(method==='POST',405,'Thao tác không hỗ trợ.');assert(typeof body.csv==='string'&&body.csv.length<=2000000,400,'CSV tối đa 2 MB.');assert(['payment','refund','cod'].includes(body.kind),400,'Chọn thu online, hoàn hoặc COD.');assert(typeof body.provider==='string'&&/^[\w .-]{2,60}$/.test(body.provider),400,'Tên đối tác không hợp lệ.');
  const input=parseCsv(body.csv),header=input.shift();assert(header?.join(',')==='orderId,amount,reference',400,'CSV cần đúng tiêu đề: orderId,amount,reference');assert(input.length>0&&input.length<=5000,400,'Tối đa 5.000 dòng.');
  const scope=body.scope??null;let bounds;
  if(scope){assert(typeof scope==='object'&&!Array.isArray(scope)&&scope.from&&scope.to,400,'Phạm vi cần đủ từ ngày và đến ngày đặt đơn.');bounds=reportBounds(scope);}
  const id='reconcile-'+hash(body.provider+'|'+body.kind+'|'+body.csv+'|'+JSON.stringify(scope)),existing=await db.sql.prepare('SELECT id FROM feature_records WHERE id=?').get(id);if(existing)return {id,duplicate:true};
  const {state}=await db.read(),at=new Date().toISOString(),seen=new Set();const prior=await db.sql.prepare("SELECT data FROM feature_records WHERE kind='reconciliation'").all();const used=new Set(prior.flatMap(r=>{const p=db.decodeJSON(r.data);return p.provider===body.provider&&p.kind===body.kind?p.rows.filter(x=>x.status==='matched').map(x=>x.reference):[];}));
  const orderIds=new Set();
  const inScope=order=>!scope||(Date.parse(order.createdAt)>=bounds.from&&Date.parse(order.createdAt)<bounds.to&&(!scope.coopId||order.coopId===scope.coopId));
  const expectedFor=order=>body.kind==='payment'?order.amountPaidOnline:body.kind==='cod'?order.codCollected:state.refunds.filter(r=>r.orderId===order.id&&r.status==='refunded').reduce((s,r)=>s+r.amount,0);
  const rows=input.map(row=>{
    const [orderId,raw,reference]=row,amount=Number(raw);assert(row.length===3&&typeof orderId==='string'&&orderId.trim()&&orderId.length<=100&&/^\d+$/.test(raw)&&Number.isSafeInteger(amount)&&amount>=0&&reference?.length>=3&&reference.length<=100,400,'Dòng CSV không hợp lệ.');
    assert(!orderIds.has(orderId),400,'Một đơn chỉ có một tổng tiền trong bảng kê. Gộp các giao dịch của đơn trước khi nhập.');orderIds.add(orderId);
    const key=reference;assert(!seen.has(key),400,'CSV trùng mã tham chiếu.');seen.add(key);const order=state.orders.find(o=>o.id===orderId);
    assert(!order||inScope(order),400,'Bảng kê chứa đơn ngoài phạm vi ngày/HTX đã chọn.');
    const expected=order?expectedFor(order):null;
    const status=used.has(reference)?'duplicate':expected===null?'missing_order':expected===amount&&amount>0?'matched':'difference';
    if(status==='matched'&&body.kind==='cod')order.reconciledCod={reference,at,sessionId:id};
    return {orderId,amount,reference,expected,status,difference:expected===null?null:amount-expected};
  });
  if(scope)for(const order of state.orders.filter(inScope))if(!orderIds.has(order.id)&&expectedFor(order)>0)rows.push({orderId:order.id,amount:0,reference:'',expected:expectedFor(order),status:'missing_partner',difference:-expectedFor(order)});
  assert(rows.length<=10000,413,'Phạm vi đối chiếu quá lớn. Thu hẹp khoảng ngày/HTX.');
  const data={provider:body.provider,kind:body.kind,at,scope,createdBy:auth.user.id,rows};await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(id,'reconciliation',auth.user.id,db.encodeJSON(data),Date.now());await db.save(state);await db.audit(auth.user.id,'reconciliation-import',id,`${rows.length} rows`);return {id,...data};
}
