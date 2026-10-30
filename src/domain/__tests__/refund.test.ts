import { describe, expect, it } from 'vitest';
import { completeRefund, preorderCancelRefund, refundableAmount, startRefund, type RefundRequest } from '../refund';

describe('Huỷ đặt trước và hoàn tiền (mục 5.7)', () => {
  const D = new Date(2026, 9, 24); // ngày giao 24/10/2026

  it('T14: huỷ lúc 23:59 ngày D−3 hoàn 100% cọc; lúc 00:01 ngày D−2 không hoàn', () => {
    expect(preorderCancelRefund(51_000, D, new Date(2026, 9, 21, 23, 59), 'customer', 3)).toMatchObject({ refundDeposit: 51_000 });
    expect(preorderCancelRefund(51_000, D, new Date(2026, 9, 22, 0, 1), 'customer', 3)).toMatchObject({ refundDeposit: 0, forfeitedDeposit: 51_000 });
  });

  it('HTX từ chối hoặc không cung cấp được thì hoàn 100% dù đã qua mốc', () => {
    expect(preorderCancelRefund(51_000, D, new Date(2026, 9, 23, 10, 0), 'coop_cannot_supply', 3).refundDeposit).toBe(51_000);
  });

  it('T17: không hoàn phần chưa thu (COD); hoàn 2 lần cùng một yêu cầu bị từ chối', () => {
    expect(refundableAmount(0, 300_000, 300_000)).toBe(0);
    expect(refundableAmount(100_000, 150_000, 300_000)).toBe(50_000);

    const req: RefundRequest = { id: 'R1', orderId: 'DH-1', amount: 50_000, status: 'refund_pending' };
    const started = startRefund(req);
    expect(started.ok).toBe(true);
    const done = started.ok ? completeRefund(started.value, 'BANK-1') : null;
    expect(done?.ok).toBe(true);
    const again = done?.ok ? completeRefund(done.value, 'BANK-2') : null;
    expect(again).toEqual({ ok: false, error: 'Yêu cầu này đã được hoàn tiền, không hoàn lần hai.' });
  });
});
