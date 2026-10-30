/**
 * Tính năng kiểu sàn TMĐT cho khách (chủ repo yêu cầu ngày 18/10/2026, đợt 2): yêu thích sản phẩm, theo dõi shop HTX,
 * kho voucher (lưu mã để dùng sau), trang shop HTX, sắp xếp và lọc theo khoảng giá.
 *
 * Giữ đúng phạm vi SRS: không có xu, mã freeship, cộng nhiều mã hay hiển thị số lượng bán ra. Kho voucher chỉ là danh sách mã khách đã
 * lưu; mỗi lần đặt vẫn tối đa PAR-28 mã và mã vẫn xét đủ điều kiện như cũ (domain/voucher.ts).
 * Trang shop chỉ có thông tin công khai: tên, vùng, giới thiệu, sản phẩm đang bán, điểm đánh giá, số người theo dõi.
 * Không có SĐT, địa chỉ cửa hàng, người đại diện (domain/coopContact.ts: chỉ Admin và HTX xem).
 */
import { isFirstOrder, voucherUsedCount } from './checkout';
import { toDateKey } from './state';
import { fail, ok, type Actor, type Coop, type DemoState, type Product, type Result } from './types';
import type { Voucher } from './voucher';
import { familyKey, groupFamilies, priceRange } from './variants';

/** Tối đa số sản phẩm yêu thích, HTX theo dõi, mã đã lưu của một khách (giữ dữ liệu dùng chung gọn). */
export const MAX_FAVORITES = 100;
export const MAX_FOLLOWS = 50;
export const MAX_SAVED_VOUCHERS = 30;

type Lists = Record<string, string[]>;

const listOf = (map: Lists | undefined, customerId: string): string[] => map?.[customerId] ?? [];
const withList = (map: Lists | undefined, customerId: string, list: string[]): Lists => ({ ...(map ?? {}), [customerId]: list });

function customerOf(actor: Actor): Result<string> {
  return actor.kind === 'customer' && actor.id ? ok(actor.id) : fail('Chỉ khách hàng dùng được chức năng này.');
}

// ---------- Yêu thích ----------

/** Yêu thích lưu theo nhóm quy cách: thích hộp 300 g cũng là thích cả sản phẩm. */
export const isFavorite = (state: DemoState, customerId: string, product: Pick<Product, 'id' | 'variantOf'>): boolean => listOf(state.favorites, customerId).includes(familyKey(product));

/**
 * Thêm (`on`) hoặc bỏ yêu thích. Chỉ thêm được sản phẩm đang bán; bỏ thì luôn được.
 * Ghi rõ bật / tắt thay vì đảo trạng thái, để thao tác chạy lại sau khi đồng bộ (máy khác vừa ghi) vẫn cho đúng kết quả.
 */
export function setFavorite(state: DemoState, actor: Actor, productId: string, on: boolean): Result<DemoState> {
  const who = customerOf(actor);
  if (!who.ok) return who;
  const product = state.products.find((p) => p.id === productId);
  if (!product) return fail('Không tìm thấy sản phẩm.');
  const key = familyKey(product);
  const list = listOf(state.favorites, who.value);
  if (list.includes(key) === on) return ok(state);
  if (!on)
    return ok({
      ...state,
      favorites: withList(
        state.favorites,
        who.value,
        list.filter((k) => k !== key),
      ),
    });
  if (product.status !== 'active') return fail('Sản phẩm đang không bán nên chưa thêm vào Yêu thích được.');
  if (list.length >= MAX_FAVORITES) return fail(`Tối đa ${MAX_FAVORITES} sản phẩm yêu thích. Bỏ bớt sản phẩm cũ để thêm.`);
  return ok({ ...state, favorites: withList(state.favorites, who.value, [key, ...list]) });
}

export interface FavoriteItem {
  key: string;
  /** Quy cách đang bán giá thấp nhất; nhóm không còn bán thì là sản phẩm gốc. */
  product: Product;
  /** Còn quy cách đang bán. */
  listed: boolean;
}

/** Sản phẩm yêu thích, mới thêm trước. */
export function favoriteItems(state: DemoState, customerId: string): FavoriteItem[] {
  return listOf(state.favorites, customerId).flatMap((key) => {
    const family = state.products.filter((p) => familyKey(p) === key).sort((a, b) => a.price - b.price);
    if (family.length === 0) return [];
    const listed = family.filter((p) => p.status === 'active');
    return [{ key, product: listed[0] ?? family.find((p) => p.id === key) ?? family[0], listed: listed.length > 0 }];
  });
}

