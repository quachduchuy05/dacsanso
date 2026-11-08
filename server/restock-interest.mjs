import {createHash} from 'node:crypto';
import {assert} from './security.mjs';
import {normalizePhone,isValidPhone} from '../src/domain/phone.ts';
import {remainingFor} from '../src/domain/state.ts';
import {isOrderableIn} from '../src/domain/cart.ts';
const KIND='restock-interest';
const operations=auth=>auth?.user.role==='admin'&&['root','operations'].includes(auth.user.adminGroup);
const available=(state,p)=>p?.kind==='ready'&&isOrderableIn(state,p)&&remainingFor(state,p)>0;

export async function restockInterest(method,body,{db,auth}){
  const {state}=await db.read();
  if(method==='GET'){
    assert(operations(auth),403,'Không có quyền xem đăng ký báo có hàng.');
    const rows=await db.sql.prepare('SELECT id,data FROM feature_records WHERE kind=?').all(KIND);
    return {items:rows.map(row=>{const data=db.decodeJSON(row.data),p=state.products.find(p=>p.id===data.productId);return {id:row.id,...data,productName:p?.name??data.productId,unit:p?.unit,available:!!available(state,p)};})};
  }
  assert(method==='POST',405,'Thao tác không hỗ trợ.');
  if(body.action==='mark_notified'){
    assert(operations(auth),403,'Không có quyền cập nhật đăng ký.');
    assert(typeof body.note==='string'&&body.note.trim().length>=3&&body.note.length<=500,400,'Ghi kênh liên hệ và kết quả đã báo cho khách.');
    const row=await db.sql.prepare('SELECT data FROM feature_records WHERE id=? AND kind=?').get(body.id,KIND);assert(row,404,'Không tìm thấy đăng ký.');
    const data=db.decodeJSON(row.data);assert(available(state,state.products.find(p=>p.id===data.productId)),409,'Sản phẩm chưa có hàng để báo.');
    if(data.status==='notified')return {ok:true};
    await db.sql.prepare('UPDATE feature_records SET data=? WHERE id=? AND kind=?').run(db.encodeJSON({...data,status:'notified',notifiedAt:new Date().toISOString(),notifiedBy:auth.user.id,note:body.note.trim()}),body.id,KIND);
    await db.audit(auth.user.id,'restock-notified',body.id);return {ok:true};
  }
  assert(body.action===undefined||body.action==='subscribe',400,'Thao tác không hợp lệ.');
  assert(!auth||auth.user.role==='customer',403,'Chỉ khách hàng đăng ký báo có hàng.');
  const p=state.products.find(p=>p.id===body.productId);assert(p?.status==='active'&&p.kind==='ready',400,'Chỉ đăng ký cho hàng có sẵn đang bán.');
  assert(!available(state,p),409,'Sản phẩm đã có hàng. Bạn có thể thêm vào giỏ.');
  const phone=auth?undefined:normalizePhone(typeof body.phone==='string'?body.phone:'');
  assert(body.consent===true&&(auth||isValidPhone(phone)),400,'Cần đồng ý nhận tin và số điện thoại hợp lệ.');
  const owner=auth?.user.id??phone,id='restock-'+createHash('sha256').update(p.id+'|'+owner).digest('hex');
  assert(await db.rate('restock:'+createHash('sha256').update(owner).digest('hex'),10,3600000),429,'Bạn đăng ký quá nhiều lần. Vui lòng thử lại sau.');
  const row=await db.sql.prepare('SELECT data FROM feature_records WHERE id=? AND kind=?').get(id,KIND);
  if(row&&db.decodeJSON(row.data).status==='waiting')return {ok:true};
  await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(id,KIND,auth?.user.id??'ops',db.encodeJSON({productId:p.id,userId:auth?.user.id,phone,consent:true,status:'waiting',at:new Date().toISOString()}),0);
  return {ok:true};
}

/** Runs inside the existing job transaction: mark and notify atomically, once per subscription. */
export async function processRestock(db){
  const rows=await db.sql.prepare('SELECT id,data FROM feature_records WHERE kind=?').all(KIND);
  if(!rows.length)return;
  const {state}=await db.read();let changed=false;
  for(const row of rows){const data=db.decodeJSON(row.data);if(data.status!=='waiting'||!data.userId)continue;
    const user=state.users.find(u=>u.id===data.userId&&u.status==='active'&&u.role==='customer'),p=state.products.find(p=>p.id===data.productId);
    if(!user||!available(state,p))continue;
    const at=new Date().toISOString();state.notifications.unshift({id:row.id+'-'+Date.now(),userId:user.id,at,title:'Sản phẩm bạn chờ đã có hàng',body:`${p.name} · ${p.unit}. Xem giá và số lượng hiện tại trước khi đặt.`,link:{type:'product',id:p.id},read:false});
    await db.sql.prepare('UPDATE feature_records SET data=? WHERE id=? AND kind=?').run(db.encodeJSON({...data,status:'notified',notifiedAt:at,channel:'in_app'}),row.id,KIND);changed=true;
  }
  if(changed)await db.save(state);
}
