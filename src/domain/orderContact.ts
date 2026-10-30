/**
 * Liên hệ giữa HTX và khách trong từng đơn, và hành trình giao hàng (chủ repo yêu cầu sau Giai đoạn 6):
 * - Đơn đặt trước: khi hàng vào mùa, HTX báo hàng sẵn sàng rồi gọi điện hoặc nhắn tin cho khách để hẹn lịch giao.
 * - Nhắn tin: trao đổi theo đơn giữa khách và HTX của đơn đó (dữ liệu dùng chung nên hai máy cùng thấy).
 * - Gọi điện: HTX gọi bằng điện thoại của mình (số người nhận đã có trên phiếu đóng gói), rồi ghi lại kết quả cuộc gọi.
 *   Kết quả hiện trong phần trao đổi để khách cũng thấy.
 */
import { messagePhotosError } from './dataBudget';
import { fullyHarvested, harvestsForOrder } from './harvest';
import { generateId } from './ids';
import { formatMoney } from './pricing';
import { findOrder, formatDateKey, iso, replaceOrder } from './state';
import { deliveryEventText } from './tracking';
import { CALL_OUTCOME_LABEL, fail, ok, ORDER_STATUS_LABEL, type Actor, type CallOutcome, type DemoState, type Order, type OrderMessage, type OrderStatus, type Result } from './types';

export type ChatSide = 'customer' | 'coop';

export const MESSAGE_MAX_LENGTH = 1000;
export const CALL_NOTE_MAX_LENGTH = 300;

export const messagesOf = (state: DemoState, orderId: string): OrderMessage[] => (state.orderMessages ?? []).filter((m) => m.orderId === orderId);

/** Bên của người thao tác trong đơn (khách đặt đơn, HTX của đơn); bên khác thì null. */
export function sideOf(actor: Actor, order: Order): ChatSide | null {
  if (actor.kind === 'customer' && actor.id === order.customerId) return 'customer';
  if (actor.kind === 'coop' && actor.id === order.coopId) return 'coop';
  return null;
}

/** Trao đổi được khi đơn đã đặt xong (đã thanh toán hoặc COD) và chưa huỷ. */
export function chatClosedReason(order: Order): string | null {
  if (order.status === 'awaiting_payment') return 'Đơn chưa thanh toán xong nên chưa trao đổi được với HTX.';
  if (order.status === 'cancelled') return 'Đơn đã huỷ. Cần hỗ trợ, vui lòng gửi khiếu nại cho CSKH.';
  return null;
}

function prepare(state: DemoState, orderId: string, actor: Actor): Result<{ order: Order; side: ChatSide }> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  const side = sideOf(actor, order);
  if (!side) return fail('Chỉ khách đặt đơn và HTX của đơn mới trao đổi được trong đơn này.');
  const closed = chatClosedReason(order);
  if (closed) return fail(closed);
  return ok({ order, side });
}

function append(state: DemoState, order: Order, side: ChatSide, message: OrderMessage, at: Date): DemoState {
  const next = { ...state, orderMessages: [...(state.orderMessages ?? []), message] };
  // Người gửi coi như đã đọc hết tin trước đó.
  return replaceOrder(next, { ...order, chatReadAt: { ...order.chatReadAt, [side]: iso(at) } });
}

/** Gửi tin nhắn trong đơn, kèm tối đa NEW-04 ảnh (domain/dataBudget.ts). Chỉ gửi ảnh, không chữ, cũng được. */
export function sendOrderMessage(state: DemoState, orderId: string, actor: Actor, text: string, at: Date, photos: string[] = []): Result<DemoState> {
  const r = prepare(state, orderId, actor);
  if (!r.ok) return r;
  const body = text.trim();
  if (!body && photos.length === 0) return fail('Vui lòng nhập nội dung tin nhắn.');
  if (body.length > MESSAGE_MAX_LENGTH) return fail(`Tin nhắn tối đa ${MESSAGE_MAX_LENGTH.toLocaleString('vi-VN')} ký tự.`);
  const photoErr = messagePhotosError(state, photos, state.params.messagePhotoMax);
  if (photoErr) return fail(photoErr);
  const { order, side } = r.value;
  const message: OrderMessage = {
    id: generateId('TN'),
    orderId,
    sender: side,
    senderName: actor.name ?? (side === 'coop' ? order.coopName : 'Khách hàng'),
    kind: 'text',
    text: body,
    photos: photos.length > 0 ? photos : undefined,
    at: iso(at),
  };
  return ok(append(state, order, side, message, at));
}

