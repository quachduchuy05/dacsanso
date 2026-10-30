import {assert} from './security.mjs';
import {REVIEW_HIDE_REASONS} from '../src/domain/reviews.ts';
export async function reviewPolicyRoute(path,method,body,{db,auth}){
  assert(auth.user.role==='admin'&&['root','cskh'].includes(auth.user.adminGroup),403,'Chỉ CSKH được kiểm duyệt.');const {state}=await db.read();
  if(path==='/api/v1/review-policy'){
    if(method==='GET')return state.reviewPolicy??{requireModeration:false,windowDays:30};
    assert(method==='POST'&&typeof body.requireModeration==='boolean'&&Number.isInteger(body.windowDays)&&body.windowDays>=1&&body.windowDays<=365,400,'Thời hạn từ 1–365 ngày.');
    state.reviewPolicy={requireModeration:body.requireModeration,windowDays:body.windowDays};await db.save(state);await db.audit(auth.user.id,'review-policy-update');return state.reviewPolicy;
  }
  assert(method==='POST',405,'Thao tác không hỗ trợ.');const id=path.split('/')[4],review=state.reviews.find(r=>r.id===id);assert(review,404,'Không tìm thấy đánh giá.');assert(['visible','rejected'].includes(body.status),400,'Trạng thái không hợp lệ.');
  if(body.status==='rejected')assert(REVIEW_HIDE_REASONS.includes(body.reason),400,'Chọn lý do vi phạm hợp lệ; không từ chối vì sao thấp.');
  review.status=body.status;review.hiddenReason=body.status==='rejected'?body.reason:undefined;await db.save(state);await db.audit(auth.user.id,'review-moderation',id,body.status);return {review};
}
