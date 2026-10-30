/**
 * Thao tác trên đơn của Khách, HTX, Admin và ĐVVC mô phỏng (mục 5.5, 5.6, 5.7).
 * Mọi chuyển trạng thái đi qua orderStateMachine; quyền được kiểm tra ngay trong hàm (mục 5.9).
 */
import { linesOfOrders } from './checkout';
import { generateId } from './ids';
import { customerCancelMode, transitionOrder } from './orderStateMachine';
import { preorderCancelRefund, type CancelCause } from './refund';
import { addLedger, addMs, audit, findOrder, fromDateKey, HOUR_MS, iso, replaceOrder } from './state';
import {
  fail,
  goodsGroupOf,
  ok,
  type Actor,
  type CartLine,
  type DemoState,
  type Order,
  type OrderStatus,
  type RefundRecord,
  type Result,
  type Transaction,
} from './types';

// ==========================================
// Kiểm quyền
// ==========================================

function requireCustomer(order: Order, actor: Actor): string | null {
  if (actor.kind !== 'customer' || actor.id !== order.customerId) return 'Bạn không có quyền thao tác trên đơn này.';
  return null;
}

/** HTX chỉ thao tác đơn của HTX mình. */
function requireCoop(order: Order, actor: Actor): string | null {
  if (actor.kind !== 'coop' || actor.id !== order.coopId) return 'HTX chỉ được thao tác đơn của HTX mình.';
  return null;
}

function requireAdmin(actor: Actor, group?: Actor['adminGroup']): string | null {
  if (actor.kind !== 'admin') return 'Chỉ Admin được thực hiện thao tác này.';
  if (group && actor.adminGroup !== group) return 'Tài khoản Admin không thuộc nhóm quyền phù hợp.';
  return null;
}

// ==========================================
// Chuyển trạng thái + lịch sử
// ==========================================

function move(state: DemoState, order: Order, to: OrderStatus, actor: Actor, at: Date, reason?: string, remainingSettled?: boolean): Result<{ state: DemoState; order: Order }> {
  const r = transitionOrder(order, { to, actor, at, reason, remainingSettled });
  if (!r.ok) return r;
  return ok({ state: replaceOrder(state, r.value), order: r.value });
}

/** Đơn đã có bao nhiêu tiền thu thực tế (online + COD đã thu). */
export const amountCollected = (o: Order): number => o.amountPaidOnline + o.codCollected;

export function addRefund(
  state: DemoState,
  order: Order,
  amount: number,
  source: RefundRecord['source'],
  reason: string,
  at: Date,
): DemoState {
  if (amount <= 0) return state;
  const refund: RefundRecord = {
    id: generateId('RF'),
    orderId: order.id,
    customerId: order.customerId,
    amount,
    status: 'refund_pending',
    source,
    reason,
    // Đơn online hoàn về nguồn ban đầu; tiền COD chuyển khoản vào tài khoản khách đã khai.
    destination: order.codCollected > 0 && order.amountPaidOnline === 0 ? 'bank_account' : 'original_source',
    createdAt: iso(at),
  };
  return { ...state, refunds: [refund, ...state.refunds] };
}

/**
 * Nhả lượt mã khi mọi đơn dùng mã của lần đặt bị huỷ trước bàn giao và không có đơn nào mất cọc.
 * Không hoàn lượt khi khách mất cọc hoặc giao thất bại do khách (BR-KM).
 */
function maybeReleaseVoucher(state: DemoState, checkoutId: string, forfeited: boolean): DemoState {
  if (forfeited) return state;
  const usage = state.voucherUsages.find((u) => u.checkoutId === checkoutId && u.status !== 'released');
  if (!usage) return state;
  const allCancelled = usage.orderIds.every((id) => findOrder(state, id)?.status === 'cancelled');
  if (!allCancelled) return state;
  return { ...state, voucherUsages: state.voucherUsages.map((u) => (u.id === usage.id ? { ...u, status: 'released' } : u)) };
}

/**
 * Huỷ đơn và tạo yêu cầu hoàn cho phần tiền đã thu (mục 5.7).
 * Khách huỷ đơn đặt trước sau mốc D − PAR-08 thì mất cọc.
 */
