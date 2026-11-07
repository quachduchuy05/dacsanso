import {describe,it,expect} from 'vitest';
import {makeState,line,placeInput,CUSTOMER,T0} from './fixtures';
import {planCheckout,placeCheckout} from '../checkout';
import {expireTransaction,applyGatewayResult} from '../payment';
import {parseGuestCart,GUEST_TTL} from '../guestCart';
import {readyDeliveryEstimate} from '../deliveryEstimate';

describe('Phase 2 checkout invariants',()=>{
  it('charges one delivery for the same trip across suppliers, and keeps split orders',()=>{
    const state=makeState();const ready=state.products.filter(p=>p.kind==='ready');const chosen=[ready[0],ready.find(p=>p.coopId!==ready[0].coopId)!];
    const input=placeInput(chosen.map(p=>line(p.id,1,p.price)),{},{experience:'phase2'});
    const plan=planCheckout(state,input,T0);expect(plan.errors).toEqual([]);expect(plan.orders).toHaveLength(2);expect(plan.orders.reduce((n,o)=>n+o.pricing.shippingFee,0)).toBe(state.params.standardShippingFee);
  });
  it('buy-now expiry never changes an existing cart; late money does not restore cancelled orders',()=>{
    const state=makeState(),p=state.products.find(p=>p.kind==='ready')!;state.carts['cust-1']=[line(p.id,2,p.price)];
    const result=placeCheckout(state,placeInput([line(p.id,1,p.price)],{},{experience:'phase2'}),CUSTOMER,T0);if(!result.ok||!result.transaction)throw Error('Expected payment');
    const later=new Date(Date.parse(result.transaction.expiresAt)+1),expired=expireTransaction(result.state,result.transaction,later);expect(expired.carts).toEqual(state.carts);
    const paid=applyGatewayResult(expired,result.transaction.id,'success','late-unique',later);if(!paid.ok)throw Error(paid.error);expect(paid.value.state.orders[0].status).toBe('cancelled');expect(paid.value.state.refunds).toHaveLength(1);
  });
  it('two buyers cannot both place the final unit and ready orders are platform confirmed',()=>{
    const state=makeState(),p=state.products.find(p=>p.kind==='ready')!;p.stockOnHand=1;
    const input=placeInput([line(p.id,1,p.price)],{[p.coopId+'|ready|']:{shipping:'standard',paymentMethod:'cod'}},{experience:'phase2'});
    const first=placeCheckout(state,input,CUSTOMER,T0);if(!first.ok)throw Error(first.error);expect(first.state.orders[0].status).toBe('preparing');expect(first.state.orders[0].statusHistory.some(h=>h.to==='confirmed')).toBe(true);
    const second=placeCheckout(first.state,{...input,idempotencyKey:'second-final-unit'},CUSTOMER,T0);expect(second.ok).toBe(false);
    const retry=placeCheckout(first.state,input,CUSTOMER,T0);expect(retry.ok&&retry.reused).toBe(true);
  });
  it('guest cart expires after seven days and strips any personal fields',()=>{
    const data={batchId:'guest-one',updatedAt:1000,phone:'private',lines:[{productId:'one',quantity:1,seenPrice:100,address:'private'}]};
    expect(parseGuestCart(JSON.stringify(data),1000+GUEST_TTL).lines).toEqual([]);
    expect(JSON.stringify(parseGuestCart(JSON.stringify(data),2000))).not.toContain('private');
  });
  it('rechecks the COD limit after sharing delivery fees and restores the last payment choice',()=>{
    const state=makeState();state.params.codMaxOrderValue=100001;
    const input=placeInput([line('x-dry',1,770000),line('y-dry',1,100000)],{'coop-y|ready|':{shipping:'standard',paymentMethod:'cod'}},{experience:'phase2',fromCart:true});
    const plan=planCheckout(state,input,T0),second=plan.orders.find(o=>o.coopId==='coop-y')!;expect(second.codAllowed).toBe(true);expect(second.paymentMethod).toBe('cod');expect(second.pricing.shippingFee).toBe(0);
    state.params.codMaxOrderValue=2000000;
    const first=placeCheckout(state,placeInput([line('y-dry',1,100000)],{'coop-y|ready|':{shipping:'standard',paymentMethod:'cod'}},{experience:'phase2'}),CUSTOMER,T0);
    if(!first.ok)throw Error(first.error);expect(planCheckout(first.state,placeInput([line('y-dry',1,100000)],{},{experience:'phase2'}),T0).orders[0].paymentMethod).toBe('cod');
  });
  it('delivery estimate uses the Hanoi calendar and stays unset until operations configures it',()=>{
    const at=new Date('2026-11-06T20:30:00Z');expect(readyDeliveryEstimate({},at)).toBeUndefined();expect(readyDeliveryEstimate({readyDeliveryDays:2},at)).toBe('2026-11-09');
  });
});