/** HTX ghi lại cuộc gọi cho khách (kết quả + ghi chú). Khách thấy trong phần trao đổi của đơn. */
export function logCoopCall(state: DemoState, orderId: string, actor: Actor, outcome: CallOutcome, note: string, at: Date): Result<DemoState> {
  const r = prepare(state, orderId, actor);
  if (!r.ok) return r;
  if (r.value.side !== 'coop') return fail('Chỉ HTX ghi lại cuộc gọi cho khách.');
  if (!(outcome in CALL_OUTCOME_LABEL)) return fail('Vui lòng chọn kết quả cuộc gọi.');
  const body = note.trim();
  if (body.length > CALL_NOTE_MAX_LENGTH) return fail(`Ghi chú tối đa ${CALL_NOTE_MAX_LENGTH} ký tự.`);
  const { order } = r.value;
  const message: OrderMessage = { id: generateId('TN'), orderId, sender: 'coop', senderName: actor.name ?? order.coopName, kind: 'call', callOutcome: outcome, text: body, at: iso(at) };
  return ok(append(state, order, 'coop', message, at));
}

/** Số tin của bên kia mà bên `side` chưa đọc. */
export function unreadCount(state: DemoState, order: Order, side: ChatSide): number {
  const readAt = order.chatReadAt?.[side] ?? '';
  return messagesOf(state, order.id).filter((m) => m.sender !== side && m.at > readAt).length;
}

/** Đánh dấu đã đọc. Không có tin mới thì trả lại đúng dữ liệu cũ (không ghi gì). */
export function markOrderChatRead(state: DemoState, orderId: string, actor: Actor, at: Date): Result<DemoState> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  const side = sideOf(actor, order);
  if (!side) return fail('Bạn không có quyền xem trao đổi của đơn này.');
  if (unreadCount(state, order, side) === 0) return ok(state);
  return ok(replaceOrder(state, { ...order, chatReadAt: { ...order.chatReadAt, [side]: iso(at) } }));
}

/**
 * Người HTX gọi khi cần hẹn giao. Đơn quà gửi người khác thì gọi người đặt (giữ bất ngờ cho người nhận);
 * người đặt đăng nhập bằng Google không có SĐT thì chỉ nhắn tin được.
 */
export function contactForCoop(state: DemoState, order: Order): { name: string; phone: string; note?: string } {
  if (order.gift?.sendToOther) {
    const buyer = state.customers.find((c) => c.id === order.customerId);
    return {
      name: buyer?.name ?? 'Người đặt',
      phone: buyer?.phone ?? '',
      note: buyer?.phone ? 'Đơn quà gửi người khác: gọi người đặt để giữ bất ngờ cho người nhận.' : 'Đơn quà gửi người khác; người đặt chưa có SĐT, hãy nhắn tin.',
    };
  }
  return { name: order.address.receiverName, phone: order.address.receiverPhone };
}

/** Tin nhắn mẫu khi hàng đặt trước vào mùa. HTX sửa trước khi gửi. */
export function readyMessageTemplate(state: DemoState, order: Order): string {
  const name = state.customers.find((c) => c.id === order.customerId)?.name ?? 'anh/chị';
  const items = order.items.map((i) => i.name).join(', ');
  const date = order.deliveryDate ? ` HTX dự kiến giao ngày ${formatDateKey(order.deliveryDate)}.` : '';
  return `Chào ${name}, ${items} của đơn ${order.id} đã vào mùa và sẵn sàng giao.${date} Anh/chị xác nhận giúp HTX thời gian nhận hàng nhé.`;
}

/** HTX cần liên hệ khách: hàng đặt trước đã báo sẵn sàng mà HTX chưa gọi / nhắn từ lúc đó, và đơn chưa bàn giao vận chuyển. */
export function needsReadyContact(state: DemoState, order: Order): boolean {
  if (order.kind !== 'preorder' || !order.readyReportedAt) return false;
  if (!['awaiting_harvest', 'preparing'].includes(order.status)) return false;
  return !firstCoopContactAfter(state, order, order.readyReportedAt);
}

