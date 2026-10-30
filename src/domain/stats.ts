/**
 * Số liệu tổng hợp tính từ dữ liệu trong store (L17, FR-BCTK-01).
 * Bản cho Cơ quan QLNN không chứa tên, SĐT, địa chỉ, tài khoản của khách.
 */
import { isTicketOpen } from './complaint';
import { SOLD_STATUSES } from './salesStats';
import { addMs, DAY_MS, findProduct, toDateKey } from './state';
import { ORDER_STATUSES, type ComplaintReason, type DemoState, type OrderStatus } from './types';

export interface AggregateStats {
  coopsActive: number;
  productsActive: number;
  productsVerified: number;
  ordersTotal: number;
  ordersByStatus: Record<OrderStatus, number>;
  deliveredGoodsValue: number;
  ticketsOpen: number;
  ticketsHighPriority: number;
  byRegion: { region: string; orders: number; deliveredGoodsValue: number }[];
  byCoop: { coopName: string; orders: number; deliveredGoodsValue: number }[];
}

export function aggregateStats(state: DemoState,at=new Date(Date.now()+(state.clockOffsetMs??0))): AggregateStats {
  const ordersByStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  const region = new Map<string, { orders: number; deliveredGoodsValue: number }>();
  const coop = new Map<string, { orders: number; deliveredGoodsValue: number }>();
  let deliveredGoodsValue = 0;
  for (const o of state.orders) {
    ordersByStatus[o.status]++;
    const delivered = o.status === 'delivered' ? o.pricing.itemsTotal : 0;
    deliveredGoodsValue += delivered;
    const r = findProduct(state, o.items[0]?.productId ?? '')?.region ?? 'Khác';
    const rv = region.get(r) ?? { orders: 0, deliveredGoodsValue: 0 };
    region.set(r, { orders: rv.orders + 1, deliveredGoodsValue: rv.deliveredGoodsValue + delivered });
    const cv = coop.get(o.coopName) ?? { orders: 0, deliveredGoodsValue: 0 };
    coop.set(o.coopName, { orders: cv.orders + 1, deliveredGoodsValue: cv.deliveredGoodsValue + delivered });
  }
  return {
    coopsActive: state.coops.filter((c) => c.status === 'active').length,
    productsActive: state.products.filter((p) => p.status === 'active').length,
    productsVerified:state.products.filter(p=>p.status==='active'&&p.certifications?.some(c=>c.verified&&c.validUntil>=at.toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}))).length,
    ordersTotal: state.orders.length,
    ordersByStatus,
    deliveredGoodsValue,
    ticketsOpen: state.tickets.filter(isTicketOpen).length,
    ticketsHighPriority: state.tickets.filter((t) => isTicketOpen(t) && t.priority === 'high').length,
    byRegion: [...region].map(([k, v]) => ({ region: k, ...v })).sort((a, b) => b.orders - a.orders),
    byCoop: [...coop].map(([k, v]) => ({ coopName: k, ...v })).sort((a, b) => b.orders - a.orders),
  };
}

// ---------- Biểu đồ ở Tổng quan (góp ý kiểm thử: thêm biểu đồ để trực quan dữ liệu hơn) ----------

export type StatsRange = '7d' | '30d' | 'all';
export type StatsMetric = 'orders' | 'goods';

export const STATS_RANGE_LABEL: Record<StatsRange, string> = { '7d': '7 ngày', '30d': '30 ngày', all: 'Tất cả' };
export const STATS_METRIC_LABEL: Record<StatsMetric, string> = { orders: 'Số đơn', goods: 'Tiền hàng' };

/** "Tất cả" vẽ tối đa 90 ngày gần nhất ở biểu đồ theo ngày (các biểu đồ khác vẫn tính toàn bộ). */
export const MAX_TREND_DAYS = 90;

export interface Bucket {
  key: string;
  label: string;
  orders: number;
  /** Tiền hàng của đơn đã đặt xong, không huỷ / trả hàng (như số liệu Bán chạy của HTX). */
  goods: number;
}

