import { describe, expect, it } from 'vitest';
import { placeCheckout } from '../checkout';
import { conversationsFor, coopMayMessage, markThreadRead, sendDirectMessage, threadItems, threadUnread, totalUnread } from '../coopChat';
import { deriveNotifications } from '../notifications';
import { sendOrderMessage } from '../orderContact';
import { addMs, MINUTE_MS } from '../state';
import type { DemoState, Result } from '../types';
import { ADMIN_OPS, COOP_X, COOP_Y, CUSTOMER, keyX, line, makeState, placeInput, REGULATOR, T0 } from './fixtures';

const must = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const t = (min: number) => addMs(T0, min * MINUTE_MS);

describe('Nhắn tin riêng giữa khách và HTX (nút chat nổi)', () => {
  it('khách hỏi HTX về sản phẩm trước khi mua; HTX trả lời; đếm chưa đọc theo từng bên', () => {
    let s = makeState();
    s = must(sendDirectMessage(s, CUSTOMER, 'coop-x', '  Hàng này còn không ạ?  ', t(1), 'x-dry'));
    expect(s.directMessages![0]).toMatchObject({ customerId: 'cust-1', coopId: 'coop-x', sender: 'customer', text: 'Hàng này còn không ạ?', productId: 'x-dry', productLabel: 'x-dry (gói)' });
    expect(threadUnread(s, 'cust-1', 'coop-x', 'coop')).toBe(1);
    expect(threadUnread(s, 'cust-1', 'coop-x', 'customer')).toBe(0);
    s = must(sendDirectMessage(s, COOP_X, 'cust-1', 'Còn ạ.', t(2)));
    // HTX gửi thì coi như đã đọc tin trước đó.
    expect(threadUnread(s, 'cust-1', 'coop-x', 'coop')).toBe(0);
    expect(totalUnread(s, CUSTOMER)).toBe(1);
    const convs = must(conversationsFor(s, CUSTOMER));
    expect(convs).toHaveLength(1);
    expect(convs[0]).toMatchObject({ coopId: 'coop-x', title: 'HTX X', unread: 1 });
    expect(convs[0].last?.text).toBe('Còn ạ.');
    // Mở cuộc trò chuyện: đã đọc; mở lại không có tin mới thì không ghi gì.
    s = must(markThreadRead(s, CUSTOMER, 'coop-x', t(3)));
    expect(totalUnread(s, CUSTOMER)).toBe(0);
    expect(must(markThreadRead(s, CUSTOMER, 'coop-x', t(4)))).toBe(s);
    expect(must(conversationsFor(s, COOP_X))[0]).toMatchObject({ customerId: 'cust-1', title: 'Khách 1' });
  });

  it('T25: HTX không nhắn được cho khách lạ; sản phẩm phải thuộc HTX; QLNN, Admin không có hộp tin', () => {
    const s = makeState();
    expect(coopMayMessage(s, 'coop-x', 'cust-1')).toBe(false);
    expect(sendDirectMessage(s, COOP_X, 'cust-1', 'Chào', T0)).toMatchObject({ ok: false });
    expect(sendDirectMessage(s, CUSTOMER, 'coop-x', 'Hỏi', T0, 'y-dry')).toMatchObject({ ok: false, error: 'Sản phẩm không thuộc HTX này.' });
    expect(sendDirectMessage(s, CUSTOMER, 'coop-x', '   ', T0)).toMatchObject({ ok: false });
    expect(sendDirectMessage(s, CUSTOMER, 'coop-x', 'x'.repeat(1001), T0)).toMatchObject({ ok: false });
    expect(sendDirectMessage(s, CUSTOMER, 'coop-zz', 'Hỏi', T0)).toMatchObject({ ok: false });
    expect(conversationsFor(s, REGULATOR).ok).toBe(false);
    expect(conversationsFor(s, ADMIN_OPS).ok).toBe(false);
    // Khách đã đặt đơn thì HTX nhắn được.
    const placed = placeCheckout(s, placeInput([line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, T0);
    if (!placed.ok) throw new Error(placed.error);
    expect(coopMayMessage(placed.state, 'coop-x', 'cust-1')).toBe(true);
    expect(sendDirectMessage(placed.state, COOP_X, 'cust-1', 'Cảm ơn bạn đã đặt hàng', T0).ok).toBe(true);
  });

  it('cuộc trò chuyện gộp tin chung và tin trong đơn theo thời gian; đọc ở hộp tin thì đơn cũng hết chưa đọc', () => {
    const placed = placeCheckout(makeState(), placeInput([line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, T0);
    if (!placed.ok) throw new Error(placed.error);
    let s: DemoState = placed.state;
    const orderId = s.orders[0].id;
    s = must(sendDirectMessage(s, CUSTOMER, 'coop-x', 'Tin chung', t(1)));
    s = must(sendOrderMessage(s, orderId, COOP_X, 'Tin trong đơn', t(2)));
    s = must(sendDirectMessage(s, COOP_X, 'cust-1', 'Tin chung của HTX', t(3)));
    const items = threadItems(s, 'cust-1', 'coop-x');
    expect(items.map((i) => [i.text, i.orderId ?? null])).toEqual([
      ['Tin chung', null],
      ['Tin trong đơn', orderId],
      ['Tin chung của HTX', null],
    ]);
    expect(threadUnread(s, 'cust-1', 'coop-x', 'customer')).toBe(2);
    s = must(markThreadRead(s, CUSTOMER, 'coop-x', t(4)));
    expect(threadUnread(s, 'cust-1', 'coop-x', 'customer')).toBe(0);
    expect(s.orders[0].chatReadAt?.customer).toBe(t(4).toISOString());
    // Khách khác / HTX khác không thấy cuộc trò chuyện này.
    expect(must(conversationsFor(s, COOP_Y))).toEqual([]);
  });

  it('tin nhắn chung sinh thông báo cho bên kia, có link mở cuộc trò chuyện', () => {
    const s0 = makeState();
    const s1 = must(sendDirectMessage(s0, CUSTOMER, 'coop-x', 'Hỏi giá sỉ', T0, 'x-dry'));
    const n1 = deriveNotifications(s0, s1, T0).notifications.filter((n) => !s0.notifications.includes(n));
    expect(n1).toEqual([expect.objectContaining({ userId: 'u-x', title: 'Tin nhắn mới từ Khách 1', link: { type: 'chat', id: 'cust-1' } })]);
    expect(n1[0].body).toContain('hỏi về x-dry (gói)');
    const s2 = must(sendDirectMessage(s1, COOP_X, 'cust-1', 'Dạ có', T0));
    const n2 = deriveNotifications(s1, s2, T0).notifications.filter((n) => !s1.notifications.includes(n));
    expect(n2).toEqual([expect.objectContaining({ userId: 'u-kh1', title: 'Tin nhắn mới từ HTX X', link: { type: 'chat', id: 'coop-x' } })]);
  });
});