export function cancelOrder(state: DemoState, orderId: string, actor: Actor, reason: string, cause: CancelCause, at: Date): Result<DemoState> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  const moved = move(state, order, 'cancelled', actor, at, reason);
  if (!moved.ok) return moved;
  let next = moved.value.state;
  let cancelled: Order = { ...moved.value.order, cancelReason: reason };

  const paid = amountCollected(order);
  let forfeited = 0;
  if (order.kind === 'preorder' && cause === 'customer' && order.deliveryDate && order.amountPaidOnline > 0) {
    const r = preorderCancelRefund(order.pricing.deposit, fromDateKey(order.deliveryDate), at, cause, order.params.preorderMinLeadDays);
    forfeited = Math.min(r.forfeitedDeposit, order.amountPaidOnline);
  }
  const refundAmount = paid - forfeited;
  if (refundAmount > 0) {
    cancelled = { ...cancelled, paymentStatus: 'refund_pending' };
    next = addRefund(next, cancelled, refundAmount, 'cancel', reason, at);
  }
  next = replaceOrder(next, cancelled);
  // Huỷ trước khi trả tiền: nhả giao dịch còn treo của riêng đơn này.
  next = {
    ...next,
    transactions: next.transactions.map((t) =>
      t.status === 'pending' && t.kind === 'remaining' && t.orderIds.includes(orderId) ? { ...t, status: 'cancelled' } : t,
    ),
  };
  next = maybeReleaseVoucher(next, order.checkoutId, forfeited > 0);
  next = audit(next, actor, 'Huỷ đơn', orderId, at, reason);
  return ok(next);
}

/** Thanh toán thất bại / huỷ / hết hạn: huỷ các đơn online, nhả hàng, nhả suất, nhả lượt mã, trả sản phẩm về giỏ. */
export function failCheckoutTransaction(state: DemoState, tx: Transaction, status: 'failed' | 'expired' | 'cancelled', reason: string, at: Date): DemoState {
  let next: DemoState = { ...state, transactions: state.transactions.map((t) => (t.id === tx.id ? { ...t, status } : t)) };
  const cancelledOrders: Order[] = [];
  for (const id of tx.orderIds) {
    const order = findOrder(next, id);
    if (!order || order.status !== 'awaiting_payment') continue;
    const moved = move(next, order, 'cancelled', { kind: 'system', name: 'Hệ thống' }, at, reason);
    if (!moved.ok) continue;
    next = replaceOrder(moved.value.state, { ...moved.value.order, cancelReason: reason });
    cancelledOrders.push(order);
  }
  if (tx.checkoutId) next = maybeReleaseVoucher(next, tx.checkoutId, false);
  // Sản phẩm quay lại giỏ.
  const back = linesOfOrders(cancelledOrders);
  const cart = [...(next.carts[tx.customerId] ?? [])];
  for (const line of back) {
    const existing = cart.find((l) => l.productId === line.productId);
    if (existing) existing.quantity += line.quantity;
    else cart.push(line as CartLine);
  }
  return { ...next, carts: { ...next.carts, [tx.customerId]: cart } };
}

// ==========================================
// Khách hàng
// ==========================================

export function customerCancel(state: DemoState, orderId: string, actor: Actor, reason: string, at: Date): Result<DemoState> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  const denied = requireCustomer(order, actor);
  if (denied) return fail(denied);
  if (!reason.trim()) return fail('Vui lòng chọn lý do huỷ.');
  const mode = customerCancelMode(order.status);
  if (mode === 'not_allowed') return fail('Đơn đã bàn giao vận chuyển, không huỷ được.');
  if (mode === 'request') return fail('Đơn đã được HTX xác nhận. Vui lòng gửi yêu cầu huỷ để HTX duyệt.');

  if (order.status === 'awaiting_payment') {
    // Đơn chưa thanh toán nằm trong giao dịch gộp: huỷ cả giao dịch, giống bấm Huỷ ở cổng thanh toán.
    const tx = state.transactions.find((t) => t.status === 'pending' && t.kind === 'checkout' && t.orderIds.includes(orderId));
    if (tx) return ok(failCheckoutTransaction(state, tx, 'cancelled', `Khách huỷ đơn: ${reason}`, at));
  }
  return cancelOrder(state, orderId, actor, `Khách huỷ: ${reason}`, 'customer', at);
}