export interface PeriodStats {
  /** Số đơn và tiền hàng theo ngày (cũ trước), mỗi ngày một cột kể cả ngày không có đơn. */
  daily: Bucket[];
  byStatus: { status: OrderStatus; orders: number }[];
  byCoop: Bucket[];
  byRegion: Bucket[];
  ticketsByReason: { reason: ComplaintReason; tickets: number; open: number }[];
  totals: { orders: number; goods: number; tickets: number };
}

/** Số liệu trong khoảng thời gian (tính tới `now`), theo ngày tạo đơn / ticket. Không có dữ liệu cá nhân của khách. */
export function periodStats(state: DemoState, range: StatsRange, now: Date): PeriodStats {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const since = days === null ? null : addMs(today, -(days - 1) * DAY_MS);
  const inRange = (isoAt: string) => (!since || new Date(isoAt).getTime() >= since.getTime()) && new Date(isoAt).getTime() <= now.getTime();
  const orders = state.orders.filter((o) => inRange(o.createdAt));
  const goodsOf = (o: (typeof orders)[number]) => (SOLD_STATUSES.includes(o.status) ? o.pricing.itemsTotal : 0);

  // Theo ngày: từ đầu khoảng (hoặc ngày có đơn đầu tiên, tối đa 90 ngày) tới hôm nay.
  const first = orders.reduce<Date | null>((m, o) => {
    const d = new Date(o.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return !m || day < m ? day : m;
  }, null);
  const startDay = since ?? (first && first > addMs(today, -(MAX_TREND_DAYS - 1) * DAY_MS) ? first : addMs(today, -(MAX_TREND_DAYS - 1) * DAY_MS));
  const daily: Bucket[] = [];
  for (let d = startDay; d <= today; d = addMs(d, DAY_MS)) {
    const key = toDateKey(d);
    daily.push({ key, label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, orders: 0, goods: 0 });
  }
  const byDay = new Map(daily.map((b) => [b.key, b]));
  const coop = new Map<string, Bucket>();
  const region = new Map<string, Bucket>();
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const o of orders) {
    const g = goodsOf(o);
    const day = byDay.get(toDateKey(new Date(o.createdAt)));
    if (day) {
      day.orders++;
      day.goods += g;
    }
    byStatus[o.status]++;
    const c = coop.get(o.coopId) ?? { key: o.coopId, label: o.coopName, orders: 0, goods: 0 };
    coop.set(o.coopId, { ...c, orders: c.orders + 1, goods: c.goods + g });
    const r = findProduct(state, o.items[0]?.productId ?? '')?.region ?? 'Khác';
    const rv = region.get(r) ?? { key: r, label: r, orders: 0, goods: 0 };
    region.set(r, { ...rv, orders: rv.orders + 1, goods: rv.goods + g });
  }
  const tickets = state.tickets.filter((t) => inRange(t.createdAt));
  const reasons = new Map<ComplaintReason, { tickets: number; open: number }>();
  for (const t of tickets) {
    const v = reasons.get(t.reason) ?? { tickets: 0, open: 0 };
    reasons.set(t.reason, { tickets: v.tickets + 1, open: v.open + (isTicketOpen(t) ? 1 : 0) });
  }
  const sortBuckets = (m: Map<string, Bucket>) => [...m.values()].sort((a, b) => b.orders - a.orders || b.goods - a.goods || a.label.localeCompare(b.label, 'vi'));
  return {
    daily,
    byStatus: ORDER_STATUSES.map((status) => ({ status, orders: byStatus[status] })),
    byCoop: sortBuckets(coop),
    byRegion: sortBuckets(region),
    ticketsByReason: [...reasons].map(([reason, v]) => ({ reason, ...v })).sort((a, b) => b.tickets - a.tickets),
    totals: { orders: orders.length, goods: orders.reduce((s, o) => s + goodsOf(o), 0), tickets: tickets.length },
  };
}
