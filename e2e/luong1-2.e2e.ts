/**
 * Luồng 1: đặt hàng (mua sẵn + đặt trước + hộp quà gửi người khác) → HTX xử lý → giao → đánh giá, khiếu nại → CSKH, Tài chính → QLNN.
 * Luồng 2: thanh toán hết hạn (Admin – Vận hành tua 15 phút) → hàng được nhả.
 * Đổi vai trò bằng đăng xuất / đăng nhập trên cùng một máy, đổi cỡ màn hình theo vai trò (khách, HTX: điện thoại; Admin: máy tính).
 */
import type { Page } from '@playwright/test';
import { checkUi, dlg, expect, login, logout, openDemoTools, PHONES, pngFile, resetDemoData, test, toast } from './helpers';

test.beforeEach(async ({ app }) => resetDemoData(app));

const PHONE = { width: 390, height: 860 };
const DESKTOP = { width: 1280, height: 900 };
const totalOrders = async (page: Page) => {
  await expect(page.getByText('Tổng số đơn').first()).toBeVisible();
  return Number((await page.locator('main').innerText()).match(/Tổng số đơn\s*(\d+)/)?.[1]);
};
const openAccount = (page: Page) => page.getByRole('button', { name: 'Tài khoản', exact: true }).last().click();
const orderCard = (page: Page, text: string) => page.locator('main ul > li button', { hasText: text }).first();