// ---------- Theo dõi shop HTX ----------

export const isFollowing = (state: DemoState, customerId: string, coopId: string): boolean => listOf(state.follows, customerId).includes(coopId);

export const followersOf = (state: DemoState, coopId: string): number => Object.values(state.follows ?? {}).filter((l) => l.includes(coopId)).length;

/** Mã khách đang theo dõi HTX (để báo khi HTX có sản phẩm mới). */
export const followerIdsOf = (state: DemoState, coopId: string): string[] =>
  Object.entries(state.follows ?? {})
    .filter(([, l]) => l.includes(coopId))
    .map(([customerId]) => customerId);

/** Theo dõi (`on`) hoặc bỏ theo dõi shop HTX. Ghi rõ bật / tắt như setFavorite. */
export function setFollow(state: DemoState, actor: Actor, coopId: string, on: boolean): Result<DemoState> {
  const who = customerOf(actor);
  if (!who.ok) return who;
  if (!state.coops.some((c) => c.id === coopId)) return fail('Không tìm thấy HTX.');
  const list = listOf(state.follows, who.value);
  if (list.includes(coopId) === on) return ok(state);
  if (on && list.length >= MAX_FOLLOWS) return fail(`Tối đa theo dõi ${MAX_FOLLOWS} HTX.`);
  return ok({ ...state, follows: withList(state.follows, who.value, on ? [coopId, ...list] : list.filter((id) => id !== coopId)) });
}

export const followedCoops = (state: DemoState, customerId: string): Coop[] => listOf(state.follows, customerId).flatMap((id) => state.coops.filter((c) => c.id === id));

// ---------- Đánh giá theo nhóm quy cách ----------

/** Điểm trung bình các đánh giá đang Hiển thị của mọi sản phẩm trong danh sách. */
export function ratingOf(state: DemoState, productIds: string[]): { average: number | null; count: number } {
  const ids = new Set(productIds);
  const visible = state.reviews.filter((r) => ids.has(r.productId) && r.status === 'visible');
  if (visible.length === 0) return { average: null, count: 0 };
  return { average: Math.round((visible.reduce((s, r) => s + r.stars, 0) / visible.length) * 10) / 10, count: visible.length };
}

/** Điểm của cả nhóm quy cách (hộp 300 g và 500 g chung một điểm trên thẻ). */
export const familyRating = (state: DemoState, product: Pick<Product, 'id' | 'variantOf'>) =>
  ratingOf(
    state,
    state.products.filter((p) => familyKey(p) === familyKey(product)).map((p) => p.id),
  );

// ---------- Trang shop HTX ----------

export interface CoopShop {
  id: string;
  name: string;
  region: string;
  description?: string;
  /** HTX đang tạm khoá quyền bán: sản phẩm vẫn xem được nhưng không đặt được. */
  suspended: boolean;
  /** Mỗi nhóm quy cách một sản phẩm (quy cách đang bán giá thấp nhất). */
  products: Product[];
  rating: { average: number | null; count: number };
  followers: number;
  /** Chứng nhận đã được Admin – Chất lượng xác minh của các sản phẩm đang bán, còn hiệu lực (Giai đoạn 8, mục 1). */
  certifications: ShopCertification[];
  /** HTX hoặc sản phẩm thuộc dữ liệu mẫu của nhóm: trang shop ghi nhãn dữ liệu mẫu. */
  sample: boolean;
}

export interface ShopCertification {
  id: string;
  label: string;
  issuer: string;
  validUntil: string;
  /** Tên các sản phẩm có chứng nhận này. */
  productNames: string[];
}

/** Chứng nhận đã xác minh, còn hiệu lực tại `at`; cùng tên + nơi cấp gộp một dòng. */
function shopCertifications(listed: Product[], at: Date): ShopCertification[] {
  const today = toDateKey(at);
  const byKey = new Map<string, ShopCertification>();
  for (const p of listed) {
    for (const c of p.certifications ?? []) {
      if (!c.verified || c.validUntil < today) continue;
      const key = `${c.label}|${c.issuer}`;
      const found = byKey.get(key);
      const name = p.name;
      if (!found) byKey.set(key, { id: c.id, label: c.label, issuer: c.issuer, validUntil: c.validUntil, productNames: [name] });
      else {
        if (!found.productNames.includes(name)) found.productNames.push(name);
        if (c.validUntil > found.validUntil) found.validUntil = c.validUntil;
      }
    }
  }
  return [...byKey.values()];
}

