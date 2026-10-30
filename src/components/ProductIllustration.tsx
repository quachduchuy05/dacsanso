import type { ReactNode } from 'react';
import type { Category, Product } from '../domain/types';

/**
 * Tranh minh hoạ sản phẩm vẽ bằng SVG (chủ repo yêu cầu thay ảnh giữ chỗ chữ).
 * Đây là hình vẽ, không phải ảnh chụp sản phẩm thật, nên không vướng quyền dùng ảnh (mục 9.4);
 * trang chi tiết ghi rõ "Ảnh minh hoạ". Ảnh HTX tự tải lên vẫn được ưu tiên hiện.
 *
 * Mỗi tranh vẽ trong khung 200×200, vật đặt giữa, mặt đất ở khoảng y = 168.
 */

export type IllustrationKey = 'che' | 'thaoqua' | 'mutman' | 'matong' | 'gao' | 'phohong' | 'man' | 'com' | 'buoi';

const BY_PRODUCT_ID: Record<string, IllustrationKey> = {
  'prod-che': 'che',
  'prod-thaoqua': 'thaoqua',
  'prod-mutman': 'mutman',
  'prod-matong': 'matong',
  'prod-gao': 'gao',
  'prod-phohong': 'phohong',
  'prod-man': 'man',
  'prod-com': 'com',
  'prod-buoi': 'buoi',
};

// Sản phẩm HTX tự tạo: nhận tranh theo tên nếu khớp loại hàng đã có tranh.
const BY_NAME: [RegExp, IllustrationKey][] = [
  [/chè|trà/i, 'che'],
  [/thảo quả/i, 'thaoqua'],
  [/mứt|ô mai/i, 'mutman'],
  [/mật ong/i, 'matong'],
  [/gạo/i, 'gao'],
  [/phở/i, 'phohong'],
  [/mận/i, 'man'],
  [/cốm/i, 'com'],
  [/bưởi/i, 'buoi'],
];

export function illustrationKeyFor(product: Pick<Product, 'id' | 'name'>): IllustrationKey | null {
  return BY_PRODUCT_ID[product.id] ?? BY_NAME.find(([re]) => re.test(product.name))?.[1] ?? null;
}

/** Màu chủ đạo của từng tranh, dùng cho quầng sáng phía sau vật. */
const ACCENT: Record<IllustrationKey, string> = {
  che: '#6B9A5B',
  thaoqua: '#7E3B2B',
  mutman: '#7A2B40',
  matong: '#D99A2B',
  gao: '#C9A96E',
  phohong: '#C96E60',
  man: '#8C2F57',
  com: '#7FAE6A',
  buoi: '#B8BF45',
};

const CATEGORY_ACCENT: Record<Category, string> = { dry: '#C9A96E', processed: '#7A2B40', fresh: '#6B9A5B' };

/** Nền: núi xa và ruộng bậc thang, kéo giãn theo khung. */
export function IllustrationBackdrop() {
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <rect width="320" height="200" fill="#F4ECDD" />
      <path d="M0 118 L38 96 L66 108 L104 80 L146 104 L188 84 L226 106 L268 88 L320 110 L320 200 L0 200 Z" fill="#E7DCC4" />
      <path d="M0 158 Q80 138 160 150 T320 144 L320 200 L0 200 Z" fill="#DCE8DF" />
      <path d="M0 158 Q80 138 160 150 T320 144" fill="none" stroke="#C9A96E" strokeWidth="0.8" opacity="0.6" />
      <path d="M0 178 Q90 160 180 172 T320 166 L320 200 L0 200 Z" fill="#C4DED3" />
      <path d="M0 178 Q90 160 180 172 T320 166" fill="none" stroke="#C9A96E" strokeWidth="0.8" opacity="0.6" />
    </svg>
  );
}

/** Vật minh hoạ, giữ tỉ lệ và nằm giữa khung. Không có tranh riêng thì vẽ hình theo nhóm hàng. */
export function IllustrationSubject({ product, glow = true }: { product: Pick<Product, 'id' | 'name' | 'category'>; glow?: boolean }) {
  const key = illustrationKeyFor(product);
  const accent = key ? ACCENT[key] : CATEGORY_ACCENT[product.category];
  return (
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" aria-hidden="true">
      {glow && <circle cx="100" cy="104" r="72" fill={accent} opacity="0.13" />}
      <ellipse cx="100" cy="170" rx="58" ry="7" fill="#1F4D3A" opacity="0.12" />
      {key ? DRAWINGS[key]() : <CategoryFallback category={product.category} />}
    </svg>
  );
}

