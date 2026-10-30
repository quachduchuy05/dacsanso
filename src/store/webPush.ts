import {api} from './backend';
const DEVICE_KEY='dac-san-so:web-push-device';
export interface PushStatus {configured:boolean;publicKey:string|null;devices:{id:string;createdAt:string}[]}
export const pushSupported=()=>window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
export async function enablePush(publicKey:string){
  if(!pushSupported())throw new Error('Trình duyệt cần hỗ trợ Web Push và kết nối HTTPS (hoặc localhost).');
  if(await Notification.requestPermission()!=='granted')throw new Error('Bạn chưa cho phép thông báo. Có thể thay đổi quyền trong cài đặt trình duyệt.');
  await navigator.serviceWorker.register('/web-push-sw.js',{scope:'/',updateViaCache:'none'});
  const registration=await navigator.serviceWorker.ready;
  const raw=atob(publicKey.replace(/-/g,'+').replace(/_/g,'/'));
  const key=new Uint8Array(raw.length);for(let index=0;index<raw.length;index++)key[index]=raw.charCodeAt(index);
  const previous=await registration.pushManager.getSubscription();
  // Recreate if VAPID was rotated; the old endpoint will expire on the server.
  if(previous?.options.applicationServerKey&&new Uint8Array(previous.options.applicationServerKey).some((value,index)=>value!==key[index]))await previous.unsubscribe();
  const subscription=await registration.pushManager.getSubscription()??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
  try{
    const result=await api<{id:string}>('/api/v1/me/push',{action:'subscribe',subscription:subscription.toJSON()});
    localStorage.setItem(DEVICE_KEY,result.id);
  }catch(error){await subscription.unsubscribe();throw error;}
}
export async function disableLocalPush(remove:(id:string)=>Promise<unknown>=id=>api('/api/v1/me/push',{action:'remove',id})){
  const id=localStorage.getItem(DEVICE_KEY);
  try{if(id)await remove(id);}
  finally{
    if('serviceWorker' in navigator){const registration=await navigator.serviceWorker.getRegistration('/web-push-sw.js');await (await registration?.pushManager.getSubscription())?.unsubscribe();}
    localStorage.removeItem(DEVICE_KEY);
  }
}
export const localPushId=()=>localStorage.getItem(DEVICE_KEY);
