import { useUi } from '../../app/UiContext';
import { EmptyState, ErrorState } from '../../components/EmptyState';
import { listOrdersFor } from '../../domain/access';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/StatusBadge';
import { formatMoney } from '../../domain/pricing';
import { ORDER_KIND_LABEL } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/** Toàn bộ đơn (Admin). Đơn mới hiện ngay ở cả 3 phía (L4). */
export function AdminOrdersTab() {
  const { state } = useStore();
  const { adminActor } = useUi();
  const r = listOrdersFor(state, adminActor);
  if (!r.ok) return <ErrorState>{r.error}</ErrorState>;
  const orders = r.value;
  if (orders.length === 0) return <EmptyState>Chưa có đơn.</EmptyState>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-stone-50 text-xs text-muted">
          <tr>
            <th className="px-3 py-2">Mã đơn</th>
            <th className="px-3 py-2">Tạo lúc</th>
            <th className="px-3 py-2">HTX</th>
            <th className="px-3 py-2">Loại</th>
            <th className="px-3 py-2">Trạng thái</th>
            <th className="px-3 py-2">Thanh toán</th>
            <th className="px-3 py-2 text-right">Tổng đơn</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="px-3 py-2 font-mono">{o.id}</td>
              <td className="px-3 py-2">{new Date(o.createdAt).toLocaleString('vi-VN')}</td>
              <td className="px-3 py-2">{o.coopName}</td>
              <td className="px-3 py-2">{ORDER_KIND_LABEL[o.kind]}</td>
              <td className="px-3 py-2">
                <OrderStatusBadge status={o.status} />
              </td>
              <td className="px-3 py-2">
                <PaymentStatusBadge status={o.paymentStatus} />
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatMoney(o.pricing.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
