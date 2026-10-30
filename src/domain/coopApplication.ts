/**
 * Quy trình phê duyệt HTX mới (góp ý kiểm thử: "Thiếu quy trình phê duyệt HTX").
 *
 *   1. HTX nộp hồ sơ đăng ký ở màn đăng nhập (SĐT người đại diện + OTP mô phỏng): tên, vùng, địa chỉ, người đại diện,
 *      2 SĐT liên hệ, tài khoản nhận chi trả (chỉ lưu dạng che), sản phẩm dự kiến bán, ảnh giấy tờ (mô phỏng).
 *   2. Admin – Chất lượng tiếp nhận hồ sơ.
 *   3. Thẩm định theo 4 mục kiểm tra.
 *   4. Kết luận: yêu cầu bổ sung (HTX sửa và nộp lại → quay về bước 2), từ chối (ghi lý do), hoặc duyệt (đủ 4 mục).
 *   5. Duyệt thì hệ thống tạo HTX (quyền bán đang hoạt động, hồ sơ đã duyệt) và tài khoản đăng nhập bằng SĐT người đại diện.
 * HTX theo dõi hồ sơ bằng SĐT + OTP mô phỏng ở màn đăng nhập. Mọi bước ghi lịch sử và nhật ký thao tác.
 * Giấy tờ là ảnh HTX chụp; việc xác minh giấy tờ với cơ quan cấp là mô phỏng (Admin tự xem ảnh).
 */
import { DEMO_OTP } from './auth';
import { CONTACT_PHONE_RULE, COOP_PHONE_COUNT, isValidContactPhone, normalizeContactPhone, ADDRESS_MAX_LENGTH, ADDRESS_MIN_LENGTH } from './coopContact';
import { generateId } from './ids';
import { isValidPhone, normalizePhone, PHONE_RULE } from './phone';
import { audit, iso, maskAccount } from './state';
import { fail, ok, type Actor, type Coop, type DemoState, type Result, type UserAccount } from './types';

export type ApplicationStatus = 'submitted' | 'reviewing' | 'needs_info' | 'approved' | 'rejected';

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: 'Chờ tiếp nhận',
  reviewing: 'Đang thẩm định',
  needs_info: 'Cần bổ sung',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
};

export type ApplicationCheck = 'documents' | 'region' | 'contact' | 'products';

/** Các mục Admin – Chất lượng thẩm định; duyệt khi đạt cả 4. */
export const APPLICATION_CHECKS: { key: ApplicationCheck; label: string }[] = [
  { key: 'documents', label: 'Giấy chứng nhận đăng ký HTX hợp lệ, đúng tên HTX (xem ảnh – mô phỏng)' },
  { key: 'region', label: 'Vùng sản xuất, địa chỉ thuộc tỉnh Lào Cai' },
  { key: 'contact', label: 'Đã gọi xác minh SĐT người đại diện và SĐT liên hệ' },
  { key: 'products', label: 'Sản phẩm dự kiến phù hợp danh mục đặc sản của sàn' },
];

export interface ApplicationEvent {
  at: string;
  actor: Actor;
  action: string;
  note?: string;
}

export interface CoopApplication {
  taxCode?: string;
  id: string;
  coopName: string;
  region: string;
  address: string;
  representative: string;
  /** SĐT người đại diện, dùng để đăng nhập khi được duyệt. */
  loginPhone: string;
  /** 2 SĐT liên hệ của HTX (chỉ Admin xem). */
  phones: string[];
  /** Tài khoản nhận chi trả, chỉ lưu dạng che. */
  payoutAccountMasked: string;
  description: string;
  /** Sản phẩm dự kiến bán (HTX tự ghi). */
  products: string;
  /** Ảnh giấy tờ (đã thu nhỏ). */
  documents: string[];
  status: ApplicationStatus;
  checks: Partial<Record<ApplicationCheck, boolean>>;
  /** Lý do từ chối / nội dung cần bổ sung gần nhất. */
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
  history: ApplicationEvent[];
  /** Có khi được duyệt. */
  coopId?: string;
  userId?: string;
}

export interface ApplicationInput {
  taxCode?: string;
  coopName: string;
  region: string;
  address: string;
  representative: string;
  loginPhone: string;
  phones: string[];
  payoutAccount: string;
  description: string;
  products: string;
  documents: string[];
}

const SYSTEM_APPLICANT = (name: string): Actor => ({ kind: 'system', name: `Người nộp hồ sơ (${name})` });

const applicationsOf = (state: DemoState): CoopApplication[] => state.coopApplications ?? [];

