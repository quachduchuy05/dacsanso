/**
 * Khách sửa đơn sau khi đặt.
 * - Đổi người nhận và địa chỉ trước khi bàn giao (FR-DH-02). Đơn hoả tốc chỉ đổi được nếu phụ phí không đổi.
 * - Đổi ngày giao D tối đa 1 lần, trước D − PAR-08, trong khoảng HTX khai và không sớm hơn hôm nay + PAR-08 (BR-DAT-08).
 * - Hộp quà: sau khi đặt chỉ sửa được lời nhắn và người nhận, trước khi đơn sang Đang chuẩn bị (BR-DAT-09).
 */
import { validateGiftMessage } from './checkout';
import { deliveryWindow } from './cart';
import { expressSurchargeFor } from './pricing';
import { depositRefundDeadline } from './refund';
import { isValidPhone, normalizePhone, PHONE_RULE } from './phone';
import { findOrder, findProduct, findWard, fromDateKey, replaceOrder, snapshotAddress } from './state';
import { fail, ok, type Actor, type DemoState, type GiftRecipient, type Order, type OrderStatus, type Result } from './types';

const BEFORE_HANDOVER: OrderStatus[] = ['awaiting_payment', 'awaiting_confirmation', 'confirmed', 'awaiting_harvest', 'preparing'];
const BEFORE_PREPARING: OrderStatus[] = ['awaiting_payment', 'awaiting_confirmation', 'confirmed', 'awaiting_harvest'];

function ownOrder(state: DemoState, actor: Actor, orderId: string): Result<Order> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  if (actor.kind !== 'customer' || actor.id !== order.customerId) return fail('Bạn chỉ sửa được đơn của mình.');
  return ok(order);
}

export function customerChangeAddress(state: DemoState, actor: Actor, orderId: string, addressId: string): Result<DemoState> {
  const r = ownOrder(state, actor, orderId);
  if (!r.ok) return r;
  const order = r.value;
  if (!BEFORE_HANDOVER.includes(order.status)) return fail('Đơn đã bàn giao vận chuyển, không đổi được địa chỉ.');
  if (order.gift?.sendToOther) return fail('Đơn quà gửi người khác: sửa người nhận ở mục hộp quà.');
  const address = state.addresses.find((a) => a.id === addressId && a.customerId === order.customerId);
  if (!address) return fail('Vui lòng chọn địa chỉ trong sổ địa chỉ.');
  const snap = snapshotAddress(state, address);
  if (order.shipping === 'express') {
    const fee = expressSurchargeFor(snap.distanceKm, order.params.expressTiers);
    if (fee !== order.pricing.expressSurcharge) return fail('Địa chỉ mới làm thay đổi phụ phí hoả tốc nên không đổi được. Vui lòng liên hệ CSKH.');
  }
  return ok(replaceOrder(state, { ...order, address: snap }));
}

export function customerChangeDeliveryDate(state: DemoState, actor: Actor, orderId: string, date: string, at: Date): Result<DemoState> {
  const r = ownOrder(state, actor, orderId);
  if (!r.ok) return r;
  const order = r.value;
  if (order.kind !== 'preorder' || !order.deliveryDate) return fail('Chỉ đơn đặt trước có ngày giao D.');
  if (order.deliveryDateChanged) return fail('Mỗi đơn chỉ đổi ngày giao 1 lần.');
  if (!BEFORE_PREPARING.includes(order.status)) return fail('Đơn đã chuẩn bị giao, không đổi được ngày.');
  const deadline = depositRefundDeadline(fromDateKey(order.deliveryDate), order.params.preorderMinLeadDays);
  if (at.getTime() > deadline.getTime()) return fail(`Chỉ đổi được ngày giao trước hết ngày ${deadline.toLocaleDateString('vi-VN')}.`);
  if (date === order.deliveryDate) return fail('Ngày mới trùng ngày hiện tại.');
  const product = findProduct(state, order.items[0].productId);
  const win = product ? deliveryWindow(product, at, order.params) : null;
  if (!win || date < win.min || date > win.max) return fail('Ngày giao mới không nằm trong khoảng HTX khai hoặc quá sớm.');
  return ok(replaceOrder(state, { ...order, deliveryDate: date, deliveryDateChanged: true }));
}

export function customerEditGift(state: DemoState, actor: Actor, orderId: string, message: string, recipient: GiftRecipient | undefined): Result<DemoState> {
  const r = ownOrder(state, actor, orderId);
  if (!r.ok) return r;
  const order = r.value;
  if (!order.gift) return fail('Đơn không có hộp quà.');
  if (!BEFORE_PREPARING.includes(order.status)) return fail('Đơn đã sang Đang chuẩn bị, không sửa được hộp quà.');
  const msgErr = validateGiftMessage(message, order.params.giftMessageMaxLength);
  if (msgErr) return fail(msgErr);
  let updated: Order = { ...order, gift: { ...order.gift, message: message.trim() } };
  if (order.gift.sendToOther) {
    if (!recipient?.name.trim() || !recipient.street.trim()) return fail('Vui lòng nhập đủ tên và địa chỉ người nhận.');
    if (!isValidPhone(normalizePhone(recipient.phone))) return fail(`SĐT người nhận không hợp lệ. ${PHONE_RULE}`);
    const ward = findWard(state, recipient.wardId);
    if (!ward) return fail('Vui lòng chọn phường/xã của người nhận.');
    if (order.shipping === 'express' && expressSurchargeFor(ward.distanceKm, order.params.expressTiers) !== order.pricing.expressSurcharge) {
      return fail('Địa chỉ mới làm thay đổi phụ phí hoả tốc nên không đổi được.');
    }
    updated = {
      ...updated,
      gift: { ...updated.gift!, recipient },
      address: { receiverName: recipient.name.trim(), receiverPhone: normalizePhone(recipient.phone), text: `${recipient.street.trim()}, ${ward.name}, Hà Nội`, wardName: ward.name, distanceKm: ward.distanceKm },
    };
  }
  return ok(replaceOrder(state, updated));
}
