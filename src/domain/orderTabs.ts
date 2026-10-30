/**
 * "Đơn mua" của khách theo tab, kiểu ứng dụng mua sắm quen thuộc (chủ repo gửi video mẫu):
 * Tất cả · Chờ thanh toán · Chờ xác nhận · Chờ thu hoạch · Chờ lấy hàng · Đang giao · Đã giao · Trả hàng · Đã huỷ.
 * Mỗi trạng thái đơn (mục 5.5) thuộc đúng một tab, trừ "Tất cả". Thêm: đơn chờ đánh giá, tiền hoàn của đơn,
 * "Mua lại" (đưa lại các sản phẩm của đơn vào giỏ) và gợi ý "Có thể bạn cũng thích".
 */
import { addToCart, isOrderableIn } from './cart';
import { averageRating } from './reviews';
import { findOrder, findProduct, remainingFor } from './state';
import { matchesSearch } from './text';
import { familyKey } from './variants';
import {
  fail,
  ok,
  PAYMENT_STATUS_LABEL,
  type Actor,
  type DemoState,
  type Order,
  type OrderItem,
  type OrderKind,
  type OrderStatus,
  type PaymentStatus,
  type Product,
  type RefundStatus,
  type Result,
} from './types';

export type OrderTabKey = 'all' | 'payment' | 'confirm' | 'harvest' | 'pickup' | 'shipping' | 'delivered' | 'returns' | 'cancelled';

export interface OrderTab {
  key: OrderTabKey;
  label: string;
  /** Trạng thái thuộc tab; "Tất cả" không có. */
  statuses?: OrderStatus[];
}

export const ORDER_TABS: OrderTab[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'payment', label: 'Chờ thanh toán', statuses: ['awaiting_payment'] },
  { key: 'confirm', label: 'Chờ xác nhận', statuses: ['awaiting_confirmation'] },
  { key: 'harvest', label: 'Chờ thu hoạch', statuses: ['awaiting_harvest'] },
  { key: 'pickup', label: 'Chờ lấy hàng', statuses: ['confirmed', 'preparing'] },
  { key: 'shipping', label: 'Đang giao', statuses: ['shipping'] },
  { key: 'delivered', label: 'Đã giao', statuses: ['delivered'] },
  { key: 'returns', label: 'Trả hàng', statuses: ['return_refund', 'returning', 'returned'] },
  { key: 'cancelled', label: 'Đã huỷ', statuses: ['cancelled'] },
];

export const tabOf = (key: OrderTabKey): OrderTab => ORDER_TABS.find((t) => t.key === key)!;

export function ordersInTab<T extends Pick<Order, 'status'>>(orders: T[], key: OrderTabKey): T[] {
  const statuses = tabOf(key).statuses;
  return statuses ? orders.filter((o) => statuses.includes(o.status)) : orders;
}

export function tabCounts(orders: Pick<Order, 'status'>[]): Record<OrderTabKey, number> {
  return Object.fromEntries(ORDER_TABS.map((t) => [t.key, ordersInTab(orders, t.key).length])) as Record<OrderTabKey, number>;
}

// ---------- Bộ lọc thêm cho danh sách đơn của HTX ----------

export type PaymentFilterKey = 'all' | 'paid' | 'deposit' | 'unpaid' | 'refunding' | 'refunded';

/** Nhóm tình trạng thanh toán để HTX lọc (góp ý kiểm thử: "Đã thanh toán", "Đã hoàn tiền"). */
export const PAYMENT_FILTERS: { key: PaymentFilterKey; label: string; statuses?: PaymentStatus[] }[] = [
  { key: 'all', label: 'Mọi thanh toán' },
  { key: 'paid', label: 'Đã thanh toán', statuses: ['paid'] },
  { key: 'deposit', label: 'Đã cọc – còn lại', statuses: ['deposit_paid'] },
  { key: 'unpaid', label: 'Chưa thanh toán', statuses: ['cod_unpaid', 'awaiting_payment'] },
  { key: 'refunding', label: 'Đang hoàn tiền', statuses: ['refund_pending', 'refunding'] },
  { key: 'refunded', label: 'Đã hoàn tiền', statuses: ['refunded'] },
];

export interface OrderFilter {
  kind: OrderKind | 'all';
  payment: PaymentFilterKey;
  /** Tìm theo mã đơn hoặc tên sản phẩm, không phân biệt hoa thường và dấu (mọi từ đều phải khớp). */
  query: string;
}

export const NO_ORDER_FILTER: OrderFilter = { kind: 'all', payment: 'all', query: '' };

export const isOrderFilterActive = (f: OrderFilter): boolean => f.kind !== 'all' || f.payment !== 'all' || f.query.trim() !== '';

export function filterOrders<T extends Pick<Order, 'id' | 'kind' | 'paymentStatus' | 'items'>>(orders: T[], f: OrderFilter): T[] {
  const statuses = PAYMENT_FILTERS.find((p) => p.key === f.payment)?.statuses;
  return orders.filter((o) => (f.kind === 'all' || o.kind === f.kind) && (!statuses || statuses.includes(o.paymentStatus)) && matchesSearch(f.query, [o.id, ...o.items.map((i) => i.name)]));
}

