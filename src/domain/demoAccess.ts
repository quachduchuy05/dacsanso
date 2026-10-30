/**
 * Chế độ trình diễn an toàn (Giai đoạn 7, đề bài bản 2 – chưa có trong SRS).
 *
 * - NEW-01 Mã trình diễn: Quản trị gốc đặt, đổi hoặc bỏ. Đã đặt mã thì màn đăng nhập ẩn danh sách tài khoản demo
 *   cho tới khi nhập đúng mã (nhớ theo từng tab). Đăng nhập bằng SĐT + OTP mô phỏng vẫn dùng được như cũ.
 *   Chỉ lưu bản băm kèm muối: mã không nằm dạng đọc được trong dữ liệu dùng chung và không hiện lại sau khi lưu.
 * - Công cụ demo (tua thời gian, khôi phục dữ liệu mẫu, gửi kết quả cổng thanh toán mô phỏng) thay đổi dữ liệu của
 *   mọi máy đang xem demo, nên chỉ Quản trị gốc và Admin – Vận hành dùng được.
 *
 * Đây là biện pháp cho buổi demo, không phải bảo mật thật: API dữ liệu demo không có đăng nhập phía máy chủ,
 * ai có link vẫn đọc và ghi được dữ liệu.
 */
import { generateId } from './ids';
import { applyGatewayResult, type GatewayOutcome } from './payment';
import { audit, DAY_MS, HOUR_MS, MINUTE_MS } from './state';
import { fail, ok, type Actor, type DemoState, type Result } from './types';

export interface DemoAccess {
  salt: string;
  codeHash: string;
  setAt: string;
  setBy: string;
}

export const DEMO_CODE_MIN = 4;
export const DEMO_CODE_MAX = 32;
export const DEMO_CODE_RULE = `Mã trình diễn dài ${DEMO_CODE_MIN}–${DEMO_CODE_MAX} ký tự, chỉ gồm chữ không dấu và số; không phân biệt hoa thường.`;

/** Bỏ khoảng trắng, không phân biệt hoa thường (bàn phím điện thoại hay tự viết hoa chữ đầu). */
export const normalizeDemoCode = (code: string): string => code.replace(/\s+/g, '').toLowerCase();

