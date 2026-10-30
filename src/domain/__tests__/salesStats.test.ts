import { describe, expect, it } from 'vitest';
import { placeCheckout } from '../checkout';
import { applyGatewayResult } from '../payment';
import { coopBestSellers } from '../salesStats';
import { addMs, DAY_MS } from '../state';
import type { DemoState } from '../types';
import { CUSTOMER, keyX, keyXPre, keyY, line, makeState, placeInput, T0 } from './fixtures';

const D = '2026-10-24';

function place(s: DemoState, lines: Parameters<typeof placeInput>[0], options: Parameters<typeof placeInput>[1], at: Date, pay = false): DemoState {
  const r = placeCheckout(s, placeInput(lines, options), CUSTOMER, at);
  if (!r.ok) throw new Error(r.error);
  if (!pay) return r.state;
  const paid = applyGatewayResult(r.state, r.transaction!.id, 'success', `R-${at.getTime()}`, at);
  if (!paid.ok) throw new Error(paid.error);
  return paid.value.state;
}

describe('Sản phẩm bán chạy của HTX', () => {
  it('chỉ tính đơn đã đặt xong của đúng HTX, trong khoảng thời gian; xếp theo số lượng hoặc tiền hàng', () => {
    let s = makeState();
    // Đơn cũ 40 ngày trước: 2 x-dry (COD).
    s = place(s, [line('x-dry', 2, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } }, addMs(T0, -40 * DAY_MS));
    // Trong 30 ngày: 1 x-dry (COD) và 3 x-pre đã cọc.
    s = place(s, [line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } }, T0);
    s = place(s, [line('x-pre', 3, 85_000, D)], { [keyXPre(D)]: { shipping: 'standard', paymentMethod: 'online' } }, T0, true);
    // Không tính: đơn đặt trước chưa trả cọc, đơn của HTX khác, đơn đã huỷ.
    s = place(s, [line('x-pre', 5, 85_000, D)], { [keyXPre(D)]: { shipping: 'standard', paymentMethod: 'online' } }, T0);
    s = place(s, [line('y-dry', 9, 100_000)], { [keyY]: { shipping: 'standard', paymentMethod: 'cod' } }, T0);
    s = place(s, [line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } }, T0);
    const cancelledId = s.orders[0].id; // đơn mới nằm đầu danh sách
    s = { ...s, orders: s.orders.map((o) => (o.id === cancelledId ? { ...o, status: 'cancelled' as const } : o)) };

    const now = addMs(T0, 60_000);
    const byQty = coopBestSellers(s, 'coop-x', '30d', 'quantity', now);
    expect(byQty.rows.map((r) => [r.productId, r.quantity, r.revenue, r.orders])).toEqual([
      ['x-pre', 3, 255_000, 1],
      ['x-dry', 1, 770_000, 1],
    ]);
    expect(byQty.totals).toEqual({ revenue: 1_025_000, orders: 2, products: 2 });
    expect(byQty.unsold).toBe(0);

    expect(coopBestSellers(s, 'coop-x', '30d', 'revenue', now).rows.map((r) => r.productId)).toEqual(['x-dry', 'x-pre']);
    expect(coopBestSellers(s, 'coop-x', 'all', 'quantity', now).rows.map((r) => [r.productId, r.quantity])).toEqual([
      ['x-dry', 3],
      ['x-pre', 3],
    ]);
    // 7 ngày tính từ đồng hồ demo: đơn ở T0 vẫn trong khoảng, đơn tương lai so với đồng hồ thì không.
    expect(coopBestSellers(s, 'coop-x', '7d', 'quantity', addMs(T0, -DAY_MS)).rows).toEqual([]);
  });

  it('chưa có đơn: không có dòng nào, đếm sản phẩm đang bán chưa có đơn', () => {
    const r = coopBestSellers(makeState(), 'coop-x', 'all', 'quantity', T0);
    expect(r).toEqual({ rows: [], totals: { revenue: 0, orders: 0, products: 0 }, unsold: 2 });
  });
});
