import {useState} from 'react';
import {useStore} from '../store/AppDataContext';
import {useUi} from '../app/UiContext';
import {api} from '../store/backend';
import {Field,Input,Textarea,PrimaryButton} from './form';
import {formatMoney} from '../domain/pricing';

export function SettlementPolicySettings(){
  const {state,syncNow}=useStore(),{adminGroup}=useUi(),policy=state.params.settlementPolicy;
  const [percent,setPercent]=useState(policy?.reservePercent??0),[days,setDays]=useState(policy?.reserveDays??0),[minimum,setMinimum]=useState(policy?.minimumPayout??0),[fee,setFee]=useState(policy?.payoutFee??0),[reference,setReference]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  return <section className="min-w-0 space-y-3 rounded-xl border bg-white p-4" aria-label="Chính sách chi trả HTX"><h3 className="font-semibold">Chính sách chi trả HTX</h3>
    <p className="text-sm">{policy?`Bản ${policy.revision}: giữ ${policy.reservePercent}% trong ${policy.reserveDays} ngày từ khi chốt; ngưỡng ${formatMoney(policy.minimumPayout)}; phí ${formatMoney(policy.payoutFee)}/kỳ.`:'Chưa có chính sách được lưu. Hệ thống không tự áp thêm giữ lại, ngưỡng hoặc phí mới.'}</p>
    {policy&&<p className="break-words text-sm">Căn cứ: {policy.approvalReference}</p>}
    {adminGroup==='operations'&&<details><summary className="min-h-11 cursor-pointer">Cấu hình chính sách đã được phê duyệt</summary><form className="space-y-3" onSubmit={async event=>{event.preventDefault();setBusy(true);setMessage('');try{await api('/api/v1/settlement-policy',{revision:policy?.revision??0,reservePercent:percent,reserveDays:days,minimumPayout:minimum,payoutFee:fee,approvalReference:reference,confirmed});syncNow();setReference('');setConfirmed(false);setMessage('Đã lưu. Chỉ áp dụng khi chốt kỳ mới; kỳ cũ giữ nguyên chính sách.');}catch(error){setMessage(error instanceof Error?error.message:'Không lưu được.');}finally{setBusy(false);}}}>
      <p className="text-sm">Ngưỡng xét khi chốt kỳ sau phí; chưa đủ thì đơn cộng dồn sang kỳ sau. Tiền giữ lại được giải phóng khi hết thời gian giữ, không thu phí lần hai. Cấu hình không sửa kỳ đã chốt hoặc tự chuyển tiền.</p>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Tỷ lệ giữ lại (%)"><Input type="number" required min={0} max={100} step={1} value={percent} onChange={e=>setPercent(e.target.valueAsNumber)}/></Field><Field label="Thời gian giữ (ngày)"><Input type="number" required min={percent?1:0} max={365} step={1} value={days} onChange={e=>setDays(e.target.valueAsNumber)}/></Field><Field label="Ngưỡng chốt kỳ sau phí (đồng)"><Input type="number" required min={0} max={1000000000} step={1} value={minimum} onChange={e=>setMinimum(e.target.valueAsNumber)}/></Field><Field label="Phí chi trả mỗi kỳ (đồng)"><Input type="number" required min={0} max={10000000} step={1} value={fee} onChange={e=>setFee(e.target.valueAsNumber)}/></Field></div>
      <Field label="Căn cứ phê duyệt chính sách chi trả"><Textarea required minLength={10} maxLength={1000} value={reference} onChange={e=>setReference(e.target.value)}/></Field><label className="flex min-h-11 items-center gap-2"><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Tôi xác nhận các giá trị đã được đơn vị vận hành phê duyệt để áp dụng cho kỳ mới.</label><PrimaryButton disabled={busy||!confirmed}>Lưu chính sách chi trả</PrimaryButton>
    </form></details>}{message&&<p role="status" className="text-sm">{message}</p>}
  </section>;
}
