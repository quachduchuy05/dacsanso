/**
 * Giỏ hàng và kiểm tra lại trước khi đặt (BR-DAT-03, BR-DAT-08).
 * Thêm vào giỏ không giữ hàng; số lượng được kiểm tra lại khi mở màn Đặt hàng và khi bấm Đặt hàng.
 */
import type { Params } from './params';
import { addMs, DAY_MS, findProduct, fromDateKey, remainingFor, toDateKey } from './state';
import { fail, ok, type CartLine, type DemoState, type Product, type Result } from './types';

export interface DeliveryWindow {
  /** Ngày giao sớm nhất được chọn (yyyy-mm-dd): max(ngày HTX khai, hôm nay + PAR-08). */
  min: string;
  max: string;
}

/** Khoảng ngày giao D hợp lệ của sản phẩm đặt trước; null nếu không còn ngày nào hợp lệ. */
export function deliveryWindow(product: Product, now: Date, params: Pick<Params, 'preorderMinLeadDays'>): DeliveryWindow | null {
  const cfg = product.preorder;
  if (!cfg) return null;
  const earliest = toDateKey(addMs(new Date(now.getFullYear(), now.getMonth(), now.getDate()), params.preorderMinLeadDays * DAY_MS));
  const min = cfg.deliveryFrom > earliest ? cfg.deliveryFrom : earliest;
  if (min > cfg.deliveryTo) return null;
  return { min, max: cfg.deliveryTo };
}

export function validateDeliveryDate(product: Product, date: string | undefined, now: Date, params: Pick<Params, 'preorderMinLeadDays'>): Result<string> {
  const win = deliveryWindow(product, now, params);
  if (!win) return fail(`${product.name}: đã hết thời gian nhận đặt trước.`);
  if (!date) return fail(`${product.name}: vui lòng chọn ngày giao.`);
  if (date < win.min || date > win.max) {
    return fail(`${product.name}: ngày giao phải từ ${fmt(win.min)} đến ${fmt(win.max)}.`);
  }
  return ok(date);
}

const fmt = (key: string) => fromDateKey(key).toLocaleDateString('vi-VN');

/** Sản phẩm có đang mở bán (đặt trước: đang mở Preorder; mua sẵn: đang hiển thị). */
export function isOrderable(product: Product): boolean {
  if (product.status !== 'active') return false;
  if (product.kind === 'preorder') return !!product.preorder?.open;
  return true;
}

/** Như isOrderable, thêm điều kiện HTX đang có quyền bán (FR-TK-13). */
export function isOrderableIn(state: DemoState, product: Product): boolean {
  const coop = state.coops.find((c) => c.id === product.coopId);
  return isOrderable(product) && coop?.status !== 'suspended';
}

export function addToCart(state: DemoState, customerId: string, productId: string, quantity: number, now: Date): Result<DemoState> {
  const product = findProduct(state, productId);
  if (!product || !isOrderableIn(state, product)) return fail('Sản phẩm hiện không mở bán.');
  if (!Number.isInteger(quantity) || quantity < 1) return fail('Số lượng phải từ 1 trở lên.');
  const remaining = remainingFor(state, product);
  const cart = state.carts[customerId] ?? [];
  const existing = cart.find((l) => l.productId === productId);
  const total = (existing?.quantity ?? 0) + quantity;
  if (remaining <= 0) return fail('Sản phẩm đã hết hàng.');
  if (total > remaining) return fail(`Chỉ còn ${remaining} ${product.unit}. Trong giỏ đã có ${existing?.quantity ?? 0}.`);

  let deliveryDate = existing?.deliveryDate;
  if (product.kind === 'preorder' && !deliveryDate) {
    deliveryDate = deliveryWindow(product, now, state.params)?.min;
    if (!deliveryDate) return fail('Đã hết thời gian nhận đặt trước.');
  }
  const line: CartLine = { productId, quantity: total, deliveryDate, seenPrice: existing?.seenPrice ?? product.price };
  const next = existing ? cart.map((l) => (l.productId === productId ? line : l)) : [...cart, line];
  return ok({ ...state, carts: { ...state.carts, [customerId]: next } });
}

