import {createHash} from 'node:crypto';
import {assert} from './security.mjs';
import {normalizePhone,isValidPhone} from '../src/domain/phone.ts';
const EVENTS=new Set(['view_card','swipe','detail','open_3d','rotate_3d','open_360','add','undo','buy_now','cart','checkout_started','checkout_placed']);
export async function phase2Events(path,method,body,{db,auth}){
  if(path.endsWith('/delivery-interest')){
    if(method==='GET'){assert(auth?.user.role==='admin'&&['root','operations'].includes(auth.user.adminGroup),403,'Không có quyền xem đăng ký vùng giao.');const rows=await db.sql.prepare("SELECT id,data FROM feature_records WHERE kind='delivery-interest'").all();return {items:rows.map(r=>({id:r.id,...db.decodeJSON(r.data)}))};}
    if(method==='POST'&&body.action==='mark_notified'){
      assert(auth?.user.role==='admin'&&['root','operations'].includes(auth.user.adminGroup),403,'Không có quyền cập nhật đăng ký.');const row=await db.sql.prepare("SELECT data FROM feature_records WHERE id=? AND kind='delivery-interest'").get(body.id);assert(row,404,'Không tìm thấy đăng ký.');const data={...db.decodeJSON(row.data),status:'notified',notifiedAt:new Date().toISOString(),notifiedBy:auth.user.id};await db.sql.prepare('UPDATE feature_records SET data=? WHERE id=?').run(db.encodeJSON(data),body.id);await db.audit(auth.user.id,'delivery-interest-notified',body.id);return {ok:true};
    }
    assert(method==='POST',405,'Thao tác không hỗ trợ.');const phone=normalizePhone(typeof body.phone==='string'?body.phone:''),region=typeof body.region==='string'?body.region.trim():'';
    assert(isValidPhone(phone)&&region.length>=2&&region.length<=100&&body.consent===true,400,'Cần số điện thoại hợp lệ, vùng giao và đồng ý nhận tin.');
    const id='delivery-interest-'+createHash('sha256').update(phone+region.toLocaleLowerCase('vi')).digest('hex');
    await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(id,'delivery-interest','ops',db.encodeJSON({phone,region,consent:true,at:new Date().toISOString(),status:'waiting'}),0);return {ok:true};
  }
  if(method==='GET'){
    assert(auth?.user.role==='admin'&&['root','quality','operations'].includes(auth.user.adminGroup),403,'Không có quyền xem số liệu chọn mua.');const rows=await db.sql.prepare("SELECT data FROM feature_records WHERE kind='phase2-events' AND expires_at>?").all(Date.now()),totals={};for(const row of rows)for(const [key,value] of Object.entries(db.decodeJSON(row.data).counts))totals[key]=(totals[key]??0)+value;return {totals,windowDays:14};
  }
  assert(method==='POST'&&EVENTS.has(body.event)&&typeof body.session==='string'&&/^[a-f\d-]{36}$/.test(body.session),400,'Sự kiện không hợp lệ.');
  assert(Object.keys(body).every(k=>['event','session'].includes(k)),400,'Sự kiện không được chứa thông tin cá nhân.');
  assert(await db.rate('phase2-events:'+body.session,60,60000),429,'Gửi sự kiện quá nhanh.');
  const today=new Date().toISOString().slice(0,10),id='phase2-events-'+today+'-'+body.session;
  const previous=await db.sql.prepare("SELECT data FROM feature_records WHERE id=? AND kind='phase2-events'").get(id),data=previous?db.decodeJSON(previous.data):{date:today,counts:{}};
  data.counts[body.event]=(data.counts[body.event]??0)+1;await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(id,'phase2-events','anonymous',db.encodeJSON(data),Date.now()+14*86400000);await db.sql.prepare("DELETE FROM feature_records WHERE kind='phase2-events' AND expires_at<?").run(Date.now());return {ok:true};
}
