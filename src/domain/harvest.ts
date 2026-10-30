/**
 * Xác nhận thu hoạch của HTX (chủ repo yêu cầu sau Giai đoạn 6).
 * Hàng đặt trước vào mùa: HTX thu hoạch xong thì xác nhận, khai ngày thu hoạch, ghi chú và ảnh lô hàng (không bắt buộc).
 * - Theo từng đơn: xác nhận cho một đơn đang Chờ thu hoạch.
 * - Theo cả lô: nhập sản lượng thu được; hàng chia cho các đơn theo thứ tự đặt (đơn đặt sớm nhận trước),
 *   dừng ở đơn đầu tiên không đủ hàng để không đơn đặt sau nào được chia trước đơn đặt sớm hơn.
 * Thu hoạch xong mọi sản phẩm của đơn thì HTX báo sẵn sàng giao (có thể báo luôn khi xác nhận).
 * Ngày thu hoạch, ghi chú và ảnh là thông tin HTX tự khai, sàn không kiểm chứng.
 */
import { generateId } from './ids';
import { coopReportReady } from './orders';
import { audit, findOrder, findProduct, formatDateKey, fromDateKey, iso, toDateKey, updateOrders } from './state';
import { fail, ok, type Actor, type DemoState, type HarvestRecord, type Order, type Result } from './types';

export const HARVEST_NOTE_MAX_LENGTH = 300;
export const HARVEST_PHOTO_MAX = 2;
export const HARVEST_QUANTITY_MAX = 100_000;

export const harvestsOf = (state: DemoState): HarvestRecord[] => state.harvests ?? [];
export const findHarvest = (state: DemoState, id: string): HarvestRecord | undefined => harvestsOf(state).find((h) => h.id === id);

/** Số lượng sản phẩm trong đơn. */
export const quantityIn = (order: Order, productId: string): number => order.items.filter((i) => i.productId === productId).reduce((s, i) => s + i.quantity, 0);

/** Mọi sản phẩm của đơn đã được xác nhận thu hoạch. */
export const fullyHarvested = (order: Order): boolean => order.items.every((i) => !!order.harvest?.[i.productId]);

/** Các lần thu hoạch đã chia hàng cho đơn, theo thứ tự sản phẩm trong đơn. */
export function harvestsForOrder(state: DemoState, order: Order): HarvestRecord[] {
  const ids = [...new Set(order.items.map((i) => order.harvest?.[i.productId]).filter((id): id is string => !!id))];
  return ids.map((id) => findHarvest(state, id)).filter((h): h is HarvestRecord => !!h);
}

/** Lần thu hoạch xác nhận gần nhất của sản phẩm. */
export function latestHarvest(state: DemoState, productId: string): HarvestRecord | undefined {
  return harvestsOf(state)
    .filter((h) => h.productId === productId)
    .reduce<HarvestRecord | undefined>((a, h) => (!a || h.confirmedAt > a.confirmedAt ? h : a), undefined);
}

/** Đơn đang Chờ thu hoạch có sản phẩm này mà chưa xác nhận thu hoạch, theo thứ tự đặt (đơn đặt sớm trước). */
export function ordersAwaitingHarvest(state: DemoState, productId: string): Order[] {
  return state.orders
    .filter((o) => o.status === 'awaiting_harvest' && !o.harvest?.[productId] && quantityIn(o, productId) > 0)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export interface HarvestAllocation {
  covered: Order[];
  uncovered: Order[];
  /** Sản lượng đã chia cho các đơn đủ hàng. */
  used: number;
  /** Tổng số lượng các đơn đang chờ cần. */
  needed: number;
}

/** Chia sản lượng cho các đơn theo thứ tự đặt; dừng ở đơn đầu tiên không đủ hàng. */
export function allocateHarvest(orders: Order[], productId: string, quantity: number): HarvestAllocation {
  const covered: Order[] = [];
  let used = 0;
  let i = 0;
  for (; i < orders.length; i++) {
    const q = quantityIn(orders[i], productId);
    if (used + q > quantity) break;
    used += q;
    covered.push(orders[i]);
  }
  return { covered, uncovered: orders.slice(i), used, needed: orders.reduce((s, o) => s + quantityIn(o, productId), 0) };
}

export interface HarvestInput {
  productId: string;
  /** Có thì xác nhận cho đúng đơn này (sản lượng = số lượng của đơn); không thì xác nhận cả lô theo `quantity`. */
  orderId?: string;
  /** Ngày thu hoạch, yyyy-mm-dd. */
  harvestedOn: string;
  quantity?: number;
  note: string;
  photos: string[];
  /** Báo sẵn sàng giao luôn cho các đơn đã thu hoạch đủ mọi sản phẩm. */
  reportReady: boolean;
}

export interface HarvestOutcome {
  state: DemoState;
  harvest: HarvestRecord;
  /** Đơn được chia hàng. */
  covered: string[];
  /** Đơn đang chờ mà lần này chưa đủ hàng. */
  uncovered: string[];
  /** Đơn đã báo sẵn sàng giao trong lần này. */
  ready: string[];
}

/** Kiểm tra phần HTX khai; hợp lệ thì trả null. */
export function harvestInputError(input: Pick<HarvestInput, 'harvestedOn' | 'note' | 'photos'>, at: Date): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.harvestedOn) || toDateKey(fromDateKey(input.harvestedOn)) !== input.harvestedOn) return 'Chọn ngày thu hoạch.';
  if (input.harvestedOn > toDateKey(at)) return 'Ngày thu hoạch không được sau hôm nay.';
  if (input.note.trim().length > HARVEST_NOTE_MAX_LENGTH) return `Ghi chú tối đa ${HARVEST_NOTE_MAX_LENGTH} ký tự.`;
  if (input.photos.length > HARVEST_PHOTO_MAX) return `Tối đa ${HARVEST_PHOTO_MAX} ảnh.`;
  return null;
}

