import { shipperStep, type ShipperStep } from '../../store/commands/shipper';
import { ORDER_STATUS_LABEL, type Order } from '../../domain/types';

const STEP: Record<Exclude<ShipperStep, 'done'>, { label: string; className: string }> = {
  wait_handover: { label: 'Chờ HTX bàn giao', className: 'bg-stone-200 text-stone-800' },
  pick_up: { label: 'Cần lấy hàng', className: 'bg-champagne-200 text-champagne-950' },
  deliver: { label: 'Đang giao', className: 'bg-forest-900 text-champagne-100' },
  reported: { label: 'Đã báo giao', className: 'bg-forest-100 text-forest-900' },
};

/** Việc shipper cần làm với đơn (đơn đã kết thúc phần giao thì ghi trạng thái đơn). */
export function ShipperStepBadge({ order }: { order: Order }) {
  const step = shipperStep(order);
  const s = step === 'done' ? { label: ORDER_STATUS_LABEL[order.status], className: 'bg-stone-100 text-stone-700' } : STEP[step];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.className}`}>{s.label}</span>;
}
