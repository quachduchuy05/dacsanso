import {useState} from 'react';
import {api} from '../store/backend';
import {Input,Select,SecondaryButton} from './form';

export type ReconciliationNote={rowIndex:number;status:string;note:string;by:string;at:string};
export function ReconciliationReview({sessionId,rowIndex,notes,onSaved}:{sessionId:string;rowIndex:number;notes:ReconciliationNote[];onSaved:()=>Promise<unknown>}){
  const [note,setNote]=useState(''),[status,setStatus]=useState('reviewed'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  return <details className="min-w-64"><summary className="min-h-11 cursor-pointer">Kiểm tra chênh lệch ({notes.length})</summary>
    <p className="text-xs text-stone-600">Ghi nhận kết quả điều tra. Tiền và kết quả đối chiếu gốc được giữ nguyên.</p>
    {notes.map((entry,i)=><p key={i} className="my-2 border-b pb-2">{entry.status==='reviewed'?'Đã kiểm tra':'Mở lại'} · {new Date(entry.at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}<br/>{entry.note}</p>)}
    <Select aria-label="Trạng thái kiểm tra chênh lệch" value={status} onChange={e=>setStatus(e.target.value)}><option value="reviewed">Đã kiểm tra</option><option value="reopened">Mở lại</option></Select>
    <Input aria-label="Kết luận kiểm tra chênh lệch" minLength={10} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Kết luận, mã chứng từ hoặc việc cần xử lý"/>
    <SecondaryButton disabled={busy||note.trim().length<10} onClick={async()=>{setBusy(true);setError('');try{await api('/api/v1/reconciliations',{reviewSessionId:sessionId,rowIndex,status,note});setNote('');await onSaved();}catch(e){setError(e instanceof Error?e.message:'Không lưu được kết luận.');}finally{setBusy(false);}}}>Lưu kết luận</SecondaryButton>
    {error&&<p role="alert">{error}</p>}
  </details>;
}
