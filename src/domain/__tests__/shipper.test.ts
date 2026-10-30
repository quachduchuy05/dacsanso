import { describe, expect, it } from 'vitest';
import { getOrderFor, listOrdersFor } from '../access';
import { placeCheckout } from '../checkout';
import { listCoopContacts } from '../coopContact';
import { deriveNotifications } from '../notifications';
import { carrierSimulate, coopConfirm, coopHandover, customerConfirmReceived } from '../orders';
import { codOnHand, financeConfirmRemittance, opsAssignShipper, shipperDelivered, shipperFailed, shipperOrders, shipperPickUp, shipperRefused, shipperRemitCod, shipperStep } from '../shipper';
import { trackingEvents } from '../tracking';
import type { Actor, DemoState, Result } from '../types';
import { ADMIN_FIN, ADMIN_OPS, ADMIN_QA, COOP_X, CUSTOMER, keyX, line, makeState, placeInput, T0 } from './fixtures';

const must = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const SHIP_1: Actor = { kind: 'shipper', id: 'u-ship-1', userId: 'u-ship-1', name: 'Shipper 1' };
const SHIP_2: Actor = { kind: 'shipper', id: 'u-ship-2', userId: 'u-ship-2', name: 'Shipper 2' };

/** Đơn COD của khách 1 (1 x-dry) đã được HTX X xác nhận: Đang chuẩn bị. Có 2 tài khoản shipper. */
function preparingCodOrder(): { s: DemoState; id: string } {
  const base = makeState();
  base.users = [
    ...base.users,
    { id: 'u-ship-1', phone: '0900000401', name: 'Shipper 1', role: 'shipper', status: 'active', createdAt: '' },
    { id: 'u-ship-2', phone: '0900000402', name: 'Shipper 2', role: 'shipper', status: 'active', createdAt: '' },
  ];
  const placed = placeCheckout(base, placeInput([line('x-dry', 1, 770_000)], { [keyX]: { shipping: 'standard', paymentMethod: 'cod' } }), CUSTOMER, T0);
  if (!placed.ok) throw new Error(placed.error);
  const id = placed.state.orders[0].id;
  return { s: must(coopConfirm(placed.state, id, COOP_X, T0)), id };
}

