import {randomUUID} from 'node:crypto';
import {assert} from './security.mjs';
import {project} from './projection.mjs';
export const MEDIA_REFERENCE=/^sb:\/\/app-images\/[A-Za-z\d_-]{1,100}\/[a-f\d-]{36}\.(?:jpg|png|webp)$/;
export function canReadMedia(state,user,reference){
  if(!MEDIA_REFERENCE.test(reference))return false;
  if(user&&reference.startsWith(`sb://app-images/${user.id}/`))return true;
  const visible=project(state,user);
  const find=value=>{
    if(Array.isArray(value))return value.some(find);
    if(!value||typeof value!=='object')return false;
    return Object.entries(value).some(([key,item])=>{
      if(['image','photo'].includes(key)&&item===reference)return true;
      if(['photos','documents','images'].includes(key)&&Array.isArray(item)&&item.includes(reference))return true;
      return typeof item==='object'&&find(item);
    });
  };
  return find(visible);
}
export function validateMediaReferences(value,state,user){
  if(typeof value==='string'&&value.startsWith('sb://'))assert(canReadMedia(state,user,value),403,'Không có quyền sử dụng ảnh này.');
  else if(Array.isArray(value))for(const item of value)validateMediaReferences(item,state,user);
  else if(value&&typeof value==='object')for(const item of Object.values(value))validateMediaReferences(item,state,user);
}
export async function uploadMedia(admin,user,dataUrl){
  assert(admin,503,'Chưa cấu hình Supabase Storage.');
  assert(user&&user.role!=='regulator',403,'Không có quyền tải ảnh.');
  assert(typeof dataUrl==='string',400,'Thiếu ảnh.');
  const match=dataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z\d+/]+={0,2})$/);
  assert(match,400,'Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.');
  const bytes=Buffer.from(match[2],'base64'),type=match[1];
  assert(bytes.length>0&&bytes.length<=5*1024*1024,413,'Ảnh phải nhỏ hơn 5 MB.');
  const valid=type==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  assert(valid,400,'Nội dung tệp không khớp định dạng ảnh.');
  const path=`${user.id}/${randomUUID()}.${type==='jpeg'?'jpg':type}`;
  const {error}=await admin.storage.from('app-images').upload(path,bytes,{contentType:`image/${type}`,upsert:false});
  assert(!error,502,'Chưa tải ảnh lên Supabase được.');
  return {reference:`sb://app-images/${path}`};
}
export async function signMedia(admin,state,user,reference){
  assert(admin,503,'Chưa cấu hình Supabase Storage.');assert(canReadMedia(state,user,reference),403,'Không có quyền xem ảnh.');
  const path=reference.slice('sb://app-images/'.length);
  const {data,error}=await admin.storage.from('app-images').createSignedUrl(path,300);
  assert(!error&&data?.signedUrl,502,'Không mở được ảnh.');return {url:data.signedUrl,expiresIn:300};
}