test('Luồng 1: đặt hàng tới hoàn tiền, QLNN thấy số liệu thay đổi', async ({ app }) => {
  const page = await app.open(DESKTOP);
  await login(page, PHONES.regulator);
  const before = await totalOrders(page);
  expect(before).toBeGreaterThan(0);
  await logout(page);

  // 1–3. Khách 1: mứt (mua sẵn, hộp quà gửi người khác) + mận (đặt trước), thanh toán mô phỏng thành công.
  await page.setViewportSize(PHONE);
  await login(page, PHONES.customer1);
  await page.getByRole('button', { name: /^Chọn quy cách Mứt/ }).click();
  await dlg(page).getByRole('button', { name: 'Thêm vào giỏ' }).click();
  await page.getByRole('button', { name: /Thêm Mận tam hoa tươi/ }).click();
  await page.getByRole('button', { name: /Giỏ hàng/ }).click();
  await dlg(page)
    .getByRole('button', { name: /^Đặt hàng \d+ sản phẩm/ })
    .click();
  const ready = dlg(page).locator('section', { hasText: 'Mua sẵn' }).first();
  await ready.getByText('Thêm hộp quà cho đơn này').click();
  await ready.getByLabel('Lời nhắn (không bắt buộc)').fill('Chúc mừng sinh nhật!');
  await ready.getByText('Gửi người khác').click();
  await ready.getByLabel('Tên người nhận').fill('Người nhận mẫu');
  await ready.getByLabel('SĐT người nhận').fill('0900000777');
  await ready.getByLabel('Phường/xã (Hà Nội)').selectOption({ index: 2 });
  await ready.getByLabel('Số nhà, đường, toà–căn').fill('12 đường mẫu');
  await dlg(page).getByRole('button', { name: 'Tiếp tục' }).click();
  // Quà gửi người khác chỉ trả online (BR-DAT-09).
  await expect(dlg(page).locator('section', { hasText: 'Mua sẵn' }).getByRole('radio', { name: /COD/ })).toBeDisabled();
  await dlg(page).getByText('Tôi đã đọc và đồng ý điều kiện huỷ trên').click();
  await dlg(page).getByRole('button', { name: 'Tiếp tục' }).click();
  await checkUi(page, 'Luồng 1 – xác nhận đặt hàng');
  await dlg(page)
    .getByRole('button', { name: /Đặt hàng/ })
    .click();
  await expect(dlg(page)).toContainText('Đây là cổng mô phỏng, không trừ tiền thật');
  await checkUi(page, 'Luồng 1 – cổng thanh toán mô phỏng');
  await dlg(page).getByRole('button', { name: 'Thanh toán thành công' }).click();
  await expect(page.locator('main ul > li span.font-mono').first()).toBeVisible();
  const ids = (await page.locator('main ul > li span.font-mono').allInnerTexts()).slice(0, 2).map((t) => t.trim());
  expect(ids).toHaveLength(2);
  await logout(page);

  // 4. HTX Bắc Hà: xác nhận; đơn quà: phiếu đóng gói không in giá, bàn giao; đơn đặt trước: xác nhận thu hoạch.
  await login(page, PHONES.coopBacHa);
  for (const id of ids) {
    await orderCard(page, id).click();
    const slip = dlg(page).getByLabel('Phiếu đóng gói');
    await expect(slip).toBeVisible();
    await checkUi(page, 'Luồng 1 – chi tiết đơn của HTX');
    await dlg(page).getByRole('button', { name: 'Xác nhận đơn' }).click();
    const handover = dlg(page).getByRole('button', { name: /bàn giao vận chuyển/ });
    if (await handover.count()) {
      await expect(slip).toContainText('không in giá');
      await expect(slip).toContainText('Người nhận mẫu');
      await expect(slip.locator('li')).not.toContainText(/\d+\.\d{3}\s?đ/);
      await handover.click();
    } else {
      await dlg(page).getByRole('button', { name: 'Xác nhận đã thu hoạch xong' }).click();
      await dlg(page).getByRole('button', { name: 'Xác nhận đã thu hoạch xong' }).click();
    }
    await expect(toast(page)).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await logout(page);

  // Khách trả phần còn lại của đơn đặt trước; HTX bàn giao.
  await login(page, PHONES.customer1);
  await openAccount(page);
  await orderCard(page, 'Đặt trước').click();
  await dlg(page)
    .getByRole('button', { name: /Trả phần còn lại/ })
    .click();
  await dlg(page).getByRole('button', { name: 'Thanh toán thành công' }).click();
  await expect(toast(page)).toBeVisible();
  await logout(page);
  await login(page, PHONES.coopBacHa);
  await orderCard(page, 'Đang chuẩn bị').click();
  await dlg(page)
    .getByRole('button', { name: /bàn giao vận chuyển/ })
    .click();
  await expect(toast(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await logout(page);

  // 5. Admin – Vận hành: ĐVVC mô phỏng giao thành công 2 đơn.
  await page.setViewportSize(DESKTOP);
  await login(page, PHONES.ops);
  await page.getByRole('button', { name: 'Giao hàng', exact: true }).click();
  await checkUi(page, 'Luồng 1 – Giao hàng (Admin – Vận hành)');
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Giao thành công' }).first().click();
  await expect(page.getByRole('button', { name: 'Giao thành công' })).toHaveCount(0);
  await logout(page);

  // 6–7. Khách: đã nhận, đánh giá, khiếu nại có ảnh (yêu cầu trả hàng – hoàn tiền).
  await page.setViewportSize(PHONE);
  await login(page, PHONES.customer1);
  await openAccount(page);
  for (const id of ids) {
    await orderCard(page, id).click();
    await dlg(page).getByRole('button', { name: 'Đã nhận hàng' }).click();
    await page.keyboard.press('Escape');
  }
  await orderCard(page, ids[0]).click();
  await dlg(page)
    .getByRole('button', { name: /^Đánh giá / })
    .first()
    .click();
  await checkUi(page, 'Luồng 1 – đánh giá');
  await dlg(page).getByRole('radio', { name: '4 sao' }).click();
  await dlg(page).getByRole('button', { name: 'Gửi đánh giá' }).click();
  await expect(toast(page)).toBeVisible();
  await dlg(page)
    .getByRole('button', { name: /Khiếu nại/ })
    .click();
  await dlg(page).getByRole('checkbox').first().check();
  await dlg(page).getByLabel('Lý do').selectOption('damaged');
  await dlg(page).locator('input[type=file]').setInputFiles(pngFile('hang-dap.png'));
  await checkUi(page, 'Luồng 1 – khiếu nại có ảnh');
  await dlg(page).getByText('Yêu cầu trả hàng – hoàn tiền').click();
  await dlg(page).getByRole('button', { name: 'Gửi khiếu nại' }).click();
  // Gửi xong app mở chi tiết đơn có thẻ khiếu nại.
  await expect(dlg(page).getByRole('heading', { name: /^Khiếu nại TK-/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await logout(page);

  // 8. CSKH tiếp nhận, kết luận duyệt hoàn.
  await page.setViewportSize(DESKTOP);
  await login(page, PHONES.cskh);
  await page.getByRole('button', { name: 'Ticket khiếu nại' }).click();
  await checkUi(page, 'Luồng 1 – ticket CSKH');
  await page.getByRole('button', { name: 'Tiếp nhận', exact: true }).click();
  await page.getByLabel('Kết luận / ghi chú').first().fill('Hàng dập khi vận chuyển, đồng ý hoàn');
  await page
    .getByRole('button', { name: /duyệt hoàn/ })
    .first()
    .click();
  await expect(toast(page)).toBeVisible();
  await logout(page);

  // 9. Tài chính ghi nhận hoàn tiền mô phỏng.
  await login(page, PHONES.finance);
  await page.getByRole('button', { name: 'Hoàn tiền', exact: true }).click();
  await checkUi(page, 'Luồng 1 – hoàn tiền');
  await page.getByRole('button', { name: 'Bắt đầu hoàn' }).first().click();
  await page.getByRole('button', { name: 'Ngân hàng mô phỏng xác nhận' }).first().click();
  await expect(toast(page)).toBeVisible();
  await logout(page);

  // 10. QLNN thấy số liệu tổng hợp thay đổi (thêm 2 đơn), có biểu đồ.
  await login(page, PHONES.regulator);
  await expect.poll(() => totalOrders(page)).toBe(before + 2);
  await expect(page.locator('main figure').first()).toBeVisible();
  await checkUi(page, 'Luồng 1 – QLNN');
});

test('Luồng 2: đơn online chưa trả, quá 15 phút thì huỷ và nhả hàng', async ({ app }) => {
  const page = await app.open(PHONE);
  const stock = async () => {
    await page.locator('main h3', { hasText: 'Chè Shan tuyết' }).click();
    const n = Number(
      (
        await dlg(page)
          .getByText(/có thể đặt/)
          .innerText()
      ).match(/Còn\s*(\d+)/)?.[1],
    );
    await page.keyboard.press('Escape');
    return n;
  };
  await login(page, PHONES.customer2);
  const initial = await stock();
  await page.locator('main h3', { hasText: 'Chè Shan tuyết' }).click();
  await dlg(page).getByRole('button', { name: 'Mua ngay' }).click();
  await dlg(page).getByRole('button', { name: 'Tiếp tục' }).click();
  await dlg(page).getByRole('button', { name: 'Tiếp tục' }).click();
  await dlg(page)
    .getByRole('button', { name: /Đặt hàng/ })
    .click();
  await expect(dlg(page).getByRole('button', { name: 'Thanh toán thành công' })).toBeVisible();
  const code = (await dlg(page).innerText()).match(/DH-\d{8}-\w{6}/)?.[0];
  expect(code).toBeTruthy();
  await page.keyboard.press('Escape');
  expect(await stock()).toBe(initial - 1);
  // Khách không tua được giờ (Giai đoạn 7).
  await openDemoTools(page);
  await expect(dlg(page).getByRole('button', { name: '+15 phút' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await logout(page);

  await login(page, PHONES.ops);
  await openDemoTools(page);
  await dlg(page).getByRole('button', { name: '+15 phút' }).click();
  await expect(toast(page)).toContainText('Đã tua thời gian +15 phút');
  await page.keyboard.press('Escape');
  await logout(page);

  await login(page, PHONES.customer2);
  expect(await stock()).toBe(initial);
  await openAccount(page);
  await expect(orderCard(page, code!)).toContainText('Đã huỷ');
});