describe('Giao hàng bằng shipper', () => {
  it('chỉ Admin – Vận hành phân công; đổi shipper được khi chưa lấy hàng; shipper mới và cũ đều được báo', () => {
    const { s, id } = preparingCodOrder();
    expect(opsAssignShipper(s, ADMIN_QA, id, 'u-ship-1', '', T0).ok).toBe(false);
    expect(opsAssignShipper(s, ADMIN_OPS, id, 'u-kh1', '', T0)).toEqual({ ok: false, error: 'Vui lòng chọn shipper.' });
    const assigned = must(opsAssignShipper(s, ADMIN_OPS, id, 'u-ship-1', 'Lấy ở điểm tập kết (mẫu), 8h sáng', T0));
    expect(assigned.orders[0].shipment).toMatchObject({ shipperId: 'u-ship-1', shipperName: 'Shipper 1', pickupNote: 'Lấy ở điểm tập kết (mẫu), 8h sáng' });
    expect(assigned.auditLogs[0]).toMatchObject({ action: 'Phân công shipper', detail: 'Shipper 1' });
    const notified = deriveNotifications(s, assigned, T0);
    expect(notified.notifications.find((n) => n.userId === 'u-ship-1')?.title).toBe(`Đơn mới cần giao ${id}`);

    const moved = must(opsAssignShipper(assigned, ADMIN_OPS, id, 'u-ship-2', '', T0));
    expect(moved.auditLogs[0].action).toBe('Đổi shipper');
    expect(
      deriveNotifications(assigned, moved, T0)
        .notifications.slice(0, 2)
        .map((n) => n.userId)
        .sort(),
    ).toEqual(['u-ship-1', 'u-ship-2']);
    // ĐVVC mô phỏng không báo thay cho đơn đã có shipper.
    const shipping = must(coopHandover(moved, id, COOP_X, T0));
    expect(carrierSimulate(shipping, id, ADMIN_OPS, 'delivered_reported', '', T0).ok).toBe(false);
    // Lấy hàng rồi thì không đổi shipper.
    const picked = must(shipperPickUp(shipping, SHIP_2, id, T0));
    expect(opsAssignShipper(picked, ADMIN_OPS, id, 'u-ship-1', '', T0)).toEqual({ ok: false, error: 'Shipper đã lấy hàng, không đổi shipper được.' });
  });

  it('shipper chỉ thấy đơn được giao cho mình; không xem được SĐT, địa chỉ HTX', () => {
    const { s, id } = preparingCodOrder();
    const assigned = must(opsAssignShipper(s, ADMIN_OPS, id, 'u-ship-1', '', T0));
    expect(must(shipperOrders(assigned, SHIP_1)).map((o) => o.id)).toEqual([id]);
    expect(must(shipperOrders(assigned, SHIP_2))).toEqual([]);
    expect(must(listOrdersFor(assigned, SHIP_2))).toEqual([]);
    expect(getOrderFor(assigned, SHIP_1, id).ok).toBe(true);
    expect(getOrderFor(assigned, SHIP_2, id).ok).toBe(false);
    expect(shipperOrders(assigned, CUSTOMER).ok).toBe(false);
    expect(listCoopContacts(assigned, SHIP_1).ok).toBe(false);
  });

  it('lấy hàng sau khi HTX bàn giao → giao thành công có ảnh, giữ tiền thu hộ → nộp tiền → Tài chính xác nhận', () => {
    const { s, id } = preparingCodOrder();
    let state = must(opsAssignShipper(s, ADMIN_OPS, id, 'u-ship-1', '', T0));
    expect(shipperStep(state.orders[0])).toBe('wait_handover');
    expect(shipperPickUp(state, SHIP_1, id, T0)).toEqual({ ok: false, error: 'HTX chưa bàn giao vận chuyển. Lấy hàng sau khi HTX bàn giao.' });
    state = must(coopHandover(state, id, COOP_X, T0));
    expect(shipperDelivered(state, SHIP_1, id, { photos: ['data:a'] }, T0).ok).toBe(false); // chưa lấy hàng
    expect(shipperPickUp(state, SHIP_2, id, T0)).toEqual({ ok: false, error: 'Đơn không được giao cho bạn.' });
    const picked = must(shipperPickUp(state, SHIP_1, id, T0));
    expect(deriveNotifications(state, picked, T0).notifications[0]).toMatchObject({ userId: 'u-kh1', title: `Đơn ${id} đang được giao` });
    expect(shipperDelivered(picked, SHIP_1, id, { photos: [] }, T0)).toEqual({ ok: false, error: 'Chụp ít nhất 1 ảnh giao hàng.' });
    expect(shipperDelivered(picked, SHIP_1, id, { photos: ['a', 'b', 'c'] }, T0).ok).toBe(false);

    const delivered = must(shipperDelivered(picked, SHIP_1, id, { photos: ['data:a'], note: 'Gửi bảo vệ toà nhà' }, T0));
    const order = delivered.orders[0];
    // Shipper báo giao thành công chỉ ghi mốc; đơn vẫn Đang giao tới khi khách bấm Đã nhận (mục 5.5).
    expect(order.status).toBe('shipping');
    expect(order.carrierDeliveredAt).toBeTruthy();
    expect(order.shipment).toMatchObject({ proofPhotos: ['data:a'], deliveredNote: 'Gửi bảo vệ toà nhà', codHeld: order.pricing.payOnDelivery });
    expect(order.pricing.payOnDelivery).toBe(order.pricing.total);
    expect(codOnHand(delivered, 'u-ship-1').map((o) => o.id)).toEqual([id]);
    expect(trackingEvents(order).map((e) => e.title)).toEqual(['Giao hàng thành công', 'Shipper 1 đã lấy hàng, đang giao', 'HTX X đã bàn giao cho đơn vị vận chuyển', 'Shipper 1 nhận giao đơn']);
    expect(trackingEvents(order)[0]).toMatchObject({ detail: 'Shipper 1 · Gửi bảo vệ toà nhà', photos: ['data:a'] });
    expect(must(customerConfirmReceived(delivered, id, CUSTOMER, T0)).orders[0].status).toBe('delivered');

    expect(shipperRemitCod(delivered, SHIP_2, T0)).toEqual({ ok: false, error: 'Không có tiền thu hộ cần nộp.' });
    const remitted = must(shipperRemitCod(delivered, SHIP_1, T0));
    expect(remitted.remittance).toMatchObject({ shipperId: 'u-ship-1', orderIds: [id], amount: order.pricing.payOnDelivery, status: 'submitted' });
    expect(codOnHand(remitted.state, 'u-ship-1')).toEqual([]);
    expect(deriveNotifications(delivered, remitted.state, T0).notifications[0]).toMatchObject({ userId: 'u-fin' });
    expect(financeConfirmRemittance(remitted.state, ADMIN_OPS, remitted.remittance.id, T0).ok).toBe(false);
    const confirmed = must(financeConfirmRemittance(remitted.state, ADMIN_FIN, remitted.remittance.id, T0));
    expect(confirmed.codRemittances![0].status).toBe('confirmed');
    expect(financeConfirmRemittance(confirmed, ADMIN_FIN, remitted.remittance.id, T0).ok).toBe(false);
  });

  it('giao thất bại: bắt buộc lý do; quá PAR-27 lần thì chuyển hoàn; khách từ chối nhận thì chuyển hoàn', () => {
    const { s, id } = preparingCodOrder();
    let state = must(coopHandover(must(opsAssignShipper(s, ADMIN_OPS, id, 'u-ship-1', '', T0)), id, COOP_X, T0));
    state = must(shipperPickUp(state, SHIP_1, id, T0));
    expect(shipperFailed(state, SHIP_1, id, 'Lý do lạ', '', T0)).toEqual({ ok: false, error: 'Chọn lý do giao thất bại.' });
    expect(shipperFailed(state, SHIP_1, id, 'Khác', ' ', T0)).toEqual({ ok: false, error: 'Ghi rõ lý do giao thất bại.' });
    const once = must(shipperFailed(state, SHIP_1, id, 'Người nhận hẹn giao lại', 'Hẹn chiều mai', T0));
    expect(once.orders[0]).toMatchObject({ status: 'shipping', deliveryAttempts: 1 });
    expect(once.orders[0].deliveryLog.at(-1)).toMatchObject({ event: 'failed', reason: 'Người nhận hẹn giao lại: Hẹn chiều mai', by: 'Shipper 1' });
    expect(deriveNotifications(state, once, T0).notifications[0].title).toBe(`Giao đơn ${id} chưa thành công`);
    let failed = once;
    for (let i = 0; i < state.params.maxRedeliveries; i++) failed = must(shipperFailed(failed, SHIP_1, id, 'Không liên lạc được người nhận', '', T0));
    expect(failed.orders[0].status).toBe('returning');
    expect(trackingEvents(failed.orders[0])[0].title).toBe('Đang chuyển hoàn về HTX');

    expect(shipperRefused(state, SHIP_1, id, '', T0).ok).toBe(false);
    expect(must(shipperRefused(state, SHIP_1, id, 'Khách đổi ý', T0)).orders[0].status).toBe('returning');
  });
});
