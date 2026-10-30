/**
 * Tình trạng cấu hình các dịch vụ ngoài, để Công cụ demo cho biết bản đang chạy dùng thật hay mô phỏng (Giai đoạn 7).
 * Chỉ đọc; cấu hình do chủ repo đặt ở Vercel.
 */

/** Client ID của Google (công khai, không phải bí mật). Đặt ở Vercel: VITE_GOOGLE_CLIENT_ID. Chưa có thì dùng bản mô phỏng. */
export const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();

/** Đã có khoá Google Maps ở server chưa (GET /api/geocode?status=1). null: không hỏi được, vd. chạy không có máy chủ API. */
export async function fetchMapsConfigured(fetchImpl: typeof fetch = fetch): Promise<boolean | null> {
  try {
    const res = await fetchImpl('/api/geocode?status=1', { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { configured?: unknown };
    return typeof body.configured === 'boolean' ? body.configured : null;
  } catch {
    return null;
  }
}
