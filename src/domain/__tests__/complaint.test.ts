import { describe, expect, it } from 'vitest';
import { placeCheckout } from '../checkout';
import { coopReplyTicket, cskhRequestCoopReply, cskhUpdateTicket, eventLabel, nextTicketAction, submitComplaint, ticketsOfOrder, ticketSteps } from '../complaint';
import { confirmRefundBySimBank, startRefundProcessing } from '../finance';
import { deriveNotifications } from '../notifications';
import { carrierSimulate, coopConfirm, coopHandover, customerConfirmReceived } from '../orders';
import { applyGatewayResult } from '../payment';
import { addMs, HOUR_MS } from '../state';
import type { DemoState, Result, Ticket } from '../types';
import { ADMIN_CSKH, ADMIN_FIN, ADMIN_OPS, COOP_X, CUSTOMER, keyX, line, makeState, placeInput, T0 } from './fixtures';

const must = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

/** Đơn online đã giao của khách 1 (2 x-dry) và một khiếu nại có yêu cầu hoàn tiền. */
function withTicket(requestRefund = true): { s: DemoState; ticket: Ticket } {
  const placed = placeCheckout(makeState(), placeInput([line('x-dry', 2, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'online' } }), CUSTOMER, T0);
  if (!placed.ok) throw new Error(placed.error);
  let s = must(applyGatewayResult(placed.state, placed.transaction!.id, 'success', 'R1', T0)).state;
  const id = s.orders[0].id;
  s = must(coopConfirm(s, id, COOP_X, T0));
  s = must(coopHandover(s, id, COOP_X, T0));
  s = must(carrierSimulate(s, id, ADMIN_OPS, 'delivered_reported', '', T0));
  s = must(customerConfirmReceived(s, id, CUSTOMER, T0));
  const created = must(submitComplaint(s, CUSTOMER, { orderId: id, productIds: ['x-dry'], reason: 'damaged', description: 'Gói rách', photos: ['data:'], requestRefund }, addMs(T0, HOUR_MS)));
  return { s: created.state, ticket: created.ticket };
}

const states = (s: DemoState, t: Ticket, now = addMs(T0, 2 * HOUR_MS)) => ticketSteps(s, s.tickets.find((x) => x.id === t.id)!, now).map((x) => `${x.key}:${x.state}`);