/** Thông tin công khai của shop HTX. Cố ý không trả SĐT, địa chỉ, người đại diện, tài khoản nhận tiền. */
export function coopShop(state: DemoState, coopId: string, at: Date = new Date()): CoopShop | null {
  const coop = state.coops.find((c) => c.id === coopId);
  if (!coop) return null;
  const listed = state.products.filter((p) => p.coopId === coopId && p.status === 'active');
  return {
    id: coop.id,
    name: coop.name,
    region: coop.region,
    description: coop.description?.trim() || undefined,
    suspended: coop.status === 'suspended',
    products: groupFamilies(listed).map((f) => f[0]),
    rating: ratingOf(
      state,
      listed.map((p) => p.id),
    ),
    followers: followersOf(state, coopId),
    certifications: shopCertifications(listed, at),
    sample: coop.name.toLowerCase().includes('mẫu') || listed.some((p) => !!p.sample),
  };
}

// ---------- Kho voucher ----------

export type WalletStatus = 'usable' | 'upcoming' | 'expired' | 'used_up' | 'inactive' | 'first_order_only';

export const WALLET_STATUS_LABEL: Record<WalletStatus, string> = {
  usable: 'Dùng được',
  upcoming: 'Chưa đến ngày dùng',
  expired: 'Hết hạn',
  used_up: 'Hết lượt',
  inactive: 'Ngừng áp dụng',
  first_order_only: 'Chỉ cho đơn đầu tiên',
};

export interface WalletEntry {
  voucher: Voucher;
  status: WalletStatus;
  saved: boolean;
}

/** Tình trạng mã với khách tại thời điểm `at` (chưa xét giỏ hàng; điều kiện tiền hàng xét lúc đặt). */
export function walletStatus(state: DemoState, voucher: Voucher, customerId: string, at: Date): WalletStatus {
  const now = at.getTime();
  if (voucher.active === false) return 'inactive';
  if (now > new Date(voucher.expiresAt).getTime()) return 'expired';
  if (voucherUsedCount(state, voucher.id) >= voucher.usageLimit) return 'used_up';
  if (voucher.firstOrderOnly && !isFirstOrder(state, customerId)) return 'first_order_only';
  if (voucher.startsAt && now < new Date(voucher.startsAt).getTime()) return 'upcoming';
  return 'usable';
}

const savable = (s: WalletStatus) => s === 'usable' || s === 'upcoming';

/** Kho voucher của khách: mã đã lưu (cả mã đã hết hạn để khách biết) và mã đang phát hành có thể lưu. */
export function voucherWallet(state: DemoState, customerId: string, at: Date): { saved: WalletEntry[]; claimable: WalletEntry[] } {
  const savedIds = listOf(state.savedVouchers, customerId);
  const saved = savedIds.flatMap((id) => state.vouchers.filter((v) => v.id === id)).map((voucher) => ({ voucher, status: walletStatus(state, voucher, customerId, at), saved: true }));
  const claimable = state.vouchers
    .filter((v) => !savedIds.includes(v.id))
    .map((voucher) => ({ voucher, status: walletStatus(state, voucher, customerId, at), saved: false }))
    .filter((e) => savable(e.status));
  return { saved, claimable };
}

export const isVoucherSaved = (state: DemoState, customerId: string, voucherId: string): boolean => listOf(state.savedVouchers, customerId).includes(voucherId);

/** Lưu mã vào kho. Chỉ lưu được mã khách dùng được (hoặc sắp tới ngày dùng). Đã lưu rồi thì giữ nguyên. */
export function saveVoucher(state: DemoState, actor: Actor, voucherId: string, at: Date): Result<DemoState> {
  const who = customerOf(actor);
  if (!who.ok) return who;
  const voucher = state.vouchers.find((v) => v.id === voucherId);
  if (!voucher) return fail('Không tìm thấy mã ưu đãi.');
  const list = listOf(state.savedVouchers, who.value);
  if (list.includes(voucherId)) return ok(state);
  const status = walletStatus(state, voucher, who.value, at);
  if (!savable(status)) return fail(`Không lưu được mã ${voucher.code}: ${WALLET_STATUS_LABEL[status].toLowerCase()}.`);
  if (list.length >= MAX_SAVED_VOUCHERS) return fail(`Kho voucher tối đa ${MAX_SAVED_VOUCHERS} mã. Bỏ bớt mã cũ để lưu.`);
  return ok({ ...state, savedVouchers: withList(state.savedVouchers, who.value, [voucherId, ...list]) });
}

