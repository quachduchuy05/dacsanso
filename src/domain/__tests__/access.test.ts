import { describe, expect, it } from 'vitest';
import { getOrderFor, listOrdersFor, readAuditLogs, regulatorOrderRows, viewRefundAccount } from '../access';
import { actorOf, registerCustomer, verifyLogin } from '../auth';
import { placeCheckout } from '../checkout';
import { ADMIN_FIN, ADMIN_ROOT, COOP_X, COOP_Y, CUSTOMER, keyX, line, makeState, placeInput, REGULATOR, T0 } from './fixtures';

function withOrder() {
  const r = placeCheckout(makeState(), placeInput([line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, T0);
  if (!r.ok) throw new Error(r.error);
  return { state: r.state, id: r.state.orders[0].id };
}

describe('Đăng nhập demo và phân quyền (mục 5.9)', () => {
  it('đăng nhập SĐT + OTP mô phỏng 123456; sai OTP, SĐT lạ, tài khoản khoá đều bị chặn', () => {
    const s = makeState();
    const ok = verifyLogin(s, '0900 000 001', '123456');
    expect(ok.ok && ok.value.id).toBe('u-kh1');
    expect(verifyLogin(s, '0900000001', '000000')).toEqual({ ok: false, error: 'Mã OTP không đúng.' });
    expect(verifyLogin(s, '0911111111', '123456').ok).toBe(false);
    expect(verifyLogin(s, '0900000999', '123456')).toEqual({ ok: false, error: 'Tài khoản đang bị khoá. Vui lòng liên hệ CSKH.' });
    expect(ok.ok && actorOf(ok.value)).toMatchObject({ kind: 'customer', id: 'cust-1', userId: 'u-kh1' });
  });

  it('khách đăng ký mới bằng OTP; SĐT đã có tài khoản thì không đăng ký được', () => {
    const s = makeState();
    expect(registerCustomer(s, { name: 'Khách mới', phone: '0900000001', otp: '123456' }, T0).ok).toBe(false);
    const r = registerCustomer(s, { name: 'Khách mới', phone: '0900000555', otp: '123456' }, T0);
    expect(r.ok && r.value.state.customers.some((c) => c.name === 'Khách mới')).toBe(true);
  });

  it('T21: QLNN đọc dữ liệu đơn → không có tên, SĐT, địa chỉ khách; không xem chi tiết đơn, không xem nhật ký', () => {
    const { state, id } = withOrder();
    const rows = regulatorOrderRows(state, REGULATOR);
    expect(rows.ok).toBe(true);
    const text = JSON.stringify(rows);
    expect(text).not.toContain('Khách 1');
    expect(text).not.toContain('0900000001');
    expect(text).not.toContain('đường mẫu');
    expect(getOrderFor(state, REGULATOR, id).ok).toBe(false);
    expect(listOrdersFor(state, REGULATOR).ok).toBe(false);
    expect(readAuditLogs(state, REGULATOR).ok).toBe(false);
    expect(regulatorOrderRows(state, CUSTOMER).ok).toBe(false);
  });

  it('T22: HTX A đọc đơn của HTX B → bị từ chối; HTX chỉ thấy đơn của mình', () => {
    const { state, id } = withOrder();
    expect(getOrderFor(state, COOP_Y, id)).toEqual({ ok: false, error: 'Bạn không có quyền xem đơn này.' });
    expect(getOrderFor(state, COOP_X, id).ok).toBe(true);
    const y = listOrdersFor(state, COOP_Y);
    expect(y.ok && y.value).toHaveLength(0);
  });

  it('tài khoản ngân hàng của khách hiện dạng che; chỉ Admin – Tài chính xem đầy đủ; nhật ký chỉ Quản trị gốc xem', () => {
    const s = makeState();
    expect(viewRefundAccount(s, CUSTOMER, 'cust-1')).toMatchObject({ ok: true, value: { accountNumber: '**** 0001' } });
    expect(viewRefundAccount(s, ADMIN_FIN, 'cust-1')).toMatchObject({ ok: true, value: { accountNumber: '000000000001' } });
    expect(viewRefundAccount(s, COOP_X, 'cust-1').ok).toBe(false);
    expect(readAuditLogs(s, ADMIN_ROOT).ok).toBe(true);
    expect(readAuditLogs(s, ADMIN_FIN).ok).toBe(false);
  });
});