describe('Quy trình xử lý khiếu nại', () => {
  it('T26: đi đúng thứ tự: tiếp nhận → HTX phản hồi → kết luận duyệt hoàn → hoàn tiền → đóng; các bước hiện đúng', () => {
    let { s, ticket } = withTicket();
    expect(ticketsOfOrder(s, ticket.orderId).map((t) => t.id)).toEqual([ticket.id]);
    expect(states(s, ticket)).toEqual(['submitted:done', 'accepted:current', 'coop:upcoming', 'concluded:upcoming', 'refund:upcoming', 'closed:upcoming']);
    expect(nextTicketAction(s, s.tickets[0])).toMatch(/Tiếp nhận/);

    // Chưa tiếp nhận thì chưa kết luận, chưa đóng, chưa đề nghị HTX được.
    expect(cskhUpdateTicket(s, ticket.id, ADMIN_CSKH, 'resolved', 'OK', T0)).toEqual({ ok: false, error: 'Cần tiếp nhận ticket trước khi kết luận.' });
    expect(cskhUpdateTicket(s, ticket.id, ADMIN_CSKH, 'closed', '', T0).ok).toBe(false);
    expect(cskhRequestCoopReply(s, ticket.id, ADMIN_CSKH, '', T0)).toEqual({ ok: false, error: 'Cần tiếp nhận ticket trước.' });

    s = must(cskhUpdateTicket(s, ticket.id, ADMIN_CSKH, 'processing', '', addMs(T0, 2 * HOUR_MS)));
    expect(states(s, ticket)).toEqual(['submitted:done', 'accepted:done', 'coop:current', 'concluded:current', 'refund:upcoming', 'closed:upcoming']);
    expect(cskhUpdateTicket(s, ticket.id, ADMIN_CSKH, 'closed', '', T0)).toEqual({ ok: false, error: 'Ticket đang xử lý: kết luận Đã xử lý hoặc Từ chối.' });

    s = must(cskhRequestCoopReply(s, ticket.id, ADMIN_CSKH, 'Kiểm tra lô ngày 14', addMs(T0, 3 * HOUR_MS)));
    expect(ticketSteps(s, s.tickets[0], T0).find((x) => x.key === 'coop')?.detail).toBe('CSKH đã đề nghị HTX phản hồi');
    s = must(coopReplyTicket(s, ticket.id, COOP_X, 'Lô bị dập khi vận chuyển', addMs(T0, 4 * HOUR_MS), 'refund'));
    expect(nextTicketAction(s, s.tickets[0])).toMatch(/HTX đã phản hồi/);

    s = must(cskhUpdateTicket(s, ticket.id, ADMIN_CSKH, 'resolved', 'Đồng ý hoàn 1 sản phẩm', addMs(T0, 5 * HOUR_MS), true));
    const concluded = ticketSteps(s, s.tickets[0], T0);
    expect(concluded.find((x) => x.key === 'concluded')?.detail).toBe('Đã xử lý – duyệt hoàn tiền: Đồng ý hoàn 1 sản phẩm');
    expect(concluded.find((x) => x.key === 'refund')).toMatchObject({ state: 'current', detail: '1.540.000đ · Chờ hoàn tiền' });
    expect(s.tickets[0].history.at(-1)).toMatchObject({ kind: 'conclude', toStatus: 'resolved', refundApproved: true, action: 'CSKH kết luận: Đã xử lý – duyệt hoàn tiền' });
    expect(cskhUpdateTicket(s, ticket.id, ADMIN_CSKH, 'rejected', 'x', T0)).toEqual({ ok: false, error: 'Ticket đã kết luận: chỉ còn bước đóng ticket.' });

    const refund = s.refunds.find((r) => r.source === 'return')!;
    s = must(confirmRefundBySimBank(must(startRefundProcessing(s, refund.id, ADMIN_FIN, T0)), refund.id, ADMIN_FIN, T0));
    s = must(cskhUpdateTicket(s, ticket.id, ADMIN_CSKH, 'closed', '', addMs(T0, 6 * HOUR_MS)));
    expect(states(s, ticket)).toEqual(['submitted:done', 'accepted:done', 'coop:done', 'concluded:done', 'refund:done', 'closed:done']);
    expect(nextTicketAction(s, s.tickets[0])).toBe('Ticket đã đóng.');
  });

  it('kết luận không cần HTX phản hồi thì bước HTX ghi "bỏ qua"; từ chối thì không hoàn tiền', () => {
    let { s, ticket } = withTicket();
    s = must(cskhUpdateTicket(s, ticket.id, ADMIN_CSKH, 'processing', '', T0));
    expect(cskhUpdateTicket(s, ticket.id, ADMIN_CSKH, 'rejected', '  ', T0)).toEqual({ ok: false, error: 'Vui lòng ghi kết luận.' });
    s = must(cskhUpdateTicket(s, ticket.id, ADMIN_CSKH, 'rejected', 'Ảnh không cho thấy hư hỏng', T0));
    expect(states(s, ticket)).toEqual(['submitted:done', 'accepted:done', 'coop:skipped', 'concluded:done', 'refund:skipped', 'closed:current']);
    expect(s.refunds.some((r) => r.source === 'return')).toBe(false);
  });

  it('khiếu nại không yêu cầu hoàn tiền thì không có bước hoàn tiền; quá hạn tiếp nhận thì đánh dấu', () => {
    const { s, ticket } = withTicket(false);
    const steps = ticketSteps(s, s.tickets[0], addMs(T0, 100 * HOUR_MS));
    expect(steps.map((x) => x.key)).toEqual(['submitted', 'accepted', 'coop', 'concluded', 'closed']);
    expect(steps.find((x) => x.key === 'accepted')).toMatchObject({ state: 'current', overdue: true, due: ticket.ackDueAt });
  });

  it('dữ liệu cũ (lịch sử chỉ có "Đổi trạng thái: processing") vẫn ra đúng các bước và nhãn tiếng Việt', () => {
    const { s, ticket } = withTicket(false);
    const legacy: DemoState = {
      ...s,
      tickets: s.tickets.map((t) => ({
        ...t,
        status: 'processing' as const,
        history: [
          { at: t.createdAt, actor: CUSTOMER, action: 'Khách gửi khiếu nại' },
          { at: t.createdAt, actor: ADMIN_CSKH, action: 'Đổi trạng thái: processing' },
        ],
      })),
    };
    expect(states(legacy, ticket)).toEqual(['submitted:done', 'accepted:done', 'coop:current', 'concluded:current', 'closed:upcoming']);
    expect(eventLabel(legacy.tickets[0].history[1])).toBe('Đổi trạng thái: Đang xử lý');
  });

  it('đề nghị HTX phản hồi gửi thông báo cho HTX', () => {
    let { s, ticket } = withTicket();
    s = must(cskhUpdateTicket(s, ticket.id, ADMIN_CSKH, 'processing', '', T0));
    const next = must(cskhRequestCoopReply(s, ticket.id, ADMIN_CSKH, 'Gửi ảnh lô hàng', T0));
    const added = deriveNotifications(s, next, T0).notifications.filter((n) => !s.notifications.includes(n));
    expect(added).toEqual([expect.objectContaining({ userId: 'u-x', title: `CSKH đề nghị HTX phản hồi khiếu nại ${ticket.id}`, body: 'Gửi ảnh lô hàng' })]);
  });
});
