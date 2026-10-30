import {useState} from 'react';
import {api} from '../store/backend';
import {useStore} from '../store/AppDataContext';
import {useUi} from '../app/UiContext';
import {Input,PrimaryButton} from './form';
export function ReviewPolicyPanel(){
  const {state,syncNow}=useStore(),{showToast}=useUi();const [moderation,setModeration]=useState(state.reviewPolicy?.requireModeration??false),[days,setDays]=useState(state.reviewPolicy?.windowDays??30),[busy,setBusy]=useState(false);
  return <form className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await api('/api/v1/review-policy',{requireModeration:moderation,windowDays:days});syncNow();showToast('Đã lưu chính sách đánh giá.');}catch(e){showToast(e instanceof Error?e.message:'Không lưu được.');}finally{setBusy(false);}}}><label className="text-sm"><input type="checkbox" checked={moderation} onChange={e=>setModeration(e.target.checked)}/> Duyệt trước khi hiển thị</label><label className="text-sm">Thời hạn (ngày)<Input type="number" min={1} max={365} value={days} onChange={e=>setDays(Number(e.target.value))}/></label><PrimaryButton disabled={busy}>Lưu chính sách</PrimaryButton></form>;
}
