/**
 * Quy ước giao diện (Giai đoạn 6, mục 10) kiểm bằng cách đọc mã nguồn.
 * Tương phản AA, vùng bấm 44×44 và cỡ chữ thực tế được kiểm trên trình duyệt (xem docs/FIX_REPORT.md).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const sources: { path: string; text: string }[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== '__tests__') walk(full);
    } else if (/\.tsx?$/.test(name)) sources.push({ path: full.slice(root.length + 1), text: readFileSync(full, 'utf8') });
  }
};
walk(join(root, 'src'));
const offenders = (re: RegExp) => sources.filter((f) => re.test(f.text)).map((f) => f.path.replace(/\\/g, '/'));

describe('Giao diện (mục 10)', () => {
  it('bảng màu khai báo thành token trong theme Tailwind', () => {
    const css = read('src/index.css');
    expect(css).toContain('@theme');
    expect(css).toMatch(/--color-forest-800:\s*#1F4D3A/i);
    expect(css).toMatch(/--color-champagne-400:\s*#C9A96E/i);
    expect(css).toMatch(/--color-ivory:\s*#FAF7F0/i);
    expect(css).toMatch(/--color-ink:\s*#1C1B18/i);
  });

  it('không còn màu cam kiểu Shopee, nhãn "Chính hãng", hay bảng màu cũ', () => {
    expect(offenders(/#EE4D2D/i)).toEqual([]);
    expect(offenders(/Chính hãng/i)).toEqual([]);
    expect(read('index.html')).not.toMatch(/Chính hãng/i);
    expect(offenders(/\b(emerald|amber|orange)-\d+/)).toEqual([]);
  });

  it('không có chữ nhỏ hơn 12px', () => {
    expect(offenders(/text-\[(\d|1[01])(\.\d+)?px\]/)).toEqual([]);
    expect(offenders(/fontSize:\s*['"]?(\d|1[01])px/)).toEqual([]);
  });

  it('người dùng phóng to và chọn chữ được', () => {
    const html = read('index.html');
    expect(html).not.toMatch(/user-scalable\s*=\s*no/);
    expect(html).not.toMatch(/maximum-scale/);
    expect(offenders(/\bselect-none\b/)).toEqual([]);
    expect(read('src/index.css')).not.toMatch(/user-select:\s*none/);
    // Vùng vuốt ngang chỉ nhận cuộn dọc thì vẫn phải cho phóng to bằng hai ngón.
    expect(offenders(/touchAction:\s*['"]pan-[xy]['"]/)).toEqual([]);
    expect(read('src/index.css')).not.toMatch(/touch-action:\s*(pan-[xy]|none)\s*;/);
  });

  it('không dùng hộp thoại của trình duyệt (bị chặn khi app chạy trong khung nhúng)', () => {
    // Bỏ chú thích rồi tìm lời gọi confirm(), alert(), prompt() (không tính phương thức trùng tên như x.prompt()).
    const calls = sources
      .filter((f) => /(^|[^\w.])(window\.)?(confirm|alert|prompt)\(/m.test(f.text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')))
      .map((f) => f.path);
    expect(calls).toEqual([]);
  });

  it('SĐT, địa chỉ của HTX không công khai: màn của khách và QLNN không dùng tới (chỉ Admin liên hệ HTX)', () => {
    const phoneUse = offenders(/coopPhonesOf|coopAddressOf|listCoopContacts|CoopCallLinks|\.phones\b|\.storeAddress\b/);
    expect(phoneUse.filter((f) => /src\/screens\/(customer|regulator)\//.test(f) || f.startsWith('src/app/'))).toEqual([]);
  });

  it('effect không trả về giá trị của lời gọi hàm (chỉ được trả về hàm dọn dẹp)', () => {
    // useEffect(() => window.scrollTo(...)) trả về kết quả của scrollTo; Chrome mới trả về Promise, React gọi nó như hàm
    // dọn dẹp khi đổi tab / đổi tài khoản → "… is not a function" (lỗi bản web 18/10/2026). Thân hàm phải trong { } hoặc là () => () => …
    expect(offenders(/use(Layout)?Effect\(\s*\(\)\s*=>\s*(?![\s{]|\(\)\s*=>)/)).toEqual([]);
  });

  it('mọi sheet dùng chung BottomSheet', () => {
    expect(offenders(/role="dialog"/)).toEqual(['src/components/BottomSheet.tsx']);
  });
});
