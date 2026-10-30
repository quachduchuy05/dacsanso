import { describe, expect, it } from 'vitest';
import { normalizeState } from '../../store/normalize';
import { placeCheckout, planCheckout } from '../checkout';
import { messagePreview, sendDirectMessage, threadItems } from '../coopChat';
import { estimateSharedBytes, MESSAGE_PHOTO_MAX_CHARS, PHOTO_BUDGET_FULL_MESSAGE, photoBudget, SHARED_DATA_LIMIT_BYTES } from '../dataBudget';
import { invoiceErrors, invoiceOrders, saveInvoiceDefault, TAX_CODE_RE, validateInvoice } from '../invoice';
import { coopShop, familyPrice, inPriceRange, parsePriceInput, sortProducts } from '../marketplace';
import { deriveNotifications } from '../notifications';
import { sendOrderMessage } from '../orderContact';
import { coopRequestPreorder, decideProductChange } from '../productChanges';
import { canWatchSeason, isSeasonWatched, seasonOpen, seasonWatchItems, setSeasonWatch } from '../seasonWatch';
import type { CompanyInvoice, DemoState, Product, Review } from '../types';
import { coopAddVariant } from '../variants';
import { ADMIN_QA, COOP_X, COOP_Y, CUSTOMER, keyX, line, makeState, placeInput, T0 } from './fixtures';

