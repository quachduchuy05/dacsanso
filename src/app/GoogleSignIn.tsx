import {useEffect,useRef,useState} from 'react';
import {api,acceptLogin,type LoginResponse} from '../store/backend';
import {GOOGLE_CLIENT_ID} from '../store/serviceStatus';
import {supabase} from '../store/supabase';
import {useUi} from './UiContext';

interface GoogleIdApi{
  initialize(options:{client_id:string;callback:(result:{credential?:string})=>void;ux_mode:'popup';auto_select:boolean}):void;
  renderButton(element:HTMLElement,options:Record<string,unknown>):void;
}
declare global{interface Window{google?:{accounts?:{id?:GoogleIdApi}}}}
let library:Promise<GoogleIdApi>|null=null;
function loadGoogle(){
  if(window.google?.accounts?.id)return Promise.resolve(window.google.accounts.id);
  library??=new Promise<GoogleIdApi>((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client?hl=vi';script.async=true;
    script.onload=()=>window.google?.accounts?.id?resolve(window.google.accounts.id):reject(new Error('Không tải được đăng nhập Google.'));
    script.onerror=()=>{script.remove();library=null;reject(new Error('Không kết nối được Google. Vui lòng tải lại trang và thử lại.'));};
    document.head.appendChild(script);
  });return library;
}
const PENDING='dac-san-so-lao-cai:google-oauth';
export function GoogleSignIn(){
  const {login}=useUi();const holder=useRef<HTMLDivElement>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const callbackTask=useRef<Promise<LoginResponse>|null>(null);
  const finish=(result:LoginResponse)=>{acceptLogin(result);login(result.user.id);history.replaceState(null,'','/');};
  useEffect(()=>{
    if(!supabase||!sessionStorage.getItem(PENDING))return;
    const params=new URLSearchParams(window.location.search);
    if(params.has('error')){sessionStorage.removeItem(PENDING);setError('Đăng nhập Google chưa hoàn tất. Vui lòng thử lại.');history.replaceState(null,'','/dang-nhap');return;}
    let cancelled=false;setBusy(true);
    callbackTask.current??=(async()=>{
      // getSession waits for the SDK's PKCE callback exchange (detectSessionInUrl).
      const {data,error}=await supabase!.auth.getSession();if(error)throw error;
      if(!data.session)throw new Error('Chưa nhận được phiên Google. Vui lòng chọn tài khoản lại.');
      const session=data.session,result=await api<Omit<LoginResponse,'accessToken'|'refreshToken'>>('/api/v1/auth/supabase',{accessToken:session.access_token});
      return {...result,accessToken:session.access_token,refreshToken:session.refresh_token,authProvider:'supabase'};
    })();
    void callbackTask.current.then(result=>{if(!cancelled){sessionStorage.removeItem(PENDING);finish(result);}}).catch(e=>{if(!cancelled){sessionStorage.removeItem(PENDING);setError(e instanceof Error?e.message:'Không xác minh được đăng nhập Google.');}}).finally(()=>{if(!cancelled)setBusy(false);});
    return()=>{cancelled=true;};
  },[]);
  useEffect(()=>{
    if(supabase||!GOOGLE_CLIENT_ID)return;
    let cancelled=false,stopResize=()=>{};
    void loadGoogle().then(google=>{
      if(cancelled||!holder.current)return;
      google.initialize({client_id:GOOGLE_CLIENT_ID,ux_mode:'popup',auto_select:false,callback:async({credential})=>{
        if(cancelled)return;if(!credential){setError('Google chưa trả về thông tin đăng nhập.');return;}
        setBusy(true);setError('');
        try{const result=await api<LoginResponse>('/api/v1/auth/google',{credential});if(!cancelled)finish(result);}
        catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Không đăng nhập được bằng Google.');}
        finally{if(!cancelled)setBusy(false);}
      }});
      let previousWidth=-1;
      const render=()=>{
        if(cancelled||!holder.current)return;
        const width=Math.floor(holder.current.clientWidth);if(width<=0||width===previousWidth)return;previousWidth=width;
        holder.current.replaceChildren();google.renderButton(holder.current,{type:width<200?'icon':'standard',theme:'outline',size:'large',text:'signin_with',shape:'rectangular',locale:'vi',...(width>=200?{width:Math.min(400,width)}:{})});
      };
      render();
      if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(render);observer.observe(holder.current);stopResize=()=>observer.disconnect();}
      else {window.addEventListener('resize',render);stopResize=()=>window.removeEventListener('resize',render);}
    }).catch(e=>{if(!cancelled)setError(e.message);});
    return()=>{cancelled=true;stopResize();};
  },[]);
  const start=async()=>{
    if(!supabase||busy)return;setBusy(true);setError('');sessionStorage.setItem(PENDING,'1');
    try{const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+'/dang-nhap',queryParams:{prompt:'select_account'}}});if(error)throw error;}
    catch(e){sessionStorage.removeItem(PENDING);setBusy(false);setError(e instanceof Error?e.message:'Không mở được đăng nhập Google.');}
  };
  const configured=!!supabase||!!GOOGLE_CLIENT_ID;
  return <section className="auth-google" aria-label="Đăng nhập bằng Google" aria-busy={busy}>
    {supabase||!configured?<button className="auth-google-button" type="button" disabled={busy||!configured} onClick={()=>{void start();}}><span aria-hidden="true" className="auth-google-mark">G</span>{busy?'Đang đăng nhập…':'Đăng nhập bằng Google'}</button>:<div ref={holder} className="auth-google-holder"/>}
    <p>{configured?'Chọn tài khoản Google để vào tài khoản khách hàng. Không cần nhập lại tên hoặc email.':'Đăng nhập Google chưa được cấu hình trên máy này.'}</p>
    {error&&<p role="alert" className="auth-error">{error}</p>}
  </section>;
}
