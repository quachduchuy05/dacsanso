/**
 * Kiểm quyền đọc dữ liệu (mục 5.9). Kiểm trong hàm domain, không chỉ ẩn nút trên giao diện.
 * - HTX chỉ thấy dữ liệu của HTX mình.
 * - QLNN chỉ thấy số liệu tổng hợp; không thấy tên, SĐT, địa chỉ, tài khoản của khách; không xem nhật ký.
 * - Tài khoản ngân hàng của khách luôn hiện dạng che; chỉ Admin – Tài chính xem đầy đủ.
 */
import { findOrder, findProduct, maskAccount } from './state';
import { fail, ok, type Actor, type AuditLog, type BankAccount, type DemoState, type Order, type OrderStatus, type Result, type Ticket } from './types';

export function canReadOrder(actor: Actor, order: Order): boolean {
  if (actor.kind === 'customer') return actor.id === order.customerId;
  if (actor.kind === 'coop') return actor.id === order.coopId;
  // Shipper chỉ thấy đơn được giao cho mình (domain/shipper.ts).
  if (actor.kind === 'shipper') return !!actor.id && order.shipment?.shipperId === actor.id;
  return actor.kind === 'admin';
}

export function getOrderFor(state: DemoState, actor: Actor, orderId: string): Result<Order> {
  const order = findOrder(state, orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  if (actor.kind === 'regulator') return fail('Cơ quan QLNN chỉ xem số liệu tổng hợp, không xem chi tiết đơn.');
  if (!canReadOrder(actor, order)) return fail('Bạn không có quyền xem đơn này.');
  return ok(order);
}

export function listOrdersFor(state: DemoState, actor: Actor): Result<Order[]> {
  if (actor.kind === 'regulator') return fail('Cơ quan QLNN chỉ xem số liệu tổng hợp, không xem chi tiết đơn.');
  if (!['customer', 'coop', 'admin', 'shipper'].includes(actor.kind)) return fail('Bạn không có quyền xem danh sách đơn.');
  return ok(state.orders.filter((o) => canReadOrder(actor, o)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export function listTicketsFor(state: DemoState, actor: Actor): Result<Ticket[]> {
  if (actor.kind === 'customer') return ok(state.tickets.filter((t) => t.customerId === actor.id));
  if (actor.kind === 'coop') return ok(state.tickets.filter((t) => t.coopId === actor.id));
  if (actor.kind === 'admin') return ok(state.tickets);
  return fail('Bạn không có quyền xem khiếu nại.');
}

/** Dòng đơn cho Cơ quan QLNN và Admin: chỉ HTX, vùng, trạng thái, giá trị, ngày; không có dữ liệu cá nhân của khách. */
export interface AnonymousOrderRow {
  coopName: string;
  region: string;
  status: OrderStatus;
  itemsTotal: number;
  createdDate: string;
}

export function regulatorOrderRows(state: DemoState, actor: Actor): Result<AnonymousOrderRow[]> {
  if (actor.kind !== 'regulator' && actor.kind !== 'admin') return fail('Bạn không có quyền xem số liệu tổng hợp.');
  return ok(
    state.orders.map((o) => ({
      coopName: o.coopName,
      region: findProduct(state, o.items[0]?.productId ?? '')?.region ?? 'Khác',
      status: o.status,
      itemsTotal: o.pricing.itemsTotal,
      createdDate: o.createdAt.slice(0, 10),
    })),
  );
}

/** Nhật ký chỉ Quản trị gốc xem được (FR-HT-03). Không sửa, không xoá. */
export function readAuditLogs(state: DemoState, actor: Actor): Result<AuditLog[]> {
  if (actor.kind !== 'admin' || actor.adminGroup !== 'root') return fail('Chỉ Quản trị gốc được xem nhật ký.');
  return ok(state.auditLogs);
}

/** Tài khoản nhận hoàn của khách: hiện dạng che, trừ Admin – Tài chính. */
export function viewRefundAccount(state: DemoState, actor: Actor, customerId: string): Result<BankAccount | null> {
  const customer = state.customers.find((c) => c.id === customerId);
  if (!customer) return fail('Không tìm thấy khách hàng.');
  const ownerOrFinance = (actor.kind === 'customer' && actor.id === customerId) || (actor.kind === 'admin' && actor.adminGroup === 'finance');
  if (!ownerOrFinance) return fail('Bạn không có quyền xem tài khoản của khách.');
  const acc = customer.refundAccount;
  if (!acc) return ok(null);
  const full = actor.kind === 'admin' && actor.adminGroup === 'finance';
  return ok(full ? acc : { ...acc, accountNumber: maskAccount(acc.accountNumber) });
}
