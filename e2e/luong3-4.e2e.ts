/**
 * Luồng 3: chọn quy cách, hỏi HTX về sản phẩm, HTX trả lời; không hiện SĐT.
 * Luồng 4: đơn đặt trước tới khi giao: cọc → HTX xác nhận, thu hoạch (kèm ảnh), báo sẵn sàng, hẹn lịch → khách trả phần còn lại → bàn giao.
 * Khách và HTX ở hai máy riêng, thấy thay đổi của nhau qua dữ liệu dùng chung.
 */
import type { Page } from '@playwright/test';
import { checkUi, dlg, expect, login, PHONES, pngFile, pullNow, resetDemoData, test, toast } from './helpers';

test.beforeEach(async ({ app }) => resetDemoData(app));

const SAMPLE_PHONE = /\b0?9\d{2}[\s.]?\d{3}[\s.]?\d{3}\b/;
const orderCard = (page: Page, code: string) => page.locator('main ul > li button', { hasText: code }).first();
/** Đợi máy này thấy thay đổi từ máy khác (hỏi API ngay, sau đó tự hỏi mỗi 10 giây). */
async function seeFromOtherDevice(page: Page, target: ReturnType<Page['locator']>) {
  await pullNow(page);
  await expect(target).toBeVisible({ timeout: 25_000 });
}

test('Luồng 3: quy cách và nhắn tin với HTX', async ({ app }) => {
  const customer = await app.open();
  await login(customer, PHONES.customer1);
  const card = customer.locator('article', { hasText: 'Mứt / ô mai mận tam hoa' });
  await expect(card.getByRole('list', { name: 'Quy cách' })).toContainText('hộp 500 g');
  await card.getByRole('button', { name: 'Chọn quy cách Mứt / ô mai mận tam hoa' }).click();
  await dlg(customer).getByRole('group', { name: 'Quy cách' }).getByText('hộp 500 g').click();
  await checkUi(customer, 'Luồng 3 – chọn quy cách');
  await dlg(customer).getByRole('button', { name: 'Thêm vào giỏ' }).click();
  await customer.keyboard.press('Escape');
  await customer.getByRole('button', { name: /Giỏ hàng/ }).click();
  await expect(dlg(customer)).toContainText('hộp 500 g');
  await customer.keyboard.press('Escape');

  await card.getByRole('button', { name: 'Xem Mứt / ô mai mận tam hoa' }).click();
  await dlg(customer)
    .getByRole('button', { name: /^Hỏi HTX mẫu Bắc Hà về sản phẩm này/ })
    .click();
  await dlg(customer).getByLabel('Nội dung tin nhắn').fill('Hộp 500 g mứt còn hạn dùng bao lâu ạ?');
  await dlg(customer).getByRole('button', { name: 'Gửi tin nhắn' }).click();
  await expect(dlg(customer).getByRole('log')).toContainText('Hộp 500 g mứt còn hạn dùng bao lâu ạ?');
  await checkUi(customer, 'Luồng 3 – cuộc trò chuyện của khách');
  await customer.keyboard.press('Escape');

  const coop = await app.open({ width: 1280 });
  await login(coop, PHONES.coopBacHa);
  const messagesTab = coop.getByRole('tab', { name: /^Tin nhắn/ });
  await pullNow(coop);
  await expect(messagesTab).toContainText('1', { timeout: 25_000 });
  await messagesTab.click();
  await coop.getByRole('button', { name: /^Khách hàng mẫu 1/ }).click();
  await expect(coop.getByRole('log')).toContainText('Hộp 500 g mứt còn hạn dùng bao lâu ạ?');
  await coop.getByLabel('Nội dung tin nhắn').fill('Dạ hạn dùng 6 tháng ạ.');
  await coop.getByRole('button', { name: 'Gửi tin nhắn' }).click();
  await expect(coop.getByRole('log')).toContainText('Dạ hạn dùng 6 tháng ạ.');
  await checkUi(coop, 'Luồng 3 – tin nhắn của HTX');

  const fab = customer.getByRole('button', { name: /^Tin nhắn với HTX/ });
  await pullNow(customer);
  await expect(fab).toHaveAccessibleName(/chưa đọc/, { timeout: 25_000 });
  await fab.click();
  await dlg(customer)
    .getByRole('button', { name: /^HTX mẫu Bắc Hà/ })
    .click();
  const thread = dlg(customer).getByRole('log');
  await expect(thread).toContainText('Dạ hạn dùng 6 tháng ạ.');
  expect(await dlg(customer).innerText()).not.toMatch(SAMPLE_PHONE);
});

