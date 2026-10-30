/**
 * Luồng 5: HTX mới nộp hồ sơ → Admin – Chất lượng yêu cầu bổ sung → HTX nộp lại → duyệt → HTX thêm sản phẩm → duyệt → khách thấy.
 * Luồng 6: hai máy cùng dữ liệu: máy kia tự thấy đơn mới; hai máy cùng thao tác một đơn thì người chậm được báo, không mất dữ liệu.
 */
import type { Page } from '@playwright/test';
import { checkUi, dlg, expect, login, PHONES, pngFile, pullNow, resetDemoData, test, toast } from './helpers';

test.beforeEach(async ({ app }) => resetDemoData(app));

const NEW_COOP = { name: 'HTX mẫu Thử Nghiệm', phone: '0900000601', product: 'Gạo nương mẫu Thử Nghiệm' };
const adminTab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Chức năng quản trị' }).getByRole('button', { name, exact: true }).click();

test('Luồng 5: HTX mới từ nộp hồ sơ tới khi khách thấy sản phẩm', async ({ app }) => {
  const coop = await app.open();
  await coop.getByRole('button', { name: 'Đăng ký HTX' }).click();
  const form = dlg(coop);
  await form.getByLabel('Tên HTX').fill(NEW_COOP.name);
  await form.getByLabel('Vùng sản xuất').fill('Bát Xát');
  await form.getByLabel('Địa chỉ HTX / nơi sản xuất').fill('Thôn mẫu, xã Bát Xát, tỉnh Lào Cai');
  await form.getByLabel('Người đại diện', { exact: true }).fill('Người đại diện mẫu');
  await form.getByLabel('SĐT người đại diện (dùng để đăng nhập)').fill(NEW_COOP.phone);
  await form.getByLabel('Số tài khoản nhận chi trả').fill('000011112222');
  await form.getByLabel('SĐT liên hệ 1 của HTX').fill('0900000611');
  await form.getByLabel('SĐT liên hệ 2 của HTX').fill('0900000612');
  await form.getByLabel('Sản phẩm dự kiến bán').fill('Gạo, chè');
  await form.getByRole('button', { name: 'Nộp hồ sơ' }).click();
  await expect(form.getByRole('alert')).toBeVisible(); // thiếu ảnh giấy tờ
  await form.locator('input[type=file]').setInputFiles(pngFile('giay-to.png'));
  await form.getByRole('button', { name: 'Nộp hồ sơ' }).click();
  await expect(form.getByRole('alert')).toContainText(/OTP/); // thiếu OTP
  await checkUi(coop, 'Luồng 5 – đăng ký HTX');
  await form.getByRole('button', { name: 'Điền OTP mô phỏng' }).click();
  await form.getByRole('button', { name: 'Nộp hồ sơ' }).click();
  await expect(coop.getByRole('dialog', { name: 'Đã nộp hồ sơ đăng ký HTX' })).toBeVisible();
  await coop.keyboard.press('Escape');

  // Admin – Chất lượng tiếp nhận, yêu cầu bổ sung.
  const quality = await app.open({ width: 1280 });
  await login(quality, PHONES.quality);
  await adminTab(quality, 'Duyệt HTX mới');
  const application = quality.getByRole('region', { name: /^Chi tiết hồ sơ HS-/ });
  await pullNow(quality);
  await expect(application).toContainText(NEW_COOP.name, { timeout: 25_000 });
  await application.getByRole('button', { name: 'Tiếp nhận hồ sơ' }).click();
  await expect(application.getByRole('button', { name: 'Duyệt, tạo tài khoản HTX' })).toBeDisabled();
  await application.getByLabel('Ghi chú cho HTX').fill('Bổ sung ảnh giấy chứng nhận đăng ký HTX rõ hơn');
  await application.getByRole('button', { name: 'Yêu cầu bổ sung' }).click();
  await expect(toast(quality)).toContainText('Đã yêu cầu HTX bổ sung hồ sơ');

  // HTX tra cứu và nộp lại.
  await pullNow(coop);
  await coop.waitForTimeout(500);
  await coop.getByRole('button', { name: 'Tra cứu hồ sơ HTX' }).click();
  await dlg(coop).getByLabel('SĐT người đại diện đã đăng ký').fill(NEW_COOP.phone);
  await dlg(coop).getByRole('button', { name: 'Điền OTP' }).click();
  await dlg(coop).getByRole('button', { name: 'Tra cứu' }).click();
  await dlg(coop).getByRole('button', { name: 'Bổ sung hồ sơ' }).click({ timeout: 25_000 });
  await dlg(coop).getByLabel('Số tài khoản nhận chi trả').fill('000011112222');
  await dlg(coop).getByRole('button', { name: 'Điền OTP mô phỏng' }).click();
  await dlg(coop).getByRole('button', { name: 'Nộp lại hồ sơ' }).click();
  await expect(coop.getByRole('dialog', { name: 'Đã bổ sung hồ sơ' })).toBeVisible();
  await coop.keyboard.press('Escape');

  // Thẩm định đủ 4 mục, duyệt.
  await pullNow(quality);
  await expect(application.getByRole('button', { name: 'Tiếp nhận hồ sơ' })).toBeVisible({ timeout: 25_000 });
  await application.getByRole('button', { name: 'Tiếp nhận hồ sơ' }).click();
  for (const box of await application.getByRole('checkbox').all()) await box.check();
  await checkUi(quality, 'Luồng 5 – thẩm định hồ sơ');
  await application.getByRole('button', { name: 'Duyệt, tạo tài khoản HTX' }).click();
  await expect(toast(quality)).toContainText('Đã duyệt');

  // HTX mới đăng nhập bằng SĐT người đại diện, thêm sản phẩm.
  await pullNow(coop);
  await coop.waitForTimeout(500);
  await login(coop, NEW_COOP.phone);
  await coop.getByRole('tab', { name: /^Sản phẩm/ }).click();
  await coop.getByRole('button', { name: 'Thêm sản phẩm' }).click();
  await dlg(coop).getByLabel('Tên sản phẩm').fill(NEW_COOP.product);
  await dlg(coop).getByLabel('Quy cách').fill('túi 2 kg');
  await dlg(coop).getByLabel('Mô tả').fill('Gạo nương mẫu để thử luồng HTX mới.');
  await dlg(coop).getByLabel('Giá bán (đồng)').fill('150000');
  await dlg(coop).getByLabel('Tồn kho').fill('20');
  await checkUi(coop, 'Luồng 5 – thêm sản phẩm');
  await dlg(coop).getByRole('button', { name: 'Gửi duyệt' }).click();
  await expect(toast(coop)).toContainText('Chờ duyệt');

  // Admin – Chất lượng duyệt sản phẩm; Danh sách HTX có HTX mới.
  await adminTab(quality, 'Duyệt sản phẩm & giá');
  const row = quality.locator('tr', { hasText: NEW_COOP.product });
  await pullNow(quality);
  await expect(row).toBeVisible({ timeout: 25_000 });
  await row.getByRole('button', { name: 'Duyệt', exact: true }).click();
  await expect(toast(quality)).toContainText('Đã duyệt');
  await adminTab(quality, 'Danh sách HTX');
  await expect(quality.getByRole('list', { name: 'Danh sách HTX' })).toContainText(NEW_COOP.name);

  // Khách thấy sản phẩm.
  const customer = await app.open();
  await login(customer, PHONES.customer1);
  await customer.getByRole('searchbox', { name: 'Tìm sản phẩm' }).fill('gao nuong mau');
  await expect(customer.locator('article', { hasText: NEW_COOP.product })).toBeVisible();
});

