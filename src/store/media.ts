import {api,hasBackendSession} from './backend';
export async function storePhoto(dataUrl:string):Promise<string>{
  if(!hasBackendSession())return dataUrl;
  const health=await api<{images:string}>('/api/health');
  if(health.images!=='supabase')return dataUrl;
  return (await api<{reference:string}>('/api/v1/media/upload',{dataUrl})).reference;
}