/** Băm 53 bit (cyrb53): đủ để mã không nằm dạng đọc được trong dữ liệu dùng chung. Không phải băm mật khẩu. */
function hash53(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

const hashCode = (code: string, salt: string): string => hash53(`${salt}:${normalizeDemoCode(code)}`);

const isRoot = (actor: Actor): boolean => actor.kind === 'admin' && actor.adminGroup === 'root';

export const demoCodeIsSet = (state: DemoState): boolean => !!state.demoAccess;

/**
 * Danh sách tài khoản demo hiện khi chưa đặt mã, hoặc tab này đã nhập đúng mã đang dùng.
 * `unlocked` là bản băm đã nhớ khi nhập đúng; Quản trị gốc đổi mã thì bản đã nhớ hết hiệu lực.
 */
export const demoAccountsVisible = (state: DemoState, unlocked: string | null): boolean => !state.demoAccess || unlocked === state.demoAccess.codeHash;

/** Nhập mã trình diễn ở màn đăng nhập. Đúng thì trả bản băm để nhớ theo tab. */
export function unlockDemoAccounts(state: DemoState, code: string): Result<string> {
  const access = state.demoAccess;
  if (!access) return ok('');
  if (!normalizeDemoCode(code)) return fail('Vui lòng nhập mã trình diễn.');
  return hashCode(code, access.salt) === access.codeHash ? ok(access.codeHash) : fail('Mã trình diễn không đúng.');
}

/** Quản trị gốc đặt hoặc đổi mã trình diễn (NEW-01). Nhật ký không ghi mã. */
export function rootSetDemoCode(state: DemoState, actor: Actor, code: string, at: Date): Result<DemoState> {
  if (!isRoot(actor)) return fail('Chỉ Quản trị gốc được đặt mã trình diễn.');
  const clean = normalizeDemoCode(code);
  if (clean.length < DEMO_CODE_MIN || clean.length > DEMO_CODE_MAX || !/^[a-z0-9]+$/.test(clean)) return fail(DEMO_CODE_RULE);
  const salt = generateId('MTD');
  const demoAccess: DemoAccess = { salt, codeHash: hashCode(clean, salt), setAt: at.toISOString(), setBy: actor.name ?? 'Quản trị gốc' };
  return ok(audit({ ...state, demoAccess }, actor, state.demoAccess ? 'Đổi mã trình diễn' : 'Đặt mã trình diễn', 'NEW-01 Mã trình diễn', at));
}

/** Bỏ mã: màn đăng nhập hiện lại danh sách tài khoản demo cho mọi người. */
export function rootClearDemoCode(state: DemoState, actor: Actor, at: Date): Result<DemoState> {
  if (!isRoot(actor)) return fail('Chỉ Quản trị gốc được bỏ mã trình diễn.');
  if (!state.demoAccess) return fail('Chưa đặt mã trình diễn.');
  return ok(audit({ ...state, demoAccess: undefined }, actor, 'Bỏ mã trình diễn', 'NEW-01 Mã trình diễn', at));
}

// ---------- Công cụ demo ----------

export const DEMO_TOOLS_ROLES = 'Quản trị gốc và Admin – Vận hành';

export const canUseDemoTools = (actor: Actor): boolean => actor.kind === 'admin' && (actor.adminGroup === 'root' || actor.adminGroup === 'operations');

const requireDemoTools = (actor: Actor): string | null => (canUseDemoTools(actor) ? null : `Chỉ ${DEMO_TOOLS_ROLES} dùng được công cụ này, vì nó thay đổi dữ liệu của mọi máy đang xem demo.`);

const durationLabel = (ms: number): string => (ms % DAY_MS === 0 ? `${ms / DAY_MS} ngày` : ms % HOUR_MS === 0 ? `${ms / HOUR_MS} giờ` : `${Math.round(ms / MINUTE_MS)} phút`);

/** Tua đồng hồ demo thêm `ms`. Store chạy các tác vụ theo giờ ngay sau đó. */
export function demoShiftClock(state: DemoState, actor: Actor, ms: number, at: Date): Result<DemoState> {
  const denied = requireDemoTools(actor);
  if (denied) return fail(denied);
  if (!Number.isFinite(ms) || ms <= 0) return fail('Khoảng tua không hợp lệ.');
  return ok(audit({ ...state, clockOffsetMs: state.clockOffsetMs + ms }, actor, 'Tua thời gian demo', 'Đồng hồ demo', at, `+${durationLabel(ms)}`));
}

export function demoResetClock(state: DemoState, actor: Actor, at: Date): Result<DemoState> {
  const denied = requireDemoTools(actor);
  if (denied) return fail(denied);
  if (state.clockOffsetMs === 0) return fail('Đồng hồ demo đang theo giờ thật.');
  return ok(audit({ ...state, clockOffsetMs: 0 }, actor, 'Đưa đồng hồ demo về giờ thật', 'Đồng hồ demo', at));
}

/**
 * Khôi phục dữ liệu mẫu. Giữ mã trình diễn: đó là cấu hình của buổi demo, không phải dữ liệu mẫu.
 * Nhật ký mới bắt đầu bằng dòng ghi ai đã khôi phục.
 */
export function demoResetData(state: DemoState, actor: Actor, seed: DemoState, at: Date): Result<DemoState> {
  const denied = requireDemoTools(actor);
  if (denied) return fail(denied);
  return ok(audit({ ...seed, demoAccess: state.demoAccess }, actor, 'Khôi phục dữ liệu mẫu', 'Toàn bộ dữ liệu demo', at));
}

/** "Tiền về muộn" và "kết quả cổng lần hai" (mục 5.4): cổng mô phỏng báo thành công với mã tham chiếu mới. */
export function demoGatewaySuccess(state: DemoState, actor: Actor, txId: string, gatewayRef: string, at: Date): Result<{ state: DemoState; outcome: GatewayOutcome }> {
  const denied = requireDemoTools(actor);
  if (denied) return fail(denied);
  const r = applyGatewayResult(state, txId, 'success', gatewayRef, at);
  return r.ok ? ok({ ...r.value, state: audit(r.value.state, actor, 'Gửi kết quả cổng mô phỏng', txId, at) }) : r;
}
