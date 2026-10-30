import {useEffect,useState,type FormEvent} from 'react';
import {api} from '../store/backend';
import {useStore} from '../store/AppDataContext';
import {Field,Input,Textarea,Select,PrimaryButton} from './form';
import {ReconciliationReview,type ReconciliationNote} from './ReconciliationReview';
import {AdjustmentProposal,ReconciliationAdjustments} from './ReconciliationAdjustments';

type Session={id:string;provider:string;kind:string;at:string;reviews?:ReconciliationNote[];rows:{orderId:string;amount:number;reference:string;expected:number|null;status:string;difference:number|null}[]};
const RESULTS:Record<string,string>={matched:'Khớp',difference:'Chênh lệch',duplicate:'Trùng tham chiếu',missing_order:'Thiếu đơn hệ thống',missing_partner:'Thiếu trong bảng kê đối tác'};
export function ReconciliationPanel(){
  const {syncNow}=useStore();
  const [from,setFrom]=useState(''),[to,setTo]=useState(''),[provider,setProvider]=useState(''),[kind,setKind]=useState('cod'),[csv,setCsv]=useState(''),[items,setItems]=useState<Session[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const load=()=>api('/api/v1/reconciliations').then(r=>setItems(r.items));
  useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
  const submit=async(e:FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{await api('/api/v1/reconciliations',{provider,kind,csv,...(from||to?{scope:{from,to}}:{})});await load();syncNow();}catch(e){setError(e instanceof Error?e.message:'Không nhập được CSV.');}finally{setBusy(false);}};
  return <details className="rounded-xl border border-stone-200 bg-white p-4">
    <summary className="min-h-11 cursor-pointer font-semibold">Nhập đối soát từ đối tác</summary>
    <form onSubmit={submit} className="mt-4 grid gap-3">
      <p className="text-sm text-stone-600">Dòng lệch không được tự xác nhận tiền về. Mỗi dòng là tổng tiền của một đơn; tham chiếu được kiểm tra chống nhập trùng.</p>
      <Field label="Đối tác"><Input required maxLength={60} value={provider} onChange={e=>setProvider(e.target.value)}/></Field>
      <Field label="Loại bảng kê"><Select value={kind} onChange={e=>setKind(e.target.value)}><option value="cod">Tiền COD</option><option value="payment">Thu online</option><option value="refund">Hoàn tiền</option></Select></Field>
      <Field label="Từ ngày đặt đơn"><Input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></Field>
      <Field label="Đến ngày đặt đơn"><Input type="date" value={to} onChange={e=>setTo(e.target.value)}/></Field>
      <p className="text-sm text-stone-600">Chọn đủ hai ngày để tìm đơn có tiền ghi nhận trong hệ thống nhưng thiếu trong bảng kê. Chỉ dùng với bảng kê đầy đủ của phạm vi ngày đặt đơn này. Để trống hai ngày nếu chỉ đối chiếu từng dòng.</p>
      <Field label="Tệp CSV"><Input type="file" accept=".csv,text/csv" onChange={async e=>{const file=e.target.files?.[0];if(file){if(file.size>2000000){setError('CSV tối đa 2 MB.');return;}setCsv(await file.text());}}}/></Field>
      <Field label="Nội dung CSV" hint="Tiêu đề: orderId,amount,reference. Mỗi dòng ghi mã đơn, số tiền nguyên VND và mã giao dịch đối tác."><Textarea required rows={5} value={csv} onChange={e=>setCsv(e.target.value)}/></Field>
      <PrimaryButton disabled={busy}>{busy?'Đang đối soát…':'Nhập và đối chiếu'}</PrimaryButton>
      {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
    </form>
    <div className="mt-4 space-y-3">{items.map(item=><details className="rounded border p-3" key={item.id}>
      <summary className="min-h-11 cursor-pointer text-sm">{item.provider} · {new Date(item.at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} · {item.rows.filter(r=>r.status==='matched').length}/{item.rows.length} dòng khớp</summary>
      <div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th>Mã đơn</th><th>Bảng kê</th><th>Hệ thống</th><th>Kết quả</th><th>Điều tra</th></tr></thead><tbody>{item.rows.map((row,index)=><tr key={index}>
        <td>{row.orderId}</td><td>{row.amount.toLocaleString('vi-VN')}</td><td>{row.expected?.toLocaleString('vi-VN')??'—'}</td><td>{RESULTS[row.status]??row.status}</td>
        <td>{row.status!=='matched'&&<ReconciliationReview sessionId={item.id} rowIndex={index} notes={(item.reviews??[]).filter(n=>n.rowIndex===index)} onSaved={load}/>} {['difference','missing_partner'].includes(row.status)&&row.difference!==null&&row.difference!==0&&<AdjustmentProposal sessionId={item.id} rowIndex={index} amount={(item.kind==='refund'?-1:1)*row.difference} onSaved={load}/>}</td>
      </tr>)}</tbody></table></div>
    </details>)}</div><ReconciliationAdjustments/>
  </details>;
}