/** Đã xác nhận / Đang chuẩn bị / Chờ thu hoạch: khách gửi yêu cầu huỷ, HTX duyệt (FR-DH-03, FR-DH-16). */
export function customerRequestCancel(state: DemoState, orderId: string, actor: Actor, reason: string, at: Date): Result<DemoState> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  const denied = requireCustomer(order, actor);
  if (denied) return fail(denied);
  if (customerCancelMode(order.status) !== 'request') return fail('Trạng thái đơn hiện tại không gửi yêu cầu huỷ được.');
  if (order.cancelRequest?.status === 'pending') return fail('Đơn đã có yêu cầu huỷ đang chờ HTX duyệt.');
  if (!reason.trim()) return fail('Vui lòng nhập lý do huỷ.');
  return ok(replaceOrder(state, { ...order, cancelRequest: { reason: reason.trim(), at: iso(at), status: 'pending' } }));
}

/** Khách bấm Đã nhận hàng (FR-DH-15). */
export function customerConfirmReceived(state: DemoState, orderId: string, actor: Actor, at: Date): Result<DemoState> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  const denied = requireCustomer(order, actor);
  if (denied) return fail(denied);
  return markDelivered(state, order, actor, at, 'Khách xác nhận đã nhận hàng');
}

function markDelivered(state: DemoState, order: Order, actor: Actor, at: Date, reason: string): Result<DemoState> {
  const moved = move(state, order, 'delivered', actor, at, reason);
  if (!moved.ok) return moved;
  const cod = order.pricing.payOnDelivery;
  const delivered: Order = {
    ...moved.value.order,
    deliveredAt: iso(at),
    codCollected: order.codCollected + cod,
    paymentStatus: order.paymentStatus === 'refund_pending' ? order.paymentStatus : 'paid',
  };
  let next = replaceOrder(moved.value.state, delivered);
  next = addLedger(next, { type: 'cod_in', amount: cod, orderId: order.id, coopId: order.coopId, note: 'Thu khi giao' }, at);
  next = {
    ...next,
    voucherUsages: next.voucherUsages.map((u) => (u.checkoutId === order.checkoutId && u.status === 'held' ? { ...u, status: 'used' } : u)),
  };
  return ok(next);
}

/** Đổi phần còn lại của đơn đặt trước từ online sang COD, 1 lần, trước hạn, nếu đơn đủ điều kiện COD (mục 5.4). */
export function customerSwitchRemainingToCod(state: DemoState, orderId: string, actor: Actor, at: Date): Result<DemoState> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  const denied = requireCustomer(order, actor);
  if (denied) return fail(denied);
  if (order.kind !== 'preorder' || order.paymentMethod !== 'online') return fail('Đơn không có phần còn lại trả online.');
  if (order.paymentStatus !== 'deposit_paid') return fail('Chỉ đổi được khi đã cọc và chưa trả phần còn lại.');
  if (order.remainingMethodChanged) return fail('Chỉ được đổi cách trả phần còn lại 1 lần.');
  if (order.remainingDueAt && at.getTime() > new Date(order.remainingDueAt).getTime()) return fail('Đã quá hạn trả phần còn lại.');
  const codErr = codBlockReason(order);
  if (codErr) return fail(codErr);

  let updated: Order = { ...order, paymentMethod: 'cod', remainingMethodChanged: true, pricing: { ...order.pricing, payOnDelivery: order.pricing.remaining } };
  let next = replaceOrder(state, updated);
  next = { ...next, transactions: next.transactions.map((t) => (t.kind === 'remaining' && t.status === 'pending' && t.orderIds.includes(orderId) ? { ...t, status: 'cancelled' } : t)) };
  if (order.status === 'awaiting_harvest' && order.readyReportedAt) {
    const moved = move(next, updated, 'preparing', { kind: 'system', name: 'Hệ thống' }, at, 'Phần còn lại chuyển sang COD', true);
    if (moved.ok) next = moved.value.state;
  }
  return ok(next);
}

export function codBlockReason(order: Order): string | null {
  if (order.gift?.sendToOther) return 'Quà gửi người khác chỉ thanh toán online.';
  if (order.pricing.total > order.params.codMaxOrderValue) return 'Tổng đơn vượt trần được chọn COD (PAR-23).';
  return null;
}

// ==========================================
// HTX
// ==========================================