test('Luồng 6: hai máy dùng chung dữ liệu', async ({ app }) => {
  const customer = await app.open({ width: 390, height: 844 });
  const coop = await app.open({ width: 1280, height: 860 });
  const coop2 = await app.open({ width: 1280, height: 860 });
  await login(coop, PHONES.coopBacHa);
  await login(coop2, PHONES.coopBacHa);

  await login(customer, PHONES.customer1);
  await customer.getByRole('button', { name: /^Chọn quy cách Mứt/ }).click();
  await dlg(customer).getByRole('button', { name: 'Thêm vào giỏ' }).click();
  await customer.getByRole('button', { name: /Giỏ hàng/ }).click();
  await dlg(customer)
    .getByRole('button', { name: /^Đặt hàng \d+ sản phẩm/ })
    .click();
  await dlg(customer).getByRole('button', { name: 'Tiếp tục' }).click();
  await dlg(customer).getByRole('button', { name: 'Tiếp tục' }).click();
  await dlg(customer)
    .getByRole('button', { name: /Đặt hàng/ })
    .click();
  const code = (await dlg(customer).innerText()).match(/DH-\d{8}-\w{6}/)![0];
  await dlg(customer).getByRole('button', { name: 'Thanh toán thành công' }).click();
  await expect(toast(customer)).toBeVisible();

  // Máy HTX tự thấy đơn mới sau tối đa khoảng 10 giây, không bấm gì.
  const card = (page: Page) => page.locator('main ul > li button', { hasText: code }).first();
  await expect(card(coop)).toBeVisible({ timeout: 15_000 });
  await expect(card(coop2)).toBeVisible({ timeout: 15_000 });

  // Hai máy HTX cùng mở đơn; máy 1 xác nhận trước, máy 2 bấm xác nhận khi chưa kịp nhận dữ liệu mới.
  await card(coop).click();
  await card(coop2).click();
  const saved = coop.waitForResponse((r) => r.url().includes('/api/state') && r.request().method() === 'PUT' && r.ok());
  await dlg(coop).getByRole('button', { name: 'Xác nhận đơn' }).click();
  await saved;
  await dlg(coop2).getByRole('button', { name: 'Xác nhận đơn' }).click();
  await expect(coop2.locator('[role=status]', { hasText: 'không áp dụng được vì dữ liệu vừa được máy khác thay đổi' })).toBeVisible();
  await coop2.keyboard.press('Escape');
  // Đơn mua sẵn: HTX xác nhận thì chuyển tiếp sang Đang chuẩn bị (mục 5.5).
  await expect(card(coop2)).toContainText('Đang chuẩn bị');

  // Khách thấy trạng thái mới; tải lại trang (xoá dữ liệu trên máy) vẫn còn đơn vì dữ liệu nằm ở API.
  await customer.keyboard.press('Escape');
  await customer.getByRole('button', { name: 'Tài khoản', exact: true }).last().click();
  await pullNow(customer);
  await expect(card(customer)).toContainText('Đang chuẩn bị', { timeout: 25_000 });
  await customer.evaluate(() => localStorage.clear());
  await customer.reload();
  await customer.getByRole('button', { name: 'Tài khoản', exact: true }).last().click();
  await expect(card(customer)).toBeVisible();
  // Lịch sử đơn chỉ có một lần HTX xác nhận.
  const history = await customer.evaluate(async (c) => {
    const r = await fetch('/api/state?since=0');
    const j = (await r.json()) as { data: { orders: { id: string; statusHistory: { to: string }[] }[] } };
    return j.data.orders.find((o) => o.id === c)?.statusHistory.filter((h) => h.to === 'confirmed').length;
  }, code);
  expect(history).toBe(1);
  await checkUi(coop2, 'Luồng 6 – danh sách đơn HTX trên máy tính');
});
