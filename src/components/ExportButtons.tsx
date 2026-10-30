import { Download } from 'lucide-react';
import {useState} from 'react';
import { useUi } from '../app/UiContext';
import { SecondaryButton } from './form';
import { api } from '../store/backend';
import {downloadExport} from '../store/exportDownload';
import {ExportHistory} from './ExportHistory';

/** Xuất báo cáo CSV không có dữ liệu cá nhân (FR-BCTK-02, 03). */
export function ExportButtons({filters={},snapshotId,snapshotRequired=false}:{filters?:Record<string,string>;snapshotId?:string;snapshotRequired?:boolean}={}) {
  const [format,setFormat]=useState('csv'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[busy,setBusy]=useState(false),[background,setBackground]=useState(false);
  const { actor, showToast } = useUi();
  if(actor.kind==='admin'&&actor.adminGroup==='quality')return null;
  const download = async (kind: string) => {
    const useSnapshot=['summary','orders'].includes(kind);
    if(useSnapshot&&snapshotRequired&&!snapshotId){showToast('Vui lòng chờ tải phiên số liệu hoặc làm mới báo cáo.');return;}
    if(busy)return;setBusy(true);
    try {
    const job = await api('/api/v1/exports', {kind,format,background,...(useSnapshot&&snapshotId?{snapshotId}:{}),filters:{...filters,...(from?{from}:{}),...(to?{to}:{})}});
    if(job.status==='QUEUED'){showToast('Đã xếp hàng xuất báo cáo. Mở lịch sử để theo dõi và tải tệp.');return;}
    await downloadExport(job.id);
    showToast(`Đã xuất ${job.filename}.`);
    } catch(e) { showToast(e instanceof Error ? e.message : 'Không xuất được báo cáo.'); }finally{setBusy(false);}
  };
  return (
    <div className="flex flex-wrap gap-2">
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={background} onChange={e=>setBackground(e.target.checked)}/>Xuất nền, theo dõi trong lịch sử</label>
      <label className="text-sm">Định dạng<select aria-label="Định dạng xuất" className="ml-2 min-h-11 rounded border px-2" value={format} onChange={e=>setFormat(e.target.value)}><option value="csv">CSV</option><option value="xlsx">Excel (.xlsx)</option></select></label>
      <label className="text-sm">Từ ngày<input type="date" className="min-h-11 rounded border" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="text-sm">Đến ngày<input type="date" className="min-h-11 rounded border" value={to} onChange={e=>setTo(e.target.value)}/></label>
      {actor.kind!=='admin'||['operations','finance'].includes(actor.adminGroup??'')?<><SecondaryButton disabled={busy} className="flex items-center gap-2" onClick={() => download('summary')}>
        <Download size={16} /> Xuất báo cáo tổng hợp ({format.toUpperCase()})
      </SecondaryButton>
      <SecondaryButton disabled={busy} className="flex items-center gap-2" onClick={() => download('orders')}>
        <Download size={16} /> Xuất danh sách đơn ẩn danh ({format.toUpperCase()})
      </SecondaryButton>
      {actor.kind!=='coop'&&<><SecondaryButton disabled={busy} onClick={()=>download('coops')}>Xuất danh sách HTX</SecondaryButton><SecondaryButton disabled={busy} onClick={()=>download('products')}>Xuất danh sách sản phẩm</SecondaryButton></>}</>:null}
      {(actor.kind==='coop'||(actor.kind==='admin'&&actor.adminGroup==='finance'))&&<SecondaryButton disabled={busy} onClick={()=>download('settlements')}>Xuất đối soát HTX</SecondaryButton>}
      {actor.kind==='admin'&&actor.adminGroup==='finance'&&<SecondaryButton disabled={busy} onClick={()=>download('ledger')}>Xuất sổ giao dịch</SecondaryButton>}
      {actor.kind==='admin'&&actor.adminGroup==='root'&&<SecondaryButton disabled={busy} onClick={()=>download('audit')}>Xuất nhật ký</SecondaryButton>}
      {actor.kind==='admin'&&['root','cskh'].includes(actor.adminGroup??'')&&<><SecondaryButton disabled={busy} onClick={()=>download('tickets')}>Xuất ticket</SecondaryButton><SecondaryButton disabled={busy} onClick={()=>download('reviews')}>Xuất đánh giá</SecondaryButton></>}
      <ExportHistory />
    </div>
  );
}
