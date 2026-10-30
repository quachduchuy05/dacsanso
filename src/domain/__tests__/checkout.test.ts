import { describe, expect, it } from 'vitest';
import { addToCart } from '../cart';
import { placeCheckout, planCheckout } from '../checkout';
import { runScheduledJobs } from '../jobs';
import { customerCancel } from '../orders';
import { applyGatewayResult } from '../payment';
import { addMs, MINUTE_MS, remainingFor } from '../state';
import { COOP_X, CUSTOMER, keyX, keyXPre, keyY, line, makeState, placeInput, T0 } from './fixtures';

const D = '2026-10-24';

describe('Đặt hàng (mục 5.1–5.4)', () => {
  it('L1: đơn mua sẵn 770.000 có mã 50.000 → nút đặt hàng thu đúng 748.000, không có cọc', () => {
    const s = makeState();
    const plan = planCheckout(s, { customerId: 'cust-1', lines: [line('x-dry', 1, 770_000)], addressId: 'addr-1', note: '', voucherId: 'v50', groupOptions: { [keyX]: { shipping: 'standard', paymentMethod: 'online' } } }, T0);
    expect(plan.errors).toEqual([]);
    expect(plan.orders[0].pricing.total).toBe(748_000);
    expect(plan.orders[0].pricing.deposit).toBe(0);
    expect(plan.totals.payNowOnline).toBe(748_000);
  });

  it('T7: HTX X mua sẵn + HTX Y mua sẵn + HTX X đặt trước → 3 đơn, 3 khoản phí giao, chung 1 giao dịch online', () => {
    const s = makeState();
    const r = placeCheckout(
      s,
      placeInput([line('x-dry', 1, 770_000), line('y-dry', 1, 100_000), line('x-pre', 2, 85_000, D)], {
        [keyX]: { shipping: 'standard', paymentMethod: 'online' },
        [keyY]: { shipping: 'standard', paymentMethod: 'online' },
        [keyXPre(D)]: { shipping: 'standard', paymentMethod: 'online' },
      }),
      CUSTOMER,
      T0,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const orders = r.state.orders;
    expect(orders).toHaveLength(3);
    expect(orders.map((o) => o.pricing.shippingFee)).toEqual([28_000, 28_000, 28_000]);
    expect(r.state.transactions).toHaveLength(1);
    expect(r.transaction!.orderIds).toHaveLength(3);
    // Đơn đặt trước chỉ thu cọc trong giao dịch.
    const pre = orders.find((o) => o.kind === 'preorder')!;
    expect(r.transaction!.amounts[pre.id]).toBe(51_000);
    expect(orders.every((o) => o.status === 'awaiting_payment')).toBe(true);
    expect(orders.every((o) => /^DH-20261014-[A-Z2-9]{6}$/.test(o.id))).toBe(true);
  });

  it('T8: tồn 10, đơn Chờ thanh toán giữ 3 → khả dụng 7; tua 15 phút → đơn Đã huỷ, khả dụng 10, lượt mã được nhả', () => {
    let s = makeState();
    s = { ...s, products: s.products.map((p) => (p.id === 'x-dry' ? { ...p, price: 200_000 } : p)) };
    const r = placeCheckout(s, placeInput([line('x-dry', 3, 200_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'online' } }, { voucherId: 'v50' }), CUSTOMER, T0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const product = r.state.products.find((p) => p.id === 'x-dry')!;
    expect(remainingFor(r.state, product)).toBe(7);
    expect(r.state.voucherUsages[0].status).toBe('held');

    const { state: after } = runScheduledJobs(r.state, addMs(T0, 15 * MINUTE_MS));
    expect(after.orders[0].status).toBe('cancelled');
    expect(remainingFor(after, product)).toBe(10);
    expect(after.voucherUsages[0].status).toBe('released');
    expect(after.transactions[0].status).toBe('expired');
  });

  it('T9 (qua đặt hàng): còn 15 suất, đặt 21 bị chặn; đặt 15 được và suất còn 0', () => {
    const s = makeState();
    const opts = { [keyXPre(D)]: { shipping: 'standard' as const, paymentMethod: 'online' as const } };
    const bad = placeCheckout(s, placeInput([line('x-pre', 21, 85_000, D)], opts), CUSTOMER, T0);
    expect(bad.ok).toBe(false);
    const good = placeCheckout(s, placeInput([line('x-pre', 15, 85_000, D)], opts), CUSTOMER, T0);
    expect(good.ok).toBe(true);
    if (good.ok) expect(remainingFor(good.state, good.state.products.find((p) => p.id === 'x-pre')!)).toBe(0);
  });

  it('T11: giao dịch gồm đơn online + cọc, cùng lần có đơn COD; thanh toán thất bại → hai đơn online Đã huỷ, hàng về giỏ, đơn COD vẫn Chờ xác nhận', () => {
    const s = makeState();
    const r = placeCheckout(
      s,
      placeInput([line('x-dry', 1, 770_000), line('x-pre', 2, 85_000, D), line('y-dry', 1, 100_000)], {
        [keyX]: { shipping: 'standard', paymentMethod: 'online' },
        [keyXPre(D)]: { shipping: 'standard', paymentMethod: 'online' },
        [keyY]: { shipping: 'standard', paymentMethod: 'cod' },
      }),
      CUSTOMER,
      T0,
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.transaction!.orderIds).toHaveLength(2);
    const failed = applyGatewayResult(r.state, r.transaction!.id, 'failed', 'REF-1', addMs(T0, MINUTE_MS));
    if (!failed.ok) throw new Error(failed.error);
    const st = failed.value.state;
    const byCoop = (coop: string, kind: string) => st.orders.find((o) => o.coopId === coop && o.kind === kind)!;
    expect(byCoop('coop-x', 'ready').status).toBe('cancelled');
    expect(byCoop('coop-x', 'preorder').status).toBe('cancelled');
    expect(byCoop('coop-y', 'ready').status).toBe('awaiting_confirmation');
    expect(st.carts['cust-1'].map((l) => l.productId).sort()).toEqual(['x-dry', 'x-pre']);
  });

  it('BR-DAT-07: bấm Đặt hàng lặp với cùng khoá chỉ tạo một lần đặt; BR-DAT-01: HTX không đặt được', () => {
    const s = makeState();
    const input = placeInput([line('y-dry', 1, 100_000)], { [keyY]: { shipping: 'standard', paymentMethod: 'cod' } });
    const first = placeCheckout(s, input, CUSTOMER, T0);
    if (!first.ok) throw new Error(first.error);
    const again = placeCheckout(first.state, input, CUSTOMER, T0);
    expect(again.ok && again.reused).toBe(true);
    expect(again.ok && again.state.orders).toHaveLength(1);
    expect(placeCheckout(s, input, COOP_X, T0)).toMatchObject({ ok: false, error: 'Chỉ tài khoản Khách hàng mới được đặt hàng.' });
  });

  it('BR-DAT-03: giá tăng thì phải xác nhận lại; giá giảm thì áp giá mới', () => {
    const s = makeState();
    const up = placeCheckout(s, placeInput([line('y-dry', 1, 90_000)], { [keyY]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, T0);
    expect(up.ok).toBe(false);
    expect(!up.ok && up.notices?.[0].type).toBe('price_up');
    const confirmed = placeCheckout(s, placeInput([line('y-dry', 1, 90_000)], { [keyY]: { shipping: 'standard', paymentMethod: 'cod' } }, { confirmedPriceIncrease: true }), CUSTOMER, T0);
    expect(confirmed.ok).toBe(true);
    const down = placeCheckout(s, placeInput([line('y-dry', 1, 120_000)], { [keyY]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, T0);
    expect(down.ok && down.state.orders[0].items[0].unitPrice).toBe(100_000);
  });

  it('BR-DAT-08: ngày giao phải trong khoảng HTX khai và không sớm hơn hôm nay + PAR-08', () => {
    const s = makeState();
    const opts = (d: string) => ({ [keyXPre(d)]: { shipping: 'standard' as const, paymentMethod: 'online' as const } });
    expect(placeCheckout(s, placeInput([line('x-pre', 1, 85_000, '2026-11-05')], opts('2026-11-05')), CUSTOMER, T0).ok).toBe(false);
    // Hôm nay 14/10, PAR-08 = 3 → sớm nhất 17/10, nhưng HTX khai từ 20/10.
    expect(placeCheckout(s, placeInput([line('x-pre', 1, 85_000, '2026-10-19')], opts('2026-10-19')), CUSTOMER, T0).ok).toBe(false);
    expect(placeCheckout(s, placeInput([line('x-pre', 1, 85_000, '2026-10-20')], opts('2026-10-20')), CUSTOMER, T0).ok).toBe(true);
  });

  it('COD bị ẩn khi tổng đơn vượt PAR-23 hoặc là quà gửi người khác; hoả tốc bị chặn sau 14:00 kèm lý do', () => {
    let s = makeState();
    s = { ...s, products: s.products.map((p) => (p.id === 'x-dry' ? { ...p, stockOnHand: 10 } : p)) };
    const big = planCheckout(s, { customerId: 'cust-1', lines: [line('x-dry', 3, 770_000)], addressId: 'addr-1', note: '', groupOptions: { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } } }, T0);
    expect(big.orders[0].codAllowed).toBe(false);
    expect(big.orders[0].paymentMethod).toBe('online');

    const gift = planCheckout(
      s,
      {
        customerId: 'cust-1',
        lines: [line('y-dry', 1, 100_000)],
        addressId: 'addr-1',
        note: '',
        groupOptions: { [keyY]: { shipping: 'standard', paymentMethod: 'cod', gift: { boxTypeId: 'box', message: 'Chúc mừng', sendToOther: true, recipient: { name: 'Người nhận', phone: '0900000009', wardId: 'w-near', street: '9 đường mẫu' } } } },
      },
      T0,
    );
    expect(gift.errors).toEqual([]);
    expect(gift.orders[0].codAllowed).toBe(false);
    expect(gift.orders[0].pricing.total).toBe(100_000 + 28_000 + 30_000);
    expect(gift.orders[0].address.receiverName).toBe('Người nhận');

    const late = planCheckout(s, { customerId: 'cust-1', lines: [line('x-dry', 1, 770_000)], addressId: 'addr-1', note: '', groupOptions: { [keyX]: { shipping: 'express', paymentMethod: 'online' } } }, new Date(2026, 9, 14, 14, 5));
    expect(late.orders[0].express.available).toBe(false);
    expect(late.orders[0].shipping).toBe('standard');
  });

  it('lời nhắn hộp quà không chứa link hay số điện thoại', () => {
    const s = makeState();
    const plan = planCheckout(s, { customerId: 'cust-1', lines: [line('y-dry', 1, 100_000)], addressId: 'addr-1', note: '', groupOptions: { [keyY]: { shipping: 'standard', paymentMethod: 'online', gift: { boxTypeId: 'box', message: 'Gọi 0912345678 nhé', sendToOther: false } } } }, T0);
    expect(plan.errors[0]).toMatch(/số điện thoại/);
  });

  it('khách huỷ đơn Chờ thanh toán thì huỷ cả giao dịch; thêm vào giỏ không vượt số còn lại', () => {
    const s = makeState();
    const r = placeCheckout(s, placeInput([line('y-dry', 1, 100_000)], { [keyY]: { shipping: 'standard', paymentMethod: 'online' } }), CUSTOMER, T0);
    if (!r.ok) throw new Error(r.error);
    const c = customerCancel(r.state, r.state.orders[0].id, CUSTOMER, 'Đổi ý', T0);
    expect(c.ok && c.value.orders[0].status).toBe('cancelled');
    expect(c.ok && c.value.transactions[0].status).toBe('cancelled');
    expect(addToCart(s, 'cust-1', 'y-dry', 11, T0).ok).toBe(false);
  });
});

describe('Đặt một phần giỏ hàng', () => {
  it('chỉ các sản phẩm khách chọn được đặt (chung một giao dịch); sản phẩm không chọn ở lại giỏ', () => {
    let s = makeState();
    for (const [id, qty] of [['x-dry', 1], ['y-dry', 2], ['x-pre', 1]] as const) {
      const r = addToCart(s, 'cust-1', id, qty, T0);
      expect(r.ok, id).toBe(true);
      if (r.ok) s = r.value;
    }
    const cart = s.carts['cust-1'];
    const chosen = cart.filter((l) => l.productId === 'x-dry' || l.productId === 'y-dry');
    const r = placeCheckout(
      s,
      placeInput(chosen, { [keyX]: { shipping: 'standard', paymentMethod: 'online' }, [keyY]: { shipping: 'standard', paymentMethod: 'online' } }, { fromCart: true }),
      CUSTOMER,
      T0,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 2 HTX → 2 đơn, trả online gộp một giao dịch.
    expect(r.checkout.orderIds).toHaveLength(2);
    expect(r.transaction?.orderIds).toHaveLength(2);
    expect(r.state.carts['cust-1'].map((l) => l.productId)).toEqual(['x-pre']);
  });
});

