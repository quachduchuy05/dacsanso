import { useId } from 'react';
import { useUi } from '../../app/UiContext';
import { EmptyState } from '../../components/EmptyState';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/StatusBadge';
import { SwipeTabs } from '../../components/SwipeTabs';
import { TicketStatusBadge } from '../../components/TicketProgress';
import { ticketsOfOrder } from '../../store/commands/complaint';
import { unreadCount } from '../../store/commands/orderContact';
import { itemsAwaitingReview, ORDER_TABS, ordersInTab, refundSummary, reorderToCart, suggestedProducts, tabOf, type OrderTabKey } from '../../store/commands/orderTabs';
import { formatMoney } from '../../domain/pricing';
import { ORDER_KIND_LABEL, type Order } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';
import { ProductCard } from './ExploreTab';

/**
 * Danh sách đơn mua của khách (FR-DH-01), nằm trong Tài khoản (chủ repo yêu cầu gộp, không còn tab Đơn hàng riêng).
 * Kiểu "Đơn đã mua" theo video mẫu: hàng tab theo trạng thái, vuốt ngang để sang tab bên cạnh, hàng tab dính dưới
 * thanh trên cùng khi cuộn. Đơn mới hiện ngay sau khi đặt (L4). Tab trống có gợi ý "Có thể bạn cũng thích".
 * Số cột theo bề rộng phần chứa (container query), vì danh sách nằm trong cột của trang Tài khoản.
 * Đơn và số đếm do Tài khoản tính một lần rồi truyền vào (dùng chung với các biểu tượng trạng thái).
 */
export function OrdersSection({ orders: mine, counts }: { orders: Order[]; counts: Record<OrderTabKey, number> }) {
  const { orderTab, setOrderTab } = useUi();
  return (
    <div className="@container">
      <SwipeTabs
        label="Đơn theo trạng thái"
        tabs={ORDER_TABS.map((t) => ({ key: t.key, label: t.label, count: t.key === 'all' ? 0 : counts[t.key] }))}
        active={orderTab}
        onChange={setOrderTab}
        barClassName="sticky top-[calc(var(--app-header-h,0px)+var(--customer-bar-h,0px))] z-20"
        renderPanel={(key) => <OrdersPanel tab={key} orders={ordersInTab(mine, key)} />}
      />
    </div>
  );
}

function OrdersPanel({ tab, orders }: { tab: OrderTabKey; orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="space-y-8 pt-5">
        <EmptyState>{tab === 'all' ? 'Bạn chưa có đơn hàng nào.' : `Chưa có đơn nào ở mục "${tabOf(tab).label}".`}</EmptyState>
        <Suggestions />
      </div>
    );
  }
  return (
    <ul className="grid gap-3 pt-4 @3xl:grid-cols-2 @6xl:grid-cols-3">
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} />
      ))}
    </ul>
  );
}

