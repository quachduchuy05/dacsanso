import {api} from './backend';
export async function compressProductPhoto(file:File,target=300*1024):Promise<Blob>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Ảnh gốc phải là JPG, PNG hoặc WebP, tối đa 10 MB.');
  const image=await createImageBitmap(file);
  try{let width=Math.min(1600,image.width);for(let attempt=0;attempt<8;attempt++){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.max(1,Math.round(image.height*width/image.width));const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Trình duyệt không xử lý được ảnh.');ctx.drawImage(image,0,0,canvas.width,canvas.height);const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',Math.max(.45,.86-attempt*.055)));if(blob&&blob.size<=target)return blob;width=Math.max(200,Math.round(width*.8));}throw new Error('Chưa nén được ảnh về dung lượng yêu cầu.');}finally{image.close();}
}
function base64(blob:Blob){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Không đọc được tệp.'));reader.readAsDataURL(blob);});}
export async function uploadProductAsset(productId:string,file:File,target=300*1024){
  const image=file.type.startsWith('image/');
  const mime=image?'image/webp':file.name.toLowerCase().endsWith('.glb')?'model/gltf-binary':file.name.toLowerCase().endsWith('.usdz')?'model/vnd.usdz+zip':file.type;
  const limit=mime==='video/mp4'?10*1024*1024:5*1024*1024;
  if(!image&&file.size>limit)throw new Error('Tệp vượt dung lượng cho phép.');
  const blob=image?await compressProductPhoto(file,target):file;
  const variants: {width:number;base64:string}[]=[];
  // Preserve the full image; small displays can request independently compressed copies.
  if(image&&target===300*1024){
    const bitmap=await createImageBitmap(blob);
    try{for(const width of [480,960]){if(bitmap.width<=width)continue;const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.max(1,Math.round(bitmap.height*width/bitmap.width));const ctx=canvas.getContext('2d');if(!ctx)continue;ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const resized=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',.72));if(resized&&resized.size<=300*1024)variants.push({width,base64:await base64(resized)});}}finally{bitmap.close();}
  }
  if(blob.size>2*1024*1024){
    const upload=await api<{id:string;url:string}>('/api/v1/products/'+productId+'/media',{action:'start_upload',mime,size:blob.size});
    const sent=await fetch(upload.url,{method:'PUT',headers:{'Content-Type':mime,'x-upsert':'false'},body:await blob.arrayBuffer(),signal:AbortSignal.timeout(120000)});
    if(!sent.ok)throw new Error('Chưa tải được tệp lên kho phương tiện. Vui lòng thử lại.');
    return api<{id:string;size:number}>('/api/v1/products/'+productId+'/media',{action:'complete_upload',id:upload.id});
  }
  return api<{id:string;size:number}>('/api/v1/products/'+productId+'/media/upload',{mime,base64:await base64(blob),variants});
}
