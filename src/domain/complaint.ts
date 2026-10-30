/**
 * Khiếu nại (ticket) và yêu cầu trả hàng (mục 5.7, 5.8).
 *
 * - Chỉ gửi được trong hạn RET-01 tính từ lúc Đã giao; bắt buộc chọn đơn, sản phẩm, lý do và có ít nhất 1 ảnh.
 * - "Đổi ý" không phải căn cứ hoàn tiền mặc định.
 * - Ticket về hàng quá hạn, dị vật, QR bất thường, ảnh hưởng sức khoẻ tự gắn ưu tiên Cao.
 * - HTX chỉ xem và phản hồi ticket của HTX mình; không đóng, không từ chối hoàn tiền, không sửa nội dung.
 * - Chỉ Admin – CSKH đổi sang Đã xử lý / Từ chối / Đóng. Mọi thay đổi lưu lịch sử.
 *
 * Quy trình xử lý (góp ý kiểm thử: "thiếu quy trình xử lý khiếu nại"), mỗi bước chỉ làm được khi tới lượt:
 *   1. Khách gửi (Mới tiếp nhận) → 2. CSKH tiếp nhận trong SLA-01 (Đang xử lý) → 3. HTX kiểm tra lô hàng, phản hồi và
 *   đề xuất (CSKH có thể đề nghị HTX phản hồi) → 4. CSKH kết luận trong SLA-01: Đã xử lý (duyệt hoàn hoặc không) / Từ chối
 *   → 5. Hoàn tiền (Admin – Tài chính, nếu duyệt hoàn) → 6. CSKH đóng ticket.
 * Khách, HTX và CSKH cùng xem các bước này (ticketSteps), CSKH thấy thêm bước cần làm tiếp (nextTicketAction).
 */
import { generateId } from './ids';
import { addRefund } from './orders';
import { refundableAmount } from './refund';
import { transitionOrder } from './orderStateMachine';
import { addMs, audit, findOrder, HOUR_MS, iso, replaceOrder } from './state';
import { formatMoney } from './pricing';
import {
  COMPLAINT_REASON_LABEL,
  fail,
  goodsGroupOf,
  HIGH_PRIORITY_REASONS,
  ok,
  PAYMENT_STATUS_LABEL,
  TICKET_STATUS_LABEL,
  type Actor,
  type ComplaintReason,
  type DemoState,
  type Order,
  type Result,
  type Ticket,
  type TicketEvent,
  type TicketEventKind,
  type TicketStatus,
} from './types';

export interface ComplaintInput {
  resolution?: 'check' | 'refund' | 'exchange' | 'resupply';
  orderId: string;
  productIds: string[];
  reason: ComplaintReason | '';
  description: string;
  photos: string[];
  requestRefund: boolean;
}

/** Hạn gửi yêu cầu trả hàng: hàng tươi theo RET-01 tươi, còn lại theo RET-01 khô. */
export function returnDeadline(order: Order, productIds?: string[]): Date | null {
  if (!order.deliveredAt) return null;
  const items = productIds?.length ? order.items.filter((i) => productIds.includes(i.productId)) : order.items;
  const fresh = items.some((i) => goodsGroupOf(i.category) === 'fresh');
  const hours = fresh ? order.params.returnWindowHoursFresh : order.params.returnWindowHoursDry;
  return addMs(new Date(order.deliveredAt), hours * HOUR_MS);
}

