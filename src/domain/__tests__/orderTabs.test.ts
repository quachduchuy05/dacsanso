import { describe, expect, it } from 'vitest';
import { placeCheckout } from '../checkout';
import {
  filterOrders,
  isOrderFilterActive,
  itemsAwaitingReview,
  NO_ORDER_FILTER,
  ORDER_TABS,
  PAYMENT_FILTERS,
  ordersAwaitingReview,
  ordersInTab,
  refundSummary,
  reorderToCart,
  suggestedProducts,
  tabCounts,
} from '../orderTabs';
import { ORDER_STATUSES, type DemoState, type OrderStatus, type RefundRecord, type Review } from '../types';
import { CUSTOMER, keyX, keyXPre, keyY, line, makeState, placeInput, T0 } from './fixtures';

const D = '2026-10-24';

/** Đơn COD của khách 1: 2 x-dry; đơn đặt trước 1 x-pre; đơn COD 1 y-dry (đơn mới nằm đầu danh sách). */
function withOrders(): DemoState {
  let s = makeState();
  for (const [lines, opts] of [
    [[line('x-dry', 2, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } }],
    [[line('x-pre', 1, 85_000, D)], { [keyXPre(D)]: { shipping: 'standard', paymentMethod: 'online' } }],
    [[line('y-dry', 1, 100_000)], { [keyY]: { shipping: 'standard', paymentMethod: 'cod' } }],
  ] as const) {
    const r = placeCheckout(s, placeInput([...lines], opts as never), CUSTOMER, T0);
    if (!r.ok) throw new Error(r.error);
    s = r.state;
  }
  return s;
}
const setStatus = (s: DemoState, id: string, status: OrderStatus): DemoState => ({ ...s, orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)) });

