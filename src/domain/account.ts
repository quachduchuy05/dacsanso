/**
 * Tài khoản (FR-TK-03, FR-TK-10..12).
 * - Khách sửa thông tin cá nhân và liên kết tài khoản ngân hàng nhận hoàn tiền (TK-03, liên kết là mô phỏng).
 * - Admin – Vận hành cấp và khoá / mở khoá tài khoản (TK-10, TK-12); không tự khoá chính mình; khoá phải ghi lý do.
 * - Quản trị gốc phân quyền: đổi nhóm quyền của tài khoản Admin (TK-11).
 */
import { DEMO_OTP } from './auth';
import { BANKS, OTHER_BANK_CODE } from './banks';
import { generateId } from './ids';
import { isValidPhone, normalizePhone, PHONE_RULE } from './phone';
import { audit, iso } from './state';
import { fail, ok, type Actor, type AdminSubGroup, type BankAccount, type DemoState, type Result, type UserAccount } from './types';

export function updateCustomerProfile(state: DemoState, actor: Actor, name: string): Result<DemoState> {
  if (actor.kind !== 'customer' || !actor.id) return fail('Chỉ khách hàng sửa được thông tin của mình.');
  if (!name.trim()) return fail('Vui lòng nhập họ tên.');
  return ok({
    ...state,
    customers: state.customers.map((c) => (c.id === actor.id ? { ...c, name: name.trim() } : c)),
    users: state.users.map((u) => (u.customerId === actor.id ? { ...u, name: name.trim() } : u)),
  });
}

export interface BankLinkInput {
  /** Mã trong BANKS, hoặc OTHER_BANK_CODE kèm `otherBankName`. */
  bankCode: string;
  otherBankName?: string;
  accountNumber: string;
  holder: string;
}

/** Tên chủ tài khoản theo cách ngân hàng in: viết hoa, không dấu. */
export function normalizeHolderName(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase().replace(/\s+/g, ' ').trim();
}

/**
 * Liên kết ngân hàng, bước 1: kiểm tra thông tin tài khoản trước khi ngân hàng gửi OTP (mô phỏng).
 * Không tra cứu tên chủ tài khoản với ngân hàng thật.
 */
export function prepareBankLink(input: BankLinkInput): Result<BankAccount> {
  const other = input.bankCode === OTHER_BANK_CODE;
  const bankName = other ? (input.otherBankName ?? '').trim() : (BANKS.find((b) => b.code === input.bankCode)?.name ?? '');
  if (!bankName) return fail(other ? 'Vui lòng nhập tên ngân hàng.' : 'Vui lòng chọn ngân hàng.');
  const digits = input.accountNumber.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 19) return fail('Số tài khoản phải gồm 6–19 chữ số.');
  const holder = normalizeHolderName(input.holder);
  if (!holder) return fail('Vui lòng nhập tên chủ tài khoản.');
  return ok({ bankCode: input.bankCode, bankName, accountNumber: digits, holder });
}

/**
 * Liên kết ngân hàng, bước 2 (FR-TK-03): khách nhập OTP mô phỏng của ngân hàng (luôn là 123456) để xác nhận.
 * Thành công thì tài khoản thành tài khoản nhận hoàn tiền đơn COD. Liên kết lại sẽ thay tài khoản cũ.
 */
export function linkRefundAccount(state: DemoState, actor: Actor, input: BankLinkInput, otp: string, at: Date): Result<DemoState> {
  if (actor.kind !== 'customer' || !actor.id) return fail('Chỉ khách hàng liên kết được tài khoản nhận hoàn của mình.');
  const prepared = prepareBankLink(input);
  if (!prepared.ok) return prepared;
  if (otp.trim() !== DEMO_OTP) return fail('Mã OTP không đúng.');
  const refundAccount: BankAccount = { ...prepared.value, linkedAt: iso(at) };
  return ok({ ...state, customers: state.customers.map((c) => (c.id === actor.id ? { ...c, refundAccount } : c)) });
}

/** Huỷ liên kết tài khoản nhận hoàn. Không huỷ được khi đang có khoản hoàn chuyển vào tài khoản này. */
export function unlinkRefundAccount(state: DemoState, actor: Actor): Result<DemoState> {
  if (actor.kind !== 'customer' || !actor.id) return fail('Chỉ khách hàng huỷ được liên kết của mình.');
  const customer = state.customers.find((c) => c.id === actor.id);
  if (!customer?.refundAccount) return fail('Chưa có tài khoản liên kết.');
  const transferring = state.refunds.some((r) => r.customerId === actor.id && r.destination === 'bank_account' && r.status === 'refunding');
  if (transferring) return fail('Đang có khoản hoàn tiền chuyển vào tài khoản này. Huỷ liên kết sau khi hoàn xong.');
  return ok({
    ...state,
    customers: state.customers.map((c) => {
      if (c.id !== actor.id) return c;
      const { refundAccount: _removed, ...rest } = c;
      return rest;
    }),
  });
}

export interface NewAccountInput {
  expiresAt?: string;
  name: string;
  phone: string;
  role: 'coop' | 'admin' | 'regulator' | 'shipper';
  coopId?: string;
  adminGroup?: AdminSubGroup;
}