test('Luồng 4: đơn đặt trước từ cọc tới bàn giao, hành trình đơn ở hai phía', async ({ app }) => {
  const customer = await app.open();
  await login(customer, PHONES.customer2);
  await customer.getByRole('button', { name: 'Vụ mùa', exact: true }).click();
  await customer.locator('article', { hasText: 'Mận tam hoa tươi' }).getByRole('button', { name: 'Đặt trước' }).click();
  await dlg(customer).getByRole('button', { name: 'Tiếp tục' }).click();
  await dlg(customer).getByText('Tôi đã đọc và đồng ý điều kiện huỷ trên').click();
  await dlg(customer).getByRole('button', { name: 'Tiếp tục' }).click();
  await dlg(customer)
    .getByRole('button', { name: /Đặt hàng|Đặt cọc/ })
    .last()
    .click();
  const code = (await dlg(customer).innerText()).match(/DH-\d{8}-\w{6}/)?.[0];
  expect(code).toBeTruthy();
  await dlg(customer).getByRole('button', { name: 'Thanh toán thành công' }).click();
  await expect(toast(customer)).toBeVisible();

  const coop = await app.open();
  await login(coop, PHONES.coopBacHa);
  await seeFromOtherDevice(coop, orderCard(coop, code!));
  await orderCard(coop, code!).click();
  await dlg(coop).getByRole('button', { name: 'Xác nhận đơn' }).click();
  await dlg(coop).getByRole('button', { name: 'Xác nhận đã thu hoạch xong' }).click();
  const form = dlg(coop).getByRole('region', { name: 'Xác nhận thu hoạch' });
  await form.getByLabel('Ghi chú (không bắt buộc)').fill('Hái sáng sớm, đã phân loại quả đều');
  await form.locator('input[type=file]').setInputFiles(pngFile('lo-man.png'));
  await checkUi(coop, 'Luồng 4 – xác nhận thu hoạch');
  await form.getByRole('button', { name: 'Xác nhận đã thu hoạch xong' }).click();
  await expect(dlg(coop).getByText('Hàng đã vào mùa. Hãy gọi điện hoặc nhắn tin cho khách để hẹn lịch giao.')).toBeVisible();
  await dlg(coop).getByRole('button', { name: 'Dùng tin nhắn mẫu hẹn lịch giao' }).click();
  await dlg(coop).getByRole('button', { name: 'Gửi tin nhắn' }).click();
  await dlg(coop).getByRole('button', { name: 'Ghi lại kết quả cuộc gọi' }).click();
  await dlg(coop).getByText('Đã hẹn lịch giao', { exact: true }).click();
  await dlg(coop).getByLabel('Ghi chú (không bắt buộc)').fill('Giao sáng thứ Bảy, gọi trước 30 phút');
  await dlg(coop).getByRole('button', { name: 'Lưu cuộc gọi' }).click();
  await expect(dlg(coop).getByRole('log')).toContainText('Giao sáng thứ Bảy');
  await checkUi(coop, 'Luồng 4 – liên hệ khách');
  await coop.keyboard.press('Escape');

  // Khách thấy tin và kết quả cuộc gọi, trả lời, trả phần còn lại.
  await customer.keyboard.press('Escape');
  await customer.getByRole('button', { name: 'Tài khoản', exact: true }).last().click();
  await seeFromOtherDevice(customer, orderCard(customer, code!).getByText(/tin mới/));
  await orderCard(customer, code!).click();
  await expect(dlg(customer).getByRole('log')).toContainText('Giao sáng thứ Bảy');
  await dlg(customer).getByRole('textbox', { name: 'Nội dung tin nhắn' }).fill('Sáng thứ Bảy được ạ, cảm ơn HTX.');
  await dlg(customer).getByRole('button', { name: 'Gửi tin nhắn' }).click();
  await dlg(customer)
    .getByRole('button', { name: /Trả phần còn lại/ })
    .click();
  await dlg(customer).getByRole('button', { name: 'Thanh toán thành công' }).click();
  await expect(toast(customer)).toBeVisible();
  await checkUi(customer, 'Luồng 4 – chi tiết đơn của khách');

  // HTX bàn giao; hành trình hai phía đủ các bước.
  await seeFromOtherDevice(coop, orderCard(coop, code!).getByText('Đang chuẩn bị'));
  await orderCard(coop, code!).click();
  await dlg(coop)
    .getByRole('button', { name: /bàn giao vận chuyển/ })
    .click();
  await expect(toast(coop)).toBeVisible();
  const steps = [
    'Đặt trước và trả cọc',
    'HTX xác nhận đơn',
    'Vào mùa – HTX thu hoạch xong',
    'HTX báo sẵn sàng giao',
    'HTX gọi điện / nhắn tin hẹn lịch giao',
    'Trả phần còn lại',
    'Đóng gói, bàn giao vận chuyển',
  ];
  const journeyOf = (page: Page) => dlg(page).locator('section', { has: page.getByRole('heading', { name: 'Hành trình đơn hàng' }) });
  for (const step of steps) await expect(journeyOf(coop).locator('li', { hasText: step })).toContainText('đã xong');
  await customer.keyboard.press('Escape');
  await seeFromOtherDevice(customer, orderCard(customer, code!).getByText('Đang giao'));
  await orderCard(customer, code!).click();
  for (const step of steps) await expect(journeyOf(customer).locator('li', { hasText: step })).toContainText('đã xong');
  await expect(journeyOf(customer).getByRole('img').first()).toBeVisible();
});
