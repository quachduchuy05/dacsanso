import {randomUUID} from 'node:crypto';
import {assert} from './security.mjs';
import {validateMediaReferences} from './media.mjs';
export async function productDraftRoute(path,method,body,{db,auth}){
  if(!path.startsWith('/api/v1/product-drafts'))return null;
  assert(auth.user.role==='admin'&&auth.user.adminGroup==='quality',403,'Chỉ Admin – Chất lượng sử dụng bản nháp sản phẩm.');
  const owner=auth.user.id;
  const {state}=await db.read();
  await db.sql.prepare("DELETE FROM feature_records WHERE kind='product-draft' AND expires_at<?").run(Date.now());
  if(path==='/api/v1/product-drafts'&&method==='GET'){
    const rows=await db.sql.prepare("SELECT * FROM feature_records WHERE kind='product-draft' AND owner_id=? ORDER BY expires_at DESC").all(owner);
    return {items:rows.map(row=>({id:row.id,...db.decodeJSON(row.data),expiresAt:row.expires_at}))};
  }
  const id=path.split('/')[4];
  if(id){const row=await db.sql.prepare("SELECT * FROM feature_records WHERE id=? AND kind='product-draft' AND owner_id=?").get(id,owner);assert(row,404,'Không tìm thấy bản nháp.');}
  if(method==='DELETE'&&id){await db.sql.prepare('DELETE FROM feature_records WHERE id=? AND owner_id=?').run(id,owner);await db.audit(auth.user.id,'product-draft-delete',id);return {ok:true};}
  if(method==='POST'){
    assert(body.form&&typeof body.form==='object'&&!Array.isArray(body.form),400,'Bản nháp không hợp lệ.');
    const form={};for(const key of ['coopId','traceUrl','name','description','unit','category','catalogCategoryId','region','kind','price','stock','slots','from','to','storage','shelfLifeDays','preparationMinutes'])if(typeof body.form[key]==='string'&&body.form[key].length<=5000)form[key]=body.form[key];
    const images=body.images??[];
    assert(Array.isArray(images)&&images.length<=6&&images.every(s=>typeof s==='string'&&/^(data:image\/(jpeg|png|webp);base64,|sb:\/\/)/.test(s)&&s.length<=1000000),400,'Bản nháp tối đa 6 ảnh hợp lệ.');
    validateMediaReferences(images,state,auth.user);
    const harvestMonths=body.harvestMonths??[];
    assert(Array.isArray(harvestMonths)&&harvestMonths.length<=12&&harvestMonths.every(m=>Number.isInteger(m)&&m>=1&&m<=12)&&new Set(harvestMonths).size===harvestMonths.length,400,'Tháng thu hoạch không hợp lệ.');
    const draftId=id??randomUUID(),expiresAt=Date.now()+30*86400000;
    const data=db.encodeJSON({form,images,harvestMonths,updatedAt:new Date().toISOString()});
    if(id)await db.sql.prepare('UPDATE feature_records SET data=?,expires_at=? WHERE id=? AND owner_id=?').run(data,expiresAt,draftId,owner);
    else {const count=(await db.sql.prepare("SELECT id FROM feature_records WHERE kind='product-draft' AND owner_id=?").all(owner)).length;assert(count<100,400,'Tối đa 100 bản nháp.');await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(draftId,'product-draft',owner,data,expiresAt);}
    await db.audit(auth.user.id,'product-draft-save',draftId);return {id:draftId,expiresAt};
  }
  assert(false,405,'Thao tác không hỗ trợ.');
}
