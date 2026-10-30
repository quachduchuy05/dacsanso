import {randomUUID} from 'node:crypto';
import {assert} from './security.mjs';
import {validateMediaReferences} from './media.mjs';
export async function saveContent(kind,body,{db,auth}){
  assert(auth.user.role==='admin'&&auth.user.adminGroup==='operations',403,'Chỉ Vận hành quản lý danh mục và nội dung trang chủ.');
  const {state}=await db.read();
  if(kind==='homepage'){
    for(const [field,max]of [['title',160],['subtitle',160],['description',1000],['collectionTitle',160]])assert(typeof body[field]==='string'&&body[field].trim().length>0&&body[field].length<=max,400,'Nhập đầy đủ nội dung trang chủ trong giới hạn.');
    assert(Array.isArray(body.featuredProductIds)&&body.featuredProductIds.length<=12&&new Set(body.featuredProductIds).size===body.featuredProductIds.length&&body.featuredProductIds.every(id=>state.products.some(p=>p.id===id&&p.status==='active')),400,'Bộ sưu tập tối đa 12 sản phẩm đang bán, không trùng.');
    assert(!body.image||(typeof body.image==='string'&&body.image.length<=1000000&&/^(\/images\/|data:image\/(jpeg|png|webp);base64,|sb:\/\/)/.test(body.image)),400,'Ảnh banner không hợp lệ.');validateMediaReferences(body.image,state,auth.user);
    state.homepage={title:body.title.trim(),subtitle:body.subtitle.trim(),description:body.description.trim(),collectionTitle:body.collectionTitle.trim(),image:body.image||'',featuredProductIds:body.featuredProductIds};
    await db.save(state);await db.audit(auth.user.id,'homepage-update');return {item:state.homepage};
  }
  assert(['region','unit','certification'].includes(body.kind)&&typeof body.name==='string'&&body.name.trim().length>=1&&body.name.length<=100&&typeof body.active==='boolean',400,'Danh mục và tên không hợp lệ.');
  const entries=state.catalogDictionaries??[],old=body.id?entries.find(e=>e.id===body.id):null;
  assert(!body.id||old,404,'Không tìm thấy mục danh mục.');
  assert(!entries.some(e=>e.id!==body.id&&e.kind===body.kind&&e.name.toLocaleLowerCase('vi')===body.name.trim().toLocaleLowerCase('vi')),409,'Tên danh mục đã tồn tại.');
  if(old&&(!body.active||body.name.trim()!==old.name||body.kind!==old.kind))assert(!state.products.some(p=>p.status==='active'&&(old.kind==='region'?p.region===old.name:old.kind==='unit'?p.unit===old.name:p.certifications?.some(c=>c.label===old.name))),409,'Mục đang dùng bởi sản phẩm đang bán, không thể đổi/ẩn.');
  const item={id:old?.id??randomUUID(),kind:body.kind,name:body.name.trim(),active:body.active};state.catalogDictionaries=[item,...entries.filter(e=>e.id!==item.id)];
  await db.save(state);await db.audit(auth.user.id,'dictionary-update',item.id);return {item};
}
