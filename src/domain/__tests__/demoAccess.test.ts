import { describe, expect, it } from 'vitest';
import { createSeedState } from '../../data/seed';
import { placeCheckout } from '../checkout';
import { canUseDemoTools, demoAccountsVisible, demoGatewaySuccess, demoResetClock, demoResetData, demoShiftClock, rootClearDemoCode, rootSetDemoCode, unlockDemoAccounts } from '../demoAccess';
import { MINUTE_MS } from '../state';
import { ADMIN_CSKH, ADMIN_FIN, ADMIN_OPS, ADMIN_QA, ADMIN_ROOT, COOP_X, CUSTOMER, keyX, line, makeState, placeInput, REGULATOR, T0 } from './fixtures';

const NOT_LOGGED_IN = { kind: 'system' as const, name: 'Chưa đăng nhập' };

describe('Chế độ trình diễn an toàn (Giai đoạn 7)', () => {
  it('T29: đã đặt mã thì người chưa nhập mã không thấy danh sách tài khoản; chỉ Quản trị gốc, Admin – Vận hành khôi phục dữ liệu và tua giờ', () => {
    const set = rootSetDemoCode(makeState(), ADMIN_ROOT, 'Demo 2026', T0);
    if (!set.ok) throw new Error(set.error);
    const s = set.value;
    expect(demoAccountsVisible(s, null)).toBe(false);
    expect(unlockDemoAccounts(s, 'sai')).toEqual({ ok: false, error: 'Mã trình diễn không đúng.' });
    const unlocked = unlockDemoAccounts(s, 'demo2026');
    expect(unlocked.ok && demoAccountsVisible(s, unlocked.value)).toBe(true);

    for (const actor of [CUSTOMER, COOP_X, ADMIN_CSKH, ADMIN_QA, ADMIN_FIN, REGULATOR, NOT_LOGGED_IN]) {
      expect(canUseDemoTools(actor)).toBe(false);
      expect(demoResetData(s, actor, createSeedState(T0), T0)).toMatchObject({ ok: false, error: expect.stringContaining('Quản trị gốc và Admin – Vận hành') });
      expect(demoShiftClock(s, actor, 15 * MINUTE_MS, T0).ok).toBe(false);
      expect(demoResetClock({ ...s, clockOffsetMs: 1 }, actor, T0).ok).toBe(false);
      expect(demoGatewaySuccess(s, actor, 'TX-1', 'GW-1', T0).ok).toBe(false);
    }
    for (const actor of [ADMIN_ROOT, ADMIN_OPS]) {
      const shifted = demoShiftClock(s, actor, 15 * MINUTE_MS, T0);
      expect(shifted.ok && shifted.value.clockOffsetMs).toBe(15 * MINUTE_MS);
      expect(shifted.ok && shifted.value.auditLogs[0]).toMatchObject({ action: 'Tua thời gian demo', detail: '+15 phút' });
      const reset = demoResetData(s, actor, createSeedState(T0), T0);
      if (!reset.ok) throw new Error(reset.error);
      // Khôi phục dữ liệu mẫu giữ mã trình diễn; nhật ký mới ghi ai đã khôi phục.
      expect(reset.value.demoAccess).toEqual(s.demoAccess);
      expect(reset.value.auditLogs).toHaveLength(1);
      expect(reset.value.auditLogs[0]).toMatchObject({ action: 'Khôi phục dữ liệu mẫu', actor: { name: actor.name } });
    }
  });

  it('chỉ Quản trị gốc đặt, đổi, bỏ mã; không lưu mã dạng đọc được; đổi mã thì tab đã mở khoá phải nhập lại', () => {
    for (const actor of [ADMIN_OPS, CUSTOMER]) expect(rootSetDemoCode(makeState(), actor, 'demo2026', T0).ok).toBe(false);
    for (const bad of ['abc', 'mã-có-dấu', 'x'.repeat(33)]) expect(rootSetDemoCode(makeState(), ADMIN_ROOT, bad, T0).ok).toBe(false);

    const first = rootSetDemoCode(makeState(), ADMIN_ROOT, 'demo2026', T0);
    if (!first.ok) throw new Error(first.error);
    expect(JSON.stringify(first.value)).not.toContain('demo2026');
    expect(first.value.auditLogs[0]).toMatchObject({ action: 'Đặt mã trình diễn' });
    expect(JSON.stringify(first.value.auditLogs[0])).not.toContain('demo2026');
    const remembered = unlockDemoAccounts(first.value, 'DEMO2026');
    if (!remembered.ok) throw new Error(remembered.error);

    const changed = rootSetDemoCode(first.value, ADMIN_ROOT, 'muamandep', T0);
    if (!changed.ok) throw new Error(changed.error);
    expect(changed.value.auditLogs[0]).toMatchObject({ action: 'Đổi mã trình diễn' });
    expect(demoAccountsVisible(changed.value, remembered.value)).toBe(false);
    expect(unlockDemoAccounts(changed.value, 'demo2026').ok).toBe(false);

    expect(rootClearDemoCode(changed.value, ADMIN_OPS, T0).ok).toBe(false);
    const cleared = rootClearDemoCode(changed.value, ADMIN_ROOT, T0);
    expect(cleared.ok && demoAccountsVisible(cleared.value, null)).toBe(true);
    expect(cleared.ok && rootClearDemoCode(cleared.value, ADMIN_ROOT, T0).ok).toBe(false);
  });

  it('kết quả cổng mô phỏng gửi từ Công cụ demo đi qua đúng quy tắc thanh toán và có nhật ký', () => {
    const placed = placeCheckout(makeState(), placeInput([line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'online' } }), CUSTOMER, T0);
    if (!placed.ok) throw new Error(placed.error);
    const tx = placed.state.transactions[0];
    const r = demoGatewaySuccess(placed.state, ADMIN_OPS, tx.id, 'GW-1', T0);
    if (!r.ok) throw new Error(r.error);
    expect(r.value.state.transactions[0].status).toBe('paid');
    expect(r.value.state.auditLogs[0]).toMatchObject({ action: 'Gửi kết quả cổng mô phỏng', target: tx.id });
    expect(demoResetClock(makeState(), ADMIN_OPS, T0)).toEqual({ ok: false, error: 'Đồng hồ demo đang theo giờ thật.' });
  });
});
