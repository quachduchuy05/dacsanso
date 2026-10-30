import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '../params';
import { allocateDiscount, checkExpress, priceOrder, totalCheckout } from '../pricing';

const P = DEFAULT_PARAMS;
const line = (unitPrice: number, quantity = 1) => ({ productId: 'p', name: 'SP', unit: 'gói', unitPrice, quantity });

describe('Tính tiền (BR-TIEN-01..04)', () => {
  it('T1: đơn mua sẵn 770.000, giảm 50.000, phí giao 28.000 → tổng 748.000, thu online 748.000, không cọc', () => {
    const r = priceOrder(
      { kind: 'ready', lines: [line(770_000)], discount: 50_000, shippingFee: 28_000, expressSurcharge: 0, giftBoxFee: 0, paymentMethod: 'online' },
      P,
    );
    expect(r.total).toBe(748_000);
    expect(r.payNowOnline).toBe(748_000);
    expect(r.deposit).toBe(0);
    expect(r.remaining).toBe(0);
  });

  it('T3: mã giảm 50.000 nhưng tiền hàng hợp lệ chỉ 30.000 → giảm 30.000, phí giao không bị giảm', () => {
    const r = priceOrder(
      { kind: 'ready', lines: [line(30_000)], discount: 50_000, shippingFee: 28_000, expressSurcharge: 0, giftBoxFee: 0, paymentMethod: 'online' },
      P,
    );
    expect(r.discount).toBe(30_000);
    expect(r.shippingFee).toBe(28_000);
    expect(r.total).toBe(28_000);
  });

  it('T4: đặt trước 170.000, phí giao 28.000 → cọc 51.000, còn lại 147.000', () => {
    const r = priceOrder(
      { kind: 'preorder', lines: [line(85_000, 2)], discount: 0, shippingFee: 28_000, expressSurcharge: 0, giftBoxFee: 0, paymentMethod: 'online' },
      P,
    );
    expect(r.total).toBe(198_000);
    expect(r.deposit).toBe(51_000);
    expect(r.remaining).toBe(147_000);
    expect(r.payNowOnline).toBe(51_000);
  });

  it('T5: đặt trước 145.000, giảm 20.000, hộp quà 30.000, phí giao 28.000 → tổng 183.000, cọc 47.000, còn lại 136.000', () => {
    const r = priceOrder(
      { kind: 'preorder', lines: [line(145_000)], discount: 20_000, shippingFee: 28_000, expressSurcharge: 0, giftBoxFee: 30_000, paymentMethod: 'online' },
      P,
    );
    expect(r.total).toBe(183_000);
    expect(r.deposit).toBe(47_000);
    expect(r.remaining).toBe(136_000);
  });

  it('T6: chia 60.000 cho đơn A 200.000 và đơn B 100.000 → A 40.000, B 20.000', () => {
    expect(allocateDiscount(60_000, [{ key: 'A', eligibleAmount: 200_000 }, { key: 'B', eligibleAmount: 100_000 }])).toEqual({
      A: 40_000,
      B: 20_000,
    });
  });

  it('chia giảm giá: phần lẻ dồn vào đơn lớn nhất, tổng không đổi', () => {
    const r = allocateDiscount(10_000, [{ key: 'A', eligibleAmount: 100_000 }, { key: 'B', eligibleAmount: 200_000 }]);
    expect(r.A + r.B).toBe(10_000);
    expect(r).toEqual({ A: 3_333, B: 6_667 });
  });

  it('nút đặt hàng thu đúng tổng phần online (L1): mua sẵn COD + đặt trước thì chỉ thu cọc', () => {
    const ready = priceOrder(
      { kind: 'ready', lines: [line(770_000)], discount: 0, shippingFee: 28_000, expressSurcharge: 0, giftBoxFee: 0, paymentMethod: 'cod' },
      P,
    );
    const pre = priceOrder(
      { kind: 'preorder', lines: [line(170_000)], discount: 0, shippingFee: 28_000, expressSurcharge: 0, giftBoxFee: 0, paymentMethod: 'online' },
      P,
    );
    const t = totalCheckout([ready, pre], ['cod', 'online']);
    expect(t.payNowOnline).toBe(51_000);
    expect(t.payOnDelivery).toBe(798_000);
    expect(t.grandTotal).toBe(798_000 + 198_000);
  });
});

describe('Hoả tốc (BR-DAT-05)', () => {
  it('T10: đơn đặt trước và đơn mua sẵn lúc 14:05 đều không có hoả tốc, kèm lý do', () => {
    const pre = checkExpress({ kind: 'preorder', allItemsExpressApproved: true, orderTime: new Date(2026, 9, 14, 9, 0), distanceKm: 3 }, P);
    expect(pre.available).toBe(false);
    expect(pre.reasons).toContain('Đơn đặt trước không có giao hoả tốc.');

    const late = checkExpress({ kind: 'ready', allItemsExpressApproved: true, orderTime: new Date(2026, 9, 14, 14, 5), distanceKm: 3 }, P);
    expect(late.available).toBe(false);
    expect(late.reasons[0]).toMatch(/giờ chốt/);
  });

  it('chưa chọn địa chỉ thì báo chưa chọn, không báo ngoài vùng', () => {
    const none = checkExpress({ kind: 'ready', allItemsExpressApproved: true, orderTime: new Date(2026, 9, 14, 10, 0), distanceKm: Number.POSITIVE_INFINITY }, P);
    expect(none.available).toBe(false);
    expect(none.reasons).toEqual(['Chưa chọn địa chỉ giao hàng.']);
  });

  it('đủ 4 điều kiện thì có hoả tốc với phụ phí theo bậc; quá 15 km thì không', () => {
    const okCase = checkExpress({ kind: 'ready', allItemsExpressApproved: true, orderTime: new Date(2026, 9, 14, 10, 0), distanceKm: 6.8 }, P);
    expect(okCase).toEqual({ available: true, surcharge: 30_000, reasons: [] });
    const far = checkExpress({ kind: 'ready', allItemsExpressApproved: true, orderTime: new Date(2026, 9, 14, 10, 0), distanceKm: 16 }, P);
    expect(far.available).toBe(false);
  });
});
