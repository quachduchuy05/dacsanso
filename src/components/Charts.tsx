import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

/**
 * Biểu đồ nhỏ dùng chung, không dùng thư viện biểu đồ (theo hướng dẫn biểu đồ của dự án):
 * một chuỗi số liệu một màu (--color-chart-1), cột / thanh mảnh tối đa 24px, đầu bo 4px, gốc thẳng; lưới mảnh, nhạt;
 * chỉ ghi giá trị ở chỗ cần (đầu thanh, cột cao nhất), còn lại xem bằng rê chuột / chạm / phím mũi tên và ở dạng bảng.
 * Chữ dùng màu chữ, không dùng màu của cột.
 */

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Record<T, string>; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 rounded-full border border-champagne-200 bg-white p-1">
      {(Object.keys(options) as T[]).map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={value === k}
          onClick={() => onChange(k)}
          className={`min-h-11 rounded-full px-3 text-sm font-semibold transition-colors ${value === k ? 'bg-forest-900 text-champagne-100' : 'text-stone-700 hover:bg-champagne-50'}`}
        >
          {options[k]}
        </button>
      ))}
    </div>
  );
}

/** Mốc trục tròn số: 1, 2, 5 × 10^n, không nhỏ hơn giá trị lớn nhất. */
export function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 5, 10].find((m) => m * pow >= max)!;
  return step * pow;
}

/** Số gọn cho trục: 1.200 → 1,2 N; 3.500.000 → 3,5 Tr. */
export function compactNumber(n: number): string {
  const fmt = (v: number) => v.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  if (n >= 1e9) return `${fmt(n / 1e9)} tỷ`;
  if (n >= 1e6) return `${fmt(n / 1e6)} tr`;
  if (n >= 1e3) return `${fmt(n / 1e3)} N`;
  return fmt(n);
}

export interface ChartDatum {
  key: string;
  label: string;
  value: number;
  /** Giá trị đã định dạng để hiện (vd. "3 đơn", "1.540.000đ"). */
  display: string;
  /** Dòng phụ trong ô số liệu khi rê chuột. */
  detail?: string;
}

/**
 * Biểu đồ cột theo thời gian. Rê chuột / chạm vào vùng biểu đồ để xem cột gần nhất; khi đang chọn biểu đồ thì
 * phím ← → đi qua từng cột. Nhãn ngày thưa dần khi nhiều cột để không chồng lên nhau.
 */
