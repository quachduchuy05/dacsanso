import { useRef, useState } from 'react';
import {PickupPointPanel} from '../../components/PickupPointPanel';
import { useUi } from '../../app/UiContext';
import { BottomSheet, SheetColumns } from '../../components/BottomSheet';
import { OrderChat } from '../../components/OrderChat';
import { OrderJourney } from '../../components/OrderJourney';
import { TrackingTimeline } from '../../components/TrackingTimeline';
import { DangerButton, PrimaryButton, ReasonPrompt, SecondaryButton } from '../../components/form';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/StatusBadge';
import { getOrderFor } from '../../domain/access';
import { harvestsForOrder, ordersAwaitingHarvest } from '../../store/commands/harvest';
import { readyMessageTemplate } from '../../store/commands/orderContact';
import { coopCannotSupply, coopConfirm, coopDecideCancelRequest, coopHandover, coopReceiveReturn, coopReject, coopReportReady } from '../../store/commands/orders';
import { formatMoney } from '../../domain/pricing';
import { formatDateKey } from '../../domain/state';
import { ORDER_KIND_LABEL, ORDER_STATUS_LABEL } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';
import { InvoiceSummary } from '../../components/InvoiceFields';
import { CoopContactCard } from './CoopContactCard';
import { HarvestForm } from './HarvestForm';

type Pending = null | 'reject' | 'cannot_supply' | 'reject_cancel' | 'harvest';

/**
 * Đơn phía HTX: xác nhận / từ chối, báo sẵn sàng, đóng gói & bàn giao, nhận hàng hoàn, duyệt yêu cầu huỷ (FR-DH-08..10, 16, 17).
 * Liên hệ khách (gọi điện, nhắn tin), hành trình đơn, xác nhận thu hoạch xong: chủ repo yêu cầu sau Giai đoạn 6.
 */
