/**
 * Giao hàng bằng shipper (chủ repo yêu cầu ngày 18/10/2026; chọn cho OI-01: Admin – Vận hành phân công shipper).
 *
 * - Admin – Vận hành giao đơn Đang chuẩn bị / Đang giao cho một shipper, kèm ghi chú lấy hàng. Đổi shipper được khi chưa lấy hàng.
 * - Shipper chỉ thấy đơn được giao cho mình: người nhận, SĐT người nhận, địa chỉ, sản phẩm, tiền thu hộ.
 *   Không thấy SĐT, địa chỉ HTX (mục 5.9), không thấy tài khoản ngân hàng của khách.
 * - Shipper: đã lấy hàng (sau khi HTX bàn giao) → giao thành công (bắt buộc ảnh giao hàng) / giao thất bại (bắt buộc lý do;
 *   quá PAR-27 lần thì chuyển hoàn) / khách từ chối nhận (chuyển hoàn). Báo giao thành công chỉ ghi mốc; đơn sang Đã giao khi
 *   khách bấm Đã nhận hoặc sau PAR-26 (mục 5.5).
 * - Tiền thu hộ (COD): giao thành công thì shipper giữ khoản thu khi nhận hàng của đơn; shipper nộp (mô phỏng),
 *   Admin – Tài chính xác nhận đã nhận.
 */
import { generateId } from './ids';
import { reportDelivery } from './orders';
import { audit, findOrder, iso, replaceOrder } from './state';
import { fail, ok, type Actor, type CodRemittance, type DemoState, type DeliveryEvent, type Order, type Result, type UserAccount } from './types';

export const MAX_PROOF_PHOTOS = 2;
export const PICKUP_NOTE_MAX = 200;

/** Lý do giao thất bại. "Khác" bắt buộc ghi rõ. */
export const DELIVERY_FAIL_REASONS = ['Không liên lạc được người nhận', 'Người nhận hẹn giao lại', 'Người nhận vắng nhà', 'Sai hoặc thiếu địa chỉ', 'Khác'] as const;
export type DeliveryFailReason = (typeof DELIVERY_FAIL_REASONS)[number];

export const listShippers = (state: DemoState): UserAccount[] => state.users.filter((u) => u.role === 'shipper');

const isOps = (actor: Actor) => actor.kind === 'admin' && actor.adminGroup === 'operations';

/** Admin – Vận hành giao đơn cho shipper, hoặc đổi shipper khi shipper cũ chưa lấy hàng. */
export function opsAssignShipper(state: DemoState, actor: Actor, orderId: string, shipperId: string, pickupNote: string, at: Date): Result<DemoState> {
  if (!isOps(actor)) return fail('Chỉ Admin – Vận hành phân công shipper.');
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  if (order.status !== 'preparing' && order.status !== 'shipping') return fail('Chỉ phân công đơn Đang chuẩn bị hoặc Đang giao.');
  if (order.carrierDeliveredAt) return fail('Đơn đã báo giao thành công.');
  if (order.shipment?.pickedUpAt) return fail('Shipper đã lấy hàng, không đổi shipper được.');
  const shipper = listShippers(state).find((u) => u.id === shipperId);
  if (!shipper) return fail('Vui lòng chọn shipper.');
  if (shipper.status !== 'active') return fail('Tài khoản shipper đang khoá.');
  if (order.shipment?.shipperId === shipperId) return fail(`Đơn đã giao cho ${shipper.name}.`);
  const note = pickupNote.trim();
  if (note.length > PICKUP_NOTE_MAX) return fail(`Ghi chú lấy hàng tối đa ${PICKUP_NOTE_MAX} ký tự.`);
  const updated: Order = {
    ...order,
    shipment: { shipperId, shipperName: shipper.name, assignedAt: iso(at), assignedBy: actor.name ?? 'Admin – Vận hành', ...(note ? { pickupNote: note } : {}) },
    deliveryLog: [...order.deliveryLog, { at: iso(at), event: 'assigned', by: shipper.name }],
  };
  return ok(audit(replaceOrder(state, updated), actor, order.shipment ? 'Đổi shipper' : 'Phân công shipper', orderId, at, shipper.name));
}

