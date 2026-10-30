/**
 * Đặt hàng (mục 5.1–5.4).
 *
 * - Chỉ khách hàng đã đăng nhập được đặt (BR-DAT-01).
 * - Tách đơn: mỗi đơn gồm hàng của một HTX và một loại đơn; đơn đặt trước tách thêm theo ngày giao (BR-DAT-02).
 *   Mỗi đơn tính phí giao riêng.
 * - Thứ tự tính mã ưu đãi (BR-KM): cộng tiền hàng hợp lệ → tính số giảm → chia vào từng đơn → cộng phí → tính cọc.
 * - Đơn lưu bản chốt lúc tạo (BR-DAT-06). Một lần bấm chỉ tạo một lần đặt (BR-DAT-07).
 */
import { isOrderableIn, revalidateLines, validateDeliveryDate, type RevalidationNotice } from './cart';
import { generateId, generateOrderCode } from './ids';
import { normalizeInvoice, validateInvoice } from './invoice';
import { initialStatus } from './orderStateMachine';
import { isValidPhone, normalizePhone, PHONE_RULE } from './phone';
import { snapshotParams } from './params';
import {
  allocateDiscount,
  checkExpress,
  priceOrder,
  totalCheckout,
  type CheckoutTotals,
  type ExpressAvailability,
  type OrderPricing,
  type PaymentMethod,
} from './pricing';
import { depositRefundDeadline } from './refund';
import { addMs, findProduct, findWard, fromDateKey, iso, MINUTE_MS, HOUR_MS, remainingFor, snapshotAddress } from './state';
import {
  type Actor,
  type AddressSnapshot,
  type CartLine,
  type Checkout,
  type CompanyInvoice,
  type DemoState,
  type GiftOption,
  type GiftRecipient,
  type Order,
  type OrderItem,
  type OrderKind,
  type Transaction,
  type VoucherUsage,
} from './types';
import { evaluateVoucher, isLineEligible, type Voucher, type VoucherLine } from './voucher';

export interface GiftChoice {
  boxTypeId: string;
  message: string;
  sendToOther: boolean;
  recipient?: GiftRecipient;
}

export interface GroupOptions {
  shipping: 'standard' | 'express';
  /** Mua sẵn: cách trả cả đơn. Đặt trước: cách trả phần còn lại. */
  paymentMethod: PaymentMethod;
  gift?: GiftChoice;
}

export interface CheckoutInput {
  customerId: string;
  lines: CartLine[];
  addressId: string;
  voucherId?: string;
  note: string;
  /** Tuỳ chọn theo từng đơn, khoá là groupKey(). */
  groupOptions: Record<string, GroupOptions>;
  /** Yêu cầu xuất hoá đơn công ty (mô phỏng, domain/invoice.ts); áp cho mọi đơn của lần đặt. */
  invoice?: CompanyInvoice;
}

export interface PlannedOrder {
  key: string;
  coopId: string;
  coopName: string;
  kind: OrderKind;
  deliveryDate?: string;
  items: OrderItem[];
  eligibleAmount: number;
  shipping: 'standard' | 'express';
  express: ExpressAvailability;
  gift?: GiftOption;
  address: AddressSnapshot;
  paymentMethod: PaymentMethod;
  codAllowed: boolean;
  codBlockedReason?: string;
  pricing: OrderPricing;
  cancelPolicy?: string;
}

export interface CheckoutPlan {
  orders: PlannedOrder[];
  totals: CheckoutTotals;
  voucher?: Voucher;
  voucherDiscount: number;
  voucherError?: string;
  /** Lỗi chặn đặt hàng. */
  errors: string[];
  hasPreorder: boolean;
}

export const groupKey = (coopId: string, kind: OrderKind, deliveryDate?: string): string =>
  `${coopId}|${kind}|${kind === 'preorder' ? deliveryDate ?? '' : ''}`;

const URL_RE = /(https?:\/\/|www\.|\.(com|vn|net|org)\b)/i;
const PHONE_IN_TEXT_RE = /(\d[\s.-]?){9,}/;

/** Lời nhắn hộp quà: không bắt buộc, tối đa PAR-22 ký tự, không chứa link hay số điện thoại (BR-DAT-09). */
export function validateGiftMessage(message: string, maxLength: number): string | null {
  if (message.length > maxLength) return `Lời nhắn tối đa ${maxLength} ký tự.`;
  if (URL_RE.test(message)) return 'Lời nhắn không được chứa đường link.';
  if (PHONE_IN_TEXT_RE.test(message)) return 'Lời nhắn không được chứa số điện thoại.';
  return null;
}

