/**
 * Cấu hình của Admin.
 * - Tham số hệ thống (FR-HT-02): Admin – Vận hành sửa, bắt buộc lý do, lưu lịch sử; chỉ áp cho đơn tạo sau đó.
 * - Danh mục dùng chung (FR-HT-04): phường/xã giao hàng, loại hộp quà (2–3 loại).
 * - Mã ưu đãi (FR-HT-01): giai đoạn 1 chỉ Admin tạo mã; HTX không tạo mã.
 */
import { generateId } from './ids';
import { updateParam, type ParamKey, type Params } from './params';
import { audit } from './state';
import { fail, ok, type Actor, type Category, type DemoState, type GiftBoxType, type Result, type Ward } from './types';
import type { Voucher } from './voucher';

const requireOps = (actor: Actor): string | null =>
  actor.kind === 'admin' && actor.adminGroup === 'operations' ? null : 'Chỉ Admin – Vận hành được thực hiện thao tác này.';

export function opsUpdateParam<K extends ParamKey>(state: DemoState, actor: Actor, key: K, value: Params[K], reason: string, at: Date): Result<DemoState> {
  const denied = requireOps(actor);
  if (denied) return fail(denied);
  if (JSON.stringify(state.params[key]) === JSON.stringify(value)) return fail('Giá trị mới trùng giá trị hiện tại.');
  const r = updateParam(state.params, key, value, actor.name ?? 'Admin – Vận hành', reason, at);
  if (!r.ok) return r;
  const next = { ...state, params: r.value.params, paramHistory: [r.value.change, ...state.paramHistory] };
  return ok(audit(next, actor, `Sửa tham số ${r.value.change.code}`, String(key), at, `${JSON.stringify(r.value.change.oldValue)} → ${JSON.stringify(value)}: ${reason}`));
}

// ---------- Phường/xã ----------

export function opsSaveWard(state: DemoState, actor: Actor, ward: Omit<Ward, 'id'> & { id?: string }, at: Date): Result<DemoState> {
  const denied = requireOps(actor);
  if (denied) return fail(denied);
  if (!ward.name.trim()) return fail('Vui lòng nhập tên phường/xã.');
  if (!Number.isFinite(ward.distanceKm) || ward.distanceKm < 0) return fail('Khoảng cách phải là số không âm.');
  const clean: Ward = { id: ward.id ?? generateId('PX'), name: ward.name.trim(), distanceKm: Math.round(ward.distanceKm * 10) / 10 };
  if (state.wards.some((w) => w.id !== clean.id && w.name.toLowerCase() === clean.name.toLowerCase())) return fail('Phường/xã đã có trong danh sách.');
  const exists = state.wards.some((w) => w.id === clean.id);
  const wards = exists ? state.wards.map((w) => (w.id === clean.id ? clean : w)) : [...state.wards, clean];
  return ok(audit({ ...state, wards }, actor, exists ? 'Sửa phường/xã' : 'Thêm phường/xã', clean.name, at, `${clean.distanceKm} km`));
}

export function opsDeleteWard(state: DemoState, actor: Actor, wardId: string, at: Date): Result<DemoState> {
  const denied = requireOps(actor);
  if (denied) return fail(denied);
  const ward = state.wards.find((w) => w.id === wardId);
  if (!ward) return fail('Không tìm thấy phường/xã.');
  if (state.addresses.some((a) => a.wardId === wardId)) return fail('Phường/xã đang được dùng trong sổ địa chỉ của khách, không xoá được.');
  return ok(audit({ ...state, wards: state.wards.filter((w) => w.id !== wardId) }, actor, 'Xoá phường/xã', ward.name, at));
}

// ---------- Hộp quà (2–3 loại) ----------

export const GIFT_BOX_MIN = 2;
export const GIFT_BOX_MAX = 3;

export function opsSaveGiftBox(state: DemoState, actor: Actor, box: Omit<GiftBoxType, 'id'> & { id?: string }, at: Date): Result<DemoState> {
  const denied = requireOps(actor);
  if (denied) return fail(denied);
  if (!box.name.trim()) return fail('Vui lòng nhập tên hộp quà.');
  if (!Number.isInteger(box.fee) || box.fee < 0) return fail('Phí hộp phải là số nguyên không âm (đồng).');
  const exists = !!box.id && state.giftBoxTypes.some((b) => b.id === box.id);
  if (!exists && state.giftBoxTypes.length >= GIFT_BOX_MAX) return fail(`Tối đa ${GIFT_BOX_MAX} loại hộp quà.`);
  const clean: GiftBoxType = { id: box.id ?? generateId('HQ'), name: box.name.trim(), fee: box.fee, description: box.description.trim() };
  const giftBoxTypes = exists ? state.giftBoxTypes.map((b) => (b.id === clean.id ? clean : b)) : [...state.giftBoxTypes, clean];
  return ok(audit({ ...state, giftBoxTypes }, actor, exists ? 'Sửa hộp quà' : 'Thêm hộp quà', clean.name, at, `${clean.fee}`));
}

