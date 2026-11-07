import {secureUrl} from './provider-config.mjs';
import {applyGatewayResult} from '../src/domain/payment.ts';
import {deriveNotifications} from '../src/domain/notifications.ts';

/** A provider request that may have charged must be reconciled before releasing its hold. */
export async function verifyExpiredPayments(db,options,fetchImpl=fetch){
  const protectedIds=new Set();if(options.demo!==false)return protectedIds;
  const {state}=await db.read(),expired=state.transactions.filter(t=>t.status==='pending'&&Date.parse(t.expiresAt)<=Date.now());
  const adapter=options.paymentAdapter??{},url=secureUrl(adapter.statusUrl),origin=secureUrl(adapter.url)?.origin;
  const tasks=[];
  for(const tx of expired){
    const record=await db.sql.prepare("SELECT id FROM feature_records WHERE id=? AND kind='payment-session'").get('payment-session:'+tx.id);
    if(!record)continue; // No request has ever reached a configured merchant adapter.
    protectedIds.add(tx.id);
    if(!url||url.origin!==origin||typeof adapter.token!=='string'||tasks.length>=10||!await db.rate('verify-payment:'+tx.id,1,30000))continue;
    tasks.push((async()=>{
      try{
        const response=await fetchImpl(url.href,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+adapter.token},body:JSON.stringify({transactionId:tx.id,amount:tx.amount,currency:'VND'}),signal:AbortSignal.timeout(5000),redirect:'error'});
        if(!response.ok)return;const result=await response.json();if(result.transactionId!==tx.id||result.amount!==tx.amount||result.currency!=='VND')return;
        return {tx,result};
      }catch{/* An ambiguous adapter failure keeps the reservation until a conclusive response. */}
    })());
  }
  for(const checked of await Promise.all(tasks)){
    if(!checked)continue;const {tx,result}=checked;
    if(['unpaid','failed','cancelled'].includes(result.status)&&result.final===true){protectedIds.delete(tx.id);continue;}
    if(result.status!=='paid'||typeof result.providerRef!=='string'||result.providerRef.length<1||result.providerRef.length>128||!Number.isFinite(Date.parse(result.paidAt))||Date.parse(result.paidAt)>Date.now()+1000)continue;
    await db.transaction(async()=>{const current=await db.read(),pending=current.state.transactions.find(t=>t.id===tx.id);if(!pending||pending.status!=='pending')return;
      const paid=applyGatewayResult(current.state,tx.id,'success','verified:'+result.providerRef,new Date(result.paidAt));
      if(paid.ok){await db.save(deriveNotifications(current.state,paid.value.state,new Date()));await db.audit(null,'payment-status-verified',tx.id);}
    });
  }
  return protectedIds;
}
