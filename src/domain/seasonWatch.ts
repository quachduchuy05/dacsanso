/**
 * "Báo tôi khi vào mùa" (Giai đoạn 8, mục 2): khách theo dõi sản phẩm đặt trước đang chưa mở, hết suất hoặc hết thời gian nhận đặt.
 * Khi Admin – Chất lượng duyệt đợt đặt trước mới hoặc thêm suất, mỗi khách theo dõi nhận đúng 1 thông báo cho đợt đó
 * (domain/notifications.ts). Đợt nhận diện bằng khoảng ngày giao HTX khai; duyệt thêm suất trong cùng đợt không báo lặp.
 * Theo dõi lưu theo nhóm quy cách như Yêu thích, và vẫn giữ sau khi báo để khách được báo đợt sau.
 */
import { deliveryWindow, isOrderableIn } from './cart';
import { remainingFor } from './state';
import { fail, ok, type Actor, type DemoState, type PreorderConfig, type Product, type Result } from './types';
import { familyKey } from './variants';

/** Tối đa sản phẩm một khách theo dõi vào mùa. */
export const MAX_SEASON_WATCHES = 50;

/** Mã đợt đặt trước: khoảng ngày giao. */
export const roundKeyOf = (cfg: Pick<PreorderConfig, 'deliveryFrom' | 'deliveryTo'>): string => `${cfg.deliveryFrom}~${cfg.deliveryTo}`;

/** Khoá trong seasonAlerts: một khách với một nhóm quy cách. */
export const seasonAlertKey = (customerId: string, family: string): string => `${customerId}|${family}`;

/** Quy cách đặt trước đặt được ngay: đang mở, HTX có quyền bán, còn suất, còn ngày giao hợp lệ. */
export function preorderOpenNow(state: DemoState, product: Product, now: Date): boolean {
  return product.kind === 'preorder' && isOrderableIn(state, product) && remainingFor(state, product) > 0 && deliveryWindow(product, now, state.params) !== null;
}

const familyMembers = (state: DemoState, key: string): Product[] => state.products.filter((p) => familyKey(p) === key);

/** Nhóm quy cách có quy cách nào đặt trước được ngay không. */
export const seasonOpen = (state: DemoState, product: Pick<Product, 'id' | 'variantOf'>, now: Date): boolean => familyMembers(state, familyKey(product)).some((p) => preorderOpenNow(state, p, now));

/** Sản phẩm hiện nút "Báo tôi khi vào mùa": sản phẩm đặt trước đang hiển thị nhưng chưa đặt được. */
export const canWatchSeason = (state: DemoState, product: Product, now: Date): boolean => product.kind === 'preorder' && product.status === 'active' && !seasonOpen(state, product, now);

const listOf = (state: DemoState, customerId: string): string[] => state.seasonWatches?.[customerId] ?? [];

export const isSeasonWatched = (state: DemoState, customerId: string, product: Pick<Product, 'id' | 'variantOf'>): boolean => listOf(state, customerId).includes(familyKey(product));

/** Mã khách đang theo dõi một nhóm quy cách. */
export const seasonWatcherIds = (state: DemoState, family: string): string[] =>
  Object.entries(state.seasonWatches ?? {})
    .filter(([, l]) => l.includes(family))
    .map(([customerId]) => customerId);

/**
 * Theo dõi (`on`) hoặc bỏ theo dõi vào mùa. Ghi rõ bật / tắt để thao tác chạy lại sau đồng bộ vẫn đúng (như setFavorite).
 * Chỉ theo dõi được sản phẩm đặt trước đang hiển thị mà chưa đặt được; bỏ thì luôn được.
 */
export function setSeasonWatch(state: DemoState, actor: Actor, productId: string, on: boolean, now: Date): Result<DemoState> {
  if (actor.kind !== 'customer' || !actor.id) return fail('Chỉ khách hàng dùng được chức năng này.');
  const customerId = actor.id;
  const product = state.products.find((p) => p.id === productId);
  if (!product) return fail('Không tìm thấy sản phẩm.');
  const key = familyKey(product);
  const list = listOf(state, customerId);
  if (list.includes(key) === on) return ok(state);
  const write = (next: string[]): DemoState => ({ ...state, seasonWatches: { ...(state.seasonWatches ?? {}), [customerId]: next } });
  if (!on) return ok(write(list.filter((k) => k !== key)));
  if (product.kind !== 'preorder') return fail('Chỉ sản phẩm đặt trước mới theo dõi vào mùa được.');
  if (product.status !== 'active') return fail('Sản phẩm đang không hiển thị nên chưa theo dõi được.');
  if (seasonOpen(state, product, now)) return fail('Sản phẩm đang nhận đặt trước, bạn đặt được ngay.');
  if (list.length >= MAX_SEASON_WATCHES) return fail(`Tối đa theo dõi ${MAX_SEASON_WATCHES} sản phẩm. Bỏ bớt sản phẩm cũ để thêm.`);
  return ok(write([key, ...list]));
}

export interface SeasonWatchItem {
  key: string;
  product: Product;
  /** Đang nhận đặt trước (đã vào mùa). */
  open: boolean;
}

/** Danh sách theo dõi vào mùa ở Tài khoản, mới thêm trước. Sản phẩm không còn hiển thị vẫn giữ để khách tự bỏ. */
export function seasonWatchItems(state: DemoState, customerId: string, now: Date): SeasonWatchItem[] {
  return listOf(state, customerId).flatMap((key) => {
    const family = familyMembers(state, key).sort((a, b) => a.price - b.price);
    if (family.length === 0) return [];
    const product = family.find((p) => p.status === 'active') ?? family.find((p) => p.id === key) ?? family[0];
    return [{ key, product, open: family.some((p) => preorderOpenNow(state, p, now)) }];
  });
}
