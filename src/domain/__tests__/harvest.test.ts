import { describe, expect, it } from 'vitest';
import { placeCheckout } from '../checkout';
import { allocateHarvest, coopConfirmHarvest, harvestsOf, latestHarvest, ordersAwaitingHarvest, type HarvestInput } from '../harvest';
import { deriveNotifications } from '../notifications';
import { orderJourney } from '../orderContact';
import { coopConfirm } from '../orders';
import { applyGatewayResult } from '../payment';
import { addMs, MINUTE_MS } from '../state';
import type { CartLine, DemoState, Result } from '../types';
import { ADMIN_OPS, COOP_X, COOP_Y, CUSTOMER, keyXPre, line, makeState, placeInput, T0 } from './fixtures';

const must = <T,>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const D = '2026-10-24';
const TODAY = '2026-10-14';

/** Đặt trước (đã cọc online) rồi HTX xác nhận; trả về state và mã đơn. */
function preorder(s: DemoState, lines: CartLine[], at: Date, remaining: 'online' | 'cod' = 'online'): { s: DemoState; id: string } {
  const placed = placeCheckout(s, placeInput(lines, { [keyXPre(D)]: { shipping: 'standard', paymentMethod: remaining } }), CUSTOMER, at);
  if (!placed.ok) throw new Error(placed.error);
  let next = must(applyGatewayResult(placed.state, placed.transaction!.id, 'success', `R-${at.getTime()}`, at)).state;
  const id = next.orders[0].id;
  next = must(coopConfirm(next, id, COOP_X, at));
  return { s: next, id };
}

/** Ba đơn x-pre đặt lần lượt: 2, 3 và 1 gói. */
function threeOrders() {
  let s = makeState();
  const a = preorder(s, [line('x-pre', 2, 85_000, D)], T0);
  const b = preorder(a.s, [line('x-pre', 3, 85_000, D)], addMs(T0, MINUTE_MS), 'cod');
  const c = preorder(b.s, [line('x-pre', 1, 85_000, D)], addMs(T0, 2 * MINUTE_MS));
  s = c.s;
  return { s, ids: [a.id, b.id, c.id] as const };
}

const batch = (q: number, extra: Partial<HarvestInput> = {}): HarvestInput => ({ productId: 'x-pre', harvestedOn: TODAY, quantity: q, note: '', photos: [], reportReady: false, ...extra });
const at = addMs(T0, 10 * MINUTE_MS);

