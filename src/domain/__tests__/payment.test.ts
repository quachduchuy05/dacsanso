import { describe, expect, it } from 'vitest';
import { placeCheckout } from '../checkout';
import { runScheduledJobs } from '../jobs';
import { coopReject } from '../orders';
import { applyGatewayResult } from '../payment';
import { addMs, MINUTE_MS } from '../state';
import { COOP_X, COOP_Y, CUSTOMER, keyX, line, makeState, placeInput, T0 } from './fixtures';

function paidOrder() {
  const s = makeState();
  const r = placeCheckout(s, placeInput([line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'online' } }), CUSTOMER, T0);
  if (!r.ok) throw new Error(r.error);
  return r;
}

describe('Thanh toán mô phỏng (mục 5.4)', () => {
  it('thanh toán thành công: đơn sang Chờ xác nhận, hạn HTX xác nhận PAR-11 tính từ lúc này', () => {
    const r = paidOrder();
    const at = addMs(T0, 5 * MINUTE_MS);
    const ok = applyGatewayResult(r.state, r.transaction!.id, 'success', 'REF-1', at);
    if (!ok.ok) throw new Error(ok.error);
    const o = ok.value.state.orders[0];
    expect(o.status).toBe('awaiting_confirmation');
    expect(o.paymentStatus).toBe('paid');
    expect(o.amountPaidOnline).toBe(798_000);
    expect(new Date(o.confirmDeadline!).getTime() - at.getTime()).toBe(24 * 60 * MINUTE_MS);
  });

  it('T13: HTX từ chối không lý do thì không cho; có lý do thì Đã huỷ, thanh toán sang Chờ hoàn tiền', () => {
    const r = paidOrder();
    const paid = applyGatewayResult(r.state, r.transaction!.id, 'success', 'REF-1', T0);
    if (!paid.ok) throw new Error(paid.error);
    const id = paid.value.state.orders[0].id;
    expect(coopReject(paid.value.state, id, COOP_X, '', T0).ok).toBe(false);
    expect(coopReject(paid.value.state, id, COOP_Y, 'Hết hàng', T0)).toEqual({ ok: false, error: 'HTX chỉ được thao tác đơn của HTX mình.' });
    const rejected = coopReject(paid.value.state, id, COOP_X, 'Hết hàng', T0);
    if (!rejected.ok) throw new Error(rejected.error);
    expect(rejected.value.orders[0].status).toBe('cancelled');
    expect(rejected.value.orders[0].paymentStatus).toBe('refund_pending');
    expect(rejected.value.refunds[0]).toMatchObject({ amount: 798_000, source: 'cancel', status: 'refund_pending' });
  });

  it('T15: kết quả thành công đến sau khi đơn đã huỷ → đơn vẫn Đã huỷ, có yêu cầu hoàn tự động', () => {
    const r = paidOrder();
    const { state: expired } = runScheduledJobs(r.state, addMs(T0, 16 * MINUTE_MS));
    expect(expired.orders[0].status).toBe('cancelled');
    const late = applyGatewayResult(expired, r.transaction!.id, 'success', 'REF-LATE', addMs(T0, 20 * MINUTE_MS));
    if (!late.ok) throw new Error(late.error);
    expect(late.value.outcome).toBe('late_payment_refund');
    expect(late.value.state.orders[0].status).toBe('cancelled');
    expect(late.value.state.refunds[0]).toMatchObject({ source: 'late_payment', amount: 798_000 });
  });

  it('T16: cùng gatewayRef gửi 2 lần không có tác dụng; hai gatewayRef khác nhau cùng thành công → lần thứ hai tạo yêu cầu hoàn 100%', () => {
    const r = paidOrder();
    const first = applyGatewayResult(r.state, r.transaction!.id, 'success', 'REF-1', T0);
    if (!first.ok) throw new Error(first.error);
    const repeat = applyGatewayResult(first.value.state, r.transaction!.id, 'success', 'REF-1', T0);
    expect(repeat.ok && repeat.value.outcome).toBe('ignored_same_ref');
    expect(repeat.ok && repeat.value.state).toBe(first.value.state);
    const second = applyGatewayResult(first.value.state, r.transaction!.id, 'success', 'REF-2', T0);
    if (!second.ok) throw new Error(second.error);
    expect(second.value.outcome).toBe('duplicate_payment_refund');
    expect(second.value.state.refunds).toHaveLength(1);
    expect(second.value.state.refunds[0]).toMatchObject({ source: 'duplicate_payment', amount: 798_000 });
    expect(second.value.state.orders[0].status).toBe('awaiting_confirmation');
  });

  it('quá hạn HTX xác nhận (PAR-11): hệ thống huỷ và tạo yêu cầu hoàn 100%', () => {
    const r = paidOrder();
    const paid = applyGatewayResult(r.state, r.transaction!.id, 'success', 'REF-1', T0);
    if (!paid.ok) throw new Error(paid.error);
    const { state } = runScheduledJobs(paid.value.state, addMs(T0, 24 * 60 * MINUTE_MS + 1));
    expect(state.orders[0].status).toBe('cancelled');
    expect(state.refunds[0].amount).toBe(798_000);
  });
});
