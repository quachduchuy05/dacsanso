import { createHmac } from 'node:crypto';
import { assert, safeEqual, hash } from './security.mjs';
import { applyGatewayResult } from '../src/domain/payment.ts';
import { confirmRefundBySimBank } from '../src/domain/finance.ts';
import { recordPayout } from '../src/domain/settlement.ts';
import { reportDelivery } from '../src/domain/orders.ts';
import { deriveNotifications } from '../src/domain/notifications.ts';
/** Provider-neutral adapter contract. Only signed, fresh server-to-server events can confirm money. */
export async function receiveWebhook(db, provider, req, body, options) {
    assert(provider!=='carrier',403,'Giao hàng do shipper được phân công cập nhật trực tiếp; không nhận callback vận chuyển thay shipper.');
    const secret = options.webhookSecrets?.[provider];
    assert(secret, 503, 'Chưa cấu hình khóa xác thực nhà cung cấp.');
    const timestamp = req.headers['x-webhook-timestamp'], signature = req.headers['x-webhook-signature'];
    assert(typeof timestamp === 'string' && /^\d{10,13}$/.test(timestamp) && Math.abs(Date.now() - Number(timestamp) * 1000) <= 300000, 401, 'Webhook đã hết hạn.');
    const expected = createHmac('sha256', secret).update(`${timestamp}.${req.rawBody}`).digest('hex');
    assert(typeof signature === 'string' && safeEqual(signature, expected), 401, 'Chữ ký webhook không hợp lệ.');
    assert(typeof body.eventId === 'string' && /^[\w:.-]{1,128}$/.test(body.eventId), 400, 'Mã sự kiện không hợp lệ.');
    const fingerprint = hash(req.rawBody);
    return await db.transaction(async () => {
        const prior = await db.sql.prepare('SELECT fingerprint FROM webhook_events WHERE provider=? AND event_id=?').get(provider, body.eventId);
        if (prior) {
            assert(prior.fingerprint === fingerprint, 409, 'Mã sự kiện đã có nội dung khác.');
            return { ok: true, reused: true };
        }
        let { state } = await db.read();
        const before = state, at = new Date(), finance = { kind: 'admin', id: 'provider', name: 'Cổng thanh toán', adminGroup: 'finance' };
        let result;
        if (provider === 'payment') {
            const tx = state.transactions.find(t => t.id === body.transactionId);
            assert(tx, 404, 'Không tìm thấy giao dịch.');
            assert(body.currency === 'VND' && Number.isInteger(body.amount) && body.amount === tx.amount, 400, 'Số tiền hoặc tiền tệ không khớp giao dịch.');
            assert(['success', 'failed', 'cancelled'].includes(body.result) && typeof body.providerRef === 'string' && body.providerRef.length > 0 && body.providerRef.length <= 128, 400, 'Kết quả hoặc mã thanh toán không hợp lệ.');
            result = applyGatewayResult(state, tx.id, body.result, body.providerRef, at);
        }
        else if (provider === 'refund') {
            const refund = state.refunds.find(r => r.id === body.refundId);
            assert(refund, 404, 'Không tìm thấy khoản hoàn.');
            assert(body.result === 'success' && body.currency === 'VND' && body.amount === refund.amount && typeof body.providerRef === 'string', 400, 'Kết quả hoàn tiền không khớp.');
            if (refund.status === 'refunded') {
                assert(refund.bankRef === body.providerRef, 409, 'Khoản hoàn đã được xác nhận bằng mã khác.');
                result = { ok: true, value: state };
            }
            else {
                result = confirmRefundBySimBank(state, refund.id, finance, at);
                if (result.ok) {
                    result.value.refunds = result.value.refunds.map(r => r.id === refund.id ? { ...r, bankRef: body.providerRef } : r);
                }
            }
        }
        else if (provider === 'payout') {
            const period = state.payoutPeriods.find(p => p.id === body.periodId);
            assert(period, 404, 'Không tìm thấy kỳ chi trả.');
            assert(body.result === 'success' && body.currency === 'VND' && body.amount === period.payout && typeof body.providerRef === 'string', 400, 'Kết quả chi trả không khớp.');
            if (period.status === 'paid') {
                assert(period.paidRef === body.providerRef, 409, 'Kỳ đã được chi trả bằng mã khác.');
                result = { ok: true, value: state };
            }
            else {
                result = recordPayout(state, period.id, finance, at);
                if (result.ok)
                    result.value.payoutPeriods = result.value.payoutPeriods.map(p => p.id === period.id ? { ...p, paidRef: body.providerRef } : p);
            }
        }
        else {
            assert(['picked_up', 'delivered_reported', 'failed', 'refused'].includes(body.event) && typeof body.orderId === 'string', 400, 'Sự kiện vận chuyển không hợp lệ.');
            result = reportDelivery(state, body.orderId, { kind: 'system', name: 'Đơn vị vận chuyển' }, body.event, String(body.reason ?? ''), at, { by: 'Đơn vị vận chuyển' });
        }
        assert(result.ok, 422, result.error);
        state = result.value?.state ?? result.value;
        await db.save(deriveNotifications(before, state, at));
        await db.audit(null, `webhook-${provider}`, body.eventId, 'Đã xác minh chữ ký và nội dung');
        await db.sql.prepare('INSERT INTO webhook_events VALUES(?,?,?,?)').run(provider, body.eventId, fingerprint, Date.now());
        return { ok: true, reused: false };
    });
}