export function submitComplaint(state: DemoState, actor: Actor, input: ComplaintInput, at: Date): Result<{ state: DemoState; ticket: Ticket }> {
  if (typeof input.description !== 'string' || !input.description.trim()) return fail('Vui lòng nhập mô tả vấn đề.');
  if (input.description.length > 5000) return fail('Mô tả tối đa 5.000 ký tự.');
  if (!input.orderId) return fail('Vui lòng chọn đơn hàng.');
  const order = findOrder(state, input.orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  if (actor.kind !== 'customer' || actor.id !== order.customerId) return fail('Bạn chỉ gửi khiếu nại cho đơn của mình.');
  const general=['order_question','late_delivery','cancel_request','other'].includes(input.reason);
  if (!general&&order.status !== 'delivered') return fail('Chỉ gửi khiếu nại, trả hàng cho đơn Đã giao.');
  if (general&&input.requestRefund)return fail('Yêu cầu hoàn tiền cần chọn vấn đề hàng hóa và sản phẩm liên quan.');
  if (!general&&input.productIds.length === 0) return fail('Vui lòng chọn sản phẩm cần khiếu nại.');
  if (!input.productIds.every((id) => order.items.some((i) => i.productId === id))) return fail('Sản phẩm không thuộc đơn đã chọn.');
  if (!input.reason) return fail('Vui lòng chọn lý do.');
  if (!general&&input.photos.length === 0) return fail('Vui lòng thêm ít nhất 1 ảnh.');
  if(input.photos.length>5)return fail('Tối đa 5 ảnh minh chứng.');
  const deadline = returnDeadline(order, input.productIds);
  if (!general&&(!deadline || at.getTime() > deadline.getTime())) {
    return fail(`Đã quá hạn gửi khiếu nại, trả hàng (hạn đến ${deadline?.toLocaleString('vi-VN') ?? '—'}).`);
  }
  if (input.requestRefund && input.reason === 'changed_mind') {
    return fail('Đổi ý không phải căn cứ hoàn tiền mặc định. Bạn vẫn gửi được khiếu nại để CSKH xem xét, nhưng không chọn yêu cầu hoàn tiền.');
  }
  if (state.tickets.some((t) => t.orderId === order.id && ['open', 'processing'].includes(t.status))) {
    return fail('Đơn này đã có khiếu nại đang xử lý.');
  }

  const ticket: Ticket = {
    resolution:input.resolution??(input.requestRefund?'refund':'check'),
    ...((input.resolution==='exchange'||input.resolution==='resupply')?{fulfillment:{kind:input.resolution,status:'requested' as const,updatedAt:iso(at)}}:{}),
    id: generateId('TK'),
    orderId: order.id,
    coopId: order.coopId,
    customerId: order.customerId,
    productIds: input.productIds,
    reason: input.reason,
    description: input.description.trim(),
    photos: input.photos,
    requestRefund: input.requestRefund,
    priority: HIGH_PRIORITY_REASONS.includes(input.reason) ? 'high' : 'normal',
    status: 'open',
    createdAt: iso(at),
    ackDueAt: iso(addMs(at, state.params.ticketAckHours * HOUR_MS)),
    resolveDueAt: iso(addMs(at, state.params.ticketResolveHours * HOUR_MS)),
    history: [{ at: iso(at), actor, action: 'Khách gửi khiếu nại', kind: 'submit' }],
  };
  let next: DemoState = { ...state, tickets: [ticket, ...state.tickets] };
  if (input.requestRefund) {
    const r = transitionOrder(order, { to: 'return_refund', actor, at, reason: 'Khách gửi yêu cầu trả hàng – hoàn tiền' });
    if (!r.ok) return r;
    next = replaceOrder(next, r.value);
  }
  return ok({ state: next, ticket });
}

/** HTX phản hồi ticket của HTX mình (FR-CSKH-05); với yêu cầu trả hàng, HTX chỉ xác nhận và đề xuất (FR-DH-10). */
export function coopReplyTicket(state: DemoState, ticketId: string, actor: Actor, text: string, at: Date, proposal?: 'refund' | 'no_refund'): Result<DemoState> {
  const ticket = state.tickets.find((t) => t.id === ticketId);
  if (!ticket) return fail('Không tìm thấy ticket.');
  if (actor.kind !== 'coop' || actor.id !== ticket.coopId) return fail('HTX chỉ phản hồi ticket của HTX mình.');
  if (!text.trim()) return fail('Vui lòng nhập nội dung phản hồi.');
  if (['resolved', 'rejected', 'closed'].includes(ticket.status)) return fail('Ticket đã kết thúc.');
  if (proposal && !ticket.requestRefund) return fail('Ticket không có yêu cầu hoàn tiền để đề xuất.');
  const action = proposal ? `HTX phản hồi, đề xuất ${proposal === 'refund' ? 'hoàn tiền' : 'không hoàn tiền'}` : 'HTX phản hồi';
  const updated: Ticket = { ...ticket, coopProposal: proposal ?? ticket.coopProposal, history: [...ticket.history, { at: iso(at), actor, action, note: text.trim(), kind: 'coop_reply' }] };
  const next = { ...state, tickets: state.tickets.map((t) => (t.id === ticketId ? updated : t)) };
  return ok(audit(next, actor, 'Phản hồi ticket', ticketId, at, text.trim()));
}

/** Số tiền hoàn cho các sản phẩm được duyệt: phần khách đã thực trả, đã trừ phần giảm giá chia cho phần đó. */
export function returnRefundAmount(order: Order, productIds: string[]): number {
  const itemsTotal = order.pricing.itemsTotal || 1;
  const selected = order.items.filter((i) => productIds.includes(i.productId)).reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const approvedValue = Math.round(selected * (1 - order.pricing.discount / itemsTotal));
  return refundableAmount(order.amountPaidOnline + order.codCollected, approvedValue, order.pricing.total);
}

/** Bước CSKH được chuyển tới từ mỗi trạng thái (tiếp nhận rồi mới kết luận, kết luận rồi mới đóng). */
export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['processing'],
  processing: ['resolved', 'rejected'],
  resolved: ['closed'],
  rejected: ['closed'],
  closed: [],
};

