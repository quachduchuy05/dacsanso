import {randomUUID} from 'node:crypto';
import {assert} from './security.mjs';
import {adminGroupCan} from '../src/domain/adminPermissions.ts';
import {familyKey} from '../src/domain/variants.ts';
import {sortMedia,assetUrl} from '../src/domain/productMedia.ts';
import {beginMediaUpload,completeMediaUpload,signProductAsset} from './product-media-storage.mjs';
const MB=1024*1024;
const assetKind='product-media-asset',manifestKind='product-media-manifest';
const imageTypes=['image/jpeg','image/png','image/webp'];
const admin=auth=>auth?.user.role==='admin'&&adminGroupCan(auth.user.adminGroup,'quality');
function mp4Duration(bytes){
  function scan(start,end){for(let offset=start;offset+8<=end;){const size=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);if(size<8||offset+size>end)return null;if(type==='moov')return scan(offset+8,offset+size);if(type==='mvhd'){const v=bytes[offset+8],scaleAt=offset+(v===1?28:20),durationAt=scaleAt+4;if(durationAt+(v===1?8:4)>offset+size)return null;const scale=bytes.readUInt32BE(scaleAt);return scale?(v===1?Number(bytes.readBigUInt64BE(durationAt)):bytes.readUInt32BE(durationAt))/scale:null;}offset+=size;}return null;}
  return scan(0,bytes.length);
}
export function validateAsset(mime,bytes){
  assert(Buffer.isBuffer(bytes)&&bytes.length>8,400,'Tệp trống hoặc không hợp lệ.');
  if(imageTypes.includes(mime)){
    assert(bytes.length<=300*1024,413,'Ảnh sau nén không được vượt 300 KB.');
    assert(mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP',400,'Nội dung không khớp định dạng ảnh.');
  }else if(mime==='video/mp4'){
    assert(bytes.length<=10*MB&&bytes.toString('ascii',4,8)==='ftyp',400,'Video phải là MP4, tối đa 10 MB.');const duration=mp4Duration(bytes);assert(duration&&duration<=30,400,'Video phải có thời lượng hợp lệ, tối đa 30 giây.');
  }else if(mime==='model/gltf-binary'){
    assert(bytes.length<=5*MB&&bytes.toString('ascii',0,4)==='glTF'&&bytes.readUInt32LE(4)===2&&bytes.readUInt32LE(8)===bytes.length,400,'Mô hình web phải là GLB 2.0, tối đa 5 MB.');
    assert(bytes.length>=20&&bytes.readUInt32LE(16)===0x4e4f534a&&20+bytes.readUInt32LE(12)<=bytes.length,400,'Mô hình thiếu dữ liệu JSON.');
    let gltf;try{gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));}catch{assert(false,400,'Mô hình GLB lỗi.');}
    const inspect=value=>{if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){if(key==='uri')assert(typeof item==='string'&&item.startsWith('data:'),400,'GLB phải đóng gói tài nguyên trong tệp, không tham chiếu mạng.');if(typeof item==='object')inspect(item);}};inspect(gltf);
    assert(!gltf.extensionsRequired?.some(e=>['KHR_draco_mesh_compression','KHR_texture_basisu'].includes(e)),400,'Xuất GLB không dùng bộ giải mã tải từ mạng.');
  }else if(mime==='model/vnd.usdz+zip')assert(bytes.length<=5*MB&&bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===3&&bytes[3]===4,400,'Bản iPhone phải là USDZ, tối đa 5 MB.');
  else if(mime==='application/pdf')assert(bytes.length<=5*MB&&bytes.toString('ascii',0,5)==='%PDF-',400,'Phiếu đồng ý PDF tối đa 5 MB.');
  else assert(false,400,'Định dạng tệp không hỗ trợ.');
}
const loadManifest=async(db,id)=>{const row=await db.sql.prepare('SELECT data FROM feature_records WHERE id=? AND kind=?').get(id,manifestKind);return row?db.decodeJSON(row.data):{entries:[]};};
export async function productMediaRoute(path,method,body,{db,auth,res,headers={},options={},imageWidth}){
  if(path==='/api/v1/products/media-catalog'&&method==='GET'){
    const {state}=await db.read(),rows=await db.sql.prepare('SELECT owner_id,data FROM feature_records WHERE kind=?').all(manifestKind),items=[],posters={};
    for(const row of rows){const manifest=db.decodeJSON(row.data),active=state.products.some(p=>familyKey(p)===row.owner_id&&p.status==='active'),images=manifest.entries.map(e=>e.approved).filter(e=>e?.kind==='image');if(active&&images.length){const poster=assetUrl(sortMedia(images)[0].files[0]);posters[row.owner_id]=poster;if(images.length>=5)items.push({productId:row.owner_id,poster,topics:manifest.topics??[]});}}
    return {items,posters};
  }
  const assetMatch=path.match(/^\/api\/v1\/products\/media-assets\/([\w-]+)$/);
  if(assetMatch&&method==='GET'){
    const asset=await db.sql.prepare('SELECT owner_id,data FROM feature_records WHERE id=? AND kind=?').get(assetMatch[1],assetKind);assert(asset,404,'Không tìm thấy tệp.');
    const file=db.decodeJSON(asset.data);let allowed=admin(auth);
    if(!allowed){const {state}=await db.read();if(state.products.some(p=>familyKey(p)===file.productId&&p.status==='active')){const manifest=await loadManifest(db,'media-'+file.productId);allowed=manifest.entries.some(e=>e.approved&&(e.approved.files.includes(assetMatch[1])||e.approved.poster===assetMatch[1]));}}
    assert(allowed,404,'Không tìm thấy tệp đã duyệt.');
    if(file.storagePath){const url=await signProductAsset(file,options);res.writeHead(307,{Location:url,'Cache-Control':'private, no-store'});res.end();return null;}
    const responsive=file.variants?.find(v=>v.width===Number(imageWidth));
    const bytes=Buffer.from(responsive?.base64??file.base64,'base64'),common={'Content-Type':file.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline','Accept-Ranges':'bytes'};
    if(headers.range){const match=String(headers.range).match(/^bytes=(\d*)-(\d*)$/);let start=match?.[1]?Number(match[1]):Math.max(0,bytes.length-Number(match?.[2])),end=match?.[1]&&match?.[2]?Number(match[2]):bytes.length-1;end=Math.min(end,bytes.length-1);
      if(!match||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=bytes.length){res.writeHead(416,{...common,'Content-Range':'bytes */'+bytes.length});res.end();return null;}
      const chunk=bytes.subarray(start,end+1);res.writeHead(206,{...common,'Content-Length':chunk.length,'Content-Range':`bytes ${start}-${end}/${bytes.length}`});res.end(chunk);return null;
    }
    res.writeHead(200,{...common,'Content-Length':bytes.length});res.end(bytes);return null;
  }
  const match=path.match(/^\/api\/v1\/products\/([\w-]+)\/media(?:\/(upload))?$/);assert(match,404,'Không tìm thấy API phương tiện.');
  const {state}=await db.read(),product=state.products.find(p=>p.id===match[1]);assert(product&&(admin(auth)||product.status==='active'),404,'Không tìm thấy sản phẩm.');const root=familyKey(product),manifestId='media-'+root,manifest=await loadManifest(db,manifestId);
  if(method==='GET'){
    if(admin(auth))return {entries:manifest.entries,topics:manifest.topics??[]};
    const items=sortMedia(manifest.entries.map(e=>e.approved).filter(Boolean)).map(item=>({id:item.id,kind:item.kind,group:item.group,order:item.order,alt:item.alt,variantId:item.variantId,files:item.files.map(assetUrl),poster:item.poster?assetUrl(item.poster):undefined,status:'approved'}));
    return {items,featuredEligible:items.filter(i=>i.kind==='image').length>=5};
  }
  assert(admin(auth),403,'Chỉ Admin phụ trách chất lượng được quản lý phương tiện.');
  if(match[2]==='upload'&&method==='POST'){
    assert(typeof body.base64==='string'&&/^[A-Za-z0-9+/]+={0,2}$/.test(body.base64),400,'Dữ liệu tải lên không hợp lệ.');const bytes=Buffer.from(body.base64,'base64');validateAsset(body.mime,bytes);const id=randomUUID();
    const variants=body.variants??[];
    assert(Array.isArray(variants)&&variants.length<=2&&(!variants.length||body.mime==='image/webp')&&new Set(variants.map(v=>v.width)).size===variants.length,400,'Bộ ảnh thu nhỏ không hợp lệ.');
    for(const v of variants){assert([480,960].includes(v.width)&&typeof v.base64==='string'&&/^[A-Za-z0-9+/]+={0,2}$/.test(v.base64),400,'Ảnh thu nhỏ không hợp lệ.');validateAsset(body.mime,Buffer.from(v.base64,'base64'));}
    await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(id,assetKind,auth.user.id,db.encodeJSON({mime:body.mime,size:bytes.length,base64:bytes.toString('base64'),variants,productId:root}),Date.now()+86400000);await db.audit(auth.user.id,'product-media-upload',root);return {id,size:bytes.length};
  }
  assert(method==='POST',405,'Thao tác không hỗ trợ.');
  if(body.action==='start_upload')return beginMediaUpload(root,body,{db,auth,options});
  if(body.action==='complete_upload')return completeMediaUpload(root,body.id,{db,auth,options},validateAsset);
  if(body.action==='preview'){
    const row=await db.sql.prepare('SELECT data FROM feature_records WHERE id=? AND kind=?').get(body.assetId,assetKind);assert(row,404,'Không tìm thấy tệp.');const asset=db.decodeJSON(row.data);assert(asset.productId===root,403,'Tệp không thuộc sản phẩm.');return {url:asset.storagePath?await signProductAsset(asset,options):'data:'+asset.mime+';base64,'+asset.base64,mime:asset.mime};
  }
  const existing=manifest.entries.find(e=>e.id===body.id);
  if(body.action==='themes'){
    assert(Array.isArray(body.topics)&&body.topics.length<=3&&new Set(body.topics.map(t=>t.key)).size===body.topics.length&&body.topics.every(t=>['season','bestseller','gifts'].includes(t.key)&&Number.isInteger(t.order)&&t.order>=0&&t.order<=10000),400,'Chủ đề hoặc thứ tự không hợp lệ.');manifest.topics=body.topics;
  }else if(body.action==='variants'){
    const family=state.products.filter(p=>familyKey(p)===root);assert(Array.isArray(body.ids)&&body.ids.length===family.length&&new Set(body.ids).size===family.length&&body.ids.every(id=>family.some(p=>p.id===id)),400,'Cần sắp đủ các quy cách trong cùng sản phẩm.');
    await db.save({...state,products:state.products.map(p=>familyKey(p)===root?{...p,displayOrder:body.ids.indexOf(p.id)}:p)});
  }else if(body.action==='review'){
    assert(existing?.pending,404,'Không có bản chờ duyệt.');assert(['approved','needs_changes'].includes(body.status),400,'Kết quả duyệt không hợp lệ.');
    assert(body.status!=='needs_changes'||typeof body.reason==='string'&&body.reason.trim().length>=3&&body.reason.length<=1000,400,'Cần ghi lý do yêu cầu sửa.');
    assert(body.status!=='approved'||existing.pending.kind!=='model'||body.confirmTruth===true,400,'Cần đối chiếu bao bì, nhãn, tỷ lệ và màu mô hình với hàng thật.');
    const revision={...existing.pending,status:body.status,reason:body.status==='needs_changes'?body.reason.trim():undefined,reviewedBy:auth.user.id,reviewedAt:new Date().toISOString()};
    if(body.status==='approved'){existing.approved=revision;delete existing.pending;}else existing.pending=revision;
  }else if(body.action==='remove'){assert(existing,404,'Không tìm thấy phương tiện.');manifest.entries=manifest.entries.filter(e=>e.id!==body.id);}
  else if(body.action==='submit'){
    const item=body.item;assert(item&&['image','video','spin','model'].includes(item.kind)&&['main','variant','usage','origin'].includes(item.group)&&Number.isInteger(item.order)&&item.order>=0&&item.order<=100&&typeof item.alt==='string'&&item.alt.trim().length>=3&&item.alt.length<=250&&['self','supplier','commissioned'].includes(item.source),400,'Thiếu loại, nhóm, thứ tự, mô tả hoặc nguồn phương tiện.');
    assert(!item.variantId||state.products.some(p=>p.id===item.variantId&&familyKey(p)===root),400,'Quy cách không thuộc sản phẩm.');
    assert(Array.isArray(item.files)&&item.files.length>0&&item.files.length<=36&&new Set(item.files).size===item.files.length&&[...item.files,...(item.poster?[item.poster]:[]),...(item.consent?[item.consent]:[])].every(id=>typeof id==='string'&&/^[a-f\d-]{36}$/.test(id)),400,'Danh sách tệp không hợp lệ.');
    const files=[];for(const id of [...item.files,...(item.poster?[item.poster]:[]),...(item.consent?[item.consent]:[])]){const row=await db.sql.prepare('SELECT owner_id,data,expires_at FROM feature_records WHERE id=? AND kind=?').get(id,assetKind);assert(row&&row.owner_id===auth.user.id&&(Number(row.expires_at)===0||Number(row.expires_at)>Date.now()),403,'Tệp không thuộc phiên tải lên của bạn.');const file=db.decodeJSON(row.data);assert(file.productId===root,400,'Tệp không thuộc sản phẩm.');files.push(file);}
    const content=files.slice(0,item.files.length);assert(item.kind==='image'?content.length===1&&imageTypes.includes(content[0].mime):item.kind==='video'?content.length===1&&content[0].mime==='video/mp4':item.kind==='model'?content.length===2&&content[0].mime==='model/gltf-binary'&&content[1].mime==='model/vnd.usdz+zip':content.length>=24&&content.length<=36&&content.every(f=>imageTypes.includes(f.mime))&&content.reduce((n,f)=>n+(f.size??Buffer.from(f.base64,'base64').length),0)<=3*MB,400,'Bộ tệp không đúng quy định ảnh, MP4, GLB + USDZ hoặc 24–36 ảnh xoay tối đa 3 MB.');
    assert(item.kind==='image'||item.poster&&imageTypes.includes(files[item.files.length]?.mime),400,'Cần ảnh đại diện cho video, 360° hoặc 3D.');
    assert(!(item.source==='supplier'||item.hasPeople)||item.consent,400,'Ảnh có người hoặc nhà cung cấp gửi cần tải phiếu đồng ý.');
    if(item.consent)assert(['application/pdf',...imageTypes].includes(files.at(-1).mime),400,'Phiếu đồng ý phải là PDF hoặc ảnh.');
    for(const id of [...item.files,...(item.poster?[item.poster]:[]),...(item.consent?[item.consent]:[])])await db.sql.prepare('UPDATE feature_records SET expires_at=0 WHERE id=? AND kind=?').run(id,assetKind);
    const siblings=manifest.entries.filter(e=>e!==existing);assert(siblings.filter(e=>e.approved?.kind===item.kind||e.pending?.kind===item.kind).length<(item.kind==='image'?10:1),400,'Tối đa 10 ảnh và 1 phương tiện mỗi loại khác.');
    const id=existing?.id??randomUUID(),revision={id,kind:item.kind,group:item.group,order:item.order,alt:item.alt.trim(),variantId:item.variantId||undefined,files:item.files,poster:item.poster||undefined,source:item.source,hasPeople:!!item.hasPeople,consent:item.consent||undefined,status:'pending',submittedBy:auth.user.id};
    if(existing)existing.pending=revision;else manifest.entries.push({id,pending:revision});
  }else assert(false,400,'Thao tác không hợp lệ.');
  await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(manifestId,manifestKind,root,db.encodeJSON(manifest),0);
  await db.audit(auth.user.id,'product-media-'+body.action,root);return {entries:manifest.entries};
}
