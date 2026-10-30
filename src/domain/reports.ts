/**
 * Xuất báo cáo tổng hợp (FR-BCTK-02, 03): không có dữ liệu cá nhân của khách.
 * Trả về nội dung CSV (UTF-8, có BOM để Excel đọc đúng tiếng Việt).
 */
import { regulatorOrderRows } from './access';
import { aggregateStats } from './stats';
import { fail, ok, ORDER_STATUS_LABEL, ORDER_STATUSES, type Actor, type DemoState, type Result } from './types';

const cell = (v: string | number): string => {
  const raw = String(v);
  const s = /^[\s\u0000-\u001f]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: (string | number)[][]): string => '﻿' + rows.map((r) => r.map(cell).join(',')).join('\n');

export type ReportKind = 'summary' | 'orders';

export function exportReport(state: DemoState, actor: Actor, kind: ReportKind, at: Date): Result<{ filename: string; content: string }> {
  if (actor.kind !== 'regulator' && actor.kind !== 'admin') return fail('Bạn không có quyền xuất báo cáo.');
  const stamp = at.toISOString().slice(0, 10);
  if (kind === 'summary') {
    const s = aggregateStats(state,at);
    const rows: (string | number)[][] = [
      ['Chỉ tiêu', 'Giá trị'],
      ['HTX đang hoạt động', s.coopsActive],
      ['Sản phẩm đang bán', s.productsActive],
      ['Sản phẩm có chứng nhận đã xác minh còn hiệu lực',s.productsVerified],
      ['Tổng số đơn', s.ordersTotal],
      ['Giá trị hàng đã giao (đồng)', s.deliveredGoodsValue],
      ['Khiếu nại đang mở', s.ticketsOpen],
      [],
      ['Trạng thái đơn', 'Số đơn'],
      ...ORDER_STATUSES.map((st) => [ORDER_STATUS_LABEL[st], s.ordersByStatus[st]]),
      [],
      ['Vùng', 'Số đơn', 'Hàng đã giao (đồng)'],
      ...s.byRegion.map((r) => [r.region, r.orders, r.deliveredGoodsValue]),
      [],
      ['HTX', 'Số đơn', 'Hàng đã giao (đồng)'],
      ...s.byCoop.map((c) => [c.coopName, c.orders, c.deliveredGoodsValue]),
    ];
    return ok({ filename: `bao-cao-tong-hop-${stamp}.csv`, content: csv(rows) });
  }
  const r = regulatorOrderRows(state, actor);
  if (!r.ok) return r;
  const rows: (string | number)[][] = [['Ngày', 'HTX', 'Vùng', 'Trạng thái', 'Tiền hàng (đồng)'], ...r.value.map((o) => [o.createdDate, o.coopName, o.region, ORDER_STATUS_LABEL[o.status], o.itemsTotal])];
  return ok({ filename: `don-hang-an-danh-${stamp}.csv`, content: csv(rows) });
}
