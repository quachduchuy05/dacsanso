import {describe,it,expect} from 'vitest';
import {DEFAULT_PARAMS,updateParam} from '../params';
import {priceOrder} from '../pricing';
import {placeCheckout} from '../checkout';
import {applyGatewayResult} from '../payment';
import {makeState,line,placeInput,keyXPre,CUSTOMER,T0} from './fixtures';
describe('30 percent preorder deposit policy',()=>{
  it('splits 500000 goods into 150000 deposit and 350000 plus delivery later',()=>{
    const input={kind:'preorder' as const,lines:[{productId:'p',name:'P',unit:'box',unitPrice:500000,quantity:1}],discount:0,shippingFee:28000,expressSurcharge:0,giftBoxFee:0,paymentMethod:'online' as const};
    const p=priceOrder(input,DEFAULT_PARAMS);expect(p.deposit).toBe(150000);expect(p.remaining).toBe(378000);expect(p.payNowOnline+p.remaining).toBe(p.total);
    const cod=priceOrder({...input,paymentMethod:'cod'},DEFAULT_PARAMS);expect(cod.payNowOnline).toBe(150000);expect(cod.payOnDelivery).toBe(378000);
  });
  it('rejects invalid deposit configuration instead of producing excessive or undefined deposits',()=>{
    for(const percent of [0,-1,101,NaN,Infinity])expect(updateParam(DEFAULT_PARAMS,'depositPercent',percent,'admin','Policy',T0).ok).toBe(false);
    for(const step of [0,-1,1.5,NaN])expect(updateParam(DEFAULT_PARAMS,'depositRoundingStep',step,'admin','Policy',T0).ok).toBe(false);
    expect(updateParam(DEFAULT_PARAMS,'depositPercent',30,'admin','Confirmed',T0).ok).toBe(true);
  });
  it('keeps the order deposit snapshot and does not credit a repeated payment twice',()=>{
    const state=makeState();const date='2026-10-20';
    const placed=placeCheckout(state,placeInput([line('x-pre',1,85000,date)],{[keyXPre(date)]:{shipping:'standard',paymentMethod:'online'}}),CUSTOMER,T0);
    if(!placed.ok)throw Error(placed.error);expect(placed.transaction).toBeTruthy();
    placed.state.params={...placed.state.params,depositPercent:50};
    const paid=applyGatewayResult(placed.state,placed.transaction!.id,'success','DEPOSIT-ONCE',T0);if(!paid.ok)throw Error(paid.error);
    const order=paid.value.state.orders[0];expect(order.params.depositPercent).toBe(30);expect(order.amountPaidOnline).toBe(order.pricing.deposit);
    const retry=applyGatewayResult(paid.value.state,placed.transaction!.id,'success','DEPOSIT-ONCE',T0);if(!retry.ok)throw Error(retry.error);
    expect(retry.value.state.orders[0].amountPaidOnline).toBe(order.pricing.deposit);
  });
});