export function ColumnChart({ data, label, tick = compactNumber, integer = false }: { data: ChartDatum[]; label: string; tick?: (n: number) => string; integer?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const liveId = useId();
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  // Số đếm (số đơn) không ghi mốc lẻ như 0,5.
  const ticks = integer && max % 2 !== 0 ? [1, 0] : [1, 0.5, 0];
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);
  const every = Math.max(1, Math.ceil(data.length / 7));
  const shown = active === null ? null : data[active];

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const box = plotRef.current?.getBoundingClientRect();
    if (!box || data.length === 0) return;
    const i = Math.floor(((e.clientX - box.left) / box.width) * data.length);
    setActive(Math.min(data.length - 1, Math.max(0, i)));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = data.length - 1;
    const to = e.key === 'ArrowRight' ? Math.min(last, (active ?? -1) + 1) : e.key === 'ArrowLeft' ? Math.max(0, (active ?? last + 1) - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
    if (to === null) return;
    e.preventDefault();
    setActive(to);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        {/* Trục dọc: 0, nửa, đỉnh. */}
        <div aria-hidden="true" className="relative h-44 w-11 shrink-0 text-right text-xs tabular-nums text-muted">
          {ticks.map((f) => (
            <span key={f} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - f) * 100}%` }}>
              {tick(max * f)}
            </span>
          ))}
        </div>
        <div
          ref={plotRef}
          role="group"
          tabIndex={0}
          aria-label={`${label}. Dùng phím mũi tên trái phải để xem từng ngày.`}
          aria-describedby={liveId}
          onPointerMove={fromPointer}
          onPointerDown={fromPointer}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
          onKeyDown={onKey}
          onFocus={() => setActive((a) => a ?? data.length - 1)}
          onBlur={() => setActive(null)}
          className="relative h-44 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40"
        >
          {[0, 0.5, 1].map((f) => (
            <span key={f} aria-hidden="true" className="absolute inset-x-0 border-t border-stone-200" style={{ top: `${f * 100}%` }} />
          ))}
          <ol aria-hidden="true" className="absolute inset-0 flex items-end gap-px">
            {data.map((d, i) => (
              <li key={d.key} className="relative flex h-full flex-1 items-end justify-center">
                {d.value > 0 && (
                  <span
                    className={`block w-full max-w-6 rounded-t-[4px] transition-colors ${active === i ? 'bg-chart-1-hover' : 'bg-chart-1'}`}
                    style={{ height: `max(2px, ${(d.value / max) * 100}%)` }}
                  />
                )}
                {/* Chỉ ghi số trên cột cao nhất. */}
                {i === peak && d.value > 0 && active === null && (
                  <span className="absolute left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap pb-0.5 text-xs font-semibold text-ink" style={{ bottom: `${(d.value / max) * 100}%` }}>
                    {d.display}
                  </span>
                )}
              </li>
            ))}
          </ol>
          {shown && active !== null && (
            <div
              role="tooltip"
              className="pointer-events-none absolute top-0 z-10 -translate-y-1 rounded-xl bg-ink px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg"
              style={active > data.length / 2 ? { right: `${((data.length - active - 0.5) / data.length) * 100}%` } : { left: `${((active + 0.5) / data.length) * 100}%` }}
            >
              <span className="block text-sm font-bold">{shown.display}</span>
              <span className="block text-stone-300">{shown.label}</span>
              {shown.detail && <span className="block text-stone-300">{shown.detail}</span>}
            </div>
          )}
        </div>
      </div>
      <div aria-hidden="true" className="ml-13 flex text-xs text-muted">
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 text-center whitespace-nowrap">
            {(data.length - 1 - i) % every === 0 ? d.label : ''}
          </span>
        ))}
      </div>
      <p id={liveId} className="sr-only" aria-live="polite">
        {shown ? `${shown.label}: ${shown.display}${shown.detail ? `, ${shown.detail}` : ''}` : ''}
      </p>
    </div>
  );
}

/** Thanh ngang xếp hạng: tên trên, thanh và giá trị ở đầu thanh dưới; rê chuột / chọn dòng để xem thêm. */
export function BarList({ data, label }: { data: ChartDatum[]; label: string }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ol aria-label={label} className="space-y-1">
      {data.map((d) => {
        const shown = active === d.key;
        return (
          <li
            key={d.key}
            tabIndex={0}
            onPointerEnter={() => setActive(d.key)}
            onPointerLeave={() => setActive((a) => (a === d.key ? null : a))}
            onFocus={() => setActive(d.key)}
            onBlur={() => setActive((a) => (a === d.key ? null : a))}
            aria-label={`${d.label}: ${d.display}${d.detail ? `, ${d.detail}` : ''}`}
            className="relative rounded-xl px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40"
          >
            <p className="truncate text-sm text-ink">{d.label}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`block h-3.5 shrink-0 rounded-r-[4px] transition-colors ${d.value > 0 ? (shown ? 'bg-chart-1-hover' : 'bg-chart-1') : 'bg-stone-200'}`}
                style={{ width: d.value > 0 ? `max(4px, calc((100% - 7.5rem) * ${d.value / max}))` : '2px' }}
              />
              <span aria-hidden="true" className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink">
                {d.display}
              </span>
            </div>
            {shown && d.detail && (
              <div role="tooltip" className="pointer-events-none absolute top-0 right-1 z-10 -translate-y-full rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lg">
                <span className="block text-sm font-bold">{d.display}</span>
                <span className="block text-stone-300">{d.label}</span>
                <span className="block text-stone-300">{d.detail}</span>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
