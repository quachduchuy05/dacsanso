import {assert,requestOtp,verifyOtp} from './security.mjs';
import {verifyPassword} from './passwords.mjs';
import {normalizePhone,isValidPhone} from '../src/domain/phone.ts';

export async function manageProfile(path,body,{db,auth,options,ip}){
  if(path.endsWith('/profile'))return db.transaction(async()=>{
    assert(typeof body.name==='string'&&body.name.trim().length>=2&&body.name.length<=100,400,'Tên từ 2–100 ký tự.');
    const {state}=await db.read(),user=state.users.find(u=>u.id===auth.user.id&&u.status==='active');assert(user,401,'Tài khoản không còn hoạt động.');
    user.name=body.name.trim();if(user.customerId){const customer=state.customers.find(c=>c.id===user.customerId);if(customer)customer.name=user.name;}
    await db.save(state);await db.audit(user.id,'profile-name-update',user.id);return {message:'Đã cập nhật tên tài khoản.'};
  });
  assert(await db.rate('profile-phone:'+auth.user.id,8,900000),429,'Thử đổi số điện thoại quá nhiều lần. Vui lòng chờ 15 phút.');
  const credential=await db.sql.prepare('SELECT password_hash FROM password_credentials WHERE user_id=?').get(auth.user.id);
  assert(credential&&await verifyPassword(body.currentPassword,credential.password_hash),401,'Xác thực bằng mật khẩu hiện tại để đổi số điện thoại. Tài khoản chưa có mật khẩu riêng cần thiết lập trước.');
  if(path.endsWith('/start')){
    const phone=normalizePhone(typeof body.phone==='string'?body.phone:'');assert(isValidPhone(phone)&&phone!==auth.user.phone,400,'Nhập số điện thoại mới hợp lệ.');
    assert(!(await db.read()).state.users.some(u=>u.id!==auth.user.id&&u.phone===phone),409,'Số điện thoại đã được sử dụng.');
    return requestOtp(db,{phone,purpose:'change-phone'},options,ip);
  }
  const phone=await verifyOtp(db,body,'change-phone');
  return db.transaction(async()=>{
    const {state}=await db.read(),user=state.users.find(u=>u.id===auth.user.id&&u.status==='active');assert(user,401,'Tài khoản không còn hoạt động.');
    assert(!state.users.some(u=>u.id!==user.id&&u.phone===phone),409,'Số điện thoại đã được sử dụng.');
    user.phone=phone;user.phoneVerifiedAt=new Date().toISOString();if(user.customerId){const customer=state.customers.find(c=>c.id===user.customerId);if(customer)customer.phone=phone;}
    await db.save(state);await db.sql.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);await db.sql.prepare('DELETE FROM account_links WHERE user_id=?').run(user.id);await db.audit(user.id,'profile-phone-change',user.id);
    return {message:'Đã đổi số điện thoại. Vui lòng đăng nhập lại.'};
  });
}
