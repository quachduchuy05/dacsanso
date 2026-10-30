/**
 * Đối soát HTX (mục 5.10, FR-DT-01..04).
 * - Hoa hồng COM-01 tính trên tiền hàng thực giữ lại, không tính trên phí giao. Phí giao không phải doanh thu HTX.
 * - Sàn chịu toàn bộ chi phí mã ưu đãi, không trừ vào tiền HTX (giả định).
 * - Kỳ đối soát theo tuần (đề xuất). Đơn vào kỳ khi đã Đã giao trước giờ cắt kỳ và không còn yêu cầu trả hàng hay ticket đang mở.
 * - HTX không tự rút tiền. Admin – Tài chính chốt kỳ, duyệt bảng kê và ghi nhận chi trả (mô phỏng) vào tài khoản của HTX.
 * - Kỳ đã chốt bị khoá; sai sót điều chỉnh bằng dòng mới ở kỳ sau.
 */
import { isTicketOpen } from './complaint';
import { generateId } from './ids';
import { addLedger, addMs, audit, DAY_MS, iso } from './state';
import { fail, ok, type Actor, type DemoState, type Order, type PayoutPeriod, type Result, type SettlementLine } from './types';

/** Thứ Hai 00:00 (giờ địa phương) của tuần chứa ngày `at`. */
export function weekStart(at: Date): Date {
  const d = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  const day = (d.getDay() + 6) % 7; // thứ Hai = 0
  return addMs(d, -day * DAY_MS);
}

export function settledOrderIds(state: DemoState, coopId: string): Set<string> {
  return new Set(state.payoutPeriods.filter((p) => p.coopId === coopId).flatMap((p) => p.lines.map((l) => l.orderId)));
}

function lineFor(state: DemoState, order: Order, commissionPercent: number): SettlementLine {
  const goods = order.pricing.itemsTotal;
  const refunded = state.refunds
    .filter((r) => r.orderId === order.id && r.source === 'return' && r.status === 'refunded')
    .reduce((s, r) => s + r.amount, 0);
  const retained = Math.max(0, goods - refunded);
  const commission = Math.round((retained * commissionPercent) / 100);
  return { orderId: order.id, deliveredAt: order.deliveredAt!, goods, refunded, retained, commission, shippingFee:order.pricing.shippingFee+order.pricing.expressSurcharge,payout: retained - commission };
}

/** Các dòng đủ điều kiện vào kỳ có giờ cắt `cutoff`. */
export function eligibleLines(state: DemoState, coopId: string, cutoff: Date): SettlementLine[] {
  const settled = settledOrderIds(state, coopId);
  const openTicketOrders = new Set(state.tickets.filter(isTicketOpen).map((t) => t.orderId));
  return state.orders
    .filter(
      (o) =>
        o.coopId === coopId &&
        o.status === 'delivered' &&
        o.amountPaidOnline+o.codCollected>=o.pricing.total &&
        (o.codCollected===0 || !!o.reconciledCod || (state.codRemittances??[]).some(r=>r.status==='confirmed'&&r.orderIds.includes(o.id))) &&
        o.deliveredAt &&
        new Date(o.deliveredAt).getTime() < cutoff.getTime() &&
        !settled.has(o.id) &&
        !openTicketOrders.has(o.id),
    )
    .map((o) => lineFor(state, o, o.params.commissionPercent));
}

export function summarize(lines: SettlementLine[]) {
  return {
    retained: lines.reduce((s, l) => s + l.retained, 0),
    commission: lines.reduce((s, l) => s + l.commission, 0),
    payout: lines.reduce((s, l) => s + l.payout, 0),
  };
}

/** Admin – Tài chính chốt kỳ tuần kết thúc tại `cutoff` (thứ Hai 00:00). */
export function closePeriod(state: DemoState, coopId: string, actor: Actor, cutoff: Date, at: Date): Result<DemoState> {
  if (actor.kind !== 'admin' || actor.adminGroup !== 'finance') return fail('Chỉ Admin – Tài chính được chốt kỳ.');
  if (cutoff.getTime() > at.getTime()) return fail('Chưa đến giờ cắt kỳ.');
  const lines = eligibleLines(state, coopId, cutoff);
  if (lines.length === 0) return fail('Kỳ này không có đơn đủ điều kiện đối soát.');
  const policy=state.params.settlementPolicy,summary=summarize(lines);
  const payoutFee=policy?.payoutFee??0,payout=summary.payout-payoutFee;
  if(payout<0)return fail('Phí chi trả vượt số tiền của kỳ. Chờ thêm đơn hoặc điều chỉnh chính sách cho kỳ mới.');
  if(policy&&payout===0)return fail('Kỳ chưa có số tiền dương để chi trả sau phí.');
  if(policy&&payout<policy.minimumPayout)return fail('Chưa đạt ngưỡng chi trả. Đơn tiếp tục được cộng dồn vào kỳ sau.');
  const reserveAmount=Math.round(payout*(policy?.reservePercent??0)/100);
  const period: PayoutPeriod = {
    id: generateId('KY'),
    coopId,
    start: iso(addMs(cutoff, -7 * DAY_MS)),
    end: iso(cutoff),
    status: 'closed',
    lines,
    ...summarize(lines),
    payout,
    ...(policy?{policy:structuredClone(policy),payoutFee,reserveAmount,reserveUntil:iso(addMs(at,policy.reserveDays*DAY_MS)),disbursements:[]}:{}),
    closedAt: iso(at),
    closedBy: actor.name ?? 'Admin – Tài chính',
  };
  return ok(audit({ ...state, payoutPeriods: [period, ...state.payoutPeriods] }, actor, 'Chốt kỳ đối soát', coopId, at, `${lines.length} đơn, chi trả ${period.payout}`));
}

/** Ghi nhận chi trả (mô phỏng) vào tài khoản của HTX (FR-DT-04). */
export function recordPayout(state: DemoState, periodId: string, actor: Actor, at: Date): Result<DemoState> {
  if (actor.kind !== 'admin' || actor.adminGroup !== 'finance') return fail('Chỉ Admin – Tài chính được ghi nhận chi trả.');
  const period = state.payoutPeriods.find((p) => p.id === periodId);
  if (!period) return fail('Không tìm thấy kỳ đối soát.');
  if (period.status === 'paid') return fail('Kỳ này đã ghi nhận chi trả.');
  if(period.policy)return fail('Kỳ có chính sách chi trả cần ghi nhận từng lần chuyển khoản bằng chứng từ.');
  const paid: PayoutPeriod = { ...period, status: 'paid', paidAt: iso(at), paidRef: generateId('CK-MP') };
  let next: DemoState = { ...state, payoutPeriods: state.payoutPeriods.map((p) => (p.id === periodId ? paid : p)) };
  next = addLedger(next, { type: 'payout_out', amount: -period.payout, coopId: period.coopId, refId: period.id, note: paid.paidRef }, at);
  next = addLedger(next, { type: 'commission', amount: period.commission, coopId: period.coopId, refId: period.id, note: 'Hoa hồng sàn của kỳ' }, at);
  return ok(audit(next, actor, 'Ghi nhận chi trả (mô phỏng)', period.coopId, at, `${period.payout}`));
}
