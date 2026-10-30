import { describe, expect, it } from 'vitest';
import { initialStatus, transitionOrder, type StatefulOrder } from '../orderStateMachine';

const at = new Date('2026-10-14T03:00:00Z');
const make = (status: StatefulOrder['status'], kind: StatefulOrder['kind'] = 'ready'): StatefulOrder => ({ status, kind, statusHistory: [] });

describe('Vòng đời đơn (mục 5.5)', () => {
  it('T12: Chờ xác nhận → Đang giao bị từ chối (nhảy cóc)', () => {
    const r = transitionOrder(make('awaiting_confirmation'), { to: 'shipping', actor: { kind: 'coop' }, at });
    expect(r.ok).toBe(false);
  });

  it('T13 (phần trạng thái): HTX từ chối không lý do thì không cho; có lý do thì Đã huỷ và ghi lịch sử', () => {
    const noReason = transitionOrder(make('awaiting_confirmation'), { to: 'cancelled', actor: { kind: 'coop' }, at });
    expect(noReason.ok).toBe(false);
    const withReason = transitionOrder(make('awaiting_confirmation'), { to: 'cancelled', actor: { kind: 'coop', id: 'coop-a' }, at, reason: 'Hết hàng' });
    expect(withReason.ok && withReason.value.status).toBe('cancelled');
    expect(withReason.ok && withReason.value.statusHistory[0]).toMatchObject({ from: 'awaiting_confirmation', to: 'cancelled', reason: 'Hết hàng' });
  });

  it('không quay ngược; đơn mua sẵn không vào Chờ thu hoạch; đặt trước chưa trả đủ không sang chuẩn bị', () => {
    expect(transitionOrder(make('preparing'), { to: 'confirmed', actor: { kind: 'coop' }, at }).ok).toBe(false);
    expect(transitionOrder(make('confirmed', 'ready'), { to: 'awaiting_harvest', actor: { kind: 'coop' }, at }).ok).toBe(false);
    expect(transitionOrder(make('awaiting_harvest', 'preorder'), { to: 'preparing', actor: { kind: 'coop' }, at }).ok).toBe(false);
    expect(
      transitionOrder(make('awaiting_harvest', 'preorder'), { to: 'preparing', actor: { kind: 'coop' }, at, remainingSettled: true }).ok,
    ).toBe(true);
  });

  it('trạng thái đầu: COD mua sẵn vào Chờ xác nhận; online hoặc đặt trước vào Chờ thanh toán', () => {
    expect(initialStatus('ready', false)).toBe('awaiting_confirmation');
    expect(initialStatus('ready', true)).toBe('awaiting_payment');
    expect(initialStatus('preorder', false)).toBe('awaiting_payment');
  });
});
