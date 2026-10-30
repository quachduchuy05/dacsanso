import type {PayoutPeriod} from '../domain/types';
import {payoutSchedule} from '../domain/payoutSchedule';
import {formatMoney} from '../domain/pricing';
import {useNow} from '../store/AppDataContext';

export function PayoutProgress({period}:{period:PayoutPeriod}){
  const at=useNow(1000),schedule=payoutSchedule(period,at);
  if(!period.policy)return null;
  return <div className="w-full space-y-2 text-sm"><p>Chính sách bản {period.policy.revision} · Phí kỳ {formatMoney(period.payoutFee??0)} · Đã trả {formatMoney(schedule.paid)} · Còn phải trả {formatMoney(schedule.remaining)} · Được chi hiện tại {formatMoney(schedule.available)}</p>{schedule.held>0&&<p>Đang giữ {formatMoney(schedule.held)} đến {new Date(period.reserveUntil!).toLocaleString('vi-VN')}.</p>}{!!period.disbursements?.length&&<ul className="space-y-1">{period.disbursements.map(payment=><li key={payment.reference} className="break-words">{new Date(payment.at).toLocaleString('vi-VN')} · {formatMoney(payment.amount)} · Chứng từ {payment.reference}</li>)}</ul>}</div>;
}
