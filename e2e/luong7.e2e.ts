/**
 * Luồng 7 – Giai đoạn 8 (bổ sung cho khách hàng):
 * 1. Khách bật "Báo tôi khi vào mùa" cho sản phẩm đặt trước đã đóng (Cốm Tú Lệ).
 * 2. HTX báo thu hoạch / mở đợt; Admin – Chất lượng duyệt.
 * 3. Khách nhận đúng 1 thông báo, mở trang sản phẩm, đặt trước (kèm yêu cầu xuất hoá đơn công ty, mã số thuế sai bị chặn).
 * 4. Khách mở trang HTX từ trang sản phẩm: không có SĐT, địa chỉ HTX.
 * Thêm: duyệt thêm suất trong cùng đợt không báo lặp; HTX và Admin – Tài chính thấy thông tin hoá đơn;
 * khách gửi tin nhắn kèm ảnh cho HTX; lọc khoảng giá tự nhập.
 */
import type { APIRequestContext, Page } from '@playwright/test';
import { checkUi, dlg, expect, login, PHONES, pngFile, pullNow, resetDemoData, test, toast } from './helpers';

test.beforeEach(async ({ app }) => resetDemoData(app));

const adminTab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Chức năng quản trị' }).getByRole('button', { name, exact: true }).click();
const orderCard = (page: Page, code: string) => page.locator('main ul > li button', { hasText: code }).first();
/** Ngày yyyy-mm-dd theo giờ Việt Nam, cách hôm nay `n` ngày. */
const dayFromNow = (n: number) => new Date(Date.now() + n * 86_400_000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const SEASON_TITLE = 'Cốm Tú Lệ đã vào mùa';

/** Đóng đợt đặt trước của Cốm Tú Lệ trên dữ liệu dùng chung (như khi đợt cũ đã kết thúc). */
async function closeCom(request: APIRequestContext) {
  const got = await (await request.get('/api/state')).json();
  const data = got.data as { products: { id: string; preorder?: { open: boolean } }[] };
  data.products = data.products.map((p) => (p.id === 'prod-com' ? { ...p, preorder: { ...p.preorder!, open: false } } : p));
  const put = await request.put('/api/state', { data: { baseVersion: got.version, schema: got.schema, data } });
  expect(put.ok()).toBe(true);
}

/** Số thông báo "vào mùa" của Khách hàng mẫu 1 trên dữ liệu dùng chung. */
async function seasonNoticeCount(request: APIRequestContext): Promise<number> {
  const got = await (await request.get('/api/state')).json();
  return (got.data.notifications as { userId: string; title: string }[]).filter((n) => n.userId === 'u-kh1' && n.title === SEASON_TITLE).length;
}

/** HTX Tú Lệ gửi đợt đặt trước, Admin – Chất lượng duyệt. */
async function openRound(coop: Page, quality: Page, slots: number, from: string, to: string) {
  await coop.getByRole('tab', { name: /^Sản phẩm/ }).click();
  await coop.getByLabel('Số suất').fill(String(slots));
  await coop.getByLabel('Giao từ').fill(from);
  await coop.getByLabel('Giao đến').fill(to);
  await coop.getByRole('button', { name: 'Gửi duyệt' }).first().click();
  await expect(toast(coop)).toContainText('Đã gửi báo thu hoạch');
  await adminTab(quality, 'Duyệt sản phẩm & giá');
  const row = quality.locator('tr', { hasText: 'Cốm Tú Lệ' }).filter({ has: quality.getByRole('button', { name: 'Duyệt', exact: true }) });
  await pullNow(quality);
  await expect(row).toBeVisible({ timeout: 25_000 });
  await row.getByRole('button', { name: 'Duyệt', exact: true }).click();
  await expect(toast(quality)).toContainText('Đã duyệt');
}

test('Luồng 7: báo khi vào mùa, đặt trước kèm hoá đơn công ty, trang HTX công khai, ảnh trong tin nhắn', async ({ app, request }) => {
  await closeCom(request);
  const from = dayFromNow(30);
  const to = dayFromNow(50);

  // 1. Khách bật "Báo tôi khi vào mùa" ở tab Vụ mùa; danh sách theo dõi ở Tài khoản.
  const customer = await app.open();
  await login(customer, PHONES.customer1);
  await customer.getByRole('button', { name: 'Vụ mùa', exact: true }).click();
  const card = customer.locator('article', { hasText: 'Cốm Tú Lệ' });
  await expect(card.getByRole('button', { name: 'Chưa mở đặt trước' })).toBeDisabled();
  await card.getByRole('button', { name: 'Báo tôi khi vào mùa' }).click();
  await expect(toast(customer)).toContainText('Đã bật "Báo tôi khi vào mùa"');
  await expect(card.getByRole('button', { name: /Đã bật báo khi vào mùa/ })).toBeVisible();
  await checkUi(customer, 'Luồng 7 – Vụ mùa');
  await customer.getByRole('button', { name: 'Tài khoản', exact: true }).last().click();
  await customer.getByRole('button', { name: /^Báo khi vào mùa/ }).click();
  await expect(dlg(customer).getByRole('listitem')).toHaveCount(1);
  await expect(dlg(customer)).toContainText('Đang chờ vào mùa');
  await checkUi(customer, 'Luồng 7 – danh sách báo khi vào mùa');
  await customer.keyboard.press('Escape');

  // 2. HTX báo đợt mới, Admin – Chất lượng duyệt.
  const coop = await app.open({ width: 1280 });
  await login(coop, PHONES.coopTuLe);
  const quality = await app.open({ width: 1280 });
  await login(quality, PHONES.quality);
  await openRound(coop, quality, 60, from, to);

  // 3. Khách nhận đúng 1 thông báo, bấm vào mở trang sản phẩm.
  await customer
    .getByRole('banner')
    .getByRole('button', { name: /^Thông báo/ })
    .click();
  await pullNow(customer);
  const notice = dlg(customer).getByRole('button', { name: new RegExp(SEASON_TITLE) });
  await expect(notice).toHaveCount(1, { timeout: 25_000 });
  await checkUi(customer, 'Luồng 7 – thông báo vào mùa');
  await notice.click();
  const product = customer.getByRole('dialog', { name: /Cốm Tú Lệ/ });
  await expect(product.getByRole('button', { name: 'Báo tôi khi vào mùa' })).toHaveCount(0);

  // 4. Trang HTX từ trang sản phẩm: thông tin công khai, chứng nhận, nhãn dữ liệu mẫu; không SĐT, không địa chỉ.
  await product.getByRole('button', { name: 'Xem shop HTX mẫu Tú Lệ' }).click();
  const shop = customer.getByRole('dialog', { name: /HTX mẫu Tú Lệ/ });
  await expect(shop.getByRole('region', { name: 'Thông tin shop' })).toBeVisible();
  await expect(shop).toContainText('Dữ liệu mẫu – chờ HTX xác nhận');
  await expect(shop).toContainText('Chứng nhận đã xác minh');
  await expect(shop).not.toContainText(/0900\s?000\s?46\d/);
  await expect(shop).not.toContainText('địa chỉ mẫu – chờ HTX cập nhật');
  await checkUi(customer, 'Luồng 7 – trang HTX');

  // Nhắn tin kèm ảnh cho HTX từ trang HTX; quá NEW-04 ảnh không chọn thêm được.
  await shop.getByRole('button', { name: 'Nhắn tin' }).click();
  const chat = customer.getByRole('dialog', { name: 'Tin nhắn với HTX' });
  await chat.locator('input[type=file]').setInputFiles([pngFile('anh-1.png'), pngFile('anh-2.png'), pngFile('anh-3.png')]);
  await expect(chat.getByRole('list', { name: 'Ảnh sẽ gửi' }).getByRole('listitem')).toHaveCount(2);
  await expect(chat.getByText('Mỗi tin nhắn tối đa 2 ảnh.')).toBeVisible();
  await expect(chat.getByRole('button', { name: 'Đã đủ 2 ảnh' })).toBeDisabled();
  await chat.getByLabel('Nội dung tin nhắn').fill('Cốm năm nay hạt thế nào ạ?');
  await checkUi(customer, 'Luồng 7 – tin nhắn kèm ảnh');
  await chat.getByRole('button', { name: 'Gửi tin nhắn' }).click();
  await expect(chat.getByRole('log')).toContainText('Cốm năm nay hạt thế nào ạ?');
  await expect(chat.getByRole('log').getByRole('img')).toHaveCount(2);
  await customer.keyboard.press('Escape');

  // Đặt trước kèm yêu cầu xuất hoá đơn công ty: mã số thuế "12345" bị chặn.
  await customer.getByRole('button', { name: 'Vụ mùa', exact: true }).click();
  await card.getByRole('button', { name: 'Đặt trước' }).click();
  const checkout = dlg(customer);
  await checkout.getByRole('button', { name: 'Tiếp tục' }).click();
  await checkout.getByText('Xuất hoá đơn công ty').click();
  await checkout.getByLabel('Tên công ty').fill('Công ty mẫu A');
  await checkout.getByLabel('Mã số thuế').fill('12345');
  await checkout.getByLabel('Địa chỉ công ty').fill('Địa chỉ mẫu, Hà Nội');
  await checkout.getByLabel('Email nhận hoá đơn').fill('hoadon@vi-du.test');
  await checkout.getByText('Tôi đã đọc và đồng ý điều kiện huỷ trên').click();
  await expect(checkout.getByText(/Thông tin hoá đơn: Mã số thuế gồm 10 chữ số/).first()).toBeVisible();
  await expect(checkout.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled();
  await checkUi(customer, 'Luồng 7 – hoá đơn sai mã số thuế');
  await checkout.getByLabel('Mã số thuế').fill('0000000001-001');
  await checkout.getByText('Lưu làm thông tin mặc định cho lần sau').click();
  await checkout.getByRole('button', { name: 'Tiếp tục' }).click();
  await expect(checkout.getByRole('region', { name: 'Hoá đơn công ty' })).toContainText('0000000001-001');
  await checkout
    .getByRole('button', { name: /Đặt hàng|Đặt cọc/ })
    .last()
    .click();
  const code = (await dlg(customer).innerText()).match(/DH-\d{8}-\w{6}/)?.[0];
  expect(code).toBeTruthy();
  await dlg(customer).getByRole('button', { name: 'Thanh toán thành công' }).click();
  await expect(toast(customer)).toBeVisible();

  // HTX thấy yêu cầu hoá đơn trong đơn.
  await coop.getByRole('tab', { name: /^Đơn hàng/ }).click();
  await pullNow(coop);
  await expect(orderCard(coop, code!)).toBeVisible({ timeout: 25_000 });
  await orderCard(coop, code!).click();
  await expect(dlg(coop).getByRole('region', { name: 'Hoá đơn công ty' })).toContainText('Công ty mẫu A');
  await expect(dlg(coop)).toContainText('Mô phỏng – chưa phát hành hoá đơn điện tử');
  await coop.keyboard.press('Escape');

  // Duyệt thêm suất trong cùng đợt: không báo lặp.
  expect(await seasonNoticeCount(request)).toBe(1);
  await openRound(coop, quality, 90, from, to);
  await expect.poll(async () => (await (await request.get('/api/state')).json()).data.products.find((p: { id: string }) => p.id === 'prod-com').preorder.totalSlots).toBe(90);
  expect(await seasonNoticeCount(request)).toBe(1);

  // Admin – Tài chính thấy bảng yêu cầu hoá đơn.
  const finance = await app.open({ width: 1280 });
  await login(finance, PHONES.finance);
  await adminTab(finance, 'Hoá đơn công ty');
  await expect(finance.locator('tr', { hasText: code! })).toContainText('0000000001-001');
  await checkUi(finance, 'Luồng 7 – Tài chính, hoá đơn công ty');

  // Đổi thông tin hoá đơn mặc định: đơn đã đặt giữ thông tin lúc đặt.
  await customer.getByRole('button', { name: 'Tài khoản', exact: true }).last().click();
  await customer.getByRole('button', { name: /^Hoá đơn công ty/ }).click();
  await expect(dlg(customer).getByLabel('Tên công ty')).toHaveValue('Công ty mẫu A');
  await dlg(customer).getByLabel('Tên công ty').fill('Công ty mẫu B');
  await checkUi(customer, 'Luồng 7 – thông tin hoá đơn mặc định');
  await dlg(customer).getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(toast(customer)).toContainText('Đã lưu thông tin hoá đơn');
  await orderCard(customer, code!).click();
  await expect(dlg(customer).getByRole('region', { name: 'Hoá đơn công ty' })).toContainText('Công ty mẫu A');
  await customer.keyboard.press('Escape');

  // Khoảng giá tự nhập ở Khám phá.
  await customer.getByRole('button', { name: 'Khám phá', exact: true }).last().click();
  await customer.getByLabel('Khoảng giá').selectOption({ label: 'Tự nhập khoảng giá' });
  await customer.getByLabel('Giá từ (đồng)').fill('100000');
  await customer.getByLabel('Giá đến (đồng)').fill('150000');
  await expect(customer.getByLabel('Giá từ (đồng)')).toHaveValue('100.000');
  const prices = await customer.locator('main article').count();
  expect(prices).toBeGreaterThan(0);
  await checkUi(customer, 'Luồng 7 – khoảng giá tự nhập');
});
