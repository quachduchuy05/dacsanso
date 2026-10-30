import {useState,useEffect} from 'react';
import {api} from '../store/backend';
import {downloadExport} from '../store/exportDownload';
import {SecondaryButton} from './form';

type Job={id:string;filename:string;status:string;data_as_of:string;expires_at:number;filters:Record<string,string>;rowCount?:number;checksum?:string};
const date=(value:string|number)=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
const labels:Record<string,string>={from:'Từ ngày',to:'Đến ngày',range:'Khoảng thời gian',status:'Trạng thái',coopId:'HTX',region:'Vùng',actor:'Người thao tác',action:'Hành động',target:'Đối tượng',priority:'Ưu tiên'};

export function ExportHistory(){
  const [items,setItems]=useState<Job[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[open,setOpen]=useState(false);
  const load=async()=>{setBusy(true);setError('');try{const result=await api<{items:Job[]}>('/api/v1/exports');setItems(result.items);}catch(e){setError(e instanceof Error?e.message:'Không tải được lịch sử.');}finally{setBusy(false);}};
  const download=async(id:string)=>{setBusy(true);setError('');try{await downloadExport(id);}catch(e){setError(e instanceof Error?e.message:'Không tải được tệp.');}finally{setBusy(false);}};
  useEffect(()=>{if(!open||!items.some(i=>['QUEUED','RUNNING'].includes(i.status)))return;const timer=setTimeout(()=>{void load();},2000);return()=>clearTimeout(timer);},[open,items]);
  const retry=async(id:string)=>{setBusy(true);setError('');try{await api('/api/v1/exports/'+id+'/retry',{});await load();}catch(e){setError(e instanceof Error?e.message:'Không thử lại được.');}finally{setBusy(false);}};
  return <details className="w-full rounded-xl border border-stone-200 bg-white p-3" onToggle={e=>{if(e.target===e.currentTarget){setOpen(e.currentTarget.open);if(e.currentTarget.open)void load();}}}>
    <summary className="min-h-11 cursor-pointer font-semibold">Lịch sử xuất báo cáo của tôi</summary>
    <SecondaryButton disabled={busy} onClick={()=>void load()}>Làm mới lịch sử</SecondaryButton>
    {error&&<p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
    {busy&&<p role="status" className="mt-2 text-sm">Đang xử lý…</p>}
    {!busy&&!error&&!items.length&&<p className="mt-2 text-sm text-stone-600">Chưa có báo cáo nào được tạo.</p>}
    <ul className="mt-3 space-y-3">{items.map(job=>{
      const expired=job.status==='EXPIRED'||job.expires_at<=Date.now();
      return <li key={job.id} className="space-y-2 rounded-lg border p-3 text-sm">
        <p className="break-all font-semibold">{job.filename}</p>
        <p>{expired?'Đã hết hạn':job.status==='SUCCEEDED'?'Sẵn sàng tải':job.status} · {job.rowCount===undefined?'Chưa có số dòng':`${job.rowCount.toLocaleString('vi-VN')} dòng nội dung`}</p>
        <p>Tạo lúc: {date(job.data_as_of)} · Hết hạn: {date(job.expires_at)} (giờ Việt Nam)</p>
        <p>Bộ lọc: {Object.entries(job.filters).filter(([,value])=>value).map(([key,value])=>`${labels[key]??key}: ${value}`).join(' · ')||'Tất cả dữ liệu được cấp quyền'}</p>
        {job.checksum&&<details><summary className="min-h-11 cursor-pointer">Mã kiểm tra tệp SHA-256</summary><code className="block break-all text-xs">{job.checksum}</code></details>}
        <SecondaryButton disabled={busy||expired||job.status!=='SUCCEEDED'} onClick={()=>void download(job.id)}>Tải lại báo cáo</SecondaryButton>
        {job.status==='FAILED'&&!expired&&<SecondaryButton disabled={busy} onClick={()=>void retry(job.id)}>Thử lại báo cáo lỗi</SecondaryButton>}
      </li>;
    })}</ul>
  </details>;
}
