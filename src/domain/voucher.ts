/**
 * Mã ưu đãi (BR-KM-01..08).
 *
 * - Giai đoạn 1 chỉ Admin tạo mã; mỗi lần đặt tối đa PAR-28 mã (= 1), không cộng dồn.
 * - Mã chỉ giảm tiền hàng của các dòng hợp lệ và không vượt tiền hàng hợp lệ.
 *   Không giảm phí giao, phụ phí hoả tốc hay phí hộp quà (nên không có mã freeship).
 * - Mã không đủ điều kiện thì không chọn được và phải hiện lý do.
 */
import { fail, ok, type Result } from './types';

export type VoucherKind = 'fixed' | 'percent';

export interface Voucher {
  id: string;
  code: string;
  title: string;
  kind: VoucherKind;
  /** Số tiền giảm (fixed) hoặc phần trăm (percent). */
  value: number;
  /** Trần giảm cho mã phần trăm. */
  maxDiscount?: number;
  /** Mức chi tối thiểu tính trên tiền hàng hợp lệ. */
  minSpend: number;
  /** Phạm vi áp dụng; để trống nghĩa là mọi sản phẩm. */
  productIds?: string[];
  categories?: string[];
  coopIds?: string[];
  startsAt?: string; // ISO
  expiresAt: string; // ISO
  /** Tổng số lượt phát hành. */
  usageLimit: number;
  /** Chỉ khách đặt lần đầu. */
  firstOrderOnly: boolean;
  /** Admin tắt mã thì không dùng được nữa (mặc định bật). */
  active?: boolean;
}

export interface VoucherLine {
  productId: string;
  category: string;
  coopId: string;
  /** Tiền hàng của dòng (đơn giá × số lượng). */
  amount: number;
}

export interface VoucherContext {
  lines: VoucherLine[];
  now: Date;
  /** Số lượt đang giữ hoặc đã dùng của mã (lượt giữ được nhả khi hết hạn thanh toán). */
  usedCount: number;
  /** Khách chưa có lần đặt nào thành công trước đó. */
  isFirstOrder: boolean;
}

export function isLineEligible(voucher: Voucher, line: VoucherLine): boolean {
  if (voucher.productIds?.length && !voucher.productIds.includes(line.productId)) return false;
  if (voucher.categories?.length && !voucher.categories.includes(line.category)) return false;
  if (voucher.coopIds?.length && !voucher.coopIds.includes(line.coopId)) return false;
  return true;
}

/** Tiền hàng hợp lệ của mã: tổng tiền hàng các dòng thuộc phạm vi áp dụng. */
export function eligibleAmount(voucher: Voucher, lines: VoucherLine[]): number {
  return lines.filter((l) => isLineEligible(voucher, l)).reduce((s, l) => s + l.amount, 0);
}

/** Số giảm, không vượt tiền hàng hợp lệ. */
export function discountFor(voucher: Voucher, eligible: number): number {
  const raw = voucher.kind === 'fixed' ? voucher.value : Math.floor((eligible * voucher.value) / 100);
  const capped = voucher.maxDiscount !== undefined ? Math.min(raw, voucher.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, eligible));
}

export interface VoucherEvaluation {
  eligibleAmount: number;
  discount: number;
}

/** Xét điều kiện mã. Không đạt thì trả về lý do để hiển thị cạnh mã. */
export function evaluateVoucher(voucher: Voucher, ctx: VoucherContext): Result<VoucherEvaluation> {
  const nowMs = ctx.now.getTime();
  if (voucher.active === false) return fail('Mã đã ngừng áp dụng.');
  if (voucher.startsAt && nowMs < new Date(voucher.startsAt).getTime()) {
    return fail('Mã chưa đến thời gian áp dụng.');
  }
  if (nowMs > new Date(voucher.expiresAt).getTime()) {
    return fail('Mã đã hết hạn.');
  }
  if (ctx.usedCount >= voucher.usageLimit) {
    return fail('Mã đã hết lượt sử dụng.');
  }
  if (voucher.firstOrderOnly && !ctx.isFirstOrder) {
    return fail('Mã chỉ dành cho khách đặt lần đầu.');
  }
  const eligible = eligibleAmount(voucher, ctx.lines);
  if (eligible <= 0) {
    return fail('Giỏ hàng không có sản phẩm thuộc phạm vi áp dụng của mã.');
  }
  if (eligible < voucher.minSpend) {
    return fail(
      `Cần thêm ${new Intl.NumberFormat('vi-VN').format(voucher.minSpend - eligible)}đ tiền hàng hợp lệ để dùng mã.`,
    );
  }
  return ok({ eligibleAmount: eligible, discount: discountFor(voucher, eligible) });
}

/**
 * Chọn thêm một mã vào lần đặt. Đã đủ PAR-28 mã thì từ chối và giữ nguyên mã đã chọn (không cộng dồn).
 */
export function selectVoucher(selectedIds: string[], voucherId: string, maxPerCheckout: number): Result<string[]> {
  if (selectedIds.includes(voucherId)) return ok(selectedIds);
  if (selectedIds.length >= maxPerCheckout) {
    return fail(maxPerCheckout === 1 ? 'Mỗi lần đặt chỉ dùng 1 mã.' : `Mỗi lần đặt chỉ dùng tối đa ${maxPerCheckout} mã.`);
  }
  return ok([...selectedIds, voucherId]);
}
