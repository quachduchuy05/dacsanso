import { describe, expect, it } from 'vitest';
import {
  coopAddressOf,
  coopPhonesOf,
  coopSetAddress,
  coopSetPhones,
  formatContactPhone,
  isSampleAddress,
  isValidContactPhone,
  listCoopContacts,
  normalizeContactPhone,
  sampleCoopAddress,
} from '../coopContact';
import { ADMIN_CSKH, ADMIN_FIN, ADMIN_OPS, ADMIN_QA, ADMIN_ROOT, COOP_X, CUSTOMER, makeState, REGULATOR, T0 } from './fixtures';

describe('SĐT liên hệ của HTX', () => {
  it('nhận số di động và số cố định, nhập dạng nào cũng lưu dạng bắt đầu bằng 0', () => {
    expect(normalizeContactPhone('0912 345 678')).toBe('0912345678');
    expect(normalizeContactPhone('912345678')).toBe('0912345678');
    expect(normalizeContactPhone('+84 912 345 678')).toBe('0912345678');
    expect(normalizeContactPhone('84912345678')).toBe('0912345678');
    expect(normalizeContactPhone('0214 382 1234')).toBe('02143821234');
    expect(normalizeContactPhone('+84 214 382 1234')).toBe('02143821234');
    expect(isValidContactPhone('0912345678')).toBe(true);
    expect(isValidContactPhone('02143821234')).toBe(true);
    expect(isValidContactPhone('09123456789')).toBe(false);
    expect(isValidContactPhone('091234567')).toBe(false);
    expect(formatContactPhone('0912345678')).toBe('0912 345 678');
    expect(formatContactPhone('02143821234')).toBe('0214 382 1234');
  });

  it('HTX lưu 2 số của mình (đưa về dạng bắt đầu bằng 0), có nhật ký; HTX khác không bị đổi', () => {
    const s = makeState();
    const r = coopSetPhones(s, COOP_X, ['+84 912 345 678', '0214 382 1234'], T0);
    if (!r.ok) throw new Error(r.error);
    const coop = r.value.coops.find((c) => c.id === 'coop-x')!;
    expect(coop.phones).toEqual(['0912345678', '02143821234']);
    expect(coopPhonesOf(coop)).toEqual(['0912345678', '02143821234']);
    expect(r.value.coops.find((c) => c.id === 'coop-y')!.phones).toBeUndefined();
    expect(r.value.auditLogs[0]).toMatchObject({ action: 'Cập nhật SĐT liên hệ', target: 'HTX X', detail: '0912 345 678 · 0214 382 1234' });
  });

  it('chặn: không phải HTX, thiếu số, số sai, hai số trùng nhau', () => {
    const s = makeState();
    expect(coopSetPhones(s, CUSTOMER, ['0912345678', '0912345679'], T0)).toEqual({ ok: false, error: 'Chỉ HTX cập nhật được SĐT của mình.' });
    expect(coopSetPhones(s, ADMIN_QA, ['0912345678', '0912345679'], T0).ok).toBe(false);
    expect(coopSetPhones(s, COOP_X, ['0912345678'], T0)).toEqual({ ok: false, error: 'Nhập đủ 2 số điện thoại.' });
    expect(coopSetPhones(s, COOP_X, ['0912345678', '  '], T0)).toEqual({ ok: false, error: 'Nhập số điện thoại 2.' });
    expect(coopSetPhones(s, COOP_X, ['12345', '0912345679'], T0).ok).toBe(false);
    expect(coopSetPhones(s, COOP_X, ['0912 345 678', '+84912345678'], T0)).toEqual({ ok: false, error: 'Hai số điện thoại phải khác nhau.' });
  });

  it('dữ liệu đã lưu từ bản trước (chưa có SĐT HTX): HTX mẫu dùng số mẫu, HTX khác chưa có số', () => {
    expect(coopPhonesOf({ id: 'coop-bacha' })).toEqual(['0900000411', '0900000412']);
    expect(coopPhonesOf({ id: 'coop-x' })).toEqual([]);
  });

  it('T23: chỉ Admin (mọi nhóm) xem danh bạ SĐT HTX; HTX chỉ thấy số của mình; khách và QLNN không xem được', () => {
    const r = coopSetPhones(makeState(), COOP_X, ['0912345678', '0912345679'], T0);
    if (!r.ok) throw new Error(r.error);
    const s = r.value;
    for (const admin of [ADMIN_OPS, ADMIN_QA, ADMIN_CSKH, ADMIN_FIN, ADMIN_ROOT]) {
      const listed = listCoopContacts(s, admin);
      if (!listed.ok) throw new Error(listed.error);
      expect(listed.value.map((c) => [c.coopId, c.phones])).toEqual([
        ['coop-x', ['0912345678', '0912345679']],
        ['coop-y', []],
      ]);
    }
    const own = listCoopContacts(s, COOP_X);
    expect(own.ok && own.value.map((c) => c.coopId)).toEqual(['coop-x']);
    expect(listCoopContacts(s, CUSTOMER)).toEqual({ ok: false, error: 'SĐT của HTX chỉ dành cho Admin liên hệ HTX.' });
    expect(listCoopContacts(s, REGULATOR).ok).toBe(false);
  });

  it('HTX lưu địa chỉ: kiểm độ dài, gọn khoảng trắng, có nhật ký; HTX khác và khách không lưu được', () => {
    const s = makeState();
    expect(coopAddressOf(s.coops[0])).toBe('');
    expect(coopSetAddress(s, COOP_X, '   ', T0)).toMatchObject({ ok: false, error: 'Vui lòng nhập địa chỉ.' });
    expect(coopSetAddress(s, COOP_X, 'xã A', T0)).toMatchObject({ ok: false });
    expect(coopSetAddress(s, COOP_X, 'x'.repeat(201), T0)).toMatchObject({ ok: false });
    expect(coopSetAddress(s, CUSTOMER, 'Thôn 1, xã A, tỉnh Lào Cai', T0)).toMatchObject({ ok: false });
    const r = coopSetAddress(s, COOP_X, '  Thôn 1,   xã A, tỉnh Lào Cai ', T0);
    if (!r.ok) throw new Error(r.error);
    expect(coopAddressOf(r.value.coops[0])).toBe('Thôn 1, xã A, tỉnh Lào Cai');
    expect(r.value.coops[1].storeAddress).toBeUndefined();
    expect(r.value.auditLogs[0]).toMatchObject({ action: 'Cập nhật địa chỉ HTX', target: 'HTX X' });
    // Lưu lại đúng địa chỉ cũ: không ghi gì.
    const same = coopSetAddress(r.value, COOP_X, 'Thôn 1, xã A, tỉnh Lào Cai', T0);
    expect(same.ok && same.value).toBe(r.value);
    // Danh bạ của Admin có địa chỉ.
    const listed = listCoopContacts(r.value, ADMIN_OPS);
    expect(listed.ok && listed.value[0].address).toBe('Thôn 1, xã A, tỉnh Lào Cai');
  });

  it('HTX mẫu chưa lưu địa chỉ thì có địa chỉ mẫu theo vùng, ghi rõ là mẫu', () => {
    const a = coopAddressOf({ id: 'coop-bacha', region: 'Bắc Hà' });
    expect(a).toBe(sampleCoopAddress('Bắc Hà'));
    expect(isSampleAddress(a)).toBe(true);
    expect(a).toContain('địa chỉ mẫu');
    expect(isSampleAddress('Thôn 1, xã A')).toBe(false);
  });
});