function validateRecipient(state: DemoState, r: GiftRecipient | undefined): string | null {
  if (!r) return 'Vui lòng nhập thông tin người nhận quà.';
  if (!r.name.trim()) return 'Vui lòng nhập tên người nhận quà.';
  if (!isValidPhone(normalizePhone(r.phone))) return `SĐT người nhận quà không hợp lệ. ${PHONE_RULE}`;
  if (!findWard(state, r.wardId)) return 'Vui lòng chọn phường/xã (Hà Nội) của người nhận.';
  if (!r.street.trim()) return 'Vui lòng nhập số nhà, đường của người nhận.';
  return null;
}

export function preorderCancelPolicy(deliveryDate: string, minLeadDays: number, depositPercent: number): string {
  const deadline = depositRefundDeadline(fromDateKey(deliveryDate), minLeadDays);
  return (
    `Cọc ${depositPercent}%. Huỷ đến hết 23:59 ngày ${deadline.toLocaleDateString('vi-VN')} được hoàn 100% tiền cọc; ` +
    'sau mốc này không hoàn cọc. HTX từ chối, quá hạn xác nhận hoặc không cung cấp được hàng thì hoàn 100%.'
  );
}

function voucherLinesOf(state: DemoState, items: { productId: string; amount: number }[]): VoucherLine[] {
  return items.map((i) => {
    const p = findProduct(state, i.productId);
    return { productId: i.productId, category: p?.category ?? '', coopId: p?.coopId ?? '', amount: i.amount };
  });
}

/** Số lượt mã đang giữ hoặc đã dùng. */
export const voucherUsedCount = (state: DemoState, voucherId: string): number =>
  state.voucherUsages.filter((u) => u.voucherId === voucherId && u.status !== 'released').length;

/** Khách chưa có lần đặt nào (trừ các lần đặt đã huỷ hết). */
export const isFirstOrder = (state: DemoState, customerId: string): boolean =>
  !state.orders.some((o) => o.customerId === customerId && o.status !== 'cancelled');

export function evaluateVoucherFor(state: DemoState, voucher: Voucher, customerId: string, lines: CartLine[], at: Date) {
  const items = lines
    .map((l) => ({ productId: l.productId, amount: (findProduct(state, l.productId)?.price ?? 0) * l.quantity }))
    .filter((i) => i.amount > 0);
  return evaluateVoucher(voucher, {
    lines: voucherLinesOf(state, items),
    now: at,
    usedCount: voucherUsedCount(state, voucher.id),
    isFirstOrder: isFirstOrder(state, customerId),
  });
}

