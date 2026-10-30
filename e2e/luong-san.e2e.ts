/**
 * Luồng kiểu sàn TMĐT (chủ repo yêu cầu ngày 18/10/2026, đợt 2): gợi ý và lịch sử tìm kiếm, sắp xếp và lọc giá,
 * yêu thích sản phẩm, đã xem gần đây, shop HTX và theo dõi (không lộ SĐT HTX), lưu mã vào Kho voucher và thấy mã đã lưu
 * lên đầu ở bước đặt hàng (vẫn chỉ 1 mã mỗi lần đặt).
 */
import type { Page } from '@playwright/test';
import { checkUi, dlg, expect, login, PHONES, resetDemoData, test, toast } from './helpers';

test.beforeEach(async ({ app }) => resetDemoData(app));

const cardNames = (page: Page) => page.locator('main article h3').allInnerTexts();
const shortcut = (page: Page, name: RegExp) => page.getByRole('navigation', { name: 'Lối tắt' }).getByRole('button', { name });

test('Luồng sàn: tìm kiếm, sắp xếp, yêu thích, shop HTX, kho voucher', async ({ app }) => {
  const page = await app.open();
  await login(page, PHONES.customer1);
  await checkUi(page, 'Sàn – trang chủ');

  // Gợi ý khi gõ; Enter lưu từ khoá và lọc lưới; ô trống thì hiện tìm kiếm gần đây.
  const search = page.getByRole('searchbox', { name: 'Tìm sản phẩm' });
  await search.fill('mứt');
  await expect(page.getByRole('list', { name: 'Sản phẩm gợi ý' })).toContainText('Mứt / ô mai mận tam hoa');
  await checkUi(page, 'Sàn – gợi ý tìm kiếm');
  await search.press('Enter');
  expect(await cardNames(page)).toEqual(['Mứt / ô mai mận tam hoa']);
  await search.fill('');
  await search.click();
  await expect(page.getByRole('button', { name: 'mứt', exact: true })).toBeVisible();
  await search.press('Escape');

  // Sắp xếp theo giá (giá "từ" của nhóm quy cách), lọc khoảng giá.
  await page.getByRole('group', { name: 'Sắp xếp' }).getByRole('button', { name: 'Giá thấp → cao' }).click();
  expect((await cardNames(page)).slice(0, 3)).toEqual(['Phở hồng Bắc Hà', 'Thảo quả khô', 'Chè Shan tuyết']);
  await page.getByLabel('Khoảng giá').selectOption({ label: 'Dưới 100.000đ' });
  expect(await cardNames(page)).toEqual(['Phở hồng Bắc Hà', 'Thảo quả khô', 'Chè Shan tuyết']);
  await page.getByRole('button', { name: 'Xoá tìm kiếm và bộ lọc' }).first().click();

  // Yêu thích và đã xem gần đây.
  const che = page.locator('main article', { hasText: 'Chè Shan tuyết' });
  await che.getByRole('button', { name: 'Yêu thích Chè Shan tuyết' }).click();
  await expect(toast(page)).toContainText('Đã thêm vào Yêu thích');
  await expect(che.getByRole('button', { name: 'Yêu thích Chè Shan tuyết' })).toHaveAttribute('aria-pressed', 'true');
  await che.getByRole('button', { name: 'Xem Chè Shan tuyết' }).click();
  await expect(dlg(page).getByRole('button', { name: 'Yêu thích Chè Shan tuyết' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Xem lại Chè Shan tuyết' })).toBeVisible();
  await shortcut(page, /^Yêu thích/).click();
  await expect(dlg(page).getByRole('button', { name: 'Bỏ yêu thích Chè Shan tuyết' })).toBeVisible();
  await checkUi(page, 'Sàn – yêu thích');
  await page.keyboard.press('Escape');

  // Shop HTX: theo dõi, nhắn tin; chỉ thông tin công khai.
  await page.getByRole('button', { name: 'Xem shop HTX mẫu Bắc Hà' }).click();
  await expect(dlg(page).locator('article')).toHaveCount(3);
  await dlg(page).getByRole('button', { name: 'Theo dõi', exact: true }).click();
  await expect(toast(page)).toContainText('Đã theo dõi HTX mẫu Bắc Hà');
  await expect(dlg(page).getByRole('button', { name: 'Đang theo dõi' })).toHaveAttribute('aria-pressed', 'true');
  await expect(dlg(page).getByRole('region', { name: 'Thông tin shop' }).locator('div', { hasText: 'Người theo dõi' }).locator('dd')).toHaveText('1');
  await expect(dlg(page)).not.toContainText(/0900\s?000\s?41\d/);
  await checkUi(page, 'Sàn – shop HTX');
  await page.keyboard.press('Escape');

  // Kho voucher: lưu CHEBIEN10 (đứng sau GIAM30K trong danh sách mã).
  await page.getByRole('button', { name: 'Lưu mã CHEBIEN10' }).click();
  await expect(toast(page)).toContainText('Đã lưu mã CHEBIEN10 vào Kho voucher');
  await shortcut(page, /^Kho voucher/).click();
  await expect(dlg(page).getByRole('region', { name: /^Mã đã lưu/ })).toContainText('CHEBIEN10');
  await checkUi(page, 'Sàn – kho voucher');
  await page.keyboard.press('Escape');

  // Bước đặt hàng: mã đã lưu lên đầu, có nhãn "Đã lưu".
  await page.getByRole('button', { name: 'Thêm Chè Shan tuyết vào giỏ' }).click();
  await page.getByRole('button', { name: /Giỏ hàng/ }).click();
  await dlg(page)
    .getByRole('button', { name: /^Đặt hàng \d+ sản phẩm/ })
    .click();
  await dlg(page).getByRole('button', { name: 'Tiếp tục' }).click();
  const first = dlg(page).getByRole('region', { name: 'Mã ưu đãi' }).getByRole('listitem').first();
  await expect(first).toContainText('CHEBIEN10');
  await expect(first).toContainText('Đã lưu');
  await checkUi(page, 'Sàn – mã đã lưu ở bước đặt hàng');
});
