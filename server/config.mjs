import {existsSync,readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {resolve} from 'node:path';
export function loadEnvironment(){
  const inherited=new Set(Object.keys(process.env));
  for(const file of ['.env','.env.local'])if(existsSync(file))for(const [key,value]of Object.entries(parseEnv(readFileSync(file,'utf8'))))if(!inherited.has(key))process.env[key]=value;
}
export function configuration(){
  loadEnvironment();const env=process.env,port=Number(env.API_PORT||4000);
  return {port,demo:env.DEMO_MODE==='true',databaseProvider:env.DATABASE_PROVIDER||(env.SUPABASE_DB_URL?'supabase':'sqlite'),connectionString:env.SUPABASE_DB_URL,
    databasePath:resolve(env.DATABASE_PATH||'data/app.sqlite'),encryptionKey:env.DATA_ENCRYPTION_KEY,adminPhone:env.BOOTSTRAP_ADMIN_PHONE,
    supabaseUrl:env.SUPABASE_URL||env.VITE_SUPABASE_URL,supabasePublishableKey:env.SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_PUBLISHABLE_KEY,
    supabaseServiceKey:env.SUPABASE_SERVICE_ROLE_KEY,supabaseAdminEmail:env.SUPABASE_ADMIN_EMAIL?.trim(),
    ca:env.SUPABASE_DB_CA_PATH?readFileSync(env.SUPABASE_DB_CA_PATH,'utf8'):undefined,
    publicUrl:env.PUBLIC_URL,accountLinkUrl:env.ACCOUNT_LINK_DELIVERY_URL,accountLinkToken:env.ACCOUNT_LINK_DELIVERY_TOKEN,
    smsUrl:env.SMS_OTP_URL,smsToken:env.SMS_OTP_TOKEN,googleClientId:env.GOOGLE_CLIENT_ID||env.VITE_GOOGLE_CLIENT_ID,mapsKey:env.GOOGLE_MAPS_API_KEY,
    webhookSecrets:{payment:env.PAYMENT_WEBHOOK_SECRET,refund:env.REFUND_WEBHOOK_SECRET,payout:env.PAYOUT_WEBHOOK_SECRET,carrier:env.CARRIER_WEBHOOK_SECRET},
    webPush:{subject:env.WEB_PUSH_SUBJECT,publicKey:env.WEB_PUSH_PUBLIC_KEY,privateKey:env.WEB_PUSH_PRIVATE_KEY},
    paymentAdapter:{url:env.PAYMENT_SESSION_URL,token:env.PAYMENT_SESSION_TOKEN,checkoutOrigins:(env.PAYMENT_CHECKOUT_ORIGINS??'').split(',').map(value=>value.trim()).filter(Boolean)},
    allowedOrigins:(env.ALLOWED_ORIGINS||`http://localhost:3000,http://127.0.0.1:3000,http://localhost:${port}`).split(',').map(s=>s.trim())};
}
