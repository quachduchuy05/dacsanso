import { useState } from 'react';
import {PickupPointPanel} from '../../components/PickupPointPanel';
import { useUi } from '../../app/UiContext';
import { AdminTable, Td } from '../../components/AdminTable';
import { EmptyState } from '../../components/EmptyState';
import { Input, Select } from '../../components/form';
import { OrderStatusBadge } from '../../components/StatusBadge';
import { formatMoney } from '../../domain/pricing';
import { listShippers, opsAssignShipper } from '../../store/commands/shipper';
import { type Order } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/**
 * Giao hàng (Admin – Vận hành).
 * - Phân công shipper (chủ repo chọn cho OI-01 ngày 18/10/2026): đơn Đang chuẩn bị / Đang giao; đổi shipper khi chưa lấy hàng.
 * - Chỉ shipper tự cập nhật giao hàng; không có thao tác mô phỏng hoặc cập nhật thay trong màn Vận hành.
 */
export function CarrierSimTab() {
  const { state } = useStore();
  const active = state.orders
    .filter((o) => (o.status === 'preparing' || o.status === 'shipping') && !o.carrierDeliveredAt)
    .sort((a, b) => Number(!!a.shipment) - Number(!!b.shipment) || a.createdAt.localeCompare(b.createdAt));
  return (
    <div className="space-y-6">
      <section aria-labelledby="phan-cong-shipper" className="space-y-3">
        <h3 id="phan-cong-shipper" className="font-display text-xl font-semibold text-ink">
          Phân công shipper
        </h3>
        <p className="text-sm text-stone-700">Shipper chỉ thấy đơn được giao cho mình. Đổi shipper được khi shipper chưa lấy hàng. Ghi chú lấy hàng chỉ shipper thấy.</p>
        {active.length === 0 ? (
          <EmptyState>Không có đơn chờ giao.</EmptyState>
        ) : (
          <AdminTable columns={['Mã đơn', 'HTX', 'Giao tới', 'Tình trạng', 'Thu hộ', 'Shipper']} minWidth={980}>
            {active.map((o) => (
              <AssignRow key={o.id} order={o} />
            ))}
          </AdminTable>
        )}
      </section>

    </div>
  );
}

function AssignRow({ order: o }: { order: Order }) {
  const { state, run } = useStore();
  const { adminActor, showToast } = useUi();
  const shippers = listShippers(state).filter((u) => u.status === 'active');
  const [shipperId, setShipperId] = useState('');
  const [note, setNote] = useState(o.shipment?.pickupNote ?? '');
  const locked = !!o.shipment?.pickedUpAt;
  const assign = async () => {
    const r = await run((s, t) => opsAssignShipper(s, adminActor, o.id, shipperId, note, t));
    showToast(r.ok ? `Đã giao đơn ${o.id} cho ${shippers.find((u) => u.id === shipperId)?.name}.` : r.error);
    if (r.ok) setShipperId('');
  };
  return (
    <tr>
      <Td className="font-mono font-bold">{o.id}</Td>
      <Td>{o.coopName}</Td>
      <Td>{o.address.wardName}</Td>
      <Td>
        <OrderStatusBadge status={o.status} />
      </Td>
      <Td className="tabular-nums">{o.pricing.payOnDelivery > 0 ? formatMoney(o.pricing.payOnDelivery) : '—'}</Td>
      <Td>
        <PickupPointPanel order={o} editable/>
        {o.shipment && <p className="font-semibold text-ink">{o.shipment.shipperName}{locked ? ' · đã lấy hàng' : ''}</p>}
        {!locked && (
          <div className="flex flex-wrap items-end gap-2">
            <Select aria-label={`Shipper cho đơn ${o.id}`} value={shipperId} onChange={(e) => setShipperId(e.target.value)} className="w-auto min-w-40">
              <option value="">{o.shipment ? 'Đổi shipper…' : 'Chọn shipper…'}</option>
              {shippers
                .filter((u) => u.id !== o.shipment?.shipperId)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </Select>
            <div className="min-w-48 flex-1">
              <Input aria-label={`Ghi chú lấy hàng đơn ${o.id}`} placeholder="Ghi chú lấy hàng (không bắt buộc)" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
            </div>
            <button disabled={!shipperId} onClick={assign} className="min-h-11 rounded-xl bg-forest-800 px-3 font-semibold text-white disabled:bg-stone-300 disabled:text-stone-600">
              {o.shipment ? 'Đổi shipper' : 'Phân công'}
            </button>
          </div>
        )}
      </Td>
    </tr>
  );
}

