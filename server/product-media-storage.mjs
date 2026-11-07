import {randomUUID} from 'node:crypto';
import {assert} from './security.mjs';
const BUCKET='product-media',MAX=10*1024*1024;
const EXT={'video/mp4':'mp4','model/gltf-binary':'glb','model/vnd.usdz+zip':'usdz','application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
export async function beginMediaUpload(root,body,{db,auth,options}){
  assert(options.supabaseAdmin&&options.supabaseUrl,503,'Tệp lớn cần cấu hình Supabase Storage riêng tư ở máy chủ.');
  assert(typeof body.mime==='string'&&Object.hasOwn(EXT,body.mime)&&Number.isSafeInteger(body.size)&&body.size>8&&body.size<=(body.mime==='video/mp4'?MAX:5*1024*1024),400,'Định dạng hoặc kích thước tệp không hợp lệ.');
  const storage=options.supabaseAdmin.storage,policy={public:false,fileSizeLimit:MAX,allowedMimeTypes:Object.keys(EXT)};
  const current=await storage.getBucket(BUCKET);
  if(current.error){const created=await storage.createBucket(BUCKET,policy);if(created.error){const again=await storage.getBucket(BUCKET);assert(again.data&&!again.data.public,503,'Chưa tạo được kho phương tiện riêng tư.');}}
  else {assert(!current.data.public,503,'Kho product-media phải để riêng tư.');if(!current.data.file_size_limit||Number(current.data.file_size_limit)>MAX){const updated=await storage.updateBucket(BUCKET,policy);assert(!updated.error,503,'Chưa giới hạn được dung lượng kho phương tiện.');}}
  const id=randomUUID(),path=root+'/'+id+'.'+EXT[body.mime],signed=await storage.from(BUCKET).createSignedUploadUrl(path,{upsert:false});
  assert(!signed.error&&signed.data?.signedUrl,502,'Chưa cấp được đường tải tệp.');
  const url=new URL(signed.data.signedUrl);assert(url.protocol==='https:'&&url.origin===new URL(options.supabaseUrl).origin,502,'Đường tải tệp không thuộc kho đã cấu hình.');
  await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(id,'product-media-upload',auth.user.id,db.encodeJSON({path,mime:body.mime,size:body.size,productId:root}),Date.now()+86400000);
  return {id,url:url.href};
}
export async function completeMediaUpload(root,id,{db,auth,options},validate){
  assert(options.supabaseAdmin,503,'Chưa cấu hình kho phương tiện.');
  const existing=await db.sql.prepare("SELECT owner_id,data FROM feature_records WHERE id=? AND kind='product-media-asset'").get(id);
  if(existing){const saved=db.decodeJSON(existing.data);assert(existing.owner_id===auth.user.id&&saved.productId===root,403,'Tệp không thuộc tài khoản hoặc sản phẩm.');return {id,size:saved.size};}
  const row=await db.sql.prepare("SELECT owner_id,data,expires_at FROM feature_records WHERE id=? AND kind='product-media-upload'").get(id);assert(row&&row.owner_id===auth.user.id&&Number(row.expires_at)>Date.now(),404,'Phiên tải tệp đã hết hạn hoặc không thuộc tài khoản.');
  const file=db.decodeJSON(row.data);assert(file.productId===root,403,'Tệp không thuộc sản phẩm.');
  const result=await options.supabaseAdmin.storage.from(BUCKET).download(file.path);assert(!result.error&&result.data,502,'Chưa đọc được tệp đã tải.');assert(result.data.size===file.size,400,'Dung lượng thực tế không khớp tệp đã khai báo.');
  const bytes=Buffer.from(await result.data.arrayBuffer());validate(file.mime,bytes);
  await db.transaction(async()=>{const current=await db.sql.prepare('SELECT kind,owner_id,expires_at FROM feature_records WHERE id=?').get(id);assert(current&&current.owner_id===auth.user.id&&['product-media-upload','product-media-asset'].includes(current.kind)&&(Number(current.expires_at)===0||Number(current.expires_at)>Date.now()),409,'Phiên tải đã hết hạn. Vui lòng tải lại.');if(current.kind==='product-media-asset')return;await db.sql.prepare('UPDATE feature_records SET kind=?,data=? WHERE id=?').run('product-media-asset',db.encodeJSON({mime:file.mime,size:bytes.length,productId:root,storagePath:file.path}),id);await db.audit(auth.user.id,'product-media-upload',root);});return {id,size:bytes.length};
}
export async function signProductAsset(asset,options){
  assert(options.supabaseAdmin,503,'Chưa kết nối kho phương tiện.');const result=await options.supabaseAdmin.storage.from(BUCKET).createSignedUrl(asset.storagePath,300);assert(!result.error&&result.data?.signedUrl,502,'Chưa mở được phương tiện.');return result.data.signedUrl;
}

export async function cleanProductMedia(db,options){
  const rows=await db.sql.prepare("SELECT id FROM feature_records WHERE kind IN ('product-media-asset','product-media-upload','product-media-gc') AND expires_at>0 AND expires_at<? LIMIT 20").all(Date.now());
  for(const candidate of rows){
    const data=await db.transaction(async()=>{const row=await db.sql.prepare("SELECT kind,data,expires_at FROM feature_records WHERE id=? AND kind IN ('product-media-asset','product-media-upload','product-media-gc')").get(candidate.id);if(!row||Number(row.expires_at)===0||Number(row.expires_at)>=Date.now())return null;await db.sql.prepare("UPDATE feature_records SET kind='product-media-gc' WHERE id=?").run(candidate.id);return db.decodeJSON(row.data);});
    if(!data)continue;const path=data.storagePath??data.path;
    if(path){if(!options.supabaseAdmin)continue;const result=await options.supabaseAdmin.storage.from(BUCKET).remove([path]);if(result.error)continue;}
    await db.sql.prepare("DELETE FROM feature_records WHERE id=? AND kind='product-media-gc'").run(candidate.id);
  }
}