/** HTX xác nhận đơn (FR-DH-08). Sau xác nhận, đơn đặt trước sang Chờ thu hoạch, đơn mua sẵn sang Đang chuẩn bị. */
export function coopConfirm(state: DemoState, orderId: string, actor: Actor, at: Date): Result<DemoState> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  const denied = requireCoop(order, actor);
  if (denied) return fail(denied);
  const confirmed = move(state, order, 'confirmed', actor, at, 'HTX xác nhận đơn');
  if (!confirmed.ok) return confirmed;
  const nextStatus: OrderStatus = order.kind === 'preorder' ? 'awaiting_harvest' : 'preparing';
  const moved = move(confirmed.value.state, confirmed.value.order, nextStatus, { kind: 'system', name: 'Hệ thống' }, at, order.kind === 'preorder' ? 'Đơn đặt trước' : 'Đơn mua sẵn');
  if (!moved.ok) return moved;
  return ok(audit(moved.value.state, actor, 'Xác nhận đơn', orderId, at));
}

/** HTX từ chối đơn: bắt buộc lý do; hoàn 100% (FR-DH-08). */
export function coopReject(state: DemoState, orderId: string, actor: Actor, reason: string, at: Date): Result<DemoState> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  const denied = requireCoop(order, actor);
  if (denied) return fail(denied);
  if (order.status !== 'awaiting_confirmation') return fail('Chỉ từ chối được đơn đang Chờ xác nhận.');
  if (!reason.trim()) return fail('HTX từ chối đơn phải nhập lý do.');
  return cancelOrder(state, orderId, actor, `HTX từ chối: ${reason.trim()}`, 'coop_rejected', at);
}

/**
 * HTX báo sẵn sàng giao (đơn đặt trước, FR-DH-17).
 * Đã trả đủ hoặc phần còn lại là COD thì sang Đang chuẩn bị; nếu không thì mở hạn PAR-24 để khách trả phần còn lại.
 */
export function coopReportReady(state: DemoState, orderId: string, actor: Actor, at: Date): Result<DemoState> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  const denied = requireCoop(order, actor);
  if (denied) return fail(denied);
  if (order.status !== 'awaiting_harvest') return fail('Chỉ báo sẵn sàng với đơn đang Chờ thu hoạch.');
  if (order.readyReportedAt) return fail('HTX đã báo sẵn sàng, đang chờ khách trả phần còn lại.');
  const reported: Order = { ...order, readyReportedAt: iso(at) };
  let next = replaceOrder(state, reported);
  const settled = order.paymentMethod === 'cod' || order.paymentStatus === 'paid';
  if (settled) {
    const moved = move(next, reported, 'preparing', actor, at, 'HTX báo sẵn sàng giao', true);
    if (!moved.ok) return moved;
    next = moved.value.state;
  } else {
    const dueAt = addMs(at, order.params.remainingPaymentHours * HOUR_MS);
    const tx: Transaction = {
      id: generateId('TX'),
      kind: 'remaining',
      customerId: order.customerId,
      orderIds: [order.id],
      amounts: { [order.id]: order.pricing.remaining },
      amount: order.pricing.remaining,
      status: 'pending',
      createdAt: iso(at),
      expiresAt: iso(dueAt),
      processedRefs: [],
    };
    next = replaceOrder(next, { ...reported, remainingDueAt: iso(dueAt) });
    next = { ...next, transactions: [tx, ...next.transactions] };
  }
  return ok(audit(next, actor, 'Báo sẵn sàng giao', orderId, at));
}

/** Giao dịch trả phần còn lại đang mở; tạo lại (không gia hạn) nếu lần trước thất bại. */
export function ensureRemainingTransaction(state: DemoState, orderId: string, at: Date): Result<{ state: DemoState; tx: Transaction }> {
  const order = findOrder(state, orderId);
  if (!order || !order.remainingDueAt) return fail('Đơn chưa đến lúc trả phần còn lại.');
  if (order.paymentStatus !== 'deposit_paid' || order.paymentMethod !== 'online') return fail('Đơn không còn phần cần trả online.');
  if (at.getTime() > new Date(order.remainingDueAt).getTime()) return fail('Đã quá hạn trả phần còn lại.');
  const pending = state.transactions.find((t) => t.kind === 'remaining' && t.status === 'pending' && t.orderIds.includes(orderId));
  if (pending) return ok({ state, tx: pending });
  const tx: Transaction = {
    id: generateId('TX'),
    kind: 'remaining',
    customerId: order.customerId,
    orderIds: [order.id],
    amounts: { [order.id]: order.pricing.remaining },
    amount: order.pricing.remaining,
    status: 'pending',
    createdAt: iso(at),
    expiresAt: order.remainingDueAt,
    processedRefs: [],
  };
  return ok({ state: { ...state, transactions: [tx, ...state.transactions] }, tx });
}

