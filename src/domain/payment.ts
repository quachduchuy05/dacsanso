/**
 * Thanh toán mô phỏng (mục 5.4). Kết quả cổng chỉ được ghi nhận qua applyGatewayResult().
 *
 * - Gọi lại với cùng gatewayRef thì không xử lý lần hai.
 * - Thành công: các đơn trong giao dịch sang Chờ xác nhận; hạn HTX xác nhận PAR-11 tính từ lúc này.
 * - Thất bại / huỷ: các đơn online Đã huỷ, nhả hàng, nhả suất, nhả lượt mã, sản phẩm quay lại giỏ; đơn COD giữ nguyên.
 * - Tiền về sau khi đơn đã huỷ: không khôi phục đơn, tự tạo yêu cầu hoàn tiền.
 * - Một giao dịch nhận hai lần trả thành công (khác gatewayRef): chỉ lần đầu được tính,
 *   lần sau tự tạo yêu cầu hoàn 100% (BR-TT-06, đề xuất của SRS).
 */
import { addRefund, failCheckoutTransaction } from './orders';
import { transitionOrder } from './orderStateMachine';
import { addLedger, addMs, findOrder, HOUR_MS, iso, replaceOrder } from './state';
import { fail, ok, type DemoState, type Order, type Result, type Transaction } from './types';

export type GatewayResult = 'success' | 'failed' | 'cancelled';

export type GatewayOutcome =
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'ignored_same_ref'
  | 'ignored_not_pending'
  | 'duplicate_payment_refund'
  | 'late_payment_refund';

export const GATEWAY_OUTCOME_MESSAGE: Record<GatewayOutcome, string> = {
  paid: 'Cổng mô phỏng báo thanh toán thành công. Đơn đã chuyển sang Chờ xác nhận.',
  failed: 'Cổng mô phỏng báo thanh toán thất bại. Các đơn thanh toán online đã huỷ, sản phẩm đã quay lại giỏ.',
  cancelled: 'Đã huỷ thanh toán. Các đơn thanh toán online đã huỷ, sản phẩm đã quay lại giỏ.',
  ignored_same_ref: 'Kết quả này đã được ghi nhận trước đó, không xử lý lần hai.',
  ignored_not_pending: 'Giao dịch đã kết thúc, kết quả không làm thay đổi đơn.',
  duplicate_payment_refund: 'Giao dịch đã được thanh toán trước đó. Đã tạo yêu cầu hoàn 100% cho lần trả thứ hai.',
  late_payment_refund: 'Tiền về sau khi đơn đã huỷ. Đơn giữ nguyên trạng thái Đã huỷ, đã tạo yêu cầu hoàn tiền.',
};

const GATEWAY = { kind: 'gateway_sim' as const, name: 'Cổng thanh toán mô phỏng' };

function markRef(state: DemoState, txId: string, ref: string, patch: Partial<Transaction> = {}): DemoState {
  return {
    ...state,
    transactions: state.transactions.map((t) => (t.id === txId ? { ...t, ...patch, processedRefs: [...t.processedRefs, ref] } : t)),
  };
}

function refundAll(state: DemoState, tx: Transaction, source: 'duplicate_payment' | 'late_payment', reason: string, at: Date): DemoState {
  let next = state;
  for (const id of tx.orderIds) {
    const order = findOrder(next, id);
    if (!order) continue;
    next = addRefund(next, order, tx.amounts[id] ?? 0, source, reason, at);
    if (source === 'late_payment') next = replaceOrder(next, { ...findOrder(next, id)!, paymentStatus: 'refund_pending' });
  }
  return next;
}

function applySuccess(state: DemoState, tx: Transaction, at: Date): DemoState {
  let next = state;
  for (const id of tx.orderIds) {
    const order = findOrder(next, id);
    if (!order) continue;
    const paid = tx.amounts[id] ?? 0;
    if (tx.kind === 'checkout') {
      if (order.status !== 'awaiting_payment') continue;
      const r = transitionOrder(order, { to: 'awaiting_confirmation', actor: GATEWAY, at, reason: 'Thanh toán thành công' });
      if (!r.ok) continue;
      const updated: Order = {
        ...r.value,
        amountPaidOnline: order.amountPaidOnline + paid,
        paymentStatus: order.kind === 'preorder' ? (order.pricing.remaining > 0 ? 'deposit_paid' : 'paid') : 'paid',
        confirmDeadline: iso(addMs(at, order.params.coopConfirmHours * HOUR_MS)),
      };
      next = replaceOrder(next, updated);
    } else {
      // Trả phần còn lại của đơn đặt trước (MHTT-07).
      let updated: Order = { ...order, amountPaidOnline: order.amountPaidOnline + paid, paymentStatus: 'paid' };
      if (order.status === 'awaiting_harvest' && order.readyReportedAt) {
        const r = transitionOrder(updated, { to: 'preparing', actor: { kind: 'system', name: 'Hệ thống' }, at, reason: 'Khách đã trả đủ phần còn lại', remainingSettled: true });
        if (r.ok) updated = r.value;
      }
      next = replaceOrder(next, updated);
    }
  }
  return next;
}

