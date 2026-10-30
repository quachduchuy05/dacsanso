/// <reference types="node" />
/**
 * Dùng chung cho các kịch bản trình duyệt (Giai đoạn 7, mục 13.2 của đề bài).
 * - Mỗi "máy" là một context riêng (localStorage, phiên đăng nhập riêng), chặn mọi request ra ngoài localhost.
 * - Lỗi JS và lỗi console làm kịch bản thất bại, trừ lỗi có chủ đích (409 khi hai máy ghi cùng lúc, 503 khi chưa có khoá dịch vụ).
 * - checkUi(): lỗi axe (tương phản, tên nút, nhãn ô nhập), vùng bấm dưới 44px, chữ dưới 12px, tràn ngang.
 */
import { createRequire } from 'node:module';
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';

export { expect };

const AXE_PATH = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const EXPECTED_CONSOLE = /status of (409|503)\b/;

/** SĐT các tài khoản mẫu (src/data/seed.ts). Đăng nhập bằng SĐT dùng được cả khi danh sách tài khoản demo đang ẩn. */
export const PHONES = {
  customer1: '0900000001',
  customer2: '0900000002',
  coopBacHa: '0900000101',
  coopTuLe: '0900000106',
  ops: '0900000201',
  quality: '0900000202',
  cskh: '0900000203',
  finance: '0900000204',
  root: '0900000209',
  regulator: '0900000301',
} as const;

/** Ảnh PNG 2×2 làm ảnh khiếu nại, ảnh giấy tờ, ảnh lô hàng. */
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNk+M/AwMDAxMDAwMDAAAAZNAIBWxOnMQAAAABJRU5ErkJggg==', 'base64');
export const pngFile = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG });

export interface App {
  /** Mở app trên một "máy" mới (mặc định điện thoại 390px). `setup` thêm route trước khi mở trang (vd. giả lập API lỗi). */
  open(viewport?: { width?: number; height?: number }, setup?: (ctx: BrowserContext) => Promise<void>): Promise<Page>;
  /** Lỗi console có chủ đích trong kịch bản này (vd. 404 khi giả lập file của bản cũ không còn). */
  allowConsole(pattern: RegExp): void;
}

/**
 * Chrome mới cho các hàm cuộn (window.scrollTo, element.scrollIntoView…) trả về Promise; Chromium dùng để test chưa.
 * Lỗi bản web 18/10/2026: effect trả về kết quả của scrollTo, React gọi Promise đó như hàm dọn dẹp khi đổi tab → màn lỗi.
 * Mọi "máy" trong kịch bản chạy như Chrome mới để bắt loại lỗi này.
 */
function scrollReturnsPromise() {
  const targets: [object, string][] = [
    [window, 'scrollTo'],
    [window, 'scroll'],
    [window, 'scrollBy'],
    [Element.prototype, 'scrollTo'],
    [Element.prototype, 'scroll'],
    [Element.prototype, 'scrollBy'],
    [Element.prototype, 'scrollIntoView'],
  ];
  for (const [obj, name] of targets) {
    const target = obj as Record<string, (...args: unknown[]) => unknown>;
    const original = target[name];
    if (typeof original !== 'function') continue;
    target[name] = function (this: unknown, ...args: unknown[]) {
      original.apply(this, args);
      return Promise.resolve();
    };
  }
}

export const test = base.extend<{ app: App }>({
  app: async ({ browser }, use) => {
    const errors: string[] = [];
    const allowed: RegExp[] = [EXPECTED_CONSOLE];
    const contexts: BrowserContext[] = [];
    await use({
      async open({ width = 390, height = 860 } = {}, setup) {
        const mobile = width < 1000;
        const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile });
        contexts.push(ctx);
        await ctx.route('**/*', (r) => (new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort()));
        await ctx.addInitScript(scrollReturnsPromise);
        await setup?.(ctx);
        const page = await ctx.newPage();
        page.on('console', (m) => {
          if (m.type() === 'error' && !allowed.some((re) => re.test(m.text()))) errors.push(`console: ${m.text()}`);
        });
        page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
        return page;
      },
      allowConsole(pattern) {
        allowed.push(pattern);
      },
    });
    await Promise.all(contexts.map((c) => c.close().catch(() => {})));
    expect(errors, 'Lỗi JS / console').toEqual([]);
  },
});

export const dlg = (page: Page) => page.getByRole('dialog');
export const toast = (page: Page) => page.locator('[role=status]').last();

