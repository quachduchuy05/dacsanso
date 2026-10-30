/**
 * Số điện thoại và địa chỉ liên hệ của HTX (chủ repo yêu cầu: mỗi cửa hàng HTX có 2 số, để Admin gọi cho HTX;
 * góp ý kiểm thử: thêm SĐT, địa chỉ vào hồ sơ HTX). Địa chỉ theo cùng quy tắc với SĐT.
 * - Chỉ Admin (mọi nhóm quyền) và chính HTX xem được. Không công khai cho khách: không hiện ở trang sản phẩm hay trong đơn.
 *   QLNN cũng không xem (listCoopContacts kiểm quyền ngay trong hàm, mục 5.9).
 * - HTX tự cập nhật ở mục Hồ sơ, lưu ngay (không chờ Admin duyệt như hồ sơ), có ghi nhật ký thao tác.
 * - Nhận số di động (10 số) hoặc số cố định (11 số, bắt đầu bằng 02), nhập dạng nào cũng lưu dạng bắt đầu bằng 0.
 */
import { audit } from './state';
import { fail, ok, type Actor, type Coop, type DemoState, type Result } from './types';

export interface CoopContact {
  coopId: string;
  name: string;
  region: string;
  representative?: string;
  status: Coop['status'];
  phones: string[];
  /** Địa chỉ cửa hàng / nơi sản xuất; rỗng nếu HTX chưa cập nhật. */
  address: string;
}

/** Mỗi HTX có đúng 2 số. */
export const COOP_PHONE_COUNT = 2;

/**
 * SĐT mẫu của 7 HTX mẫu, rõ ràng là giả (0900000xxx như mọi SĐT trong dữ liệu mẫu).
 * Dùng cho dữ liệu mẫu và cho dữ liệu đã lưu từ bản trước (chưa có SĐT HTX), để không phải khôi phục dữ liệu mẫu.
 */
export const SAMPLE_COOP_PHONES: Record<string, readonly [string, string]> = {
  'coop-bacha': ['0900000411', '0900000412'],
  'coop-muongkhuong': ['0900000421', '0900000422'],
  'coop-suoigiang': ['0900000431', '0900000432'],
  'coop-sapa': ['0900000441', '0900000442'],
  'coop-baoha': ['0900000451', '0900000452'],
  'coop-tule': ['0900000461', '0900000462'],
  'coop-thacba': ['0900000471', '0900000472'],
};

/** Ghi cuối địa chỉ mẫu của 7 HTX mẫu: chỉ có vùng, không có số nhà, thôn bản. */
export const SAMPLE_ADDRESS_NOTE = '(địa chỉ mẫu – chờ HTX cập nhật)';

/** Địa chỉ mẫu của HTX mẫu: lấy theo vùng, ghi rõ là mẫu. */
export const sampleCoopAddress = (region: string): string => `Vùng ${region}, tỉnh Lào Cai ${SAMPLE_ADDRESS_NOTE}`;

export const isSampleAddress = (address: string): boolean => address.endsWith(SAMPLE_ADDRESS_NOTE);

export const ADDRESS_MIN_LENGTH = 10;
export const ADDRESS_MAX_LENGTH = 200;

/** Địa chỉ của HTX: địa chỉ HTX đã lưu; HTX mẫu chưa lưu thì địa chỉ mẫu theo vùng; không có thì rỗng. */
export function coopAddressOf(coop: Pick<Coop, 'id' | 'region' | 'storeAddress'>): string {
  return coop.storeAddress ?? (SAMPLE_COOP_PHONES[coop.id] ? sampleCoopAddress(coop.region) : '');
}

/** Số mẫu của bản demo (để ghi rõ cho người gọi). */
export const isSamplePhone = (phone: string): boolean => /^0900000\d{3}$/.test(phone);

/** SĐT liên hệ của HTX: số HTX đã lưu; chưa có thì số mẫu (HTX mẫu); không có thì rỗng. */
export function coopPhonesOf(coop: Pick<Coop, 'id' | 'phones'>): string[] {
  return coop.phones ?? [...(SAMPLE_COOP_PHONES[coop.id] ?? [])];
}

/** Đưa về dạng bắt đầu bằng 0: bỏ mã nước +84 / 84, thêm số 0 nếu thiếu. */
export function normalizeContactPhone(input: string): string {
  const trimmed = input.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+84') || (digits.startsWith('84') && (digits.length === 11 || digits.length === 12))) digits = digits.slice(2);
  if ((digits.length === 9 || digits.length === 10) && !digits.startsWith('0')) digits = `0${digits}`;
  return digits;
}

