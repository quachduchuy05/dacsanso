import {secureUrl,paymentAdapterConfigured} from './provider-config.mjs';
export {paymentAdapterConfigured} from './provider-config.mjs';
import {assert} from './security.mjs';

// This is an outbound contract for a company-controlled merchant adapter, not a bank integration.
// The adapter must persist the Idempotency-Key and verify the merchant's callbacks.
export async function createPaymentSession(transactionId,{db,auth,options,fetchImpl=fetch}){
  assert(auth.user.role==='customer',403,'Chỉ khách hàng thanh toán đơn của mình.');
  assert(paymentAdapterConfigured(options),503,'Chưa cấu hình cổng thanh toán thật. Bạn có thể dùng COD cho đơn đủ điều kiện.');
  const {state}=await db.read(),tx=state.transactions.find(item=>item.id===transactionId);
  assert(tx&&tx.customerId===auth.user.customerId,404,'Không tìm thấy giao dịch.');
  assert(tx.status==='pending'&&Date.parse(tx.expiresAt)>Date.now(),409,'Giao dịch đã kết thúc hoặc hết hạn.');
  assert(Number.isSafeInteger(tx.amount)&&tx.amount>0,409,'Số tiền giao dịch không hợp lệ.');
  const id='payment-session:'+tx.id;
  const record=await db.sql.prepare("SELECT data FROM feature_records WHERE id=? AND kind='payment-session'").get(id);
  const existing=record?db.decodeJSON(record.data):null;
  const adapter=options.paymentAdapter;
  if(existing?.checkoutUrl&&Date.parse(existing.expiresAt)>Date.now()){
    assert(adapter.checkoutOrigins.includes(secureUrl(existing.checkoutUrl)?.origin),503,'Cấu hình cổng thanh toán đã thay đổi. Liên hệ hỗ trợ để kiểm tra giao dịch.');
    return existing;
  }
  // An ambiguous timeout must be retried under the same key, never create a second charge.
  const request={transactionId:tx.id,kind:tx.kind,amount:tx.amount,currency:'VND',expiresAt:tx.expiresAt,returnUrl:new URL('/?paymentReturn=1',options.publicUrl).href};
  if(!record)await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(id,'payment-session',auth.user.id,db.encodeJSON({status:'requested',requestedAt:new Date().toISOString()}),Date.parse(tx.expiresAt)+86400000);
  let response;
  try{response=await fetchImpl(adapter.url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+adapter.token,'Idempotency-Key':id},body:JSON.stringify(request),signal:AbortSignal.timeout(10000),redirect:'error'});}catch{assert(false,502,'Chưa kết nối được cổng thanh toán. Thử lại giữ nguyên giao dịch; không chuyển tiền lần nữa nếu đã thanh toán.');}
  assert(response.ok,502,'Cổng thanh toán chưa tiếp nhận giao dịch. Vui lòng thử lại.');
  let result;try{result=await response.json();}catch{assert(false,502,'Phản hồi cổng thanh toán không hợp lệ.');}
  const checkout=secureUrl(result.checkoutUrl),expiresAt=Date.parse(result.expiresAt);
  assert(result.transactionId===tx.id&&result.amount===tx.amount&&result.currency==='VND'&&checkout&&adapter.checkoutOrigins.includes(checkout.origin)&&Number.isFinite(expiresAt)&&expiresAt>Date.now()&&expiresAt<=Date.parse(tx.expiresAt),502,'Thông tin thanh toán không khớp giao dịch.');
  const session={checkoutUrl:checkout.href,expiresAt:new Date(expiresAt).toISOString(),transactionId:tx.id};
  await db.sql.prepare('UPDATE feature_records SET data=? WHERE id=?').run(db.encodeJSON(session),id);
  await db.audit(auth.user.id,'payment-session-created',tx.id);
  // Creating a checkout session never marks the transaction paid. Only the signed webhook does.
  return session;
}
