/**
 * Số điện thoại di động Việt Nam.
 *
 * Người dùng nhập được cả 3 dạng: 10 số có số 0 đầu (0912345678), 9 số bỏ số 0 đầu (912345678)
 * hoặc có mã nước (+84 912 345 678). App luôn lưu, so khớp và hiển thị dạng 10 số bắt đầu bằng 0,
 * nên cùng một số nhập theo dạng nào cũng ra cùng một tài khoản.
 */

/** Câu hướng dẫn dùng chung trong thông báo lỗi và gợi ý ô nhập. */
export const PHONE_RULE = 'Nhập 9 chữ số (vd. 912 345 678), có thể thêm số 0 hoặc +84 ở đầu.';

/** Đưa SĐT về dạng 10 số bắt đầu bằng 0. Chuỗi không hợp lệ trả về các chữ số đã lọc để báo lỗi. */
export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+84') || (digits.length === 11 && digits.startsWith('84'))) digits = digits.slice(2);
  if (digits.length === 9 && !digits.startsWith('0')) return `0${digits}`;
  return digits;
}

/** SĐT đã chuẩn hoá có hợp lệ không: 0 + 9 chữ số. */
export const isValidPhone = (normalized: string): boolean => /^0\d{9}$/.test(normalized);

/** Hiển thị dạng "0912 345 678". */
export const formatPhone = (phone: string): string => normalizePhone(phone).replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');
