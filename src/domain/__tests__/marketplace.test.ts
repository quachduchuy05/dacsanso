import { describe, expect, it } from 'vitest';
import { normalizeState } from '../../store/normalize';
import {
  coopShop,
  favoriteItems,
  familyPrice,
  familyRating,
  followersOf,
  inPriceBand,
  isFavorite,
  isFollowing,
  MAX_SAVED_VOUCHERS,
  PRICE_BANDS,
  saveVoucher,
  savedFirst,
  sortProducts,
  setFavorite,
  setFollow,
  unsaveVoucher,
  voucherWallet,
  walletStatus,
} from '../marketplace';
import { deriveNotifications } from '../notifications';
import { coopCreateProduct, decideProductChange } from '../productChanges';
import type { DemoState, Review } from '../types';
import { coopAddVariant } from '../variants';
import type { Voucher } from '../voucher';
import { ADMIN_QA, COOP_X, COOP_Y, CUSTOMER, makeState, T0, VOUCHER_50K } from './fixtures';

function must<T>(r: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

const review = (productId: string, stars: number, status: Review['status'] = 'visible'): Review => ({
  id: `r-${productId}-${stars}-${status}`,
  orderId: 'DH-1',
  productId,
  customerId: 'cust-1',
  stars,
  comment: '',
  photos: [],
  status,
  createdAt: '',
});

/** Thêm quy cách đã duyệt cho x-dry. */
function withApprovedVariant(s: DemoState, unit: string, price: number): DemoState {
  const added = must(coopAddVariant(s, COOP_X, 'x-dry', { unit, price, quantity: 3 }, T0));
  return must(decideProductChange(added.state, added.state.productChanges[0].id, ADMIN_QA, true, '', T0));
}

describe('Yêu thích sản phẩm', () => {
  it('lưu theo nhóm quy cách, bỏ được; chỉ khách dùng được', () => {
    let s = withApprovedVariant(makeState(), 'gói nhỏ', 300_000);
    const variant = s.products.find((p) => p.variantOf === 'x-dry')!;
    s = must(setFavorite(s, CUSTOMER, variant.id, true));
    expect(s.favorites).toEqual({ 'cust-1': ['x-dry'] });
    expect(isFavorite(s, 'cust-1', s.products.find((p) => p.id === 'x-dry')!)).toBe(true);
    // Thẻ yêu thích hiện quy cách đang bán giá thấp nhất.
    expect(favoriteItems(s, 'cust-1')).toEqual([{ key: 'x-dry', product: variant, listed: true }]);
    expect(must(setFavorite(s, CUSTOMER, 'x-dry', false)).favorites).toEqual({ 'cust-1': [] });
    expect(setFavorite(s, COOP_X, 'x-dry', true)).toMatchObject({ ok: false, error: 'Chỉ khách hàng dùng được chức năng này.' });
    expect(setFavorite(s, CUSTOMER, 'khong-co', true)).toMatchObject({ ok: false });
  });

  it('chạy lại thao tác sau đồng bộ không đảo kết quả (bật hai lần vẫn bật)', () => {
    const once = must(setFavorite(makeState(), CUSTOMER, 'x-dry', true));
    expect(must(setFavorite(once, CUSTOMER, 'x-dry', true))).toBe(once);
    const follow = must(setFollow(makeState(), CUSTOMER, 'coop-x', true));
    expect(must(setFollow(follow, CUSTOMER, 'coop-x', true))).toBe(follow);
    const saved = must(saveVoucher(makeState(), CUSTOMER, 'v50', T0));
    expect(must(saveVoucher(saved, CUSTOMER, 'v50', T0))).toBe(saved);
    expect(must(unsaveVoucher(makeState(), CUSTOMER, 'v50')).savedVouchers).toBeUndefined();
  });

  it('không thêm sản phẩm đang ẩn; đã thích rồi HTX ẩn thì vẫn bỏ được và hiện "không còn bán"', () => {
    const s = makeState();
    const hidden = { ...s, products: s.products.map((p) => (p.id === 'y-dry' ? { ...p, status: 'hidden' as const } : p)) };
    expect(setFavorite(hidden, CUSTOMER, 'y-dry', true)).toMatchObject({ ok: false, error: 'Sản phẩm đang không bán nên chưa thêm vào Yêu thích được.' });
    const liked = must(setFavorite(s, CUSTOMER, 'y-dry', true));
    const later = { ...liked, products: liked.products.map((p) => (p.id === 'y-dry' ? { ...p, status: 'hidden' as const } : p)) };
    expect(favoriteItems(later, 'cust-1')).toMatchObject([{ key: 'y-dry', listed: false }]);
    expect(must(setFavorite(later, CUSTOMER, 'y-dry', false)).favorites).toEqual({ 'cust-1': [] });
  });
});

describe('Shop HTX và theo dõi', () => {
  it('theo dõi / bỏ theo dõi, đếm người theo dõi', () => {
    let s = must(setFollow(makeState(), CUSTOMER, 'coop-x', true));
    expect(isFollowing(s, 'cust-1', 'coop-x')).toBe(true);
    expect(followersOf(s, 'coop-x')).toBe(1);
    s = must(setFollow(s, CUSTOMER, 'coop-x', false));
    expect(followersOf(s, 'coop-x')).toBe(0);
    expect(setFollow(s, CUSTOMER, 'coop-khong-co', true)).toMatchObject({ ok: false });
    expect(setFollow(s, COOP_Y, 'coop-x', true)).toMatchObject({ ok: false });
  });

  it('trang shop chỉ có thông tin công khai: không SĐT, địa chỉ, người đại diện, tài khoản nhận tiền', () => {
    const base = makeState();
    const s: DemoState = {
      ...base,
      coops: base.coops.map((c) =>
        c.id === 'coop-x' ? { ...c, description: 'Giới thiệu mẫu', representative: 'Người đại diện mẫu', phones: ['0900000111', '0900000112'], storeAddress: 'Địa chỉ cửa hàng mẫu' } : c,
      ),
      reviews: [review('x-dry', 5), review('x-pre', 3), review('x-dry', 1, 'hidden'), review('y-dry', 1)],
    };
    const shop = coopShop(s, 'coop-x')!;
    expect(shop).toMatchObject({ name: 'HTX X', region: 'Vùng A', description: 'Giới thiệu mẫu', suspended: false, rating: { average: 4, count: 2 }, followers: 0 });
    expect(shop.products.map((p) => p.id)).toEqual(['x-dry', 'x-pre']);
    const text = JSON.stringify(shop);
    for (const secret of ['0900000111', '0900000112', 'Địa chỉ cửa hàng mẫu', 'Người đại diện mẫu', '**** 0101']) expect(text).not.toContain(secret);
    expect(coopShop(s, 'khong-co')).toBeNull();
  });

  it('HTX có sản phẩm mới được duyệt thì báo khách theo dõi; quy cách thêm thì không báo', () => {
    const followed = must(setFollow(makeState(), CUSTOMER, 'coop-x', true));
    const created = must(
      coopCreateProduct(followed, COOP_X, { name: 'Trà mẫu', description: 'Mô tả', unit: 'gói', category: 'dry', region: 'Vùng A', kind: 'ready', price: 50_000, stockOnHand: 5 }, T0),
    );
    const approved = deriveNotifications(created.state, must(decideProductChange(created.state, created.state.productChanges[0].id, ADMIN_QA, true, '', T0)), T0);
    expect(approved.notifications.filter((n) => n.userId === 'u-kh1')).toMatchObject([{ title: 'HTX X có sản phẩm mới', body: 'Trà mẫu', link: { type: 'product', id: created.product.id } }]);

    const variant = must(coopAddVariant(followed, COOP_X, 'x-dry', { unit: 'gói lớn', price: 900_000, quantity: 1 }, T0));
    const after = deriveNotifications(variant.state, must(decideProductChange(variant.state, variant.state.productChanges[0].id, ADMIN_QA, true, '', T0)), T0);
    expect(after.notifications.filter((n) => n.userId === 'u-kh1')).toEqual([]);
  });
});

describe('Kho voucher', () => {
  const upcoming: Voucher = { ...VOUCHER_50K, id: 'v-soon', code: 'SAPTOI', startsAt: '2026-11-01T00:00:00Z' };
  const expired: Voucher = { ...VOUCHER_50K, id: 'v-old', code: 'CU', expiresAt: '2026-01-01T00:00:00Z' };
  const first: Voucher = { ...VOUCHER_50K, id: 'v-first', code: 'DAU', firstOrderOnly: true };
  const off: Voucher = { ...VOUCHER_50K, id: 'v-off', code: 'TAT', active: false };
  const state = (): DemoState => ({ ...makeState(), vouchers: [VOUCHER_50K, upcoming, expired, first, off] });

  it('lưu mã dùng được hoặc sắp tới ngày; không lưu mã hết hạn, đã tắt', () => {
    let s = must(saveVoucher(state(), CUSTOMER, 'v50', T0));
    s = must(saveVoucher(s, CUSTOMER, 'v-soon', T0));
    expect(s.savedVouchers).toEqual({ 'cust-1': ['v-soon', 'v50'] });
    expect(saveVoucher(s, CUSTOMER, 'v-old', T0)).toMatchObject({ ok: false, error: 'Không lưu được mã CU: hết hạn.' });
    expect(saveVoucher(s, CUSTOMER, 'v-off', T0)).toMatchObject({ ok: false, error: 'Không lưu được mã TAT: ngừng áp dụng.' });
    expect(saveVoucher(s, COOP_X, 'v50', T0)).toMatchObject({ ok: false });
    const wallet = voucherWallet(s, 'cust-1', T0);
    expect(wallet.saved.map((e) => `${e.voucher.code}:${e.status}`)).toEqual(['SAPTOI:upcoming', 'GIAM50:usable']);
    // Mã có thể lưu: chỉ mã khách dùng được, chưa lưu.
    expect(wallet.claimable.map((e) => e.voucher.code)).toEqual(['DAU']);
    expect(must(unsaveVoucher(s, CUSTOMER, 'v50')).savedVouchers).toEqual({ 'cust-1': ['v-soon'] });
  });

  it('mã đã lưu rồi hết hạn vẫn nằm trong kho kèm tình trạng; mã đơn đầu không cho khách đã đặt', () => {
    const s = must(saveVoucher(state(), CUSTOMER, 'v50', T0));
    expect(voucherWallet(s, 'cust-1', new Date('2099-06-01T00:00:00Z')).saved).toMatchObject([{ status: 'expired' }]);
    const ordered = { ...s, orders: [{ id: 'DH-1', customerId: 'cust-1', status: 'delivered' } as DemoState['orders'][number]] };
    expect(walletStatus(ordered, first, 'cust-1', T0)).toBe('first_order_only');
    expect(saveVoucher(ordered, CUSTOMER, 'v-first', T0)).toMatchObject({ ok: false, error: 'Không lưu được mã DAU: chỉ cho đơn đầu tiên.' });
  });

  it('kho có giới hạn số mã; ở bước đặt hàng mã đã lưu lên trước, vẫn là danh sách cũ', () => {
    const many: Voucher[] = Array.from({ length: MAX_SAVED_VOUCHERS + 1 }, (_, i) => ({ ...VOUCHER_50K, id: `v${i}`, code: `MA${i}` }));
    let s: DemoState = { ...makeState(), vouchers: many };
    for (let i = 0; i < MAX_SAVED_VOUCHERS; i++) s = must(saveVoucher(s, CUSTOMER, `v${i}`, T0));
    expect(saveVoucher(s, CUSTOMER, `v${MAX_SAVED_VOUCHERS}`, T0)).toMatchObject({ ok: false });
    const s2 = must(saveVoucher(state(), CUSTOMER, 'v-first', T0));
    expect(savedFirst(s2, 'cust-1', s2.vouchers).map((v) => v.id)).toEqual(['v-first', 'v50', 'v-soon', 'v-old', 'v-off']);
  });
});

describe('Sắp xếp và lọc giá ở trang chủ', () => {
  it('giá của thẻ là giá thấp nhất trong các quy cách đang bán', () => {
    const s = withApprovedVariant(makeState(), 'gói nhỏ', 90_000);
    expect(familyPrice(s, s.products.find((p) => p.id === 'x-dry')!)).toBe(90_000);
    expect(inPriceBand(90_000, 'under_100k')).toBe(true);
    expect(PRICE_BANDS.filter((b) => inPriceBand(100_000, b.key)).map((b) => b.key)).toEqual(['all', '100k_200k']);
    expect(PRICE_BANDS.filter((b) => inPriceBand(200_001, b.key)).map((b) => b.key)).toEqual(['all', 'over_200k']);
  });

  it('sắp theo giá và theo đánh giá (cả nhóm quy cách, chỉ đánh giá đang hiện; chưa có đánh giá xếp sau)', () => {
    const base = withApprovedVariant(makeState(), 'gói nhỏ', 300_000);
    const variant = base.products.find((p) => p.variantOf === 'x-dry')!;
    const s: DemoState = { ...base, reviews: [review(variant.id, 5), review('x-dry', 4), review('y-dry', 5), review('y-dry', 1, 'hidden'), review('y-dry', 3)] };
    const cards = ['x-dry', 'y-dry', 'x-pre'].map((id) => s.products.find((p) => p.id === id)!);
    expect(familyRating(s, cards[0])).toEqual({ average: 4.5, count: 2 });
    expect(sortProducts(s, cards, 'relevant').map((p) => p.id)).toEqual(['x-dry', 'y-dry', 'x-pre']);
    expect(sortProducts(s, cards, 'price_asc').map((p) => p.id)).toEqual(['x-pre', 'y-dry', 'x-dry']);
    expect(sortProducts(s, cards, 'price_desc').map((p) => p.id)).toEqual(['x-dry', 'y-dry', 'x-pre']);
    expect(sortProducts(s, cards, 'rating').map((p) => p.id)).toEqual(['x-dry', 'y-dry', 'x-pre']);
  });
});

describe('Chuẩn hoá dữ liệu yêu thích, theo dõi, kho voucher', () => {
  it('bỏ phần tử sai dạng, giữ dữ liệu đúng', () => {
    const raw = { ...makeState(), favorites: { 'cust-1': ['x-dry', 5, null] }, follows: 'hỏng', savedVouchers: { 'cust-1': 'v50' } };
    const s = normalizeState(raw, makeState)!;
    expect(s.favorites).toEqual({ 'cust-1': ['x-dry'] });
    expect(s.follows).toEqual({});
    expect(s.savedVouchers).toEqual({ 'cust-1': [] });
  });
});
