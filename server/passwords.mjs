import {scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import bcrypt from 'bcryptjs';
import {assert} from './security.mjs';
const derive=promisify(scrypt);
export function validatePassword(password){assert(typeof password==='string'&&password.length>=8&&password.length<=32&&/[a-z]/.test(password)&&/[A-Z]/.test(password)&&/\d/.test(password)&&/[^\w\s]/.test(password),400,'Mật khẩu phải từ 8–32 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.');}
export async function hashPassword(password){validatePassword(password);assert(!bcrypt.truncates(password),400,'Mật khẩu không vượt quá 72 byte UTF-8; hãy giảm số ký tự nhiều byte.');return bcrypt.hash(password,12);}
export async function verifyPassword(password,encoded){
  if(typeof password!=='string'||password.length>128)return false;
  if(typeof encoded!=='string')return false;
  if(/^\$2[aby]\$/.test(encoded)){if(bcrypt.truncates(password))return false;try{return await bcrypt.compare(password,encoded);}catch{return false;}}
  if(!/^scrypt:[a-f\d]{32}:[a-f\d]{128}$/i.test(encoded))return false;
  const [,salt,key]=encoded.split(':');const actual=await derive(password,salt,64);const expected=Buffer.from(key,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