export function unsaveVoucher(state: DemoState, actor: Actor, voucherId: string): Result<DemoState> {
  const who = customerOf(actor);
  if (!who.ok) return who;
  const list = listOf(state.savedVouchers, who.value);
  if (!list.includes(voucherId)) return ok(state);
  return ok({
    ...state,
    savedVouchers: withList(
      state.savedVouchers,
      who.value,
      list.filter((id) => id !== voucherId),
    ),
  });
}

/** Mã đã lưu lên trước ở bước đặt hàng (giữ thứ tự gốc trong từng nhóm). */
export function savedFirst(state: DemoState, customerId: string, vouchers: Voucher[]): Voucher[] {
  const saved = listOf(state.savedVouchers, customerId);
  return [...vouchers.filter((v) => saved.includes(v.id)), ...vouchers.filter((v) => !saved.includes(v.id))];
}

// ---------- Sắp xếp, khoảng giá ----------

export type SortKey = 'relevant' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'bestseller';

export const SORT_LABEL: Record<SortKey, string> = {
  newest: 'Mới nhất',
  bestseller: 'Bán chạy',
  relevant: 'Phù hợp',
  price_asc: 'Giá thấp → cao',
  price_desc: 'Giá cao → thấp',
  rating: 'Đánh giá cao',
};

export type PriceBand = 'all' | 'under_100k' | '100k_200k' | 'over_200k';

export const PRICE_BANDS: { key: PriceBand; label: string }[] = [
  { key: 'all', label: 'Mọi mức giá' },
  { key: 'under_100k', label: 'Dưới 100.000đ' },
  { key: '100k_200k', label: '100.000đ – 200.000đ' },
  { key: 'over_200k', label: 'Trên 200.000đ' },
];

/** Giá thấp nhất trong các quy cách đang bán của nhóm (giá "từ …" trên thẻ). */
export function familyPrice(state: DemoState, product: Product): number {
  const listed = state.products.filter((p) => familyKey(p) === familyKey(product) && p.status === 'active');
  return priceRange(listed.length > 0 ? listed : [product]).min;
}

/** Khoảng giá khách tự nhập (đồng); bỏ trống một đầu là không giới hạn đầu đó. Nhập ngược (từ > đến) thì tự đổi chỗ. */
export function inPriceRange(price: number, min?: number, max?: number): boolean {
  const lo = min !== undefined && max !== undefined ? Math.min(min, max) : min;
  const hi = min !== undefined && max !== undefined ? Math.max(min, max) : max;
  return (lo === undefined || price >= lo) && (hi === undefined || price <= hi);
}

/** Đọc ô nhập giá: bỏ dấu chấm, khoảng trắng, chữ "đ"; rỗng hoặc không phải số thì là không giới hạn. */
export function parsePriceInput(text: string): number | undefined {
  const digits = text.replace(/[.\s,đ₫]/gi, '');
  if (!/^\d{1,9}$/.test(digits)) return undefined;
  return Number(digits);
}

export function inPriceBand(price: number, band: PriceBand): boolean {
  if (band === 'under_100k') return price < 100_000;
  if (band === '100k_200k') return price >= 100_000 && price <= 200_000;
  if (band === 'over_200k') return price > 200_000;
  return true;
}

/** Sắp xếp thẻ sản phẩm (mỗi thẻ một nhóm quy cách). "Phù hợp" giữ thứ tự sẵn có. Chưa có đánh giá xếp sau. */
export function sortProducts(state: DemoState, products: Product[], key: SortKey): Product[] {
  if (key === 'relevant') return products;
  const withKey = products.map((p, i) => ({ p, i, price: familyPrice(state, p), rating: familyRating(state, p) }));
  withKey.sort((a, b) => {
    if (key === 'price_asc') return a.price - b.price || a.i - b.i;
    if (key === 'price_desc') return b.price - a.price || a.i - b.i;
    if (key === 'newest') return (Date.parse(b.p.createdAt??'')||0)-(Date.parse(a.p.createdAt??'')||0)||a.i-b.i;
    if (key === 'bestseller') return (b.p.soldCount??0)-(a.p.soldCount??0)||a.i-b.i;
    return (b.rating.average ?? -1) - (a.rating.average ?? -1) || b.rating.count - a.rating.count || a.i - b.i;
  });
  return withKey.map((x) => x.p);
}
