/**
 * Lối thoát khi app lỗi ngay lúc mở vì dữ liệu dùng chung hỏng (sửa lỗi bản web 18/10/2026): không đăng nhập được thì
 * cũng không vào được Công cụ demo để khôi phục. Màn báo lỗi cho Quản trị gốc / Admin – Vận hành nhập SĐT + OTP mô phỏng
 * rồi ghi dữ liệu mẫu thẳng lên API (vẫn chỉ hai nhóm này, như Công cụ demo ở Giai đoạn 7).
 */
import { DEMO_USERS, createSeedState } from '../data/seed';
import { DEMO_OTP } from '../domain/auth';
import { demoResetData } from '../domain/demoAccess';
import { normalizePhone } from '../domain/phone';
import { fail, ok, type Actor, type Result } from '../domain/types';
import { clearState, STORAGE_VERSION } from './persistence';

export async function emergencyReset(phone: string, otp: string, fetchImpl: typeof fetch = fetch): Promise<Result<'shared' | 'local'>> {
  const user = DEMO_USERS.find((u) => u.phone === normalizePhone(phone));
  if (!user || user.role !== 'admin' || (user.adminGroup !== 'root' && user.adminGroup !== 'operations')) return fail('Chỉ Quản trị gốc hoặc Admin – Vận hành khôi phục được dữ liệu mẫu.');
  if (otp.trim() !== DEMO_OTP) return fail('Mã OTP không đúng.');
  const actor: Actor = { kind: 'admin', id: user.id, userId: user.id, name: user.name, adminGroup: user.adminGroup };
  const at = new Date();
  const seed = createSeedState(at);
  const reset = demoResetData(seed, actor, seed, at);
  if (!reset.ok) return reset;
  clearState();
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const got = await fetchImpl('/api/state', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (got.status === 503 || got.status === 404) return ok('local');
      const head = (await got.json().catch(() => null)) as { version?: unknown } | null;
      if (typeof head?.version !== 'number') return got.ok ? ok('local') : fail(`API dữ liệu chung trả lỗi ${got.status}.`);
      const put = await fetchImpl('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ baseVersion: head.version, schema: STORAGE_VERSION, data: reset.value }),
      });
      if (put.ok) return ok('shared');
      if (put.status !== 409) {
        const body = (await put.json().catch(() => null)) as { error?: unknown } | null;
        return fail(typeof body?.error === 'string' ? body.error : `API dữ liệu chung trả lỗi ${put.status}.`);
      }
    }
    return fail('Dữ liệu đang được máy khác ghi liên tục. Thử lại sau ít phút.');
  } catch {
    return fail('Không kết nối được API dữ liệu chung.');
  }
}
