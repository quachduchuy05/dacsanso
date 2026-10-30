import {randomBytes} from 'node:crypto';
import {assert,hash} from './security.mjs';

const keyFor=product=>'product-edit-'+(product.variantOf??product.id);
export async function productLockRoute(productId,method,body,{db,auth}){
  const {state}=await db.read(),product=state.products.find(p=>p.id===productId);
  assert(product&&auth.user.role==='admin'&&auth.user.adminGroup==='quality',403,'Chỉ Admin – Chất lượng được khóa biên tập sản phẩm.');
  assert(['POST','DELETE'].includes(method),405,'Thao tác khóa không hỗ trợ.');
  const id=keyFor(product),record=await db.sql.prepare("SELECT * FROM feature_records WHERE id=? AND kind='product-edit-lock'").get(id);
  const active=record&&record.expires_at>Date.now(),lease=active?db.decodeJSON(record.data):null;
  const matches=lease&&record.owner_id===auth.user.id&&typeof body.token==='string'&&lease.tokenHash===hash(body.token);
  if(method==='DELETE'){
    assert(!active||matches,409,'Khóa thuộc phiên chỉnh sửa khác.');
    if(record)await db.sql.prepare('DELETE FROM feature_records WHERE id=?').run(id);
    return {released:true};
  }
  assert(!active||matches,409,'Sản phẩm đang được chỉnh sửa ở phiên khác. Đóng phiên đó hoặc chờ tối đa 5 phút.');
  const token=matches?body.token:randomBytes(32).toString('base64url'),expiresAt=Date.now()+300000;
  const data=db.encodeJSON({tokenHash:hash(token)});
  if(record)await db.sql.prepare('UPDATE feature_records SET owner_id=?,data=?,expires_at=? WHERE id=?').run(auth.user.id,data,expiresAt,id);
  else await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(id,'product-edit-lock',auth.user.id,data,expiresAt);
  return {token,expiresAt};
}
export async function requireProductLock(db,state,user,command){
  if(!['coopRequestContentChange','qualityEditProduct'].includes(command.name))return;
  const product=state.products.find(p=>p.id===command.args?.[0]);assert(product,404,'Không tìm thấy sản phẩm.');
  const record=await db.sql.prepare("SELECT * FROM feature_records WHERE id=? AND kind='product-edit-lock'").get(keyFor(product));
  assert(record&&record.expires_at>Date.now()&&record.owner_id===user.id&&typeof command.editToken==='string'&&db.decodeJSON(record.data).tokenHash===hash(command.editToken),409,'Phiên chỉnh sửa đã hết hạn hoặc thuộc phiên khác. Mở lại form sản phẩm.');
}