export function CoopOrderSheet({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { state, run } = useStore();
  const { coopActor, showToast, openModal } = useUi();
  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState('');
  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null);
  const chatInput = useRef<HTMLTextAreaElement>(null);
  const found = getOrderFor(state, coopActor, orderId);
  if (!found.ok) return null;
  const order = found.value;

  const act = async (op: Parameters<typeof run>[0], ok: string) => {
    const r = await run(op);
    showToast(r.ok ? ok : r.error);
    if (r.ok) {
      setPending(null);
      setReason('');
    }
  };
  const hidePrice = !!order.gift?.sendToOther;
  // Đơn đặt trước chờ thu hoạch: sản phẩm nào chưa xác nhận thu hoạch thì xác nhận trước, xong hết mới báo sẵn sàng.
  const awaitingHarvest = order.status === 'awaiting_harvest' && !order.readyReportedAt;
  const harvestTarget = order.items.find((i) => !order.harvest?.[i.productId]);
  const harvests = harvestsForOrder(state, order);
  const multiProduct = order.items.length > 1;
  const sameProductWaiting = awaitingHarvest && harvestTarget ? ordersAwaitingHarvest(state, harvestTarget.productId).length : 0;

  return (
    <BottomSheet
      title={
        <>
          <span className="block font-mono">{order.id}</span>
          <span className="mt-1 flex flex-wrap gap-1 font-sans">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </span>
        </>
      }
      onClose={onClose}
      wide
    >
      <SheetColumns
        left={
          <>
            <section className="space-y-1 rounded-2xl border border-stone-300 bg-white p-3 text-sm" aria-label="Phiếu đóng gói">
              <h4 className="font-bold">Phiếu đóng gói {hidePrice && <span className="font-normal text-muted">(quà gửi người khác – không in giá)</span>}</h4>
              <p>
                {ORDER_KIND_LABEL[order.kind]}
                {order.deliveryDate ? ` · giao ngày ${formatDateKey(order.deliveryDate)}` : ''} · {order.shipping === 'express' ? 'Hoả tốc' : 'Giao thường'}
              </p>
              <p>
                Người nhận: {order.address.receiverName} · {order.address.receiverPhone}
              </p>
              <p>Địa chỉ: {order.address.text}</p>
              <ul className="mt-1 border-t border-stone-100 pt-1">
                {order.items.map((i) => (
                  <li key={i.productId} className="flex justify-between">
                    <span>
                      {i.name} × {i.quantity} {i.unit}
                    </span>
                    {!hidePrice && <span className="tabular-nums">{formatMoney(i.unitPrice * i.quantity)}</span>}
                  </li>
                ))}
              </ul>
              {order.gift && (
                <p>
                  Hộp quà: {order.gift.boxName}
                  {order.gift.message ? ` · Lời nhắn: "${order.gift.message}"` : ''}
                </p>
              )}
              {order.note && <p>Ghi chú của khách: {order.note}</p>}
              {!hidePrice && order.pricing.payOnDelivery > 0 && <p className="font-semibold">Thu khi giao: {formatMoney(order.pricing.payOnDelivery)}</p>}
            </section>

            {order.invoice && (
              <section aria-label="Hoá đơn công ty" className="space-y-1 rounded-2xl border border-stone-200 p-3">
                <h4 className="text-sm font-bold text-ink">Khách yêu cầu xuất hoá đơn công ty</h4>
                <InvoiceSummary invoice={order.invoice} />
              </section>
            )}

            {order.cancelRequest?.status === 'pending' && (
              <section className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm">
                <p className="font-bold text-rose-900">Khách yêu cầu huỷ: {order.cancelRequest.reason}</p>
                {pending === 'reject_cancel' ? (
                  <>
                    <ReasonPrompt label="Lý do từ chối yêu cầu huỷ" value={reason} onChange={setReason} />
                    <div className="flex gap-2">
                      <SecondaryButton onClick={() => setPending(null)}>Thôi</SecondaryButton>
                      <DangerButton className="flex-1" onClick={() => act((s, t) => coopDecideCancelRequest(s, order.id, coopActor, false, reason, t), 'Đã từ chối yêu cầu huỷ.')}>
                        Xác nhận từ chối
                      </DangerButton>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <SecondaryButton onClick={() => setPending('reject_cancel')}>Từ chối</SecondaryButton>
                    <PrimaryButton onClick={() => act((s, t) => coopDecideCancelRequest(s, order.id, coopActor, true, '', t), 'Đã duyệt huỷ đơn.')}>Đồng ý huỷ</PrimaryButton>
                  </div>
                )}
              </section>
            )}

            <section className="space-y-2">
              {order.status === 'awaiting_confirmation' && pending !== 'reject' && (
                <div className="grid grid-cols-2 gap-2">
                  <DangerButton onClick={() => setPending('reject')}>Từ chối đơn</DangerButton>
                  <PrimaryButton onClick={() => act((s, t) => coopConfirm(s, order.id, coopActor, t), 'Đã xác nhận đơn.')}>Xác nhận đơn</PrimaryButton>
                </div>
              )}
              {pending === 'reject' && (
                <>
                  <ReasonPrompt label="Lý do từ chối (bắt buộc)" value={reason} onChange={setReason} />
                  <div className="flex gap-2">
                    <SecondaryButton onClick={() => setPending(null)}>Thôi</SecondaryButton>
                    <DangerButton className="flex-1" onClick={() => act((s, t) => coopReject(s, order.id, coopActor, reason, t), 'Đã từ chối đơn. Khách được hoàn 100% số đã trả.')}>
                      Xác nhận từ chối
                    </DangerButton>
                  </div>
                </>
              )}
              {awaitingHarvest && (multiProduct || harvests.length > 0) && pending !== 'harvest' && (
                <ul className="space-y-1 rounded-2xl border border-champagne-200 bg-champagne-50/60 p-3 text-sm" aria-label="Tình trạng thu hoạch">
                  {order.items.map((i) => {
                    const h = harvests.find((x) => x.id === order.harvest?.[i.productId]);
                    return (
                      <li key={i.productId} className="flex flex-wrap justify-between gap-x-2">
                        <span className="font-semibold text-ink">{i.name}</span>
                        <span className={h ? 'text-forest-800' : 'text-muted'}>{h ? `Thu hoạch ngày ${formatDateKey(h.harvestedOn)}` : 'Chờ thu hoạch'}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {awaitingHarvest && pending === 'harvest' && harvestTarget && (
                <section className="space-y-3 rounded-3xl border border-champagne-300 bg-white p-4" aria-label="Xác nhận thu hoạch">
                  <h4 className="font-display text-lg font-semibold text-ink">Xác nhận thu hoạch{multiProduct ? `: ${harvestTarget.name}` : ''}</h4>
                  <p className="text-sm text-stone-700">
                    Đơn này cần {harvestTarget.quantity} {harvestTarget.unit} {harvestTarget.name}.
                  </p>
                  <HarvestForm key={harvestTarget.productId} productId={harvestTarget.productId} orderId={order.id} onDone={() => setPending(null)} onCancel={() => setPending(null)} />
                </section>
              )}
              {awaitingHarvest && pending !== 'cannot_supply' && pending !== 'harvest' && (
                <>
                  <p className="text-sm text-stone-700">
                    {harvestTarget
                      ? 'Thu hoạch xong thì bấm "Xác nhận đã thu hoạch xong" để khai ngày thu hoạch (kèm ảnh lô hàng nếu có), rồi gọi điện hoặc nhắn tin cho khách để hẹn lịch giao.'
                      : 'Đã thu hoạch xong. Khi hàng sẵn sàng, bấm "Báo sẵn sàng giao", rồi gọi điện hoặc nhắn tin cho khách để hẹn lịch giao.'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <DangerButton onClick={() => setPending('cannot_supply')}>Không cung cấp được</DangerButton>
                    {harvestTarget ? (
                      <PrimaryButton onClick={() => setPending('harvest')}>Xác nhận đã thu hoạch xong</PrimaryButton>
                    ) : (
                      <PrimaryButton onClick={() => act((s, t) => coopReportReady(s, order.id, coopActor, t), 'Đã báo hàng sẵn sàng.')}>Báo sẵn sàng giao</PrimaryButton>
                    )}
                  </div>
                  {harvestTarget && sameProductWaiting > 1 && (
                    <SecondaryButton className="w-full" onClick={() => openModal({ type: 'coop_harvest', productId: harvestTarget.productId, returnTo: { type: 'coop_order', orderId: order.id } })}>
                      Xác nhận cả lô {harvestTarget.name} ({sameProductWaiting} đơn đang chờ)
                    </SecondaryButton>
                  )}
                </>
              )}
              {order.status === 'awaiting_harvest' && order.readyReportedAt && (
                <p className="text-sm text-stone-700">Đã báo sẵn sàng. Đang chờ khách trả phần còn lại (hạn {order.remainingDueAt ? new Date(order.remainingDueAt).toLocaleString('vi-VN') : '—'}).</p>
              )}
              {pending === 'cannot_supply' && (
                <>
                  <ReasonPrompt label="Lý do không cung cấp được (bắt buộc)" value={reason} onChange={setReason} />
                  <div className="flex gap-2">
                    <SecondaryButton onClick={() => setPending(null)}>Thôi</SecondaryButton>
                    <DangerButton className="flex-1" onClick={() => act((s, t) => coopCannotSupply(s, order.id, coopActor, reason, t), 'Đã huỷ đơn. Khách được hoàn 100%.')}>
                      Xác nhận
                    </DangerButton>
                  </div>
                </>
              )}
              {order.status === 'preparing' && (
                <PrimaryButton className="w-full" onClick={() => act((s, t) => coopHandover(s, order.id, coopActor, t), 'Đã đóng gói và bàn giao vận chuyển.')}>
                  Đã đóng gói – bàn giao vận chuyển
                </PrimaryButton>
              )}
              {order.status === 'returning' && (
                <PrimaryButton className="w-full" onClick={() => act((s, t) => coopReceiveReturn(s, order.id, coopActor, t), 'Đã nhận lại hàng hoàn. Hàng hoàn không tự cộng lại tồn kho.')}>
                  Xác nhận đã nhận lại hàng
                </PrimaryButton>
              )}
            </section>

            <CoopContactCard
              order={order}
              onMessage={() => {
                chatInput.current?.focus();
                chatInput.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
              }}
              onTemplate={() => setPrefill({ text: readyMessageTemplate(state, order), nonce: Date.now() })}
            />
          </>
        }
        right={
          <>
            <OrderChat order={order} side="coop" prefill={prefill} inputRef={chatInput} />
            <OrderJourney order={order} />
              <PickupPointPanel order={order}/>
            <TrackingTimeline order={order} />

            <details className="group space-y-1">
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-stone-700">Lịch sử trạng thái chi tiết</summary>
              <ol className="space-y-1 border-l-2 border-stone-200 pl-3 text-sm">
                {order.statusHistory.map((h, i) => (
                  <li key={i}>
                    <strong>{ORDER_STATUS_LABEL[h.to]}</strong> · {new Date(h.at).toLocaleString('vi-VN')} · {h.actor.name ?? h.actor.kind}
                    {h.reason && <span className="block text-stone-600">{h.reason}</span>}
                  </li>
                ))}
              </ol>
            </details>
          </>
        }
      />
    </BottomSheet>
  );
}
