import type {PayoutPeriod} from './types';

export function payoutSchedule(period:PayoutPeriod,at:Date){
  const paid=period.disbursements?.reduce((total,item)=>total+item.amount,0)??(period.status==='paid'?period.payout:0);
  const remaining=Math.max(0,period.payout-paid);
  const held=period.status!=='paid'&&period.reserveUntil&&at.getTime()<Date.parse(period.reserveUntil)?Math.min(remaining,period.reserveAmount??0):0;
  return {paid,remaining,held,available:Math.max(0,remaining-held)};
}
