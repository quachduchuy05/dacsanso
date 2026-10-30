import { describe, expect, it } from 'vitest';
import { placeCheckout } from '../checkout';
import { coopConfirmHarvest } from '../harvest';
import { deriveNotifications } from '../notifications';
import {
  contactForCoop,
  logCoopCall,
  markOrderChatRead,
  messagesOf,
  needsReadyContact,
  orderJourney,
  readyMessageTemplate,
  sendOrderMessage,
  unreadCount,
} from '../orderContact';
import { carrierSimulate, coopConfirm, coopHandover, coopReportReady, customerConfirmReceived, ensureRemainingTransaction } from '../orders';
import { applyGatewayResult } from '../payment';
import { addMs, HOUR_MS, MINUTE_MS } from '../state';
import type { DemoState, Result } from '../types';
import { ADMIN_OPS, COOP_X, COOP_Y, CUSTOMER, keyXPre, line, makeState, placeInput, T0 } from './fixtures';

const must = <T,>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const D = '2026-10-24';

/** Đơn đặt trước của khách 1 ở HTX X, đã cọc online. */
function preorder(): { s: DemoState; id: string } {
  const placed = placeCheckout(makeState(), placeInput([line('x-pre', 2, 85_000, D)], { [keyXPre(D)]: { shipping: 'standard', paymentMethod: 'online' } }), CUSTOMER, T0);
  if (!placed.ok) throw new Error(placed.error);
  const s = must(applyGatewayResult(placed.state, placed.transaction!.id, 'success', 'R1', T0)).state;
  return { s, id: s.orders[0].id };
}

const keys = (s: DemoState, id: string) => orderJourney(s, s.orders.find((o) => o.id === id)!).steps.map((x) => `${x.key}:${x.state}`);
const step = (s: DemoState, key: string) => orderJourney(s, s.orders[0]).steps.find((x) => x.key === key);

