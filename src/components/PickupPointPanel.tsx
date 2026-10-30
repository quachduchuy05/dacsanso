import {useState} from 'react';
import type {Order} from '../domain/types';
import {useStore} from '../store/AppDataContext';
import {api} from '../store/backend';
import {Field,Input,Textarea,PrimaryButton} from './form';

export function PickupPointPanel({order,editable=false}:{order:Order;editable?:boolean}){
  const point=order.pickupPoint,{syncNow}=useStore(),[form,setForm]=useState({name:point?.name??'',address:point?.address??'',contactName:point?.contactName??'',contactPhone:point?.contactPhone??'',note:point?.note??'',reason:''}),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const locked=!!order.shipment?.pickedUpAt||!!order.carrierDeliveredAt||!['confirmed','awaiting_harvest','preparing','shipping'].includes(order.status);
  return <section className="space-y-2 rounded-xl border border-stone-200 bg-white p-3 text-sm"><h4 className="font-semibold">Điểm nhận và bàn giao hàng</h4>{point?<><p className="font-medium">{point.name}</p><p>{point.address}</p><p>Liên hệ bàn giao: {point.contactName} · <a className="underline" href={'tel:'+point.contactPhone}>{point.contactPhone}</a></p>{point.note&&<p className="whitespace-pre-wrap">{point.note}</p>}<a className="inline-flex min-h-11 items-center underline" target="_blank" rel="noopener noreferrer" href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(point.address)}>Xem điểm nhận trên bản đồ</a></>:<p className="text-stone-600">Vận hành chưa nhập điểm nhận cụ thể. Liên hệ Vận hành trước khi đến lấy hàng.</p>}
    {editable&&!locked&&<details><summary className="min-h-11 cursor-pointer">{point?'Sửa điểm nhận hàng':'Nhập điểm nhận hàng'}</summary><form className="space-y-2" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{await api('/api/v1/orders/'+order.id+'/pickup-point',form);syncNow();setForm(f=>({...f,reason:''}));setMessage('Đã cập nhật và thông báo HTX/shipper được phân công.');}catch(e){setMessage(e instanceof Error?e.message:'Không lưu được điểm nhận.');}finally{setBusy(false);}}}>
      {([['name','Tên điểm nhận',120],['address','Địa chỉ điểm nhận',500],['contactName','Người bàn giao',100],['contactPhone','Số điện thoại bàn giao',20]] as const).map(([key,label,max])=><Field key={key} label={label}><Input required type={key==='contactPhone'?'tel':'text'} maxLength={max} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></Field>)}
      <Field label="Hướng dẫn nhận hàng"><Textarea maxLength={500} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></Field><Field label="Lý do cập nhật điểm nhận"><Textarea required minLength={10} maxLength={1000} value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></Field><PrimaryButton disabled={busy}>Lưu điểm nhận hàng</PrimaryButton>
    </form></details>}{message&&<p role="status">{message}</p>}
  </section>;
}
