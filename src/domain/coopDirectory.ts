/**
 * Danh sách HTX cho Admin (góp ý kiểm thử: "Danh sách HTX", "Danh sách sản phẩm đang bán của từng HTX").
 * Mỗi HTX: hồ sơ, quyền bán, SĐT và địa chỉ liên hệ (chỉ Admin xem, domain/coopContact.ts), số sản phẩm, đơn, giá trị
 * hàng đã giao, điểm đánh giá, khiếu nại đang mở; và sản phẩm của HTX (đang bán trước, theo nhóm quy cách).
 */
import { isTicketOpen } from './complaint';
import { listCoopContacts, type CoopContact } from './coopContact';
import { matchesSearch } from './text';
import { fail, ok, type Actor, type Coop, type DemoState, type Product, type Result } from './types';
import { groupFamilies } from './variants';

export interface CoopDirectoryRow {
  coop: Coop;
  contact: CoopContact;
  /** Sản phẩm khách đang thấy (Đang bán), gom theo nhóm quy cách. */
  active: Product[];
  /** Sản phẩm HTX ẩn, chờ duyệt, bị từ chối. */
  others: Product[];
  orders: number;
  deliveredGoodsValue: number;
  rating: { average: number | null; count: number };
  openTickets: number;
}

export type CoopDirectoryFilter = 'all' | 'active' | 'suspended' | 'pending_profile';

export const COOP_DIRECTORY_FILTERS: { key: CoopDirectoryFilter; label: string }[] = [
  { key: 'all', label: 'Mọi HTX' },
  { key: 'active', label: 'Đang được bán' },
  { key: 'suspended', label: 'Tạm khoá bán' },
  { key: 'pending_profile', label: 'Hồ sơ chờ duyệt' },
];

/** Chỉ Admin (mọi nhóm quyền) xem danh sách HTX đầy đủ vì có SĐT, địa chỉ của HTX. */
export function coopDirectory(state: DemoState, actor: Actor): Result<CoopDirectoryRow[]> {
  if (actor.kind !== 'admin') return fail('Chỉ Admin xem được danh sách HTX đầy đủ.');
  const contacts = listCoopContacts(state, actor);
  if (!contacts.ok) return contacts;
  const rows = state.coops.map((coop) => {
    const products = state.products.filter((p) => p.coopId === coop.id);
    const ids = new Set(products.map((p) => p.id));
    const orders = state.orders.filter((o) => o.coopId === coop.id);
    const reviews = state.reviews.filter((r) => ids.has(r.productId) && r.status === 'visible');
    return {
      coop,
      contact: contacts.value.find((x) => x.coopId === coop.id)!,
      active: groupFamilies(products.filter((p) => p.status === 'active')).flat(),
      others: groupFamilies(products.filter((p) => p.status !== 'active')).flat(),
      orders: orders.length,
      deliveredGoodsValue: orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.pricing.itemsTotal, 0),
      rating: reviews.length ? { average: Math.round((reviews.reduce((s, r) => s + r.stars, 0) / reviews.length) * 10) / 10, count: reviews.length } : { average: null, count: 0 },
      openTickets: state.tickets.filter((t) => t.coopId === coop.id && isTicketOpen(t)).length,
    };
  });
  return ok(rows);
}

/** Lọc theo tình trạng và tìm theo tên HTX, vùng, người đại diện, tên sản phẩm (không dấu). */
export function filterCoopRows(rows: CoopDirectoryRow[], query: string, filter: CoopDirectoryFilter): CoopDirectoryRow[] {
  return rows
    .filter(({ coop: c }) => filter === 'all' || (filter === 'pending_profile' ? c.profileStatus === 'pending' : c.status === filter))
    .filter((r) => matchesSearch(query, [r.coop.name, r.coop.region, r.coop.representative, ...[...r.active, ...r.others].map((p) => p.name)]));
}
