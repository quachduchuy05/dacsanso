import { describe, expect, it } from 'vitest';
import { linkRefundAccount, opsCreateAccount, opsSetAccountLocked, prepareBankLink, rootSetAdminGroup, unlinkRefundAccount, updateCustomerProfile } from '../account';
import { adminCreateVoucher, adminSetVoucherActive, opsDeleteGiftBox, opsSaveGiftBox, opsUpdateParam } from '../adminConfig';
import { verifyLogin } from '../auth';
import { addToCart } from '../cart';
import { placeCheckout } from '../checkout';
import { coopSubmitProfile, qualityDecideCoopProfile, qualitySetSellingRights } from '../coopProfile';
import { carrierSimulate, coopConfirm, coopHandover, customerConfirmReceived } from '../orders';
import { customerChangeAddress, customerChangeDeliveryDate } from '../orderEdits';
import { coopCreateProduct, coopSetProductHidden, decideProductChange } from '../productChanges';
import { exportReport } from '../reports';
import { averageRating, cskhSetReviewVisibility, coopReplyReview, publicReviews, REVIEW_HIDE_REASONS, submitReview } from '../reviews';
import { addMs, DAY_MS } from '../state';
import type { DemoState, Result } from '../types';
import { evaluateVoucher } from '../voucher';
import { ADMIN_CSKH, ADMIN_OPS, ADMIN_QA, ADMIN_ROOT, COOP_X, COOP_Y, CUSTOMER, keyX, keyXPre, line, makeState, placeInput, REGULATOR, T0 } from './fixtures';

const must = <T,>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

