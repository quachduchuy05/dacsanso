import {api} from './backend';

export async function downloadExport(id:string):Promise<string> {
  const file=await api<{filename:string;content:string;encoding:string;mime:string}>(`/api/v1/exports/${encodeURIComponent(id)}/download?as=json`);
  const content=file.encoding==='base64'?Uint8Array.from(atob(file.content),c=>c.charCodeAt(0)):file.content;
  const url=URL.createObjectURL(new Blob([content],{type:file.mime}));
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download=file.filename;document.body.appendChild(anchor);
  try{anchor.click();}finally{anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return file.filename;
}
