/**
 * API dữ liệu dùng chung /api/state (api/state.ts), chạy với kho trong bộ nhớ.
 */
import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { createMemoryStore, createRedisStore, decodePayload, encodePayload, handleStateRequest, redisConfigFromEnv, STATE_LIMIT_BYTES, storeErrorBody, storeFromEnv } from '../../../api/state';

const demo = (extra: Record<string, unknown> = {}) => ({ users: [], products: [], orders: [], coops: [], customers: [], ...extra });

describe('/api/state', () => {
  it('chưa có dữ liệu thì GET trả data = null, phiên bản 0', async () => {
    const r = await handleStateRequest({ method: 'GET' }, createMemoryStore());
    expect(r).toEqual({ status: 200, body: { changed: true, version: 0, schema: null, data: null, updatedAt: null } });
  });

  it('PUT đúng phiên bản thì ghi và tăng phiên bản; GET ?since= cùng phiên bản báo không đổi', async () => {
    const store = createMemoryStore();
    const put = await handleStateRequest({ method: 'PUT', body: { baseVersion: 0, schema: 4, data: demo({ note: 'a' }) } }, store);
    expect(put).toEqual({ status: 200, body: { version: 1 } });
    expect((await handleStateRequest({ method: 'GET', query: { since: '1' } }, store)).body).toEqual({ changed: false, version: 1 });
    const full = await handleStateRequest({ method: 'GET', query: { since: '0' } }, store);
    expect(full.body).toMatchObject({ changed: true, version: 1, schema: 4, data: demo({ note: 'a' }) });
  });

  it('PUT sai phiên bản (máy khác vừa ghi) thì 409 kèm dữ liệu mới nhất, không ghi đè', async () => {
    const store = createMemoryStore();
    await handleStateRequest({ method: 'PUT', body: { baseVersion: 0, schema: 4, data: demo({ note: 'máy A' }) } }, store);
    const late = await handleStateRequest({ method: 'PUT', body: { baseVersion: 0, schema: 4, data: demo({ note: 'máy B' }) } }, store);
    expect(late.status).toBe(409);
    expect(late.body).toMatchObject({ version: 1, data: demo({ note: 'máy A' }) });
    expect((await store.read()).data).toEqual(demo({ note: 'máy A' }));
  });

  it('nhận body dạng chuỗi JSON (server dev của Vite)', async () => {
    const r = await handleStateRequest({ method: 'PUT', body: JSON.stringify({ baseVersion: 0, schema: 4, data: demo() }) }, createMemoryStore());
    expect(r.status).toBe(200);
  });

  it('từ chối dữ liệu sai dạng, thiếu phiên bản, quá lớn và phương thức khác', async () => {
    const store = createMemoryStore();
    expect((await handleStateRequest({ method: 'PUT', body: 'không phải json' }, store)).status).toBe(400);
    expect((await handleStateRequest({ method: 'PUT', body: { baseVersion: -1, schema: 4, data: demo() } }, store)).status).toBe(400);
    expect((await handleStateRequest({ method: 'PUT', body: { baseVersion: 0, data: demo() } }, store)).status).toBe(400);
    expect((await handleStateRequest({ method: 'PUT', body: { baseVersion: 0, schema: 4, data: { users: [] } } }, store)).status).toBe(400);
    // Dữ liệu không nén được (như ảnh) vượt giới hạn sau khi nén thì từ chối, kèm hướng dẫn khôi phục.
    const noise = randomBytes(STATE_LIMIT_BYTES).toString('base64');
    const big = await handleStateRequest({ method: 'PUT', body: { baseVersion: 0, schema: 4, data: demo({ blob: noise }) } }, store);
    expect(big.status).toBe(413);
    expect(big.body.error).toMatch(/Khôi phục dữ liệu mẫu/);
    expect((await handleStateRequest({ method: 'POST' }, store)).status).toBe(405);
    expect(await store.version()).toBe(0);
  });

  it('lưu dạng nén: dữ liệu chữ lớn hơn giới hạn vẫn lưu được; đọc được cả bản ghi cũ chưa nén', async () => {
    const store = createMemoryStore();
    const notes = Array.from({ length: 9000 }, (_, i) => ({ id: `TB-${i}`, userId: 'u-kh1', title: `Đơn DH-20261018-${i}: Đã giao`, body: 'HTX mẫu Bắc Hà · Đơn đã giao tới bạn.' }));
    const data = demo({ notifications: notes });
    expect(JSON.stringify(data).length).toBeGreaterThan(STATE_LIMIT_BYTES);
    const saved = await handleStateRequest({ method: 'PUT', body: { baseVersion: 0, schema: 4, data } }, store);
    expect(saved.status).toBe(200);
    const read = await handleStateRequest({ method: 'GET' }, store);
    expect((read.body.data as { notifications: unknown[] }).notifications).toHaveLength(9000);
    const plain = JSON.stringify({ schema: 4, data: demo(), updatedAt: '2026-10-01T00:00:00Z' });
    expect(decodePayload(plain)).toBe(plain);
    expect(decodePayload(encodePayload(plain))).toBe(plain);
  });

  it('Upstash từ chối vì hết lượt thì báo rõ cho chủ repo', () => {
    expect(storeErrorBody(new Error('ERR max requests limit exceeded. Limit: 500000, Usage: 500000'))).toMatchObject({ quota: true, error: expect.stringContaining('vượt giới hạn') });
    expect(storeErrorBody(new Error('fetch failed'))).toMatchObject({ quota: false, error: 'Không đọc hoặc ghi được cơ sở dữ liệu demo.' });
  });

  it('không có biến môi trường cơ sở dữ liệu thì không tạo kho (hàm Vercel trả 503)', () => {
    expect(storeFromEnv({})).toBeNull();
    expect(storeFromEnv({ KV_REST_API_URL: 'https://x.upstash.io', KV_REST_API_TOKEN: 't' })).not.toBeNull();
    expect(storeFromEnv({ UPSTASH_REDIS_REST_URL: 'https://x.upstash.io', UPSTASH_REDIS_REST_TOKEN: 't' })).not.toBeNull();
    // Nối Upstash có đặt tiền tố riêng; thiếu token thì bỏ qua cặp đó.
    expect(redisConfigFromEnv({ DACSAN_REST_API_URL: 'https://p.upstash.io', DACSAN_REST_API_TOKEN: 'p', KV_REST_API_URL: 'https://k.upstash.io' })).toEqual({
      url: 'https://p.upstash.io',
      token: 'p',
    });
    expect(redisConfigFromEnv({ KV_REST_API_URL: 'https://k.upstash.io', KV_REST_API_TOKEN: 'k', DACSAN_REST_API_URL: 'https://p.upstash.io', DACSAN_REST_API_TOKEN: 'p' })?.url).toBe(
      'https://k.upstash.io',
    );
    expect(redisConfigFromEnv({ DACSAN_REST_API_URL: 'https://p.upstash.io' })).toBeNull();
  });

  it('kho Redis: đọc/ghi đúng khoá, ghi qua lệnh so phiên bản', async () => {
    const kv = new Map<string, string>();
    const fake = {
      get: async (k: string) => kv.get(k) ?? null,
      mget: async (...keys: string[]) => keys.map((k) => kv.get(k) ?? null),
      eval: async (_script: string, keys: string[], args: string[]) => {
        const current = Number(kv.get(keys[0]) ?? 0);
        if (current !== Number(args[0])) return [0, current];
        kv.set(keys[1], args[1]);
        kv.set(keys[0], String(current + 1));
        return [1, current + 1];
      },
    };
    const store = createRedisStore(fake as never);
    expect(await store.write(0, JSON.stringify({ schema: 4, data: demo(), updatedAt: 'x' }))).toEqual({ ok: true, version: 1 });
    expect(await store.write(0, 'khác')).toEqual({ ok: false, version: 1 });
    expect([...kv.keys()].sort()).toEqual(['dacsan-demo:state', 'dacsan-demo:version']);
    expect(await store.read()).toMatchObject({ version: 1, schema: 4, data: demo() });
  });
});
