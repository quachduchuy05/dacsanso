import {useState} from 'react';
import {api} from '../store/backend';
import {useStore} from '../store/AppDataContext';
import {useUi} from '../app/UiContext';
import type {Ticket} from '../domain/types';
import {Field,Input,Textarea,PrimaryButton,Select} from './form';
import {PhotoPicker} from './PhotoPicker';
export function TicketActions({ticket}:{ticket:Ticket}){
  const {user,showToast}=useUi(),{state,syncNow}=useStore();const [note,setNote]=useState(''),[photos,setPhotos]=useState<string[]>([]),[tracking,setTracking]=useState(''),[assigned,setAssigned]=useState(ticket.assignedUserId??''),[busy,setBusy]=useState(false);
  if(!user||ticket.status==='closed')return null;const staff=user.role==='admin'&&['root','cskh'].includes(user.adminGroup??'');
  const send=async(action:string,body:object)=>{if(busy)return;setBusy(true);try{await api(`/api/v1/tickets/${ticket.id}/${action}`,body);setNote('');setPhotos([]);syncNow();showToast('Đã cập nhật ticket.');}catch(e){showToast(e instanceof Error?e.message:'Không lưu được.');}finally{setBusy(false);}};
  const f=ticket.fulfillment;
  return <details className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-3"><summary className="min-h-11 cursor-pointer text-sm font-semibold">Bổ sung & xử lý yêu cầu</summary><Field label="Thông tin bổ sung"><Textarea maxLength={5000} value={note} onChange={e=>setNote(e.target.value)}/></Field><PhotoPicker photos={photos} onChange={setPhotos} max={5}/><PrimaryButton disabled={busy||!note.trim()} onClick={()=>send('supplement',{note,photos})}>Gửi bổ sung</PrimaryButton>
    {staff&&<><Field label="Người xử lý chính"><Select value={assigned} onChange={e=>setAssigned(e.target.value)}><option value="">Chọn CSKH</option>{(state.supportAgents??[]).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field><PrimaryButton disabled={busy||!assigned} onClick={()=>send('assign',{userId:assigned})}>Phân công</PrimaryButton></>}
    {f&&<div className="space-y-2"><p className="text-sm font-semibold">{f.kind==='exchange'?'Đổi hàng':'Giao bù'} · {{requested:'Chờ duyệt',approved:'Đã duyệt',rejected:'Từ chối',shipped:'Đã gửi hàng',completed:'Đã nhận hàng'}[f.status]}{f.tracking&&` · ${f.tracking}`}</p>{staff&&f.status==='requested'&&<div className="flex gap-2"><PrimaryButton disabled={busy} onClick={()=>send('fulfillment',{status:'approved'})}>Duyệt yêu cầu</PrimaryButton><PrimaryButton disabled={busy} onClick={()=>send('fulfillment',{status:'rejected'})}>Từ chối</PrimaryButton></div>}{(staff||user.role==='coop')&&f.status==='approved'&&<><Field label="Vận đơn đổi/giao bù"><Input value={tracking} onChange={e=>setTracking(e.target.value)}/></Field><PrimaryButton disabled={busy||!tracking.trim()} onClick={()=>send('fulfillment',{status:'shipped',tracking})}>Đã gửi hàng</PrimaryButton></>}{user.role==='customer'&&f.status==='shipped'&&<PrimaryButton disabled={busy} onClick={()=>send('fulfillment',{status:'completed'})}>Đã nhận hàng đổi/giao bù</PrimaryButton>}</div>}
  </details>;
}
