import { describe, expect, it } from 'vitest';
import { addToCart } from '../cart';
import { suggestedProducts } from '../orderTabs';
import { coopRequestContentChange, decideProductChange } from '../productChanges';
import { coopAddVariant, familyKey, familyOf, groupFamilies, listedFamilyOf, MAX_VARIANTS, priceRange } from '../variants';
import type { DemoState } from '../types';
import { ADMIN_QA, COOP_X, COOP_Y, makeState, T0 } from './fixtures';

function withVariant(s = makeState(), unit = 'gói lớn', price = 1_200_000, quantity = 5): { state: DemoState; id: string } {
  const r = coopAddVariant(s, COOP_X, 'x-dry', { unit, price, quantity }, T0);
  if (!r.ok) throw new Error(r.error);
  return { state: r.value.state, id: r.value.product.id };
}

describe('Quy cách bán hàng', () => {
  it('T24: HTX thêm quy cách: chờ duyệt, cùng nội dung với sản phẩm gốc, có yêu cầu duyệt', () => {
    const { state, id } = withVariant();
    const v = state.products.find((p) => p.id === id)!;
    expect(v).toMatchObject({ variantOf: 'x-dry', coopId: 'coop-x', name: 'x-dry', unit: 'gói lớn', price: 1_200_000, stockOnHand: 5, status: 'pending', kind: 'ready' });
    expect(state.productChanges[0]).toMatchObject({ productId: id, type: 'new_product', status: 'pending' });
    // Chưa duyệt: khách chỉ thấy quy cách gốc.
    expect(listedFamilyOf(state, v).map((p) => p.id)).toEqual(['x-dry']);
    const approved = decideProductChange(state, state.productChanges[0].id, ADMIN_QA, true, '', T0);
    if (!approved.ok) throw new Error(approved.error);
    expect(listedFamilyOf(approved.value, v).map((p) => p.unit)).toEqual(['gói', 'gói lớn']);
    // Thêm từ một quy cách thêm thì vẫn nối về sản phẩm gốc.
    const again = coopAddVariant(approved.value, COOP_X, id, { unit: 'thùng', price: 3_000_000, quantity: 1 }, T0);
    expect(again.ok && again.value.product.variantOf).toBe('x-dry');
  });

  it('T24: chặn quy cách trùng (không phân biệt dấu, hoa thường), HTX khác, giá / số lượng sai, quá số quy cách', () => {
    const s = makeState();
    expect(coopAddVariant(s, COOP_Y, 'x-dry', { unit: 'hộp', price: 1, quantity: 1 }, T0)).toMatchObject({ ok: false });
    expect(coopAddVariant(s, COOP_X, 'x-dry', { unit: ' GÓI ', price: 1, quantity: 1 }, T0)).toMatchObject({ ok: false, error: 'Sản phẩm đã có quy cách "GÓI".' });
    expect(coopAddVariant(s, COOP_X, 'x-dry', { unit: '', price: 1, quantity: 1 }, T0)).toMatchObject({ ok: false });
    expect(coopAddVariant(s, COOP_X, 'x-dry', { unit: 'hộp', price: 0, quantity: 1 }, T0)).toMatchObject({ ok: false });
    expect(coopAddVariant(s, COOP_X, 'x-dry', { unit: 'hộp', price: 10, quantity: -1 }, T0)).toMatchObject({ ok: false });
    expect(coopAddVariant(s, COOP_X, 'x-pre', { unit: 'thùng', price: 10, quantity: 0 }, T0)).toMatchObject({ ok: false, error: 'Số suất phải là số nguyên dương.' });
    let state = s;
    for (let i = 1; i < MAX_VARIANTS; i++) state = withVariant(state, `cỡ ${i}`, 1000 * i).state;
    expect(familyOf(state, { id: 'x-dry' })).toHaveLength(MAX_VARIANTS);
    expect(coopAddVariant(state, COOP_X, 'x-dry', { unit: 'cỡ thêm', price: 1, quantity: 1 }, T0)).toMatchObject({ ok: false });
  });

  it('quy cách đặt trước dùng chung khoảng ngày giao, số suất riêng', () => {
    const r = coopAddVariant(makeState(), COOP_X, 'x-pre', { unit: 'thùng 5 kg', price: 150_000, quantity: 4 }, T0);
    if (!r.ok) throw new Error(r.error);
    expect(r.value.product.preorder).toEqual({ totalSlots: 4, deliveryFrom: '2026-10-20', deliveryTo: '2026-10-31', open: true });
    expect(r.value.product.stockOnHand).toBe(0);
  });

  it('duyệt sửa nội dung một quy cách thì tên, mô tả, vùng áp cho cả nhóm, quy cách giữ riêng', () => {
    const { state: s0, id } = withVariant();
    const approved = decideProductChange(s0, s0.productChanges[0].id, ADMIN_QA, true, '', T0);
    if (!approved.ok) throw new Error(approved.error);
    const req = coopRequestContentChange(approved.value, id, COOP_X, { name: 'Tên mới', description: 'Mô tả mới', unit: 'gói 1 kg', category: 'processed', region: 'Vùng C' }, T0);
    if (!req.ok) throw new Error(req.error);
    const done = decideProductChange(req.value, req.value.productChanges[0].id, ADMIN_QA, true, '', T0);
    if (!done.ok) throw new Error(done.error);
    const base = done.value.products.find((p) => p.id === 'x-dry')!;
    const variant = done.value.products.find((p) => p.id === id)!;
    expect([base.name, base.description, base.region, base.category, base.unit]).toEqual(['Tên mới', 'Mô tả mới', 'Vùng C', 'processed', 'gói']);
    expect([variant.name, variant.unit]).toEqual(['Tên mới', 'gói 1 kg']);
    // Sản phẩm khác không đổi.
    expect(done.value.products.find((p) => p.id === 'x-pre')!.name).toBe('x-pre');
  });

  it('gom nhóm, khoảng giá, mỗi quy cách vào giỏ riêng, gợi ý không lặp sản phẩm', () => {
    const { state: s0, id } = withVariant();
    const state = decideProductChange(s0, s0.productChanges[0].id, ADMIN_QA, true, '', T0);
    if (!state.ok) throw new Error(state.error);
    const groups = groupFamilies(state.value.products);
    expect(groups.map((g) => g.map((p) => p.id))).toEqual([['x-dry', id], ['y-dry'], ['x-pre']]);
    expect(priceRange(groups[0])).toEqual({ min: 770_000, max: 1_200_000 });
    expect(familyKey(groups[0][1])).toBe('x-dry');
    let cart = addToCart(state.value, 'cust-1', 'x-dry', 1, T0);
    if (!cart.ok) throw new Error(cart.error);
    cart = addToCart(cart.value, 'cust-1', id, 2, T0);
    if (!cart.ok) throw new Error(cart.error);
    expect(cart.value.carts['cust-1'].map((l) => [l.productId, l.quantity])).toEqual([
      ['x-dry', 1],
      [id, 2],
    ]);
    const suggested = suggestedProducts(state.value, 'cust-1', 10).map((p) => familyKey(p));
    expect(new Set(suggested).size).toBe(suggested.length);
  });
});
