import {randomBytes} from 'node:crypto';
import {assert,hash,authenticate,requestOtp,verifyOtp} from './security.mjs';
import {hashPassword,verifyPassword} from './passwords.mjs';
import {normalizePhone,isValidPhone} from '../src/domain/phone.ts';

export async function issueAccountLink(db,user,options){
  const token=randomBytes(32).toString('base64url'),expires=Date.now()+86400000;
  const link=`${options.publicUrl??'http://localhost:3000'}/dang-nhap?setup=${token}`;
  await db.sql.prepare('DELETE FROM account_links WHERE user_id=? OR expires_at<?').run(user.id,Date.now());
  await db.sql.prepare('INSERT INTO account_links VALUES(?,?,?)').run(hash(token),user.id,expires);
  return {link,expiresAt:expires};
}
export async function issueBootstrapLink(db,options){
  return db.transaction(async()=>{
    const user=(await db.read()).state.users.find(u=>u.id==='bootstrap-root'&&u.role==='admin'&&u.adminGroup==='root'&&u.status==='active');
    assert(user,404,'Không tìm thấy Quản trị gốc khởi tạo. Kiểm tra BOOTSTRAP_ADMIN_PHONE và cơ sở dữ liệu.');
    assert(!await db.sql.prepare('SELECT user_id FROM password_credentials WHERE user_id=?').get(user.id),409,'Quản trị gốc đã có mật khẩu. Sử dụng quy trình khôi phục tài khoản.');
    const issued=await issueAccountLink(db,user,options);
    await db.audit(user.id,'bootstrap-activation-link',user.id);
    return issued;
  });
}
export async function accountSecurityRoute(path,req,body,{db,options,ip}){
  if(!path.startsWith('/api/v1/auth/password/')||req.method!=='POST')return null;
  if(path.endsWith('/forgot-otp'))return {status:200,body:await requestOtp(db,{phone:body.phone,purpose:'reset-password'},options,ip)};
  if(path.endsWith('/reset-otp')){
    assert(await db.rate('reset-otp:'+ip,10,900000),429,'Thử lại sau 15 phút.');
    const encoded=await hashPassword(body.password),phone=await verifyOtp(db,body,'reset-password');
    return db.transaction(async()=>{
      const user=(await db.read()).state.users.find(u=>u.phone===phone&&u.status==='active'&&['customer','coop'].includes(u.role));assert(user,400,'Không thể khôi phục tài khoản này bằng OTP. Admin dùng liên kết kích hoạt/khôi phục riêng.');
      await db.sql.prepare('INSERT INTO password_credentials VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET password_hash=excluded.password_hash').run(user.id,encoded);
      await db.sql.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);await db.sql.prepare('DELETE FROM account_links WHERE user_id=?').run(user.id);await db.sql.prepare('DELETE FROM password_attempts WHERE phone=?').run(phone);
      await db.audit(user.id,'password-reset-otp');return {status:200,body:{message:'Đã đặt lại mật khẩu qua OTP. Vui lòng đăng nhập lại.'}};
    });
  }
  if(path.endsWith('/forgot')){
    const phone=normalizePhone(typeof body.phone==='string'?body.phone:'');assert(isValidPhone(phone),400,'Số điện thoại không hợp lệ.');
    assert(await db.rate(`recover:${ip}`,5,900000)&&await db.rate(`recover-phone:${phone}`,3,900000),429,'Vui lòng chờ trước khi yêu cầu lại.');
    assert(options.demo||options.accountLinkUrl,503,'Chưa cấu hình dịch vụ gửi liên kết khôi phục. Liên hệ quản trị viên.');
    const user=(await db.read()).state.users.find(u=>u.phone===phone&&u.status==='active');
    const generic={message:'Nếu tài khoản hợp lệ, liên kết đặt mật khẩu sẽ được gửi đến thông tin liên hệ đã đăng ký.'};
    if(!user)return {status:200,body:generic};
    const issued=await db.transaction(()=>issueAccountLink(db,user,options));
    if(!options.demo){
      try{const r=await fetch(options.accountLinkUrl,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${options.accountLinkToken??''}`},body:JSON.stringify({phone:user.phone,...issued}),signal:AbortSignal.timeout(10000)});assert(r.ok,502,'Không gửi được liên kết.');}
      catch(e){await db.sql.prepare('DELETE FROM account_links WHERE user_id=?').run(user.id);throw e;}
    }
    await db.audit(user.id,'password-recovery-request');
    return {status:200,body:{...generic,...(options.demo?{demo:true,setupLink:issued.link}:{})}};
  }
  if(path.endsWith('/reset')){
    assert(typeof body.token==='string'&&body.token.length===43,400,'Liên kết không hợp lệ.');
    assert(await db.rate(`reset:${ip}`,20,900000),429,'Thử lại sau.');const encoded=await hashPassword(body.password);
    return db.transaction(async()=>{
      const link=await db.sql.prepare('SELECT * FROM account_links WHERE token_hash=? AND expires_at>?').get(hash(body.token),Date.now());
      const user=link&&(await db.read()).state.users.find(u=>u.id===link.user_id&&u.status==='active');assert(user,400,'Liên kết hết hạn hoặc đã được sử dụng.');
      await db.sql.prepare('INSERT INTO password_credentials VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET password_hash=excluded.password_hash').run(user.id,encoded);
      await db.sql.prepare('DELETE FROM account_links WHERE user_id=?').run(user.id);
      await db.sql.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
      await db.sql.prepare('DELETE FROM password_attempts WHERE phone=?').run(user.phone);
      await db.audit(user.id,'password-set');return {status:200,body:{message:'Đã đặt mật khẩu. Vui lòng đăng nhập lại.'}};
    });
  }
  if(path.endsWith('/change')){
    const {user}=await authenticate(db,req,true,options);assert(await db.rate(`change:${user.id}`,5,900000),429,'Thử lại sau.');
    const row=await db.sql.prepare('SELECT password_hash FROM password_credentials WHERE user_id=?').get(user.id);
    assert(row&&await verifyPassword(body.currentPassword,row.password_hash),401,'Mật khẩu hiện tại không đúng hoặc tài khoản chưa có mật khẩu riêng.');
    const encoded=await hashPassword(body.password);
    return db.transaction(async()=>{await db.sql.prepare('UPDATE password_credentials SET password_hash=? WHERE user_id=?').run(encoded,user.id);await db.sql.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);await db.sql.prepare('DELETE FROM account_links WHERE user_id=?').run(user.id);await db.audit(user.id,'password-change');return {status:200,body:{message:'Đã đổi mật khẩu. Vui lòng đăng nhập lại.'}};});
  }
  if(path.endsWith('/activation')){
    const {user:admin}=await authenticate(db,req,true,options);assert(admin.role==='admin'&&['root','operations'].includes(admin.adminGroup),403,'Chỉ quản trị được cấp liên kết kích hoạt.');
    const user=(await db.read()).state.users.find(u=>u.id===body.userId&&u.status==='active');assert(user,404,'Không tìm thấy tài khoản.');
    assert(user.adminGroup!=='root'||admin.adminGroup==='root',403,'Chỉ Quản trị gốc được cấp liên kết cho tài khoản Quản trị gốc.');
    assert(admin.adminGroup!=='root'||user.role==='admin',403,'Root chỉ cấp liên kết cho tài khoản Admin.');
    assert(admin.adminGroup!=='operations'||user.role!=='admin',403,'Vận hành không được cấp liên kết đặt mật khẩu cho Admin.');
    const issued=await db.transaction(()=>issueAccountLink(db,user,options));await db.audit(admin.id,'account-activation-link',user.id);
    return {status:200,body:{setupLink:issued.link,expiresAt:issued.expiresAt}};
  }
  return null;
}