export async function login(page: Page, phone: string): Promise<void> {
  await page.getByLabel('Số điện thoại').fill(phone);
  await page.getByRole('button', { name: 'Nhận mã OTP' }).click();
  await page.getByRole('button', { name: 'Điền OTP mô phỏng' }).click();
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('banner').getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('banner').getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
}

/** Hỏi API dữ liệu chung ngay (như khi quay lại app), không đợi chu kỳ 10 giây. */
export const pullNow = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('focus')));

/** Đợi lần ghi lên /api/state có chứa `marker` thành công (vd. dòng nhật ký vừa tạo). */
export const savedWith = (page: Page, marker: string) =>
  page.waitForResponse((r) => r.url().includes('/api/state') && r.request().method() === 'PUT' && r.ok() && (r.request().postData() ?? '').includes(marker));

export async function openDemoTools(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Công cụ demo/ }).click();
  await expect(page.getByRole('dialog', { name: 'Công cụ demo' })).toBeVisible();
}

/**
 * Khôi phục dữ liệu mẫu trên server xem thử (Quản trị gốc), rồi bỏ mã trình diễn nếu kịch bản trước còn để lại.
 * Chạy trước mỗi kịch bản vì các kịch bản dùng chung dữ liệu.
 */
export async function resetDemoData(app: App): Promise<void> {
  const page = await app.open({ width: 1280 });
  await login(page, PHONES.root);
  await openDemoTools(page);
  await dlg(page).getByRole('button', { name: 'Khôi phục dữ liệu mẫu' }).click();
  const saved = savedWith(page, 'Khôi phục dữ liệu mẫu');
  await dlg(page).getByRole('button', { name: 'Xoá và khôi phục' }).click();
  await saved;
  await page.getByRole('button', { name: 'Tham số', exact: true }).click();
  const clear = page.getByRole('button', { name: 'Bỏ mã' });
  if (await clear.isVisible()) {
    const cleared = savedWith(page, 'Bỏ mã trình diễn');
    await clear.click();
    await cleared;
  }
  await page.context().close();
}

/** Kiểm tra giao diện của màn đang mở; lỗi ghi nhận (expect.soft) để kịch bản chạy tiếp và báo hết một lần. */
export async function checkUi(page: Page, where: string): Promise<void> {
  await page.waitForTimeout(300); // đợi hiệu ứng mở sheet
  await page.addScriptTag({ path: AXE_PATH });
  const problems = await page.evaluate(async () => {
    type AxeResult = { violations: { id: string; nodes: { target: string[] }[] }[] };
    const axe = (window as unknown as { axe: { run: (ctx: Document, opts: object) => Promise<AxeResult> } }).axe;
    const out: string[] = [];
    const res = await axe.run(document, {
      runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'link-name', 'label', 'select-name', 'image-alt', 'aria-dialog-name', 'nested-interactive'] },
    });
    for (const v of res.violations) for (const n of v.nodes) out.push(`axe ${v.id}: ${n.target.join(' ')}`);

    const interactive = document.querySelectorAll<HTMLElement>('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=radio], [role=checkbox], label');
    for (const el of interactive) {
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[aria-hidden=true]')) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const input = el as HTMLInputElement;
      // Ô chọn nằm trong label đủ lớn thì tính theo label; label không chứa ô chọn thì không phải vùng bấm.
      if ((input.type === 'checkbox' || input.type === 'radio') && el.closest('label')) continue;
      if (el.tagName === 'LABEL' && !el.querySelector('input[type=checkbox],input[type=radio]')) continue;
      if (input.type === 'file' && el.classList.contains('sr-only')) continue;
      if (rect.width < 44 || rect.height < 44) {
        const name = (el.getAttribute('aria-label') || el.innerText || input.value || el.tagName).replace(/\s+/g, ' ').slice(0, 50);
        out.push(`vùng bấm ${Math.round(rect.width)}×${Math.round(rect.height)}: ${el.tagName.toLowerCase()} "${name}"`);
      }
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const el = node.parentElement;
      if (!node.textContent?.trim() || !el || el.closest('svg')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (parseFloat(cs.fontSize) < 12) out.push(`chữ ${cs.fontSize}: "${node.textContent.trim().slice(0, 40)}"`);
    }

    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (overflow > 0) out.push(`tràn ngang ${overflow}px`);
    return [...new Set(out)];
  });
  expect.soft(problems, `Giao diện @ ${where}`).toEqual([]);
}
