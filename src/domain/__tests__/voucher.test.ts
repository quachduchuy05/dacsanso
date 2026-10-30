import { describe, expect, it } from 'vitest';
import { evaluateVoucher, selectVoucher, type Voucher } from '../voucher';

const base: Voucher = {
  id: 'V1',
  code: 'GIAM50',
  title: 'Giảm 50.000đ',
  kind: 'fixed',
  value: 50_000,
  minSpend: 350_000,
  expiresAt: '2099-01-01T00:00:00Z',
  usageLimit: 100,
  firstOrderOnly: false,
};
const now = new Date('2026-10-14T03:00:00Z');
const line = (amount: number, category = 'dry') => ({ productId: 'p1', category, coopId: 'c1', amount });

describe('Mã ưu đãi (BR-KM-01..08)', () => {
  it('T2: đã áp một mã, áp thêm mã thứ hai → từ chối, giữ mã đầu', () => {
    const r = selectVoucher(['V1'], 'V2', 1);
    expect(r).toEqual({ ok: false, error: 'Mỗi lần đặt chỉ dùng 1 mã.' });
  });

  it('T3: mã giảm 50.000 trên tiền hàng hợp lệ 30.000 → giảm 30.000', () => {
    const r = evaluateVoucher({ ...base, minSpend: 0 }, { lines: [line(30_000)], now, usedCount: 0, isFirstOrder: false });
    expect(r).toEqual({ ok: true, value: { eligibleAmount: 30_000, discount: 30_000 } });
  });

  it('mã chưa đủ mức chi tối thiểu thì không chọn được và có lý do', () => {
    const r = evaluateVoucher(base, { lines: [line(300_000)], now, usedCount: 0, isFirstOrder: false });
    expect(r.ok).toBe(false);
  });

  it('mã theo danh mục chỉ tính dòng hợp lệ; mã hết hạn, hết lượt, chỉ khách lần đầu bị chặn', () => {
    const byCategory = evaluateVoucher(
      { ...base, minSpend: 0, categories: ['processed'] },
      { lines: [line(500_000, 'dry'), line(100_000, 'processed')], now, usedCount: 0, isFirstOrder: false },
    );
    expect(byCategory).toEqual({ ok: true, value: { eligibleAmount: 100_000, discount: 50_000 } });

    const ctx = { lines: [line(500_000)], now, usedCount: 0, isFirstOrder: false };
    expect(evaluateVoucher({ ...base, expiresAt: '2026-01-01T00:00:00Z' }, ctx)).toEqual({ ok: false, error: 'Mã đã hết hạn.' });
    expect(evaluateVoucher(base, { ...ctx, usedCount: 100 })).toEqual({ ok: false, error: 'Mã đã hết lượt sử dụng.' });
    expect(evaluateVoucher({ ...base, firstOrderOnly: true }, ctx)).toEqual({ ok: false, error: 'Mã chỉ dành cho khách đặt lần đầu.' });
  });
});
