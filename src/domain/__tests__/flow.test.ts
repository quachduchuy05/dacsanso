import { describe, expect, it } from 'vitest';
import { placeCheckout } from '../checkout';
import { submitComplaint, cskhUpdateTicket } from '../complaint';
import { confirmRefundBySimBank, startRefundProcessing } from '../finance';
import { runScheduledJobs } from '../jobs';
import { carrierSimulate, coopConfirm, coopHandover, coopReportReady, customerConfirmReceived, ensureRemainingTransaction } from '../orders';
import { applyGatewayResult } from '../payment';
import { coopRequestPreorder, coopRequestPriceChange, coopUpdateStock, decideProductChange } from '../productChanges';
import { closePeriod, eligibleLines, recordPayout, weekStart } from '../settlement';
import { addMs, DAY_MS, HOUR_MS, MINUTE_MS } from '../state';
import { aggregateStats } from '../stats';
import { regulatorOrderRows } from '../access';
import type { DemoState } from '../types';
import { ADMIN_CSKH, ADMIN_FIN, ADMIN_OPS, ADMIN_QA, COOP_X, CUSTOMER, REGULATOR, keyX, keyXPre, line, makeState, placeInput, T0 } from './fixtures';

const must = <T,>(r: { ok: true; value: T } | { ok: false; error: string }): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

function deliveredReadyOrder(): { state: DemoState; id: string } {
  const placed = placeCheckout(makeState(), placeInput([line('x-dry', 2, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'online' } }), CUSTOMER, T0);
  if (!placed.ok) throw new Error(placed.error);
  let s = must(applyGatewayResult(placed.state, placed.transaction!.id, 'success', 'R1', T0)).state;
  const id = s.orders[0].id;
  s = must(coopConfirm(s, id, COOP_X, T0));
  expect(s.orders[0].status).toBe('preparing');
  s = must(coopHandover(s, id, COOP_X, T0));
  expect(s.products.find((p) => p.id === 'x-dry')!.stockOnHand).toBe(8);
  s = must(carrierSimulate(s, id, ADMIN_OPS, 'delivered_reported', '', T0));
  s = must(customerConfirmReceived(s, id, CUSTOMER, T0));
  return { state: s, id };
}