export function opsDeleteGiftBox(state: DemoState, actor: Actor, boxId: string, at: Date): Result<DemoState> {
  const denied = requireOps(actor);
  if (denied) return fail(denied);
  if (state.giftBoxTypes.length <= GIFT_BOX_MIN) return fail(`Cần giữ tối thiểu ${GIFT_BOX_MIN} loại hộp quà.`);
  const box = state.giftBoxTypes.find((b) => b.id === boxId);
  if (!box) return fail('Không tìm thấy hộp quà.');
  return ok(audit({ ...state, giftBoxTypes: state.giftBoxTypes.filter((b) => b.id !== boxId) }, actor, 'Xoá hộp quà', box.name, at));
}

// ---------- Mã ưu đãi ----------

export interface VoucherInput {
  code: string;
  title: string;
  kind: 'fixed' | 'percent';
  value: number;
  maxDiscount?: number;
  minSpend: number;
  categories?: Category[];
  coopIds?: string[];
  productIds?: string[];
  expiresAt: string;
  usageLimit: number;
  firstOrderOnly: boolean;
}

/** Admin tạo mã ưu đãi (FR-HT-01). Chỉ giảm tiền hàng; không có mã freeship hay mã theo phương thức thanh toán. */
export function adminCreateVoucher(state: DemoState, actor: Actor, input: VoucherInput, at: Date): Result<DemoState> {
  const denied = requireOps(actor);
  if (denied) return fail(denied);
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,16}$/.test(code)) return fail('Mã gồm 4–16 chữ hoa hoặc số, không dấu, không khoảng trắng.');
  if (state.vouchers.some((v) => v.code === code)) return fail('Mã đã tồn tại.');
  if (!input.title.trim()) return fail('Vui lòng nhập mô tả mã.');
  if (!Number.isInteger(input.value) || input.value <= 0) return fail('Giá trị giảm phải là số nguyên dương.');
  if (input.kind === 'percent' && input.value > 100) return fail('Phần trăm giảm tối đa 100%.');
  if (!Number.isInteger(input.minSpend) || input.minSpend < 0) return fail('Mức chi tối thiểu phải là số nguyên không âm.');
  if (!Number.isInteger(input.usageLimit) || input.usageLimit <= 0) return fail('Số lượt phải là số nguyên dương.');
  if (!input.expiresAt || new Date(input.expiresAt).getTime() <= at.getTime()) return fail('Hạn dùng phải sau thời điểm hiện tại.');
  const voucher: Voucher = {
    id: generateId('MA'),
    code,
    title: input.title.trim(),
    kind: input.kind,
    value: input.value,
    maxDiscount: input.kind === 'percent' ? input.maxDiscount : undefined,
    minSpend: input.minSpend,
    categories: input.categories?.length ? input.categories : undefined,
    coopIds: input.coopIds?.length ? input.coopIds : undefined,
    productIds: input.productIds?.length ? input.productIds : undefined,
    expiresAt: input.expiresAt,
    usageLimit: input.usageLimit,
    firstOrderOnly: input.firstOrderOnly,
    active: true,
  };
  return ok(audit({ ...state, vouchers: [voucher, ...state.vouchers] }, actor, 'Tạo mã ưu đãi', code, at, voucher.title));
}

export function adminSetVoucherActive(state: DemoState, actor: Actor, voucherId: string, active: boolean, at: Date): Result<DemoState> {
  const denied = requireOps(actor);
  if (denied) return fail(denied);
  const v = state.vouchers.find((x) => x.id === voucherId);
  if (!v) return fail('Không tìm thấy mã.');
  const next = { ...state, vouchers: state.vouchers.map((x) => (x.id === voucherId ? { ...x, active } : x)) };
  return ok(audit(next, actor, active ? 'Bật mã ưu đãi' : 'Tắt mã ưu đãi', v.code, at));
}