/** Kiểm tra nội dung hồ sơ; trả về dữ liệu đã chuẩn hoá. */
function validate(state: DemoState, input: ApplicationInput, otp: string, ignoreId?: string): Result<Omit<CoopApplication, 'id' | 'status' | 'checks' | 'createdAt' | 'updatedAt' | 'history'>> {
  const taxCode=input.taxCode?.trim();
  if(!taxCode)return fail('Vui lòng nhập mã số thuế HTX.');
  if(taxCode&&!/^\d{10}(-\d{3})?$/.test(taxCode))return fail('Mã số thuế phải gồm 10 số hoặc 10 số - 3 số chi nhánh.');
  if(taxCode&&(state.coops.some(c=>c.taxCode===taxCode)||applicationsOf(state).some(a=>a.id!==ignoreId&&a.taxCode===taxCode&&a.status!=='rejected')))return fail('Mã số thuế đã được đăng ký.');
  const coopName = input.coopName.trim().replace(/\s+/g, ' ');
  if (!coopName) return fail('Vui lòng nhập tên HTX.');
  if (state.coops.some((c) => c.name.toLowerCase() === coopName.toLowerCase())) return fail('Tên HTX đã có trên sàn. Vui lòng kiểm tra lại.');
  if (!input.region.trim()) return fail('Vui lòng nhập vùng sản xuất.');
  const address = input.address.trim().replace(/\s+/g, ' ');
  if (address.length < ADDRESS_MIN_LENGTH || address.length > ADDRESS_MAX_LENGTH) return fail(`Địa chỉ cần từ ${ADDRESS_MIN_LENGTH} đến ${ADDRESS_MAX_LENGTH} ký tự.`);
  if (!input.representative.trim()) return fail('Vui lòng nhập người đại diện.');
  const loginPhone = normalizePhone(input.loginPhone);
  if (!isValidPhone(loginPhone)) return fail(`SĐT người đại diện không hợp lệ. ${PHONE_RULE}`);
  if (state.users.some((u) => u.phone === loginPhone)) return fail('SĐT người đại diện đã có tài khoản trên sàn. Dùng số khác hoặc đăng nhập.');
  if (applicationsOf(state).some((a) => a.id !== ignoreId && a.loginPhone === loginPhone && ['submitted', 'reviewing', 'needs_info'].includes(a.status))) {
    return fail('SĐT này đang có hồ sơ chờ xử lý. Tra cứu hồ sơ để theo dõi hoặc bổ sung.');
  }
  if (input.phones.length !== COOP_PHONE_COUNT) return fail(`Nhập đủ ${COOP_PHONE_COUNT} SĐT liên hệ.`);
  const phones = input.phones.map(normalizeContactPhone);
  for (let i = 0; i < phones.length; i++) if (!isValidContactPhone(phones[i])) return fail(`SĐT liên hệ ${i + 1} chưa đúng. ${CONTACT_PHONE_RULE}`);
  if (new Set(phones).size !== phones.length) return fail('Hai SĐT liên hệ phải khác nhau.');
  const account = input.payoutAccount.replace(/\D/g, '');
  if (account.length < 6 || account.length > 19) return fail('Số tài khoản nhận chi trả phải gồm 6–19 chữ số.');
  if (!input.products.trim()) return fail('Vui lòng ghi sản phẩm dự kiến bán.');
  if (input.documents.length === 0) return fail('Vui lòng thêm ảnh giấy chứng nhận đăng ký HTX.');
  if (otp.trim() !== DEMO_OTP) return fail('Mã OTP không đúng.');
  return ok({
    taxCode,
    coopName,
    region: input.region.trim(),
    address,
    representative: input.representative.trim(),
    loginPhone,
    phones,
    payoutAccountMasked: maskAccount(account),
    description: input.description.trim(),
    products: input.products.trim(),
    documents: input.documents,
  });
}

/** Bước 1: HTX nộp hồ sơ (chưa có tài khoản, xác nhận SĐT bằng OTP mô phỏng). */
export function submitCoopApplication(state: DemoState, input: ApplicationInput, otp: string, at: Date): Result<{ state: DemoState; application: CoopApplication }> {
  const v = validate(state, input, otp);
  if (!v.ok) return v;
  const application: CoopApplication = {
    ...v.value,
    id: generateId('HS'),
    status: 'submitted',
    checks: {},
    createdAt: iso(at),
    updatedAt: iso(at),
    history: [{ at: iso(at), actor: SYSTEM_APPLICANT(v.value.representative), action: 'HTX nộp hồ sơ đăng ký' }],
  };
  return ok({ state: { ...state, coopApplications: [application, ...applicationsOf(state)] }, application });
}

/** HTX tra cứu hồ sơ của mình bằng SĐT người đại diện + OTP mô phỏng. */
export function lookupCoopApplications(state: DemoState, phone: string, otp: string): Result<CoopApplication[]> {
  const p = normalizePhone(phone);
  if (!isValidPhone(p)) return fail(`Số điện thoại không hợp lệ. ${PHONE_RULE}`);
  if (otp.trim() !== DEMO_OTP) return fail('Mã OTP không đúng.');
  const found = applicationsOf(state).filter((a) => a.loginPhone === p);
  if (found.length === 0) return fail('Chưa có hồ sơ đăng ký HTX nào với số này.');
  return ok(found);
}

