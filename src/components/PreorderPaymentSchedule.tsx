import {formatMoney,type OrderPricing,type PaymentMethod} from '../domain/pricing';
export function PreorderPaymentSchedule({pricing,percent,step,method}:{pricing:OrderPricing;percent:number;step:number;method:PaymentMethod}){
  const base=Math.max(0,pricing.itemsTotal-pricing.discount)+pricing.giftBoxFee;
  return <section className="rounded-xl border border-champagne-300 bg-champagne-50/60 p-3 text-sm" aria-label="Lịch thanh toán đặt trước">
    <p className="font-semibold">Thanh toán đặt trước · cọc {percent}%</p>
    <ol className="mt-2 space-y-2">
      <li className="flex justify-between gap-3"><span>1. Cọc online khi đặt</span><strong className="whitespace-nowrap tabular-nums">{formatMoney(pricing.deposit)}</strong></li>
      <li className="flex justify-between gap-3"><span>2. {method==='cod'?'Trả khi nhận hàng':'Trả online khi hàng sẵn sàng'}</span><strong className="whitespace-nowrap tabular-nums">{formatMoney(pricing.remaining)}</strong></li>
    </ol>
    <p className="mt-2 text-xs leading-relaxed text-muted">Cọc tính trên {formatMoney(base)} gồm tiền hàng sau giảm giá{pricing.giftBoxFee>0?' và phí hộp quà':''}; không tính phí giao. {step>1?`Làm tròn lên theo bước ${formatMoney(step)}.`:''} Phần còn lại đã gồm phí giao, không cộng phí này lần nữa.</p>
  </section>;
}
