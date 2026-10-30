import {createClient, type Session} from '@supabase/supabase-js';
import {supabaseUrl as url,supabasePublishableKey as key,supabaseConfigured} from './supabaseConfig';
const STORAGE_KEY='dac-san-so-lao-cai:supabase-auth';
// Use per-tab storage to preserve this app's separate accounts in separate tabs.
export const supabase=supabaseConfigured?createClient(url,key,{auth:{storage:sessionStorage,storageKey:STORAGE_KEY,flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export async function signOutSupabase(){try{await supabase?.auth.signOut({scope:'local'});}finally{sessionStorage.removeItem(STORAGE_KEY);sessionStorage.removeItem(STORAGE_KEY+'-code-verifier');}}
export async function refreshSupabaseSession():Promise<Session>{
  if(!supabase)throw new Error('Chưa cấu hình Supabase.');
  const {data,error}=await supabase.auth.refreshSession();
  if(error||!data.session)throw new Error('Phiên Supabase đã hết hạn. Vui lòng đăng nhập lại.');
  return data.session;
}
