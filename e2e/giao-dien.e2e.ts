/**
 * Kiểm tra giao diện tự động (mục 8.5 và 13.2): các màn chính của từng vai trò ở 320, 390, 768, 1.280, 1.920px.
 * 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px, không tràn ngang.
 */
import { checkUi, dlg, login, logout, openDemoTools, PHONES, resetDemoData, test } from './helpers';

test.beforeEach(async ({ app }) => resetDemoData(app));

for (const width of [320, 390, 768, 1280, 1920]) {
  test(`Giao diện ở ${width}px`, async ({ app }) => {
    const page = await app.open({ width, height: width < 1000 ? 860 : 900 });
    const at = (screen: string) => `${screen} – ${width}px`;
    await checkUi(page, at('Đăng nhập'));

    await login(page, PHONES.customer1);
    await checkUi(page, at('Khám phá'));
    await page.locator('main article').first().getByRole('button', { name: /^Xem / }).click();
    await checkUi(page, at('Chi tiết sản phẩm'));
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Vụ mùa', exact: true }).last().click();
    await checkUi(page, at('Vụ mùa'));
    await page.getByRole('button', { name: 'Tài khoản', exact: true }).last().click();
    await checkUi(page, at('Tài khoản – Đơn mua'));
    await page.locator('main ul > li button', { hasText: 'DH-' }).first().click();
    await checkUi(page, at('Chi tiết đơn của khách'));
    await page.keyboard.press('Escape');
    await logout(page);

    await login(page, PHONES.coopBacHa);
    await checkUi(page, at('HTX – Đơn hàng'));
    await page.locator('main ul > li button', { hasText: 'DH-' }).first().click();
    await checkUi(page, at('HTX – chi tiết đơn'));
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: /^Sản phẩm/ }).click();
    await checkUi(page, at('HTX – Sản phẩm'));
    await logout(page);

    await login(page, PHONES.ops);
    await checkUi(page, at('Admin – Tổng quan'));
    await page.getByRole('navigation', { name: 'Chức năng quản trị' }).getByRole('button', { name: 'Tham số', exact: true }).click();
    await checkUi(page, at('Admin – Tham số'));
    await openDemoTools(page);
    await checkUi(page, at('Công cụ demo'));
    await dlg(page).getByRole('button', { name: 'Đóng' }).first().click();
    await logout(page);

    await login(page, PHONES.regulator);
    await checkUi(page, at('QLNN – Số liệu tổng hợp'));
    await logout(page);

    await login(page, '0900000401');
    await checkUi(page, at('Shipper – Cần giao'));
    await page.getByRole('tab', { name: /^Thu hộ COD/ }).click();
    await checkUi(page, at('Shipper – Thu hộ COD'));
  });
}
