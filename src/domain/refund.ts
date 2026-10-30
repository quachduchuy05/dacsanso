/**
 * Huỷ đơn đặt trước và hoàn tiền (mục 5.7).
 *
 * - Khách huỷ đơn đặt trước đến hết 23:59 ngày D − PAR-08: hoàn 100% cọc; sau mốc: không hoàn cọc.
 * - HTX từ chối, quá hạn xác nhận hoặc không cung cấp được hàng: hoàn 100%.
 * - Số tiền hoàn bằng 100% tiền khách đã thực trả cho phần được duyệt; không hoàn phần chưa thu.
 * - Mỗi yêu cầu hoàn chỉ thành công 1 lần.
 */
import { fail, ok, type RefundStatus, type Result } from './types';

/** Lý do huỷ, quyết định có hoàn cọc hay không. */
export type CancelCause = 'customer' | 'coop_rejected' | 'confirm_timeout' | 'coop_cannot_supply' | 'payment_failed' | 'payment_expired';

/** Mốc cuối được hoàn cọc: 23:59:59.999 (giờ địa phương) của ngày D − PAR-08. */
export function depositRefundDeadline(deliveryDate: Date, minLeadDays: number): Date {
  const d = new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate() - minLeadDays);
  d.setHours(23, 59, 59, 999);
  return d;
}

export interface PreorderCancelRefund {
  refundDeposit: number;
  forfeitedDeposit: number;
  reason: string;
}

export function preorderCancelRefund(
  depositPaid: number,
  deliveryDate: Date,
  cancelAt: Date,
  cause: CancelCause,
  minLeadDays: number,
): PreorderCancelRefund {
  if (cause !== 'customer') {
    return { refundDeposit: depositPaid, forfeitedDeposit: 0, reason: 'Huỷ không do khách: hoàn 100% cọc.' };
  }
  const deadline = depositRefundDeadline(deliveryDate, minLeadDays);
  if (cancelAt.getTime() <= deadline.getTime()) {
    return { refundDeposit: depositPaid, forfeitedDeposit: 0, reason: 'Huỷ trước mốc D − PAR-08: hoàn 100% cọc.' };
  }
  return { refundDeposit: 0, forfeitedDeposit: depositPaid, reason: 'Huỷ sau mốc D − PAR-08: không hoàn cọc.' };
}

/**
 * Số tiền hoàn cho phần hàng được duyệt = phần khách đã thực trả cho phần đó.
 * `approvedShare` là tỷ lệ giá trị phần được duyệt trên tổng giá trị đơn (0..1).
 * Tiền chưa thu (COD chưa giao) không được hoàn.
 */
export function refundableAmount(amountActuallyPaid: number, approvedValue: number, orderValue: number): number {
  if (amountActuallyPaid <= 0 || approvedValue <= 0 || orderValue <= 0) return 0;
  const share = Math.min(1, approvedValue / orderValue);
  return Math.min(amountActuallyPaid, Math.round(amountActuallyPaid * share));
}

export interface RefundRequest {
  id: string;
  orderId: string;
  amount: number;
  status: RefundStatus;
  /** Mã tham chiếu của cổng/ngân hàng mô phỏng khi đã hoàn xong. */
  bankRef?: string;
}

/** Chuyển yêu cầu hoàn sang Đang hoàn tiền. */
export function startRefund<T extends RefundRequest>(req: T): Result<T> {
  if (req.status !== 'refund_pending') return fail('Yêu cầu hoàn không ở trạng thái Chờ hoàn tiền.');
  if (req.amount <= 0) return fail('Không có khoản đã thu để hoàn.');
  return ok({ ...req, status: 'refunding' });
}

/** Ghi nhận ngân hàng mô phỏng đã hoàn. Mỗi yêu cầu chỉ thành công 1 lần. */
export function completeRefund<T extends RefundRequest>(req: T, bankRef: string): Result<T> {
  if (req.status === 'refunded') return fail('Yêu cầu này đã được hoàn tiền, không hoàn lần hai.');
  if (req.status !== 'refunding') return fail('Phải chuyển sang Đang hoàn tiền trước khi ghi nhận.');
  return ok({ ...req, status: 'refunded', bankRef });
}
