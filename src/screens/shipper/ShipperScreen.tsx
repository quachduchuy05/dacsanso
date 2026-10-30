import { useState } from 'react';
import { Banknote, PackageCheck, PackageSearch, Truck } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { PAGE_X } from '../../app/layout';
import { EmptyState, ErrorState, SimBadge } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/form';
import { SwipeTabs } from '../../components/SwipeTabs';
import { formatMoney } from '../../domain/pricing';
import { codOnHand, codTotal, shipperOrders, shipperRemitCod, shipperStep } from '../../store/commands/shipper';
import type { Order } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';
import { ShipperStepBadge } from './ShipperStepBadge';

type ShipperTab = 'todo' | 'done' | 'returns' | 'cod';

const TAB_LABEL: Record<ShipperTab, string> = { todo: 'Cần giao', done: 'Đã giao', returns: 'Chuyển hoàn', cod: 'Thu hộ COD' };

function tabOf(o: Order): Exclude<ShipperTab, 'cod'> {
  const step = shipperStep(o);
  if (step === 'wait_handover' || step === 'pick_up' || step === 'deliver') return 'todo';
  if (step === 'reported' || o.status === 'delivered' || o.status === 'return_refund') return 'done';
  return 'returns';
}

/**
 * Kênh giao vận (Shipper; chủ repo yêu cầu ngày 18/10/2026). Shipper chỉ thấy đơn Admin – Vận hành giao cho mình.
 * Điện thoại trước: thẻ số việc ở trên, danh sách đơn theo tab vuốt ngang, bấm đơn để lấy hàng / báo kết quả giao.
 */
export function ShipperScreen() {
  const { state } = useStore();
  const { actor, user } = useUi();
  const [tab, setTab] = useState<ShipperTab>('todo');
  const listed = shipperOrders(state, actor);
  if (!listed.ok) return <ErrorState>{listed.error}</ErrorState>;
  const orders = listed.value;
  const onHand = codOnHand(state, actor.id ?? '');
  const byTab = (t: Exclude<ShipperTab, 'cod'>) => orders.filter((o) => tabOf(o) === t);
  const stats = [
    { icon: PackageSearch, label: 'Cần lấy hàng', value: String(orders.filter((o) => shipperStep(o) === 'pick_up').length) },
    { icon: Truck, label: 'Đang giao', value: String(orders.filter((o) => shipperStep(o) === 'deliver').length) },
    { icon: PackageCheck, label: 'Đã giao', value: String(byTab('done').length) },
    { icon: Banknote, label: 'Thu hộ đang giữ', value: formatMoney(codTotal(onHand)) },
  ];

  return (
    <div className={`flex flex-1 flex-col gap-4 py-4 ${PAGE_X}`}>
      <section aria-label="Tóm tắt việc giao hàng" className="lattice relative space-y-3 overflow-hidden rounded-3xl bg-forest-950 p-4 pb-6 text-white shadow-md">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne-300">Kênh giao vận</span>
          <h2 className="font-display text-2xl font-semibold">{user?.name}</h2>
          <p className="text-sm text-forest-100">Đơn do Admin – Vận hành phân công. Giao xong chụp ảnh, thu đúng tiền thu hộ.</p>
        </div>
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {stats.map((s) => (
            <li key={s.label} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
              <s.icon size={22} aria-hidden="true" className="shrink-0 text-champagne-300" />
              <span className="min-w-0">
                <span className="block font-display text-xl font-semibold tabular-nums">{s.value}</span>
                <span className="block text-xs text-forest-100">{s.label}</span>
              </span>
            </li>
          ))}
        </ul>
        <div aria-hidden="true" className="brocade-dark absolute inset-x-0 bottom-0 h-2" />
      </section>

      <SwipeTabs<ShipperTab>
        label="Đơn của shipper"
        tabs={(Object.keys(TAB_LABEL) as ShipperTab[]).map((key) => ({ key, label: TAB_LABEL[key], count: key === 'cod' ? onHand.length : byTab(key).length }))}
        active={tab}
        onChange={setTab}
        barClassName="sticky top-[var(--app-header-h,0px)] z-20"
        renderPanel={(key) => (key === 'cod' ? <CodPanel onHand={onHand} /> : <OrderList orders={byTab(key)} tab={key} />)}
      />
    </div>
  );
}

