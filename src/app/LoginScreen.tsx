import {useEffect,useState,type FormEvent} from 'react';
import {ArrowLeft,ArrowRight,Eye,EyeOff,ShieldCheck,Sprout} from 'lucide-react';
import {api,acceptLogin,type LoginResponse} from '../store/backend';
import {Field,Input,PrimaryButton,SecondaryButton} from '../components/form';
import {useUi} from './UiContext';
import {useStore} from '../store/AppDataContext';
import {SupabaseSignIn} from './SupabaseSignIn';
import {supabaseConfigured} from '../store/supabaseConfig';
import type {UserAccount} from '../domain/types';
import {PasswordTools} from './PasswordTools';
import {ForgotOtpTools} from './ForgotOtpTools';
import {GoogleSignIn} from './GoogleSignIn';

export function LoginScreen(){
  const {login,showToast,openModal}=useUi();const {demoMode}=useStore();
  const [registering,setRegistering]=useState(window.location.pathname==='/dang-ky');
  const [phone,setPhone]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[name,setName]=useState('');
  const [visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [accounts,setAccounts]=useState<UserAccount[]>([]);
  const [challenge,setChallenge]=useState(''),[otp,setOtp]=useState(''),[otpDemo,setOtpDemo]=useState(false),[resendAt,setResendAt]=useState(0),[remaining,setRemaining]=useState(0);
  useEffect(()=>{const timer=setInterval(()=>setRemaining(Math.max(0,Math.ceil((resendAt-Date.now())/1000))),1000);return()=>clearInterval(timer);},[resendAt]);
  useEffect(()=>{setChallenge('');setOtp('');setError('');},[phone,registering]);
  const sendCode=async()=>{if(busy||Date.now()<resendAt)return;setBusy(true);setError('');try{const result=await api('/api/v1/auth/otp',{phone,purpose:'register'});setChallenge(result.challengeId);setOtp('');setOtpDemo(result.demo);setResendAt(Date.now()+60000);setRemaining(60);}catch(e){setError(e instanceof Error?e.message:'Không gửi được mã.');}finally{setBusy(false);}};
  useEffect(()=>{const sync=()=>{setRegistering(window.location.pathname==='/dang-ky');setError('');setPassword('');setConfirm('');};window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[]);
  useEffect(()=>{if(demoMode)void api('/api/v1/demo/accounts').then(r=>setAccounts(r.users)).catch(()=>{});},[demoMode]);
  const switchPage=(register:boolean)=>{history.pushState(null,'',register?'/dang-ky':'/dang-nhap');window.dispatchEvent(new PopStateEvent('popstate'));};
  const submit=async(e:FormEvent)=>{
    e.preventDefault();if(busy)return;setError('');
    if(registering&&password!==confirm){setError('Mật khẩu nhập lại chưa khớp.');return;}
    if(registering&&(!challenge||otp.length!==6)){setError('Vui lòng xác minh số điện thoại bằng OTP trước khi tạo tài khoản.');return;}
    setBusy(true);
    try{const result=await api<LoginResponse>(`/api/v1/auth/password/${registering?'register':'login'}`,{phone,password,...(registering?{name,challengeId:challenge,otp}:{})});acceptLogin(result);login(result.user.id);history.replaceState(null,'','/');showToast(registering?'Đăng ký thành công.':`Xin chào ${result.user.name}.`);}
    catch(e){setError(e instanceof Error?e.message:'Không thể kết nối. Vui lòng thử lại.');}finally{setBusy(false);}
  };
  const setupToken=new URLSearchParams(window.location.search).get('setup');
  if(setupToken)return <div className="auth-page"><div className="mx-auto max-w-lg"><PasswordTools mode="setup" token={setupToken}/></div></div>;
  return <div className="auth-page"><div className="auth-layout">
    <aside className="auth-intro"><img src="/images/stitch/specialties-hero-v2.jpg" alt="Chè, mật ong và các món đặc sản vùng cao, ảnh minh họa"/><div className="auth-intro-shade"/><div className="auth-intro-copy"><Sprout size={38}/><p>TỪ MIỀN ĐẤT LÀNH</p><h1>Một chút quê hương.<br/><em>Một chút thương gửi bạn.</em></h1><p>Gắn kết cùng những người làm ra đặc sản, lưu lại hương vị yêu thích và đón chờ những mùa vụ mới.</p><span><ShieldCheck size={18}/> Tài khoản của bạn, hành trình của bạn.</span></div></aside>
    <div className="auth-form-panel"><button className="auth-back" onClick={()=>window.dispatchEvent(new Event('browse-catalog'))}><ArrowLeft size={16}/> Trở về cửa hàng</button>
      <p className="auth-eyebrow">ĐẶC SẢN SỐ</p><h2>{registering?'Đăng ký':'Đăng nhập'}</h2><p className="auth-description">{registering?'Tạo tài khoản để bắt đầu khám phá những hương vị quê nhà.':'Chào mừng bạn trở lại với những miền đất lành.'}</p>
      <GoogleSignIn/><div className="auth-divider"><span/>hoặc dùng số điện thoại<span/></div>
      <form onSubmit={submit} className="auth-form" aria-label={registering?'Đăng ký bằng số điện thoại':'Đăng nhập bằng số điện thoại'}>
        {registering&&<Field label="Họ tên"><Input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Họ và tên của bạn"/></Field>}
        <Field label="Số điện thoại"><Input required type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="0900 000 000" maxLength={20}/></Field>
        <Field label="Mật khẩu" hint={registering?'8–32 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.':undefined}><span className="auth-password"><Input aria-label="Mật khẩu" required type={visible?'text':'password'} minLength={registering?8:undefined} maxLength={32} autoComplete={registering?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nhập mật khẩu"/><button type="button" aria-label={visible?'Ẩn mật khẩu':'Hiện mật khẩu'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></Field>
        {registering&&<Field label="Nhập lại mật khẩu"><Input aria-label="Nhập lại mật khẩu" required type={visible?'text':'password'} autoComplete="new-password" maxLength={32} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Nhập lại mật khẩu của bạn"/></Field>}
        {registering&&<div className="space-y-3"><SecondaryButton type="button" disabled={busy||!phone||remaining>0} onClick={()=>void sendCode()}>{remaining>0?`Gửi lại sau ${remaining} giây`:challenge?'Gửi lại OTP đăng ký':'Gửi OTP đăng ký'}</SecondaryButton>{challenge&&<><Field label="OTP xác minh số điện thoại" hint="Mã có hiệu lực 120 giây."><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}/></Field>{otpDemo&&<p className="text-sm">Demo: OTP 123456.</p>}</>}</div>}
        {error&&<p className="auth-error" role="alert">{error}</p>}
        <PrimaryButton type="submit" disabled={busy} className="w-full">{busy?'Đang xử lý…':registering?'Tạo tài khoản':'Đăng nhập'} <ArrowRight size={16} className="inline ml-2"/></PrimaryButton>
      </form>
      {!registering&&<details className="auth-demo"><summary>Quên mật khẩu?</summary><PasswordTools mode="forgot"/><ForgotOtpTools/></details>}
      <p className="auth-switch">{registering?'Đã có tài khoản?':'Bạn chưa có tài khoản?'} <button onClick={()=>switchPage(!registering)}>{registering?'Đăng nhập':'Đăng ký ngay'}</button></p>
      {supabaseConfigured&&<SupabaseSignIn key={String(registering)} registering={registering}/>}
      {!registering&&demoMode&&<details className="auth-demo"><summary>Dùng thử tài khoản demo</summary><p>Mật khẩu demo: <strong>Dacsan@123</strong></p><select aria-label="Chọn tài khoản demo" value={phone} onChange={e=>{setPhone(e.target.value);setPassword('Dacsan@123');}}><option value="">Chọn một tài khoản</option>{accounts.map(u=><option key={u.id} value={u.phone}>{u.name} · {u.phone}</option>)}</select><p>Tài khoản tạo mới sử dụng mật khẩu bạn tự đặt.</p></details>}
      <div className="auth-coop"><p>Bạn là hợp tác xã muốn bán hàng?</p><SecondaryButton onClick={()=>openModal({type:'coop_apply'})}>Đăng ký HTX</SecondaryButton><button onClick={()=>openModal({type:'coop_apply_status'})}>Tra cứu hồ sơ</button></div>
    </div>
  </div></div>;
}
