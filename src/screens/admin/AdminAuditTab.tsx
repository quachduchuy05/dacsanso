import {useEffect,useState,type FormEvent} from 'react';
import {api} from '../../store/backend';
import {useStore} from '../../store/AppDataContext';
import {Field,Input,Select,PrimaryButton,SecondaryButton} from '../../components/form';
import {ExportButtons} from '../../components/ExportButtons';

type Row={id:number;user_id:string|null;action:string;target:string;at:string;detail:string;outcome:string;correlation_id:string|null};
const OUTCOME:Record<string,string>={success:'Thành công',failure:'Thất bại',unknown:'Dữ liệu cũ'};
export function AdminAuditTab(){
  const {state}=useStore();
  const [draft,setDraft]=useState({actor:'',action:'',target:'',from:'',to:'',outcome:'',correlationId:''}),[filters,setFilters]=useState(draft),[items,setItems]=useState<Row[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[more,setMore]=useState(true);
  const load=async(next=filters,before?:number)=>{
    setBusy(true);setError('');
    try{
      const params=new URLSearchParams(Object.fromEntries(Object.entries(next).filter(([,value])=>value)));
      if(next.from)params.set('from',new Date(next.from+'T00:00:00+07:00').toISOString());
      if(next.to)params.set('to',new Date(next.to+'T23:59:59.999+07:00').toISOString());
      if(before)params.set('before',String(before));params.set('limit','50');
      const result=await api<{items:Row[]}>('/api/v1/audit?'+params);
      setItems(old=>before?[...old,...result.items]:result.items);setMore(result.items.length===50);
    }catch(e){setError(e instanceof Error?e.message:'Không tải được nhật ký.');}finally{setBusy(false);}
  };
  useEffect(()=>{void load();},[]);
  const submit=(e:FormEvent)=>{e.preventDefault();setFilters(draft);void load(draft);};
  return <div className="space-y-4">
    <form className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-3" onSubmit={submit}>
      <Field label="Người thao tác"><Select value={draft.actor} onChange={e=>setDraft({...draft,actor:e.target.value})}><option value="">Tất cả</option>{state.users.map(user=><option key={user.id} value={user.id}>{user.name}</option>)}</Select></Field>
      <Field label="Hành động"><Input value={draft.action} maxLength={200} onChange={e=>setDraft({...draft,action:e.target.value})} placeholder="Ví dụ: password-login"/></Field>
      <Field label="Đối tượng"><Input value={draft.target} maxLength={200} onChange={e=>setDraft({...draft,target:e.target.value})}/></Field>
      <Field label="Kết quả"><Select value={draft.outcome} onChange={e=>setDraft({...draft,outcome:e.target.value})}><option value="">Tất cả</option>{Object.entries(OUTCOME).map(([key,label])=><option key={key} value={key}>{label}</option>)}</Select></Field>
      <Field label="Mã truy vết"><Input value={draft.correlationId} maxLength={200} onChange={e=>setDraft({...draft,correlationId:e.target.value})}/></Field>
      <Field label="Từ ngày"><Input type="date" value={draft.from} onChange={e=>setDraft({...draft,from:e.target.value})}/></Field>
      <Field label="Đến ngày"><Input type="date" value={draft.to} onChange={e=>setDraft({...draft,to:e.target.value})}/></Field>
      <PrimaryButton disabled={busy}>Tra cứu nhật ký</PrimaryButton>
    </form>
    <ExportButtons filters={filters}/>
    {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
    <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr><th className="p-3">Thời gian</th><th>Người dùng</th><th>Hành động</th><th>Đối tượng</th><th>Kết quả</th><th>Mã truy vết</th><th>Chi tiết</th></tr></thead><tbody>{items.map(row=><tr key={row.id} className="border-t">
      <td className="p-3">{new Date(row.at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</td><td>{state.users.find(user=>user.id===row.user_id)?.name??row.user_id??'Hệ thống/khách'}</td><td>{row.action}</td><td>{row.target}</td><td>{OUTCOME[row.outcome]??row.outcome}</td><td className="max-w-48 break-all font-mono text-xs">{row.correlation_id??'—'}</td><td className="max-w-sm break-words">{row.detail}</td>
    </tr>)}</tbody></table>{!items.length&&!busy&&<p className="p-4 text-sm text-stone-500">Không có nhật ký phù hợp.</p>}</div>
    {more&&items.length>0&&<SecondaryButton disabled={busy} onClick={()=>void load(filters,items[items.length-1].id)}>Xem thêm</SecondaryButton>}
  </div>;
}
