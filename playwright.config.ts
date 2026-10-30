/// <reference types="node" />
/**
 * Kiểm thử trình duyệt (Giai đoạn 7): `npm run e2e`.
 *
 * - Chạy trên bản build (`vite preview`, cổng 4173). Bản preview có API /api/state lưu trong bộ nhớ của server,
 *   nên các kịch bản dùng chung dữ liệu: chạy lần lượt (1 worker) và khôi phục dữ liệu mẫu trước mỗi kịch bản.
 * - Mọi request ra ngoài localhost bị chặn (e2e/helpers.ts).
 * - Lần đầu trên máy mới cần tải Chromium: `npx playwright install chromium`.
 * - Tên file kết thúc bằng .e2e.ts để vitest (`npm test`) không chạy nhầm.
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:4173',
    browserName: 'chromium',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