function must<T>(r: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

/** Chạy một thao tác như store: thao tác rồi sinh thông báo. */
const run = (s: DemoState, next: DemoState, at = T0) => deriveNotifications(s, next, at);

const closed = (s: DemoState): DemoState => ({ ...s, products: s.products.map((p) => (p.id === 'x-pre' ? { ...p, preorder: { ...p.preorder!, open: false } } : p)) });

/** HTX báo đợt đặt trước, Admin – Chất lượng duyệt. */
function approveRound(s: DemoState, totalSlots: number, deliveryFrom: string, deliveryTo: string, at = T0): DemoState {
  const asked = run(s, must(coopRequestPreorder(s, 'x-pre', COOP_X, { totalSlots, deliveryFrom, deliveryTo, open: true }, '', at)), at);
  const req = asked.productChanges.find((c) => c.status === 'pending')!;
  return run(asked, must(decideProductChange(asked, req.id, ADMIN_QA, true, '', at)), at);
}

const seasonNotices = (s: DemoState) => s.notifications.filter((n) => n.userId === 'u-kh1' && n.title.includes('đã vào mùa'));

const photo = (chars = 2_000) => `data:image/jpeg;base64,${'A'.repeat(chars - 23)}`;

describe('T30: trang HTX công khai', () => {
  it('không có SĐT, địa chỉ; điểm chỉ tính đánh giá Hiển thị; chứng nhận đã xác minh còn hiệu lực; HTX mẫu có nhãn', () => {
    const base = makeState();
    const review = (id: string, stars: number, status: Review['status']): Review => ({
      id,
      orderId: 'DH-1',
      productId: 'x-dry',
      customerId: 'cust-1',
      stars,
      comment: '',
      photos: [],
      status,
      createdAt: '',
    });
    const s: DemoState = {
      ...base,
      coops: base.coops.map((c) => (c.id === 'coop-x' ? { ...c, phones: ['0900000501', '0900000502'], storeAddress: 'Địa chỉ mẫu' } : c)),
      reviews: [review('r1', 5, 'visible'), review('r2', 3, 'visible'), review('r3', 1, 'hidden')],
      products: base.products.map((p) =>
        p.id === 'x-dry'
          ? {
              ...p,
              certifications: [
                { id: 'c1', label: 'Chứng nhận A (mẫu)', issuer: 'Đơn vị mẫu', validUntil: '2027-12-31', verified: true },
                { id: 'c2', label: 'Chứng nhận B (mẫu)', issuer: 'Đơn vị mẫu', validUntil: '2027-12-31', verified: false },
                { id: 'c3', label: 'Chứng nhận C (mẫu)', issuer: 'Đơn vị mẫu', validUntil: '2026-01-01', verified: true },
              ],
            }
          : p,
      ),
    };
    const shop = coopShop(s, 'coop-x', T0)!;
    const text = JSON.stringify(shop);
    expect(text).not.toContain('0900000501');
    expect(text).not.toContain('Địa chỉ mẫu');
    expect(Object.keys(shop)).not.toEqual(expect.arrayContaining(['phones']));
    expect(shop.rating).toEqual({ average: 4, count: 2 });
    expect(shop.certifications.map((c) => c.label)).toEqual(['Chứng nhận A (mẫu)']);
    expect(shop.certifications[0].productNames).toEqual(['x-dry']);
    expect(shop.sample).toBe(false);
    const sampleCoop = { ...s, coops: s.coops.map((c) => (c.id === 'coop-x' ? { ...c, name: 'HTX mẫu X' } : c)) };
    expect(coopShop(sampleCoop, 'coop-x', T0)!.sample).toBe(true);
  });
});

describe('T31: báo tôi khi vào mùa', () => {
  it('lần duyệt đầu: mỗi khách theo dõi 1 thông báo mở trang sản phẩm; duyệt thêm suất trong cùng đợt không báo lặp; đợt mới thì báo', () => {
    let s = closed(makeState());
    const product = s.products.find((p) => p.id === 'x-pre')!;
    expect(canWatchSeason(s, product, T0)).toBe(true);
    s = must(setSeasonWatch(s, CUSTOMER, 'x-pre', true, T0));
    expect(isSeasonWatched(s, 'cust-1', product)).toBe(true);
    // Bấm lần nữa vẫn theo dõi (ghi rõ bật / tắt, chạy lại sau đồng bộ không đảo).
    expect(must(setSeasonWatch(s, CUSTOMER, 'x-pre', true, T0))).toBe(s);

    s = approveRound(s, 20, '2026-11-01', '2026-11-15');
    expect(seasonOpen(s, product, T0)).toBe(true);
    const first = seasonNotices(s);
    expect(first).toHaveLength(1);
    expect(first[0].link).toEqual({ type: 'product', id: 'x-pre' });
    // Khách đặt được ngay: trong danh sách theo dõi hiện "đang nhận đặt trước".
    expect(seasonWatchItems(s, 'cust-1', T0)).toEqual([expect.objectContaining({ key: 'x-pre', open: true })]);

    s = approveRound(s, 40, '2026-11-01', '2026-11-15');
    expect(seasonNotices(s)).toHaveLength(1);

    s = approveRound(s, 30, '2027-05-01', '2027-05-20');
    expect(seasonNotices(s)).toHaveLength(2);
  });

  it('chỉ khách, chỉ sản phẩm đặt trước chưa đặt được; bỏ theo dõi thì không báo', () => {
    const open = makeState();
    expect(setSeasonWatch(open, CUSTOMER, 'x-pre', true, T0)).toEqual({ ok: false, error: 'Sản phẩm đang nhận đặt trước, bạn đặt được ngay.' });
    expect(setSeasonWatch(open, CUSTOMER, 'x-dry', true, T0).ok).toBe(false);
    expect(setSeasonWatch(closed(open), COOP_X, 'x-pre', true, T0).ok).toBe(false);

    // Hết thời gian nhận đặt cũng theo dõi được.
    const late = new Date(2026, 9, 30, 9, 0, 0);
    expect(canWatchSeason(open, open.products.find((p) => p.id === 'x-pre')!, late)).toBe(true);

    let s = must(setSeasonWatch(closed(open), CUSTOMER, 'x-pre', true, T0));
    s = must(setSeasonWatch(s, CUSTOMER, 'x-pre', false, T0));
    s = approveRound(s, 20, '2026-11-01', '2026-11-15');
    expect(seasonNotices(s)).toHaveLength(0);
  });

  it('dữ liệu cũ thiếu trường vẫn đọc được', () => {
    const raw = { ...makeState(), seasonWatches: { 'cust-1': ['x-pre', 3] }, seasonAlerts: { 'cust-1|x-pre': 1, 'cust-1|y': '2026-11-01~2026-11-15' } };
    const s = normalizeState(raw, makeState)!;
    expect(s.seasonWatches).toEqual({ 'cust-1': ['x-pre'] });
    expect(s.seasonAlerts).toEqual({ 'cust-1|y': '2026-11-01~2026-11-15' });
  });
});

describe('T32: sắp xếp và lọc khoảng giá', () => {
  it('sản phẩm có quy cách 135.000 và 225.000 xếp theo giá 135.000 và nằm trong khoảng 100.000–150.000', () => {
    const base = makeState();
    const z: Product = { ...base.products[0], id: 'z', coopId: 'coop-y', name: 'z', price: 225_000, certifications: undefined };
    let s: DemoState = { ...base, products: [...base.products, z] };
    const added = must(coopAddVariant(s, COOP_Y, 'z', { unit: 'hộp nhỏ', price: 135_000, quantity: 3 }, T0));
    s = must(decideProductChange(added.state, added.state.productChanges[0].id, ADMIN_QA, true, '', T0));
    const cards = s.products.filter((p) => !p.variantOf);
    expect(familyPrice(s, z)).toBe(135_000);
    // x-pre 85.000, y-dry 100.000, z từ 135.000, x-dry 770.000.
    expect(sortProducts(s, cards, 'price_asc').map((p) => p.id)).toEqual(['x-pre', 'y-dry', 'z', 'x-dry']);
    const lo = parsePriceInput('100.000');
    const hi = parsePriceInput('150.000đ');
    expect([lo, hi]).toEqual([100_000, 150_000]);
    expect(cards.filter((p) => inPriceRange(familyPrice(s, p), lo, hi)).map((p) => p.id)).toEqual(['y-dry', 'z']);
    // Bỏ trống một đầu, nhập ngược.
    expect(inPriceRange(225_000, 200_000, undefined)).toBe(true);
    expect(inPriceRange(135_000, 150_000, 100_000)).toBe(true);
    expect(parsePriceInput('')).toBeUndefined();
    expect(parsePriceInput('abc')).toBeUndefined();
  });
});

describe('T33: ảnh trong tin nhắn', () => {
  it('tối đa NEW-04 ảnh mỗi tin; tin chỉ có ảnh gửi được; áp cho cả nhắn tin riêng và trao đổi theo đơn', () => {
    const s = makeState();
    const max = s.params.messagePhotoMax;
    expect(max).toBe(2);
    const over = sendDirectMessage(
      s,
      CUSTOMER,
      'coop-x',
      'Ảnh hàng',
      T0,
      undefined,
      Array.from({ length: max + 1 }, () => photo()),
    );
    expect(over).toEqual({ ok: false, error: `Mỗi tin nhắn tối đa ${max} ảnh.` });
    const sent = must(sendDirectMessage(s, CUSTOMER, 'coop-x', '', T0, undefined, [photo(), photo()]));
    const item = threadItems(sent, 'cust-1', 'coop-x')[0];
    expect(item.photos).toHaveLength(2);
    expect(messagePreview(item)).toBe('[2 ảnh]');
    expect(run(s, sent).notifications.find((n) => n.userId === 'u-x')!.body).toBe('[2 ảnh]');
    expect(sendDirectMessage(s, CUSTOMER, 'coop-x', '', T0).ok).toBe(false);
    expect(sendDirectMessage(s, CUSTOMER, 'coop-x', 'x', T0, undefined, ['khong-phai-anh']).ok).toBe(false);
    expect(sendDirectMessage(s, CUSTOMER, 'coop-x', 'x', T0, undefined, [photo(MESSAGE_PHOTO_MAX_CHARS + 1)]).ok).toBe(false);

    // Trao đổi theo đơn.
    const placed = placeCheckout(s, placeInput([line('y-dry', 1, 100_000)], { [`coop-y|ready|`]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, T0);
    if (!placed.ok) throw new Error(placed.error);
    const orderId = placed.state.orders[0].id;
    expect(sendOrderMessage(placed.state, orderId, CUSTOMER, 'x', T0, [photo(), photo(), photo()]).ok).toBe(false);
    const withPhoto = must(sendOrderMessage(placed.state, orderId, CUSTOMER, 'Hàng đây', T0, [photo()]));
    expect(withPhoto.orderMessages!.at(-1)!.photos).toHaveLength(1);
  });

  it('dữ liệu dùng chung gần giới hạn: chặn ảnh trước khi gửi, tin nhắn chữ vẫn gửi được', () => {
    const base = makeState();
    const big = Array.from({ length: 8 }, () => photo(100_000));
    const s: DemoState = { ...base, reviews: [{ id: 'r-big', orderId: 'DH-1', productId: 'x-dry', customerId: 'cust-1', stars: 5, comment: '', photos: big, status: 'visible', createdAt: '' }] };
    expect(estimateSharedBytes(s)).toBeGreaterThan(SHARED_DATA_LIMIT_BYTES * 0.85);
    expect(photoBudget(s).photosAllowed).toBe(false);
    expect(sendDirectMessage(s, CUSTOMER, 'coop-x', 'Ảnh', T0, undefined, [photo()])).toEqual({ ok: false, error: PHOTO_BUDGET_FULL_MESSAGE });
    expect(sendDirectMessage(s, CUSTOMER, 'coop-x', 'Chỉ chữ vẫn gửi được', T0).ok).toBe(true);
    // Dữ liệu mẫu nhỏ thì còn xa giới hạn.
    expect(photoBudget(base, [photo()]).photosAllowed).toBe(true);
  });
});

describe('T34: yêu cầu xuất hoá đơn công ty (mô phỏng)', () => {
  const valid: CompanyInvoice = { companyName: '  Công ty mẫu  A ', taxCode: '0000000001', address: 'Địa chỉ mẫu', email: 'HoaDon@vi-du.test' };
  const options = { [keyX]: { shipping: 'standard' as const, paymentMethod: 'cod' as const } };

  it('mã số thuế sai định dạng bị chặn', () => {
    expect(TAX_CODE_RE.test('12345')).toBe(false);
    expect(TAX_CODE_RE.test('0000000001-001')).toBe(true);
    expect(TAX_CODE_RE.test('0000000001-01')).toBe(false);
    expect(invoiceErrors({ ...valid, taxCode: '12345' }).taxCode).toBeTruthy();
    expect(invoiceErrors({ companyName: '', taxCode: '', address: '', email: 'sai' })).toEqual({
      companyName: expect.any(String),
      taxCode: expect.any(String),
      address: expect.any(String),
      email: expect.any(String),
    });
    const s = makeState();
    const input = placeInput([line('x-dry', 1, 770_000)], options, { invoice: { ...valid, taxCode: '12345' } });
    expect(planCheckout(s, input, T0).errors).toEqual([expect.stringContaining('Mã số thuế')]);
    expect(placeCheckout(s, input, CUSTOMER, T0).ok).toBe(false);
  });

  it('đơn đã tạo giữ đúng thông tin hoá đơn lúc đặt khi khách đổi thông tin mặc định', () => {
    const s = makeState();
    const placed = placeCheckout(s, placeInput([line('x-dry', 1, 770_000)], options, { invoice: valid, saveInvoiceAsDefault: true }), CUSTOMER, T0);
    if (!placed.ok) throw new Error(placed.error);
    const expected = must(validateInvoice(valid));
    expect(expected).toEqual({ companyName: 'Công ty mẫu A', taxCode: '0000000001', address: 'Địa chỉ mẫu', email: 'hoadon@vi-du.test' });
    const order = placed.state.orders[0];
    expect(order.invoice).toEqual(expected);
    expect(placed.state.customers[0].invoiceDefault).toEqual(expected);
    expect(invoiceOrders(placed.state).map((o) => o.id)).toEqual([order.id]);

    const changed = must(saveInvoiceDefault(placed.state, CUSTOMER, { ...valid, companyName: 'Công ty mẫu B', taxCode: '0000000002-001' }));
    expect(changed.customers[0].invoiceDefault!.companyName).toBe('Công ty mẫu B');
    expect(changed.orders[0].invoice).toEqual(expected);
    expect(saveInvoiceDefault(changed, CUSTOMER, { ...valid, taxCode: '12345' }).ok).toBe(false);
    expect(saveInvoiceDefault(changed, COOP_X, valid).ok).toBe(false);
    expect(must(saveInvoiceDefault(changed, CUSTOMER, null)).customers[0].invoiceDefault).toBeUndefined();

    // Không chọn xuất hoá đơn thì đơn không có hoá đơn.
    const plain = placeCheckout(s, placeInput([line('x-dry', 1, 770_000)], options), CUSTOMER, T0);
    expect(plain.ok && plain.state.orders[0].invoice).toBeUndefined();
  });

  it('dữ liệu cũ: hoá đơn sai dạng bị bỏ, đúng dạng giữ nguyên', () => {
    const base = makeState();
    const raw = { ...base, customers: [{ ...base.customers[0], invoiceDefault: { companyName: 1 } }] };
    expect(normalizeState(raw, makeState)!.customers[0].invoiceDefault).toBeUndefined();
    const good = { ...base, customers: [{ ...base.customers[0], invoiceDefault: valid }] };
    expect(normalizeState(good, makeState)!.customers[0].invoiceDefault).toEqual(valid);
  });
});