/** HTX bổ sung hồ sơ khi Admin yêu cầu: sửa nội dung rồi nộp lại, hồ sơ về Chờ tiếp nhận. */
export function resubmitCoopApplication(state: DemoState, id: string, input: ApplicationInput, otp: string, at: Date): Result<DemoState> {
  const app = applicationsOf(state).find((a) => a.id === id);
  if (!app) return fail('Không tìm thấy hồ sơ.');
  if (app.status !== 'needs_info') return fail('Hồ sơ không ở bước cần bổ sung.');
  if (normalizePhone(input.loginPhone) !== app.loginPhone) return fail('Không đổi SĐT người đại diện khi bổ sung hồ sơ.');
  const v = validate(state, input, otp, id);
  if (!v.ok) return v;
  const updated: CoopApplication = {
    ...app,
    ...v.value,
    status: 'submitted',
    checks: {},
    updatedAt: iso(at),
    history: [...app.history, { at: iso(at), actor: SYSTEM_APPLICANT(v.value.representative), action: 'HTX bổ sung hồ sơ, nộp lại' }],
  };
  return ok(replace(state, updated));
}

const replace = (state: DemoState, app: CoopApplication): DemoState => ({ ...state, coopApplications: applicationsOf(state).map((a) => (a.id === app.id ? app : a)) });

function forQuality(state: DemoState, actor: Actor, id: string): Result<CoopApplication> {
  if (actor.kind !== 'admin' || actor.adminGroup !== 'quality') return fail('Chỉ Admin – Chất lượng xử lý hồ sơ đăng ký HTX.');
  const app = applicationsOf(state).find((a) => a.id === id);
  if (!app) return fail('Không tìm thấy hồ sơ.');
  return ok(app);
}

/** Bước 2: Admin – Chất lượng tiếp nhận hồ sơ, chuyển sang thẩm định. */
export function qualityAcceptApplication(state: DemoState, actor: Actor, id: string, at: Date): Result<DemoState> {
  const r = forQuality(state, actor, id);
  if (!r.ok) return r;
  if (r.value.status !== 'submitted') return fail('Hồ sơ không ở bước chờ tiếp nhận.');
  const app: CoopApplication = {
    ...r.value,
    status: 'reviewing',
    updatedAt: iso(at),
    history: [...r.value.history, { at: iso(at), actor, action: 'Admin – Chất lượng tiếp nhận, bắt đầu thẩm định' }],
  };
  return ok(audit(replace(state, app), actor, 'Tiếp nhận hồ sơ HTX', app.coopName, at, app.id));
}

/** Bước 3: đánh dấu từng mục thẩm định. */
export function qualitySetCheck(state: DemoState, actor: Actor, id: string, check: ApplicationCheck, passed: boolean, at: Date): Result<DemoState> {
  const r = forQuality(state, actor, id);
  if (!r.ok) return r;
  if (r.value.status !== 'reviewing') return fail('Chỉ thẩm định hồ sơ đang ở bước thẩm định.');
  const app: CoopApplication = { ...r.value, checks: { ...r.value.checks, [check]: passed }, updatedAt: iso(at) };
  return ok(replace(state, app));
}

export const allChecksPassed = (app: Pick<CoopApplication, 'checks'>): boolean => APPLICATION_CHECKS.every((c) => app.checks[c.key]);

/** Bước 4: yêu cầu HTX bổ sung (ghi rõ cần bổ sung gì). */
export function qualityRequestInfo(state: DemoState, actor: Actor, id: string, note: string, at: Date): Result<DemoState> {
  const r = forQuality(state, actor, id);
  if (!r.ok) return r;
  if (r.value.status !== 'reviewing') return fail('Chỉ yêu cầu bổ sung khi hồ sơ đang thẩm định.');
  if (!note.trim()) return fail('Vui lòng ghi nội dung cần bổ sung.');
  const app: CoopApplication = {
    ...r.value,
    status: 'needs_info',
    reviewNote: note.trim(),
    updatedAt: iso(at),
    history: [...r.value.history, { at: iso(at), actor, action: 'Yêu cầu HTX bổ sung hồ sơ', note: note.trim() }],
  };
  return ok(audit(replace(state, app), actor, 'Yêu cầu bổ sung hồ sơ HTX', app.coopName, at, note.trim()));
}