/** HTX báo không cung cấp được hàng: huỷ, hoàn 100% (FR-DH-17). */
export function coopCannotSupply(state: DemoState, orderId: string, actor: Actor, reason: string, at: Date): Result<DemoState> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  const denied = requireCoop(order, actor);
  if (denied) return fail(denied);
  if (order.status !== 'awaiting_harvest') return fail('Chỉ báo không cung cấp được với đơn đang Chờ thu hoạch.');
  if (!reason.trim()) return fail('Vui lòng nhập lý do.');
  return cancelOrder(state, orderId, actor, `HTX không cung cấp được: ${reason.trim()}`, 'coop_cannot_supply', at);
}

/** HTX đóng gói và bàn giao vận chuyển (FR-DH-09). Hàng mua sẵn trừ hẳn khỏi tồn kho lúc bàn giao. */
export function coopHandover(state: DemoState, orderId: string, actor: Actor, at: Date): Result<DemoState> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  const denied = requireCoop(order, actor);
  if (denied) return fail(denied);
  const moved = move(state, order, 'shipping', actor, at, 'HTX bàn giao vận chuyển');
  if (!moved.ok) return moved;
  // Đơn đã có shipper: shipper tự báo đã lấy hàng (domain/shipper.ts). Chưa có: ghi ĐVVC mô phỏng đã nhận hàng.
  const deliveryLog = order.shipment ? order.deliveryLog : [...order.deliveryLog, { at: iso(at), event: 'picked_up' as const }];
  let next = replaceOrder(moved.value.state, { ...moved.value.order, deliveryLog });
  if (order.kind === 'ready') {
    next = {
      ...next,
      products: next.products.map((p) => {
        const qty = order.items.filter((i) => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
        return qty > 0 ? { ...p, stockOnHand: Math.max(0, p.stockOnHand - qty) } : p;
      }),
    };
  }
  return ok(audit(next, actor, 'Bàn giao vận chuyển', orderId, at));
}

/** HTX xác nhận đã nhận lại hàng hoàn (FR-DH-10). Hàng hoàn về không tự cộng lại tồn kho. */
export function coopReceiveReturn(state: DemoState, orderId: string, actor: Actor, at: Date): Result<DemoState> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  const denied = requireCoop(order, actor);
  if (denied) return fail(denied);
  const moved = move(state, order, 'returned', actor, at, 'HTX xác nhận nhận lại hàng');
  if (!moved.ok) return moved;
  return ok(audit(moved.value.state, actor, 'Nhận lại hàng hoàn', orderId, at));
}

/** HTX duyệt hoặc từ chối yêu cầu huỷ của khách (FR-DH-16). */
export function coopDecideCancelRequest(state: DemoState, orderId: string, actor: Actor, approve: boolean, rejectReason: string, at: Date): Result<DemoState> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  const denied = requireCoop(order, actor);
  if (denied) return fail(denied);
  if (order.cancelRequest?.status !== 'pending') return fail('Đơn không có yêu cầu huỷ đang chờ.');
  if (!approve) {
    if (!rejectReason.trim()) return fail('Từ chối yêu cầu huỷ phải nhập lý do.');
    const next = replaceOrder(state, { ...order, cancelRequest: { ...order.cancelRequest, status: 'rejected', rejectReason: rejectReason.trim() } });
    return ok(audit(next, actor, 'Từ chối yêu cầu huỷ', orderId, at, rejectReason));
  }
  const withDecision = replaceOrder(state, { ...order, cancelRequest: { ...order.cancelRequest, status: 'approved' } });
  const r = cancelOrder(withDecision, orderId, actor, `Khách yêu cầu huỷ: ${order.cancelRequest.reason}`, 'customer', at);
  return r;
}

// ==========================================
// ĐVVC mô phỏng (Admin – Vận hành, chờ OI-01)
// ==========================================

export type CarrierEvent = 'picked_up' | 'delivered_reported' | 'failed' | 'refused';

