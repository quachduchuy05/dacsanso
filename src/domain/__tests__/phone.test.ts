/**
 * Số điện thoại nhập được dạng 10 số (có 0 đầu), 9 số (bỏ 0 đầu) hoặc +84; luôn lưu dạng 10 số.
 */
import { describe, expect, it } from 'vitest';
import { opsCreateAccount } from '../account';
import { addAddress } from '../address';
import { registerCustomer, requestOtp, verifyLogin } from '../auth';
import { planCheckout } from '../checkout';
import { formatPhone, isValidPhone, normalizePhone } from '../phone';
import { ADMIN_OPS, keyY, line, makeState, T0 } from './fixtures';

describe('Chuẩn hoá số điện thoại', () => {
  it.each(['0912345678', '912345678', '912 345 678', '0912.345.678', '+84912345678', '+84 912 345 678', '84912345678', '+84 0912 345 678'])('"%s" → 0912345678', (input) => {
    expect(normalizePhone(input)).toBe('0912345678');
    expect(isValidPhone(normalizePhone(input))).toBe(true);
  });

  it.each(['', '91234567', '091234567', '09123456789', '1234567890', 'abc'])('"%s" không hợp lệ', (input) => {
    expect(isValidPhone(normalizePhone(input))).toBe(false);
  });

  it('hiển thị dạng 0912 345 678', () => {
    expect(formatPhone('912345678')).toBe('0912 345 678');
    expect(formatPhone('+84 912 345 678')).toBe('0912 345 678');
  });
});

describe('Dùng SĐT 9 số trong các chức năng', () => {
  it('đăng nhập bằng 9 số hoặc +84 ra đúng tài khoản 10 số', () => {
    const s = makeState();
    for (const phone of ['900000001', '+84 900 000 001', '0900 000 001']) {
      const r = verifyLogin(s, phone, '123456');
      expect(r.ok && r.value.id, phone).toBe('u-kh1');
    }
    const bad = requestOtp(s, '90000001');
    expect(bad.ok).toBe(false);
    expect(!bad.ok && bad.error).toContain('9 chữ số');
  });

  it('đăng ký bằng 9 số thì lưu dạng 10 số và không đăng ký trùng bằng dạng khác', () => {
    const r = registerCustomer(makeState(), { name: 'Khách mới', phone: '912345678', otp: '123456' }, T0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.user.phone).toBe('0912345678');
    expect(verifyLogin(r.value.state, '0912345678', '123456').ok).toBe(true);
    expect(registerCustomer(r.value.state, { name: 'Trùng', phone: '+84912345678', otp: '123456' }, T0).ok).toBe(false);
  });

  it('Admin cấp tài khoản bằng 9 số', () => {
    const r = opsCreateAccount(makeState(), ADMIN_OPS, { name: 'Shipper mới', phone: '911222333', role: 'shipper' }, T0);
    expect(r.ok && r.value.user.phone).toBe('0911222333');
  });

  it('địa chỉ và người nhận quà nhập 9 số được lưu dạng 10 số', () => {
    const a = addAddress(makeState(), 'cust-1', { label: 'Nhà', receiverName: 'Người nhận', receiverPhone: '912 345 678', houseType: 'ground', wardId: 'w-near', street: '5 đường mẫu' });
    expect(a.ok && a.value.address.receiverPhone).toBe('0912345678');

    const plan = planCheckout(
      makeState(),
      {
        customerId: 'cust-1',
        lines: [line('y-dry', 1, 100_000)],
        addressId: 'addr-1',
        note: '',
        groupOptions: { [keyY]: { shipping: 'standard', paymentMethod: 'online', gift: { boxTypeId: 'box', message: '', sendToOther: true, recipient: { name: 'Người nhận', phone: '+84 900 000 009', wardId: 'w-near', street: '9 đường mẫu' } } } },
      },
      T0,
    );
    expect(plan.errors).toEqual([]);
    expect(plan.orders[0].address.receiverPhone).toBe('0900000009');
  });
});
