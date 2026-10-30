import {createClient} from '@supabase/supabase-js';
import {assert,hash} from './security.mjs';
import {generateId} from '../src/domain/ids.ts';
import {normalizePhone} from '../src/domain/phone.ts';

export function supabaseServices(options={}) {
  if(!options.supabaseUrl)return {};
  assert(/^https:\/\/[a-z\d-]+\.supabase\.co$/.test(options.supabaseUrl),500,'SUPABASE_URL không hợp lệ.');
  const key=options.supabasePublishableKey||options.supabaseServiceKey;
  assert(key,500,'Thiếu SUPABASE_PUBLISHABLE_KEY.');
  const settings={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(10000)})}};
  return {supabase:createClient(options.supabaseUrl,key,settings),supabaseAdmin:options.supabaseServiceKey?createClient(options.supabaseUrl,options.supabaseServiceKey,settings):null};
}
export async function verifiedSupabaseUser(client,accessToken) {
  assert(client,503,'Chưa cấu hình Supabase Auth.');
  assert(typeof accessToken==='string'&&accessToken.length>=20&&accessToken.length<=10000,401,'Phiên Supabase không hợp lệ.');
  const {data,error}=await client.auth.getUser(accessToken);
  assert(!error&&data?.user&&!data.user.is_anonymous&&(data.user.email_confirmed_at||data.user.phone_confirmed_at),401,'Không xác minh được tài khoản Supabase.');
  return data.user;
}
export async function connectSupabaseIdentity(db,identity,options) {
  const {state}=await db.read();
  let user=state.users.find(u=>u.supabaseId===identity.id);
  if(user){assert(user.status==='active',403,'Tài khoản đã bị khóa.');return user;}
  const phone=identity.phone_confirmed_at?normalizePhone(identity.phone??''):'';
  const root=identity.email_confirmed_at&&options.supabaseAdminEmail&&identity.email?.toLowerCase()===options.supabaseAdminEmail.toLowerCase();
  // Only a confirmed phone can link a pre-provisioned staff account. Never trust user_metadata.role.
  user=phone?state.users.find(u=>u.phone===phone&&!u.supabaseId):null;
  if(!user&&root)user=state.users.find(u=>u.role==='admin'&&u.adminGroup==='root'&&!u.supabaseId);
  if(!user){
    const name=String(identity.user_metadata?.full_name??identity.user_metadata?.name??'Khách hàng').slice(0,60);
    const customerId=root?undefined:generateId('KH');
    user={id:generateId('U'),phone,name,role:root?'admin':'customer',...(root?{adminGroup:'root'}:{customerId}),status:'active',createdAt:new Date().toISOString()};
    // Do not create a second root merely because an environment variable was changed.
    if(root)assert(!state.users.some(u=>u.role==='admin'&&u.adminGroup==='root'&&u.supabaseId),403,'Quản trị gốc đã được liên kết.');
    state.users.push(user);
    if(customerId)state.customers.push({id:customerId,name,phone});
  }
  assert(user.status==='active',403,'Tài khoản đã bị khóa.');
  user.supabaseId=identity.id;
  user.emailMasked=identity.email?identity.email.slice(0,2)+'•••@'+identity.email.split('@')[1]:undefined;
  await db.save(state);await db.audit(user.id,'supabase-identity-linked');
  return user;
}
