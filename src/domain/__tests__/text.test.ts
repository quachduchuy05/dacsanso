import { describe, expect, it } from 'vitest';
import { generateOrderCode } from '../ids';
import { DEFAULT_PARAMS, updateParam } from '../params';
import { matchesSearch } from '../text';

describe('Tìm kiếm, mã đơn, tham số', () => {
  it('T20: tìm "com tu le" ra Cốm Tú Lệ (không phân biệt dấu, hoa/thường)', () => {
    expect(matchesSearch('com tu le', ['Cốm Tú Lệ', 'HTX mẫu Tú Lệ'])).toBe(true);
    expect(matchesSearch('COM TU LE', ['Cốm Tú Lệ'])).toBe(true);
    expect(matchesSearch('dao', ['Mận tam hoa'])).toBe(false);
  });

  it('mã đơn dạng DH-yyyymmdd-xxxxxx, không trùng', () => {
    const at = new Date(2026, 9, 14);
    const codes = new Set(Array.from({ length: 500 }, () => generateOrderCode(at)));
    expect(codes.size).toBe(500);
    for (const c of codes) expect(c).toMatch(/^DH-20261014-[A-Z2-9]{6}$/);
  });

  it('sửa tham số bắt buộc lý do và lưu giá trị cũ, mới', () => {
    expect(updateParam(DEFAULT_PARAMS, 'standardShippingFee', 30_000, 'admin-vh', '', new Date()).ok).toBe(false);
    const r = updateParam(DEFAULT_PARAMS, 'standardShippingFee', 30_000, 'admin-vh', 'Điều chỉnh theo giá ĐVVC', new Date());
    expect(r.ok && r.value.change).toMatchObject({ code: 'FEE-01', oldValue: 28_000, newValue: 30_000 });
    expect(DEFAULT_PARAMS.standardShippingFee).toBe(28_000);
  });
});
