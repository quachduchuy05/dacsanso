import {CheckCircle2} from 'lucide-react';
import {BottomSheet} from '../../components/BottomSheet';
import {useStore} from '../../store/AppDataContext';
import {useUi} from '../../app/UiContext';
import {useStorefront} from '../../app/StorefrontContext';
import {formatMoney} from '../../domain/pricing';
import {formatDateKey} from '../../domain/state';
import {ORDER_STATUS_LABEL} from '../../domain/types';
export function CheckoutCompleteSheet({checkoutId,onClose}:{checkoutId:string;onClose:()=>void}){
  const {state}=useStore();const {openOrders}=useUi();const {openCatalog}=useStorefront();const checkout=state.checkouts.find(c=>c.id===checkoutId);if(!checkout)return null;
  const orders=state.orders.filter(o=>checkout.orderIds.includes(o.id));
  const paid=orders.reduce((sum,o)=>sum+o.amountPaidOnline,0),cod=orders.reduce((sum,o)=>sum+o.pricing.payOnDelivery,0);
  return <BottomSheet className="signature-detail" title="Đã ghi nhận lần đặt" onClose={onClose} footer={<div className="grid grid-cols-2 gap-2"><button className="min-h-12 rounded-xl border px-3" onClick={()=>{onClose();openCatalog();}}>Mua tiếp</button><button className="signature-primary justify-center" onClick={()=>{onClose();openOrders('all');}}>Theo dõi đơn</button></div>}>
    <CheckCircle2 className="mx-auto text-forest-700" size={44}/><p className="text-center text-sm">Mã lần đặt <strong className="break-all">{checkout.id}</strong></p>
    <div className="rounded-xl bg-champagne-50 p-4 text-sm"><p>Đã trả online: <strong>{formatMoney(paid)}</strong></p><p>Trả khi nhận: <strong>{formatMoney(cod)}</strong></p>{orders.some(o=>o.status==='awaiting_payment')&&<p>Phần online chưa được xác nhận. Xem trạng thái ở đơn hàng.</p>}</div>
    {orders.map(o=><article key={o.id} className="space-y-1 rounded-xl border p-3 text-sm"><strong>{o.id}</strong><p>{o.coopName} · {ORDER_STATUS_LABEL[o.status]}</p><p>{(o.deliveryDate??o.estimatedDeliveryDate)?'Dự kiến giao '+formatDateKey((o.deliveryDate??o.estimatedDeliveryDate)!):'Ngày giao: theo tiến độ chuẩn bị và giao nhận của đơn.'}</p></article>)}
  </BottomSheet>;
}