const EMPTY: Record<Exclude<ShipperTab, 'cod'>, string> = {
  todo: 'Chưa có đơn cần giao. Đơn mới hiện ở đây khi Admin – Vận hành phân công.',
  done: 'Chưa có đơn đã giao.',
  returns: 'Không có đơn chuyển hoàn.',
};

function OrderList({ orders, tab }: { orders: Order[]; tab: Exclude<ShipperTab, 'cod'> }) {
  const { openModal } = useUi();
  if (orders.length === 0)
    return (
      <div className="pt-4">
        <EmptyState>{EMPTY[tab]}</EmptyState>
      </div>
    );
  return (
    <ul className="grid gap-2 pt-4 lg:grid-cols-2 2xl:grid-cols-3">
      {orders.map((o) => (
        <li key={o.id}>
          <button
            onClick={() => openModal({ type: 'shipper_order', orderId: o.id })}
            className="h-full w-full space-y-1.5 rounded-2xl border border-stone-200 bg-white p-3 text-left hover:bg-stone-50"
          >
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm font-bold">{o.id}</span>
              <ShipperStepBadge order={o} />
            </span>
            <span className="block text-base font-semibold text-ink">{o.address.receiverName}</span>
            <span className="block text-sm text-stone-700">{o.address.text}</span>
            <span className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-stone-600">
                {o.items.reduce((n, i) => n + i.quantity, 0)} món · {o.coopName}
              </span>
              {o.pricing.payOnDelivery > 0 ? <strong className="tabular-nums text-ink">Thu hộ {formatMoney(o.pricing.payOnDelivery)}</strong> : <span className="text-forest-800">Đã thanh toán</span>}
            </span>
            {o.deliveryAttempts > 0 && o.status === 'shipping' && <span className="block text-sm font-semibold text-rose-800">Giao lại – đã thất bại {o.deliveryAttempts} lần</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

function CodPanel({ onHand }: { onHand: Order[] }) {
  const { state, run,demoMode } = useStore();
  const { actor, showToast } = useUi();
  const remittances = (state.codRemittances ?? []).filter((r) => r.shipperId === actor.id);
  const remit = async () => {
    const r = await run(
      (s, t) => shipperRemitCod(s, actor, t),
      (v) => v.state,
    );
    showToast(r.ok ? `Đã tạo phiếu nộp ${formatMoney(r.value.remittance.amount)}. Chờ Admin – Tài chính xác nhận.` : r.error);
  };
  return (
    <div className="space-y-4 pt-4">
      <section aria-label="Tiền thu hộ đang giữ" className="space-y-3 rounded-3xl border border-champagne-300 bg-white p-4">
        <p className="flex flex-wrap items-center gap-2 text-sm text-stone-700">
          {demoMode&&<SimBadge />} Lập phiếu để nộp tiền ngoài ứng dụng; chờ Tài chính xác nhận đã nhận. Thao tác này không tự chuyển tiền.
        </p>
        <p className="text-sm text-stone-700">
          Đang giữ <strong className="font-display text-2xl tabular-nums text-ink">{formatMoney(codTotal(onHand))}</strong> của {onHand.length} đơn.
        </p>
        {onHand.length > 0 && (
          <ul className="divide-y divide-stone-100 text-sm">
            {onHand.map((o) => (
              <li key={o.id} className="flex justify-between gap-2 py-1.5">
                <span className="font-mono">{o.id}</span>
                <span className="tabular-nums">{formatMoney(o.shipment?.codHeld ?? 0)}</span>
              </li>
            ))}
          </ul>
        )}
        <PrimaryButton className="w-full" disabled={onHand.length === 0} onClick={remit}>
          Nộp tiền thu hộ
        </PrimaryButton>
      </section>
      <section aria-label="Phiếu nộp tiền" className="space-y-2">
        <h3 className="font-display text-lg font-semibold text-ink">Phiếu nộp tiền</h3>
        {remittances.length === 0 ? (
          <EmptyState>Chưa có phiếu nộp tiền.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {remittances.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-white p-3 text-sm">
                <span>
                  <span className="font-mono font-bold">{r.id}</span> · {r.orderIds.length} đơn · {new Date(r.createdAt).toLocaleString('vi-VN')}
                </span>
                <span className="flex items-center gap-2">
                  <strong className="tabular-nums">{formatMoney(r.amount)}</strong>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.status === 'confirmed' ? 'bg-forest-100 text-forest-900' : 'bg-champagne-200 text-champagne-950'}`}>
                    {r.status === 'confirmed' ? 'Tài chính đã nhận' : 'Chờ Tài chính xác nhận'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
