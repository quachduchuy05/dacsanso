/**
 * Sản phẩm bán chạy của một HTX (chủ repo yêu cầu sau Giai đoạn 6).
 * Tính từ đơn thật trong dữ liệu, không có số liệu mẫu riêng.
 * - Tính các đơn khách đã đặt xong (đã thanh toán hoặc COD) và chưa huỷ / trả hàng.
 * - Mốc thời gian: lúc tạo đơn, theo đồng hồ demo.
 * - Tiền hàng = giá bán × số lượng (ưu đãi do sàn chịu, phí giao không tính).
 */
import type { DemoState, OrderStatus } from './types';

/** Trạng thái được tính vào số liệu bán hàng. */
export const SOLD_STATUSES: OrderStatus[] = ['awaiting_confirmation', 'confirmed', 'awaiting_harvest', 'preparing', 'shipping', 'delivered'];

export type SalesRange = '7d' | '30d' | 'all';
export type SalesMetric = 'quantity' | 'revenue';

export const SALES_RANGE_LABEL: Record<SalesRange, string> = { '7d': '7 ngày', '30d': '30 ngày', all: 'Tất cả' };
export const SALES_METRIC_LABEL: Record<SalesMetric, string> = { quantity: 'Số lượng', revenue: 'Tiền hàng' };

const RANGE_DAYS: Record<SalesRange, number | null> = { '7d': 7, '30d': 30, all: null };

export interface ProductSales {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  revenue: number;
  /** Số đơn có sản phẩm này. */
  orders: number;
}

export interface CoopSales {
  rows: ProductSales[];
  totals: { revenue: number; orders: number; products: number };
  /** Sản phẩm đang bán của HTX mà chưa có đơn trong khoảng thời gian. */
  unsold: number;
}

/** Xếp hạng sản phẩm của HTX theo số lượng hoặc tiền hàng trong khoảng thời gian (tính tới `now`). */
export function coopBestSellers(state: DemoState, coopId: string, range: SalesRange, metric: SalesMetric, now: Date): CoopSales {
  const days = RANGE_DAYS[range];
  const since = days === null ? '' : new Date(now.getTime() - days * 86_400_000).toISOString();
  const until = now.toISOString();
  const orders = state.orders.filter((o) => o.coopId === coopId && SOLD_STATUSES.includes(o.status) && o.createdAt >= since && o.createdAt <= until);

  const byProduct = new Map<string, ProductSales>();
  for (const o of orders) {
    for (const item of o.items) {
      const row = byProduct.get(item.productId) ?? { productId: item.productId, name: item.name, unit: item.unit, quantity: 0, revenue: 0, orders: 0 };
      row.quantity += item.quantity;
      row.revenue += item.unitPrice * item.quantity;
      row.orders += 1;
      byProduct.set(item.productId, row);
    }
  }
  const key = metric === 'quantity' ? 'quantity' : 'revenue';
  const other = metric === 'quantity' ? 'revenue' : 'quantity';
  const rows = [...byProduct.values()].sort((a, b) => b[key] - a[key] || b[other] - a[other] || a.name.localeCompare(b.name, 'vi'));
  const active = state.products.filter((p) => p.coopId === coopId && p.status === 'active');
  return {
    rows,
    totals: { revenue: rows.reduce((s, r) => s + r.revenue, 0), orders: orders.length, products: rows.length },
    unsold: active.filter((p) => !byProduct.has(p.id)).length,
  };
}
