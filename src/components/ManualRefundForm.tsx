import {useState} from 'react';
import {api} from '../store/backend';
import {useStore} from '../store/AppDataContext';
import {Field,Input,Textarea,PrimaryButton} from './form';
import {formatMoney} from '../domain/pricing';

export function ManualRefundForm({refundId,amount,accountNumber}:{refundId:string;amount:number;accountNumber?:string}){
  const {syncNow}=useStore(),[reference,setReference]=useState(''),[note,setNote]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  return <details className="min-w-64"><summary className="min-h-11 cursor-pointer">Ghi nhận chứng từ hoàn ngoài hệ thống</summary><form className="space-y-2" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{await api('/api/v1/refunds/'+refundId+'/record',{amount,accountNumber,reference,note,confirmed});syncNow();setMessage('Đã ghi nhận chứng từ hoàn tiền.');}catch(e){setMessage(e instanceof Error?e.message:'Không ghi nhận được.');}finally{setBusy(false);}}}>
    <p className="text-sm">Chỉ ghi khi đã kiểm tra chuyển khoản {formatMoney(amount)} đến đúng tài khoản nhận hoàn của khách. Thao tác này không tự gửi tiền và không phải xác nhận trực tiếp từ ngân hàng.</p>
    <Field label="Mã chứng từ hoàn tiền"><Input required minLength={3} maxLength={100} value={reference} onChange={e=>setReference(e.target.value)}/></Field><Field label="Căn cứ xác nhận hoàn tiền"><Textarea required minLength={20} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></Field><label className="flex min-h-11 items-center gap-2"><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Đã kiểm tra chuyển khoản đúng tiền và đúng người nhận</label><PrimaryButton disabled={busy||!accountNumber}>Ghi nhận đã hoàn ngoài hệ thống</PrimaryButton>{message&&<p role="status">{message}</p>}
  </form></details>;
}