/** "Có thể bạn cũng thích": sản phẩm đang bán khách chưa mua. */
function Suggestions() {
  const { state } = useStore();
  const { customerActor } = useUi();
  const titleId = useId();
  const products = suggestedProducts(state, customerActor.id!, 6);
  if (products.length === 0) return null;
  return (
    <section aria-labelledby={titleId} className="space-y-4">
      <h3 id={titleId} className="flex items-center gap-3 text-sm font-semibold text-stone-700">
        <span aria-hidden="true" className="h-px flex-1 bg-champagne-300" />
        Có thể bạn cũng thích
        <span aria-hidden="true" className="h-px flex-1 bg-champagne-300" />
      </h3>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 @xl:grid-cols-3 @xl:gap-x-5 @xl:gap-y-6 @3xl:grid-cols-4 @5xl:grid-cols-5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

const REBUY_STATUSES: Order['status'][] = ['delivered', 'cancelled', 'return_refund', 'returning', 'returned'];

const actionClass = {
  primary: 'min-h-11 rounded-full bg-forest-900 px-4 text-sm font-bold text-champagne-100 hover:bg-forest-800',
  secondary: 'min-h-11 rounded-full border border-champagne-300 bg-white px-4 text-sm font-semibold text-forest-900 hover:bg-champagne-50',
};

function OrderCard({ order: o }: { order: Order }) {
  const { state, run } = useStore();
  const { customerActor, openModal, showToast } = useUi();
  const tx = state.transactions.find((t) => t.status === 'pending' && t.orderIds.includes(o.id));
  const unread = unreadCount(state, o, 'customer');
  const refund = refundSummary(state, o.id);
  const toReview = itemsAwaitingReview(state, o);
  const canRebuy = REBUY_STATUSES.includes(o.status);
  const ticket = ticketsOfOrder(state, o.id)[0];

  const rebuy = async () => {
    const r = await run(
      (s, at) => reorderToCart(s, customerActor, o.id, at),
      (v) => v.state,
    );
    if (!r.ok) {
      showToast(r.error);
      return;
    }
    const skipped = r.value.skipped.map((x) => `${x.name} ${x.reason}`).join('; ');
    showToast(`Đã thêm ${r.value.added.length} sản phẩm vào giỏ.${skipped ? ` Bỏ qua: ${skipped}.` : ''}`);
    openModal({ type: 'cart' });
  };

  return (
    <li className="relative flex flex-col overflow-hidden rounded-3xl border border-champagne-200 bg-white shadow-[0_10px_28px_rgb(31,77,58,0.06)] hover:border-champagne-400">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-linear-to-b from-champagne-300 to-champagne-600" />
      <button onClick={() => openModal({ type: 'order_detail', orderId: o.id })} className="w-full flex-1 space-y-2.5 p-4 pl-5 text-left">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <span className="block font-mono text-sm font-bold text-ink">{o.id}</span>
            <span className="text-xs text-muted">
              {new Date(o.createdAt).toLocaleString('vi-VN')} · {o.coopName} · {ORDER_KIND_LABEL[o.kind]}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            <OrderStatusBadge status={o.status} />
            <PaymentStatusBadge status={o.paymentStatus} />
          </div>
        </div>
        <p className="font-display text-base font-semibold text-ink">{o.items.map((i) => `${i.name} (${i.unit}) × ${i.quantity}`).join(', ')}</p>
        <div className="flex items-baseline justify-between border-t border-dashed border-champagne-300 pt-2 text-sm">
          <span className="text-stone-600">Tổng đơn</span>
          <span className="font-display text-lg font-semibold tabular-nums text-forest-900">{formatMoney(o.pricing.total)}</span>
        </div>
        {refund && (
          <p className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-stone-600">Số tiền hoàn</span>
            <span>
              <span className="font-semibold tabular-nums text-ink">{formatMoney(refund.amount)}</span> · <span className="font-semibold text-forest-800">{refund.label}</span>
            </span>
          </p>
        )}
        {tx && <p className="rounded-lg bg-champagne-100 px-2 py-1 text-sm font-semibold text-champagne-900">Chờ thanh toán {formatMoney(tx.amounts[o.id] ?? 0)}</p>}
        {o.cancelRequest?.status === 'pending' && <p className="text-sm text-champagne-800">Đã gửi yêu cầu huỷ, chờ HTX duyệt.</p>}
        {toReview.length > 0 && <p className="text-sm font-semibold text-champagne-800">Chờ bạn đánh giá {toReview.length} sản phẩm</p>}
        {ticket && (
          <p className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-stone-600">Khiếu nại {ticket.id}:</span>
            <TicketStatusBadge status={ticket.status} />
          </p>
        )}
        {unread > 0 && (
          <p className="inline-flex rounded-full bg-forest-900 px-3 py-1 text-xs font-bold text-champagne-100">
            {unread} tin mới từ {o.coopName}
          </p>
        )}
      </button>
      {(tx || toReview.length > 0 || refund || canRebuy) && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-champagne-100 px-4 py-3 pl-5">
          {refund && (
            <button type="button" onClick={() => openModal({ type: 'order_detail', orderId: o.id })} className={actionClass.secondary}>
              Xem hoàn tiền
            </button>
          )}
          {canRebuy && (
            <button type="button" onClick={rebuy} className={toReview.length > 0 ? actionClass.secondary : actionClass.primary}>
              Mua lại
            </button>
          )}
          {toReview.length > 0 && (
            <button type="button" onClick={() => openModal({ type: 'review', orderId: o.id, productId: toReview[0].productId })} className={actionClass.primary}>
              Đánh giá
            </button>
          )}
          {tx && (
            <button type="button" onClick={() => openModal({ type: 'payment', txId: tx.id })} className={actionClass.primary}>
              Thanh toán
            </button>
          )}
        </div>
      )}
    </li>
  );
}