/** Lập kế hoạch đặt hàng: tách đơn và tính tiền từng đơn. Không thay đổi dữ liệu. */
export function planCheckout(state: DemoState, input: CheckoutInput, at: Date): CheckoutPlan {
  const params = state.params;
  const errors: string[] = [];
  const address = state.addresses.find((a) => a.id === input.addressId && a.customerId === input.customerId);
  if (!address) errors.push('Vui lòng chọn địa chỉ giao hàng tại Hà Nội.');
  const mainAddress = address ? snapshotAddress(state, address) : undefined;

  // 1. Gom dòng theo HTX + loại đơn (+ ngày giao với đơn đặt trước).
  const groups = new Map<string, { coopId: string; kind: OrderKind; deliveryDate?: string; items: OrderItem[] }>();
  for (const line of input.lines) {
    const product = findProduct(state, line.productId);
    if (!product) {
      errors.push('Có sản phẩm không còn tồn tại.');
      continue;
    }
    if (!isOrderableIn(state, product)) errors.push(`${product.name}: hiện không mở bán.`);
    const remaining = remainingFor(state, product);
    if (line.quantity > remaining) {
      errors.push(`${product.name}: chỉ còn ${remaining} ${product.unit}.`);
    }
    if (product.kind === 'preorder') {
      const d = validateDeliveryDate(product, line.deliveryDate, at, params);
      if (!d.ok) errors.push(d.error);
    }
    const key = groupKey(product.coopId, product.kind, line.deliveryDate);
    const group = groups.get(key) ?? { coopId: product.coopId, kind: product.kind, deliveryDate: product.kind === 'preorder' ? line.deliveryDate : undefined, items: [] };
    group.items.push({
      productId: product.id,
      name: product.name,
      unit: product.unit,
      unitPrice: product.price,
      quantity: line.quantity,
      category: product.category,
    });
    groups.set(key, group);
  }

  // 2. Mã ưu đãi: tối đa PAR-28 mã; chỉ giảm tiền hàng các dòng hợp lệ.
  let voucher: Voucher | undefined;
  let voucherError: string | undefined;
  let voucherDiscount = 0;
  const eligibleByGroup: { key: string; eligibleAmount: number }[] = [];
  if (input.voucherId) {
    voucher = state.vouchers.find((v) => v.id === input.voucherId);
    if (!voucher) {
      voucherError = 'Mã không tồn tại.';
    } else {
      const ev = evaluateVoucherFor(state, voucher, input.customerId, input.lines, at);
      if (ev.ok) voucherDiscount = ev.value.discount;
      else voucherError = ev.error;
    }
  }
  for (const [key, g] of groups) {
    const lines = voucherLinesOf(state, g.items.map((i) => ({ productId: i.productId, amount: i.unitPrice * i.quantity })));
    const eligible = voucher && !voucherError ? lines.filter((l) => isLineEligible(voucher!, l)).reduce((s, l) => s + l.amount, 0) : 0;
    eligibleByGroup.push({ key, eligibleAmount: eligible });
  }
  const allocation = allocateDiscount(voucherDiscount, eligibleByGroup);

  // 3. Từng đơn: phí giao, hoả tốc, hộp quà, phương thức thanh toán, tiền.
  const orders: PlannedOrder[] = [];
  for (const [key, g] of groups) {
    const opts: GroupOptions = input.groupOptions[key] ?? { shipping: 'standard', paymentMethod: 'online' };
    const coop = state.coops.find((c) => c.id === g.coopId);

    // Hộp quà gắn vào đơn của một HTX.
    let gift: GiftOption | undefined;
    let orderAddress = mainAddress;
    if (opts.gift) {
      const box = state.giftBoxTypes.find((b) => b.id === opts.gift!.boxTypeId);
      if (!box) {
        errors.push('Loại hộp quà không còn áp dụng.');
      } else {
        const msgErr = validateGiftMessage(opts.gift.message, params.giftMessageMaxLength);
        if (msgErr) errors.push(`${coop?.name}: ${msgErr}`);
        if (opts.gift.sendToOther) {
          const rErr = validateRecipient(state, opts.gift.recipient);
          if (rErr) errors.push(`${coop?.name}: ${rErr}`);
          else {
            const r = opts.gift.recipient!;
            const ward = findWard(state, r.wardId)!;
            orderAddress = {
              receiverName: r.name.trim(),
              receiverPhone: normalizePhone(r.phone),
              text: `${r.street.trim()}, ${ward.name}, Hà Nội`,
              wardName: ward.name,
              distanceKm: ward.distanceKm,
            };
          }
        }
        gift = {
          boxTypeId: box.id,
          boxName: box.name,
          fee: box.fee,
          message: opts.gift.message.trim(),
          sendToOther: opts.gift.sendToOther,
          recipient: opts.gift.sendToOther ? opts.gift.recipient : undefined,
        };
      }
    }

    const express = checkExpress(
      {
        kind: g.kind,
        allItemsExpressApproved: g.items.every((i) => findProduct(state, i.productId)?.expressApproved),
        orderTime: at,
        distanceKm: orderAddress?.distanceKm ?? Number.POSITIVE_INFINITY,
      },
      params,
    );
    const shipping = opts.shipping === 'express' && express.available ? 'express' : 'standard';
    if (opts.shipping === 'express' && !express.available) errors.push(`${coop?.name}: không giao hoả tốc được – ${express.reasons.join(' ')}`);

    const giftFee = gift?.fee ?? 0;
    const baseInput = {
      kind: g.kind,
      lines: g.items,
      discount: allocation[key] ?? 0,
      shippingFee: params.standardShippingFee,
      expressSurcharge: shipping === 'express' ? express.surcharge ?? 0 : 0,
      giftBoxFee: giftFee,
    };
    // COD bị ẩn khi tổng đơn vượt PAR-23 hoặc đơn là quà gửi người khác.
    const draft = priceOrder({ ...baseInput, paymentMethod: 'online' }, params);
    let codBlockedReason: string | undefined;
    if (gift?.sendToOther) codBlockedReason = 'Quà gửi người khác chỉ thanh toán online.';
    else if (draft.total > params.codMaxOrderValue) codBlockedReason = `Đơn trên ${params.codMaxOrderValue.toLocaleString('vi-VN')}đ không chọn được thanh toán khi nhận hàng.`;
    const codAllowed = !codBlockedReason;
    const paymentMethod: PaymentMethod = opts.paymentMethod === 'cod' && codAllowed ? 'cod' : 'online';
    const pricing = priceOrder({ ...baseInput, paymentMethod }, params);

    orders.push({
      key,
      coopId: g.coopId,
      coopName: coop?.name ?? g.coopId,
      kind: g.kind,
      deliveryDate: g.deliveryDate,
      items: g.items,
      eligibleAmount: eligibleByGroup.find((e) => e.key === key)?.eligibleAmount ?? 0,
      shipping,
      express,
      gift,
      address: orderAddress ?? { receiverName: '', receiverPhone: '', text: '', wardName: '', distanceKm: Number.POSITIVE_INFINITY },
      paymentMethod,
      codAllowed,
      codBlockedReason,
      pricing,
      cancelPolicy: g.kind === 'preorder' && g.deliveryDate ? preorderCancelPolicy(g.deliveryDate, params.preorderMinLeadDays, params.depositPercent) : undefined,
    });
  }

  if (input.invoice) {
    const inv = validateInvoice(input.invoice);
    if (!inv.ok) errors.push(inv.error);
  }
  if (input.lines.length === 0) errors.push('Chưa có sản phẩm nào để đặt.');
  // Xếp đơn: mua sẵn trước, đặt trước sau; theo HTX.
  orders.sort((a, b) => (a.kind === b.kind ? a.coopName.localeCompare(b.coopName) : a.kind === 'ready' ? -1 : 1));

  return {
    orders,
    totals: totalCheckout(orders.map((o) => o.pricing), orders.map((o) => o.paymentMethod)),
    voucher,
    voucherDiscount: voucherError ? 0 : voucherDiscount,
    voucherError,
    errors,
    hasPreorder: orders.some((o) => o.kind === 'preorder'),
  };
}

