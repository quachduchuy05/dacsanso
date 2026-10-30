/**
 * Giai đoạn 7 – chế độ trình diễn an toàn: mã trình diễn NEW-01, quyền dùng Công cụ demo, tình trạng cấu hình.
 */
import { checkUi, dlg, expect, login, logout, openDemoTools, PHONES, resetDemoData, test, toast } from './helpers';

test.beforeEach(async ({ app }) => resetDemoData(app));

test('Công cụ demo: ai cũng xem được giờ demo và tình trạng cấu hình; chỉ Quản trị gốc, Admin – Vận hành bấm được', async ({ app }) => {
  const page = await app.open();
  await openDemoTools(page);
  const panel = dlg(page);
  await expect(panel.getByRole('button', { name: '+15 phút' })).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Khôi phục dữ liệu mẫu' })).toHaveCount(0);
  await expect(panel.getByRole('note')).toContainText('Chỉ Quản trị gốc và Admin – Vận hành');
  const status = panel.locator('dl');
  await expect(status).toContainText('Đã nối – mọi máy thấy chung dữ liệu');
  await expect(status).toContainText('Mô phỏng – chưa có VITE_GOOGLE_CLIENT_ID');
  await expect(status).toContainText('Chưa có khoá GOOGLE_MAPS_API_KEY');
  await checkUi(page, 'Công cụ demo – chưa đăng nhập');
  await page.keyboard.press('Escape');

  for (const phone of [PHONES.customer1, PHONES.coopBacHa, PHONES.cskh]) {
    await login(page, phone);
    await openDemoTools(page);
    await expect(dlg(page).getByRole('button', { name: '+15 phút' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await logout(page);
  }

  await login(page, PHONES.ops);
  await openDemoTools(page);
  await dlg(page).getByRole('button', { name: '+15 phút' }).click();
  await expect(toast(page)).toContainText('Đã tua thời gian +15 phút');
  await dlg(page).getByRole('button', { name: 'Đưa đồng hồ về giờ thật' }).click();
  await expect(toast(page)).toContainText('về giờ thật');
  await checkUi(page, 'Công cụ demo – Admin – Vận hành');
});

test('Mã trình diễn: ẩn danh sách tài khoản demo tới khi nhập đúng mã; đăng nhập bằng SĐT vẫn được; nhật ký không ghi mã', async ({ app }) => {
  const root = await app.open({ width: 1280 });
  await expect(root.getByRole('button', { name: /^Quản trị gốc/ })).toHaveCount(1);
  await login(root, PHONES.root);
  await root.getByRole('button', { name: 'Tham số', exact: true }).click();
  await checkUi(root, 'Tham số – Quản trị gốc');
  const code = root.getByLabel(/^Mã trình diễn/);
  await code.fill('ab');
  await root.getByRole('button', { name: 'Đặt mã' }).click();
  await expect(toast(root)).toContainText('dài 4–32 ký tự');
  await code.fill('Demo 2026');
  await root.getByRole('button', { name: 'Đặt mã' }).click();
  await expect(toast(root)).toContainText('Đã đặt mã trình diễn');
  await expect(root.getByText(/Đã đặt \(Quản trị gốc/)).toBeVisible();

  // Máy của người xem demo: không thấy danh sách tài khoản.
  const guest = await app.open();
  await expect(guest.getByText('Danh sách tài khoản demo đang ẩn.', { exact: false })).toBeVisible({ timeout: 20_000 });
  await expect(guest.getByRole('button', { name: /^Quản trị gốc/ })).toHaveCount(0);
  await checkUi(guest, 'Đăng nhập – danh sách tài khoản đang ẩn');
  await guest.getByLabel('Mã trình diễn').fill('sai-ma');
  await guest.getByRole('button', { name: 'Hiện tài khoản demo' }).click();
  await expect(guest.getByRole('alert')).toHaveText('Mã trình diễn không đúng.');
  await guest.getByLabel('Mã trình diễn').fill('demo2026');
  await guest.getByRole('button', { name: 'Hiện tài khoản demo' }).click();
  await expect(guest.getByRole('button', { name: /^Quản trị gốc/ })).toHaveCount(1);
  await guest.reload();
  await expect(guest.getByRole('button', { name: /^Quản trị gốc/ })).toHaveCount(1);

  // Máy khác chưa nhập mã vẫn đăng nhập được bằng SĐT + OTP mô phỏng.
  const other = await app.open();
  await expect(other.getByRole('button', { name: /^Quản trị gốc/ })).toHaveCount(0);
  await login(other, PHONES.customer2);

  // Quản trị gốc bỏ mã; nhật ký ghi thao tác, không ghi mã.
  await root.getByRole('button', { name: 'Bỏ mã' }).click();
  await expect(toast(root)).toContainText('Đã bỏ mã trình diễn');
  await root.getByRole('button', { name: 'Nhật ký', exact: true }).click();
  const logs = root.locator('main');
  await expect(logs).toContainText('Đặt mã trình diễn');
  await expect(logs).toContainText('Bỏ mã trình diễn');
  await expect(logs).not.toContainText(/demo ?2026/i);
});
