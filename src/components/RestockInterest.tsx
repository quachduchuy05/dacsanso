import {useState} from 'react';
import {useUi} from '../app/UiContext';
import {api} from '../store/backend';
import {Field,Input,PrimaryButton} from './form';
export function RestockInterest({productId}:{productId:string}){
  const {user}=useUi();const [phone,setPhone]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[saved,setSaved]=useState(false);
  return <details className="rounded-xl border border-champagne-300 p-3 text-sm"><summary className="min-h-11 cursor-pointer font-semibold">Báo tôi khi có hàng</summary><p className="mb-3 text-muted">{user?'Nhận thông báo trong tài khoản khi quy cách này có hàng trở lại.':'Để lại số điện thoại để cửa hàng liên hệ khi quy cách này có hàng trở lại.'} Đăng ký không giữ hàng và không tạo đơn.</p>{saved?<p role="status">Đã ghi nhận đăng ký báo có hàng.</p>:<form className="space-y-3" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{await api('/api/v1/products/restock-interest',{productId,phone:user?undefined:phone,consent});setSaved(true);setPhone('');}catch(error){setMessage(error instanceof Error?error.message:'Chưa lưu được đăng ký.');}finally{setBusy(false);}}}>
    {!user&&<Field label="Số điện thoại nhận tin"><Input type="tel" autoComplete="tel" required maxLength={16} value={phone} onChange={e=>setPhone(e.target.value)}/></Field>}
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/>Tôi đồng ý nhận tin khi sản phẩm này có hàng.</label><PrimaryButton disabled={busy||!consent}>{busy?'Đang lưu…':'Đăng ký báo có hàng'}</PrimaryButton>{message&&<p role="alert">{message}</p>}
  </form>}</details>;
}
