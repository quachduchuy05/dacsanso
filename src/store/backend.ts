import type { DemoState, UserAccount } from '../domain/types';
const KEY='dac-san-so-lao-cai:api-session';
export interface LoginResponse {accessToken:string;refreshToken:string;user:UserAccount;state:DemoState;version:number;authProvider?:'supabase'|'local'}
type Tokens=Pick<LoginResponse,'accessToken'|'refreshToken'|'authProvider'>;
const readTokens=():Tokens|null=>{try{return JSON.parse(sessionStorage.getItem(KEY)??'null');}catch{return null;}};
let tokens=readTokens();
let refreshing:Promise<void>|null=null;
export function saveTokens(value:Tokens|null) {tokens=value?{accessToken:value.accessToken,refreshToken:value.refreshToken,authProvider:value.authProvider}:null;try{if(tokens)sessionStorage.setItem(KEY,JSON.stringify(tokens));else sessionStorage.removeItem(KEY);}catch{/* still works in memory */}}
export function hasBackendSession(){return !!tokens;}
export async function api<T=any>(path:string,body?:unknown,method=body===undefined?'GET':'POST',requestId?:string):Promise<T> {
  const send=()=>fetch(path,{method,headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'}),...(tokens?{Authorization:`Bearer ${tokens.accessToken}`} :{}),...(requestId?{'Idempotency-Key':requestId}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});
  let res=await send();
  if(res.status===401&&tokens&&!path.includes('/auth/')) {
    refreshing??=(async()=>{try{if(tokens?.authProvider==='supabase'){const {refreshSupabaseSession}=await import('./supabase');const session=await refreshSupabaseSession();saveTokens({accessToken:session.access_token,refreshToken:session.refresh_token,authProvider:'supabase'});return;}const r=await fetch('/api/v1/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:tokens?.refreshToken}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Phiên đăng nhập đã hết hạn.');saveTokens(await r.json());}catch(e){saveTokens(null);window.dispatchEvent(new Event('backend-logout'));throw e;}})().finally(()=>{refreshing=null;});
    await refreshing;res=await send();
  }
  const result=res.headers.get('content-type')?.includes('application/json')?await res.json().catch(()=>null):await res.text();
  if(res.status===401&&tokens&&!path.includes('/auth/')){
    if(tokens.authProvider==='supabase'){try{const {signOutSupabase}=await import('./supabase');await signOutSupabase();}catch{/* Credentials are still cleared below. */}}
    saveTokens(null);window.dispatchEvent(new Event('backend-logout'));
  }
  if(!res.ok)throw new Error(result?.error??`Máy chủ trả lỗi ${res.status}.`);
  return result as T;
}
export function acceptLogin(result:LoginResponse){saveTokens(result);window.dispatchEvent(new CustomEvent('backend-login',{detail:result}));}
export async function backendLogout(){
  const session=tokens;
  // Clear local credentials synchronously so navigation cannot restore an outgoing session.
  saveTokens(null);window.dispatchEvent(new Event('backend-logout'));
  const revoke=(path:string,body:unknown)=>fetch(path,{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.accessToken}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
  try{const {disableLocalPush}=await import('./webPush');await disableLocalPush(id=>revoke('/api/v1/me/push',{action:'remove',id}));}catch{/* Local browser unsubscribe is attempted even if the server is offline. */}
  try{if(session)await revoke('/api/v1/auth/logout',{});}catch{/* Local credentials have already been cleared. */}
  finally{if(session?.authProvider==='supabase'){try{const {signOutSupabase}=await import('./supabase');await signOutSupabase();}catch{/* SDK storage is cleared by signOutSupabase. */}}}
}