/**
 * Ghi một báo cáo giao hàng cho đơn Đang giao, của ĐVVC mô phỏng hoặc của shipper (`by` là tên shipper).
 * - Báo giao thành công chỉ ghi mốc; đơn sang Đã giao khi khách bấm Đã nhận hoặc sau PAR-26 (mục 5.5).
 * - Giao thất bại quá PAR-27 lần, hoặc khách từ chối nhận, thì chuyển hoàn. Hai trường hợp này bắt buộc lý do.
 * - `patch` thêm thông tin của shipper vào đơn (ảnh giao hàng, tiền thu hộ…).
 */
export function reportDelivery(
  state: DemoState,
  orderId: string,
  actor: Actor,
  event: CarrierEvent,
  reason: string,
  at: Date,
  opts: { by?: string; patch?: (order: Order) => Order } = {},
): Result<DemoState> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  if (order.status !== 'shipping') return fail('Chỉ báo giao hàng với đơn Đang giao.');
  if (order.carrierDeliveredAt) return fail(opts.by ? 'Đơn đã báo giao thành công.' : 'ĐVVC đã báo giao thành công.');
  const log = [...order.deliveryLog, { at: iso(at), event, reason: reason.trim() || undefined, ...(opts.by ? { by: opts.by } : {}) }];
  const reporter: Actor = opts.by ? actor : { kind: 'carrier_sim', name: 'ĐVVC mô phỏng' };
  const label = opts.by ? 'Shipper' : 'Mô phỏng ĐVVC';
  const patch = opts.patch ?? ((o: Order) => o);

  if (event === 'picked_up') {
    return ok(audit(replaceOrder(state, patch({ ...order, deliveryLog: log })), actor, `${label}: đang giao`, orderId, at));
  }
  if (event === 'delivered_reported') {
    return ok(audit(replaceOrder(state, patch({ ...order, deliveryLog: log, carrierDeliveredAt: iso(at) })), actor, `${label}: giao thành công`, orderId, at));
  }
  if (!reason.trim()) return fail('Vui lòng nhập lý do giao thất bại.');
  if (event === 'refused') {
    const moved = move(state, patch({ ...order, deliveryLog: log }), 'returning', reporter, at, `Khách từ chối nhận: ${reason.trim()}`);
    if (!moved.ok) return moved;
    return ok(audit(moved.value.state, actor, `${label}: khách từ chối nhận`, orderId, at, reason));
  }
  // Giao thất bại: hết PAR-27 lần giao lại thì chuyển hoàn.
  const attempts = order.deliveryAttempts + 1;
  const updated: Order = patch({ ...order, deliveryLog: log, deliveryAttempts: attempts });
  if (attempts > order.params.maxRedeliveries) {
    const moved = move(state, updated, 'returning', reporter, at, `Hết ${order.params.maxRedeliveries} lần giao lại: ${reason.trim()}`);
    if (!moved.ok) return moved;
    return ok(audit(moved.value.state, actor, `${label}: chuyển hoàn`, orderId, at, reason));
  }
  return ok(audit(replaceOrder(state, updated), actor, `${label}: giao thất bại lần ${attempts}`, orderId, at, reason));
}

/** Admin – Vận hành mô phỏng ĐVVC cho đơn chưa phân công shipper (đơn đã có shipper thì shipper tự báo). */
export function carrierSimulate(state: DemoState, orderId: string, actor: Actor, event: CarrierEvent, reason: string, at: Date): Result<DemoState> {
  const denied = requireAdmin(actor, 'operations');
  if (denied) return fail(denied);
  const order = findOrder(state, orderId);
  if (order?.shipment) return fail(`Đơn đã giao cho ${order.shipment.shipperName}; shipper báo kết quả giao hàng.`);
  return reportDelivery(state, orderId, actor, event, reason, at);
}

/** Tự chuyển Đã giao khi ĐVVC đã báo giao thành công mà sau PAR-26 khách vẫn chưa bấm. */
export function autoDeliveredDueAt(order: Order): Date | null {
  if (order.status !== 'shipping' || !order.carrierDeliveredAt) return null;
  const fresh = order.items.some((i) => goodsGroupOf(i.category) === 'fresh');
  const hours = fresh ? order.params.autoDeliveredHoursFresh : order.params.autoDeliveredHoursDry;
  return addMs(new Date(order.carrierDeliveredAt), hours * HOUR_MS);
}

export function autoMarkDelivered(state: DemoState, order: Order, at: Date): Result<DemoState> {
  return markDelivered(state, order, { kind: 'system', name: 'Hệ thống' }, at, 'Tự chuyển Đã giao sau PAR-26 (ĐVVC đã báo giao thành công)');
}