describe('HTX xác nhận thu hoạch theo cả lô', () => {
  it('chia hàng theo thứ tự đặt; dừng ở đơn đầu tiên không đủ hàng, không chia cho đơn đặt sau trước', () => {
    const { s, ids } = threeOrders();
    expect(ordersAwaitingHarvest(s, 'x-pre').map((o) => o.id)).toEqual(ids);

    // 4 gói: đủ cho đơn 1 (2 gói); đơn 2 cần 3 gói thì không đủ → dừng, đơn 3 (1 gói) cũng chưa được chia.
    const first = must(coopConfirmHarvest(s, COOP_X, batch(4, { note: '  Hái sáng sớm  ', photos: ['data:a', 'data:b'] }), at));
    expect(first.covered).toEqual([ids[0]]);
    expect(first.uncovered).toEqual([ids[1], ids[2]]);
    expect(first.ready).toEqual([]);
    expect(first.harvest).toMatchObject({ coopId: 'coop-x', productId: 'x-pre', harvestedOn: TODAY, quantity: 4, note: 'Hái sáng sớm', photos: ['data:a', 'data:b'], orderIds: [ids[0]], confirmedBy: 'HTX X' });
    const o1 = first.state.orders.find((o) => o.id === ids[0])!;
    expect(o1.harvest).toEqual({ 'x-pre': first.harvest.id });
    expect(o1.status).toBe('awaiting_harvest'); // chưa báo sẵn sàng
    expect(first.state.auditLogs[0]).toMatchObject({ action: 'Xác nhận thu hoạch', target: 'x-pre' });

    // Lô sau 4 gói: đủ cho đơn 2 và 3.
    const second = must(coopConfirmHarvest(first.state, COOP_X, batch(4), addMs(at, MINUTE_MS)));
    expect(second.covered).toEqual([ids[1], ids[2]]);
    expect(second.uncovered).toEqual([]);
    expect(harvestsOf(second.state)).toHaveLength(2);
    expect(latestHarvest(second.state, 'x-pre')?.id).toBe(second.harvest.id);
    expect(ordersAwaitingHarvest(second.state, 'x-pre')).toEqual([]);
  });

  it('báo sẵn sàng luôn: phần còn lại trả online thì mở hạn trả, trả khi nhận hàng thì sang Đang chuẩn bị', () => {
    const { s, ids } = threeOrders();
    const r = must(coopConfirmHarvest(s, COOP_X, batch(6, { reportReady: true }), at));
    expect(r.ready).toEqual([...ids]);
    const status = (id: string) => r.state.orders.find((o) => o.id === id)!;
    expect(status(ids[0])).toMatchObject({ status: 'awaiting_harvest', readyReportedAt: at.toISOString() });
    expect(status(ids[0]).remainingDueAt).toBeDefined();
    expect(status(ids[1])).toMatchObject({ status: 'preparing', readyReportedAt: at.toISOString() });
  });

  it('chặn: không phải HTX của sản phẩm, hàng mua sẵn, ngày sau hôm nay / sai ngày, sản lượng sai hoặc chưa đủ cho đơn sớm nhất', () => {
    const { s } = threeOrders();
    expect(coopConfirmHarvest(s, COOP_Y, batch(4), at)).toEqual({ ok: false, error: 'HTX chỉ được xác nhận thu hoạch sản phẩm của HTX mình.' });
    expect(coopConfirmHarvest(s, ADMIN_OPS, batch(4), at)).toEqual({ ok: false, error: 'Chỉ HTX được xác nhận thu hoạch.' });
    expect(coopConfirmHarvest(s, COOP_X, batch(4, { productId: 'x-dry' }), at)).toEqual({ ok: false, error: 'Chỉ xác nhận thu hoạch cho hàng đặt trước.' });
    expect(coopConfirmHarvest(s, COOP_X, batch(4, { harvestedOn: '2026-10-15' }), at)).toEqual({ ok: false, error: 'Ngày thu hoạch không được sau hôm nay.' });
    expect(coopConfirmHarvest(s, COOP_X, batch(4, { harvestedOn: '2026-02-31' }), at)).toEqual({ ok: false, error: 'Chọn ngày thu hoạch.' });
    expect(coopConfirmHarvest(s, COOP_X, batch(4, { harvestedOn: '' }), at).ok).toBe(false);
    expect(coopConfirmHarvest(s, COOP_X, batch(0), at)).toEqual({ ok: false, error: 'Nhập sản lượng thu hoạch (số nguyên, ít nhất 1).' });
    expect(coopConfirmHarvest(s, COOP_X, batch(2.5), at).ok).toBe(false);
    expect(coopConfirmHarvest(s, COOP_X, batch(1), at)).toEqual({ ok: false, error: 'Sản lượng chưa đủ cho đơn đặt sớm nhất (cần 2 gói).' });
    expect(coopConfirmHarvest(s, COOP_X, batch(4, { note: 'a'.repeat(301) }), at).ok).toBe(false);
    expect(coopConfirmHarvest(s, COOP_X, batch(4, { photos: ['1', '2', '3'] }), at)).toEqual({ ok: false, error: 'Tối đa 2 ảnh.' });
    // Ngày hôm trước theo đồng hồ demo thì được.
    expect(coopConfirmHarvest(s, COOP_X, batch(4, { harvestedOn: '2026-10-13' }), at).ok).toBe(true);
    // Không còn đơn chờ.
    expect(coopConfirmHarvest(makeState(), COOP_X, batch(4), at)).toEqual({ ok: false, error: 'Không có đơn nào đang chờ thu hoạch sản phẩm này.' });
  });

  it('allocateHarvest: tổng cần, đã chia', () => {
    const { s } = threeOrders();
    const waiting = ordersAwaitingHarvest(s, 'x-pre');
    expect(allocateHarvest(waiting, 'x-pre', 5)).toMatchObject({ used: 5, needed: 6 });
    expect(allocateHarvest(waiting, 'x-pre', 100).covered).toHaveLength(3);
  });
});

