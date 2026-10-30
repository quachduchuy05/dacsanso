import { useId, useState } from 'react';
import { Search, Wheat, X } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { EmptyState, ErrorState } from '../../components/EmptyState';
import { Select } from '../../components/form';
import { ProductImage } from '../../components/ProductImage';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/StatusBadge';
import { SwipeTabs } from '../../components/SwipeTabs';
import { listOrdersFor } from '../../domain/access';
import { fullyHarvested, ordersAwaitingHarvest, quantityIn } from '../../store/commands/harvest';
import { needsReadyContact, unreadCount } from '../../store/commands/orderContact';
import {
  filterOrders,
  isOrderFilterActive,
  NO_ORDER_FILTER,
  ORDER_TABS,
  ordersInTab,
  PAYMENT_FILTERS,
  tabCounts,
  tabOf,
  type OrderFilter,
  type OrderTabKey,
  type PaymentFilterKey,
} from '../../store/commands/orderTabs';
import { formatMoney } from '../../domain/pricing';
import { formatDateKey } from '../../domain/state';
import { ORDER_KIND_LABEL, type Order, type OrderKind } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

const KIND_OPTIONS: { key: OrderKind | 'all'; label: string }[] = [
  { key: 'all', label: 'Mọi loại đơn' },
  { key: 'ready', label: ORDER_KIND_LABEL.ready },
  { key: 'preorder', label: ORDER_KIND_LABEL.preorder },
];

/**
 * Danh sách đơn của HTX (FR-DH-07). HTX chỉ thấy đơn của HTX mình.
 * Góp ý kiểm thử: tab theo tình trạng đơn vuốt ngang được (như "Đơn mua" của khách), thêm lọc theo loại đơn
 * (Đặt trước / Mua sẵn), tình trạng thanh toán (Đã thanh toán, Đã hoàn tiền…) và tìm theo mã đơn, tên sản phẩm.
 * Số trên mỗi tab đếm theo bộ lọc đang chọn. Trên cùng: sản phẩm đặt trước có đơn chờ thu hoạch.
 */
