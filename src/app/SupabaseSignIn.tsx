import {useState,type FormEvent} from 'react';
import {supabase} from '../store/supabase';
import {api,acceptLogin,type LoginResponse} from '../store/backend';
import {Field,Input,PrimaryButton} from '../components/form';
import {useUi} from './UiContext';

export function SupabaseSignIn({registering=false}:{registering?:boolean}){
  const {login}=useUi();const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const submit=async(e:FormEvent)=>{
    e.preventDefault();if(!supabase||busy)return;setBusy(true);setError('');setNotice('');
    try{
      const {data,error}=registering?await supabase.auth.signUp({email:email.trim(),password}):await supabase.auth.signInWithPassword({email:email.trim(),password});
      if(error)throw error;
      if(!data.session){setNotice('Tài khoản đã tạo. Nếu dự án bật xác nhận email, hãy mở liên kết trong email trước khi đăng nhập.');return;}
      const session=data.session,result=await api<Omit<LoginResponse,'accessToken'|'refreshToken'>>('/api/v1/auth/supabase',{accessToken:session.access_token});
      acceptLogin({...result,accessToken:session.access_token,refreshToken:session.refresh_token,authProvider:'supabase'});login(result.user.id);history.replaceState(null,'','/');
    }catch(e){setError(e instanceof Error?e.message:'Không đăng nhập được.');}finally{setBusy(false);}
  };
  if(!supabase)return null;
  return <details className="auth-demo"><summary>{registering?'Đăng ký':'Đăng nhập'} bằng email Supabase</summary><form className="auth-form" onSubmit={submit} aria-label={registering?'Đăng ký bằng email':'Đăng nhập bằng email'}><Field label="Email"><Input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></Field><Field label="Mật khẩu email"><Input required type="password" minLength={8} maxLength={128} autoComplete={registering?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></Field><PrimaryButton disabled={busy}>{busy?'Đang xử lý…':registering?'Tạo tài khoản email':'Đăng nhập bằng email'}</PrimaryButton>{error&&<p role="alert" className="auth-error">{error}</p>}{notice&&<p role="status">{notice}</p>}</form></details>;
}
