/**
 * Luồng Shipper (chủ repo yêu cầu ngày 18/10/2026; OI-01: Admin – Vận hành phân công):
 * khách đặt đơn COD → HTX xác nhận → Admin – Vận hành phân công shipper → HTX bàn giao → shipper lấy hàng,
 * giao thất bại 1 lần, giao thành công có ảnh → khách xem theo dõi vận chuyển, bấm Đã nhận → shipper nộp tiền thu hộ →
 * Admin – Tài chính xác nhận. Mỗi vai trò một máy, thấy thay đổi của nhau qua dữ liệu dùng chung.
 */
import type { Locator, Page } from '@playwright/test';
import { checkUi, dlg, expect, login, PHONES, pngFile, pullNow, resetDemoData, test, toast } from './helpers';

test.beforeEach(async ({ app }) => resetDemoData(app));

const SHIPPER_1 = '0900000401';
const card = (page: Page, code: string) => page.locator('main ul > li button', { hasText: code }).first();
async function seeFromOtherDevice(page: Page, target: Locator) {
  await pullNow(page);
  await expect(target).toBeVisible({ timeout: 25_000 });
}

test('Luồng Shipper: phân công, lấy hàng, giao thất bại rồi giao thành công có ảnh, thu hộ COD', async ({ app, request }) => {
  // Khách đặt mứt, trả khi nhận hàng (COD).
  const customer = await app.open();
  await login(customer, PHONES.customer1);
  await customer.getByRole('button', { name: /^Chọn quy cách Mứt/ }).click();
  await dlg(customer).getByRole('button', { name: 'Thêm vào giỏ' }).click();
  await customer.getByRole('button', { name: /Giỏ hàng/ }).click();
  await dlg(customer)
    .getByRole('button', { name: /^Đặt hàng \d+ sản phẩm/ })
    .click();
  await dlg(customer).getByRole('button', { name: 'Tiếp tục' }).click();
  await dlg(customer).getByRole('radio', { name: /COD/ }).check();
  await dlg(customer).getByRole('button', { name: 'Tiếp tục' }).click();
  await dlg(customer)
    .getByRole('button', { name: /Đặt hàng/ })
    .click();
  await expect(toast(customer)).toBeVisible();
  let code = '';
  await expect
    .poll(async () => {
      const s = (await (await request.get('/api/state')).json()).data as { orders: { id: string; customerId: string; paymentMethod: string; createdAt: string }[] };
      code = s.orders.filter((o) => o.customerId === 'cust-1' && o.paymentMethod === 'cod').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.id ?? '';
      return code;
    })
    .toMatch(/^DH-/);

  // HTX xác nhận (đơn mua sẵn sang Đang chuẩn bị).
  const coop = await app.open({ width: 1280 });
  await login(coop, PHONES.coopBacHa);
  await seeFromOtherDevice(coop, card(coop, code));
  await card(coop, code).click();
  await dlg(coop).getByRole('button', { name: 'Xác nhận đơn' }).click();
  await expect(toast(coop)).toBeVisible();
  await coop.keyboard.press('Escape');

  // Admin – Vận hành phân công Shipper mẫu 1.
  const ops = await app.open({ width: 1280 });
  await login(ops, PHONES.ops);
  await ops.getByRole('button', { name: 'Giao hàng', exact: true }).click();
  const select = ops.getByLabel(`Shipper cho đơn ${code}`);
  await seeFromOtherDevice(ops, select);
  await select.selectOption({ label: 'Shipper mẫu 1' });
  await ops.getByLabel(`Ghi chú lấy hàng đơn ${code}`).fill('Lấy tại điểm tập kết (mẫu), 8 giờ sáng');
  await ops.getByRole('button', { name: 'Phân công', exact: true }).click();
  await expect(toast(ops)).toContainText('Shipper mẫu 1');
  await checkUi(ops, 'Giao hàng – phân công shipper');

  // Shipper thấy đơn, chờ HTX bàn giao.
  const shipper = await app.open();
  await login(shipper, SHIPPER_1);
  await seeFromOtherDevice(shipper, card(shipper, code));
  await expect(card(shipper, code)).toContainText('Chờ HTX bàn giao');
  await expect(card(shipper, code)).toContainText(/Thu hộ \d/);
  await checkUi(shipper, 'Màn Shipper');

  // HTX bàn giao; shipper lấy hàng, giao thất bại 1 lần.
  await card(coop, code).click();
  await dlg(coop)
    .getByRole('button', { name: /bàn giao vận chuyển/ })
    .click();
  await expect(toast(coop)).toBeVisible();
  await coop.keyboard.press('Escape');
  await seeFromOtherDevice(shipper, card(shipper, code).getByText('Cần lấy hàng'));
  await card(shipper, code).click();
  await expect(dlg(shipper)).toContainText('Lấy tại điểm tập kết (mẫu)');
  await expect(dlg(shipper)).not.toContainText(/0900 000 1\d\d/); // không có SĐT HTX
  await dlg(shipper).getByRole('button', { name: 'Đã lấy hàng' }).click();
  await expect(toast(shipper)).toContainText('Đã ghi nhận lấy hàng');
  await dlg(shipper).getByRole('button', { name: 'Giao thất bại' }).click();
  await dlg(shipper).getByText('Người nhận hẹn giao lại', { exact: true }).click();
  await dlg(shipper).getByLabel('Ghi chú (không bắt buộc)').fill('Hẹn chiều nay');
  await dlg(shipper).getByRole('button', { name: 'Báo giao thất bại' }).click();
  await expect(dlg(shipper)).toContainText('Đã giao không thành công 1/3');
  // Giao lại thành công, có ảnh.
  await dlg(shipper).getByRole('button', { name: 'Giao thành công' }).click();
  await dlg(shipper).getByRole('button', { name: 'Xác nhận đã giao' }).click();
  await expect(dlg(shipper).getByRole('alert')).toHaveText('Chụp ít nhất 1 ảnh giao hàng.');
  await dlg(shipper).locator('input[type=file]').setInputFiles(pngFile('giao-hang.png'));
  await checkUi(shipper, 'Shipper – giao thành công');
  await dlg(shipper).getByRole('button', { name: 'Xác nhận đã giao' }).click();
  await expect(toast(shipper)).toContainText('Đã báo giao thành công');
  await expect(dlg(shipper).getByRole('img', { name: 'Ảnh giao hàng 1' })).toBeVisible();
  await shipper.keyboard.press('Escape');

  // Khách xem theo dõi vận chuyển, bấm Đã nhận.
  await customer.getByRole('button', { name: 'Tài khoản', exact: true }).last().click();
  await seeFromOtherDevice(customer, card(customer, code));
  await card(customer, code).click();
  const tracking = dlg(customer).locator('section', { has: customer.getByRole('heading', { name: 'Theo dõi vận chuyển' }) });
  await expect(tracking).toContainText('Giao hàng thành công', { timeout: 25_000 });
  await expect(tracking).toContainText('Giao hàng không thành công (lần 1)');
  await expect(tracking).toContainText('Người nhận hẹn giao lại: Hẹn chiều nay');
  await expect(tracking.getByRole('img', { name: 'Ảnh giao hàng 1' })).toBeVisible();
  await checkUi(customer, 'Khách – theo dõi vận chuyển');
  await dlg(customer).getByRole('button', { name: 'Đã nhận hàng' }).click();
  await expect(toast(customer)).toBeVisible();

  // Shipper nộp tiền thu hộ; Tài chính xác nhận.
  await shipper.getByRole('tab', { name: /^Thu hộ COD/ }).click();
  await shipper.getByRole('button', { name: 'Nộp tiền thu hộ' }).click();
  await expect(toast(shipper)).toContainText('Đã tạo phiếu nộp');
  await expect(shipper.getByText('Chờ Tài chính xác nhận')).toBeVisible();
  const finance = await app.open({ width: 1280 });
  await login(finance, PHONES.finance);
  await finance.getByRole('button', { name: 'Thu hộ COD', exact: true }).click();
  const confirmButton = finance.getByRole('button', { name: 'Xác nhận đã nhận tiền' });
  await seeFromOtherDevice(finance, confirmButton);
  await checkUi(finance, 'Tài chính – thu hộ COD');
  await confirmButton.click();
  await expect(finance.getByText(/^Đã nhận · Admin – Tài chính/)).toBeVisible();
  await seeFromOtherDevice(shipper, shipper.getByText('Tài chính đã nhận'));
});
