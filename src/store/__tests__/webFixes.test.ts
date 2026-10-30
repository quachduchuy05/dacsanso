// @vitest-environment node
/**
 * Sửa lỗi bản web (18/10/2026): dữ liệu dùng chung lưu từ bản cũ, dữ liệu đầy, deploy bản mới khi tab đang mở.
 */
import { describe, expect, it } from 'vitest';
import { createMemoryStore, handleStateRequest } from '../../../api/state';
import { isChunkLoadError } from '../../app/chunkReload';
import { createSeedState } from '../../data/seed';
import { capNotifications, NOTIFICATIONS_PER_USER } from '../../domain/notifications';
import { DEFAULT_PARAMS } from '../../domain/params';
import type { AppNotification, DemoState } from '../../domain/types';
import { pollEvery } from '../AppDataContext';
import { emergencyReset } from '../emergencyReset';
import { normalizeState } from '../normalize';

const seed = () => createSeedState(new Date(2026, 9, 18, 9, 0));

function fetchFor(store: ReturnType<typeof createMemoryStore>) {
  return (async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://demo.local');
    const r = await handleStateRequest({ method: init?.method ?? 'GET', query: Object.fromEntries(url.searchParams), body: init?.body as string | undefined }, store);
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
}

describe('Chuẩn hoá dữ liệu đọc vào', () => {
  it('dữ liệu đúng dạng giữ nguyên; không phải dữ liệu demo thì trả null', () => {
    const s = seed();
    expect(normalizeState(s, seed)).toEqual(s);
    expect(normalizeState(null, seed)).toBeNull();
    expect(normalizeState({ users: [] }, seed)).toBeNull();
  });

  it('dữ liệu lưu từ bản cũ thiếu trường thì được bù; bản ghi hỏng bị bỏ', () => {
    const s = seed() as unknown as Record<string, unknown>;
    const order = { ...(s.orders as Record<string, unknown>[])[0] };
    delete order.deliveryLog;
    delete order.statusHistory;
    order.params = { depositPercent: 40 };
    const broken = { id: 'DH-hong', status: 'shipping' }; // thiếu tiền, địa chỉ
    const raw = {
      ...s,
      orders: [order, broken],
      reviews: undefined,
      wards: 'sai dạng',
      params: { depositPercent: 30 },
      notifications: [{ id: 'TB-1', userId: 'u-kh1', title: 'a', body: '', at: '', read: false }, { id: 'TB-2' }, 'rác'],
      carts: { 'cust-1': 'sai dạng' },
    };
    const n = normalizeState(raw, seed) as DemoState;
    expect(n.orders.map((o) => o.id)).toEqual([order.id]);
    expect(n.orders[0].deliveryLog).toEqual([]);
    expect(n.orders[0].statusHistory).toEqual([]);
    expect(n.orders[0].params).toEqual({ ...DEFAULT_PARAMS, depositPercent: 40 });
    expect(n.reviews).toEqual([]);
    expect(n.wards).toEqual(seed().wards);
    expect(n.params).toEqual(DEFAULT_PARAMS);
    expect(n.notifications.map((x) => x.id)).toEqual(['TB-1']);
    expect(n.carts['cust-1']).toEqual([]);
  });
});

describe('Dữ liệu dùng chung không tăng mãi', () => {
  it(`mỗi tài khoản giữ ${NOTIFICATIONS_PER_USER} thông báo mới nhất`, () => {
    const make = (userId: string, i: number): AppNotification => ({ id: `${userId}-${i}`, userId, at: '', title: '', body: '', read: false });
    const list = [...Array.from({ length: 50 }, (_, i) => make('a', i)), ...Array.from({ length: 3 }, (_, i) => make('b', i))];
    const capped = capNotifications(list);
    expect(capped.filter((n) => n.userId === 'a').map((n) => n.id)).toEqual(Array.from({ length: NOTIFICATIONS_PER_USER }, (_, i) => `a-${i}`));
    expect(capped.filter((n) => n.userId === 'b')).toHaveLength(3);
  });

  it('lâu không thao tác thì hỏi máy chủ thưa hơn', () => {
    expect(pollEvery(30_000)).toBe(1);
    expect(pollEvery(5 * 60_000)).toBe(3);
    expect(pollEvery(20 * 60_000)).toBe(6);
  });
});

describe('Lối thoát khi app lỗi lúc mở', () => {
  it('chỉ Quản trị gốc / Admin – Vận hành, đúng OTP; ghi dữ liệu mẫu lên API kèm nhật ký', async () => {
    const store = createMemoryStore();
    const fetch = fetchFor(store);
    await handleStateRequest({ method: 'PUT', body: { baseVersion: 0, schema: 4, data: { users: [], products: [], orders: [], coops: [], customers: [], hong: true } } }, store);
    expect(await emergencyReset('0900000001', '123456', fetch)).toEqual({ ok: false, error: 'Chỉ Quản trị gốc hoặc Admin – Vận hành khôi phục được dữ liệu mẫu.' });
    expect(await emergencyReset('0900000209', '000000', fetch)).toEqual({ ok: false, error: 'Mã OTP không đúng.' });
    expect(await emergencyReset('0900 000 209', '123456', fetch)).toEqual({ ok: true, value: 'shared' });
    const saved = (await store.read()).data as DemoState;
    expect(saved.users.length).toBe(seed().users.length);
    expect(saved.auditLogs[0]).toMatchObject({ action: 'Khôi phục dữ liệu mẫu', actor: { name: 'Quản trị gốc (mẫu)' } });
    // Không có API (bản tĩnh) thì chỉ xoá dữ liệu trên máy.
    expect(await emergencyReset('0900000201', '123456', (async () => new Response('{}', { status: 503 })) as typeof fetch)).toEqual({ ok: true, value: 'local' });
  });
});

describe('Deploy bản mới khi tab đang mở', () => {
  it('nhận ra lỗi không tải được mã của màn', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/AdminScreen-abc.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error("Cannot read properties of undefined (reading 'map')"))).toBe(false);
  });
});