/** Sản phẩm của đơn Đã giao mà khách chưa đánh giá. */
export function itemsAwaitingReview(state: DemoState, order: Order): OrderItem[] {
  if (order.status !== 'delivered') return [];
  const reviewed = new Set(state.reviews.filter((r) => r.orderId === order.id).map((r) => r.productId));
  return order.items.filter((i) => !reviewed.has(i.productId));
}

/** Số đơn Đã giao còn sản phẩm chờ đánh giá. */
export const ordersAwaitingReview = (state: DemoState, orders: Order[]): Order[] => orders.filter((o) => itemsAwaitingReview(state, o).length > 0);

export interface RefundSummary {
  amount: number;
  status: RefundStatus;
  label: string;
}

/** Tổng tiền hoàn của đơn. Còn khoản nào chưa xong thì tính theo khoản chậm nhất (Chờ hoàn → Đang hoàn → Đã hoàn). */
export function refundSummary(state: DemoState, orderId: string): RefundSummary | null {
  const refunds = state.refunds.filter((r) => r.orderId === orderId);
  if (refunds.length === 0) return null;
  const order: RefundStatus[] = ['refund_pending', 'refunding', 'refunded'];
  const status = refunds.map((r) => r.status).sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];
  return { amount: refunds.reduce((s, r) => s + r.amount, 0), status, label: PAYMENT_STATUS_LABEL[status] };
}

export interface ReorderOutcome {
  state: DemoState;
  /** Sản phẩm đã thêm vào giỏ (mã sản phẩm). */
  added: string[];
  /** Sản phẩm không thêm được, kèm lý do. */
  skipped: { name: string; reason: string }[];
}

/**
 * "Mua lại": đưa các sản phẩm của đơn vào giỏ với số lượng như đơn cũ (bớt lại nếu không còn đủ).
 * Sản phẩm không còn bán, hết hàng hoặc trong giỏ đã đủ thì bỏ qua và nêu lý do. Giá trong giỏ là giá hiện tại.
 */
export function reorderToCart(state: DemoState, actor: Actor, orderId: string, at: Date): Result<ReorderOutcome> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  if (actor.kind !== 'customer' || actor.id !== order.customerId) return fail('Bạn chỉ mua lại được đơn của mình.');
  let next = state;
  const added: string[] = [];
  const skipped: { name: string; reason: string }[] = [];
  for (const item of order.items) {
    const product = findProduct(next, item.productId);
    if (!product || !isOrderableIn(next, product)) {
      skipped.push({ name: item.name, reason: 'không còn mở bán' });
      continue;
    }
    const inCart = (next.carts[order.customerId] ?? []).find((l) => l.productId === product.id)?.quantity ?? 0;
    const room = remainingFor(next, product) - inCart;
    if (room <= 0) {
      skipped.push({ name: item.name, reason: inCart > 0 ? 'trong giỏ đã đủ số còn lại' : 'đã hết hàng' });
      continue;
    }
    const r = addToCart(next, order.customerId, product.id, Math.min(item.quantity, room), at);
    if (!r.ok) {
      skipped.push({ name: item.name, reason: r.error.replace(/\.$/, '').toLowerCase() });
      continue;
    }
    next = r.value;
    added.push(product.id);
  }
  if (added.length === 0) return fail(`Không thêm được sản phẩm nào vào giỏ: ${skipped.map((s) => `${s.name} ${s.reason}`).join('; ')}.`);
  return ok({ state: next, added, skipped });
}

/**
 * "Có thể bạn cũng thích": sản phẩm đang mở bán mà khách chưa mua, ưu tiên điểm đánh giá cao (rồi theo tên).
 * Không dùng số lượng bán ra (dữ liệu mẫu không có số này).
 */
export function suggestedProducts(state: DemoState, customerId: string, limit: number): Product[] {
  const bought = new Set(state.orders.filter((o) => o.customerId === customerId).flatMap((o) => o.items.map((i) => i.productId)));
  const orderable = state.products.filter((p) => isOrderableIn(state, p) && remainingFor(state, p) > 0);
  const fresh = orderable.filter((p) => !bought.has(p.id));
  const pool = fresh.length > 0 ? fresh : orderable;
  // Tính điểm mỗi sản phẩm một lần trước khi sắp xếp.
  const score = new Map(pool.map((p) => [p.id, averageRating(state, p.id).average ?? 0]));
  const sorted = [...pool].sort((a, b) => score.get(b.id)! - score.get(a.id)! || a.name.localeCompare(b.name, 'vi') || a.price - b.price);
  // Mỗi sản phẩm một thẻ: các quy cách khác của cùng sản phẩm đã có trên thẻ đó.
  const seen = new Set<string>();
  return sorted.filter((p) => !seen.has(familyKey(p)) && !!seen.add(familyKey(p))).slice(0, limit);
}