const ACTION_OF: Record<TicketStatus, { kind: TicketEventKind; action: string }> = {
  open: { kind: 'submit', action: 'Khách gửi khiếu nại' },
  processing: { kind: 'accept', action: 'CSKH tiếp nhận' },
  resolved: { kind: 'conclude', action: 'CSKH kết luận: Đã xử lý' },
  rejected: { kind: 'conclude', action: 'CSKH kết luận: Từ chối' },
  closed: { kind: 'close', action: 'CSKH đóng ticket' },
};

/** Admin – CSKH đổi trạng thái ticket (FR-CSKH-07..09) theo đúng thứ tự quy trình. Kết luận Đã xử lý kèm duyệt hoàn thì tạo yêu cầu hoàn. */
export function cskhUpdateTicket(
  state: DemoState,
  ticketId: string,
  actor: Actor,
  status: TicketStatus,
  note: string,
  at: Date,
  refundApproved = false,
): Result<DemoState> {
  if (actor.kind !== 'admin' || actor.adminGroup !== 'cskh') return fail('Chỉ Admin – CSKH được đổi trạng thái ticket.');
  const ticket = state.tickets.find((t) => t.id === ticketId);
  if (!ticket) return fail('Không tìm thấy ticket.');
  if (ticket.status === 'closed') return fail('Ticket đã đóng.');
  if (!TICKET_TRANSITIONS[ticket.status].includes(status)) {
    return fail(
      ticket.status === 'open'
        ? 'Cần tiếp nhận ticket trước khi kết luận.'
        : ticket.status === 'processing'
          ? 'Ticket đang xử lý: kết luận Đã xử lý hoặc Từ chối.'
          : 'Ticket đã kết luận: chỉ còn bước đóng ticket.',
    );
  }
  if ((status === 'rejected' || status === 'resolved') && !note.trim()) return fail('Vui lòng ghi kết luận.');
  const approved = status === 'resolved' && refundApproved && ticket.requestRefund;
  const updated: Ticket = {
    ...(status==='processing'?{assignedUserId:actor.userId??actor.id}:{}),
    ...ticket,
    status,
    history: [
      ...ticket.history,
      {
        at: iso(at),
        actor,
        action: status === 'resolved' && ticket.requestRefund ? `${ACTION_OF.resolved.action} – ${approved ? 'duyệt hoàn tiền' : 'không hoàn tiền'}` : ACTION_OF[status].action,
        note: note.trim() || undefined,
        kind: ACTION_OF[status].kind,
        toStatus: status,
        ...(status === 'resolved' ? { refundApproved: approved } : {}),
      },
    ],
  };
  let next: DemoState = { ...state, tickets: state.tickets.map((t) => (t.id === ticketId ? updated : t)) };
  const order = findOrder(next, ticket.orderId);
  if (approved && order) {
    if (next.refunds.some((r) => r.orderId === order.id && r.source === 'return')) return fail('Đơn đã có yêu cầu hoàn do trả hàng.');
    const amount = returnRefundAmount(order, ticket.productIds);
    next = addRefund(next, order, amount, 'return', `Trả hàng: ${note.trim()}`, at);
    next = replaceOrder(next, { ...order, paymentStatus: amount > 0 ? 'refund_pending' : order.paymentStatus });
  }
  return ok(audit(next, actor, 'Cập nhật ticket', ticketId, at, `${TICKET_STATUS_LABEL[status]}${note ? `: ${note}` : ''}`));
}