/** Admin – Vận hành cấp tài khoản HTX, Admin, Cơ quan QLNN, Shipper (FR-TK-10). Khách hàng tự đăng ký. */
export function opsCreateAccount(state: DemoState, actor: Actor, input: NewAccountInput, at: Date): Result<{ state: DemoState; user: UserAccount }> {
  if (actor.kind !== 'admin' || !['operations','root'].includes(actor.adminGroup??'')) return fail('Chỉ Root hoặc Admin – Vận hành được cấp tài khoản.');
  if(input.role==='admin'&&actor.adminGroup!=='root')return fail('Chỉ Quản trị gốc được tạo tài khoản Admin.');
  if(actor.adminGroup==='root'&&input.role!=='admin')return fail('Root chỉ tạo tài khoản Admin; Vận hành cấp tài khoản HTX, QLNN và Shipper.');
  const phone = normalizePhone(input.phone);
  if (!input.name.trim()) return fail('Vui lòng nhập tên tài khoản.');
  if (!isValidPhone(phone)) return fail(`Số điện thoại không hợp lệ. ${PHONE_RULE}`);
  if (state.users.some((u) => u.phone === phone)) return fail('Số điện thoại đã có tài khoản.');
  if (input.role === 'coop' && !state.coops.some((c) => c.id === input.coopId)) return fail('Vui lòng chọn HTX.');
  if(input.role==='coop'&&state.users.some(u=>u.role==='coop'&&u.coopId===input.coopId))return fail('HTX đã có tài khoản đại diện. Không cấp thêm tài khoản cho cùng HTX/MST.');
  if(input.role==='regulator'&&(!input.expiresAt||!/^\d{4}-\d{2}-\d{2}$/.test(input.expiresAt)||!Number.isFinite(Date.parse(input.expiresAt))||new Date(input.expiresAt).toISOString().slice(0,10)!==input.expiresAt||new Date(input.expiresAt+'T23:59:59.999+07:00').getTime()<=at.getTime()))return fail('Tài khoản QLNN cần ngày hết hạn hợp lệ trong tương lai.');
  if (input.role === 'admin' && !input.adminGroup) return fail('Vui lòng chọn nhóm quyền.');
  if (input.role === 'admin' && input.adminGroup === 'root') return fail('Tài khoản Quản trị gốc không cấp qua màn này.');
  const user: UserAccount = {
    id: generateId('U'),
    phone,
    name: input.name.trim(),
    role: input.role,
    coopId: input.role === 'coop' ? input.coopId : undefined,
    adminGroup: input.role === 'admin' ? input.adminGroup : undefined,
    status: 'active',
    createdAt: iso(at),
    ...(input.role==='regulator'?{expiresAt:new Date(input.expiresAt+'T23:59:59.999+07:00').toISOString()}:{}),
  };
  return ok({ state: audit({ ...state, users: [...state.users, user] }, actor, 'Cấp tài khoản', user.name, at, `${user.role} · ${phone}`), user });
}

/** Khoá / mở khoá tài khoản (FR-TK-12). Tài khoản bị khoá không đăng nhập được, phiên đang mở bị đăng xuất. */
export function opsSetAccountLocked(state: DemoState, actor: Actor, userId: string, locked: boolean, reason: string, at: Date): Result<DemoState> {
  if (actor.kind !== 'admin' || actor.adminGroup !== 'operations') return fail('Chỉ Admin – Vận hành được khoá tài khoản.');
  if (actor.userId === userId) return fail('Không thể tự khoá tài khoản của chính mình.');
  const user = state.users.find((u) => u.id === userId);
  if (!user) return fail('Không tìm thấy tài khoản.');
  if (user.accessClosedAt) return fail('Tài khoản đã đóng quyền truy cập theo yêu cầu xóa; không mở lại bằng thao tác mở khóa thông thường.');
  if (user.role === 'admin' && user.adminGroup === 'root') return fail('Không khoá tài khoản Quản trị gốc qua màn này.');
  if (locked && !reason.trim()) return fail('Khoá tài khoản phải ghi lý do.');
  const next = { ...state, users: state.users.map((u) => (u.id === userId ? { ...u, status: locked ? ('locked' as const) : ('active' as const) } : u)) };
  return ok(audit(next, actor, locked ? 'Khoá tài khoản' : 'Mở khoá tài khoản', user.name, at, reason.trim() || undefined));
}

/** Quản trị gốc đổi nhóm quyền của tài khoản Admin (FR-TK-11). */
export function rootSetAdminGroup(state: DemoState, actor: Actor, userId: string, group: AdminSubGroup, at: Date): Result<DemoState> {
  if (actor.kind !== 'admin' || actor.adminGroup !== 'root') return fail('Chỉ Quản trị gốc được phân quyền.');
  const user = state.users.find((u) => u.id === userId);
  if (!user || user.role !== 'admin') return fail('Chỉ phân quyền cho tài khoản Admin.');
  if (user.id === actor.userId) return fail('Không tự đổi nhóm quyền của chính mình.');
  if (group === 'root') return fail('Không cấp thêm quyền Quản trị gốc qua màn này.');
  const next = { ...state, users: state.users.map((u) => (u.id === userId ? { ...u, adminGroup: group } : u)) };
  return ok(audit(next, actor, 'Phân quyền', user.name, at, `${user.adminGroup} → ${group}`));
}
