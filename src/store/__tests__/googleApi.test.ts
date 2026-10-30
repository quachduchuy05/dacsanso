// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { handleGoogleAuthRequest, hashGoogleSub, maskEmail } from '../../../api/auth/google';
import { handleGeocodeRequest, parseGoogleResults } from '../../../api/geocode';

const json = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('/api/geocode (Google Maps)', () => {
  const sample = {
    status: 'OK',
    results: [
      {
        formatted_address: '18 Ngõ 42 Trần Duy Hưng, Trung Hoà, Cầu Giấy, Hà Nội, Việt Nam',
        types: ['street_address'],
        address_components: [
          { long_name: '18', types: ['street_number'] },
          { long_name: 'Ngõ 42 Trần Duy Hưng', types: ['route'] },
          { long_name: 'Trung Hoà', types: ['sublocality_level_1', 'sublocality', 'political'] },
          { long_name: 'Cầu Giấy', types: ['administrative_area_level_2', 'political'] },
          { long_name: 'Hà Nội', types: ['administrative_area_level_1', 'political'] },
          { long_name: 'Việt Nam', types: ['country', 'political'] },
        ],
      },
    ],
  };

  it('kiểm tra phương thức, toạ độ, khung Hà Nội và khoá trước khi gọi Google', async () => {
    let calls = 0;
    const fetch = async () => {
      calls += 1;
      return json(200, sample);
    };
    expect((await handleGeocodeRequest({ method: 'POST' }, { apiKey: 'k', fetch })).status).toBe(405);
    expect((await handleGeocodeRequest({ method: 'GET', query: { lat: 'x', lng: '105.8' } }, { apiKey: 'k', fetch })).status).toBe(400);
    // TP. Hồ Chí Minh: ngoài Hà Nội
    expect(await handleGeocodeRequest({ method: 'GET', query: { lat: '10.77', lng: '106.70' } }, { apiKey: 'k', fetch })).toMatchObject({ status: 422, body: { outside: true } });
    expect(await handleGeocodeRequest({ method: 'GET', query: { lat: '21.0', lng: '105.8' } }, { fetch })).toMatchObject({ status: 503, body: { configured: false } });
    expect(calls).toBe(0);
  });

  it('đọc kết quả Google: số nhà + đường, các tên khu vực, thành phố; cho CDN giữ kết quả', async () => {
    let url = '';
    const r = await handleGeocodeRequest(
      { method: 'GET', query: { lat: '21.0075', lng: '105.8' } },
      {
        apiKey: 'khoa bi mat',
        fetch: async (u) => {
          url = u;
          return json(200, sample);
        },
      },
    );
    expect(url).toContain('latlng=21.007500,105.800000');
    expect(url).toContain('language=vi');
    expect(url).toContain('key=khoa%20bi%20mat');
    expect(r).toEqual({
      status: 200,
      cacheable: true,
      body: { formattedAddress: sample.results[0].formatted_address, street: '18 Ngõ 42 Trần Duy Hưng', areas: ['Trung Hoà', 'Cầu Giấy'], city: 'Hà Nội' },
    });
    // Khoá không lọt ra kết quả trả cho trình duyệt.
    expect(JSON.stringify(r.body)).not.toContain('khoa');
  });

  it('báo lỗi theo trạng thái của Google và giới hạn lượt mỗi ngày', async () => {
    const q = { method: 'GET', query: { lat: '21.0', lng: '105.8' } };
    expect((await handleGeocodeRequest(q, { apiKey: 'k', fetch: async () => json(200, { status: 'ZERO_RESULTS', results: [] }) })).status).toBe(404);
    expect((await handleGeocodeRequest(q, { apiKey: 'k', fetch: async () => json(200, { status: 'OVER_QUERY_LIMIT' }) })).status).toBe(429);
    const original = console.error;
    console.error = () => {};
    expect((await handleGeocodeRequest(q, { apiKey: 'k', fetch: async () => json(200, { status: 'REQUEST_DENIED', error_message: 'billing' }) })).status).toBe(502);
    console.error = original;
    let used = 0;
    const deps = { apiKey: 'k', fetch: async () => json(200, sample), countToday: async () => ++used, dailyLimit: 2 };
    expect((await handleGeocodeRequest(q, deps)).status).toBe(200);
    expect((await handleGeocodeRequest(q, deps)).status).toBe(200);
    expect((await handleGeocodeRequest(q, deps)).status).toBe(429);
    // Bộ đếm lỗi thì vẫn tra.
    expect((await handleGeocodeRequest(q, { ...deps, countToday: async () => Promise.reject(new Error('redis')) })).status).toBe(200);
  });

  it('không có số nhà thì street rỗng; không có kết quả thì null', () => {
    expect(parseGoogleResults([])).toBeNull();
    expect(
      parseGoogleResults([
        { formatted_address: 'Thanh Xuân, Hà Nội', types: ['political'], address_components: [{ long_name: 'Thanh Xuân', types: ['administrative_area_level_2'] }] },
      ]),
    ).toEqual({ formattedAddress: 'Thanh Xuân, Hà Nội', street: '', areas: ['Thanh Xuân'], city: '' });
  });

  it('?status=1 chỉ cho biết đã có khoá hay chưa: không gọi Google, không tính lượt, không trả khoá', async () => {
    let calls = 0;
    const deps = { fetch: async () => (calls++, json(200, sample)), countToday: async () => (calls++, 1) };
    expect(await handleGeocodeRequest({ method: 'GET', query: { status: '1' } }, deps)).toEqual({ status: 200, body: { configured: false } });
    const r = await handleGeocodeRequest({ method: 'GET', query: { status: '1' } }, { ...deps, apiKey: 'secret-key' });
    expect(r).toEqual({ status: 200, body: { configured: true } });
    expect(JSON.stringify(r)).not.toContain('secret-key');
    expect(calls).toBe(0);
  });
});

