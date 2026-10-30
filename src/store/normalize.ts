/**
 * Chuẩn hoá dữ liệu demo đọc từ API dữ liệu chung hoặc từ trình duyệt (sửa lỗi bản web, 18/10/2026).
 *
 * Dữ liệu dùng chung được nhiều phiên bản app ghi qua nhiều tuần; bản ghi cũ có thể thiếu trường mà mã hiện tại cần
 * (vd. một mảng mới thêm). Trước đây dữ liệu từ API được dùng nguyên, thiếu trường là màn hình lỗi hoặc trắng trang.
 * Hàm này bù giá trị mặc định cho trường thiếu hoặc sai dạng, bỏ bản ghi hỏng không hiển thị được, giữ nguyên dữ liệu đúng dạng.
 */
import { DEFAULT_PARAMS } from '../domain/params';
import type { DemoState } from '../domain/types';

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const objects = (v: unknown): Obj[] => list(v).filter(isObj);
const withId = (v: unknown): Obj[] => objects(v).filter((x) => typeof x.id === 'string');

/** Mảng danh mục: thiếu thì dùng dữ liệu mẫu. Các mảng dữ liệu khác thiếu thì là mảng rỗng. */
const CATALOGS = new Set(['customers', 'coops', 'wards', 'vouchers', 'giftBoxTypes']);

/** Bảo đảm các trường mảng của một bản ghi là mảng. */
function arrays(x: Obj, keys: string[]): Obj {
  const out = { ...x };
  for (const k of keys) if (!Array.isArray(out[k])) out[k] = [];
  return out;
}

/** Bảng "mã khách → danh sách mã" (yêu thích, theo dõi, kho voucher): bỏ phần tử không phải chuỗi. */
const idLists = (v: unknown): Record<string, string[]> => (isObj(v) ? Object.fromEntries(Object.entries(v).map(([k, l]) => [k, list(l).filter((x): x is string => typeof x === 'string')])) : {});

/** Thông tin hoá đơn công ty (Giai đoạn 8): đủ 4 trường chuỗi thì giữ, sai dạng thì bỏ. */
const invoiceOrNone = (v: unknown): Obj | undefined => (isObj(v) && ['companyName', 'taxCode', 'address', 'email'].every((k) => typeof v[k] === 'string') ? v : undefined);

/** Tin nhắn: nội dung là chuỗi, ảnh kèm (Giai đoạn 8) là mảng chuỗi. */
function normalizeMessage(m: Obj): Obj {
  const out: Obj = { ...m, text: typeof m.text === 'string' ? m.text : '' };
  if (out.photos !== undefined) out.photos = list(out.photos).filter((p): p is string => typeof p === 'string');
  return out;
}

function normalizeOrder(o: Obj): Obj | null {
  // Thiếu tiền hoặc địa chỉ thì không hiển thị được đơn: bỏ.
  if (!isObj(o.pricing) || !isObj(o.address) || typeof o.status !== 'string') return null;
  const out = arrays(o, ['items', 'statusHistory', 'deliveryLog']);
  out.items = objects(out.items);
  out.params = { ...DEFAULT_PARAMS, ...(isObj(o.params) ? o.params : {}) };
  for (const k of ['deliveryAttempts', 'amountPaidOnline', 'codCollected']) if (typeof out[k] !== 'number') out[k] = 0;
  if (out.invoice !== undefined) out.invoice = invoiceOrNone(out.invoice);
  return out;
}

/**
 * Trả về dữ liệu đã chuẩn hoá, hoặc null nếu không phải dữ liệu demo (thiếu cả danh sách tài khoản, sản phẩm, đơn).
 * `fallback` tạo dữ liệu mẫu để lấy giá trị mặc định.
 */
export function normalizeState(raw: unknown, fallback: () => DemoState): DemoState | null {
  if (!isObj(raw) || !['users', 'products', 'orders'].every((k) => Array.isArray(raw[k]))) return null;
  const base = fallback() as unknown as Obj;
  const out: Obj = { ...base, ...raw };

  for (const [k, def] of Object.entries(base)) {
    if (Array.isArray(def)) {
      if (!Array.isArray(out[k])) out[k] = CATALOGS.has(k) ? def : [];
    } else if (isObj(def)) {
      if (!isObj(out[k])) out[k] = def;
    } else if (typeof def === 'number' && typeof out[k] !== 'number') {
      out[k] = def;
    }
  }

  out.params = { ...DEFAULT_PARAMS, ...(out.params as Obj) };
  out.users = withId(out.users);
  out.products = withId(out.products);
  out.orders = withId(out.orders)
    .map(normalizeOrder)
    .filter((o): o is Obj => o !== null);
  out.tickets = withId(out.tickets).map((t) => arrays(t, ['productIds', 'photos', 'history']));
  out.transactions = withId(out.transactions).map((t) => ({ ...arrays(t, ['orderIds', 'processedRefs']), amounts: isObj(t.amounts) ? t.amounts : {} }));
  out.checkouts = withId(out.checkouts).map((c) => arrays(c, ['orderIds']));
  out.voucherUsages = objects(out.voucherUsages).map((u) => arrays(u, ['orderIds']));
  out.payoutPeriods = withId(out.payoutPeriods).map((p) => arrays(p, ['lines']));
  out.reviews = withId(out.reviews).map((r) => arrays(r, ['photos']));
  out.notifications = withId(out.notifications).filter((n) => typeof n.userId === 'string');
  out.carts = Object.fromEntries(Object.entries(out.carts as Obj).map(([k, v]) => [k, objects(v)]));
  if (out.harvests !== undefined) out.harvests = withId(out.harvests).map((h) => arrays(h, ['photos', 'orderIds']));
  if (out.coopApplications !== undefined) out.coopApplications = withId(out.coopApplications).map((a) => arrays(a, ['phones', 'documents', 'history']));
  for (const k of ['orderMessages', 'directMessages']) if (out[k] !== undefined) out[k] = withId(out[k]).map(normalizeMessage);
  out.customers = withId(out.customers).map((c) => (c.invoiceDefault === undefined ? c : { ...c, invoiceDefault: invoiceOrNone(c.invoiceDefault) }));
  if (out.codRemittances !== undefined) out.codRemittances = withId(out.codRemittances).map((r) => arrays(r, ['orderIds']));
  if (out.chatReads !== undefined && !isObj(out.chatReads)) out.chatReads = {};
  for (const k of ['favorites', 'follows', 'savedVouchers', 'seasonWatches']) if (out[k] !== undefined) out[k] = idLists(out[k]);
  if (out.seasonAlerts !== undefined) out.seasonAlerts = isObj(out.seasonAlerts) ? Object.fromEntries(Object.entries(out.seasonAlerts).filter(([, v]) => typeof v === 'string')) : {};
  return out as unknown as DemoState;
}