/** HTX xác nhận thu hoạch xong một sản phẩm đặt trước, cho một đơn hoặc cả lô đơn đang chờ. */
export function coopConfirmHarvest(state: DemoState, actor: Actor, input: HarvestInput, at: Date): Result<HarvestOutcome> {
  if (actor.kind !== 'coop' || !actor.id) return fail('Chỉ HTX được xác nhận thu hoạch.');
  const product = findProduct(state, input.productId);
  if (!product || product.coopId !== actor.id) return fail('HTX chỉ được xác nhận thu hoạch sản phẩm của HTX mình.');
  if (product.kind !== 'preorder') return fail('Chỉ xác nhận thu hoạch cho hàng đặt trước.');
  const invalid = harvestInputError(input, at);
  if (invalid) return fail(invalid);

  const waiting = ordersAwaitingHarvest(state, product.id);
  let covered: Order[];
  let uncovered: Order[];
  let quantity: number;
  if (input.orderId) {
    const order = findOrder(state, input.orderId);
    if (!order || order.coopId !== actor.id) return fail('HTX chỉ được thao tác đơn của HTX mình.');
    if (order.harvest?.[product.id]) return fail('Đơn đã được xác nhận thu hoạch sản phẩm này.');
    if (!waiting.some((o) => o.id === order.id)) return fail('Chỉ xác nhận thu hoạch cho đơn đang Chờ thu hoạch có sản phẩm này.');
    covered = [order];
    uncovered = waiting.filter((o) => o.id !== order.id);
    quantity = quantityIn(order, product.id);
  } else {
    if (waiting.length === 0) return fail('Không có đơn nào đang chờ thu hoạch sản phẩm này.');
    const q = input.quantity ?? 0;
    if (!Number.isInteger(q) || q < 1) return fail('Nhập sản lượng thu hoạch (số nguyên, ít nhất 1).');
    if (q > HARVEST_QUANTITY_MAX) return fail(`Sản lượng tối đa ${HARVEST_QUANTITY_MAX.toLocaleString('vi-VN')}.`);
    const alloc = allocateHarvest(waiting, product.id, q);
    if (alloc.covered.length === 0) {
      return fail(`Sản lượng chưa đủ cho đơn đặt sớm nhất (cần ${quantityIn(waiting[0], product.id)} ${product.unit}).`);
    }
    covered = alloc.covered;
    uncovered = alloc.uncovered;
    quantity = q;
  }

  const harvest: HarvestRecord = {
    id: generateId('TH'),
    coopId: actor.id,
    productId: product.id,
    productName: product.name,
    unit: product.unit,
    harvestedOn: input.harvestedOn,
    quantity,
    note: input.note.trim(),
    photos: input.photos.slice(0, HARVEST_PHOTO_MAX),
    orderIds: covered.map((o) => o.id),
    confirmedAt: iso(at),
    confirmedBy: actor.name ?? actor.id,
  };
  let next: DemoState = { ...state, harvests: [harvest, ...harvestsOf(state)] };
  next = updateOrders(next, harvest.orderIds, (o) => ({ ...o, harvest: { ...o.harvest, [product.id]: harvest.id } }));
  next = audit(next, actor, 'Xác nhận thu hoạch', product.id, at, `${harvest.orderIds.length} đơn · ngày ${formatDateKey(harvest.harvestedOn)} · ${quantity} ${product.unit}`);

  const ready: string[] = [];
  if (input.reportReady) {
    for (const id of harvest.orderIds) {
      const o = findOrder(next, id)!;
      if (!fullyHarvested(o) || o.readyReportedAt) continue;
      const r = coopReportReady(next, id, actor, at);
      if (!r.ok) return r;
      next = r.value;
      ready.push(id);
    }
  }
  return ok({ state: next, harvest, covered: harvest.orderIds, uncovered: uncovered.map((o) => o.id), ready });
}
