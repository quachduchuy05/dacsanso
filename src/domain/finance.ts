/**
 * Hoàn tiền phía Admin – Tài chính (FR-DH-12).
 * Trạng thái hoàn đi Chờ hoàn tiền → Đang hoàn tiền → Đã hoàn tiền; chỉ sang Đã hoàn tiền khi ngân hàng mô phỏng xác nhận.
 * Đơn COD hoàn bằng chuyển khoản vào tài khoản khách đã khai; chưa khai thì nhắc khách bổ sung.
 */
import { generateId } from './ids';
import { completeRefund, startRefund } from './refund';
import { addLedger, audit, findOrder, iso, replaceOrder } from './state';
import { fail, ok, type Actor, type DemoState, type RefundRecord, type Result } from './types';

function requireFinance(actor: Actor): string | null {
  return actor.kind === 'admin' && actor.adminGroup === 'finance' ? null : 'Chỉ Admin – Tài chính được thực hiện hoàn tiền.';
}

function syncOrderPayment(state: DemoState, refund: RefundRecord): DemoState {
  const order = findOrder(state, refund.orderId);
  if (!order) return state;
  const all = state.refunds.filter((r) => r.orderId === order.id);
  const status = all.every((r) => r.status === 'refunded') ? 'refunded' : all.some((r) => r.status === 'refunding') ? 'refunding' : 'refund_pending';
  return replaceOrder(state, { ...order, paymentStatus: status });
}

export function startRefundProcessing(state: DemoState, refundId: string, actor: Actor, at: Date): Result<DemoState> {
  const denied = requireFinance(actor);
  if (denied) return fail(denied);
  const refund = state.refunds.find((r) => r.id === refundId);
  if (!refund) return fail('Không tìm thấy yêu cầu hoàn.');
  if (refund.destination === 'bank_account') {
    const customer = state.customers.find((c) => c.id === refund.customerId);
    if (!customer?.refundAccount) return fail('Khách chưa khai tài khoản nhận hoàn tiền. Đã nhắc khách bổ sung.');
  }
  const r = startRefund(refund);
  if (!r.ok) return r;
  let next = { ...state, refunds: state.refunds.map((x) => (x.id === refundId ? r.value : x)) };
  next = syncOrderPayment(next, r.value);
  return ok(audit(next, actor, 'Bắt đầu hoàn tiền', refund.orderId, at, `${refund.amount}`));
}

/** Ngân hàng / cổng mô phỏng xác nhận đã hoàn. Mỗi yêu cầu chỉ thành công 1 lần. */
export function confirmRefundBySimBank(state: DemoState, refundId: string, actor: Actor, at: Date): Result<DemoState> {
  const denied = requireFinance(actor);
  if (denied) return fail(denied);
  const refund = state.refunds.find((r) => r.id === refundId);
  if (!refund) return fail('Không tìm thấy yêu cầu hoàn.');
  const r = completeRefund(refund, generateId('NH-MP'));
  if (!r.ok) return r;
  let next = { ...state, refunds: state.refunds.map((x) => (x.id === refundId ? { ...r.value, completedAt: iso(at) } : x)) };
  next = syncOrderPayment(next, r.value);
  const order = findOrder(next, refund.orderId);
  next = addLedger(next, { type: 'refund_out', amount: -refund.amount, orderId: refund.orderId, coopId: order?.coopId, refId: refund.id, note: r.value.bankRef }, at);
  return ok(audit(next, actor, 'Ghi nhận đã hoàn tiền (ngân hàng mô phỏng)', refund.orderId, at, `${refund.amount}`));
}
