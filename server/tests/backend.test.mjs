import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApplication } from '../app.mjs';
import { Database } from '../database.mjs';
import { issueSession,requestOtp } from '../security.mjs';
import { groupKey } from '../../src/domain/checkout.ts';
import { createHmac } from 'node:crypto';
test('password signup and login persist credentials privately and reject invalid credentials',async t=>{
    const f=await fixture(t,{demo:false});const body={name:'Khách mật khẩu',phone:'0912345678',password:'Matkhau@123'};
    assert.equal((await f.request('/api/v1/auth/password/register',{body:{...body,password:'short'}})).status,400);
    assert.equal((await f.request('/api/v1/auth/password/register',{body})).status,401);
    const challenge=await requestOtp(f.db,{phone:body.phone,purpose:'register'},{demo:true},'test-register');
    const created=await f.request('/api/v1/auth/password/register',{body:{...body,role:'admin',challengeId:challenge.challengeId,otp:'123456'}});
    assert.equal(created.status,200);assert.equal(created.data.user.role,'customer');assert(created.data.accessToken);assert.ok(created.data.user.phoneVerifiedAt);
    assert(!JSON.stringify(created.data).includes('password_hash'));
    const row=await f.db.sql.prepare('SELECT password_hash FROM password_credentials WHERE user_id=?').get(created.data.user.id);
    assert(row.password_hash.startsWith('$2b$12$'));assert(!row.password_hash.includes(body.password));
    assert.equal((await f.request('/api/v1/auth/password/register',{body})).status,409);
    assert.equal((await f.request('/api/v1/auth/password/login',{body:{...body,password:'Wrong@123'}})).status,401);
    assert.equal((await f.request('/api/v1/auth/password/login',{body})).status,200);
    assert.equal((await f.request('/api/v1/auth/password/login',{body:{...body,phone:'0900000001',password:'Dacsan@123'}})).status,401);
});
async function fixture(t, options = {}) {
    const app = await createApplication({ demo: true, databasePath: ':memory:', ...options });
    await new Promise(r => app.server.listen(0, '127.0.0.1', r));
    t.after(() => new Promise(r => app.server.close(r)));
    const base = `http://127.0.0.1:${app.server.address().port}`;
    async function request(path, { user, body, method = body === undefined ? 'GET' : 'POST', key, ...extra } = {}) {
        const auth = user ? await issueSession(app.db, user) : null;
        const res = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(auth ? { Authorization: `Bearer ${auth.accessToken}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}), ...extra.headers }, body: body === undefined ? undefined : JSON.stringify(body) });
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        }
        catch {
            data = text;
        }
        return { status: res.status, data };
    }
    const command = (user, name, args, key = crypto.randomUUID()) => request('/api/v1/commands', { user, key, body: { commands: [{ name, args }] } });
    return { ...app, base, request, command };
}
async function pendingCheckout(f) {
    const input = { customerId: 'cust-1', addressId: 'addr-1', lines: [{ productId: 'prod-che', quantity: 1, seenPrice: 80000 }], note: '', idempotencyKey: crypto.randomUUID(), groupOptions: { [groupKey('coop-suoigiang', 'ready')]: { shipping: 'standard', paymentMethod: 'online' } }, acceptedPreorderPolicy: true, confirmedPriceIncrease: true, fromCart: false };
    const r = await f.command('u-kh1', 'placeCheckout', [input, null, null]);
    assert.equal(r.status, 200);
    return r.data.results[0].transaction;
}
test('guest reads only public catalog; legacy state PUT is disabled', async (t) => {
    const f = await fixture(t);
    const r = await f.request('/api/v1/state');
    assert.equal(r.status, 200);
    assert.equal(r.data.state.users.length, 0);
    assert.equal(r.data.state.orders.length, 0);
    assert.equal(r.data.state.customers.length, 0);
    assert(!JSON.stringify(r.data.state).includes('receiverPhone'));
    assert(!('phones' in r.data.state.coops[0]));
    assert.equal((await f.request('/api/state', { method: 'PUT', body: { data: {} } })).status, 410);
});
test('OTP is verified once; successful login issues server session', async (t) => {
    const f = await fixture(t);
    const r = await f.request('/api/v1/auth/otp', { body: { phone: '0900000001' } });
    assert.equal(r.status, 200);
    const logged = await f.request('/api/v1/auth/login', { body: { challengeId: r.data.challengeId, otp: '123456' } });
    assert.equal(logged.status, 200);
    assert.equal(logged.data.user.id, 'u-kh1');
    assert.equal(logged.data.accessToken.length, 43);
    assert.equal((await f.request('/api/v1/auth/login', { body: { challengeId: r.data.challengeId, otp: '123456' } })).status, 401);
});
test('five wrong OTP attempts invalidate the challenge and resend has cooldown', async (t) => {
    const f = await fixture(t);
    const r = await f.request('/api/v1/auth/otp', { body: { phone: '0900000001' } });
    for (let n = 0; n < 5; n++)
        assert.equal((await f.request('/api/v1/auth/login', { body: { challengeId: r.data.challengeId, otp: '000000' } })).status, 401);
    assert.equal((await f.request('/api/v1/auth/login', { body: { challengeId: r.data.challengeId, otp: '123456' } })).status, 401);
    assert.equal((await f.request('/api/v1/auth/otp', { body: { phone: '0900000001' } })).status, 429);
});
test('production refuses OTP without SMS configuration and hides demo accounts', async (t) => {
    const f = await fixture(t, { demo: false });
    assert.equal((await f.request('/api/v1/auth/otp', { body: { phone: '0900000001' } })).status, 503);
    assert.equal((await f.request('/api/v1/demo/accounts')).status, 404);
    assert.equal((await f.db.read()).state.users.length, 0);
});
test('register cannot choose admin role', async (t) => {
    const f = await fixture(t);
    const r = await f.request('/api/v1/auth/otp', { body: { phone: '0912345678', purpose: 'register' } });
    const registered = await f.request('/api/v1/auth/register', { body: { challengeId: r.data.challengeId, otp: '123456', name: 'Khách mới', role: 'admin', adminGroup: 'root' } });
    assert.equal(registered.status, 200);
    assert.equal(registered.data.user.role, 'customer');
    assert.equal(registered.data.user.adminGroup, undefined);
});
test('refresh tokens rotate; logout revokes the session', async (t) => {
    const f = await fixture(t), s = await issueSession(f.db, 'u-kh1');
    const refreshed = await f.request('/api/v1/auth/refresh', { body: { refreshToken: s.refreshToken } });
    assert.equal(refreshed.status, 200);
    assert.equal((await f.request('/api/v1/auth/refresh', { body: { refreshToken: s.refreshToken } })).status, 401);
    assert.equal((await fetch(f.base + '/api/v1/me', { headers: { Authorization: `Bearer ${s.accessToken}` } })).status, 401);
    const h = { Authorization: `Bearer ${refreshed.data.accessToken}` };
    assert.equal((await fetch(f.base + '/api/v1/auth/logout', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: '{}' })).status, 200);
    assert.equal((await fetch(f.base + '/api/v1/me', { headers: h })).status, 401);
});
test('customer identity and actor supplied by client cannot impersonate another user', async (t) => {
    const f = await fixture(t);
    const r = await f.command('u-kh1', 'addToCart', ['cust-2', 'prod-che', 1, '2099-01-01']);
    assert.equal(r.status, 200);
    assert.equal((await f.db.read()).state.carts['cust-1'].find(l => l.productId === 'prod-che').quantity, 1);
    assert.equal((await f.command('u-kh1', 'opsSetAccountLocked', [{ kind: 'admin', adminGroup: 'operations' }, 'u-kh2', true, 'attack', null])).status, 403);
});
test('quantity fractions are rejected without changing state', async (t) => {
    const f = await fixture(t), before = (await f.db.read()).version;
    assert.equal((await f.command('u-kh1', 'addToCart', ['cust-1', 'prod-che', 1.5, null])).status, 400);
    assert.equal((await f.db.read()).version, before);
});
test('HTX cannot change another HTX product', async (t) => {
    const f = await fixture(t);
    assert.equal((await f.command('u-htx-bacha', 'coopUpdateStock', ['prod-che', null, 999, null])).status, 422);
    assert.equal((await f.db.read()).state.products.find(p => p.id === 'prod-che').stockOnHand, 30);
});
test('QLNN receives aggregates only and cannot write or inspect audit', async (t) => {
    const f = await fixture(t);
    const r = await f.request('/api/v1/state', { user: 'u-qlnn' });
    assert(r.data.state.serverStats.aggregate.ordersTotal > 0);
    assert.deepEqual(r.data.state.orders, []);
    assert.deepEqual(r.data.state.tickets, []);
    assert.deepEqual(r.data.state.transactions, []);
    assert.equal((await f.command('u-qlnn', 'setFavorite', [null, 'prod-che', true])).status, 403);
    assert.equal((await f.request('/api/v1/audit', { user: 'u-qlnn' })).status, 403);
});
test('idempotency prevents duplicate actions and detects key reuse with another payload', async (t) => {
    const f = await fixture(t), key = crypto.randomUUID();
    const args = ['cust-1', 'prod-che', 1, null];
    assert.equal((await f.command('u-kh1', 'addToCart', args, key)).status, 200);
    assert.equal((await f.command('u-kh1', 'addToCart', args, key)).status, 200);
    assert.equal((await f.db.read()).state.carts['cust-1'].find(l => l.productId === 'prod-che').quantity, 1);
    assert.equal((await f.command('u-kh1', 'addToCart', ['cust-1', 'prod-che', 2, null], key)).status, 409);
});
test('multi-command batch rolls back completely on failure', async (t) => {
    const f = await fixture(t), before = await f.db.read();
    const r = await f.request('/api/v1/commands', { user: 'u-kh1', key: crypto.randomUUID(), body: { commands: [{ name: 'addToCart', args: ['cust-1', 'prod-che', 1, null] }, { name: 'addToCart', args: ['cust-1', 'missing', 1, null] }] } });
    assert.equal(r.status, 422);
    assert.deepEqual(await f.db.read(), before);
});
test('concurrent customers cannot reserve the same last stock', async (t) => {
    const f = await fixture(t);
    await f.db.transaction(async () => { const { state } = await f.db.read(); state.orders = []; state.checkouts = []; state.transactions = []; state.products.find(p => p.id === 'prod-che').stockOnHand = 1; await f.db.save(state); });
    function input(customerId, addressId) { return { customerId, addressId, lines: [{ productId: 'prod-che', quantity: 1, seenPrice: 80000 }], note: '', idempotencyKey: crypto.randomUUID(), groupOptions: { [groupKey('coop-suoigiang', 'ready')]: { shipping: 'standard', paymentMethod: 'cod' } }, acceptedPreorderPolicy: true, confirmedPriceIncrease: true, fromCart: false }; }
    const address2 = (await f.db.read()).state.addresses.find(a => a.customerId === 'cust-2').id;
    const results = await Promise.all([f.command('u-kh1', 'placeCheckout', [input('cust-1', 'addr-1'), null, null]), f.command('u-kh2', 'placeCheckout', [input('cust-2', address2), null, null])]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 422]);
    assert.equal((await f.db.read()).state.orders.length, 1);
});
test('locking user revokes access and refresh even after unlocking', async (t) => {
    const f = await fixture(t), s = await issueSession(f.db, 'u-kh1');
    assert.equal((await f.command('u-ad-vh', 'opsSetAccountLocked', [null, 'u-kh1', true, 'Kiểm tra', null])).status, 200);
    assert.equal((await f.command('u-ad-vh', 'opsSetAccountLocked', [null, 'u-kh1', false, '', null])).status, 200);
    assert.equal((await fetch(f.base + '/api/v1/me', { headers: { Authorization: `Bearer ${s.accessToken}` } })).status, 401);
    assert.equal((await f.request('/api/v1/auth/refresh', { body: { refreshToken: s.refreshToken } })).status, 401);
});
test('persistent SQLite survives closing and reopening', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'dacsan-backend-')), 'app.sqlite');
    let db = new Database(file, { demo: true });
    let { state } = await db.read();
    state.customers[0].name = 'Đã lưu lâu dài';
    await db.save(state);
    const version = (await db.read()).version;
    await db.close();
    db = new Database(file, { demo: true });
    assert.equal((await db.read()).state.customers[0].name, 'Đã lưu lâu dài');
    assert.equal((await db.read()).version, version);
    await db.close();
});
test('audit cannot be updated or deleted', async (t) => {
    const f = await fixture(t);
    await f.db.audit('u-ad-root', 'test');
    assert.throws(() => f.db.sql.exec("UPDATE audit_events SET action='tamper'"), /append-only/);
    assert.throws(() => f.db.sql.exec('DELETE FROM audit_events'), /append-only/);
});
test('export CSV is private, has BOM, formula protection and download audit', async (t) => {
    const f = await fixture(t);
    await f.db.transaction(async () => { const { state } = await f.db.read(); for (const o of state.orders)
        o.coopName = '=HYPERLINK("evil")'; await f.db.save(state); });
    const job = await f.request('/api/v1/exports', { user: 'u-ad-tc', body: { kind: 'summary' } });
    assert.equal(job.status, 201);
    const path = `/api/v1/exports/${job.data.id}/download`;
    assert.equal((await f.request(path, { user: 'u-qlnn' })).status, 404);
    const downloaded = await f.request(path, { user: 'u-ad-tc' });
    assert.equal(downloaded.status, 200);
    assert(downloaded.data.includes("'=HYPERLINK"));
    assert.equal((await f.db.sql.prepare("SELECT COUNT(*) as n FROM audit_events WHERE action='export-downloaded'").get()).n, 1);
});
test('expired export cannot be downloaded', async (t) => {
    const f = await fixture(t);
    const job = await f.request('/api/v1/exports', { user: 'u-ad-tc', body: { kind: 'summary' } });
    await f.db.sql.prepare('UPDATE export_jobs SET expires_at=0 WHERE id=?').run(job.data.id);
    assert.equal((await f.request(`/api/v1/exports/${job.data.id}/download`, { user: 'u-ad-tc' })).status, 410);
});
test('cross-origin mutations are rejected and unknown commands cannot execute', async (t) => {
    const f = await fixture(t);
    assert.equal((await f.request('/api/v1/auth/otp', { body: { phone: '0900000001' }, headers: { Origin: 'https://evil.example' } })).status, 403);
    assert.equal((await f.command('u-ad-root', 'cancelOrder', [])).status, 400);
});
test('scheduled payment expiry runs on server without an open browser', async (t) => {
    const f = await fixture(t);
    await pendingCheckout(f);
    await f.db.transaction(async () => { const { state } = await f.db.read(); const tx = state.transactions.find(t => t.status === 'pending'); assert(tx); tx.expiresAt = new Date(Date.now() - 1000).toISOString(); await f.db.save(state); });
    const before = (await f.db.read()).state.transactions.find(t => t.status === 'pending' && new Date(t.expiresAt) < new Date()).id;
    await f.request('/api/v1/state');
    assert.equal((await f.db.read()).state.transactions.find(t => t.id === before).status, 'expired');
});
test('signed payment webhook verifies amount and deduplicates provider event', async (t) => {
    const secret = 'test-secret-at-least-32-characters';
    const f = await fixture(t, { webhookSecrets: { payment: secret } });
    const tx = await pendingCheckout(f);
    assert(tx);
    const event = { eventId: 'provider-event-1', transactionId: tx.id, amount: tx.amount, currency: 'VND', result: 'success', providerRef: 'bank-ref-1' };
    async function send(body, signature) { const timestamp = String(Math.floor(Date.now() / 1000)); const raw = JSON.stringify(body); return await f.request('/api/v1/webhooks/payment', { body, headers: { 'x-webhook-timestamp': timestamp, 'x-webhook-signature': signature ?? createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex') } }); }
    assert.equal((await send(event, '0'.repeat(64))).status, 401);
    assert.equal((await send({ ...event, amount: tx.amount + 1 })).status, 400);
    const first = await send(event);
    assert.equal(first.status, 200);
    assert.equal(first.data.reused, false);
    assert.equal((await send(event)).data.reused, true);
    assert.equal((await f.db.read()).state.transactions.find(t => t.id === tx.id).status, 'paid');
});
test('production blocks simulated payment confirmations', async (t) => {
    const f = await fixture(t);
    const tx = await pendingCheckout(f);
    // Flip only the app policy, keeping a seeded fixture to exercise production authorization.
    const prod = await createApplication({ db: f.db, demo: false });
    await new Promise(r => prod.server.listen(0, '127.0.0.1', r));
    t.after(() => new Promise(r => prod.server.close(r)));
    const session = await issueSession(f.db, 'u-kh1');
    const r = await fetch(`http://127.0.0.1:${prod.server.address().port}/api/v1/commands`, { method: 'POST', headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ commands: [{ name: 'applyGatewayResult', args: [tx.id, 'success', 'fake-bank', null] }] }) });
    assert.equal(r.status, 403);
});
test('cart patch cannot inject price or change product identity', async (t) => {
    const f = await fixture(t);
    await f.command('u-kh1', 'addToCart', ['cust-1', 'prod-che', 1, null]);
    const r = await f.command('u-kh1', 'setCartLine', ['cust-2', 'prod-che', { quantity: 1, seenPrice: 1, productId: 'another' }]);
    assert.equal(r.status, 200);
    const line = (await f.db.read()).state.carts['cust-1'].find(l => l.productId === 'prod-che');
    assert.equal(line.seenPrice, 80000);
    assert.equal(line.productId, 'prod-che');
});
test('suspended HTX cannot submit products and product limits follow BR-SP', async (t) => {
    const f = await fixture(t), input = { name: 'Sản phẩm kiểm thử', description: 'Mô tả sản phẩm hợp lệ dài hơn hai mươi ký tự.', category: 'dry', region: 'Bắc Hà', unit: 'gói', kind: 'ready', price: 10000, stockOnHand: 10 };
    assert.equal((await f.command('u-htx-bacha', 'coopCreateProduct', [null, { ...input, price: 999 }, null])).status, 403);
    await f.db.transaction(async () => { const { state } = await f.db.read(); state.coops.find(c => c.id === 'coop-bacha').status = 'suspended'; await f.db.save(state); });
    assert.equal((await f.command('u-htx-bacha', 'coopCreateProduct', [null, input, null])).status, 403);
});
test('SQLite payload is authenticated encrypted when a key is configured', async () => {
    const key = 'a1'.repeat(32), db = new Database(':memory:', { demo: true, encryptionKey: key });
    const raw = (await db.sql.prepare('SELECT data FROM app_state').get()).data;
    assert(raw.startsWith('aes1:'));
    assert(!raw.includes('0900000001'));
    assert.equal((await db.read()).state.users[0].phone, '0900000001');
    const goodKey = db.encryptionKey;
    db.encryptionKey = Buffer.alloc(32);
    await assert.rejects(async () => await db.read());
    db.encryptionKey = goodKey;
    assert.equal((await db.read()).state.users[0].phone, '0900000001');
    await db.close();
});
test('idempotent replay rechecks permissions after admin role changes', async (t) => {
    const f = await fixture(t), key = crypto.randomUUID(), args = [null, { name: 'Phường kiểm thử', distanceKm: 10 }, null];
    assert.equal((await f.command('u-ad-vh', 'opsSaveWard', args, key)).status, 200);
    assert.equal((await f.command('u-ad-root', 'rootSetAdminGroup', [null, 'u-ad-vh', 'quality', null])).status, 200);
    assert.equal((await f.command('u-ad-vh', 'opsSaveWard', args, key)).status, 403);
});
test('REST address endpoints always use the authenticated customer scope', async (t) => {
    const f = await fixture(t);
    const added = await f.request('/api/v1/me/addresses', { user: 'u-kh1', key: crypto.randomUUID(), body: { customerId: 'cust-2', label: 'Nhà', receiverName: 'Khách thử', receiverPhone: '0912345678', houseType: 'ground', wardId: 'w-taymo', street: '12 Đường mẫu' } });
    assert.equal(added.status, 200);
    const address = added.data.results[0].value.address;
    assert.equal(address.customerId, 'cust-1');
    const other = await f.request(`/api/v1/me/addresses/${address.id}`, { user: 'u-kh2', method: 'DELETE', key: crypto.randomUUID() });
    assert.equal(other.status, 422);
});
test('HTX application requires phone OTP and approval checklist before creating seller account', async (t) => {
    const f = await fixture(t), phone = '0912345688';
    const input = { taxCode:'0123456789',coopName: 'HTX kiểm thử backend', region: 'Bắc Hà', address: 'Thôn mẫu, Bắc Hà, tỉnh Lào Cai', representative: 'Người đại diện', loginPhone: phone, phones: ['0912345688', '0912345689'], payoutAccount: '1234567890', description: 'HTX nông sản kiểm thử', products: 'Chè Shan tuyết đóng gói', documents: ['data:image/png;base64,aGVsbG8='] };
    assert.equal((await f.request('/api/v1/applications', { body: { input, otp: '123456' } })).status, 401);
    const otp = await f.request('/api/v1/auth/otp', { body: { phone, purpose: 'application' } });
    const submitted = await f.request('/api/v1/applications', { body: { input, challengeId: otp.data.challengeId, otp: '123456' } });
    assert.equal(submitted.status, 201, JSON.stringify(submitted.data));
    const id = submitted.data.application.id;
    assert.equal((await f.command('u-ad-cl', 'qualityAcceptApplication', [null, id, null])).status, 200);
    assert.equal((await f.command('u-ad-cl', 'qualityDecideApplication', [null, id, true, 'Đủ điều kiện', null])).status, 422);
    for (const check of ['documents', 'region', 'contact', 'products'])
        assert.equal((await f.command('u-ad-cl', 'qualitySetCheck', [null, id, check, true, null])).status, 200);
    assert.equal((await f.command('u-ad-cl', 'qualityDecideApplication', [null, id, true, 'Đủ điều kiện', null])).status, 200);
    const user = (await f.db.read()).state.users.find(u => u.phone === phone);
    assert.equal(user.role, 'coop');
    assert.equal(user.status, 'active');
});
