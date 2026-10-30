import { describe, expect, it } from 'vitest';
import { placeCheckout } from '../checkout';
import { submitComplaint } from '../complaint';
import { deriveNotifications, markNotificationsRead, notificationsOf } from '../notifications';
import { carrierSimulate, coopConfirm, coopHandover, customerConfirmReceived } from '../orders';
import { applyGatewayResult } from '../payment';
import { coopRequestPriceChange, decideProductChange } from '../productChanges';
import { addMs, DAY_MS } from '../state';
import type { DemoState, Result } from '../types';
import { ADMIN_OPS, ADMIN_QA, COOP_X, CUSTOMER, keyX, line, makeState, placeInput, T0 } from './fixtures';

/** Chạy thao tác rồi sinh thông báo, như store làm. */
function step(prev: DemoState, r: Result<DemoState> | { ok: true; state: DemoState } | { ok: false; error: string }, at = T0): DemoState {
  if (!r.ok) throw new Error(r.error);
  const next = 'state' in r ? r.state : r.value;
  return deriveNotifications(prev, next, at);
}

describe('Trung tâm thông báo (FR-CSKH-10)', () => {
  it('đổi trạng thái đơn báo cho khách và HTX; Đã giao kèm lời mời đánh giá; ticket báo HTX và CSKH', () => {
    let s = makeState();
    s = { ...s, params: { ...s.params, lowStockThreshold: 2 } }; // tách khỏi cảnh báo tồn thấp
    const placed = placeCheckout(s, placeInput([line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'online' } }), CUSTOMER, T0);
    s = step(s, placed);
    expect(notificationsOf(s, 'u-kh1').map((n) => n.title)).toEqual([expect.stringMatching(/^Đã tạo đơn/)]);
    expect(notificationsOf(s, 'u-x')).toHaveLength(0); // chưa thanh toán thì HTX chưa cần biết

    const id = s.orders[0].id;
    const paid = applyGatewayResult(s, s.transactions[0].id, 'success', 'R1', T0);
    s = step(s, paid.ok ? { ok: true, state: paid.value.state } : paid);
    expect(notificationsOf(s, 'u-x')[0].title).toMatch(/đã thanh toán, cần xác nhận/);
    expect(notificationsOf(s, 'u-y')).toHaveLength(0); // HTX khác không nhận

    s = step(s, coopConfirm(s, id, COOP_X, T0));
    s = step(s, coopHandover(s, id, COOP_X, T0));
    s = step(s, carrierSimulate(s, id, ADMIN_OPS, 'delivered_reported', '', T0));
    s = step(s, customerConfirmReceived(s, id, CUSTOMER, T0));
    const titles = notificationsOf(s, 'u-kh1').map((n) => n.title);
    expect(titles).toContain('Mời bạn đánh giá sản phẩm');
    expect(titles.some((t) => t.endsWith('Đang giao'))).toBe(true);

    const c = submitComplaint(s, CUSTOMER, { orderId: id, productIds: ['x-dry'], reason: 'damaged', description: 'Thông tin vấn đề hàng hóa', photos: ['data:'], requestRefund: false }, T0);
    s = step(s, c.ok ? { ok: true, state: c.value.state } : c);
    expect(notificationsOf(s, 'u-cskh')[0].title).toMatch(/^Khiếu nại mới/);
    expect(notificationsOf(s, 'u-x')[0].title).toMatch(/^Khiếu nại mới/);
  });

  it('kết quả duyệt đổi giá báo cho HTX; tồn thấp cảnh báo tối đa 1 lần/ngày', () => {
    let s = makeState();
    s = step(s, coopRequestPriceChange(s, 'x-dry', COOP_X, 800_000, '', T0));
    expect(notificationsOf(s, 'u-qa')[0].title).toBe('Yêu cầu đổi giá chờ duyệt');
    s = step(s, decideProductChange(s, s.productChanges[0].id, ADMIN_QA, false, 'Giá cao', T0));
    expect(notificationsOf(s, 'u-x')[0]).toMatchObject({ title: 'Yêu cầu đổi giá bị từ chối', body: 'x-dry: Giá cao' });

    // Tồn 10, ngưỡng 10 → cảnh báo lần đầu; đặt thêm trong ngày không cảnh báo lại; ngày hôm sau cảnh báo lại.
    const order = (st: DemoState, at: Date) => placeCheckout(st, placeInput([line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, at);
    s = step(s, order(s, T0));
    const lowCount = () => notificationsOf(s, 'u-x').filter((n) => n.title.startsWith('Tồn thấp')).length;
    expect(lowCount()).toBe(1);
    s = step(s, order(s, T0));
    expect(lowCount()).toBe(1);
    const tomorrow = addMs(T0, DAY_MS);
    s = step(s, order(s, tomorrow), tomorrow);
    expect(lowCount()).toBe(2);

    s = markNotificationsRead(s, 'u-x');
    expect(notificationsOf(s, 'u-x').every((n) => n.read)).toBe(true);
  });
});