describe('Luồng đơn, khiếu nại, hoàn tiền, đối soát', () => {
  it('mua sẵn: xác nhận → chuẩn bị → bàn giao (trừ tồn) → ĐVVC báo giao → khách nhận', () => {
    const { state } = deliveredReadyOrder();
    expect(state.orders[0].status).toBe('delivered');
    expect(state.orders[0].statusHistory.map((h) => h.to)).toEqual(['awaiting_payment', 'awaiting_confirmation', 'confirmed', 'preparing', 'shipping', 'delivered']);
  });

  it('ĐVVC báo giao thành công mà khách không bấm: sau PAR-26 (hàng khô 72 giờ) tự chuyển Đã giao', () => {
    const placed = placeCheckout(makeState(), placeInput([line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, T0);
    if (!placed.ok) throw new Error(placed.error);
    let s = placed.state;
    const id = s.orders[0].id;
    s = must(coopConfirm(s, id, COOP_X, T0));
    s = must(coopHandover(s, id, COOP_X, T0));
    s = must(carrierSimulate(s, id, ADMIN_OPS, 'delivered_reported', '', T0));
    expect(runScheduledJobs(s, addMs(T0, 71 * HOUR_MS)).state.orders[0].status).toBe('shipping');
    const after = runScheduledJobs(s, addMs(T0, 72 * HOUR_MS)).state.orders[0];
    expect(after.status).toBe('delivered');
    expect(after.codCollected).toBe(798_000);
  });

  it('giao thất bại quá PAR-27 lần giao lại thì sang Đang chuyển hoàn', () => {
    const placed = placeCheckout(makeState(), placeInput([line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, T0);
    if (!placed.ok) throw new Error(placed.error);
    let s = must(coopConfirm(placed.state, placed.state.orders[0].id, COOP_X, T0));
    const id = s.orders[0].id;
    s = must(coopHandover(s, id, COOP_X, T0));
    for (let i = 0; i < 3; i++) s = must(carrierSimulate(s, id, ADMIN_OPS, 'failed', 'Không liên lạc được', T0));
    expect(s.orders[0].status).toBe('shipping');
    s = must(carrierSimulate(s, id, ADMIN_OPS, 'failed', 'Không liên lạc được', T0));
    expect(s.orders[0].status).toBe('returning');
  });

  it('đặt trước: HTX báo sẵn sàng → khách trả phần còn lại → tự sang Đang chuẩn bị; quá PAR-24 đủ điều kiện COD thì tự chuyển COD', () => {
    const D = '2026-10-24';
    const placed = placeCheckout(makeState(), placeInput([line('x-pre', 2, 85_000, D)], { [keyXPre(D)]: { shipping: 'standard', paymentMethod: 'online' } }), CUSTOMER, T0);
    if (!placed.ok) throw new Error(placed.error);
    let s = must(applyGatewayResult(placed.state, placed.transaction!.id, 'success', 'R1', T0)).state;
    const id = s.orders[0].id;
    expect(s.orders[0].paymentStatus).toBe('deposit_paid');
    s = must(coopConfirm(s, id, COOP_X, T0));
    expect(s.orders[0].status).toBe('awaiting_harvest');
    s = must(coopReportReady(s, id, COOP_X, T0));
    expect(s.orders[0].status).toBe('awaiting_harvest');
    const { tx, state: withTx } = must(ensureRemainingTransaction(s, id, T0));
    expect(tx.amount).toBe(147_000);

    const paid = must(applyGatewayResult(withTx, tx.id, 'success', 'R2', addMs(T0, HOUR_MS))).state;
    expect(paid.orders[0].status).toBe('preparing');
    expect(paid.orders[0].paymentStatus).toBe('paid');

    const timedOut = runScheduledJobs(s, addMs(T0, 24 * HOUR_MS)).state.orders[0];
    expect(timedOut.status).toBe('preparing');
    expect(timedOut.paymentMethod).toBe('cod');
  });

  it('T18: khiếu nại không ảnh bị chặn; gửi sau hạn RET-01 bị chặn; có ảnh trong hạn thì tạo ticket và CSKH kết luận hoàn', () => {
    const { state, id } = deliveredReadyOrder();
    const base = { orderId: id, productIds: ['x-dry'], reason: 'damaged' as const, description: 'Gói rách', requestRefund: true };
    expect(submitComplaint(state, CUSTOMER, { ...base, photos: [] }, T0)).toEqual({ ok: false, error: 'Vui lòng thêm ít nhất 1 ảnh.' });
    const late = submitComplaint(state, CUSTOMER, { ...base, photos: ['data:'] }, addMs(T0, 241 * HOUR_MS));
    expect(late.ok).toBe(false);
    expect(!late.ok && late.error).toMatch(/quá hạn/);

    const created = must(submitComplaint(state, CUSTOMER, { ...base, photos: ['data:'] }, addMs(T0, HOUR_MS)));
    expect(created.state.orders[0].status).toBe('return_refund');
    expect(cskhUpdateTicket(created.state, created.ticket.id, ADMIN_OPS, 'resolved', 'Đồng ý', T0).ok).toBe(false);
    // Quy trình: phải tiếp nhận rồi mới kết luận.
    expect(cskhUpdateTicket(created.state, created.ticket.id, ADMIN_CSKH, 'resolved', 'Đồng ý', T0)).toEqual({ ok: false, error: 'Cần tiếp nhận ticket trước khi kết luận.' });
    const accepted = must(cskhUpdateTicket(created.state, created.ticket.id, ADMIN_CSKH, 'processing', '', T0));
    const resolved = must(cskhUpdateTicket(accepted, created.ticket.id, ADMIN_CSKH, 'resolved', 'Đồng ý hoàn 1 sản phẩm', T0, true));
    const refund = resolved.refunds.find((r) => r.source === 'return')!;
    expect(refund.amount).toBe(1_540_000);
    const started = must(startRefundProcessing(resolved, refund.id, ADMIN_FIN, T0));
    const done = must(confirmRefundBySimBank(started, refund.id, ADMIN_FIN, T0));
    expect(done.orders[0].paymentStatus).toBe('refunded');
    expect(confirmRefundBySimBank(done, refund.id, ADMIN_FIN, T0).ok).toBe(false);
  });

  it('khiếu nại ưu tiên Cao với lý do dị vật; "Đổi ý" không chọn hoàn tiền được', () => {
    const { state, id } = deliveredReadyOrder();
    const t = must(submitComplaint(state, CUSTOMER, { orderId: id, productIds: ['x-dry'], reason: 'foreign_object', description: 'Thông tin vấn đề hàng hóa', photos: ['data:'], requestRefund: false }, T0));
    expect(t.ticket.priority).toBe('high');
    expect(submitComplaint(state, CUSTOMER, { orderId: id, productIds: ['x-dry'], reason: 'changed_mind', description: 'Thông tin vấn đề hàng hóa', photos: ['data:'], requestRefund: true }, T0).ok).toBe(false);
  });

  it('L12: HTX báo thu hoạch / đổi giá sang Chờ duyệt; Admin – Chất lượng duyệt hoặc từ chối (bắt buộc lý do); tồn kho có hiệu lực ngay', () => {
    let s = makeState();
    s = must(coopRequestPreorder(s, 'x-pre', COOP_X, { totalSlots: 40, deliveryFrom: '2026-11-01', deliveryTo: '2026-11-15', open: true }, '', T0));
    expect(s.products.find((p) => p.id === 'x-pre')!.preorder!.totalSlots).toBe(15);
    s = must(coopRequestPriceChange(s, 'x-dry', COOP_X, 800_000, '', T0));
    expect(s.products.find((p) => p.id === 'x-dry')!.price).toBe(770_000);
    const [price, pre] = s.productChanges;
    expect(decideProductChange(s, price.id, ADMIN_QA, false, '', T0).ok).toBe(false);
    s = must(decideProductChange(s, price.id, ADMIN_QA, false, 'Giá cao bất thường', T0));
    s = must(decideProductChange(s, pre.id, ADMIN_QA, true, '', T0));
    expect(s.products.find((p) => p.id === 'x-pre')!.preorder!.totalSlots).toBe(40);
    expect(s.products.find((p) => p.id === 'x-dry')!.price).toBe(770_000);
    s = must(coopUpdateStock(s, 'x-dry', COOP_X, 25, T0));
    expect(s.products.find((p) => p.id === 'x-dry')!.stockOnHand).toBe(25);
    expect(s.auditLogs.length).toBeGreaterThan(0);
  });

  it('L13: đối soát tuần, hoa hồng COM-01 5% trên tiền hàng, không tính phí giao; Admin – Tài chính chốt kỳ và ghi nhận chi trả', () => {
    const { state } = deliveredReadyOrder();
    const cutoff = addMs(weekStart(T0), 7 * DAY_MS);
    const lines = eligibleLines(state, 'coop-x', cutoff);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ goods: 1_540_000, commission: 77_000, payout: 1_463_000 });
    expect(closePeriod(state, 'coop-x', ADMIN_FIN, cutoff, T0).ok).toBe(false);
    const closed = must(closePeriod(state, 'coop-x', ADMIN_FIN, cutoff, cutoff));
    expect(eligibleLines(closed, 'coop-x', cutoff)).toHaveLength(0);
    const paid = must(recordPayout(closed, closed.payoutPeriods[0].id, ADMIN_FIN, cutoff));
    expect(paid.payoutPeriods[0].status).toBe('paid');
    expect(recordPayout(paid, paid.payoutPeriods[0].id, ADMIN_FIN, cutoff).ok).toBe(false);
  });

  it('L17: số liệu tổng hợp tính từ dữ liệu; dòng cho QLNN không có tên, SĐT, địa chỉ khách', () => {
    const { state } = deliveredReadyOrder();
    const stats = aggregateStats(state);
    expect(stats.ordersTotal).toBe(1);
    expect(stats.ordersByStatus.delivered).toBe(1);
    expect(stats.deliveredGoodsValue).toBe(1_540_000);
    const rows = JSON.stringify(regulatorOrderRows(state, REGULATOR));
    expect(rows).not.toContain('Khách 1');
    expect(rows).not.toContain('0900000001');
    expect(rows).not.toContain('đường mẫu');
  });

  it('tua thời gian không làm hỏng đơn COD trong cùng lần đặt (hết hạn chỉ huỷ đơn online)', () => {
    const placed = placeCheckout(makeState(), placeInput([line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, T0);
    if (!placed.ok) throw new Error(placed.error);
    expect(placed.transaction).toBeUndefined();
    expect(runScheduledJobs(placed.state, addMs(T0, 20 * MINUTE_MS)).state.orders[0].status).toBe('awaiting_confirmation');
  });
});
