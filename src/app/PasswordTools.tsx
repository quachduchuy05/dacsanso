import {AccountDeletionRequests} from '../components/AccountDeletionRequests';
import {useState,type FormEvent} from 'react';
import {ProfileTools} from './ProfileTools';
import {api,backendLogout} from '../store/backend';
import {useStore} from '../store/AppDataContext';
import {useUi} from './UiContext';
import {Field,Input,PrimaryButton} from '../components/form';
export function PasswordTools({mode,token}:{mode:'forgot'|'setup'|'change';token?:string}){
  const [phone,setPhone]=useState(''),[current,setCurrent]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[link,setLink]=useState('');
  const submit=async(e:FormEvent)=>{e.preventDefault();if(busy)return;setError('');setMessage('');setLink('');if(mode!=='forgot'&&password!==confirm){setError('Mật khẩu nhập lại chưa khớp.');return;}setBusy(true);try{
    const result=await api(`/api/v1/auth/password/${mode==='setup'?'reset':mode}`,mode==='forgot'?{phone}:mode==='setup'?{token,password}:{currentPassword:current,password});
    setMessage(result.message);setLink(result.setupLink??'');setPassword('');setConfirm('');setCurrent('');
    if(mode==='change'){await backendLogout();window.dispatchEvent(new Event('show-login'));}
    if(mode==='setup')history.replaceState(null,'','/dang-nhap');
  }catch(e){setError(e instanceof Error?e.message:'Không thực hiện được.');}finally{setBusy(false);}};
  return <form onSubmit={submit} className="auth-form rounded-xl border border-stone-200 bg-white p-4" aria-label={mode==='forgot'?'Khôi phục mật khẩu':mode==='setup'?'Đặt mật khẩu':'Đổi mật khẩu'}><h3 className="text-lg font-semibold">{mode==='forgot'?'Quên mật khẩu':mode==='setup'?'Đặt mật khẩu mới':'Đổi mật khẩu'}</h3>
    {mode==='forgot'?<Field label="Số điện thoại khôi phục"><Input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel"/></Field>:<>
      {mode==='change'&&<Field label="Mật khẩu hiện tại"><Input required type="password" autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)}/></Field>}
      <Field label="Mật khẩu mới" hint="8–32 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt."><Input required type="password" aria-label="Mật khẩu mới" autoComplete="new-password" minLength={8} maxLength={32} value={password} onChange={e=>setPassword(e.target.value)}/></Field><Field label="Xác nhận mật khẩu mới"><Input required type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></Field>
    </>}
    <PrimaryButton disabled={busy}>{busy?'Đang xử lý…':mode==='forgot'?'Gửi liên kết khôi phục':'Lưu mật khẩu'}</PrimaryButton>{error&&<p role="alert" className="auth-error">{error}</p>}{message&&<p role="status" className="text-sm text-forest-800">{message}</p>}{link&&<p className="text-sm">Chỉ trong demo: <a className="underline" href={link}>Mở liên kết đặt mật khẩu</a></p>}{mode==='setup'&&message&&<a href="/dang-nhap" className="text-sm underline">Về đăng nhập</a>}
  </form>;
}
export function AccountSecuritySettings(){
  const {user}=useUi();const {state}=useStore();const [target,setTarget]=useState(''),[link,setLink]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  if(!user)return null;const canActivate=user.role==='admin'&&['root','operations'].includes(user.adminGroup??'');
  return <details className="m-4 rounded-xl border border-stone-200 bg-white p-4"><summary className="cursor-pointer text-sm font-semibold">Bảo mật tài khoản</summary><div className="mt-4 space-y-4"><ProfileTools/><AccountDeletionRequests/><PasswordTools mode="change"/>{canActivate&&<form className="auth-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');setLink('');try{const r=await api('/api/v1/auth/password/activation',{userId:target});setLink(r.setupLink);}catch(e){setError(e instanceof Error?e.message:'Không cấp được liên kết.');}finally{setBusy(false);}}}><Field label="Tài khoản cần đặt mật khẩu"><select required className="min-h-11 w-full rounded border p-2" value={target} onChange={e=>{setTarget(e.target.value);setLink('');}}><option value="">Chọn tài khoản</option>{state.users.filter(u=>u.status==='active'&&(user.adminGroup==='root'?u.role==='admin':u.role!=='admin')).map(u=><option key={u.id} value={u.id}>{u.name} · {u.phone}</option>)}</select></Field><PrimaryButton disabled={busy}>Cấp liên kết đặt mật khẩu (24 giờ)</PrimaryButton>{link&&<div className="break-all text-sm"><p>Chỉ chuyển riêng cho đúng người nhận qua kênh đã xác minh:</p><a href={link} className="underline">{link}</a></div>}{error&&<p role="alert" className="auth-error">{error}</p>}</form>}</div></details>;
}
