/**
 * Vòng đời đơn (mục 5.5). Trạng thái chỉ đi theo bảng chuyển; không nhảy cóc, không quay ngược.
 * Mỗi lần chuyển ghi lịch sử: thời điểm, người hoặc hệ thống thực hiện, lý do.
 */
import { fail, ok, ORDER_STATUS_LABEL, type Actor, type OrderKind, type OrderStatus, type Result, type StatusChange } from './types';

export interface StatefulOrder {
  status: OrderStatus;
  kind: OrderKind;
  statusHistory: StatusChange[];
}

/** Bảng chuyển trạng thái hợp lệ. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ['awaiting_confirmation', 'cancelled'],
  awaiting_confirmation: ['confirmed', 'cancelled'],
  confirmed: ['awaiting_harvest', 'preparing'],
  awaiting_harvest: ['preparing', 'cancelled'],
  preparing: ['shipping'],
  shipping: ['delivered', 'returning'],
  delivered: ['return_refund'],
  return_refund: [],
  returning: ['returned'],
  returned: [],
  cancelled: [],
};

/** Trạng thái đầu tiên khi tạo đơn: COD mua sẵn vào thẳng Chờ xác nhận; đơn online/đặt trước vào Chờ thanh toán. */
export function initialStatus(kind: OrderKind, payOnline: boolean): OrderStatus {
  if (kind === 'preorder' || payOnline) return 'awaiting_payment';
  return 'awaiting_confirmation';
}

export interface TransitionInput {
  to: OrderStatus;
  actor: Actor;
  at: Date;
  reason?: string;
  /** Đơn đặt trước: khách đã trả đủ, hoặc phần còn lại là COD (điều kiện Chờ thu hoạch → Đang chuẩn bị). */
  remainingSettled?: boolean;
}

function guard(order: StatefulOrder, input: TransitionInput): string | null {
  const { status: from, kind } = order;
  const { to, actor, reason } = input;
  const hasReason = !!reason?.trim();

  if (from === 'confirmed' && to === 'awaiting_harvest' && kind !== 'preorder') {
    return 'Chỉ đơn đặt trước mới sang Chờ thu hoạch.';
  }
  if (from === 'confirmed' && to === 'preparing' && kind !== 'ready') {
    return 'Đơn đặt trước phải qua Chờ thu hoạch trước khi chuẩn bị.';
  }
  if (from === 'awaiting_harvest' && to === 'preparing' && !input.remainingSettled) {
    return 'Khách chưa trả đủ phần còn lại và phần còn lại không phải COD.';
  }
  if (to === 'cancelled' && !hasReason) {
    return 'Huỷ đơn cần ghi lý do.';
  }
  if (from === 'awaiting_confirmation' && to === 'cancelled' && actor.kind === 'coop' && !hasReason) {
    return 'HTX từ chối đơn phải nhập lý do.';
  }
  if (from === 'shipping' && to === 'returning' && !hasReason) {
    return 'Chuyển hoàn cần ghi lý do (hết lượt giao lại hoặc khách từ chối nhận).';
  }
  return null;
}

/** Chuyển trạng thái đơn. Trả về đơn mới (không sửa đơn cũ) hoặc lý do bị từ chối. */
export function transitionOrder<T extends StatefulOrder>(order: T, input: TransitionInput): Result<T> {
  const allowed = ORDER_TRANSITIONS[order.status];
  if (!allowed.includes(input.to)) {
    return fail(
      `Không thể chuyển từ "${ORDER_STATUS_LABEL[order.status]}" sang "${ORDER_STATUS_LABEL[input.to]}".`,
    );
  }
  const blocked = guard(order, input);
  if (blocked) return fail(blocked);

  const change: StatusChange = {
    from: order.status,
    to: input.to,
    at: input.at.toISOString(),
    actor: input.actor,
    reason: input.reason?.trim() || undefined,
  };
  return ok({ ...order, status: input.to, statusHistory: [...order.statusHistory, change] });
}

/** Khách tự huỷ ngay được ở Chờ thanh toán, Chờ xác nhận; ở Đã xác nhận, Đang chuẩn bị phải gửi yêu cầu cho HTX duyệt. */
export function customerCancelMode(status: OrderStatus): 'immediate' | 'request' | 'not_allowed' {
  if (status === 'awaiting_payment' || status === 'awaiting_confirmation') return 'immediate';
  if (status === 'confirmed' || status === 'preparing' || status === 'awaiting_harvest') return 'request';
  return 'not_allowed';
}
