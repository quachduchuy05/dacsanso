/**
 * Tính tiền (BR-TIEN-01..04). Mọi số tiền là số nguyên, đơn vị đồng.
 *
 * Tổng một đơn   = tiền hàng − giảm giá + phí giao + phụ phí hoả tốc + phí hộp quà
 * Tổng lần đặt   = tổng các đơn
 * Tiền cọc       = PAR-18 × (tiền hàng sau giảm + phí hộp quà), làm tròn lên theo PAR-04 (chỉ đơn Đặt trước)
 * Phần còn lại   = tổng đơn − tiền cọc
 * Đơn Mua sẵn không có cọc: trả online thì thu đủ, COD thì thu đủ khi nhận.
 */
import { parseClock, type ExpressTier, type Params } from './params';
import type { OrderKind } from './types';

export interface PricedLine {
  productId: string;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
}

export type PaymentMethod = 'online' | 'cod';

export interface OrderPricingInput {
  kind: OrderKind;
  lines: PricedLine[];
  /** Số giảm đã chia cho đơn này (đã giới hạn không vượt tiền hàng hợp lệ). */
  discount: number;
  shippingFee: number;
  expressSurcharge: number;
  giftBoxFee: number;
  /**
   * Mua sẵn: cách trả cả đơn. Đặt trước: cách trả phần còn lại (cọc luôn online).
   */
  paymentMethod: PaymentMethod;
}

export interface OrderPricing {
  itemsTotal: number;
  discount: number;
  shippingFee: number;
  expressSurcharge: number;
  giftBoxFee: number;
  total: number;
  /** Tiền cọc; 0 với đơn Mua sẵn. */
  deposit: number;
  /** Phần còn lại sau cọc; 0 với đơn Mua sẵn. */
  remaining: number;
  /** Số tiền thu online ngay khi đặt (đi vào giao dịch thanh toán gộp). */
  payNowOnline: number;
  /** Số tiền thu khi nhận hàng (COD). */
  payOnDelivery: number;
}

export const lineTotal = (line: Pick<PricedLine, 'unitPrice' | 'quantity'>): number => line.unitPrice * line.quantity;

export const sumLines = (lines: Pick<PricedLine, 'unitPrice' | 'quantity'>[]): number =>
  lines.reduce((sum, line) => sum + lineTotal(line), 0);

/** Làm tròn lên theo bước (PAR-04). Tính bằng số nguyên để tránh sai số dấu phẩy động. */
export function roundUpToStep(amount: number, step: number): number {
  if (step <= 0) return Math.ceil(amount);
  return Math.ceil(amount / step) * step;
}

/** Tiền cọc = PAR-18 % × (tiền hàng sau giảm + phí hộp quà), làm tròn lên theo PAR-04. Phí giao không tính vào cọc. */
export function computeDeposit(itemsAfterDiscount: number, giftBoxFee: number, percent: number, step: number): number {
  const base = Math.max(0, itemsAfterDiscount) + giftBoxFee;
  // base × percent / 100, làm tròn lên theo step, giữ toàn bộ phép tính trên số nguyên
  const numerator = base * percent;
  const unit = 100 * step;
  return Math.ceil(numerator / unit) * step;
}

export function priceOrder(input: OrderPricingInput, params: Pick<Params, 'depositPercent' | 'depositRoundingStep'>): OrderPricing {
  const itemsTotal = sumLines(input.lines);
  const discount = Math.min(Math.max(0, input.discount), itemsTotal);
  const itemsAfterDiscount = itemsTotal - discount;
  const total = itemsAfterDiscount + input.shippingFee + input.expressSurcharge + input.giftBoxFee;

  if (input.kind === 'ready') {
    const online = input.paymentMethod === 'online';
    return {
      itemsTotal,
      discount,
      shippingFee: input.shippingFee,
      expressSurcharge: input.expressSurcharge,
      giftBoxFee: input.giftBoxFee,
      total,
      deposit: 0,
      remaining: 0,
      payNowOnline: online ? total : 0,
      payOnDelivery: online ? 0 : total,
    };
  }

  const deposit = Math.min(
    total,
    computeDeposit(itemsAfterDiscount, input.giftBoxFee, params.depositPercent, params.depositRoundingStep),
  );
  const remaining = total - deposit;
  return {
    itemsTotal,
    discount,
    shippingFee: input.shippingFee,
    expressSurcharge: input.expressSurcharge,
    giftBoxFee: input.giftBoxFee,
    total,
    deposit,
    remaining,
    // Cọc luôn trả online lúc đặt; phần còn lại trả sau (online khi hàng sẵn sàng hoặc COD).
    payNowOnline: deposit,
    payOnDelivery: input.paymentMethod === 'cod' ? remaining : 0,
  };
}