function firstCoopContactAfter(state: DemoState, order: Order, since: string): OrderMessage | undefined {
  return messagesOf(state, order.id).find((m) => m.sender === 'coop' && m.at >= since);
}

// ---------- Hành trình giao hàng ----------

export type StepState = 'done' | 'current' | 'upcoming' | 'skipped';

export interface JourneyStep {
  key: string;
  title: string;
  state: StepState;
  at?: string;
  detail?: string;
  /** Ảnh HTX đính kèm (bước thu hoạch). */
  photos?: string[];
}

export interface Journey {
  steps: JourneyStep[];
  /** Đơn đã huỷ / trả hàng: các bước còn lại không diễn ra. */
  ended?: { label: string; at: string; reason?: string };
}

const ENDED: OrderStatus[] = ['cancelled', 'return_refund', 'returning', 'returned'];


/**
 * Các bước của đơn, tính từ lịch sử trạng thái, mốc báo sẵn sàng, liên hệ của HTX và nhật ký vận chuyển.
 * Bước liên hệ hẹn giao (đơn đặt trước) không chặn các bước khác: chưa liên hệ mà đã bàn giao vận chuyển thì ghi "bỏ qua".
 */
export function orderJourney(state: DemoState, order: Order): Journey {
  const reached = (status: OrderStatus) => order.statusHistory.find((h) => h.to === status)?.at;
  const placedAt = reached('awaiting_confirmation');
  const confirmedAt = reached('confirmed');
  const preparingAt = reached('preparing');
  const shippingAt = reached('shipping');
  const deliveredAt = order.deliveredAt ?? reached('delivered');
  const lastDelivery = order.deliveryLog[order.deliveryLog.length - 1];
  const steps: (Omit<JourneyStep, 'state'> & { done: boolean; ready: boolean; optional?: boolean; skip?: boolean })[] = [];

  if (order.kind === 'preorder') {
    const harvests = harvestsForOrder(state, order);
    // Đơn báo sẵn sàng từ trước khi có bước xác nhận thu hoạch: coi như đã thu hoạch.
    const harvested = fullyHarvested(order) || !!order.readyReportedAt;
    const multi = new Set(order.items.map((i) => i.productId)).size > 1;
    const harvestDetail = harvests
      .map((h) => `${multi ? `${h.productName}: ` : ''}Thu hoạch ngày ${formatDateKey(h.harvestedOn)}${h.note ? ` – ${h.note}` : ''}`)
      .join('. ');
    const pendingCount = order.items.filter((i) => !order.harvest?.[i.productId]).length;
    const contact = order.readyReportedAt ? firstCoopContactAfter(state, order, order.readyReportedAt) : undefined;
    // Có cuộc gọi thì hiện kết quả cuộc gọi gần nhất (thông tin hẹn giao), không thì ghi đã nhắn tin.
    const lastCall = order.readyReportedAt
      ? messagesOf(state, order.id)
          .filter((m) => m.sender === 'coop' && m.kind === 'call' && m.at >= order.readyReportedAt!)
          .pop()
      : undefined;
    steps.push(
      {
        key: 'placed',
        title: 'Đặt trước và trả cọc',
        done: !!placedAt,
        ready: true,
        at: placedAt,
        detail: placedAt ? `Đã cọc ${formatMoney(order.pricing.deposit)}` : 'Chờ thanh toán tiền cọc',
      },
      {
        key: 'confirmed',
        title: 'HTX xác nhận đơn',
        done: !!confirmedAt,
        ready: !!placedAt,
        at: confirmedAt,
        detail: !confirmedAt && order.confirmDeadline ? `HTX xác nhận trước ${new Date(order.confirmDeadline).toLocaleString('vi-VN')}` : undefined,
      },
      {
        key: 'harvest',
        title: 'Vào mùa – HTX thu hoạch xong',
        done: harvested,
        ready: !!confirmedAt,
        at: harvests.reduce<string | undefined>((a, h) => (!a || h.confirmedAt > a ? h.confirmedAt : a), undefined),
        detail: harvested
          ? harvestDetail || undefined
          : `${harvests.length > 0 ? `${harvestDetail}. Còn ${pendingCount} sản phẩm chờ thu hoạch` : 'Chờ thu hoạch'}${order.deliveryDate ? `, giao dự kiến ngày ${formatDateKey(order.deliveryDate)}` : ''}`,
        photos: harvests.flatMap((h) => h.photos),
      },
      {
        key: 'ready',
        title: 'HTX báo sẵn sàng giao',
        done: !!order.readyReportedAt,
        ready: harvested,
        at: order.readyReportedAt,
      },
      {
        key: 'contact',
        title: 'HTX gọi điện / nhắn tin hẹn lịch giao',
        done: !!contact,
        ready: !!order.readyReportedAt,
        optional: true,
        skip: !contact && !!shippingAt,
        at: contact?.at,
        detail: lastCall
          ? `Gọi điện: ${CALL_OUTCOME_LABEL[lastCall.callOutcome ?? 'scheduled']}${lastCall.text ? ` – ${lastCall.text}` : ''}`
          : contact
            ? 'Đã nhắn tin cho khách'
            : 'HTX sẽ gọi điện hoặc nhắn tin để hẹn thời gian nhận hàng',
      },
      {
        key: 'remaining',
        title: order.paymentMethod === 'cod' ? 'Phần còn lại trả khi nhận hàng' : 'Trả phần còn lại',
        done: !!preparingAt,
        ready: !!order.readyReportedAt,
        at: preparingAt,
        detail:
          order.paymentMethod === 'cod'
            ? `Thu ${formatMoney(order.pricing.remaining)} khi giao`
            : !preparingAt && order.remainingDueAt
              ? `Trả ${formatMoney(order.pricing.remaining)} trước ${new Date(order.remainingDueAt).toLocaleString('vi-VN')}`
              : `${formatMoney(order.pricing.remaining)}`,
      },
    );
  } else {
    steps.push(
      {
        key: 'placed',
        title: order.paymentMethod === 'cod' ? 'Đặt hàng (trả khi nhận)' : 'Đặt hàng và thanh toán',
        done: !!placedAt,
        ready: true,
        at: placedAt ?? (order.status !== 'awaiting_payment' ? order.createdAt : undefined),
        detail: placedAt ? undefined : 'Chờ thanh toán',
      },
      { key: 'confirmed', title: 'HTX xác nhận đơn', done: !!confirmedAt, ready: !!placedAt, at: confirmedAt },
    );
  }

  steps.push(
    { key: 'handover', title: 'Đóng gói, bàn giao vận chuyển', done: !!shippingAt, ready: !!preparingAt, at: shippingAt },
    {
      key: 'shipping',
      title: 'Đang giao',
      done: !!deliveredAt || !!order.carrierDeliveredAt,
      ready: !!shippingAt,
      at: order.carrierDeliveredAt,
      detail: lastDelivery ? `${deliveryEventText(lastDelivery)}${order.deliveryAttempts > 1 ? ` (lần ${order.deliveryAttempts})` : ''}` : undefined,
    },
    { key: 'delivered', title: 'Đã nhận hàng', done: !!deliveredAt, ready: !!order.carrierDeliveredAt || !!deliveredAt, at: deliveredAt },
  );

  const ended = ENDED.includes(order.status);
  const out: JourneyStep[] = [];
  for (const s of steps) {
    const st: StepState = s.done ? 'done' : s.optional && s.skip ? 'skipped' : s.ready && !ended ? 'current' : 'upcoming';
    // Đơn đã kết thúc giữa chừng: không liệt kê các bước không còn diễn ra.
    if (ended && st !== 'done' && st !== 'skipped') continue;
    out.push({ key: s.key, title: s.title, state: st, at: s.at, detail: st === 'skipped' ? 'Không ghi nhận liên hệ' : s.detail, ...(s.photos?.length ? { photos: s.photos } : {}) });
  }

  if (!ended) return { steps: out };
  const last = order.statusHistory[order.statusHistory.length - 1];
  return { steps: out, ended: { label: ORDER_STATUS_LABEL[order.status], at: last?.at ?? order.createdAt, reason: last?.reason } };
}
