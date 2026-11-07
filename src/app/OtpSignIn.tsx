import {useEffect,useState} from 'react';
import {api,acceptLogin,type LoginResponse} from '../store/backend';
import {useUi} from './UiContext';
import {Field,Input,PrimaryButton,SecondaryButton} from '../components/form';
export function OtpSignIn(){
  const {login}=useUi();const [phone,setPhone]=useState(''),[challenge,setChallenge]=useState(''),[code,setCode]=useState(''),[until,setUntil]=useState(0),[seconds,setSeconds]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[demo,setDemo]=useState(false);
  useEffect(()=>{const timer=setInterval(()=>setSeconds(Math.max(0,Math.ceil((until-Date.now())/1000))),1000);return()=>clearInterval(timer);},[until]);
  return <details className="auth-demo" open={sessionStorage.getItem('phase2-pending-checkout')?true:undefined}><summary className="min-h-11">Đăng nhập bằng mã OTP</summary><form className="space-y-3" onSubmit={async event=>{event.preventDefault();if(busy)return;setBusy(true);setError('');try{const result=await api<LoginResponse>('/api/v1/auth/login',{challengeId:challenge,otp:code});acceptLogin(result);login(result.user.id);history.replaceState(null,'','/');}catch(e){setError(e instanceof Error?e.message:'Không đăng nhập được.');}finally{setBusy(false);}}}>
    <Field label="Số điện thoại nhận OTP"><Input type="tel" value={phone} onChange={e=>{setPhone(e.target.value);setChallenge('');setCode('');}} autoComplete="tel"/></Field>
    <SecondaryButton type="button" disabled={busy||!phone||seconds>0} onClick={async()=>{setBusy(true);setError('');try{const r=await api('/api/v1/auth/otp',{phone,purpose:'login'});setChallenge(r.challengeId);setDemo(r.demo);setUntil(Date.now()+60000);setSeconds(60);}catch(e){setError(e instanceof Error?e.message:'Không gửi được OTP.');}finally{setBusy(false);}}}>{seconds?`Gửi lại sau ${seconds} giây`:challenge?'Gửi lại mã':'Nhận mã OTP'}</SecondaryButton>
    {challenge&&<><Field label="Mã OTP" hint="Mã có hiệu lực 120 giây. Tối đa 3 lần gửi trong 15 phút."><Input required inputMode="numeric" autoComplete="one-time-code" value={code} maxLength={6} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></Field>{demo&&<p className="text-sm">Chế độ demo: 123456.</p>}<PrimaryButton disabled={busy||code.length!==6}>Xác nhận đăng nhập</PrimaryButton></>}
    {error&&<p role="alert" className="auth-error">{error}</p>}<p>Tài khoản mới: chọn Đăng ký ở dưới để xác minh và tạo tài khoản.</p>
  </form></details>;
}