/** Ghi nhận kết quả từ cổng thanh toán mô phỏng. */
export function applyGatewayResult(
  state: DemoState,
  txId: string,
  result: GatewayResult,
  gatewayRef: string,
  at: Date,
): Result<{ state: DemoState; outcome: GatewayOutcome }> {
  const tx = state.transactions.find((t) => t.id === txId);
  if (!tx) return fail('Không tìm thấy giao dịch.');
  if (tx.processedRefs.includes(gatewayRef)) return ok({ state, outcome: 'ignored_same_ref' });

  // Giao dịch quá hạn mà chưa được hệ thống xử lý: cho hết hạn trước.
  let current = state;
  let txNow = tx;
  if (tx.status === 'pending' && at.getTime() >= new Date(tx.expiresAt).getTime()) {
    current = expireTransaction(current, tx, at);
    txNow = current.transactions.find((t) => t.id === txId)!;
  }

  if (result === 'success') {
    // Mọi lần cổng báo thành công đều là tiền vào thật sự (kể cả lần trùng, lần về muộn) → ghi sổ.
    current = addLedger(current, { type: 'payment_in', amount: txNow.amount, refId: txNow.id, note: `Cổng mô phỏng, mã ${gatewayRef}` }, at);
    if (txNow.status === 'pending') {
      const next = applySuccess(markRef(current, txId, gatewayRef, { status: 'paid', paidRef: gatewayRef }), txNow, at);
      const usageUsed = {
        ...next,
        voucherUsages: next.voucherUsages.map((u) => (txNow.checkoutId && u.checkoutId === txNow.checkoutId && u.status === 'held' ? { ...u, status: 'used' as const } : u)),
      };
      return ok({ state: usageUsed, outcome: 'paid' });
    }
    if (txNow.status === 'paid') {
      const next = refundAll(markRef(current, txId, gatewayRef), txNow, 'duplicate_payment', 'Giao dịch nhận hai lần trả thành công (BR-TT-06)', at);
      return ok({ state: next, outcome: 'duplicate_payment_refund' });
    }
    // Đã thất bại / huỷ / hết hạn: tiền về muộn.
    if (txNow.kind === 'remaining') {
      // Phần còn lại về muộn: đơn vẫn xử lý theo hạn PAR-24; hoàn khoản vừa nhận.
      const next = refundAll(markRef(current, txId, gatewayRef), txNow, 'late_payment', 'Tiền phần còn lại về sau khi giao dịch đã kết thúc', at);
      return ok({ state: next, outcome: 'late_payment_refund' });
    }
    const next = refundAll(markRef(current, txId, gatewayRef), txNow, 'late_payment', 'Tiền về sau khi đơn đã huỷ', at);
    return ok({ state: next, outcome: 'late_payment_refund' });
  }

  if (txNow.status !== 'pending') return ok({ state: markRef(current, txId, gatewayRef), outcome: 'ignored_not_pending' });

  const status = result === 'failed' ? 'failed' : 'cancelled';
  const reason = result === 'failed' ? 'Thanh toán thất bại' : 'Khách huỷ thanh toán';
  if (txNow.kind === 'remaining') {
    // Trả phần còn lại thất bại: đơn giữ nguyên, khách thử lại được tới hạn PAR-24 (không gia hạn).
    return ok({ state: markRef(current, txId, gatewayRef, { status }), outcome: status });
  }
  const next = failCheckoutTransaction(markRef(current, txId, gatewayRef), txNow, status, reason, at);
  return ok({ state: next, outcome: status });
}

/** Hết PAR-19 phút mà chưa có kết quả: hết hạn, xử lý như thất bại. */
export function expireTransaction(state: DemoState, tx: Transaction, at: Date): DemoState {
  if (tx.kind === 'remaining') {
    return { ...state, transactions: state.transactions.map((t) => (t.id === tx.id ? { ...t, status: 'expired' } : t)) };
  }
  return failCheckoutTransaction(state, tx, 'expired', `Hết hạn thanh toán (${Math.round((new Date(tx.expiresAt).getTime() - new Date(tx.createdAt).getTime()) / 60000)} phút)`, at);
}

/** Số giây còn lại của giao dịch. */
export function secondsLeft(tx: Transaction, at: Date): number {
  return Math.max(0, Math.floor((new Date(tx.expiresAt).getTime() - at.getTime()) / 1000));
}
