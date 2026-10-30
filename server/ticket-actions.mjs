import {assert} from './security.mjs';
import {validateMediaReferences} from './media.mjs';
export async function ticketAction(path,body,{db,auth}){
  const match=path.match(/^\/api\/v1\/tickets\/([\w-]+)\/(supplement|assign|fulfillment)$/);if(!match)return null;
  const {state}=await db.read(),ticket=state.tickets.find(t=>t.id===match[1]);assert(ticket,404,'Không tìm thấy ticket.');
  const {user,actor}=auth,staff=user.role==='admin'&&['root','cskh'].includes(user.adminGroup),customer=user.role==='customer'&&user.customerId===ticket.customerId,coop=user.role==='coop'&&user.coopId===ticket.coopId;
  assert(staff||customer||coop,403,'Ticket không thuộc phạm vi của bạn.');assert(ticket.status!=='closed',409,'Ticket đã đóng.');
  const at=new Date().toISOString(),action=match[2];
  if(action==='supplement'){
    assert(typeof body.note==='string'&&body.note.trim().length>0&&body.note.length<=5000,400,'Nhập nội dung bổ sung, tối đa 5.000 ký tự.');
    const photos=body.photos??[];assert(Array.isArray(photos)&&photos.length<=5&&photos.every(s=>typeof s==='string'&&(/^(data:image\/(jpeg|png|webp);base64,|sb:\/\/)/.test(s))&&s.length<=1000000),400,'Tối đa 5 ảnh hợp lệ.');validateMediaReferences(photos,state,user);
    ticket.photos=[...ticket.photos,...photos];ticket.history.push({at,actor,action:'Bổ sung thông tin',note:body.note.trim()});
  }else if(action==='assign'){
    assert(staff,403,'Chỉ CSKH được phân công.');const assignee=state.users.find(u=>u.id===body.userId&&u.status==='active'&&u.role==='admin'&&u.adminGroup==='cskh');assert(assignee,400,'Chọn nhân viên CSKH đang hoạt động.');ticket.assignedUserId=assignee.id;ticket.history.push({at,actor,action:'Phân công người xử lý',note:assignee.name});
  }else{
    assert(ticket.fulfillment,400,'Ticket chưa yêu cầu đổi hoặc giao bù.');const current=ticket.fulfillment.status,next=body.status;
    assert((staff&&current==='requested'&&['approved','rejected'].includes(next))||((staff||coop)&&current==='approved'&&next==='shipped')||(customer&&current==='shipped'&&next==='completed'),409,'Không có quyền chuyển bước đổi/giao bù này.');
    assert(!['open','closed'].includes(ticket.status),409,'CSKH cần tiếp nhận trước.');
    if(next==='shipped')assert(typeof body.tracking==='string'&&body.tracking.trim().length>=3&&body.tracking.length<=100,400,'Nhập mã vận đơn đổi/giao bù.');
    ticket.fulfillment={...ticket.fulfillment,status:next,updatedAt:at,...(next==='shipped'?{tracking:body.tracking.trim()}:{})};ticket.history.push({at,actor,action:`Đổi/giao bù: ${{approved:'Đã duyệt',rejected:'Từ chối',shipped:'Đã gửi hàng',completed:'Đã nhận hàng'}[next]}`,note:next==='shipped'?body.tracking:undefined});
  }
  const recipients=state.users.filter(u=>u.customerId===ticket.customerId||(u.role==='admin'&&u.adminGroup==='cskh')||u.coopId===ticket.coopId);
  for(const recipient of recipients)if(recipient.id!==user.id)state.notifications.unshift({id:crypto.randomUUID(),userId:recipient.id,title:'Ticket có cập nhật',body:`Yêu cầu ${ticket.id} có thông tin mới.`,read:false,at,link:{type:'ticket',id:ticket.id}});
  await db.save(state);await db.audit(user.id,'ticket-'+action,ticket.id);return {ticket};
}