/** Di động: 0 + 9 số. Cố định: 02 + 9 số (mã vùng 3 số + 7 số, hoặc 024 / 028 + 8 số). */
export const isValidContactPhone = (normalized: string): boolean => /^0\d{9}$/.test(normalized) || /^02\d{9}$/.test(normalized);

/** Hiển thị: di động "0912 345 678", cố định "0214 382 1234". */
export function formatContactPhone(phone: string): string {
  const p = normalizeContactPhone(phone);
  if (p.length === 10) return p.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');
  if (p.length === 11) return p.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3');
  return p;
}

export const CONTACT_PHONE_RULE = 'Số di động 10 số hoặc số cố định 11 số (vd. 0214 382 1234), có thể nhập +84 ở đầu.';

/** HTX lưu 2 SĐT liên hệ của mình. */
export function coopSetPhones(state: DemoState, actor: Actor, phones: string[], at: Date): Result<DemoState> {
  if (actor.kind !== 'coop' || !actor.id) return fail('Chỉ HTX cập nhật được SĐT của mình.');
  const coop = state.coops.find((c) => c.id === actor.id);
  if (!coop) return fail('Không tìm thấy HTX.');
  if (phones.length !== COOP_PHONE_COUNT) return fail(`Nhập đủ ${COOP_PHONE_COUNT} số điện thoại.`);
  const normalized = phones.map(normalizeContactPhone);
  for (let i = 0; i < normalized.length; i++) {
    if (!normalized[i]) return fail(`Nhập số điện thoại ${i + 1}.`);
    if (!isValidContactPhone(normalized[i])) return fail(`Số điện thoại ${i + 1} chưa đúng. ${CONTACT_PHONE_RULE}`);
  }
  if (new Set(normalized).size !== normalized.length) return fail('Hai số điện thoại phải khác nhau.');
  const next = { ...state, coops: state.coops.map((c) => (c.id === coop.id ? { ...c, phones: normalized } : c)) };
  return ok(audit(next, actor, 'Cập nhật SĐT liên hệ', coop.name, at, normalized.map(formatContactPhone).join(' · ')));
}

/** HTX lưu địa chỉ cửa hàng / nơi sản xuất. Lưu ngay, có nhật ký; chỉ Admin và HTX xem được. */
export function coopSetAddress(state: DemoState, actor: Actor, address: string, at: Date): Result<DemoState> {
  if (actor.kind !== 'coop' || !actor.id) return fail('Chỉ HTX cập nhật được địa chỉ của mình.');
  const coop = state.coops.find((c) => c.id === actor.id);
  if (!coop) return fail('Không tìm thấy HTX.');
  const value = address.trim().replace(/\s+/g, ' ');
  if (!value) return fail('Vui lòng nhập địa chỉ.');
  if (value.length < ADDRESS_MIN_LENGTH) return fail(`Địa chỉ cần ít nhất ${ADDRESS_MIN_LENGTH} ký tự (thôn / tổ, xã / phường, tỉnh).`);
  if (value.length > ADDRESS_MAX_LENGTH) return fail(`Địa chỉ tối đa ${ADDRESS_MAX_LENGTH} ký tự.`);
  if (value === coop.storeAddress) return ok(state);
  const next = { ...state, coops: state.coops.map((c) => (c.id === coop.id ? { ...c, storeAddress: value } : c)) };
  return ok(audit(next, actor, 'Cập nhật địa chỉ HTX', coop.name, at, value));
}

/** Danh bạ SĐT, địa chỉ HTX: Admin xem mọi HTX, HTX chỉ xem của mình; khách và QLNN không xem được. */
export function listCoopContacts(state: DemoState, actor: Actor): Result<CoopContact[]> {
  if (actor.kind !== 'admin' && actor.kind !== 'coop') return fail('SĐT của HTX chỉ dành cho Admin liên hệ HTX.');
  const coops = actor.kind === 'admin' ? state.coops : state.coops.filter((c) => c.id === actor.id);
  return ok(coops.map((c) => ({ coopId: c.id, name: c.name, region: c.region, representative: c.representative, status: c.status, phones: coopPhonesOf(c), address: coopAddressOf(c) })));
}
