/**
 * Tải lại trang khi không tải được mã của một màn (sửa lỗi bản web 18/10/2026).
 * Thường gặp ngay sau khi Vercel deploy bản mới: tab đang mở vẫn đòi file của bản cũ (vd. màn HTX, Admin), file đó không còn,
 * nên đăng nhập là báo lỗi hoặc trắng trang. Tải lại để lấy bản mới; chỉ tự tải lại 1 lần trong 30 giây để không lặp
 * vô hạn khi mạng hỏng thật.
 */
const KEY = 'dac-san-so-lao-cai:chunk-reload';

export const isChunkLoadError = (e: unknown): boolean =>
  e instanceof Error && /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Load failed/i.test(e.message);

/** Tải lại trang nếu 30 giây gần đây chưa tự tải lại; trả về true nếu đã tải lại. */
export function reloadOnceForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // không có sessionStorage: vẫn tải lại
  }
  window.location.reload();
  return true;
}

/** Bọc hàm import của React.lazy: không tải được mã của bản cũ thì tải lại trang để lấy bản mới. */
export function lazyWithReload<T>(load: () => Promise<T>): () => Promise<T> {
  return () =>
    load().catch((e: unknown) => {
      if (isChunkLoadError(e) && reloadOnceForNewVersion()) return new Promise<T>(() => {});
      throw e;
    });
}
