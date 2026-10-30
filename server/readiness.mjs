import {pushConfigured,paymentAdapterConfigured} from './provider-config.mjs';
const https=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}};
const secret=value=>typeof value==='string'&&value.trim().length>=16&&!/^(test|example|change|demo)/i.test(value);
export function productionReadiness(options){
  const checks=[];
  const check=(id,ok,message)=>checks.push({id,status:ok?'configured':'blocked',message});
  check('demo',options.demo===false,'DEMO_MODE phải là false.');
  check('encryption',/^[a-f\d]{64}$/i.test(options.encryptionKey??''),'Cấu hình DATA_ENCRYPTION_KEY 32 byte, lưu khóa riêng với backup.');
  check('public-url',https(options.publicUrl),'PUBLIC_URL phải là địa chỉ HTTPS của website.');
  check('origins',Array.isArray(options.allowedOrigins)&&options.allowedOrigins.length>0&&options.allowedOrigins.every(https),'ALLOWED_ORIGINS chỉ gồm các origin HTTPS được phép.');
  check('sms',https(options.smsUrl)&&secret(options.smsToken),'Cần SMS_OTP_URL HTTPS và SMS_OTP_TOKEN của adapter SMS.');
  check('web-push',pushConfigured(options),'Cần WEB_PUSH_SUBJECT và cặp khóa VAPID hợp lệ; nghiệm thu gửi trên thiết bị thật.');
  check('payment-session',paymentAdapterConfigured(options),'Cần URL/token adapter tạo phiên và danh sách origin checkout HTTPS; không thay cho nghiệm thu merchant.');
  check('account-links',https(options.accountLinkUrl)&&secret(options.accountLinkToken),'Cần adapter gửi liên kết khôi phục tài khoản qua kênh đã xác minh.');
  if(options.databaseProvider==='supabase'){
    check('database',!!options.connectionString,'Cần kết nối PostgreSQL và chạy migration mới nhất.');
    check('private-media',https(options.supabaseUrl)&&secret(options.supabaseServiceKey),'Cần Supabase Storage riêng tư và service key ở server.');
  }else checks.push({id:'database',status:'verify',message:'SQLite: chạy một backend với ổ lưu bền vững, lập lịch backup và thử phục hồi trên máy riêng.'});
  for(const name of ['payment','refund'])check(name+'-webhook',secret(options.webhookSecrets?.[name]),`Cần secret riêng đủ mạnh cho webhook ${name}.`);
  checks.push({id:'provider-adapters',status:'blocked',message:'Chưa có adapter outbound theo cổng thanh toán và hoàn tiền cụ thể. SRS giai đoạn 1 không yêu cầu API vận chuyển tự động hay chi trả HTX tự động; hai nghiệp vụ này dùng shipper nội bộ và ghi nhận chuyển khoản ngoài hệ thống.'});
  checks.push({id:'deployment-verification',status:'verify',message:'Cần kiểm thử HTTPS, SMS/provider thật, backup ngoài máy chủ, phân quyền, tải và phục hồi ở môi trường triển khai.'});
  return {ready:!checks.some(c=>c.status!=='configured'),checks};
}