/** Bước 4–5: từ chối (bắt buộc lý do) hoặc duyệt (đạt cả 4 mục) – duyệt thì tạo HTX và tài khoản đăng nhập. */
export function qualityDecideApplication(state: DemoState, actor: Actor, id: string, approve: boolean, note: string, at: Date): Result<DemoState> {
  const r = forQuality(state, actor, id);
  if (!r.ok) return r;
  const app0 = r.value;
  if (app0.status !== 'reviewing') return fail('Chỉ kết luận hồ sơ đang thẩm định.');
  if (!approve) {
    if (!note.trim()) return fail('Từ chối hồ sơ phải ghi lý do.');
    const app: CoopApplication = {
      ...app0,
      status: 'rejected',
      reviewNote: note.trim(),
      updatedAt: iso(at),
      history: [...app0.history, { at: iso(at), actor, action: 'Từ chối hồ sơ', note: note.trim() }],
    };
    return ok(audit(replace(state, app), actor, 'Từ chối hồ sơ HTX', app.coopName, at, note.trim()));
  }
  if (!allChecksPassed(app0)) return fail('Cần đạt đủ 4 mục thẩm định trước khi duyệt.');
  if (state.users.some((u) => u.phone === app0.loginPhone)) return fail('SĐT người đại diện đã có tài khoản; không tạo được tài khoản HTX.');
  const coop: Coop = {
    taxCode:app0.taxCode,
    id: generateId('coop'),
    name: app0.coopName,
    region: app0.region,
    representative: app0.representative,
    description: app0.description,
    payoutAccountMasked: app0.payoutAccountMasked,
    phones: app0.phones,
    storeAddress: app0.address,
    status: 'active',
    profileStatus: 'approved',
  };
  const user: UserAccount = { id: generateId('U'), phone: app0.loginPhone, name: app0.coopName, role: 'coop', coopId: coop.id, status: 'active', createdAt: iso(at) };
  const app: CoopApplication = {
    ...app0,
    status: 'approved',
    reviewNote: note.trim() || undefined,
    coopId: coop.id,
    userId: user.id,
    updatedAt: iso(at),
    history: [...app0.history, { at: iso(at), actor, action: 'Duyệt hồ sơ, tạo HTX và tài khoản đăng nhập', note: note.trim() || undefined }],
  };
  const next = { ...replace(state, app), coops: [...state.coops, coop], users: [...state.users, user] };
  return ok(audit(next, actor, 'Duyệt hồ sơ HTX, cấp tài khoản', app.coopName, at, `${app.id} · ${app.loginPhone}`));
}

export type ApplicationStepKey = 'submitted' | 'accepted' | 'review' | 'decided' | 'activated';

export interface ApplicationStep {
  key: ApplicationStepKey;
  title: string;
  state: 'done' | 'current' | 'upcoming' | 'failed';
  at?: string;
  detail?: string;
}

/** Các bước của hồ sơ, cho Admin và cho HTX khi tra cứu. */
export function applicationSteps(app: CoopApplication): ApplicationStep[] {
  const last = (re: RegExp) => [...app.history].reverse().find((h) => re.test(h.action));
  const accepted = last(/tiếp nhận/);
  const passed = APPLICATION_CHECKS.filter((c) => app.checks[c.key]).length;
  const decided = app.status === 'approved' || app.status === 'rejected';
  return [
    { key: 'submitted', title: 'HTX nộp hồ sơ', state: 'done', at: app.createdAt, detail: app.history.length > 1 && last(/bổ sung hồ sơ, nộp lại/) ? 'Đã bổ sung, nộp lại' : undefined },
    { key: 'accepted', title: 'Admin – Chất lượng tiếp nhận', state: app.status === 'submitted' ? 'current' : 'done', at: app.status === 'submitted' ? undefined : accepted?.at },
    {
      key: 'review',
      title: 'Thẩm định hồ sơ',
      state: app.status === 'reviewing' ? 'current' : app.status === 'needs_info' ? 'failed' : decided ? 'done' : 'upcoming',
      detail: app.status === 'needs_info' ? `Cần bổ sung: ${app.reviewNote}` : app.status === 'reviewing' || decided ? `Đạt ${passed}/${APPLICATION_CHECKS.length} mục` : undefined,
    },
    {
      key: 'decided',
      title: 'Kết luận: duyệt / từ chối',
      state: app.status === 'approved' ? 'done' : app.status === 'rejected' ? 'failed' : 'upcoming',
      at: decided ? app.updatedAt : undefined,
      detail: app.status === 'rejected' ? `Từ chối: ${app.reviewNote}` : app.status === 'approved' ? 'Đã duyệt' : undefined,
    },
    {
      key: 'activated',
      title: 'Tạo HTX và tài khoản đăng nhập',
      state: app.status === 'approved' ? 'done' : 'upcoming',
      at: app.status === 'approved' ? app.updatedAt : undefined,
      detail: app.status === 'approved' ? 'HTX đăng nhập bằng SĐT người đại diện và OTP' : undefined,
    },
  ];
}
