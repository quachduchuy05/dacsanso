/**
 * Tiện ích dùng chung cho các thao tác trên toàn bộ dữ liệu demo (DemoState).
 * Mọi thao tác là hàm thuần: nhận state cũ, trả về state mới hoặc lý do bị từ chối.
 */
import { generateId } from './ids';
import { availableStock, remainingSlots } from './stock';
import type { Actor, Address, AddressSnapshot, AuditLog, DemoState, LedgerEntry, Order, Product, Result, Ward } from './types';

export const HOUR_MS = 3_600_000;
export const MINUTE_MS = 60_000;
export const DAY_MS = 24 * HOUR_MS;

export const addMs = (at: Date, ms: number): Date => new Date(at.getTime() + ms);
export const iso = (at: Date): string => at.toISOString();

/** Ngày dạng yyyy-mm-dd theo giờ địa phương. */
export function toDateKey(at: Date): string {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
}

/** Đọc yyyy-mm-dd thành Date 00:00 giờ địa phương. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateKey(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

export function audit(state: DemoState, actor: Actor, action: string, target: string, at: Date, detail?: string): DemoState {
  // Ghi thao tác của Admin và HTX (mục 5.9), và của shipper. Nhật ký chỉ thêm, không sửa, không xoá.
  if (actor.kind !== 'admin' && actor.kind !== 'coop' && actor.kind !== 'shipper') return state;
  if (actor.id === 'seed') return state;
  const entry: AuditLog = { id: generateId('AUD'), at: iso(at), actor, action, target, detail };
  return { ...state, auditLogs: [entry, ...state.auditLogs] };
}

/** Ghi một dòng vào sổ giao dịch (chỉ thêm). */
export function addLedger(state: DemoState, entry: Omit<LedgerEntry, 'id' | 'at'>, at: Date): DemoState {
  if (entry.amount === 0) return state;
  return { ...state, ledgerEntries: [{ id: generateId('SO'), at: iso(at), ...entry }, ...state.ledgerEntries] };
}

export const findProduct = (state: DemoState, id: string): Product | undefined => state.products.find((p) => p.id === id);

/** Các địa danh trong vùng sản xuất, vd. "Sa Pa, Bát Xát" → ["Sa Pa", "Bát Xát"] (bộ lọc vùng, L9). */
export const regionsOf = (product: Pick<Product, 'region'>): string[] =>
  product.region.split(',').map((r) => r.trim()).filter(Boolean);

/** Sản phẩm mẫu chưa có giá khảo sát: giá đang hiện là "giá mẫu" (mục 9.3). */
export const isSamplePrice = (product: Pick<Product, 'sample'>): boolean => !!product.sample && !product.sample.surveyedPrice;
export const findOrder = (state: DemoState, id: string): Order | undefined => state.orders.find((o) => o.id === id);
export const findWard = (state: DemoState, id: string): Ward | undefined => state.wards.find((w) => w.id === id);

export function replaceOrder(state: DemoState, order: Order): DemoState {
  return { ...state, orders: state.orders.map((o) => (o.id === order.id ? order : o)) };
}

export function updateOrders(state: DemoState, ids: string[], fn: (o: Order) => Order): DemoState {
  return { ...state, orders: state.orders.map((o) => (ids.includes(o.id) ? fn(o) : o)) };
}

/** Số còn lại có thể đặt: tồn khả dụng (mua sẵn) hoặc suất còn lại (đặt trước). */
export function remainingFor(state: DemoState, product: Product): number {
  if (state.availability?.[product.id] !== undefined) return state.availability[product.id];
  if (product.kind === 'preorder') return remainingSlots(product.preorder?.totalSlots ?? 0, product.id, state.orders);
  return availableStock(product.stockOnHand, product.id, state.orders);
}

export function addressText(address: Pick<Address, 'houseType' | 'street' | 'building' | 'unit'>, wardName: string): string {
  const parts =
    address.houseType === 'apartment'
      ? [`Toà ${address.building}, căn ${address.unit}`, address.street]
      : [address.street];
  return [...parts.filter(Boolean), wardName, 'Hà Nội'].join(', ');
}

export function snapshotAddress(state: DemoState, address: Address): AddressSnapshot {
  const ward = findWard(state, address.wardId);
  return {
    receiverName: address.receiverName,
    receiverPhone: address.receiverPhone,
    text: addressText(address, ward?.name ?? ''),
    wardName: ward?.name ?? '',
    distanceKm: ward?.distanceKm ?? Number.POSITIVE_INFINITY,
  };
}

/** Che số tài khoản: chỉ hiện 4 số cuối (mục 5.9). */
export function maskAccount(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, '');
  return `**** ${digits.slice(-4)}`;
}

/** Che số điện thoại: chỉ hiện 3 số cuối. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits.slice(0, 2)}** *** ${digits.slice(-3)}`;
}

export type Op<I> = (state: DemoState, input: I, at: Date) => Result<DemoState>;
