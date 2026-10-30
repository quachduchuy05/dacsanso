import '../server/register.mjs';
import {configuration} from '../server/config.mjs';
const {openDatabase}=await import('../server/postgres-database.mjs');
const {issueBootstrapLink}=await import('../server/account-security.mjs');

const options=configuration();
if(!options.demo&&!options.encryptionKey)throw new Error('Cần DATA_ENCRYPTION_KEY khi chạy chế độ thật.');
if(!options.publicUrl)throw new Error('Đặt PUBLIC_URL thành địa chỉ website để tạo liên kết kích hoạt.');
const url=new URL(options.publicUrl);
if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('PUBLIC_URL phải là địa chỉ website HTTP/HTTPS hợp lệ.');
options.publicUrl=url.origin;
const db=await openDatabase(options);
try{
  const result=await issueBootstrapLink(db,options);
  console.log('Liên kết đặt mật khẩu Quản trị gốc, dùng một lần, hết hạn sau 24 giờ:');
  console.log(result.link);
}finally{await db.close();}