describe('/api/auth/google', () => {
  const CLIENT = 'abc.apps.googleusercontent.com';
  const credential = 'x'.repeat(40);
  const claims = { aud: CLIENT, iss: 'https://accounts.google.com', sub: '1234567890', email: 'HoangTa@gmail.com', email_verified: 'true', name: 'Hoàng Tạ', exp: '2000000000' };
  const post = (body: unknown) => ({ method: 'POST', body });
  const now = () => 1_900_000_000_000;

  it('xác minh token với Google rồi trả mã đã băm, tên, email đã che', async () => {
    let url = '';
    const r = await handleGoogleAuthRequest(post({ credential }), {
      clientId: CLIENT,
      now,
      fetch: async (u) => {
        url = u;
        return json(200, claims);
      },
    });
    expect(url).toBe(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    expect(r).toEqual({ status: 200, body: { id: hashGoogleSub('1234567890'), name: 'Hoàng Tạ', emailMasked: 'ho•••@gmail.com' } });
    expect(JSON.stringify(r.body)).not.toContain('1234567890');
    expect(JSON.stringify(r.body)).not.toContain('hoangta@');
    // Body dạng chuỗi (máy chủ dev của Vite) cũng nhận.
    expect((await handleGoogleAuthRequest(post(JSON.stringify({ credential })), { clientId: CLIENT, now, fetch: async () => json(200, claims) })).status).toBe(200);
  });

  it('từ chối token sai Client ID, sai nơi phát hành, hết hạn, email chưa xác minh, Google báo lỗi', async () => {
    const check = async (patch: Record<string, unknown>, status = 200) =>
      (await handleGoogleAuthRequest(post({ credential }), { clientId: CLIENT, now, fetch: async () => json(status, { ...claims, ...patch }) })).status;
    expect(await check({ aud: 'ung-dung-khac' })).toBe(401);
    expect(await check({ iss: 'https://evil.example' })).toBe(401);
    expect(await check({ exp: '1800000000' })).toBe(401);
    expect(await check({ exp: undefined })).toBe(401);
    expect(await check({ exp: 'invalid' })).toBe(401);
    expect(await check({ email_verified: 'false' })).toBe(401);
    expect(await check({}, 400)).toBe(401);
  });

  it('báo lỗi dịch vụ rõ ràng khi không kết nối Google, hết thời gian hoặc Google quá tải',async()=>{
    for(const error of [new TypeError('fetch failed'),new Error('timeout')]){
      const result=await handleGoogleAuthRequest(post({credential}),{clientId:CLIENT,fetch:async()=>{throw error;}});
      expect(result.status).toBe(503);expect(String(result.body.error)).toContain('kết nối được Google');
      expect(JSON.stringify(result)).not.toContain(credential);
    }
    for(const status of [429,500,503])expect((await handleGoogleAuthRequest(post({credential}),{clientId:CLIENT,fetch:async()=>json(status,{})})).status).toBe(503);
  });

  it('thiếu cấu hình, thiếu token, sai phương thức', async () => {
    const fetch = async () => json(200, claims);
    expect(await handleGoogleAuthRequest(post({ credential }), { fetch })).toMatchObject({ status: 503, body: { configured: false } });
    expect((await handleGoogleAuthRequest(post({}), { clientId: CLIENT, fetch })).status).toBe(400);
    expect((await handleGoogleAuthRequest(post('không phải json'), { clientId: CLIENT, fetch })).status).toBe(400);
    expect((await handleGoogleAuthRequest({ method: 'GET' }, { clientId: CLIENT, fetch })).status).toBe(405);
  });

  it('che email', () => {
    expect(maskEmail('a@gmail.com')).toBe('a•••@gmail.com');
    expect(maskEmail('khong-hop-le')).toBe('');
  });
});