/* ---------- Các mảnh vẽ dùng chung ---------- */

function Leaf({ x, y, len, w, rot, fill, vein = '#A9C79B' }: { x: number; y: number; len: number; w: number; rot: number; fill: string; vein?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={`M0 0 C ${w} ${-len * 0.25} ${w * 0.8} ${-len * 0.8} 0 ${-len} C ${-w * 0.8} ${-len * 0.8} ${-w} ${-len * 0.25} 0 0 Z`} fill={fill} />
      <path d={`M0 -2 L0 ${-len * 0.9}`} stroke={vein} strokeWidth="1.2" opacity="0.7" fill="none" />
    </g>
  );
}

function hexPath(cx: number, cy: number, r: number) {
  const pts = Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k + 30);
    return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join(' L')} Z`;
}

/* ---------- Tranh từng sản phẩm ---------- */

const DRAWINGS: Record<IllustrationKey, () => ReactNode> = {
  // Chè Shan tuyết: cành chè, búp phủ lông trắng, chén chè nhỏ.
  che: () => (
    <>
      <path d="M58 166 C78 132 104 100 140 54" fill="none" stroke="#5A4632" strokeWidth="3" strokeLinecap="round" />
      <Leaf x={76} y={136} len={50} w={18} rot={-72} fill="#3E6B3F" />
      <Leaf x={90} y={118} len={54} w={20} rot={42} fill="#5C8C4E" />
      <Leaf x={106} y={98} len={46} w={17} rot={-58} fill="#4E7A44" />
      <Leaf x={120} y={80} len={40} w={15} rot={50} fill="#6B9A5B" />
      <Leaf x={131} y={65} len={30} w={11} rot={-32} fill="#7FAE6A" />
      <g transform="translate(143 46) rotate(32)">
        <ellipse rx="6.5" ry="14" fill="#EEF2EB" stroke="#B9C9B2" strokeWidth="1" />
        <circle cx="-2" cy="-6" r="0.9" fill="#FFFFFF" />
        <circle cx="2" cy="0" r="0.9" fill="#FFFFFF" />
        <circle cx="-1.5" cy="6" r="0.9" fill="#FFFFFF" />
      </g>
      <path d="M128 148 Q130 168 152 170 Q174 168 176 148 Z" fill="#FAF7F0" stroke="#C9A96E" strokeWidth="2" />
      <ellipse cx="152" cy="148" rx="24" ry="6" fill="#F7F0E3" stroke="#C9A96E" strokeWidth="2" />
      <ellipse cx="152" cy="149" rx="19" ry="3.6" fill="#B7A24A" />
    </>
  ),

  // Thảo quả khô: mấy quả thảo quả trên mẹt tre.
  thaoqua: () => (
    <>
      <ellipse cx="100" cy="152" rx="72" ry="18" fill="#E2CFA6" />
      <ellipse cx="100" cy="150" rx="62" ry="13" fill="#D7C092" />
      <path d="M44 150 Q100 166 156 150 M52 144 Q100 158 148 144" fill="none" stroke="#C2A673" strokeWidth="1.2" />
      {[
        { x: 76, y: 124, r: -25, f: '#6E2F25' },
        { x: 100, y: 116, r: 5, f: '#7E3B2B' },
        { x: 124, y: 126, r: 30, f: '#5E281F' },
        { x: 88, y: 138, r: -62, f: '#86422F' },
        { x: 114, y: 140, r: 68, f: '#6A2C22' },
      ].map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.r})`}>
          <ellipse rx="13" ry="24" fill={p.f} />
          <path d="M-6 -20 Q-9 0 -6 20 M0 -23 L0 23 M6 -20 Q9 0 6 20" fill="none" stroke="#A86450" strokeWidth="1.1" opacity="0.75" />
          <path d="M-3 -23 L0 -30 L3 -23 Z" fill="#4A2019" />
          <ellipse cx="-5" cy="-10" rx="2.5" ry="6" fill="#FFFFFF" opacity="0.15" />
        </g>
      ))}
    </>
  ),

  // Mứt / ô mai mận: hũ thuỷ tinh, nắp phủ vải, buộc dây.
  mutman: () => (
    <>
      <rect x="62" y="70" width="76" height="98" rx="16" fill="#F5ECE6" stroke="#C9A96E" strokeWidth="2" />
      <rect x="66" y="96" width="68" height="68" rx="12" fill="#7A2B40" />
      {[
        [80, 120, 8, '#8E3A52'],
        [100, 110, 9, '#6B2238'],
        [119, 128, 8, '#9A4660'],
        [88, 145, 9, '#5E1D31'],
        [113, 150, 8, '#8A3550'],
        [100, 134, 7, '#A35069'],
      ].map(([cx, cy, r, f], i) => (
        <g key={i}>
          <circle cx={cx as number} cy={cy as number} r={r as number} fill={f as string} />
          <circle cx={(cx as number) - 2.5} cy={(cy as number) - 2.5} r={2} fill="#FFFFFF" opacity="0.3" />
        </g>
      ))}
      <rect x="70" y="78" width="6" height="72" rx="3" fill="#FFFFFF" opacity="0.55" />
      <rect x="77" y="104" width="46" height="26" rx="4" fill="#FAF7F0" stroke="#C9A96E" strokeWidth="1.5" />
      <circle cx="100" cy="118" r="5" fill="#7A2B40" />
      <path d="M100 113 Q104 107 109 108 Q105 112 100 113 Z" fill="#4E7A44" />
      <rect x="58" y="56" width="84" height="16" rx="5" fill="#1F4D3A" />
      <path d="M50 62 Q100 40 150 62 L154 76 Q142 71 130 77 Q118 71 106 77 Q94 71 82 77 Q70 71 58 77 Q54 72 46 76 Z" fill="#C9A96E" />
      <path d="M60 64 L140 64 M56 70 L144 70" stroke="#B89451" strokeWidth="1" opacity="0.7" />
      <rect x="56" y="71" width="88" height="3" rx="1.5" fill="#745A2A" />
    </>
  ),

  // Mật ong: chai mật, tổ ong phía sau, que múc mật.
  matong: () => (
    <>
      {[
        [138, 70],
        [156, 80],
        [138, 90],
        [156, 100],
        [120, 60],
      ].map(([cx, cy], i) => (
        <path key={i} d={hexPath(cx, cy, 11)} fill="#F2D896" stroke="#DFCBA4" strokeWidth="1.5" opacity="0.85" />
      ))}
      <rect x="86" y="40" width="28" height="14" rx="3" fill="#1F4D3A" />
      <rect x="88" y="52" width="24" height="20" fill="#E7B451" />
      <path d="M74 82 Q74 72 84 70 L116 70 Q126 72 126 82 L126 160 Q126 168 118 168 L82 168 Q74 168 74 160 Z" fill="#D99A2B" />
      <rect x="81" y="80" width="7" height="80" rx="3.5" fill="#F3C76A" opacity="0.8" />
      <rect x="82" y="104" width="38" height="34" rx="4" fill="#FAF7F0" stroke="#C9A96E" strokeWidth="1.5" />
      <path d={hexPath(101, 121, 8)} fill="none" stroke="#C9A96E" strokeWidth="1.5" />
      <line x1="164" y1="64" x2="140" y2="140" stroke="#A87A4A" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="138" cy="148" rx="9" ry="12" fill="#A87A4A" />
      <path d="M130 144 L146 144 M130 150 L146 150" stroke="#8A6038" strokeWidth="1.5" />
      <path d="M138 160 Q136 164 139 168" stroke="#D99A2B" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="142" cy="169" rx="10" ry="2.6" fill="#D99A2B" />
    </>
  ),

  // Gạo Séng Cù: bao gạo mở miệng, bông lúa, hạt gạo rơi.
  gao: () => (
    <>
      <path d="M150 168 C152 130 158 100 166 70" fill="none" stroke="#B89451" strokeWidth="2.5" strokeLinecap="round" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse key={i} cx={160 + (i % 2 ? 6 : -4) + i * 0.8} cy={78 + i * 9} rx="2.6" ry="5.5" fill="#C9A96E" transform={`rotate(${i % 2 ? 25 : -25} ${160 + (i % 2 ? 6 : -4) + i * 0.8} ${78 + i * 9})`} />
      ))}
      <path d="M58 168 Q52 122 66 94 Q74 82 70 72 Q100 64 130 72 Q126 82 134 94 Q148 122 142 168 Z" fill="#D8C29B" />
      <path d="M62 120 Q100 126 138 120 M60 146 Q100 152 140 146" fill="none" stroke="#C4AB7E" strokeWidth="1.2" />
      <ellipse cx="100" cy="73" rx="32" ry="9" fill="#C9B286" />
      <path d="M70 73 Q100 50 130 73 Z" fill="#FBF8F1" />
      {[
        [88, 66],
        [98, 62],
        [108, 66],
        [94, 70],
        [104, 70],
        [116, 70],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="1.6" ry="3" fill="#E6DCC6" transform={`rotate(${i * 30} ${x} ${y})`} />
      ))}
      <rect x="72" y="110" width="56" height="22" rx="3" fill="#1F4D3A" />
      <line x1="82" y1="121" x2="118" y2="121" stroke="#C9A96E" strokeWidth="2" strokeLinecap="round" />
      {[
        [48, 167],
        [40, 164],
        [154, 168],
        [164, 165],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="2" ry="4" fill="#F7F2E8" stroke="#D9CFB9" strokeWidth="0.8" transform={`rotate(${60 + i * 25} ${x} ${y})`} />
      ))}
    </>
  ),

  // Phở hồng Bắc Hà: nắm phở khô trên mẹt tre, đôi đũa.
  phohong: () => (
    <>
      <line x1="32" y1="98" x2="150" y2="168" stroke="#8A6038" strokeWidth="4" strokeLinecap="round" />
      <line x1="40" y1="92" x2="156" y2="162" stroke="#A87A4A" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="100" cy="152" rx="72" ry="19" fill="#D9C39A" />
      <ellipse cx="100" cy="150" rx="64" ry="14" fill="none" stroke="#B89451" strokeWidth="1.2" />
      <ellipse cx="100" cy="124" rx="46" ry="27" fill="#C96E60" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const y = 104 + i * 6.5;
        const colors = ['#D9897A', '#B5544A', '#E09A8A', '#C2665A'];
        return <path key={i} d={`M58 ${y} Q70 ${y - 6} 82 ${y} T106 ${y} T130 ${y} T144 ${y}`} fill="none" stroke={colors[i % 4]} strokeWidth="2.4" strokeLinecap="round" />;
      })}
      <rect x="95" y="98" width="10" height="52" rx="3" fill="#C9A96E" />
      <rect x="95" y="98" width="3" height="52" fill="#DFCBA4" />
    </>
  ),

  // Mận tam hoa tươi: cành mận, ba quả có lớp phấn.
  man: () => (
    <>
      <path d="M36 70 C78 58 120 70 168 54" fill="none" stroke="#5A4632" strokeWidth="4" strokeLinecap="round" />
      <Leaf x={66} y={64} len={42} w={14} rot={205} fill="#4E7A44" />
      <Leaf x={140} y={62} len={40} w={14} rot={165} fill="#5C8C4E" />
      <Leaf x={156} y={57} len={34} w={12} rot={-25} fill="#6B9A5B" />
      <path d="M88 66 L86 90 M110 68 L114 96 M99 67 L100 124" stroke="#5A4632" strokeWidth="2" fill="none" />
      {[
        [84, 110, 22, '#7A2348'],
        [118, 118, 25, '#8C2F57'],
        [100, 146, 22, '#6B1E40'],
      ].map(([cx, cy, r, f], i) => (
        <g key={i}>
          <circle cx={cx as number} cy={cy as number} r={r as number} fill={f as string} />
          <circle cx={(cx as number) + 3} cy={(cy as number) + 3} r={(r as number) - 4} fill="#FFFFFF" opacity="0.08" />
          <path d={`M${cx} ${(cy as number) - (r as number) + 3} Q${(cx as number) + 6} ${cy} ${cx} ${(cy as number) + (r as number) - 3}`} fill="none" stroke="#4A1230" strokeWidth="1.4" opacity="0.5" />
          <ellipse cx={(cx as number) - (r as number) * 0.4} cy={(cy as number) - (r as number) * 0.45} rx={(r as number) * 0.28} ry={(r as number) * 0.18} fill="#FFFFFF" opacity="0.45" />
        </g>
      ))}
    </>
  ),

  // Cốm Tú Lệ: cốm xanh trên lá sen.
  com: () => {
    const flakes = [
      [70, 128, -20, '#C2D88A'],
      [82, 116, 30, '#93B45C'],
      [96, 106, -10, '#C2D88A'],
      [110, 112, 40, '#A9C46E'],
      [124, 122, -35, '#C2D88A'],
      [134, 132, 15, '#93B45C'],
      [88, 132, 60, '#B5CF7E'],
      [104, 126, -50, '#93B45C'],
      [118, 136, 20, '#B5CF7E'],
      [76, 138, 10, '#93B45C'],
      [100, 96, 25, '#B5CF7E'],
      [112, 100, -30, '#C2D88A'],
      [90, 100, 70, '#93B45C'],
      [128, 140, -15, '#C2D88A'],
      [62, 136, 35, '#B5CF7E'],
    ] as const;
    return (
      <>
        <ellipse cx="100" cy="142" rx="80" ry="34" fill="#4F7F4B" />
        <ellipse cx="100" cy="140" rx="70" ry="27" fill="#5F9157" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
          const a = (Math.PI * 2 * i) / 10;
          return <line key={i} x1="100" y1="140" x2={(100 + 68 * Math.cos(a)).toFixed(1)} y2={(140 + 26 * Math.sin(a)).toFixed(1)} stroke="#7FAE6A" strokeWidth="1.2" opacity="0.7" />;
        })}
        <path d="M24 142 Q100 192 176 142 Q100 166 24 142 Z" fill="#3F6B3D" />
        <path d="M52 140 Q66 94 100 88 Q134 94 148 140 Q100 152 52 140 Z" fill="#A9C46E" />
        {flakes.map(([x, y, r, f], i) => (
          <ellipse key={i} cx={x} cy={y} rx="4.2" ry="2.2" fill={f} transform={`rotate(${r} ${x} ${y})`} />
        ))}
        <path d="M56 148 Q100 120 144 148" fill="none" stroke="#C9A96E" strokeWidth="2" opacity="0.85" />
      </>
    );
  },

  // Bưởi Đại Minh: quả bưởi có lá, một múi bổ sẵn.
  buoi: () => {
    const pores = [
      [74, 104],
      [86, 128],
      [110, 96],
      [120, 132],
      [98, 140],
      [130, 108],
      [80, 146],
      [112, 152],
      [66, 124],
      [104, 116],
    ];
    return (
      <>
        <circle cx="96" cy="114" r="52" fill="#B8BF45" />
        <circle cx="104" cy="122" r="44" fill="#A8AF3C" opacity="0.45" />
        {pores.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.3" fill="#8E952F" opacity="0.6" />
        ))}
        <ellipse cx="78" cy="92" rx="16" ry="11" fill="#E4E58A" opacity="0.7" />
        <rect x="93" y="58" width="6" height="10" rx="2" fill="#5A4632" />
        <Leaf x={95} y={62} len={40} w={14} rot={-42} fill="#3E6B3F" />
        <Leaf x={98} y={62} len={34} w={12} rot={56} fill="#5C8C4E" />
        <path d="M120 168 Q146 126 180 150 Q162 172 120 168 Z" fill="#F6E7C8" stroke="#B8BF45" strokeWidth="4" strokeLinejoin="round" />
        <path d="M126 166 Q150 150 172 152 M132 166 Q152 158 168 160" fill="none" stroke="#E9D3A8" strokeWidth="1.4" />
      </>
    );
  },
};

/** Hình theo nhóm hàng cho sản phẩm chưa có tranh riêng: lá (hàng khô), hũ (chế biến), quả (nông sản tươi). */
function CategoryFallback({ category }: { category: Category }) {
  if (category === 'dry') {
    return (
      <>
        <Leaf x={92} y={160} len={96} w={34} rot={-12} fill="#6B9A5B" />
        <Leaf x={108} y={160} len={74} w={26} rot={28} fill="#4E7A44" />
      </>
    );
  }
  if (category === 'processed') {
    return (
      <>
        <rect x="66" y="76" width="68" height="92" rx="14" fill="#7A2B40" />
        <rect x="60" y="62" width="80" height="16" rx="5" fill="#1F4D3A" />
        <rect x="78" y="108" width="44" height="26" rx="4" fill="#FAF7F0" stroke="#C9A96E" strokeWidth="1.5" />
      </>
    );
  }
  return (
    <>
      <circle cx="100" cy="122" r="44" fill="#8C2F57" />
      <ellipse cx="84" cy="104" rx="10" ry="7" fill="#FFFFFF" opacity="0.4" />
      <Leaf x={100} y={80} len={36} w={13} rot={40} fill="#4E7A44" />
    </>
  );
}
