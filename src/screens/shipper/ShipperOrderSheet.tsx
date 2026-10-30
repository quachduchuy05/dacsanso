import { useState } from 'react';
import {PickupPointPanel} from '../../components/PickupPointPanel';
import { MapPin, Phone } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { BottomSheet, SheetColumns } from '../../components/BottomSheet';
import { ErrorState } from '../../components/EmptyState';
import { DangerButton, Field, Input, PrimaryButton, SecondaryButton, Textarea } from '../../components/form';
import { PhotoPicker } from '../../components/PhotoPicker';
import { OrderStatusBadge } from '../../components/StatusBadge';
import { TrackingTimeline } from '../../components/TrackingTimeline';
import { getOrderFor } from '../../domain/access';
import { formatPhone } from '../../domain/phone';
import { formatMoney } from '../../domain/pricing';
import { DELIVERY_FAIL_REASONS, lastFailure, MAX_PROOF_PHOTOS, shipperDelivered, shipperFailed, shipperPickUp, shipperRefused, shipperStep } from '../../store/commands/shipper';
import type { Order, Result } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';
import { ShipperStepBadge } from './ShipperStepBadge';

type Mode = 'success' | 'failed' | 'refused' | null;

/** Link chỉ đường trên Google Maps theo địa chỉ giao (mở ứng dụng bản đồ của máy). */
export const mapsLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/** Chi tiết đơn của shipper: người nhận, tiền thu hộ, hàng cần giao, các nút theo bước giao hàng. */
export function ShipperOrderSheet({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { state } = useStore();
  const { actor } = useUi();
  const found = getOrderFor(state, actor, orderId);
  if (!found.ok) {
    return (
      <BottomSheet title="Đơn cần giao" onClose={onClose}>
        <ErrorState>{found.error}</ErrorState>
      </BottomSheet>
    );
  }
  const o = found.value;
  return (
    <BottomSheet
      title={
        <>
          Đơn <span className="font-mono">{o.id}</span>
        </>
      }
      onClose={onClose}
      wide
    >
      <SheetColumns
        left={
          <>
            <CollectBox order={o} />
            <PickupPointPanel order={o}/>
            <Recipient order={o} />
            <Goods order={o} />
          </>
        }
        right={
          <>
            <Actions order={o} />
            <TrackingTimeline order={o} />
          </>
        }
      />
    </BottomSheet>
  );
}

function CollectBox({ order: o }: { order: Order }) {
  const cod = o.pricing.payOnDelivery;
  return (
    <div className={`space-y-1 rounded-3xl p-4 ${cod > 0 ? 'bg-champagne-100 text-ink' : 'bg-forest-50 text-forest-950'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <ShipperStepBadge order={o} />
        <OrderStatusBadge status={o.status} />
      </div>
      {cod > 0 ? (
        <p className="text-sm">
          Thu hộ khi giao: <strong className="font-display text-2xl tabular-nums">{formatMoney(cod)}</strong>
        </p>
      ) : (
        <p className="text-sm font-semibold">Khách đã thanh toán – không thu tiền khi giao.</p>
      )}
      {o.deliveryAttempts > 0 && (
        <p className="text-sm text-rose-800">
          Đã giao không thành công {o.deliveryAttempts}/{o.params.maxRedeliveries} lần giao lại{lastFailure(o)?.reason ? ` · lần gần nhất: ${lastFailure(o)!.reason}` : ''}.
        </p>
      )}
    </div>
  );
}

function Recipient({ order: o }: { order: Order }) {
  return (
    <section aria-label="Người nhận" className="space-y-2 rounded-3xl border border-stone-200 bg-white p-4 text-sm">
      <h4 className="font-bold text-ink">Người nhận</h4>
      <p className="text-base font-semibold text-ink">{o.address.receiverName}</p>
      <p className="text-stone-700">{o.address.text}</p>
      {o.note && <p className="rounded-xl bg-stone-50 p-2 text-stone-700">Ghi chú của khách: {o.note}</p>}
      <div className="grid grid-cols-2 gap-2">
        <a href={`tel:${o.address.receiverPhone}`} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-forest-900 px-3 text-sm font-bold text-champagne-100 hover:bg-forest-800">
          <Phone size={16} aria-hidden="true" /> Gọi {formatPhone(o.address.receiverPhone)}
        </a>
        <a
          href={mapsLink(o.address.text)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-champagne-300 bg-white px-3 text-sm font-bold text-forest-900 hover:bg-champagne-50"
        >
          <MapPin size={16} aria-hidden="true" /> Mở bản đồ
        </a>
      </div>
    </section>
  );
}

function Goods({ order: o }: { order: Order }) {
  return (
    <section aria-label="Hàng cần giao" className="space-y-2 rounded-3xl border border-stone-200 bg-white p-4 text-sm">
      <h4 className="font-bold text-ink">Hàng cần giao</h4>
      <ul className="divide-y divide-stone-100">
        {o.items.map((i) => (
          <li key={i.productId} className="py-1.5">
            {i.name} ({i.unit}) × {i.quantity}
          </li>
        ))}
      </ul>
      {o.gift?.sendToOther && <p className="rounded-xl bg-champagne-50 p-2 text-ink">Đơn quà gửi người khác: không đưa giấy tờ có ghi giá cho người nhận.</p>}
      <p className="text-stone-600">
        Điểm lấy hàng: {o.shipment?.pickupNote ?? 'Admin – Vận hành sẽ báo khi phân công.'} · {o.coopName}
      </p>
    </section>
  );
}

function Actions({ order: o }: { order: Order }) {
  const { run } = useStore();
  const { actor, showToast } = useUi();
  const [mode, setMode] = useState<Mode>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const step = shipperStep(o);

  const act = async (op: Parameters<typeof run>[0], done: string) => {
    const r = await run(op) as Result<unknown>;
    if (!r.ok) return setError(r.error);
    setError(null);
    setMode(null);
    setNote('');
    setReason('');
    setPhotos([]);
    showToast(done);
  };
  const open = (m: Mode) => {
    setError(null);
    setMode(m);
  };

  return (
    <section aria-label="Việc cần làm" className="space-y-3 rounded-3xl border border-champagne-300 bg-white p-4">
      <h4 className="font-display text-lg font-semibold text-ink">Việc cần làm</h4>
      {step === 'wait_handover' && <p className="text-sm text-stone-700">Chờ HTX đóng gói và bàn giao vận chuyển. Khi HTX bàn giao, bấm "Đã lấy hàng".</p>}
      {step === 'pick_up' && (
        <PrimaryButton className="w-full" onClick={() => act((s, t) => shipperPickUp(s, actor, o.id, t), 'Đã ghi nhận lấy hàng. Khách được báo đơn đang giao.')}>
          Đã lấy hàng
        </PrimaryButton>
      )}
      {step === 'deliver' && mode === null && (
        <div className="grid gap-2 sm:grid-cols-3">
          <PrimaryButton onClick={() => open('success')}>Giao thành công</PrimaryButton>
          <SecondaryButton onClick={() => open('failed')}>Giao thất bại</SecondaryButton>
          <DangerButton onClick={() => open('refused')}>Khách từ chối nhận</DangerButton>
        </div>
      )}
      {step === 'deliver' && mode === 'success' && (
        <div className="space-y-3">
          <p className="text-sm text-stone-700">Chụp ảnh hàng đã giao (bắt buộc, tối đa {MAX_PROOF_PHOTOS} ảnh).</p>
          <PhotoPicker
            photos={photos}
            onChange={(next) => {
              setPhotos(next);
              setError(null);
            }}
            max={MAX_PROOF_PHOTOS}
          />
          <Field label="Ghi chú (không bắt buộc)">
            <Input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Vd. gửi bảo vệ toà nhà" />
          </Field>
          {o.pricing.payOnDelivery > 0 && <p className="text-sm font-semibold text-ink">Thu {formatMoney(o.pricing.payOnDelivery)} của khách trước khi xác nhận.</p>}
          <div className="grid grid-cols-2 gap-2">
            <SecondaryButton onClick={() => setMode(null)}>Thôi</SecondaryButton>
            <PrimaryButton onClick={() => act((s, t) => shipperDelivered(s, actor, o.id, { photos, note }, t), 'Đã báo giao thành công. Chờ khách xác nhận đã nhận.')}>Xác nhận đã giao</PrimaryButton>
          </div>
        </div>
      )}
      {step === 'deliver' && mode === 'failed' && (
        <div className="space-y-3">
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-semibold text-stone-700">Lý do giao thất bại</legend>
            {DELIVERY_FAIL_REASONS.map((r) => (
              <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-stone-200 px-3 text-sm has-checked:border-forest-700 has-checked:bg-forest-50">
                <input type="radio" name={`fail-${o.id}`} value={r} checked={reason === r} onChange={() => setReason(r)} className="h-4 w-4 accent-forest-800" />
                {r}
              </label>
            ))}
          </fieldset>
          <Field label={reason === 'Khác' ? 'Lý do cụ thể' : 'Ghi chú (không bắt buộc)'}>
            <Textarea rows={2} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <p className="text-xs text-muted">Giao thất bại quá {o.params.maxRedeliveries} lần giao lại thì đơn chuyển hoàn về HTX (PAR-27).</p>
          <div className="grid grid-cols-2 gap-2">
            <SecondaryButton onClick={() => setMode(null)}>Thôi</SecondaryButton>
            <PrimaryButton onClick={() => act((s, t) => shipperFailed(s, actor, o.id, reason, note, t), 'Đã báo giao thất bại. Khách được thông báo.')}>Báo giao thất bại</PrimaryButton>
          </div>
        </div>
      )}
      {step === 'deliver' && mode === 'refused' && (
        <div className="space-y-3">
          <Field label="Lý do khách từ chối nhận">
            <Input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <p className="text-xs text-muted">Đơn chuyển hoàn về HTX.</p>
          <div className="grid grid-cols-2 gap-2">
            <SecondaryButton onClick={() => setMode(null)}>Thôi</SecondaryButton>
            <DangerButton onClick={() => act((s, t) => shipperRefused(s, actor, o.id, reason, t), 'Đã ghi khách từ chối nhận. Đơn chuyển hoàn.')}>Xác nhận từ chối nhận</DangerButton>
          </div>
        </div>
      )}
      {step === 'reported' && (
        <p className="text-sm text-stone-700">
          Đã báo giao thành công lúc {new Date(o.carrierDeliveredAt!).toLocaleString('vi-VN')}. Đơn sang Đã giao khi khách bấm "Đã nhận hàng" hoặc sau thời hạn tự chuyển.
        </p>
      )}
      {step === 'done' && <p className="text-sm text-stone-700">Đơn đã kết thúc phần giao hàng.</p>}
      {error && (
        <p role="alert" className="text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
    </section>
  );
}