/** CSKH đề nghị HTX kiểm tra lô hàng và phản hồi (bước 3 của quy trình); HTX nhận thông báo. */
export function cskhRequestCoopReply(state: DemoState, ticketId: string, actor: Actor, note: string, at: Date): Result<DemoState> {
  if (actor.kind !== 'admin' || actor.adminGroup !== 'cskh') return fail('Chỉ Admin – CSKH được đề nghị HTX phản hồi.');
  const ticket = state.tickets.find((t) => t.id === ticketId);
  if (!ticket) return fail('Không tìm thấy ticket.');
  if (ticket.status !== 'processing') return fail(ticket.status === 'open' ? 'Cần tiếp nhận ticket trước.' : 'Ticket đã kết luận.');
  const updated: Ticket = { ...ticket, history: [...ticket.history, { at: iso(at), actor, action: 'CSKH đề nghị HTX phản hồi', note: note.trim() || undefined, kind: 'request_coop' }] };
  return ok(audit({ ...state, tickets: state.tickets.map((t) => (t.id === ticketId ? updated : t)) }, actor, 'Đề nghị HTX phản hồi ticket', ticketId, at, note.trim() || undefined));
}

/** Loại bước của một dòng lịch sử; dữ liệu cũ (chưa có `kind`) thì suy từ người làm và nội dung. */
export function eventKind(e: TicketEvent): TicketEventKind | undefined {
  if (e.kind) return e.kind;
  if (e.actor.kind === 'customer') return 'submit';
  if (e.actor.kind === 'coop') return 'coop_reply';
  const to = eventStatus(e);
  if (to === 'processing') return 'accept';
  if (to === 'resolved' || to === 'rejected') return 'conclude';
  if (to === 'closed') return 'close';
  return undefined;
}

/** Trạng thái sau một dòng lịch sử (dữ liệu cũ ghi "Đổi trạng thái: processing"). */
function eventStatus(e: TicketEvent): TicketStatus | undefined {
  if (e.toStatus) return e.toStatus;
  const m = e.action.match(/^Đổi trạng thái: (\w+)$/);
  return m && m[1] in TICKET_STATUS_LABEL ? (m[1] as TicketStatus) : undefined;
}

/** Nội dung dòng lịch sử để hiện (dữ liệu cũ ghi mã trạng thái tiếng Anh thì đổi sang nhãn). */
export function eventLabel(e: TicketEvent): string {
  const to = !e.toStatus ? eventStatus(e) : undefined;
  return to ? `Đổi trạng thái: ${TICKET_STATUS_LABEL[to]}` : e.action;
}

export type TicketStepKey = 'submitted' | 'accepted' | 'coop' | 'concluded' | 'refund' | 'closed';

export interface TicketStep {
  key: TicketStepKey;
  title: string;
  state: 'done' | 'current' | 'upcoming' | 'skipped';
  at?: string;
  /** Hạn SLA-01 của bước (tiếp nhận, kết luận). */
  due?: string;
  overdue?: boolean;
  detail?: string;
}