describe('HTX xác nhận thu hoạch cho từng đơn', () => {
  it('xác nhận đúng đơn đã chọn (không theo thứ tự), sản lượng là số lượng của đơn; không xác nhận lại được', () => {
    const { s, ids } = threeOrders();
    const r = must(coopConfirmHarvest(s, COOP_X, { productId: 'x-pre', orderId: ids[2], harvestedOn: TODAY, note: '', photos: [], reportReady: true }, at));
    expect(r.covered).toEqual([ids[2]]);
    expect(r.harvest.quantity).toBe(1);
    expect(r.ready).toEqual([ids[2]]);
    expect(coopConfirmHarvest(r.state, COOP_X, { productId: 'x-pre', orderId: ids[2], harvestedOn: TODAY, note: '', photos: [], reportReady: true }, at)).toEqual({
      ok: false,
      error: 'Đơn đã được xác nhận thu hoạch sản phẩm này.',
    });
    // Đơn chưa xác nhận (chưa sang Chờ thu hoạch) thì chưa xác nhận thu hoạch được.
    const placed = placeCheckout(makeState(), placeInput([line('x-pre', 1, 85_000, D)], { [keyXPre(D)]: { shipping: 'standard', paymentMethod: 'online' } }), CUSTOMER, T0);
    if (!placed.ok) throw new Error(placed.error);
    const paid = must(applyGatewayResult(placed.state, placed.transaction!.id, 'success', 'R', T0)).state;
    expect(coopConfirmHarvest(paid, COOP_X, { productId: 'x-pre', orderId: paid.orders[0].id, harvestedOn: TODAY, note: '', photos: [], reportReady: false }, at).ok).toBe(false);
  });

  it('đơn có hai sản phẩm đặt trước: chỉ báo sẵn sàng khi thu hoạch đủ cả hai; hành trình ghi phần còn chờ', () => {
    let s = makeState();
    s = { ...s, products: [...s.products, { ...s.products.find((p) => p.id === 'x-pre')!, id: 'x-pre2', name: 'x-pre2' }] };
    const { s: s1, id } = preorder(s, [line('x-pre', 1, 85_000, D), line('x-pre2', 2, 85_000, D)], T0);
    const one = must(coopConfirmHarvest(s1, COOP_X, { productId: 'x-pre', orderId: id, harvestedOn: TODAY, note: '', photos: [], reportReady: true }, at));
    expect(one.ready).toEqual([]);
    const step = (st: DemoState) => orderJourney(st, st.orders[0]).steps.find((x) => x.key === 'harvest');
    expect(step(one.state)).toMatchObject({ state: 'current', detail: 'x-pre: Thu hoạch ngày 14/10/2026. Còn 1 sản phẩm chờ thu hoạch, giao dự kiến ngày 24/10/2026' });
    const two = must(coopConfirmHarvest(one.state, COOP_X, { productId: 'x-pre2', harvestedOn: '2026-10-13', quantity: 2, note: '', photos: [], reportReady: true }, addMs(at, MINUTE_MS)));
    expect(two.ready).toEqual([id]);
    expect(step(two.state)).toMatchObject({ state: 'done', detail: 'x-pre: Thu hoạch ngày 14/10/2026. x-pre2: Thu hoạch ngày 13/10/2026' });
  });
});

describe('Thông báo và dữ liệu cũ', () => {
  it('thu hoạch xong mà chưa báo sẵn sàng: khách có thông báo; báo sẵn sàng luôn thì chỉ có thông báo sẵn sàng', () => {
    const { s, ids } = threeOrders();
    const r = must(coopConfirmHarvest(s, COOP_X, batch(2), at));
    // Chỉ xét thông báo cho khách và HTX X về đơn (fixture có tồn thấp ở hàng mua sẵn, không liên quan).
    const ofOrders = (st: DemoState) => deriveNotifications(s, st, at).notifications.filter((n) => n.link?.type === 'order');
    const titles = ofOrders(r.state).map((n) => `${n.userId}|${n.title}`);
    expect(titles).toEqual([`u-kh1|HTX X đã thu hoạch hàng đơn ${ids[0]}`]);

    const ready = must(coopConfirmHarvest(s, COOP_X, batch(2, { reportReady: true }), at));
    const readyTitles = ofOrders(ready.state).map((n) => n.title);
    expect(readyTitles).toEqual([`Hàng đơn ${ids[0]} đã sẵn sàng`]);
  });

  it('dữ liệu đã lưu từ bản trước (chưa có phần thu hoạch) vẫn đọc và xác nhận được', () => {
    const { s } = threeOrders();
    const old = { ...s, harvests: undefined };
    expect(harvestsOf(old)).toEqual([]);
    expect(must(coopConfirmHarvest(old, COOP_X, batch(2), at)).state.harvests).toHaveLength(1);
  });
});