describe('Tab "Đơn mua" của khách', () => {
  it('mỗi trạng thái đơn thuộc đúng một tab (trừ Tất cả); đếm theo tab', () => {
    for (const st of ORDER_STATUSES)
      expect(
        ORDER_TABS.filter((t) => t.statuses?.includes(st)).map((t) => t.key),
        st,
      ).toHaveLength(1);
    const orders = (['awaiting_payment', 'awaiting_confirmation', 'confirmed', 'preparing', 'shipping', 'delivered', 'returned', 'returning', 'cancelled'] as OrderStatus[]).map((status) => ({
      status,
    }));
    expect(tabCounts(orders)).toEqual({ all: 9, payment: 1, confirm: 1, harvest: 0, pickup: 2, shipping: 1, delivered: 1, returns: 2, cancelled: 1 });
    expect(ordersInTab(orders, 'pickup').map((o) => o.status)).toEqual(['confirmed', 'preparing']);
  });

  it('đơn Đã giao còn sản phẩm chưa đánh giá thì chờ đánh giá', () => {
    let s = withOrders();
    const xDry = s.orders.find((o) => o.items[0].productId === 'x-dry')!;
    expect(itemsAwaitingReview(s, xDry)).toEqual([]); // chưa giao
    s = setStatus(s, xDry.id, 'delivered');
    const delivered = s.orders.find((o) => o.id === xDry.id)!;
    expect(itemsAwaitingReview(s, delivered).map((i) => i.productId)).toEqual(['x-dry']);
    expect(ordersAwaitingReview(s, s.orders).map((o) => o.id)).toEqual([xDry.id]);
    const review: Review = { id: 'r1', orderId: xDry.id, productId: 'x-dry', customerId: 'cust-1', stars: 5, comment: '', photos: [], status: 'visible', createdAt: T0.toISOString() };
    s = { ...s, reviews: [review] };
    expect(ordersAwaitingReview(s, s.orders)).toEqual([]);
  });

  it('tiền hoàn của đơn: cộng các khoản, trạng thái theo khoản chậm nhất', () => {
    const s = withOrders();
    const id = s.orders[0].id;
    expect(refundSummary(s, id)).toBeNull();
    const refund = (amount: number, status: RefundRecord['status']): RefundRecord => ({
      id: `RF${amount}`,
      orderId: id,
      customerId: 'cust-1',
      amount,
      status,
      source: 'cancel',
      reason: '',
      destination: 'original_source',
      createdAt: T0.toISOString(),
    });
    expect(refundSummary({ ...s, refunds: [refund(50_000, 'refunded'), refund(30_000, 'refunding')] }, id)).toEqual({ amount: 80_000, status: 'refunding', label: 'Đang hoàn tiền' });
    expect(refundSummary({ ...s, refunds: [refund(50_000, 'refunded')] }, id)).toEqual({ amount: 50_000, status: 'refunded', label: 'Đã hoàn tiền' });
  });

  it('Mua lại: đưa sản phẩm vào giỏ (cả hàng đặt trước), bỏ qua sản phẩm không còn bán; chỉ khách của đơn', () => {
    let s = withOrders();
    const xDry = s.orders.find((o) => o.items[0].productId === 'x-dry')!;
    const xPre = s.orders.find((o) => o.items[0].productId === 'x-pre')!;
    const r = reorderToCart(s, CUSTOMER, xDry.id, T0);
    if (!r.ok) throw new Error(r.error);
    expect(r.value.added).toEqual(['x-dry']);
    expect(r.value.state.carts['cust-1']).toMatchObject([{ productId: 'x-dry', quantity: 2 }]);
    const pre = reorderToCart(r.value.state, CUSTOMER, xPre.id, T0);
    expect(pre.ok && pre.value.state.carts['cust-1'].map((l) => [l.productId, l.quantity, !!l.deliveryDate])).toEqual([
      ['x-dry', 2, false],
      ['x-pre', 1, true],
    ]);
    expect(reorderToCart(s, { kind: 'customer', id: 'cust-2' }, xDry.id, T0).ok).toBe(false);
    s = { ...s, products: s.products.map((p) => (p.id === 'x-dry' ? { ...p, status: 'hidden' as const } : p)) };
    expect(reorderToCart(s, CUSTOMER, xDry.id, T0)).toEqual({ ok: false, error: 'Không thêm được sản phẩm nào vào giỏ: x-dry không còn mở bán.' });
  });

  it('gợi ý "Có thể bạn cũng thích": sản phẩm đang bán khách chưa mua', () => {
    expect(suggestedProducts(makeState(), 'cust-1', 10).map((p) => p.id)).toEqual(['x-dry', 'x-pre', 'y-dry']);
    expect(suggestedProducts(withOrders(), 'cust-1', 10).map((p) => p.id)).toEqual(['x-dry', 'x-pre', 'y-dry']); // đã mua hết thì gợi ý lại tất cả
    const one = (() => {
      const r = placeCheckout(makeState(), placeInput([line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, T0);
      if (!r.ok) throw new Error(r.error);
      return r.state;
    })();
    expect(suggestedProducts(one, 'cust-1', 1).map((p) => p.id)).toEqual(['x-pre']);
  });
});

describe('Lọc đơn của HTX', () => {
  const orders = [
    { id: 'DH-A1', kind: 'ready', paymentStatus: 'paid', items: [{ name: 'Mứt mận tam hoa' }] },
    { id: 'DH-B2', kind: 'preorder', paymentStatus: 'deposit_paid', items: [{ name: 'Mận tam hoa tươi' }] },
    { id: 'DH-C3', kind: 'ready', paymentStatus: 'refunded', items: [{ name: 'Gạo Séng Cù' }] },
    { id: 'DH-D4', kind: 'ready', paymentStatus: 'cod_unpaid', items: [{ name: 'Phở hồng' }] },
    { id: 'DH-E5', kind: 'preorder', paymentStatus: 'refund_pending', items: [{ name: 'Cốm Tú Lệ' }] },
  ] as never as Parameters<typeof filterOrders>[0];
  const ids = (f: Partial<typeof NO_ORDER_FILTER>) => filterOrders(orders, { ...NO_ORDER_FILTER, ...f }).map((o) => o.id);

  it('mỗi tình trạng thanh toán thuộc tối đa một nhóm lọc', () => {
    const all = PAYMENT_FILTERS.flatMap((p) => p.statuses ?? []);
    expect(new Set(all).size).toBe(all.length);
  });

  it('lọc theo loại đơn, thanh toán, tìm không dấu; kết hợp được', () => {
    expect(ids({})).toHaveLength(5);
    expect(isOrderFilterActive(NO_ORDER_FILTER)).toBe(false);
    expect(ids({ kind: 'preorder' })).toEqual(['DH-B2', 'DH-E5']);
    expect(ids({ payment: 'paid' })).toEqual(['DH-A1']);
    expect(ids({ payment: 'refunded' })).toEqual(['DH-C3']);
    expect(ids({ payment: 'refunding' })).toEqual(['DH-E5']);
    expect(ids({ payment: 'unpaid' })).toEqual(['DH-D4']);
    expect(ids({ query: 'man tam hoa' })).toEqual(['DH-A1', 'DH-B2']);
    expect(ids({ query: 'dh-c3' })).toEqual(['DH-C3']);
    expect(ids({ kind: 'preorder', query: 'mận' })).toEqual(['DH-B2']);
    expect(isOrderFilterActive({ ...NO_ORDER_FILTER, query: ' x ' })).toBe(true);
  });
});
