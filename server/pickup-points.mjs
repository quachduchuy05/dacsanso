import {assert} from './security.mjs';
import {normalizePhone,isValidPhone} from '../src/domain/phone.ts';
import {randomUUID} from 'node:crypto';

export async function savePickupPoint(id,body,{db,auth}){
  assert(auth.user.role==='admin'&&auth.user.adminGroup==='operations',403,'Chỉ Vận hành cập nhật điểm bàn giao.');
  const {state}=await db.read(),order=state.orders.find(o=>o.id===id);assert(order,404,'Không tìm thấy đơn.');
  assert(['confirmed','awaiting_harvest','preparing','shipping'].includes(order.status)&&!order.shipment?.pickedUpAt&&!order.carrierDeliveredAt,409,'Không đổi điểm nhận khi shipper đã lấy hàng hoặc đơn đã kết thúc.');
  const fields={name:120,address:500,contactName:100,note:500,reason:1000};
  for(const [key,max]of Object.entries(fields))assert(typeof body[key]==='string'&&body[key].trim().length>=(key==='note'?0:key==='reason'?10:2)&&body[key].length<=max,400,'Nhập tên điểm, địa chỉ, người liên hệ và lý do trong giới hạn.');
  const phone=normalizePhone(typeof body.contactPhone==='string'?body.contactPhone:'');assert(isValidPhone(phone),400,'Số điện thoại người bàn giao không hợp lệ.');
  const before=order.pickupPoint??null;
  order.pickupPoint={name:body.name.trim(),address:body.address.trim(),contactName:body.contactName.trim(),contactPhone:phone,note:body.note.trim(),updatedAt:new Date().toISOString(),updatedBy:auth.user.id};
  const recipients=state.users.filter(u=>u.status==='active'&&((u.role==='coop'&&u.coopId===order.coopId)||(u.role==='shipper'&&u.id===order.shipment?.shipperId)));
  for(const recipient of recipients)state.notifications.push({id:randomUUID(),userId:recipient.id,at:new Date().toISOString(),title:'Cập nhật điểm bàn giao',body:`Đơn ${order.id}: Vận hành đã cập nhật hướng dẫn nhận hàng.`,link:{type:'order',id:order.id},read:false});
  await db.save(state);await db.audit(auth.user.id,'order-pickup-point-updated',id,JSON.stringify({before,after:order.pickupPoint,reason:body.reason.trim()}));return {pickupPoint:order.pickupPoint};
}
