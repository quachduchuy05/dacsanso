import {randomUUID} from 'node:crypto';
import {assert} from './security.mjs';
export async function lotRoute(path,url,method,body,{db,auth}){
  const id=path.match(/^\/api\/v1\/lots\/([\w-]+)$/)?.[1];
  if(method==='GET'&&id){
    const row=await db.sql.prepare("SELECT data FROM feature_records WHERE id=? AND kind='product-lot'").get(id);assert(row,404,'Không tìm thấy lô hàng.');const lot=db.decodeJSON(row.data),{state}=await db.read();const p=state.products.find(p=>p.id===lot.productId);assert(p&&p.status==='active',404,'Sản phẩm không còn công khai.');
    const coop=state.coops.find(c=>c.id===p.coopId);return {lot:{id,...lot},product:{id:p.id,name:p.name,region:p.region,coopName:coop?.name,certifications:p.certifications?.filter(c=>c.verified&&c.validUntil>=new Date().toISOString().slice(0,10))}};
  }
  if(method==='GET'){
    const productId=url.searchParams.get('productId'),{state}=await db.read(),p=state.products.find(p=>p.id===productId);assert(p&&(p.status==='active'||auth?.user.coopId===p.coopId),404,'Không tìm thấy sản phẩm.');
    const rows=await db.sql.prepare("SELECT * FROM feature_records WHERE kind='product-lot' AND owner_id=? ORDER BY expires_at DESC LIMIT 500").all(p.coopId);
    return {items:rows.map(r=>({id:r.id,...db.decodeJSON(r.data)})).filter(r=>r.productId===p.id)};
  }
  assert(method==='POST'&&auth?.user.role==='coop',403,'Chỉ HTX tạo lô hàng.');const {state}=await db.read(),p=state.products.find(p=>p.id===body.productId&&p.coopId===auth.user.coopId);assert(p,403,'Sản phẩm không thuộc HTX.');
  assert(state.coops.some(c=>c.id===p.coopId&&c.status==='active'),403,'HTX đang tạm khóa.');
  assert(typeof body.code==='string'&&/^[\w .-]{3,60}$/.test(body.code),400,'Mã lô từ 3–60 ký tự chữ, số, dấu chấm/gạch.');
  for(const value of [body.harvestedOn,body.packedOn])assert(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value,400,'Ngày thu hoạch/đóng gói không hợp lệ.');
  assert(body.harvestedOn<=body.packedOn&&body.packedOn<=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}),400,'Ngày thu hoạch không sau đóng gói và không chọn ngày tương lai.');
  const rows=await db.sql.prepare("SELECT data FROM feature_records WHERE kind='product-lot' AND owner_id=?").all(p.coopId);assert(!rows.some(r=>db.decodeJSON(r.data).code===body.code.trim()),409,'Mã lô đã tồn tại trong HTX.');
  const lot={productId:p.id,coopId:p.coopId,code:body.code.trim(),harvestedOn:body.harvestedOn,packedOn:body.packedOn,createdAt:new Date().toISOString()},lotId=randomUUID();
  await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(lotId,'product-lot',p.coopId,db.encodeJSON(lot),Date.now());await db.audit(auth.user.id,'product-lot-create',lotId);return {lot:{id:lotId,...lot}};
}
