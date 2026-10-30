/**
 * Sửa lỗi bản web (18/10/2026): các tình huống chỉ gặp trên bản deploy, giả lập trên máy.
 * - Vừa deploy bản mới khi tab đang mở: file màn Admin của bản cũ không còn (404) → tự tải lại, vào được màn.
 * - Cơ sở dữ liệu (Upstash) từ chối lúc mở app → báo rõ, giữ thay đổi, tự kết nối lại khi hết lỗi.
 * - Dữ liệu dùng chung lưu từ bản cũ thiếu trường → các màn vẫn mở được.
 */
import { checkUi, expect, login, logout, openDemoTools, PHONES, resetDemoData, test } from './helpers';

test.beforeEach(async ({ app }) => resetDemoData(app));

test('Deploy bản mới khi tab đang mở: không tải được màn Admin của bản cũ thì tự tải lại và vào được màn', async ({ app }) => {
  app.allowConsole(/status of 404/);
  let blocked = 0;
  const page = await app.open({ width: 1280 }, async (ctx) => {
    await ctx.route('**/assets/AdminScreen-*.js', async (r) => {
      if (blocked++ === 0) return r.fulfill({ status: 404, body: 'not found' });
      return r.fallback();
    });
  });
  await login(page, PHONES.ops);
  await expect(page.getByRole('navigation', { name: 'Chức năng quản trị' })).toBeVisible();
  expect(blocked).toBeGreaterThanOrEqual(2); // lần đầu 404, tải lại thì lấy được
  await expect(page.getByText('Không hiển thị được')).toHaveCount(0);
});

test('Upstash từ chối lúc mở app: báo rõ, giữ thay đổi trên máy, tự kết nối lại và gửi lên', async ({ app }) => {
  app.allowConsole(/status of 502/);
  let down = true;
  const page = await app.open({ width: 390 }, async (ctx) => {
    await ctx.route('**/api/state**', async (r) => {
      if (!down) return r.fallback();
      return r.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Cơ sở dữ liệu demo (Upstash) đang từ chối vì vượt giới hạn của gói đang dùng (số lệnh hoặc dung lượng).', quota: true }),
      });
    });
  });
  await expect(page.getByRole('note').first()).toContainText('Mất kết nối');
  await openDemoTools(page);
  await expect(page.getByRole('dialog')).toContainText('vượt giới hạn của gói');
  await page.keyboard.press('Escape');
  await login(page, PHONES.customer1);
  await page.getByRole('button', { name: /^Chọn quy cách Mứt/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Thêm vào giỏ' }).click();
  down = false;
  // Tự hỏi lại (thử lại sau vài giây hoặc chu kỳ 10 giây): hết lỗi thì dải trên cùng trở lại bình thường.
  await expect(page.getByRole('note').first()).toContainText('Dữ liệu dùng chung giữa các máy.', { timeout: 30_000 });
  // Máy khác thấy giỏ hàng vừa thêm khi API lỗi.
  const other = await app.open({ width: 390 });
  await login(other, PHONES.customer1);
  await expect(other.getByRole('button', { name: /Giỏ hàng, 1/ })).toBeVisible({ timeout: 20_000 });
});

test('Dữ liệu dùng chung lưu từ bản cũ thiếu trường: các màn vẫn mở được', async ({ app, request }) => {
  const got = await (await request.get('/api/state')).json();
  const data = got.data as Record<string, unknown>;
  for (const k of ['reviews', 'tickets', 'notifications', 'ledgerEntries', 'paramHistory', 'directMessages', 'coopApplications']) delete data[k];
  data.params = { depositPercent: 30 };
  data.orders = (data.orders as Record<string, unknown>[]).map(({ deliveryLog: _l, statusHistory: _h, ...o }) => o);
  const put = await request.put('/api/state', { data: { baseVersion: got.version, schema: got.schema, data } });
  expect(put.ok()).toBe(true);

  const page = await app.open({ width: 1280 });
  await login(page, PHONES.customer1);
  await page.getByRole('button', { name: 'Tài khoản', exact: true }).last().click();
  await page.locator('main ul > li button', { hasText: 'DH-' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await logout(page);
  for (const phone of [PHONES.coopBacHa, PHONES.cskh, PHONES.finance, PHONES.regulator]) {
    await login(page, phone);
    await expect(page.locator('main')).toBeVisible();
    await logout(page);
  }
  await expect(page.getByText('Không hiển thị được')).toHaveCount(0);
  await checkUi(page, 'Đăng nhập sau khi đọc dữ liệu cũ');
});
