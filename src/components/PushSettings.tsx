import {useEffect,useState} from 'react';
import {api} from '../store/backend';
import {enablePush,disableLocalPush,localPushId,pushSupported,type PushStatus} from '../store/webPush';
import {SecondaryButton} from './form';

export function PushSettings(){
  const [status,setStatus]=useState<PushStatus|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const refresh=async()=>setStatus(await api<PushStatus>('/api/v1/me/push'));
  useEffect(()=>{let active=true;void api<PushStatus>('/api/v1/me/push').then(result=>{if(active)setStatus(result);}).catch(()=>{if(active)setMessage('Chưa tải được cài đặt thông báo.');});return()=>{active=false;};},[]);
  const act=async(task:()=>Promise<void>)=>{setBusy(true);setMessage('');try{await task();await refresh();setMessage('Đã cập nhật thông báo thiết bị.');}catch(error){setMessage(error instanceof Error?error.message:'Chưa cập nhật được.');}finally{setBusy(false);}};
  return <section className="min-w-0 space-y-3" aria-label="Thông báo thiết bị"><h3 className="font-semibold">Thông báo trên thiết bị</h3>
    <p className="text-sm text-stone-600">Nhận nhắc nhở khi có thông báo mới. Nội dung đơn hàng chỉ hiển thị sau khi mở ứng dụng. Đăng xuất sẽ tắt thông báo trên trình duyệt này.</p>
    {!pushSupported()?<p className="text-sm">Thiết bị cần trình duyệt hỗ trợ Web Push và HTTPS. Trên iPhone/iPad, hãy thêm web vào màn hình chính nếu trình duyệt yêu cầu.</p>:status?.configured?<div className="flex flex-wrap gap-2"><SecondaryButton disabled={busy} onClick={()=>void act(()=>enablePush(status.publicKey!))}>Bật thông báo trên thiết bị này</SecondaryButton><SecondaryButton disabled={busy} onClick={()=>void act(disableLocalPush)}>Tắt trên thiết bị này</SecondaryButton></div>:<p className="text-sm">Máy chủ chưa cấu hình dịch vụ thông báo thiết bị.</p>}
    {status&&status.devices.length>0&&<ul className="space-y-2">{status.devices.map((device,index)=><li key={device.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm"><span>Thiết bị {index+1}{device.id===localPushId()?' (trình duyệt này)':''} · {new Date(device.createdAt).toLocaleDateString('vi-VN')}</span><SecondaryButton disabled={busy} onClick={()=>void act(async()=>{if(device.id===localPushId())await disableLocalPush();else await api('/api/v1/me/push',{action:'remove',id:device.id});})}>Xóa thiết bị</SecondaryButton></li>)}</ul>}
    {message&&<p role="status" className="break-words text-sm">{message}</p>}
  </section>;
}