describe('Hành trình giao hàng đơn đặt trước: vào mùa → HTX liên hệ → giao', () => {
  it('các bước đi đúng thứ tự; bước liên hệ hiện khi HTX báo sẵn sàng và xong khi HTX gọi điện', () => {
    let { s, id } = preorder();
    expect(keys(s, id)).toEqual(['placed:done', 'confirmed:current', 'harvest:upcoming', 'ready:upcoming', 'contact:upcoming', 'remaining:upcoming', 'handover:upcoming', 'shipping:upcoming', 'delivered:upcoming']);

    s = must(coopConfirm(s, id, COOP_X, T0));
    expect(keys(s, id).slice(1, 4)).toEqual(['confirmed:done', 'harvest:current', 'ready:upcoming']);
    expect(step(s, 'harvest')?.detail).toBe('Chờ thu hoạch, giao dự kiến ngày 24/10/2026');
    expect(needsReadyContact(s, s.orders[0])).toBe(false);

    // Vào mùa: HTX xác nhận thu hoạch xong (chưa báo sẵn sàng) → bước báo sẵn sàng đến lượt.
    const t0 = addMs(T0, 30 * MINUTE_MS);
    s = must(coopConfirmHarvest(s, COOP_X, { productId: 'x-pre', orderId: id, harvestedOn: '2026-10-14', note: 'Lô đầu mùa', photos: ['data:image/jpeg;base64,AA'], reportReady: false }, t0)).state;
    expect(keys(s, id).slice(2, 4)).toEqual(['harvest:done', 'ready:current']);
    expect(step(s, 'harvest')).toMatchObject({ at: t0.toISOString(), detail: 'Thu hoạch ngày 14/10/2026 – Lô đầu mùa', photos: ['data:image/jpeg;base64,AA'] });

    // HTX báo sẵn sàng → cần liên hệ khách; khách cần trả phần còn lại (hai việc song song).
    const t1 = addMs(T0, HOUR_MS);
    s = must(coopReportReady(s, id, COOP_X, t1));
    expect(keys(s, id).slice(3, 6)).toEqual(['ready:done', 'contact:current', 'remaining:current']);
    expect(needsReadyContact(s, s.orders[0])).toBe(true);

    // HTX gọi điện và ghi kết quả → bước liên hệ xong, khách có thông báo.
    const t2 = addMs(t1, 10 * MINUTE_MS);
    const before = s;
    s = must(logCoopCall(s, id, COOP_X, 'scheduled', 'Giao sáng thứ Bảy', t2));
    expect(step(s, 'contact')).toMatchObject({ state: 'done', at: t2.toISOString(), detail: 'Gọi điện: Đã hẹn lịch giao – Giao sáng thứ Bảy' });
    expect(needsReadyContact(s, s.orders[0])).toBe(false);
    const notified = deriveNotifications(before, s, t2).notifications.filter((n) => n.title.includes('đã gọi cho bạn'));
    expect(notified.map((n) => n.userId)).toEqual(['u-kh1']);

    // Khách trả phần còn lại → HTX bàn giao → giao xong.
    const { tx, state: withTx } = must(ensureRemainingTransaction(s, id, t2));
    s = must(applyGatewayResult(withTx, tx.id, 'success', 'R2', t2)).state;
    s = must(coopHandover(s, id, COOP_X, t2));
    s = must(carrierSimulate(s, id, ADMIN_OPS, 'delivered_reported', '', t2));
    s = must(customerConfirmReceived(s, id, CUSTOMER, t2));
    expect(keys(s, id).every((k) => k.endsWith(':done'))).toBe(true);
  });

  it('chưa liên hệ mà đã bàn giao vận chuyển thì bước liên hệ ghi "bỏ qua"; đơn huỷ thì dừng ở bước đã xong', () => {
    let { s, id } = preorder();
    s = must(coopConfirm(s, id, COOP_X, T0));
    s = must(coopReportReady(s, id, COOP_X, T0));
    const { tx, state: withTx } = must(ensureRemainingTransaction(s, id, T0));
    s = must(applyGatewayResult(withTx, tx.id, 'success', 'R2', T0)).state;
    s = must(coopHandover(s, id, COOP_X, T0));
    expect(step(s, 'contact')).toMatchObject({ state: 'skipped', detail: 'Không ghi nhận liên hệ' });
    // Đơn báo sẵn sàng từ trước khi có bước xác nhận thu hoạch: bước thu hoạch coi như xong, không có ngày.
    expect(step(s, 'harvest')).toMatchObject({ state: 'done', at: undefined, detail: undefined });

    const cancelled = preorder();
    const j = orderJourney(cancelled.s, { ...cancelled.s.orders[0], status: 'cancelled', statusHistory: [...cancelled.s.orders[0].statusHistory, { from: 'awaiting_confirmation', to: 'cancelled', at: T0.toISOString(), actor: COOP_X, reason: 'HTX từ chối' }] });
    expect(j.steps.map((x) => x.key)).toEqual(['placed']);
    expect(j.ended).toMatchObject({ label: 'Đã huỷ', reason: 'HTX từ chối' });
  });
});