/** Các bước của quy trình xử lý một ticket, tính từ lịch sử ticket và khoản hoàn của đơn. */
export function ticketSteps(state: DemoState, t: Ticket, now: Date): TicketStep[] {
  const find = (k: TicketEventKind) => t.history.find((e) => eventKind(e) === k);
  const accepted = find('accept') ?? (t.status !== 'open' ? t.history.find((e) => eventKind(e) !== 'submit') : undefined);
  const coopReply = [...t.history].reverse().find((e) => eventKind(e) === 'coop_reply');
  const requested = find('request_coop');
  const conclusion = [...t.history].reverse().find((e) => eventKind(e) === 'conclude');
  const concluded = ['resolved', 'rejected', 'closed'].includes(t.status) ? (conclusion ?? t.history[t.history.length - 1]) : undefined;
  const closed = t.status === 'closed' ? (find('close') ?? t.history[t.history.length - 1]) : undefined;
  const late = (due: string, done: boolean) => !done && now.getTime() > new Date(due).getTime();
  const refund = state.refunds.find((r) => r.orderId === t.orderId && r.source === 'return');
  // Dữ liệu cũ chưa ghi refundApproved: có khoản hoàn do trả hàng là đã duyệt hoàn.
  const refundApproved = conclusion?.refundApproved ?? !!refund;

  const steps: TicketStep[] = [
    { key: 'submitted', title: 'Khách gửi khiếu nại', state: 'done', at: t.createdAt, detail: `${COMPLAINT_REASON_LABEL[t.reason]}${t.requestRefund ? ' · kèm yêu cầu trả hàng – hoàn tiền' : ''}` },
    {
      key: 'accepted',
      title: 'CSKH tiếp nhận',
      state: accepted ? 'done' : 'current',
      at: accepted?.at,
      due: t.ackDueAt,
      overdue: late(t.ackDueAt, !!accepted),
    },
    {
      key: 'coop',
      title: 'HTX kiểm tra lô hàng, phản hồi',
      state: coopReply ? 'done' : concluded ? 'skipped' : accepted ? 'current' : 'upcoming',
      at: coopReply?.at,
      detail: coopReply
        ? `${coopReply.note ?? ''}${t.coopProposal ? ` · HTX đề xuất ${t.coopProposal === 'refund' ? 'hoàn tiền' : 'không hoàn tiền'}` : ''}`
        : concluded
          ? 'CSKH kết luận không cần HTX phản hồi'
          : requested
            ? 'CSKH đã đề nghị HTX phản hồi'
            : undefined,
    },
    {
      key: 'concluded',
      title: 'CSKH kết luận',
      state: concluded ? 'done' : accepted ? 'current' : 'upcoming',
      at: concluded?.at,
      due: t.resolveDueAt,
      overdue: late(t.resolveDueAt, !!concluded),
      detail: concluded
        ? `${t.status === 'rejected' || (conclusion && eventStatus(conclusion) === 'rejected') ? 'Từ chối' : t.requestRefund ? (refundApproved ? 'Đã xử lý – duyệt hoàn tiền' : 'Đã xử lý – không hoàn tiền') : 'Đã xử lý'}${concluded.note ? `: ${concluded.note}` : ''}`
        : undefined,
    },
  ];
  if (t.requestRefund) {
    steps.push({
      key: 'refund',
      title: 'Hoàn tiền',
      state: refund ? (refund.status === 'refunded' ? 'done' : 'current') : concluded ? 'skipped' : 'upcoming',
      at: refund?.completedAt ?? refund?.createdAt,
      detail: refund ? `${formatMoney(refund.amount)} · ${PAYMENT_STATUS_LABEL[refund.status]}` : concluded ? 'Không hoàn tiền theo kết luận' : undefined,
    });
  }
  steps.push({ key: 'closed', title: 'Đóng ticket', state: closed ? 'done' : concluded ? 'current' : 'upcoming', at: closed?.at });
  return steps;
}

/** Việc CSKH cần làm tiếp với ticket (hiện ở màn xử lý). */
export function nextTicketAction(state: DemoState, t: Ticket): string {
  const refund = state.refunds.find((r) => r.orderId === t.orderId && r.source === 'return');
  switch (t.status) {
    case 'open':
      return 'Tiếp nhận ticket trước hạn tiếp nhận (SLA-01).';
    case 'processing':
      return t.history.some((e) => eventKind(e) === 'coop_reply')
        ? 'HTX đã phản hồi: xem đề xuất của HTX rồi kết luận Đã xử lý hoặc Từ chối.'
        : 'Chờ HTX kiểm tra lô hàng và phản hồi (có thể đề nghị HTX phản hồi), rồi kết luận trước hạn.';
    case 'resolved':
    case 'rejected':
      return refund && refund.status !== 'refunded'
        ? `Khoản hoàn ${formatMoney(refund.amount)} đang ở bước "${PAYMENT_STATUS_LABEL[refund.status]}" (Admin – Tài chính). Đóng ticket khi đã báo kết quả cho khách.`
        : 'Đã kết luận: đóng ticket khi đã báo kết quả cho khách.';
    case 'closed':
      return 'Ticket đã đóng.';
  }
}

export const isTicketOpen = (t: Ticket): boolean => t.status === 'open' || t.status === 'processing';

/** Ticket của một đơn, mới nhất trước. */
export const ticketsOfOrder = (state: DemoState, orderId: string): Ticket[] => state.tickets.filter((t) => t.orderId === orderId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