/** Đơn được giao cho shipper này, mới phân công trước. */
export function shipperOrders(state: DemoState, actor: Actor): Result<Order[]> {
  if (actor.kind !== 'shipper') return fail('Chỉ shipper xem được danh sách đơn cần giao.');
  return ok(state.orders.filter((o) => o.shipment?.shipperId === actor.id).sort((a, b) => b.shipment!.assignedAt.localeCompare(a.shipment!.assignedAt)));
}

function ownOrder(state: DemoState, actor: Actor, orderId: string): Result<Order> {
  if (actor.kind !== 'shipper') return fail('Chỉ shipper được thực hiện thao tác này.');
  const order = findOrder(state, orderId);
  if (!order || order.shipment?.shipperId !== actor.id) return fail('Đơn không được giao cho bạn.');
  return ok(order);
}

function pickedUpOrder(state: DemoState, actor: Actor, orderId: string): Result<Order> {
  const own = ownOrder(state, actor, orderId);
  if (!own.ok) return own;
  if (!own.value.shipment!.pickedUpAt) return fail('Bấm "Đã lấy hàng" trước khi báo kết quả giao.');
  return own;
}

export function shipperPickUp(state: DemoState, actor: Actor, orderId: string, at: Date): Result<DemoState> {
  const own = ownOrder(state, actor, orderId);
  if (!own.ok) return own;
  if (own.value.status === 'preparing') return fail('HTX chưa bàn giao vận chuyển. Lấy hàng sau khi HTX bàn giao.');
  if (own.value.shipment!.pickedUpAt) return fail('Đã ghi nhận lấy hàng.');
  return reportDelivery(state, orderId, actor, 'picked_up', '', at, { by: actor.name, patch: (o) => ({ ...o, shipment: { ...o.shipment!, pickedUpAt: iso(at) } }) });
}

/** Giao thành công: bắt buộc 1–2 ảnh giao hàng. Đơn có thu khi nhận hàng thì shipper giữ khoản đó, chờ nộp. */
export function shipperDelivered(state: DemoState, actor: Actor, orderId: string, input: { photos: string[]; note?: string }, at: Date): Result<DemoState> {
  const own = pickedUpOrder(state, actor, orderId);
  if (!own.ok) return own;
  if (input.photos.length === 0) return fail('Chụp ít nhất 1 ảnh giao hàng.');
  if (input.photos.length > MAX_PROOF_PHOTOS) return fail(`Tối đa ${MAX_PROOF_PHOTOS} ảnh giao hàng.`);
  const cod = own.value.pricing.payOnDelivery;
  const note = input.note?.trim();
  return reportDelivery(state, orderId, actor, 'delivered_reported', '', at, {
    by: actor.name,
    patch: (o) => ({ ...o, shipment: { ...o.shipment!, proofPhotos: input.photos, ...(note ? { deliveredNote: note } : {}), ...(cod > 0 ? { codHeld: cod } : {}) } }),
  });
}

export function shipperFailed(state: DemoState, actor: Actor, orderId: string, reason: string, note: string, at: Date): Result<DemoState> {
  const own = pickedUpOrder(state, actor, orderId);
  if (!own.ok) return own;
  if (!DELIVERY_FAIL_REASONS.includes(reason as DeliveryFailReason)) return fail('Chọn lý do giao thất bại.');
  const detail = note.trim();
  if (reason === 'Khác' && !detail) return fail('Ghi rõ lý do giao thất bại.');
  const text = reason === 'Khác' ? detail : detail ? `${reason}: ${detail}` : reason;
  return reportDelivery(state, orderId, actor, 'failed', text, at, { by: actor.name });
}

