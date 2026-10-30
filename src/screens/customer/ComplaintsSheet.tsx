import { useUi } from '../../app/UiContext';
import { BottomSheet } from '../../components/BottomSheet';
import { EmptyState, ErrorState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/form';
import { OrderStatusBadge } from '../../components/StatusBadge';
import { CustomerTicketCard } from '../../components/TicketProgress';
import { listTicketsFor } from '../../domain/access';
import { isTicketOpen } from '../../store/commands/complaint';
import type { Ticket } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/**
 * Khiếu nại của khách, nhóm theo đơn (góp ý kiểm thử: "Khiếu nại hiển thị theo đơn").
 * Mỗi đơn: mã đơn, HTX, sản phẩm, rồi từng khiếu nại của đơn với các bước xử lý. Đơn có khiếu nại đang xử lý lên đầu.
 */
export function ComplaintsSheet({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const { customerActor, openModal } = useUi();
  const listed = listTicketsFor(state, customerActor);
  const byOrder = new Map<string, Ticket[]>();
  if (listed.ok) for (const t of [...listed.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) byOrder.set(t.orderId, [...(byOrder.get(t.orderId) ?? []), t]);
  const groups = [...byOrder.entries()].sort(([, a], [, b]) => Number(b.some(isTicketOpen)) - Number(a.some(isTicketOpen)) || b[0].createdAt.localeCompare(a[0].createdAt));

  return (
    <BottomSheet
      title="Khiếu nại theo đơn"
      onClose={onClose}
      wide
      footer={
        <PrimaryButton className="w-full lg:ml-auto lg:block lg:w-auto lg:px-8" onClick={() => openModal({ type: 'complaint' })}>
          Gửi khiếu nại mới
        </PrimaryButton>
      }
    >
      {!listed.ok ? (
        <ErrorState>{listed.error}</ErrorState>
      ) : groups.length === 0 ? (
        <EmptyState>Bạn chưa gửi khiếu nại nào. Đơn Đã giao còn trong hạn có thể gửi khiếu nại, yêu cầu trả hàng.</EmptyState>
      ) : (
        <ul className="grid items-start gap-5 lg:grid-cols-2" aria-label="Khiếu nại theo đơn">
          {groups.map(([orderId, tickets]) => {
            const order = state.orders.find((o) => o.id === orderId);
            return (
              <li key={orderId} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-champagne-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-ink">Đơn {orderId}</p>
                    {order && (
                      <p className="truncate text-xs text-stone-600">
                        {order.coopName} · {order.items.map((i) => `${i.name} (${i.unit}) × ${i.quantity}`).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="flex items-center gap-2">
                    {order && <OrderStatusBadge status={order.status} />}
                    {order && (
                      <button
                        type="button"
                        onClick={() => openModal({ type: 'order_detail', orderId })}
                        className="min-h-11 rounded-full border border-champagne-300 bg-white px-3 text-sm font-semibold text-forest-900 hover:bg-champagne-100"
                      >
                        Xem đơn
                      </button>
                    )}
                  </span>
                </div>
                {tickets.map((t) => (
                  <CustomerTicketCard key={t.id} ticket={t} />
                ))}
              </li>
            );
          })}
        </ul>
      )}
    </BottomSheet>
  );
}
