/**
 * Tồn kho và suất đặt trước (mục 5.6).
 *
 * - Tồn khả dụng = tồn kho − số đang giữ (BR-TON-04, đề xuất của SRS).
 * - Số đang giữ gồm mọi đơn chưa huỷ và chưa bàn giao vận chuyển; khi bàn giao thì trừ hẳn khỏi tồn kho.
 * - Thêm vào giỏ không giữ hàng. Huỷ đơn hoặc hết hạn thanh toán thì nhả ngay.
 * - Suất đặt trước: trừ khi đơn vào Chờ thanh toán, trả lại khi đơn huỷ hoặc hết hạn.
 */
import { fail, ok, type OrderKind, type OrderStatus, type Result } from './types';

export interface HoldingOrder {
  status: OrderStatus;
  kind: OrderKind;
  items: { productId: string; quantity: number }[];
}

/** Trạng thái còn giữ hàng: chưa huỷ và chưa bàn giao vận chuyển. */
const HOLDING_STATUSES: OrderStatus[] = [
  'awaiting_payment',
  'awaiting_confirmation',
  'confirmed',
  'awaiting_harvest',
  'preparing',
];

export const isHolding = (status: OrderStatus): boolean => HOLDING_STATUSES.includes(status);

const sumQuantity = (orders: HoldingOrder[], productId: string): number =>
  orders.reduce(
    (sum, o) => sum + o.items.filter((i) => i.productId === productId).reduce((s, i) => s + i.quantity, 0),
    0,
  );

/** Số đang giữ của một sản phẩm mua sẵn. */
export function heldQuantity(productId: string, orders: HoldingOrder[]): number {
  return sumQuantity(
    orders.filter((o) => o.kind === 'ready' && isHolding(o.status)),
    productId,
  );
}

/** Tồn khả dụng = tồn kho − số đang giữ, không âm. */
export function availableStock(stockOnHand: number, productId: string, orders: HoldingOrder[]): number {
  return Math.max(0, stockOnHand - heldQuantity(productId, orders));
}

/** Số suất đặt trước đã giữ: mọi đơn đặt trước chưa huỷ (kể cả đã giao). */
export function reservedSlots(productId: string, orders: HoldingOrder[]): number {
  return sumQuantity(
    orders.filter((o) => o.kind === 'preorder' && o.status !== 'cancelled'),
    productId,
  );
}

export function remainingSlots(totalSlots: number, productId: string, orders: HoldingOrder[]): number {
  return Math.max(0, totalSlots - reservedSlots(productId, orders));
}

/** Kiểm tra số lượng muốn đặt so với số còn lại (tồn khả dụng hoặc suất còn lại). */
export function validateQuantity(requested: number, remaining: number): Result<number> {
  if (!Number.isInteger(requested) || requested < 1) return fail('Số lượng phải từ 1 trở lên.');
  if (remaining <= 0) return fail('Sản phẩm đã hết hàng.');
  if (requested > remaining) return fail(`Chỉ còn ${remaining}. Vui lòng giảm số lượng.`);
  return ok(requested);
}

/** HTX không được đặt tồn kho nhỏ hơn số đang giữ. */
export function validateStockUpdate(newStock: number, held: number): Result<number> {
  if (!Number.isInteger(newStock) || newStock < 0) return fail('Tồn kho phải là số nguyên không âm.');
  if (newStock < held) return fail(`Tồn kho không được nhỏ hơn số đang giữ cho đơn (${held}).`);
  return ok(newStock);
}

/** Tồn khả dụng dưới hoặc bằng ngưỡng (PAR-02) thì cảnh báo tồn thấp. */
export const isLowStock = (available: number, threshold: number): boolean => available <= threshold;
