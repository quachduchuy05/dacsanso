/**
 * Dữ liệu mẫu và nội dung cấm (Giai đoạn 5, mục 9).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deliveryWindow } from '../../domain/cart';
import { DEFAULT_PARAMS } from '../../domain/params';
import { addMs, DAY_MS, isSamplePrice, regionsOf, toDateKey } from '../../domain/state';
import { T0 } from '../../domain/__tests__/fixtures';
import { createSeedState, DEMO_USERS } from '../seed';

const seed = createSeedState(T0);
const byId = (id: string) => seed.products.find((p) => p.id === id)!;

describe('Danh mục mẫu của nhóm (mục 9.3)', () => {
  it('đúng 9 sản phẩm trong bảng, đúng loại đơn và nhóm hàng', () => {
    const rows = seed.products.filter((p) => !p.variantOf).map((p) => [p.name, p.kind, p.category]);
    expect(rows).toEqual([
      ['Chè Shan tuyết', 'ready', 'dry'],
      ['Thảo quả khô', 'ready', 'dry'],
      ['Mứt / ô mai mận tam hoa', 'ready', 'processed'],
      ['Mật ong Thanh Xuân', 'ready', 'processed'],
      ['Gạo Séng Cù', 'ready', 'dry'],
      ['Phở hồng Bắc Hà', 'ready', 'processed'],
      ['Mận tam hoa tươi', 'preorder', 'fresh'],
      ['Cốm Tú Lệ', 'preorder', 'processed'],
      ['Bưởi Đại Minh', 'preorder', 'fresh'],
    ]);
  });

  it('quy cách mẫu: mứt mận thêm hộp 500 g, gạo thêm túi 5 kg; cùng tên, HTX, nhóm hàng, loại đơn với sản phẩm gốc', () => {
    const variants = seed.products.filter((p) => p.variantOf);
    expect(variants.map((p) => [p.variantOf, p.unit])).toEqual([
      ['prod-mutman', 'hộp 500 g'],
      ['prod-gao', 'túi 5 kg'],
    ]);
    for (const v of variants) {
      const base = byId(v.variantOf!);
      expect(base.variantOf, v.id).toBeUndefined();
      for (const k of ['name', 'coopId', 'category', 'kind', 'region', 'description'] as const) expect(v[k], `${v.id}.${k}`).toEqual(base[k]);
    }
  });

  it('giá mẫu nằm trong khoảng giá bán lẻ Hà Nội nhóm khảo sát (quy về đ/kg hoặc đ/lít)', () => {
    const ranges: [string, number, number, number][] = [
      // [mã, số kg hoặc lít mỗi đơn vị bán, giá thấp, giá cao]
      ['prod-che', 0.1, 400_000, 1_500_000],
      ['prod-thaoqua', 0.2, 250_000, 450_000],
      ['prod-mutman', 0.3, 350_000, 550_000],
      ['prod-mutman-500', 0.5, 350_000, 550_000],
      ['prod-matong', 0.5, 250_000, 450_000],
      ['prod-gao', 2, 45_000, 70_000],
      ['prod-gao-5kg', 5, 45_000, 70_000],
      ['prod-phohong', 0.5, 120_000, 140_000],
      ['prod-man', 3, 50_000, 90_000],
    ];
    for (const [id, size, low, high] of ranges) {
      const perUnit = byId(id).price / size;
      expect(perUnit, id).toBeGreaterThanOrEqual(low);
      expect(perUnit, id).toBeLessThanOrEqual(high);
      expect(byId(id).sample?.surveyedPrice, id).toBeTruthy();
      expect(isSamplePrice(byId(id)), id).toBe(false);
    }
    // Chưa có giá khảo sát: hiện "giá mẫu".
    expect(isSamplePrice(byId('prod-com'))).toBe(true);
    expect(isSamplePrice(byId('prod-buoi'))).toBe(true);
  });

  it('mọi sản phẩm là dữ liệu mẫu, không có ảnh ngoài, không có mã chứng nhận', () => {
    for (const p of seed.products) {
      expect(p.sample, p.id).toBeDefined();
      expect(p.image, p.id).toBeUndefined();
      expect(p.certifications ?? [], p.id).toEqual([]);
    }
  });

  it('chỉ Bưởi Đại Minh ghi OCOP, kèm "theo hồ sơ nhóm, chờ xác minh"', () => {
    const withOcop = seed.products.filter((p) => JSON.stringify(p).includes('OCOP'));
    expect(withOcop.map((p) => p.id)).toEqual(['prod-buoi']);
    expect(byId('prod-buoi').sample?.dossierNote).toContain('theo hồ sơ nhóm, chờ xác minh');
  });

  it('không có tên, cụm từ hay sản phẩm nhóm đã loại', () => {
    const text = JSON.stringify(seed.products).toLowerCase();
    for (const banned of ['thảo quả rừng', 'mật bản địa', 'séng cù xanh', 'bạc hà', 'đào sa pa', 'cá hồi', 'cá tầm', 'gác bếp', 'rượu', 'http']) {
      expect(text, banned).not.toContain(banned);
    }
  });

  it('mận tam hoa giao mẫu tháng 05–06/2027; cốm và bưởi lấy mốc giao từ PAR-08', () => {
    expect(byId('prod-man').preorder).toMatchObject({ deliveryFrom: '2027-05-01', deliveryTo: '2027-06-30' });
    const earliest = toDateKey(addMs(T0, DEFAULT_PARAMS.preorderMinLeadDays * DAY_MS));
    expect(byId('prod-com').preorder?.deliveryFrom).toBe(earliest);
    for (const id of ['prod-man', 'prod-com', 'prod-buoi']) {
      expect(byId(id).sample?.deliveryWindowIsSample, id).toBe(true);
      expect(deliveryWindow(byId(id), T0, DEFAULT_PARAMS), id).not.toBeNull();
    }
  });

  it('bộ lọc vùng tách sản phẩm ghi nhiều địa danh', () => {
    expect(regionsOf(byId('prod-thaoqua'))).toEqual(['Sa Pa', 'Bát Xát']);
    expect(regionsOf(byId('prod-gao'))).toEqual(['Mường Khương', 'Bát Xát']);
  });
});

describe('HTX, tài khoản và đơn mẫu', () => {
  it('mỗi sản phẩm thuộc một "HTX mẫu …" có tài khoản demo', () => {
    for (const p of seed.products) {
      const coop = seed.coops.find((c) => c.id === p.coopId);
      expect(coop?.name, p.id).toMatch(/^HTX mẫu /);
      expect(DEMO_USERS.some((u) => u.role === 'coop' && u.coopId === p.coopId), p.id).toBe(true);
    }
  });

  it('SĐT rõ ràng là giả, tài khoản nhận tiền đã che (mục 9.5)', () => {
    for (const u of seed.users) expect(u.phone).toMatch(/^0900000\d{3}$/);
    for (const c of seed.coops) expect(c.payoutAccountMasked).toMatch(/^\*\*\*\* \d{4}$/);
    // Mỗi HTX mẫu có 2 SĐT liên hệ khác nhau, cũng rõ ràng là giả.
    for (const c of seed.coops) {
      expect(c.phones, c.id).toHaveLength(2);
      expect(new Set(c.phones).size, c.id).toBe(2);
      for (const p of c.phones!) expect(p).toMatch(/^0900000\d{3}$/);
    }
  });

  it('2 đơn mẫu: 1 đã giao, 1 đã thanh toán mô phỏng đang chờ HTX xác nhận', () => {
    expect(seed.orders.map((o) => o.status).sort()).toEqual(['awaiting_confirmation', 'delivered']);
  });
});

describe('Không còn nội dung cấm trong src (mục 9.1)', () => {
  const BANNED = [
    'CQQLNN bảo chứng',
    'CQQLNN tài trợ',
    'chữ ký số',
    'GS1',
    'EPCIS',
    'Blockchain',
    'OCOP 5 Sao',
    'Quỹ xúc tiến',
    'đạt chuẩn xuất xưởng',
    'Giá mùa vụ ưu đãi',
    'Đã bán',
    'Khau Phạ',
    'cảm biến',
    'Bluetooth',
    'biển số',
    'nhà xe',
    'Hoả tốc 2H',
    'Hỏa tốc 2H',
    'bữa tối',
    'unsplash',
    'certLabel',
  ];
  const root = join(import.meta.dirname, '..', '..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name !== '__tests__') walk(full);
      } else if (/\.(tsx?|css|md)$/.test(name)) files.push(full);
    }
  };
  walk(root);

  it('quét được mã nguồn', () => expect(files.length).toBeGreaterThan(50));
  it.each(BANNED)('không có "%s"', (phrase) => {
    const hits = files.filter((f) => readFileSync(f, 'utf8').toLowerCase().includes(phrase.toLowerCase()));
    expect(hits).toEqual([]);
  });
});
