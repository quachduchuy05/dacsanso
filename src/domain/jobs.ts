/**
 * Tác vụ tự động theo thời gian, chạy khi tải app, định kỳ và sau khi tua đồng hồ demo.
 * Mọi mốc thời gian dùng giờ truyền vào (now() của đồng hồ demo).
 */
import { autoDeliveredDueAt, autoMarkDelivered, cancelOrder, codBlockReason } from './orders';
import { transitionOrder } from './orderStateMachine';
import { expireTransaction } from './payment';
import { MINUTE_MS, replaceOrder } from './state';
import type { DemoState, Order } from './types';

export interface JobReport {
  expiredTransactions: number;
  confirmTimeouts: number;
  remainingDeadlines: number;
  autoDelivered: number;
  reminders: number;
}

const SYSTEM = { kind: 'system' as const, name: 'Hệ thống' };

export function runScheduledJobs(state: DemoState, at: Date): { state: DemoState; report: JobReport } {
  const report: JobReport = { expiredTransactions: 0, confirmTimeouts: 0, remainingDeadlines: 0, autoDelivered: 0, reminders: 0 };
  let next = state;
  const t = at.getTime();

  // 1. Giao dịch quá PAR-19 phút: hết hạn, huỷ các đơn online, nhả hàng/suất/mã.
  for (const tx of state.transactions) {
    if (tx.status === 'pending' && t >= new Date(tx.expiresAt).getTime()) {
      next = expireTransaction(next, next.transactions.find((x) => x.id === tx.id)!, at);
      report.expiredTransactions++;
    }
  }

  // 2. Nhắc thanh toán ở phút PAR-20 (thông báo chi tiết làm ở Giai đoạn 3).
  const needsReminder = (tx: DemoState['transactions'][number]) =>
    tx.status === 'pending' && tx.kind === 'checkout' && !tx.remindedAt && t >= new Date(tx.createdAt).getTime() + next.params.paymentReminderMinute * MINUTE_MS;
  if (next.transactions.some(needsReminder)) {
    report.reminders = next.transactions.filter(needsReminder).length;
    next = { ...next, transactions: next.transactions.map((tx) => (needsReminder(tx) ? { ...tx, remindedAt: at.toISOString() } : tx)) };
  }

  for (const original of state.orders) {
    const order = next.orders.find((o) => o.id === original.id);
    if (!order) continue;

    // 3. Quá hạn HTX xác nhận (PAR-11): hệ thống huỷ, hoàn 100%.
    if (order.status === 'awaiting_confirmation' && order.confirmDeadline && t >= new Date(order.confirmDeadline).getTime()) {
      const r = cancelOrder(next, order.id, SYSTEM, 'Quá hạn HTX xác nhận đơn (PAR-11)', 'confirm_timeout', at);
      if (r.ok) {
        next = r.value;
        report.confirmTimeouts++;
      }
      continue;
    }

    // 4. Quá hạn trả phần còn lại (PAR-24): đủ điều kiện COD thì tự chuyển sang COD; không thì huỷ như khách huỷ sau mốc (không hoàn cọc).
    if (
      order.status === 'awaiting_harvest' &&
      order.remainingDueAt &&
      order.paymentStatus === 'deposit_paid' &&
      order.paymentMethod === 'online' &&
      t >= new Date(order.remainingDueAt).getTime()
    ) {
      if (!codBlockReason(order)) {
        const switched: Order = { ...order, paymentMethod: 'cod', pricing: { ...order.pricing, payOnDelivery: order.pricing.remaining } };
        const r = transitionOrder(switched, { to: 'preparing', actor: SYSTEM, at, reason: 'Quá hạn trả phần còn lại (PAR-24): tự chuyển phần còn lại sang COD', remainingSettled: true });
        if (r.ok) next = replaceOrder(next, r.value);
      } else {
        const r = cancelOrder(next, order.id, SYSTEM, 'Quá hạn trả phần còn lại (PAR-24), đơn không đủ điều kiện COD', 'customer', at);
        if (r.ok) next = r.value;
      }
      next = {
        ...next,
        transactions: next.transactions.map((tx) => (tx.kind === 'remaining' && tx.status === 'pending' && tx.orderIds.includes(order.id) ? { ...tx, status: 'expired' } : tx)),
      };
      report.remainingDeadlines++;
      continue;
    }

    // 5. ĐVVC đã báo giao thành công, sau PAR-26 khách chưa bấm: tự chuyển Đã giao.
    const due = autoDeliveredDueAt(order);
    if (due && t >= due.getTime()) {
      const r = autoMarkDelivered(next, order, at);
      if (r.ok) {
        next = r.value;
        report.autoDelivered++;
      }
    }
  }

  return { state: next, report };
}

export const jobsChanged = (r: JobReport): boolean =>
  r.expiredTransactions + r.confirmTimeouts + r.remainingDeadlines + r.autoDelivered + r.reminders > 0;
