/**
 * Theo dõi vận chuyển kiểu sàn TMĐT (chủ repo yêu cầu ngày 18/10/2026): các mốc giao hàng của đơn, mới nhất trước.
 * Tính từ lịch sử trạng thái và nhật ký giao hàng. Không hiện ghi chú lấy hàng nội bộ của Admin.
 */
import type { DeliveryEvent, Order } from './types';

export const DELIVERY_EVENT_LABEL: Record<DeliveryEvent['event'], string> = {
  assigned: 'Đơn được giao cho shipper',
  picked_up: 'Đã lấy hàng, đang giao',
  delivered_reported: 'Giao hàng thành công',
  failed: 'Giao hàng không thành công',
  refused: 'Người nhận từ chối nhận hàng',
};

/** "Shipper mẫu 1" giữ nguyên; tên không bắt đầu bằng "Shipper" thì thêm chữ "Shipper" phía trước. */
export const shipperLabel = (name: string): string => (/^shipper\b/i.test(name.trim()) ? name.trim() : `Shipper ${name.trim()}`);

export interface TrackingEvent {
  at: string;
  title: string;
  detail?: string;
  photos?: string[];
  tone: 'normal' | 'success' | 'warning';
}

/** Một dòng mô tả ngắn cho sự kiện giao hàng (vd. bước "Đang giao" của hành trình đơn). */
export function deliveryEventText(e: DeliveryEvent): string {
  const who = e.by ? ` · ${shipperLabel(e.by)}` : '';
  return `${DELIVERY_EVENT_LABEL[e.event]}${e.reason ? ` – ${e.reason}` : ''}${who}`;
}

/** Thứ tự nghiệp vụ, dùng khi hai mốc trùng thời điểm. */
const RANK = { assigned: 1, handover: 2, picked_up: 3, failed: 4, refused: 4, delivered_reported: 5, delivered: 6, returning: 6, returned: 7 } as const;

export function trackingEvents(order: Order): TrackingEvent[] {
  const out: (TrackingEvent & { rank: number; seq: number })[] = [];
  const push = (rank: number, e: TrackingEvent) => out.push({ ...e, rank, seq: out.length });
  for (const h of order.statusHistory) {
    if (h.to === 'shipping') push(RANK.handover, { at: h.at, title: `${order.coopName} đã bàn giao cho đơn vị vận chuyển`, tone: 'normal' });
    else if (h.to === 'delivered')
      push(RANK.delivered, {
        at: h.at,
        title: h.actor.kind === 'customer' ? 'Bạn đã xác nhận nhận hàng' : 'Đơn chuyển sang Đã giao',
        detail: h.actor.kind === 'customer' ? undefined : h.reason,
        tone: 'success',
      });
    else if (h.to === 'returning') push(RANK.returning, { at: h.at, title: 'Đang chuyển hoàn về HTX', detail: h.reason, tone: 'warning' });
    else if (h.to === 'returned') push(RANK.returned, { at: h.at, title: 'Hàng đã hoàn về HTX', tone: 'warning' });
  }
  let attempt = 0;
  for (const e of order.deliveryLog) {
    if (e.event === 'assigned') push(RANK.assigned, { at: e.at, title: `${shipperLabel(e.by ?? '')} nhận giao đơn`, tone: 'normal' });
    else if (e.event === 'picked_up') push(RANK.picked_up, { at: e.at, title: e.by ? `${shipperLabel(e.by)} đã lấy hàng, đang giao` : 'Đơn vị vận chuyển đã nhận hàng', tone: 'normal' });
    else if (e.event === 'failed') push(RANK.failed, { at: e.at, title: `Giao hàng không thành công (lần ${++attempt})`, detail: e.reason, tone: 'warning' });
    else if (e.event === 'refused') push(RANK.refused, { at: e.at, title: 'Người nhận từ chối nhận hàng', detail: e.reason, tone: 'warning' });
    else if (e.event === 'delivered_reported') {
      const note = e.by ? order.shipment?.deliveredNote : undefined;
      push(RANK.delivered_reported, {
        at: e.at,
        title: 'Giao hàng thành công',
        detail: e.by ? `${shipperLabel(e.by)}${note ? ` · ${note}` : ''}` : 'Đơn vị vận chuyển báo đã giao',
        ...(e.by && order.shipment?.proofPhotos?.length ? { photos: order.shipment.proofPhotos } : {}),
        tone: 'success',
      });
    }
  }
  // Mới nhất trước; trùng thời điểm thì theo thứ tự nghiệp vụ, rồi theo thứ tự ghi.
  return out.sort((a, b) => b.at.localeCompare(a.at) || b.rank - a.rank || b.seq - a.seq).map(({ rank: _rank, seq: _seq, ...e }) => e);
}
