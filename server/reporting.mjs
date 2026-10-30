import {assert} from './security.mjs';
import {exportReport} from '../src/domain/reports.ts';
import {reportBounds} from './report-filters.mjs';
import {auditFilterSql} from './audit-context.mjs';
import {readReportSnapshot} from './report-snapshots.mjs';
export function canExportKind(user,kind){
  const general=['summary','orders','coops','products'];
  if(user.role==='coop')return ['summary','orders','settlements'].includes(kind);
  if(user.role==='regulator')return general.includes(kind);
  if(user.role!=='admin')return false;
  if(user.adminGroup==='root')return kind==='audit';
  if(user.adminGroup==='finance')return [...general,'ledger','settlements'].includes(kind);
  if(user.adminGroup==='operations')return general.includes(kind);
  return user.adminGroup==='cskh'&&['tickets','reviews'].includes(kind);
}
export const csvRows=rows=>'\uFEFF'+rows.map(row=>row.map(value=>{let s=String(value??'');if(/^[\s\x00-\x1f]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\n');
export async function filteredReport(db,auth,body,now,frozenSource){
  assert(['summary','orders','coops','products','ledger','audit','tickets','reviews','settlements'].includes(body.kind),400,'Loại báo cáo không hợp lệ.');
  assert(canExportKind(auth.user,body.kind),403,'Nhóm quyền không được xuất loại báo cáo này.');
  const filters={...(body.filters??{})};assert(!Array.isArray(body.filters)&&(!body.filters||typeof body.filters==='object'),400,'Bộ lọc không hợp lệ.');
  const seller=auth.user.role==='coop';
  if(seller){assert(['summary','orders','settlements'].includes(body.kind),403,'HTX chỉ xuất báo cáo tổng hợp, đơn ẩn danh và đối soát của mình.');assert(!filters.coopId||filters.coopId===auth.user.coopId,403,'Không được xuất dữ liệu HTX khác.');filters.coopId=auth.user.coopId;}
  assert(!body.dataAsOf||(Number.isFinite(Date.parse(body.dataAsOf))&&Date.parse(body.dataAsOf)>=now.getTime()-60000&&Date.parse(body.dataAsOf)<=now.getTime()),409,'Dữ liệu xem trước đã cũ hoặc thời điểm không hợp lệ. Vui lòng tải lại báo cáo.');
  let source;
  if(frozenSource){source=frozenSource;now=new Date(source.statsAt);}else if(body.snapshotId){assert(['summary','orders'].includes(body.kind),400,'Phiên dashboard chỉ dùng cho tổng hợp và đơn ẩn danh.');source=await readReportSnapshot(db,auth.user,body.snapshotId);now=new Date(source.statsAt);}else source=await db.read();
  const {from,to}=reportBounds(filters,now);
  const state=structuredClone(source.state),groups=auth.user.adminGroup;
  const time=x=>{const t=Date.parse(x);return t>=from&&t<to;};const coop=id=>!filters.coopId||id===filters.coopId;
  state.coops=state.coops.filter(c=>coop(c.id)&&(!filters.region||c.region===filters.region));const ids=new Set(state.coops.map(c=>c.id));
  state.products=state.products.filter(p=>ids.has(p.coopId));
  state.orders=state.orders.filter(o=>time(o.createdAt)&&ids.has(o.coopId)&&(!filters.status||o.status===filters.status));
  state.tickets=state.tickets.filter(t=>time(t.createdAt)&&ids.has(t.coopId)&&(!filters.status||t.status===filters.status)&&(!filters.priority||t.priority===filters.priority));
  const products=new Set(state.products.filter(p=>ids.has(p.coopId)).map(p=>p.id));state.reviews=state.reviews.filter(r=>time(r.createdAt)&&products.has(r.productId)&&(!filters.status||r.status===filters.status));
  let rows,filename=body.kind+'-'+now.toISOString().slice(0,10)+'.csv';
  if(body.kind==='coops'||body.kind==='products'){
    assert(['admin','regulator'].includes(auth.user.role),403,'Không có quyền xuất danh mục.');
    rows=body.kind==='coops'?[['Mã HTX','Tên HTX','Vùng','Trạng thái'],...state.coops.filter(c=>!filters.status||c.status===filters.status).map(c=>[c.id,c.name,c.region,c.status])]:[['Mã sản phẩm','Tên sản phẩm','HTX','Vùng','Nhóm hàng','Hình thức bán','Trạng thái'],...state.products.filter(p=>(auth.user.role==='admin'||p.status==='active')&&(!filters.status||p.status===filters.status)).map(p=>[p.id,p.name,state.coops.find(c=>c.id===p.coopId)?.name,p.region,p.category,p.kind,p.status])];
    assert(rows.length<=50001,413,'Thu hẹp bộ lọc, tối đa 50.000 dòng.');
    return {filename,content:csvRows(rows),filters,version:source.version};
  }
  if(['summary','orders'].includes(body.kind)){const r=exportReport(state,seller?{kind:'regulator'}:auth.actor,body.kind,now);assert(r.ok,403,r.error);return {...r.value,filters,version:source.version,...(source.dataAsOf?{dataAsOf:source.dataAsOf}:{} )};}
  if(body.kind==='settlements'){
    assert(seller||(auth.user.role==='admin'&&auth.user.adminGroup==='finance'),403,'Chỉ HTX xem của mình hoặc Tài chính xuất đối soát.');
    const periods=state.payoutPeriods.filter(p=>ids.has(p.coopId)&&time(p.closedAt));
    rows=[['Kỳ','HTX','Đơn','Tiền hàng','Đã hoàn','Thực giữ','Hoa hồng','Phí giao (không thuộc HTX)','Chi trả','Trạng thái'],...periods.flatMap(p=>p.lines.map(l=>[p.id,p.coopId,l.orderId,l.goods,l.refunded,l.retained,l.commission,l.shippingFee??'',l.payout,p.status]))];
    return {filename,content:csvRows(rows),filters,version:source.version};
  }
  assert(auth.user.role==='admin',403,'Báo cáo chỉ dành cho quản trị.');
  if(body.kind==='audit'){
    assert(groups==='root',403,'Chỉ Quản trị gốc xuất nhật ký.');let sql='SELECT * FROM audit_events WHERE at>=? AND at<?';const args=[new Date(from).toISOString(),to===Infinity?'9999-12-31':new Date(to).toISOString()];
    const extra=auditFilterSql(filters);sql+=extra.sql;args.push(...extra.args);
    const events=await db.sql.prepare(sql+' ORDER BY id LIMIT 50001').all(...args);assert(events.length<=50000,413,'Thu hẹp bộ lọc để xuất tối đa 50.000 dòng.');rows=[['Thời gian UTC','Người dùng','Hành động','Đối tượng','Chi tiết','Kết quả','Mã truy vết'],...events.map(e=>[e.at,e.user_id,e.action,e.target,e.detail,e.outcome,e.correlation_id])];
  }else if(body.kind==='ledger'){
    assert(['root','finance'].includes(groups),403,'Chỉ Tài chính xuất sổ.');const entries=state.ledgerEntries.filter(e=>time(e.at)&&(!e.coopId||ids.has(e.coopId)));rows=[['Ngày','Loại','Mã đơn','HTX','Số tiền','Tham chiếu'],...entries.map(e=>[e.at,e.type,e.orderId,e.coopId,e.amount,e.refId])];
  }else{
    assert(['root','cskh'].includes(groups),403,'Chỉ CSKH xem báo cáo này.');rows=body.kind==='tickets'?[['Mã ticket','Đơn','HTX','Lý do','Ưu tiên','Trạng thái','Quá hạn xử lý'],...state.tickets.map(t=>[t.id,t.orderId,t.coopId,t.reason,t.priority,t.status,['open','processing'].includes(t.status)&&Date.parse(t.resolveDueAt)<now.getTime()?'Có':'Không'])]:[['Mã đánh giá','Sản phẩm','Số sao','Trạng thái','Ngày'],...state.reviews.map(r=>[r.id,r.productId,r.stars,r.status,r.createdAt])];
  }
  assert(rows.length<=50001,413,'Thu hẹp bộ lọc, tối đa 50.000 dòng.');return {filename,content:csvRows(rows),filters,version:source.version};
}
