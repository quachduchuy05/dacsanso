import { describe, expect, it } from 'vitest';
import { findUserByPhone, googleLogin, isEmail, loginIdentityLabel, maskEmail, registerGoogleCustomer, type GoogleProfile } from '../auth';
import { inHanoiBounds, matchWard, roundCoord, wardKey } from '../geo';
import type { Result } from '../types';
import { makeState, T0 } from './fixtures';

const must = <T,>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

const profile: GoogleProfile = { id: 'a'.repeat(32), name: '  Hoàng Tạ  ', emailMasked: 'ho•••@gmail.com', simulated: false };

describe('Đăng nhập bằng Google', () => {
  it('lần đầu tạo tài khoản khách (không có SĐT), lần sau dùng lại; bị khoá thì báo', () => {
    let s = makeState();
    expect(must(googleLogin(s, profile))).toBeNull();
    const created = must(registerGoogleCustomer(s, profile, T0));
    s = created.state;
    expect(created.user).toMatchObject({ name: 'Hoàng Tạ', phone: '', role: 'customer', status: 'active', google: { id: profile.id, emailMasked: 'ho•••@gmail.com', simulated: false } });
    expect(s.customers.find((c) => c.id === created.user.customerId)).toMatchObject({ name: 'Hoàng Tạ', phone: '' });
    expect(must(googleLogin(s, profile))?.id).toBe(created.user.id);
    expect(registerGoogleCustomer(s, profile, T0).ok).toBe(false);
    // Tài khoản không có SĐT không bị khớp khi ai đó nhập SĐT rỗng.
    expect(findUserByPhone(s, '')).toBeUndefined();
    const locked = { ...s, users: s.users.map((u) => (u.id === created.user.id ? { ...u, status: 'locked' as const } : u)) };
    expect(googleLogin(locked, profile)).toEqual({ ok: false, error: 'Tài khoản đang bị khoá. Vui lòng liên hệ CSKH.' });
  });

  it('từ chối mã tài khoản không hợp lệ; tên trống thì đặt "Khách Google"', () => {
    const s = makeState();
    expect(googleLogin(s, { ...profile, id: 'khong-phai-ma-bam' }).ok).toBe(false);
    expect(must(registerGoogleCustomer(s, { ...profile, name: '   ' }, T0)).user.name).toBe('Khách Google');
  });

  it('hiện cách đăng nhập: SĐT hoặc Google kèm email đã che', () => {
    expect(loginIdentityLabel({ phone: '0900000001' })).toBe('0900000001');
    expect(loginIdentityLabel({ phone: '', google: { id: 'x', emailMasked: 'ho•••@gmail.com', simulated: true } })).toBe('Google (mô phỏng) · ho•••@gmail.com');
    expect(maskEmail(' HoangTa@Gmail.com ')).toBe('ho•••@gmail.com');
    expect(isEmail('ten@gmail.com')).toBe(true);
    expect(isEmail('ten@gmail')).toBe(false);
  });
});

describe('Địa chỉ theo GPS', () => {
  const wards = [
    { id: 'w-caugiay', name: 'Phường Cầu Giấy (mẫu)', distanceKm: 8 },
    { id: 'w-thanhxuan', name: 'Phường Thanh Xuân (mẫu)', distanceKm: 9 },
    { id: 'w-socson', name: 'Xã Sóc Sơn (mẫu)', distanceKm: 35 },
  ];

  it('khớp tên khu vực Google trả về với danh sách phường (bỏ dấu, bỏ "Phường", bỏ "(mẫu)")', () => {
    expect(wardKey('Phường Cầu Giấy (mẫu)')).toBe('cau giay');
    expect(matchWard(wards, ['Trung Hoà', 'Cầu Giấy'])?.id).toBe('w-caugiay');
    expect(matchWard(wards, ['Phường Thanh Xuân'])?.id).toBe('w-thanhxuan');
    expect(matchWard(wards, ['Sóc Sơn'])?.id).toBe('w-socson');
    expect(matchWard(wards, [], '25 Lê Văn Lương, Phường Thanh Xuân, Hà Nội')?.id).toBe('w-thanhxuan');
    expect(matchWard(wards, ['Hoàn Kiếm'], 'Hàng Bạc, Hoàn Kiếm, Hà Nội')).toBeUndefined();
    // Không khớp nhầm một phần tên ("Thanh Xuân Bắc" không phải "Thanh Xuân").
    expect(matchWard(wards, [], 'Thanh Xuân Bắc, Hà Nội')).toBeUndefined();
  });

  it('khung Hà Nội và làm tròn toạ độ', () => {
    expect(inHanoiBounds(21.0285, 105.8542)).toBe(true);
    expect(inHanoiBounds(10.7769, 106.7009)).toBe(false);
    expect(roundCoord(21.028512345)).toBe(21.0285);
  });
});
