import type { ReactNode } from 'react';

/**
 * Nhận diện của app: biểu tượng (núi, mặt trời, ruộng bậc thang trong vòng tròn viền vàng),
 * chữ "Đặc Sản Số / Lào Cai", đường trang trí và tiêu đề mục. Chỉ để trang trí, không mang thông tin.
 */
export function BrandEmblem({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={`shrink-0 ${className}`} aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="#173A2C" stroke="#C9A96E" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="19.6" fill="none" stroke="#C9A96E" strokeWidth="0.7" strokeDasharray="0.8 2.4" opacity="0.85" />
      <circle cx="30.5" cy="17.5" r="3.8" fill="#C9A96E" />
      <path d="M8.5 31 L17.5 19 L22.5 25 L28 18 L39.5 31 Z" fill="#37795E" />
      <path d="M8.5 31 L17.5 19 L20.5 23 L15.5 31 Z" fill="#64A68A" opacity="0.55" />
      <path d="M10.5 34.5 Q24 30.5 37.5 34.5" fill="none" stroke="#C9A96E" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M13.5 38 Q24 35 34.5 38" fill="none" stroke="#C9A96E" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

/** Chữ thương hiệu. `tone="dark"`: đặt trên nền tối; `tone="light"`: trên nền sáng. */
export function BrandWordmark({ tone = 'dark', size = 'md' }: { tone?: 'dark' | 'light'; size?: 'md' | 'lg' }) {
  const top = tone === 'dark' ? 'text-champagne-300' : 'text-champagne-700';
  const bottom = tone === 'dark' ? 'text-white' : 'text-forest-900';
  return (
    <span className="flex min-w-0 flex-col leading-none">
      <span className={`text-xs font-semibold uppercase tracking-[0.22em] ${top}`}>Đặc Sản Số</span>
      <span className={`font-display font-medium italic ${size === 'lg' ? 'mt-1 text-3xl' : 'mt-0.5 text-lg'} ${bottom}`}>Lào Cai</span>
    </span>
  );
}

/** Đường trang trí: vạch – quả trám – vạch. */
export function Ornament({ tone = 'light', className = '' }: { tone?: 'dark' | 'light'; className?: string }) {
  const color = tone === 'dark' ? '#C9A96E' : '#B89451';
  return (
    <svg viewBox="0 0 120 12" className={`h-3 w-28 ${className}`} aria-hidden="true">
      <path d="M0 6 H48 M72 6 H120" stroke={color} strokeWidth="1" opacity="0.7" />
      <path d="M60 1 L65 6 L60 11 L55 6 Z" fill={color} />
      <path d="M50 6 L53 3.5 L56 6 L53 8.5 Z M64 6 L67 3.5 L70 6 L67 8.5 Z" fill={color} opacity="0.6" />
    </svg>
  );
}

/** Dải hoa văn thổ cẩm (CSS trong index.css). */
export function BrocadeBand({ tone = 'dark', className = '' }: { tone?: 'dark' | 'light'; className?: string }) {
  return <div aria-hidden="true" className={`${tone === 'dark' ? 'brocade-dark h-3' : 'brocade-light h-3'} ${className}`} />;
}

/** Tiêu đề mục: dòng nhỏ viết hoa màu vàng, tiêu đề chữ có chân, hành động bên phải (nếu có). */
export function SectionHeading({ eyebrow, title, action, id }: { eyebrow?: string; title: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne-700">{eyebrow}</p>}
        <h2 id={id} className="font-display text-2xl font-semibold leading-tight text-ink">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
