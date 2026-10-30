import {randomUUID} from 'node:crypto';
import {assert} from './security.mjs';
import {REVIEW_HIDE_REASONS} from '../src/domain/reviews.ts';

// Separate from product ratings: a review is backed by one delivered purchase.
export async function coopReviewsRoute(method,body,query,{db,auth}){
  const user=auth?.user,{state}=await db.read(),moderator=user?.role==='admin'&&user.adminGroup==='cskh';
  const records=await db.sql.prepare("SELECT id,owner_id,data FROM feature_records WHERE kind='coop-review'").all();
  const reviews=records.map(r=>({id:r.id,...db.decodeJSON(r.data)}));
  const ownSeller=user?.role==='coop'?user.coopId:null;
  if(method==='GET'){
    const coopId=query.get('coopId');
    assert(!coopId||state.coops.some(c=>c.id===coopId),404,'Không tìm thấy HTX.');
    const selected=reviews.filter(r=>!coopId||r.coopId===coopId);
    const visible=selected.filter(r=>r.status==='visible');
    const items=selected.filter(r=>moderator||r.status==='visible'||r.customerId===user?.customerId||r.coopId===ownSeller).map(r=>{
      const {customerId,orderId,hiddenReason,...publicItem}=r;
      return {...publicItem,verifiedPurchase:true,...(moderator||customerId===user?.customerId?{orderId}:{}),...(moderator||r.coopId===ownSeller||customerId===user?.customerId?{hiddenReason}:{} )};
    }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    const eligibleOrders=user?.role==='customer'?state.orders.filter(o=>o.customerId===user.customerId&&o.status==='delivered'&&(!coopId||o.coopId===coopId)&&!reviews.some(r=>r.orderId===o.id)&&(!o.deliveredAt||Date.now()<=Date.parse(o.deliveredAt)+(state.reviewPolicy?.windowDays??30)*86400000)).map(o=>({id:o.id,coopId:o.coopId})):[];
    return {items,eligibleOrders,rating:{count:visible.length,average:visible.length?Math.round(10*visible.reduce((n,r)=>n+r.stars,0)/visible.length)/10:null}};
  }
  assert(method==='POST',405,'Thao tác không hỗ trợ.');assert(user,401,'Vui lòng đăng nhập.');
  if(body.action==='submit'){
    assert(user.role==='customer',403,'Chỉ khách hàng được đánh giá HTX.');
    const order=state.orders.find(o=>o.id===body.orderId&&o.customerId===user.customerId);
    assert(order&&order.status==='delivered',403,'Chỉ đánh giá HTX của đơn Đã giao thuộc tài khoản của bạn.');
    assert(!order.deliveredAt||Date.now()<=Date.parse(order.deliveredAt)+(state.reviewPolicy?.windowDays??30)*86400000,422,'Đã quá thời hạn đánh giá.');
    assert(!reviews.some(r=>r.orderId===order.id),409,'Đơn này đã được đánh giá HTX.');
    assert(Number.isInteger(body.stars)&&body.stars>=1&&body.stars<=5,400,'Chọn từ 1 đến 5 sao.');
    assert(typeof body.comment==='string'&&body.comment.trim().length<=500&&(body.stars>2||body.comment.trim().length>=20),400,'Nhận xét tối đa 500 ký tự; 1–2 sao cần ít nhất 20 ký tự.');
    const id=randomUUID(),review={coopId:order.coopId,customerId:order.customerId,orderId:order.id,stars:body.stars,comment:body.comment.trim(),status:state.reviewPolicy?.requireModeration?'pending':'visible',createdAt:new Date().toISOString()};
    await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(id,'coop-review',user.id,db.encodeJSON(review),0);
    await db.audit(user.id,'coop-review-submit',id);return {id,status:review.status};
  }
  const record=records.find(r=>r.id===body.id);assert(record,404,'Không tìm thấy đánh giá.');const review=db.decodeJSON(record.data);
  if(body.action==='reply'){
    assert(ownSeller===review.coopId,403,'Chỉ HTX của đánh giá được phản hồi.');assert(!review.coopReply,409,'Đã phản hồi đánh giá này.');
    assert(typeof body.reply==='string'&&body.reply.trim().length>0&&body.reply.trim().length<=500,400,'Phản hồi từ 1–500 ký tự.');review.coopReply=body.reply.trim();
  }else{
    assert(body.action==='moderate'&&moderator,403,'Chỉ CSKH được kiểm duyệt.');
    assert(['visible','hidden','rejected'].includes(body.status),400,'Trạng thái không hợp lệ.');
    if(body.status!=='visible')assert(REVIEW_HIDE_REASONS.includes(body.reason),400,'Chọn lý do vi phạm hợp lệ; không ẩn vì sao thấp.');
    review.status=body.status;review.hiddenReason=body.status==='visible'?undefined:body.reason;
  }
  await db.sql.prepare('UPDATE feature_records SET data=? WHERE id=?').run(db.encodeJSON(review),record.id);
  await db.audit(user.id,'coop-review-'+body.action,record.id,body.action==='moderate'?JSON.stringify({status:review.status,reason:review.hiddenReason}):undefined);return {ok:true};
}