export function shipperRefused(state: DemoState, actor: Actor, orderId: string, reason: string, at: Date): Result<DemoState> {
  const own = pickedUpOrder(state, actor, orderId);
  if (!own.ok) return own;
  if (!reason.trim()) return fail('Ghi lý do khách từ chối nhận.');
  return reportDelivery(state, orderId, actor, 'refused', reason, at, { by: actor.name });
}

// ---------- Tiền thu hộ (COD) ----------

/** Đơn shipper đã thu tiền khi giao mà chưa nộp. */
export const codOnHand = (state: DemoState, shipperId: string): Order[] => state.orders.filter((o) => o.shipment?.shipperId === shipperId && (o.shipment.codHeld ?? 0) > 0 && !o.shipment.remittanceId);

export const codTotal = (orders: Order[]): number => orders.reduce((s, o) => s + (o.shipment?.codHeld ?? 0), 0);

/** Shipper nộp toàn bộ tiền thu hộ đang giữ (mô phỏng): tạo phiếu nộp chờ Admin – Tài chính xác nhận. */
export function shipperRemitCod(state: DemoState, actor: Actor, at: Date): Result<{ state: DemoState; remittance: CodRemittance }> {
  if (actor.kind !== 'shipper' || !actor.id) return fail('Chỉ shipper nộp tiền thu hộ.');
  const orders = codOnHand(state, actor.id);
  if (orders.length === 0) return fail('Không có tiền thu hộ cần nộp.');
  const remittance: CodRemittance = {
    id: generateId('NT'),
    shipperId: actor.id,
    shipperName: actor.name ?? 'Shipper',
    orderIds: orders.map((o) => o.id),
    amount: codTotal(orders),
    createdAt: iso(at),
    status: 'submitted',
  };
  const ids = new Set(remittance.orderIds);
  const next: DemoState = {
    ...state,
    orders: state.orders.map((o) => (ids.has(o.id) ? { ...o, shipment: { ...o.shipment!, remittanceId: remittance.id } } : o)),
    codRemittances: [remittance, ...(state.codRemittances ?? [])],
  };
  return ok({ state: audit(next, actor, 'Lập phiếu nộp tiền thu hộ', remittance.id, at, `${orders.length} đơn · ${remittance.amount}đ`), remittance });
}

export function financeConfirmRemittance(state: DemoState, actor: Actor, remittanceId: string, at: Date): Result<DemoState> {
  if (actor.kind !== 'admin' || actor.adminGroup !== 'finance') return fail('Chỉ Admin – Tài chính xác nhận tiền thu hộ.');
  const remittance = (state.codRemittances ?? []).find((r) => r.id === remittanceId);
  if (!remittance) return fail('Không tìm thấy phiếu nộp tiền.');
  if (remittance.status === 'confirmed') return fail('Phiếu nộp tiền đã được xác nhận.');
  const confirmed: CodRemittance = { ...remittance, status: 'confirmed', confirmedAt: iso(at), confirmedBy: actor.name ?? 'Admin – Tài chính' };
  const next = { ...state, codRemittances: (state.codRemittances ?? []).map((r) => (r.id === remittanceId ? confirmed : r)) };
  return ok(audit(next, actor, 'Ghi nhận Tài chính đã nhận tiền thu hộ', remittanceId, at, `${remittance.shipperName} · ${remittance.amount}đ`));
}

// ---------- Hiển thị ----------

/** Việc shipper cần làm tiếp với đơn. */
export type ShipperStep = 'wait_handover' | 'pick_up' | 'deliver' | 'reported' | 'done';

export function shipperStep(order: Order): ShipperStep {
  if (order.status === 'preparing') return 'wait_handover';
  if (order.status !== 'shipping') return 'done';
  if (order.carrierDeliveredAt) return 'reported';
  return order.shipment?.pickedUpAt ? 'deliver' : 'pick_up';
}

/** Lần giao thất bại gần nhất của đơn (để shipper biết khi giao lại). */
export const lastFailure = (order: Order): DeliveryEvent | undefined => [...order.deliveryLog].reverse().find((e) => e.event === 'failed');