export interface PlaceInput extends CheckoutInput {
  /** Khoá chống tạo trùng khi bấm lặp (BR-DAT-07). */
  idempotencyKey: string;
  /** Khách đã tick đồng ý điều kiện huỷ đơn đặt trước. */
  acceptedPreorderPolicy: boolean;
  /** Khách đã xác nhận giá tăng. */
  confirmedPriceIncrease: boolean;
  /** Đặt từ giỏ thì bỏ các dòng đã đặt khỏi giỏ. */
  fromCart: boolean;
  /** Lưu thông tin hoá đơn làm mặc định cho lần sau. */
  saveInvoiceAsDefault?: boolean;
}

export type PlaceResult =
  | { ok: true; state: DemoState; checkout: Checkout; transaction?: Transaction; notices: RevalidationNotice[]; reused: boolean }
  | { ok: false; error: string; notices?: RevalidationNotice[]; lines?: CartLine[]; dropVoucher?: boolean };

/** Bấm Đặt hàng: kiểm tra lại, tạo các đơn, giao dịch gộp và giữ lượt mã. */
export function placeCheckout(state: DemoState, input: PlaceInput, actor: Actor, at: Date): PlaceResult {
  // BR-DAT-01: chỉ tài khoản Khách hàng được đặt hàng.
  if (actor.kind !== 'customer' || actor.id !== input.customerId) {
    return { ok: false, error: 'Chỉ tài khoản Khách hàng mới được đặt hàng.' };
  }
  // BR-DAT-07: bấm lặp với cùng khoá thì trả về lần đặt đã tạo.
  const existing = state.checkouts.find((c) => c.idempotencyKey === input.idempotencyKey);
  if (existing) {
    return {
      ok: true,
      state,
      checkout: existing,
      transaction: state.transactions.find((t) => t.id === existing.transactionId),
      notices: [],
      reused: true,
    };
  }

  // BR-DAT-03: kiểm tra lại giá và tồn lúc bấm Đặt hàng.
  const re = revalidateLines(state, input.lines);
  const blocking = re.notices.filter((n) => n.type === 'reduced' || n.type === 'removed' || (n.type === 'price_up' && !input.confirmedPriceIncrease));
  if (blocking.length > 0) {
    return { ok: false, error: 'Giỏ hàng vừa thay đổi giá hoặc số lượng. Vui lòng kiểm tra lại trước khi đặt.', notices: re.notices, lines: re.lines };
  }

  const plan = planCheckout(state, { ...input, lines: re.lines }, at);
  if (plan.voucherError) return { ok: false, error: `Mã ưu đãi không còn dùng được: ${plan.voucherError} Đã bỏ mã.`, dropVoucher: true };
  if (plan.errors.length > 0) return { ok: false, error: plan.errors[0] };
  if (plan.hasPreorder && !input.acceptedPreorderPolicy) {
    return { ok: false, error: 'Vui lòng đọc và đồng ý điều kiện huỷ đơn đặt trước.' };
  }

  const checkoutId = generateId('CK');
  const invoice = input.invoice ? normalizeInvoice(input.invoice) : undefined;
  const existingCodes = state.orders.map((o) => o.id);
  const params = snapshotParams(state.params);
  const orders: Order[] = plan.orders.map((p) => {
    const payOnline = p.kind === 'preorder' || p.paymentMethod === 'online';
    const status = initialStatus(p.kind, payOnline);
    const id = generateOrderCode(at, existingCodes);
    existingCodes.push(id);
    return {
      id,
      checkoutId,
      customerId: input.customerId,
      coopId: p.coopId,
      coopName: p.coopName,
      kind: p.kind,
      deliveryDate: p.deliveryDate,
      items: p.items,
      pricing: p.pricing,
      paymentMethod: p.paymentMethod,
      paymentStatus: payOnline ? 'awaiting_payment' : 'cod_unpaid',
      status,
      statusHistory: [{ from: null, to: status, at: iso(at), actor: { kind: 'system', name: 'Hệ thống' }, reason: 'Tạo đơn' }],
      shipping: p.shipping,
      address: p.address,
      note: input.note.trim(),
      gift: p.gift,
      invoice,
      voucherCode: plan.voucher && p.pricing.discount > 0 ? plan.voucher.code : undefined,
      params,
      cancelPolicy: p.cancelPolicy,
      createdAt: iso(at),
      confirmDeadline: status === 'awaiting_confirmation' ? iso(addMs(at, params.coopConfirmHours * HOUR_MS)) : undefined,
      amountPaidOnline: 0,
      codCollected: 0,
      deliveryAttempts: 0,
      deliveryLog: [],
    };
  });

  // Mọi đơn online và tiền cọc của lần đặt gộp thành một giao dịch, chung một đồng hồ PAR-19.
  const onlineOrders = orders.filter((o) => o.pricing.payNowOnline > 0);
  let transaction: Transaction | undefined;
  if (onlineOrders.length > 0) {
    const amounts = Object.fromEntries(onlineOrders.map((o) => [o.id, o.pricing.payNowOnline]));
    transaction = {
      id: generateId('TX'),
      kind: 'checkout',
      checkoutId,
      customerId: input.customerId,
      orderIds: onlineOrders.map((o) => o.id),
      amounts,
      amount: onlineOrders.reduce((s, o) => s + o.pricing.payNowOnline, 0),
      status: 'pending',
      createdAt: iso(at),
      expiresAt: iso(addMs(at, params.paymentHoldMinutes * MINUTE_MS)),
      processedRefs: [],
    };
  }

  const checkout: Checkout = {
    id: checkoutId,
    idempotencyKey: input.idempotencyKey,
    customerId: input.customerId,
    orderIds: orders.map((o) => o.id),
    transactionId: transaction?.id,
    voucherId: plan.voucher && plan.voucherDiscount > 0 ? plan.voucher.id : undefined,
    createdAt: iso(at),
  };

  // Giữ lượt mã khi tạo đơn.
  const usage: VoucherUsage | undefined = checkout.voucherId
    ? {
        id: generateId('VU'),
        voucherId: checkout.voucherId,
        checkoutId,
        customerId: input.customerId,
        orderIds: orders.filter((o) => o.pricing.discount > 0).map((o) => o.id),
        status: 'held',
      }
    : undefined;

  const orderedIds = new Set(re.lines.map((l) => l.productId));
  const cart = state.carts[input.customerId] ?? [];
  const next: DemoState = {
    ...state,
    orders: [...orders, ...state.orders],
    checkouts: [checkout, ...state.checkouts],
    transactions: transaction ? [transaction, ...state.transactions] : state.transactions,
    voucherUsages: usage ? [usage, ...state.voucherUsages] : state.voucherUsages,
    carts: input.fromCart ? { ...state.carts, [input.customerId]: cart.filter((l) => !orderedIds.has(l.productId)) } : state.carts,
    customers: invoice && input.saveInvoiceAsDefault ? state.customers.map((c) => (c.id === input.customerId ? { ...c, invoiceDefault: invoice } : c)) : state.customers,
  };
  return { ok: true, state: next, checkout, transaction, notices: re.notices, reused: false };
}

/** Lấy các dòng giỏ của một lần đặt để trả lại giỏ khi thanh toán thất bại. */
export function linesOfOrders(orders: Order[]): CartLine[] {
  return orders.flatMap((o) => o.items.map((i) => ({ productId: i.productId, quantity: i.quantity, deliveryDate: o.deliveryDate, seenPrice: i.unitPrice })));
}
