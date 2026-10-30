import {useState} from 'react';
import {useUi} from './UiContext';
import {useStore} from '../store/AppDataContext';
import {api,backendLogout} from '../store/backend';
import {Field,Input,PrimaryButton,SecondaryButton} from '../components/form';
import {PushSettings} from '../components/PushSettings';

export function ProfileTools(){
  const {user}=useUi(),{syncNow}=useStore();const [name,setName]=useState(user?.name??''),[phone,setPhone]=useState(''),[password,setPassword]=useState(''),[otp,setOtp]=useState(''),[challenge,setChallenge]=useState(''),[demo,setDemo]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const act=async(task:()=>Promise<void>)=>{setBusy(true);setMessage('');try{await task();}catch(e){setMessage(e instanceof Error?e.message:'Không thực hiện được.');}finally{setBusy(false);}};
  return <div className="space-y-4"><form className="grid gap-3" onSubmit={e=>{e.preventDefault();void act(async()=>{const r=await api('/api/v1/me/profile',{name});setMessage(r.message);syncNow();});}}><Field label="Tên tài khoản"><Input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></Field><PrimaryButton disabled={busy}>Lưu tên tài khoản</PrimaryButton></form>
    <details><summary className="min-h-11 cursor-pointer">Đổi số điện thoại đăng nhập</summary><div className="space-y-3"><Field label="Mật khẩu hiện tại để đổi số"><Input type="password" autoComplete="current-password" value={password} onChange={e=>{setPassword(e.target.value);setChallenge('');}}/></Field><Field label="Số điện thoại mới"><Input type="tel" value={phone} onChange={e=>{setPhone(e.target.value);setChallenge('');}}/></Field><SecondaryButton disabled={busy||!phone||!password} onClick={()=>act(async()=>{const r=await api('/api/v1/me/phone/start',{phone,currentPassword:password});setChallenge(r.challengeId);setDemo(r.demo);setMessage('Đã gửi mã, có hiệu lực 120 giây.');})}>Gửi OTP đến số mới</SecondaryButton>
      {challenge&&<><Field label="OTP đổi số điện thoại"><Input inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)}/></Field>{demo&&<p className="text-sm">Demo: OTP 123456.</p>}<PrimaryButton disabled={busy||otp.length!==6} onClick={()=>act(async()=>{await api('/api/v1/me/phone/confirm',{currentPassword:password,challengeId:challenge,otp});setPassword('');await backendLogout();window.dispatchEvent(new Event('show-login'));})}>Xác nhận đổi số</PrimaryButton></>}
    </div></details><PushSettings/>{message&&<p role="status">{message}</p>}
  </div>;
}
