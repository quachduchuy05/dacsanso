import {useState} from 'react';
import {api} from '../store/backend';
import {Field,Input,PrimaryButton,SecondaryButton} from '../components/form';

export function ForgotOtpTools(){
  const [phone,setPhone]=useState(''),[challenge,setChallenge]=useState(''),[otp,setOtp]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[demo,setDemo]=useState(false);
  return <details><summary className="min-h-11 cursor-pointer">Khôi phục mật khẩu bằng OTP (Khách/HTX)</summary><form className="grid gap-3 rounded border p-3" onSubmit={async e=>{e.preventDefault();if(password!==confirm){setMessage('Mật khẩu nhập lại chưa khớp.');return;}setBusy(true);setMessage('');try{const r=await api('/api/v1/auth/password/reset-otp',{challengeId:challenge,otp,password});setMessage(r.message);setChallenge('');setPassword('');setConfirm('');setOtp('');}catch(e){setMessage(e instanceof Error?e.message:'Không khôi phục được.');}finally{setBusy(false);}}}>
    <Field label="Số điện thoại khôi phục bằng OTP"><Input required type="tel" value={phone} onChange={e=>{setPhone(e.target.value);setChallenge('');}}/></Field>
    <SecondaryButton disabled={busy||!phone} onClick={async()=>{setBusy(true);setMessage('');try{const r=await api('/api/v1/auth/password/forgot-otp',{phone});setChallenge(r.challengeId);setDemo(r.demo);setMessage('OTP có hiệu lực 120 giây.');}catch(e){setMessage(e instanceof Error?e.message:'Không gửi được OTP.');}finally{setBusy(false);}}}>Gửi OTP khôi phục</SecondaryButton>
    {challenge&&<><Field label="OTP khôi phục"><Input required inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)}/></Field>{demo&&<p>Demo: OTP 123456.</p>}<Field label="Mật khẩu mới qua OTP"><Input required type="password" minLength={8} maxLength={32} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></Field><Field label="Nhập lại mật khẩu mới qua OTP"><Input required type="password" minLength={8} maxLength={32} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></Field><PrimaryButton disabled={busy}>Đặt lại mật khẩu bằng OTP</PrimaryButton></>}
    {message&&<p role="status">{message}</p>}
  </form></details>;
}