export interface CheckoutTotals {
  /** Tổng lần đặt = tổng các đơn. */
  grandTotal: number;
  /** Số tiền trả ngay = tổng phần online của cả lần đặt; đây là số ghi trên nút Đặt hàng. */
  payNowOnline: number;
  payOnDelivery: number;
  /** Phần còn lại của các đơn đặt trước trả online sau. */
  remainingLater: number;
}

export function totalCheckout(orders: OrderPricing[], remainingMethods: PaymentMethod[] = []): CheckoutTotals {
  let remainingLater = 0;
  orders.forEach((o, i) => {
    if (o.deposit > 0 && (remainingMethods[i] ?? 'online') === 'online') remainingLater += o.remaining;
  });
  return {
    grandTotal: orders.reduce((s, o) => s + o.total, 0),
    payNowOnline: orders.reduce((s, o) => s + o.payNowOnline, 0),
    payOnDelivery: orders.reduce((s, o) => s + o.payOnDelivery, 0),
    remainingLater,
  };
}

/**
 * Chia số giảm vào từng đơn theo tỷ lệ tiền hàng hợp lệ (BR-KM, bước 3).
 * Phần lẻ do làm tròn xuống dồn vào đơn có tiền hàng hợp lệ lớn nhất.
 */
export function allocateDiscount<K extends string>(
  discount: number,
  eligibleByOrder: { key: K; eligibleAmount: number }[],
): Record<K, number> {
  const result = {} as Record<K, number>;
  const totalEligible = eligibleByOrder.reduce((s, o) => s + Math.max(0, o.eligibleAmount), 0);
  eligibleByOrder.forEach((o) => (result[o.key] = 0));
  if (discount <= 0 || totalEligible <= 0) return result;

  const capped = Math.min(discount, totalEligible);
  let allocated = 0;
  let largest = eligibleByOrder[0];
  for (const o of eligibleByOrder) {
    const share = Math.floor((capped * Math.max(0, o.eligibleAmount)) / totalEligible);
    result[o.key] = share;
    allocated += share;
    if (o.eligibleAmount > largest.eligibleAmount) largest = o;
  }
  result[largest.key] += capped - allocated;
  return result;
}

/** Phụ phí hoả tốc theo khoảng cách (FEE-02). Trả về null nếu ngoài vùng hoả tốc. */
export function expressSurchargeFor(distanceKm: number, tiers: ExpressTier[]): number | null {
  const sorted = [...tiers].sort((a, b) => a.maxKm - b.maxKm);
  const tier = sorted.find((t) => distanceKm <= t.maxKm);
  return tier ? tier.fee : null;
}

export interface ExpressCheckInput {
  kind: OrderKind;
  /** Mọi sản phẩm trong đơn đều có cờ hoả tốc đã duyệt. */
  allItemsExpressApproved: boolean;
  orderTime: Date;
  distanceKm: number;
}

export interface ExpressAvailability {
  available: boolean;
  surcharge: number | null;
  reasons: string[];
}

/** Hoả tốc chỉ hiện khi đủ cả 4 điều kiện (BR-DAT-05). Không đủ thì trả về lý do. */
export function checkExpress(input: ExpressCheckInput, params: Pick<Params, 'expressCutoff' | 'expressTiers'>): ExpressAvailability {
  const reasons: string[] = [];
  if (input.kind === 'preorder') {
    reasons.push('Đơn đặt trước không có giao hoả tốc.');
  }
  if (!input.allItemsExpressApproved) {
    reasons.push('Có sản phẩm trong đơn chưa được duyệt giao hoả tốc.');
  }
  const minutes = input.orderTime.getHours() * 60 + input.orderTime.getMinutes();
  if (minutes >= parseClock(params.expressCutoff)) {
    reasons.push(`Đã qua giờ chốt nhận đơn hoả tốc (${params.expressCutoff}).`);
  }
  const surcharge = expressSurchargeFor(input.distanceKm, params.expressTiers);
  if (!Number.isFinite(input.distanceKm)) {
    // Chưa chọn địa chỉ: chưa biết khoảng cách.
    reasons.push('Chưa chọn địa chỉ giao hàng.');
  } else if (surcharge === null) {
    reasons.push('Địa chỉ nằm ngoài vùng giao hoả tốc.');
  }
  return { available: reasons.length === 0, surcharge, reasons };
}

export const formatMoney = (value: number): string => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