function delivered(): { state: DemoState; id: string } {
  const placed = placeCheckout(makeState(), placeInput([line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, T0);
  if (!placed.ok) throw new Error(placed.error);
  let s = placed.state;
  const id = s.orders[0].id;
  s = must(coopConfirm(s, id, COOP_X, T0));
  s = must(coopHandover(s, id, COOP_X, T0));
  s = must(carrierSimulate(s, id, ADMIN_OPS, 'delivered_reported', '', T0));
  s = must(customerConfirmReceived(s, id, CUSTOMER, T0));
  return { state: s, id };
}

describe('Đánh giá (mục 5.8)', () => {
  it('T19: 2 sao với nhận xét 10 ký tự bị chặn; đánh giá lần hai cùng sản phẩm, cùng đơn bị chặn', () => {
    const { state, id } = delivered();
    expect(submitReview(state, CUSTOMER, { orderId: id, productId: 'x-dry', stars: 2, comment: '1234567890', photos: [] }, T0)).toEqual({
      ok: false,
      error: 'Đánh giá 1–2 sao cần nhận xét tối thiểu 20 ký tự.',
    });
    const first = must(submitReview(state, CUSTOMER, { orderId: id, productId: 'x-dry', stars: 5, comment: 'Ngon', photos: [] }, T0));
    expect(submitReview(first.state, CUSTOMER, { orderId: id, productId: 'x-dry', stars: 4, comment: 'Lần hai', photos: [] }, T0)).toEqual({
      ok: false,
      error: 'Sản phẩm này trong đơn đã được đánh giá.',
    });
  });

  it('chỉ đơn Đã giao; tối đa 5 ảnh; CSKH không ẩn vì sao thấp; điểm TB chỉ tính đánh giá Hiển thị; công khai không lộ mã đơn đầy đủ', () => {
    const { state, id } = delivered();
    expect(submitReview(state, CUSTOMER, { orderId: id, productId: 'x-dry', stars: 5, comment: '', photos: Array(6).fill('d') }, T0).ok).toBe(false);
    const r = must(submitReview(state, CUSTOMER, { orderId: id, productId: 'x-dry', stars: 1, comment: 'Hàng bị ẩm, không đúng mô tả trên trang', photos: [] }, T0));
    expect(averageRating(r.state, 'x-dry')).toEqual({ average: 1, count: 1 });
    expect(cskhSetReviewVisibility(r.state, ADMIN_CSKH, r.review.id, true, 'Sao thấp', T0).ok).toBe(false);
    expect(cskhSetReviewVisibility(r.state, ADMIN_OPS, r.review.id, true, REVIEW_HIDE_REASONS[0], T0).ok).toBe(false);
    const hidden = must(cskhSetReviewVisibility(r.state, ADMIN_CSKH, r.review.id, true, REVIEW_HIDE_REASONS[0], T0));
    expect(averageRating(hidden, 'x-dry')).toEqual({ average: null, count: 0 });
    const pub = JSON.stringify(publicReviews(r.state, 'x-dry'));
    expect(pub).not.toContain(id);
    expect(pub).not.toContain('0900000001');
    expect(coopReplyReview(r.state, COOP_Y, r.review.id, 'Cảm ơn', T0).ok).toBe(false);
    expect(must(coopReplyReview(r.state, COOP_X, r.review.id, 'Cảm ơn góp ý', T0)).reviews[0].coopReply).toBe('Cảm ơn góp ý');
  });
});

describe('Tài khoản, hồ sơ HTX, quyền bán (FR-TK)', () => {
  it('liên kết ngân hàng (mô phỏng): chọn ngân hàng, kiểm tra số tài khoản, xác thực OTP, huỷ liên kết', () => {
    let s = makeState();
    expect(prepareBankLink({ bankCode: '', accountNumber: '000011112222', holder: 'A' })).toEqual({ ok: false, error: 'Vui lòng chọn ngân hàng.' });
    expect(prepareBankLink({ bankCode: 'KHAC', otherBankName: ' ', accountNumber: '000011112222', holder: 'A' })).toEqual({ ok: false, error: 'Vui lòng nhập tên ngân hàng.' });
    expect(prepareBankLink({ bankCode: 'VCB', accountNumber: '12345', holder: 'A' }).ok).toBe(false);
    expect(prepareBankLink({ bankCode: 'VCB', accountNumber: '000011112222', holder: '  ' }).ok).toBe(false);
    // Tên chủ tài khoản viết hoa, bỏ dấu như ngân hàng in; ngân hàng khác thì giữ tên khách gõ.
    expect(prepareBankLink({ bankCode: 'KHAC', otherBankName: 'Ngân hàng X', accountNumber: '0000-1111-2222', holder: 'Nguyễn  Thị Đào' })).toEqual({
      ok: true,
      value: { bankCode: 'KHAC', bankName: 'Ngân hàng X', accountNumber: '000011112222', holder: 'NGUYEN THI DAO' },
    });
    // Sai OTP thì không lưu; chỉ khách tự liên kết được.
    const input = { bankCode: 'TCB', accountNumber: '19001234567', holder: 'Khach 1' };
    expect(linkRefundAccount(s, CUSTOMER, input, '000000', T0)).toEqual({ ok: false, error: 'Mã OTP không đúng.' });
    expect(linkRefundAccount(s, ADMIN_OPS, input, '123456', T0).ok).toBe(false);
    s = must(linkRefundAccount(s, CUSTOMER, input, '123456', T0));
    expect(s.customers[0].refundAccount).toMatchObject({ bankName: 'Techcombank', accountNumber: '19001234567', holder: 'KHACH 1' });
    // Đang có khoản hoàn chuyển vào tài khoản thì chưa huỷ được.
    const refunding = { ...s, refunds: [{ id: 'HT-1', orderId: 'o', customerId: 'cust-1', amount: 1, status: 'refunding' as const, source: 'cancel' as const, reason: '', destination: 'bank_account' as const, createdAt: T0.toISOString() }] };
    expect(unlinkRefundAccount(refunding, CUSTOMER).ok).toBe(false);
    s = must(unlinkRefundAccount(s, CUSTOMER));
    expect(s.customers[0].refundAccount).toBeUndefined();
    expect(unlinkRefundAccount(s, CUSTOMER)).toEqual({ ok: false, error: 'Chưa có tài khoản liên kết.' });
  });

  it('khách sửa tên và khai tài khoản nhận hoàn; Vận hành cấp và khoá tài khoản (không tự khoá); Quản trị gốc phân quyền', () => {
    let s = makeState();
    s = must(updateCustomerProfile(s, CUSTOMER, 'Tên mới'));
    expect(s.users.find((u) => u.id === 'u-kh1')!.name).toBe('Tên mới');
    expect(linkRefundAccount(s, CUSTOMER, { bankCode: 'VCB', accountNumber: '12', holder: 'A' }, '123456', T0).ok).toBe(false);
    s = must(linkRefundAccount(s, CUSTOMER, { bankCode: 'VCB', accountNumber: '0000 1111 2222', holder: 'khach' }, '123456', T0));
    expect(s.customers[0].refundAccount).toEqual({ bankCode: 'VCB', bankName: 'Vietcombank', accountNumber: '000011112222', holder: 'KHACH', linkedAt: T0.toISOString() });

    expect(opsCreateAccount(s, ADMIN_QA, { name: 'HTX Z', phone: '0900000555', role: 'coop', coopId: 'coop-x' }, T0).ok).toBe(false);
    expect(opsCreateAccount(s, ADMIN_OPS, { name: 'HTX X 2', phone: '0900000555', role: 'coop', coopId: 'coop-x' }, T0).ok).toBe(false);
    const created = must(opsCreateAccount(s, ADMIN_OPS, { name: 'Shipper mới', phone: '0900000555', role: 'shipper' }, T0));
    s = created.state;
    expect(verifyLogin(s, '0900000555', '123456').ok).toBe(true);
    const ops = { ...ADMIN_OPS, userId: 'u-ops' };
    expect(opsSetAccountLocked(s, ops, 'u-ops', true, 'x', T0)).toEqual({ ok: false, error: 'Không thể tự khoá tài khoản của chính mình.' });
    expect(opsSetAccountLocked(s, ops, created.user.id, true, '', T0).ok).toBe(false);
    s = must(opsSetAccountLocked(s, ops, created.user.id, true, 'Nghỉ việc', T0));
    expect(verifyLogin(s, '0900000555', '123456').ok).toBe(false);

    expect(rootSetAdminGroup(s, ADMIN_OPS, 'u-fin', 'cskh', T0).ok).toBe(false);
    s = must(rootSetAdminGroup(s, { ...ADMIN_ROOT, userId: 'u-root' }, 'u-fin', 'cskh', T0));
    expect(s.users.find((u) => u.id === 'u-fin')!.adminGroup).toBe('cskh');
  });

  it('HTX gửi hồ sơ → Chờ duyệt; Chất lượng từ chối bắt buộc lý do; tạm khoá quyền bán thì sản phẩm không đặt được', () => {
    let s = makeState();
    s = must(coopSubmitProfile(s, COOP_X, { name: 'HTX X mới', region: 'Vùng A', representative: 'Người đại diện mẫu', description: '' }, T0));
    expect(s.coops[0]).toMatchObject({ name: 'HTX X', profileStatus: 'pending' });
    expect(qualityDecideCoopProfile(s, ADMIN_QA, 'coop-x', false, '', T0).ok).toBe(false);
    s = must(qualityDecideCoopProfile(s, ADMIN_QA, 'coop-x', true, '', T0));
    expect(s.coops[0]).toMatchObject({ name: 'HTX X mới', profileStatus: 'approved' });
    expect(qualitySetSellingRights(s, ADMIN_QA, 'coop-x', false, '', T0).ok).toBe(false);
    s = must(qualitySetSellingRights(s, ADMIN_QA, 'coop-x', false, 'Hồ sơ hết hạn', T0));
    expect(addToCart(s, 'cust-1', 'x-dry', 1, T0)).toEqual({ ok: false, error: 'Sản phẩm hiện không mở bán.' });
  });
});

describe('Sản phẩm, tham số, danh mục, mã ưu đãi', () => {
  it('HTX tạo sản phẩm mới → Chờ duyệt, khách chưa đặt được; duyệt xong mới bán; HTX ẩn có hiệu lực ngay', () => {
    let s = makeState();
    const c = must(coopCreateProduct(s, COOP_X, { name: 'Chè mẫu', description: 'Mô tả', unit: 'gói 100 g', category: 'dry', region: 'Vùng A', kind: 'ready', price: 120_000, stockOnHand: 20 }, T0));
    s = c.state;
    expect(c.product.status).toBe('pending');
    expect(addToCart(s, 'cust-1', c.product.id, 1, T0).ok).toBe(false);
    s = must(decideProductChange(s, s.productChanges[0].id, ADMIN_QA, true, '', T0));
    expect(addToCart(s, 'cust-1', c.product.id, 1, T0).ok).toBe(true);
    s = must(coopSetProductHidden(s, c.product.id, COOP_X, true, T0));
    expect(addToCart(s, 'cust-1', c.product.id, 1, T0).ok).toBe(false);
    expect(coopSetProductHidden(s, c.product.id, COOP_Y, false, T0).ok).toBe(false);
  });

  it('Vận hành sửa tham số kèm lý do; giá trị mới chỉ áp cho đơn tạo sau đó (BR-DAT-06)', () => {
    const placed = placeCheckout(makeState(), placeInput([line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, T0);
    if (!placed.ok) throw new Error(placed.error);
    expect(opsUpdateParam(placed.state, ADMIN_OPS, 'standardShippingFee', 30_000, '', T0).ok).toBe(false);
    expect(opsUpdateParam(placed.state, ADMIN_QA, 'standardShippingFee', 30_000, 'x', T0).ok).toBe(false);
    const s = must(opsUpdateParam(placed.state, ADMIN_OPS, 'standardShippingFee', 30_000, 'Giá ĐVVC tăng', T0));
    expect(s.paramHistory[0]).toMatchObject({ code: 'FEE-01', oldValue: 28_000, newValue: 30_000, reason: 'Giá ĐVVC tăng' });
    expect(s.orders[0].pricing.shippingFee).toBe(28_000);
    expect(s.orders[0].params.standardShippingFee).toBe(28_000);
    const after = placeCheckout(s, placeInput([line('y-dry', 1, 100_000)], { [`coop-y|ready|`]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, T0);
    expect(after.ok && after.state.orders[0].pricing.shippingFee).toBe(30_000);
  });

  it('hộp quà giữ 2–3 loại; Admin tạo mã chỉ giảm tiền hàng, tắt mã thì không dùng được', () => {
    let s = makeState();
    expect(opsDeleteGiftBox(s, ADMIN_OPS, 'box', T0).ok).toBe(false); // còn 1 loại → không xoá được
    s = must(opsSaveGiftBox(s, ADMIN_OPS, { name: 'Hộp 2', fee: 20_000, description: '' }, T0));
    s = must(opsSaveGiftBox(s, ADMIN_OPS, { name: 'Hộp 3', fee: 25_000, description: '' }, T0));
    expect(opsSaveGiftBox(s, ADMIN_OPS, { name: 'Hộp 4', fee: 1, description: '' }, T0).ok).toBe(false);

    expect(adminCreateVoucher(s, ADMIN_OPS, { code: 'ab', title: 'x', kind: 'fixed', value: 1, minSpend: 0, expiresAt: '2099-01-01', usageLimit: 1, firstOrderOnly: false }, T0).ok).toBe(false);
    s = must(adminCreateVoucher(s, ADMIN_OPS, { code: 'MOI10', title: 'Giảm 10%', kind: 'percent', value: 10, maxDiscount: 30_000, minSpend: 0, expiresAt: '2099-01-01', usageLimit: 10, firstOrderOnly: false }, T0));
    const v = s.vouchers.find((x) => x.code === 'MOI10')!;
    const ctx = { lines: [{ productId: 'x-dry', category: 'dry', coopId: 'coop-x', amount: 770_000 }], now: T0, usedCount: 0, isFirstOrder: false };
    expect(evaluateVoucher(v, ctx)).toEqual({ ok: true, value: { eligibleAmount: 770_000, discount: 30_000 } });
    s = must(adminSetVoucherActive(s, ADMIN_OPS, v.id, false, T0));
    expect(evaluateVoucher(s.vouchers.find((x) => x.code === 'MOI10')!, ctx)).toEqual({ ok: false, error: 'Mã đã ngừng áp dụng.' });
  });
});

describe('Khách sửa đơn; báo cáo', () => {
  it('đổi ngày giao D tối đa 1 lần, trước D − PAR-08; đổi địa chỉ trước bàn giao', () => {
    const D = '2026-10-24';
    const placed = placeCheckout(makeState(), placeInput([line('x-pre', 1, 85_000, D)], { [keyXPre(D)]: { shipping: 'standard', paymentMethod: 'online' } }), CUSTOMER, T0);
    if (!placed.ok) throw new Error(placed.error);
    let s = placed.state;
    const id = s.orders[0].id;
    expect(customerChangeDeliveryDate(s, CUSTOMER, id, '2026-11-05', T0).ok).toBe(false); // ngoài khoảng HTX khai
    s = must(customerChangeDeliveryDate(s, CUSTOMER, id, '2026-10-28', T0));
    expect(s.orders[0].deliveryDate).toBe('2026-10-28');
    expect(customerChangeDeliveryDate(s, CUSTOMER, id, '2026-10-29', T0)).toEqual({ ok: false, error: 'Mỗi đơn chỉ đổi ngày giao 1 lần.' });

    const s2 = { ...s, addresses: [...s.addresses, { ...s.addresses[0], id: 'addr-2', street: '2 đường mẫu', wardId: 'w-far' }] };
    s = must(customerChangeAddress(s2, CUSTOMER, id, 'addr-2'));
    expect(s.orders[0].address.wardName).toBe('Xã Xa (mẫu)');
    expect(customerChangeAddress(s2, COOP_X, id, 'addr-2').ok).toBe(false);
    const late = addMs(T0, 30 * DAY_MS);
    expect(customerChangeDeliveryDate(placed.state, CUSTOMER, id, '2026-10-28', late).ok).toBe(false);
  });

  it('xuất báo cáo cho QLNN không có tên, SĐT, địa chỉ khách; khách và HTX không xuất được', () => {
    const { state } = delivered();
    const r = must(exportReport(state, REGULATOR, 'orders', T0));
    expect(r.content).not.toContain('Khách 1');
    expect(r.content).not.toContain('0900000001');
    expect(r.content).toContain('HTX X');
    expect(exportReport(state, CUSTOMER, 'summary', T0).ok).toBe(false);
    expect(exportReport(state, COOP_X, 'summary', T0).ok).toBe(false);
  });
});
