import { describe, expect, it } from 'vitest';
import { placeCheckout } from '../checkout';
import { addMs, DAY_MS } from '../state';
import { aggregateStats,periodStats } from '../stats';
import type { DemoState } from '../types';
import { CUSTOMER, keyX, keyY, line, makeState, placeInput, T0 } from './fixtures';

/** 2 đơn COD hôm nay (HTX X 2 sản phẩm, HTX Y 1), 1 đơn HTX X cách đây 10 ngày, 1 đơn đã huỷ hôm nay. */
function withOrders(): DemoState {
  let s = makeState();
  const place = (lines: Parameters<typeof placeInput>[0], key: string, at: Date) => {
    const r = placeCheckout(s, placeInput(lines, { [key]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, at);
    if (!r.ok) throw new Error(r.error);
    s = r.state;
  };
  place([line('x-dry', 2, 770_000)], keyX, T0);
  place([line('y-dry', 1, 100_000)], keyY, T0);
  place([line('x-dry', 1, 770_000)], keyX, addMs(T0, -10 * DAY_MS));
  place([line('y-dry', 1, 100_000)], keyY, T0);
  return { ...s, orders: s.orders.map((o, i) => (i === 0 ? { ...o, status: 'cancelled' as const } : o)) };
}

describe('Số liệu biểu đồ ở Tổng quan', () => {
  it('chỉ đếm chứng nhận đã xác minh còn hiệu lực cho sản phẩm đang bán',()=>{
    const state=makeState();state.products[0].certifications=[{id:'CN-1',label:'OCOP',issuer:'Đơn vị cấp',verified:true,validUntil:'2026-10-14'}];
    state.products[1].certifications=[{id:'CN-2',label:'OCOP',issuer:'Đơn vị cấp',verified:true,validUntil:'2026-10-13'}];
    expect(aggregateStats(state,T0).productsVerified).toBe(1);
    expect(aggregateStats(state,addMs(T0,DAY_MS)).productsVerified).toBe(0);
  });
  it('T28: 7 ngày: mỗi ngày một cột kể cả ngày trống; tiền hàng không tính đơn huỷ; theo HTX, trạng thái', () => {
    const p = periodStats(withOrders(), '7d', addMs(T0, 60_000));
    expect(p.daily).toHaveLength(7);
    expect(p.daily.at(-1)).toMatchObject({ label: '14/10', orders: 3, goods: 1_640_000 });
    expect(p.daily.slice(0, 6).every((d) => d.orders === 0)).toBe(true);
    expect(p.totals).toEqual({ orders: 3, goods: 1_640_000, tickets: 0 });
    expect(p.byCoop.map((b) => [b.label, b.orders, b.goods])).toEqual([
      ['HTX Y', 2, 100_000],
      ['HTX X', 1, 1_540_000],
    ]);
    expect(p.byStatus.find((x) => x.status === 'cancelled')?.orders).toBe(1);
    expect(p.byStatus.reduce((n, x) => n + x.orders, 0)).toBe(3);
  });

  it('30 ngày và Tất cả có cả đơn cũ; Tất cả bắt đầu từ ngày có đơn đầu tiên', () => {
    const s = withOrders();
    expect(periodStats(s, '30d', T0).daily).toHaveLength(30);
    expect(periodStats(s, '30d', T0).totals.orders).toBe(4);
    const all = periodStats(s, 'all', T0);
    expect(all.daily).toHaveLength(11);
    expect(all.daily[0]).toMatchObject({ label: '04/10', orders: 1 });
    expect(periodStats(makeState(), 'all', T0).totals.orders).toBe(0);
  });
});
