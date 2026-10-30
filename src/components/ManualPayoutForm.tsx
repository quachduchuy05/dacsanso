import {useEffect,useState} from 'react';
import {useStore,useNow} from '../store/AppDataContext';
import {payoutSchedule} from '../domain/payoutSchedule';
import {api} from '../store/backend';
import {Field,Input,Textarea,PrimaryButton} from './form';
import type {PayoutPeriod} from '../domain/types';

export function ManualPayoutForm({period}:{period:PayoutPeriod}){
  const at=useNow(1000),available=payoutSchedule(period,at).available,[amount,setAmount]=useState(available);
  useEffect(()=>{setAmount(available);},[available]);
  const {syncNow}=useStore();const [reference,setReference]=useState(''),[note,setNote]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  return <details className="w-full rounded border p-3"><summary className="min-h-11 cursor-pointer">Ghi nhận chuyển khoản ngoài hệ thống</summary><p className="text-sm">Chuyển tiền bằng ngân hàng ngoài ứng dụng rồi kiểm tra chứng từ. Thao tác này ghi nhận kết quả, không tự chuyển tiền.</p>
    <form className="grid gap-3" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await api(`/api/v1/payouts/${period.id}/record`,{reference,note,confirmed,amount});syncNow();setReference('');setConfirmed(false);}catch(e){setError(e instanceof Error?e.message:'Không ghi nhận được.');}finally{setBusy(false);}}}>
      {period.policy&&<Field label="Số tiền đã chuyển lần này (đồng)"><Input type="number" required min={1} max={available} step={1} value={amount} onChange={e=>setAmount(e.target.valueAsNumber)}/></Field>}
      <Field label="Mã chuyển khoản hoặc chứng từ"><Input required minLength={3} maxLength={100} value={reference} onChange={e=>setReference(e.target.value)}/></Field><Field label="Căn cứ xác nhận"><Textarea required minLength={10} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></Field>
      <label className="flex min-h-11 items-center gap-2"><input required type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Tôi đã kiểm tra đã chuyển đúng số tiền và tài khoản HTX.</label>
      <PrimaryButton disabled={busy||!confirmed||available<=0}>Xác nhận đã chi trả</PrimaryButton>{available<=0&&<p>Chưa có phần tiền được phép chi trả tại thời điểm này.</p>}{error&&<p role="alert">{error}</p>}
    </form>
  </details>;
}