export function setCartLine(state: DemoState, customerId: string, productId: string, patch: Partial<Pick<CartLine, 'quantity' | 'deliveryDate'>>): Result<DemoState> {
  const cart = state.carts[customerId] ?? [];
  const product = findProduct(state, productId);
  if (!product) return fail('Không tìm thấy sản phẩm.');
  if (patch.quantity !== undefined) {
    const remaining = remainingFor(state, product);
    if (patch.quantity < 1) return fail('Số lượng phải từ 1 trở lên.');
    if (patch.quantity > remaining) return fail(`Chỉ còn ${remaining} ${product.unit}.`);
  }
  const next = cart.map((l) => (l.productId === productId ? { ...l, ...patch } : l));
  return ok({ ...state, carts: { ...state.carts, [customerId]: next } });
}

export function removeCartLine(state: DemoState, customerId: string, productIds: string[]): DemoState {
  const cart = state.carts[customerId] ?? [];
  return { ...state, carts: { ...state.carts, [customerId]: cart.filter((l) => !productIds.includes(l.productId)) } };
}

export type RevalidationNotice =
  | { type: 'price_down'; productId: string; name: string; oldPrice: number; newPrice: number }
  | { type: 'price_up'; productId: string; name: string; oldPrice: number; newPrice: number }
  | { type: 'reduced'; productId: string; name: string; from: number; to: number }
  | { type: 'removed'; productId: string; name: string; reason: string };

export interface RevalidationResult {
  lines: CartLine[];
  notices: RevalidationNotice[];
  /** Có dòng tăng giá, khách phải xác nhận lại. */
  needsConfirmation: boolean;
}

/**
 * Kiểm tra lại các dòng đặt hàng (BR-DAT-03):
 * giá giảm thì áp giá mới và báo; giá tăng thì khách phải xác nhận lại; tồn ít hơn số đã chọn thì giảm và báo;
 * hết hàng thì bỏ dòng và báo.
 */
export function revalidateLines(state: DemoState, lines: CartLine[]): RevalidationResult {
  const notices: RevalidationNotice[] = [];
  const out: CartLine[] = [];
  for (const line of lines) {
    const product = findProduct(state, line.productId);
    if (!product || !isOrderableIn(state, product)) {
      notices.push({ type: 'removed', productId: line.productId, name: product?.name ?? 'Sản phẩm', reason: 'không còn mở bán' });
      continue;
    }
    const remaining = remainingFor(state, product);
    if (remaining <= 0) {
      notices.push({ type: 'removed', productId: product.id, name: product.name, reason: 'đã hết hàng' });
      continue;
    }
    let quantity = line.quantity;
    if (quantity > remaining) {
      notices.push({ type: 'reduced', productId: product.id, name: product.name, from: quantity, to: remaining });
      quantity = remaining;
    }
    let seenPrice = line.seenPrice;
    if (product.price < line.seenPrice) {
      // Giá giảm: áp giá mới và báo khách.
      notices.push({ type: 'price_down', productId: product.id, name: product.name, oldPrice: line.seenPrice, newPrice: product.price });
      seenPrice = product.price;
    } else if (product.price > line.seenPrice) {
      notices.push({ type: 'price_up', productId: product.id, name: product.name, oldPrice: line.seenPrice, newPrice: product.price });
    }
    out.push({ ...line, quantity, seenPrice });
  }
  return { lines: out, notices, needsConfirmation: notices.some((n) => n.type === 'price_up') };
}

/** Khách xác nhận giá mới: cập nhật giá đã thấy về giá hiện tại. */
export function acceptCurrentPrices(state: DemoState, lines: CartLine[]): CartLine[] {
  return lines.map((l) => ({ ...l, seenPrice: findProduct(state, l.productId)?.price ?? l.seenPrice }));
}
