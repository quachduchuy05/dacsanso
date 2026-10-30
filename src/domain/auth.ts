/**
 * Đăng nhập demo (mục 5.9, FR-TK-01/02): SĐT + OTP mô phỏng, mã cố định 123456.
 * Khách hàng còn đăng nhập được bằng Google (thật khi đã cấu hình Client ID, không thì mô phỏng).
 * Đổi vai trò bằng đăng xuất rồi đăng nhập tài khoản khác.
 */
import { generateId } from './ids';
import { isValidPhone, normalizePhone, PHONE_RULE } from './phone';
import { iso } from './state';
import { fail, ok, type Actor, type DemoState, type GoogleIdentity, type Result, type UserAccount } from './types';

/** OTP mô phỏng, không gửi SMS thật. */
export const DEMO_OTP = '123456';

export function findUserByPhone(state: DemoState, phone: string): UserAccount | undefined {
  const p = normalizePhone(phone);
  // Tài khoản Google không có SĐT: SĐT rỗng không khớp với ai.
  if (!p) return undefined;
  return state.users.find((u) => u.phone === p);
}

/** Bước 1: nhập SĐT. Không có tài khoản thì gợi ý đăng ký. */
export function requestOtp(state: DemoState, phone: string): Result<UserAccount> {
  const p = normalizePhone(phone);
  if (!isValidPhone(p)) return fail(`Số điện thoại không hợp lệ. ${PHONE_RULE}`);
  const user = findUserByPhone(state, p);
  if (!user) return fail('Số điện thoại chưa có tài khoản. Khách hàng có thể đăng ký mới.');
  if (user.status === 'locked') return fail('Tài khoản đang bị khoá. Vui lòng liên hệ CSKH.');
  return ok(user);
}

/** Bước 2: nhập OTP mô phỏng. */
export function verifyLogin(state: DemoState, phone: string, otp: string): Result<UserAccount> {
  const user = requestOtp(state, phone);
  if (!user.ok) return user;
  if (otp.trim() !== DEMO_OTP) return fail('Mã OTP không đúng.');
  return user;
}

/** Khách hàng đăng ký mới bằng SĐT + OTP mô phỏng (FR-TK-01). HTX, Admin, QLNN do Admin cấp. */
export function registerCustomer(
  state: DemoState,
  input: { name: string; phone: string; otp: string },
  at: Date,
): Result<{ state: DemoState; user: UserAccount }> {
  const phone = normalizePhone(input.phone);
  if (!input.name.trim()) return fail('Vui lòng nhập họ tên.');
  if (!isValidPhone(phone)) return fail(`Số điện thoại không hợp lệ. ${PHONE_RULE}`);
  if (findUserByPhone(state, phone)) return fail('Số điện thoại đã có tài khoản. Vui lòng đăng nhập.');
  if (input.otp.trim() !== DEMO_OTP) return fail('Mã OTP không đúng.');
  const customerId = generateId('KH');
  const user: UserAccount = {
    id: generateId('U'),
    phone,
    name: input.name.trim(),
    role: 'customer',
    customerId,
    status: 'active',
    createdAt: iso(at),
  };
  return ok({
    state: { ...state, users: [...state.users, user], customers: [...state.customers, { id: customerId, name: user.name, phone }] },
    user,
  });
}

/** Che email: giữ 2 ký tự đầu và tên miền (giống api/auth/google.ts). */
export function maskEmail(email: string): string {
  const [local, domain] = email.trim().toLowerCase().split('@');
  if (!local || !domain) return '';
  return `${local.slice(0, 2)}•••@${domain}`;
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** Thông tin Google sau khi đã xác minh (thật: /api/auth/google; mô phỏng: tự tạo trên trình duyệt). */
export interface GoogleProfile extends GoogleIdentity {
  name: string;
}

/** Tài khoản đã đăng nhập bằng Google này trước đó (nếu có). */
export function findGoogleUser(state: DemoState, googleId: string): UserAccount | undefined {
  return state.users.find((u) => u.google?.id === googleId);
}

/** Đăng nhập bằng Google: tài khoản đã có thì dùng lại; bị khoá thì báo. */
export function googleLogin(state: DemoState, profile: GoogleProfile): Result<UserAccount | null> {
  if (!/^[a-f0-9]{16,64}$/.test(profile.id)) return fail('Thông tin tài khoản Google không hợp lệ.');
  const user = findGoogleUser(state, profile.id);
  if (!user) return ok(null);
  if (user.status === 'locked') return fail('Tài khoản đang bị khoá. Vui lòng liên hệ CSKH.');
  return ok(user);
}

/** Lần đầu đăng nhập bằng Google: tạo tài khoản khách hàng (không có SĐT; SĐT người nhận nhập ở địa chỉ giao hàng). */
export function registerGoogleCustomer(state: DemoState, profile: GoogleProfile, at: Date): Result<{ state: DemoState; user: UserAccount }> {
  if (!/^[a-f0-9]{16,64}$/.test(profile.id)) return fail('Thông tin tài khoản Google không hợp lệ.');
  if (findGoogleUser(state, profile.id)) return fail('Tài khoản Google này đã có tài khoản. Vui lòng đăng nhập.');
  const name = profile.name.trim().slice(0, 60) || 'Khách Google';
  const customerId = generateId('KH');
  const user: UserAccount = {
    id: generateId('U'),
    phone: '',
    name,
    role: 'customer',
    customerId,
    status: 'active',
    createdAt: iso(at),
    google: { id: profile.id, emailMasked: profile.emailMasked, simulated: profile.simulated },
  };
  return ok({
    state: { ...state, users: [...state.users, user], customers: [...state.customers, { id: customerId, name, phone: '' }] },
    user,
  });
}

/** Cách đăng nhập của tài khoản để hiện trên màn hình: SĐT, hoặc Google kèm email đã che. */
export function loginIdentityLabel(user: Pick<UserAccount, 'phone' | 'google'>): string {
  if (user.google) return `Google${user.google.simulated ? ' (mô phỏng)' : ''} · ${user.google.emailMasked}`;
  return user.phone;
}

/** Người thao tác tương ứng với tài khoản đăng nhập. */
export function actorOf(user: UserAccount): Actor {
  switch (user.role) {
    case 'customer':
      return { kind: 'customer', id: user.customerId, userId: user.id, name: user.name };
    case 'coop':
      return { kind: 'coop', id: user.coopId, userId: user.id, name: user.name };
    case 'admin':
      return { kind: 'admin', id: user.id, userId: user.id, name: user.name, adminGroup: user.adminGroup };
    case 'regulator':
      return { kind: 'regulator', id: user.id, userId: user.id, name: user.name };
    case 'shipper':
      return { kind: 'shipper', id: user.id, userId: user.id, name: user.name };
  }
}