export function CoopOrdersTab() {
  const { state } = useStore();
  const { coopActor } = useUi();
  const [tab, setTab] = useState<OrderTabKey>('all');
  const [filter, setFilter] = useState<OrderFilter>(NO_ORDER_FILTER);
  const listed = listOrdersFor(state, coopActor);
  if (!listed.ok) return <ErrorState>{listed.error}</ErrorState>;
  const filtered = filterOrders(listed.value, filter);
  const counts = tabCounts(filtered);
  const set = (patch: Partial<OrderFilter>) => setFilter((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-3">
      {(tab === 'all' || tab === 'harvest') && <HarvestQueue />}
      <FilterBar filter={filter} onChange={set} onClear={() => setFilter(NO_ORDER_FILTER)} shown={filtered.length} total={listed.value.length} />
      <SwipeTabs<OrderTabKey>
        label="Đơn theo tình trạng"
        tabs={ORDER_TABS.map((t) => ({ key: t.key, label: t.label, count: counts[t.key] }))}
        active={tab}
        onChange={setTab}
        barClassName="sticky top-[var(--app-header-h,0px)] z-20"
        renderPanel={(key) => <OrdersPanel tab={key} orders={ordersInTab(filtered, key)} filtered={isOrderFilterActive(filter)} onClear={() => setFilter(NO_ORDER_FILTER)} />}
      />
    </div>
  );
}

function FilterBar({ filter, onChange, onClear, shown, total }: { filter: OrderFilter; onChange: (patch: Partial<OrderFilter>) => void; onClear: () => void; shown: number; total: number }) {
  const active = isOrderFilterActive(filter);
  return (
    <div role="search" aria-label="Lọc đơn" className="space-y-2 rounded-3xl border border-stone-200 bg-white p-3">
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="relative col-span-2 block xl:col-span-1">
          <span className="sr-only">Tìm theo mã đơn hoặc tên sản phẩm</span>
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-500" />
          <input
            type="search"
            value={filter.query}
            onChange={(e) => onChange({ query: e.target.value })}
            placeholder="Tìm mã đơn, tên sản phẩm…"
            className="min-h-11 w-full rounded-xl border border-stone-300 bg-white py-2.5 pr-3 pl-9 text-base text-ink focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 md:text-sm"
          />
        </label>
        <label className="block">
          <span className="sr-only">Loại đơn</span>
          <Select value={filter.kind} onChange={(e) => onChange({ kind: e.target.value as OrderFilter['kind'] })}>
            {KIND_OPTIONS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="sr-only">Tình trạng thanh toán</span>
          <Select value={filter.payment} onChange={(e) => onChange({ payment: e.target.value as PaymentFilterKey })}>
            {PAYMENT_FILTERS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </Select>
        </label>
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="col-span-2 flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 xl:col-span-1"
          >
            <X size={15} aria-hidden="true" /> Xoá lọc
          </button>
        )}
      </div>
      {active && (
        <p className="text-xs text-muted" aria-live="polite">
          Đang lọc: {shown}/{total} đơn khớp.
        </p>
      )}
    </div>
  );
}

function OrdersPanel({ tab, orders, filtered, onClear }: { tab: OrderTabKey; orders: Order[]; filtered: boolean; onClear: () => void }) {
  if (orders.length === 0) {
    return (
      <div className="space-y-3 pt-4">
        <EmptyState>{filtered ? `Không có đơn nào khớp bộ lọc ở mục "${tabOf(tab).label}".` : tab === 'all' ? 'Chưa có đơn nào.' : `Chưa có đơn nào ở mục "${tabOf(tab).label}".`}</EmptyState>
        {filtered && (
          <button
            type="button"
            onClick={onClear}
            className="mx-auto flex min-h-11 items-center rounded-full border border-champagne-300 bg-white px-4 text-sm font-semibold text-forest-900 hover:bg-champagne-50"
          >
            Xoá lọc
          </button>
        )}
      </div>
    );
  }
  return (
    <ul className="grid gap-2 pt-4 xl:grid-cols-2 2xl:grid-cols-3">
      {orders.map((o) => (
        <CoopOrderCard key={o.id} order={o} />
      ))}
    </ul>
  );
}

function CoopOrderCard({ order: o }: { order: Order }) {
  const { state } = useStore();
  const { openModal } = useUi();
  const unread = unreadCount(state, o, 'coop');
  const contact = needsReadyContact(state, o);
  return (
    <li>
      <button onClick={() => openModal({ type: 'coop_order', orderId: o.id })} className="h-full w-full space-y-1.5 rounded-2xl border border-stone-200 bg-white p-3 text-left hover:bg-stone-50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-sm font-bold">{o.id}</span>
          <span className="flex flex-wrap gap-1">
            <OrderStatusBadge status={o.status} />
            <PaymentStatusBadge status={o.paymentStatus} />
          </span>
        </div>
        <p className="text-sm text-stone-700">
          {ORDER_KIND_LABEL[o.kind]}
          {o.deliveryDate ? ` · giao ${formatDateKey(o.deliveryDate)}` : ''} · {o.items.map((i) => `${i.name} (${i.unit}) × ${i.quantity}`).join(', ')}
        </p>
        <p className="text-sm text-stone-600">
          Tiền hàng {formatMoney(o.pricing.itemsTotal)} · đặt {new Date(o.createdAt).toLocaleString('vi-VN')}
        </p>
        {o.status === 'awaiting_confirmation' && o.confirmDeadline && <p className="text-sm font-semibold text-champagne-800">Hạn xác nhận: {new Date(o.confirmDeadline).toLocaleString('vi-VN')}</p>}
        {o.cancelRequest?.status === 'pending' && <p className="text-sm font-semibold text-rose-700">Khách yêu cầu huỷ – cần duyệt</p>}
        {o.status === 'awaiting_harvest' && !o.readyReportedAt && fullyHarvested(o) && <p className="text-sm font-semibold text-forest-800">Đã thu hoạch – chờ báo sẵn sàng giao</p>}
        {(contact || unread > 0) && (
          <p className="flex flex-wrap gap-1.5">
            {contact && <span className="rounded-full bg-champagne-200 px-2.5 py-0.5 text-xs font-bold text-champagne-950">Hàng vào mùa – cần liên hệ khách</span>}
            {unread > 0 && <span className="rounded-full bg-forest-900 px-2.5 py-0.5 text-xs font-bold text-champagne-100">{unread} tin mới từ khách</span>}
          </p>
        )}
      </button>
    </li>
  );
}

/** Sản phẩm đặt trước có đơn chờ thu hoạch: xác nhận một lần cho cả lô. */
function HarvestQueue() {
  const { state } = useStore();
  const { coopActor, openModal } = useUi();
  const titleId = useId();
  const toHarvest = state.products
    .filter((p) => p.coopId === coopActor.id && p.kind === 'preorder')
    .map((p) => ({ product: p, waiting: ordersAwaitingHarvest(state, p.id) }))
    .filter((x) => x.waiting.length > 0);
  if (toHarvest.length === 0) return null;
  return (
    <section aria-labelledby={titleId} className="space-y-2 rounded-3xl border border-champagne-300 bg-champagne-50/70 p-3">
      <h3 id={titleId} className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <Wheat size={18} aria-hidden="true" className="text-champagne-700" /> Chờ thu hoạch
      </h3>
      <p className="text-xs text-muted">Thu hoạch xong, xác nhận một lần cho cả lô: hàng chia theo thứ tự đặt, đơn đặt sớm nhận trước.</p>
      <ul className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
        {toHarvest.map(({ product, waiting }) => {
          const needed = waiting.reduce((s, o) => s + quantityIn(o, product.id), 0);
          const earliest = waiting
            .map((o) => o.deliveryDate)
            .filter((d): d is string => !!d)
            .sort()[0];
          return (
            <li key={product.id} className="space-y-2 rounded-2xl border border-champagne-200 bg-white p-3">
              <div className="flex items-center gap-3">
                <ProductImage product={product} className="h-12 w-12 shrink-0 rounded-xl" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{product.name}</p>
                  <p className="text-sm text-stone-600">
                    {waiting.length} đơn · cần {needed.toLocaleString('vi-VN')} {product.unit}
                    {earliest ? ` · giao sớm nhất ${formatDateKey(earliest)}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openModal({ type: 'coop_harvest', productId: product.id })}
                className="min-h-11 w-full rounded-2xl bg-forest-900 px-4 text-sm font-bold text-champagne-100 hover:bg-forest-800"
              >
                Xác nhận thu hoạch {product.name}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