describe('Trao đổi theo đơn giữa khách và HTX', () => {
  it('hai bên nhắn qua lại, đếm tin chưa đọc, đánh dấu đã đọc, có thông báo cho bên kia', () => {
    let { s, id } = preorder();
    s = must(coopConfirm(s, id, COOP_X, T0));
    const before = s;
    s = must(sendOrderMessage(s, id, COOP_X, '  Chào anh/chị, hàng sắp vào mùa.  ', addMs(T0, MINUTE_MS)));
    const order = () => s.orders.find((o) => o.id === id)!;
    expect(messagesOf(s, id)).toMatchObject([{ sender: 'coop', senderName: 'HTX X', kind: 'text', text: 'Chào anh/chị, hàng sắp vào mùa.' }]);
    expect(unreadCount(s, order(), 'customer')).toBe(1);
    expect(unreadCount(s, order(), 'coop')).toBe(0);
    expect(deriveNotifications(before, s, T0).notifications.filter((n) => n.title === 'Tin nhắn mới từ HTX X').map((n) => n.userId)).toEqual(['u-kh1']);

    // Khách mở đơn → đã đọc; mở lần nữa không ghi gì (giữ nguyên dữ liệu).
    s = must(markOrderChatRead(s, id, CUSTOMER, addMs(T0, 2 * MINUTE_MS)));
    expect(unreadCount(s, order(), 'customer')).toBe(0);
    expect(must(markOrderChatRead(s, id, CUSTOMER, addMs(T0, 3 * MINUTE_MS)))).toBe(s);

    const prev = s;
    s = must(sendOrderMessage(s, id, CUSTOMER, 'Cảm ơn HTX, giao giờ hành chính giúp tôi.', addMs(T0, 4 * MINUTE_MS)));
    expect(unreadCount(s, order(), 'coop')).toBe(1);
    expect(deriveNotifications(prev, s, T0).notifications.filter((n) => n.title.startsWith('Tin nhắn mới từ khách')).map((n) => n.userId)).toEqual(['u-x']);
  });

  it('chặn người ngoài đơn, tin rỗng / quá dài, đơn chưa thanh toán hoặc đã huỷ; chỉ HTX ghi cuộc gọi', () => {
    const { s, id } = preorder();
    expect(sendOrderMessage(s, id, COOP_Y, 'xin chào', T0).ok).toBe(false);
    expect(sendOrderMessage(s, id, ADMIN_OPS, 'xin chào', T0).ok).toBe(false);
    expect(sendOrderMessage(s, id, CUSTOMER, '   ', T0)).toEqual({ ok: false, error: 'Vui lòng nhập nội dung tin nhắn.' });
    expect(sendOrderMessage(s, id, CUSTOMER, 'a'.repeat(1001), T0).ok).toBe(false);
    expect(logCoopCall(s, id, CUSTOMER, 'scheduled', '', T0)).toEqual({ ok: false, error: 'Chỉ HTX ghi lại cuộc gọi cho khách.' });
    const unpaid = { ...s, orders: s.orders.map((o) => ({ ...o, status: 'awaiting_payment' as const })) };
    expect(sendOrderMessage(unpaid, id, CUSTOMER, 'hỏi', T0).ok).toBe(false);
    const cancelled = { ...s, orders: s.orders.map((o) => ({ ...o, status: 'cancelled' as const })) };
    expect(sendOrderMessage(cancelled, id, COOP_X, 'hỏi', T0)).toEqual({ ok: false, error: 'Đơn đã huỷ. Cần hỗ trợ, vui lòng gửi khiếu nại cho CSKH.' });
  });

  it('dữ liệu cũ chưa có phần trao đổi vẫn đọc được', () => {
    const { s, id } = preorder();
    const old = { ...s, orderMessages: undefined };
    expect(messagesOf(old, id)).toEqual([]);
    expect(must(sendOrderMessage(old, id, CUSTOMER, 'Chào HTX', T0)).orderMessages).toHaveLength(1);
  });

  it('số HTX gọi: người nhận; đơn quà gửi người khác thì gọi người đặt; tin nhắn mẫu khi vào mùa', () => {
    const { s, id } = preorder();
    const order = s.orders.find((o) => o.id === id)!;
    expect(contactForCoop(s, order)).toEqual({ name: order.address.receiverName, phone: order.address.receiverPhone });
    const gift = { ...order, gift: { boxTypeId: 'b', boxName: 'Hộp', fee: 0, sendToOther: true, message: '' } };
    expect(contactForCoop(s, gift)).toMatchObject({ name: 'Khách 1', phone: '0900000001' });
    expect(readyMessageTemplate(s, order)).toBe(`Chào Khách 1, x-pre của đơn ${id} đã vào mùa và sẵn sàng giao. HTX dự kiến giao ngày 24/10/2026. Anh/chị xác nhận giúp HTX thời gian nhận hàng nhé.`);
  });
});

describe('Bước liên hệ trong hành trình', () => {
  it('nhắn tin trước rồi gọi điện: thời điểm là lần liên hệ đầu, nội dung là kết quả cuộc gọi gần nhất', () => {
    let { s, id } = preorder();
    s = must(coopConfirm(s, id, COOP_X, T0));
    s = must(coopReportReady(s, id, COOP_X, T0));
    const t1 = addMs(T0, MINUTE_MS);
    s = must(sendOrderMessage(s, id, COOP_X, 'Hàng đã vào mùa', t1));
    expect(step(s, 'contact')).toMatchObject({ state: 'done', at: t1.toISOString(), detail: 'Đã nhắn tin cho khách' });
    s = must(logCoopCall(s, id, COOP_X, 'no_answer', '', addMs(T0, 2 * MINUTE_MS)));
    s = must(logCoopCall(s, id, COOP_X, 'scheduled', 'Chiều Chủ nhật', addMs(T0, 3 * MINUTE_MS)));
    expect(step(s, 'contact')).toMatchObject({ at: t1.toISOString(), detail: 'Gọi điện: Đã hẹn lịch giao – Chiều Chủ nhật' });
  });
});
