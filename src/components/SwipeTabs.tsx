import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

export interface SwipeTabItem<K extends string> {
  key: K;
  label: string;
  /** Số đơn của tab; 0 hoặc không có thì không hiện. */
  count?: number;
}

function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduce, setReduce] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const m = window.matchMedia?.(query);
    if (!m) return;
    const on = () => setReduce(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return reduce;
}

/** Trang đang được phóng to bằng hai ngón (visualViewport.scale > 1). */
function usePinchZoomed(): boolean {
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const on = () => setZoomed(vv.scale > 1.01);
    on();
    vv.addEventListener('resize', on);
    return () => vv.removeEventListener('resize', on);
  }, []);
  return zoomed;
}

/**
 * Hàng tab có gạch chân và phần nội dung vuốt ngang được để sang tab bên cạnh (kiểu "Đơn đã mua" của ứng dụng mua sắm).
 * - Điện thoại: vuốt trái / phải trên nội dung; hàng tab tự cuộn để tab đang chọn luôn nằm trong tầm nhìn.
 *   Vuốt dọc vẫn cuộn trang, hai ngón vẫn phóng to được (touch-action: pan-y pinch-zoom). Đang phóng to thì tắt vuốt
 *   đổi tab để kéo ngang xem phần bị khuất; ngón thứ hai chạm vào giữa lúc vuốt thì huỷ vuốt.
 * - Máy tính: bấm tab, hoặc phím mũi tên / Home / End trên hàng tab (mẫu tablist của WAI-ARIA).
 * - Chỉ dựng nội dung tab đang chọn; 2 tab hai bên chỉ dựng trong lúc vuốt / đang trượt (để thấy trước),
 *   nên một đơn không xuất hiện 2 lần trên trang.
 * - Người dùng bật giảm chuyển động thì chuyển tab không trượt.
 */
export function SwipeTabs<K extends string>({
  tabs,
  active,
  onChange,
  label,
  barClassName = '',
  renderPanel,
}: {
  tabs: SwipeTabItem<K>[];
  active: K;
  onChange: (key: K) => void;
  label: string;
  /** Lớp thêm cho hàng tab, vd. dính dưới thanh trên cùng khi cuộn. */
  barClassName?: string;
  renderPanel: (key: K) => ReactNode;
}) {
  const base = useId();
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.key === active),
  );
  const reduceMotion = usePrefersReducedMotion();
  const zoomed = usePinchZoomed();
  const rootRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gesture = useRef<{ id: number; x: number; y: number; t: number; axis: 'x' | 'y' | null } | null>(null);
  const suppressClickUntil = useRef(0);
  const focusAfterChange = useRef(false);
  const prevIndex = useRef(index);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Đang trượt sau khi thả tay hoặc đổi tab: giữ nội dung tab bên cạnh tới khi trượt xong.
  const [settling, setSettling] = useState(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const settle = () => {
    setSettling(true);
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => setSettling(false), 400);
  };
  useEffect(() => () => clearTimeout(settleTimer.current), []);

  // Gạch chân theo tab đang chọn (đo lại khi đổi tab, khi số đếm làm tab rộng ra, khi hàng tab đổi cỡ).
  const tabsSignature = tabs.map((t) => `${t.key}:${t.count ?? 0}`).join('|');
  useLayoutEffect(() => {
    const el = tabRefs.current[index];
    const bar = barRef.current;
    if (!el || !bar) return;
    const update = () => setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [index, tabsSignature]);

  // Chỉ khi đổi tab (và lần đầu): cuộn hàng tab cho tab đang chọn nằm giữa. Không cuộn lại mỗi lần vẽ lại,
  // để không kéo mất chỗ người dùng vừa cuộn ngang hàng tab.
  useEffect(() => {
    const el = tabRefs.current[index];
    const bar = barRef.current;
    if (!el || !bar) return;
    bar.scrollTo?.({ left: el.offsetLeft - (bar.clientWidth - el.offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Khung nội dung cao bằng tab đang chọn (các tab bên cạnh bị cắt), để trang không thừa khoảng trống.
  useLayoutEffect(() => {
    const panel = panelRefs.current[index];
    if (!panel) return;
    const update = () => setHeight(panel.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(panel);
    return () => ro.disconnect();
  }, [index]);

  // Đổi tab khi đã cuộn xuống dưới: đưa đầu hàng tab về ngay dưới thanh trên cùng; đổi bằng phím thì chuyển focus theo.
  useEffect(() => {
    if (prevIndex.current === index) return;
    if (Math.abs(prevIndex.current - index) === 1 && !reduceMotion) settle();
    prevIndex.current = index;
    const root = rootRef.current;
    const sticky = stickyRef.current;
    if (root && sticky) {
      const offset = parseFloat(getComputedStyle(sticky).top) || 0;
      const top = root.getBoundingClientRect().top - offset;
      if (top < 0) window.scrollTo({ top: window.scrollY + top });
    }
    if (focusAfterChange.current) {
      focusAfterChange.current = false;
      tabRefs.current[index]?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const jump = Math.abs(index - prevIndex.current) > 1;
  // Vừa đổi sang tab bên cạnh (lần dựng đầu tiên sau khi đổi, trước khi effect bật settling).
  const sliding = !reduceMotion && Math.abs(index - prevIndex.current) === 1;
  const transition = dragging || reduceMotion || jump ? 'none' : 'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)';

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const to = e.key === 'ArrowRight' ? index + 1 : e.key === 'ArrowLeft' ? index - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    // Đã ở tab đầu / cuối: không đổi gì (không để lại cờ chuyển focus).
    if (to < 0 || to >= tabs.length || to === index) return;
    focusAfterChange.current = true;
    onChange(tabs[to].key);
  };

  const cancelDrag = () => {
    const wasDragging = gesture.current?.axis === 'x';
    gesture.current = null;
    if (!wasDragging) return;
    setDragging(false);
    setDrag(0);
    settle();
    suppressClickUntil.current = performance.now() + 400;
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Ngón thứ hai chạm vào (vd. chụm để phóng to): huỷ thao tác vuốt đang dở, trượt về chỗ cũ.
    if (gesture.current) {
      cancelDrag();
      return;
    }
    // Chuột trên máy tính: bấm tab (kéo chuột sẽ cản việc chọn chữ và bấm thẻ). Đang phóng to: để trình duyệt kéo ngang.
    if (e.pointerType === 'mouse' || tabs.length < 2 || zoomed) return;
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, axis: null };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.axis) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      g.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
      if (g.axis === 'y') {
        gesture.current = null;
        return;
      }
      try {
        viewportRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // Con trỏ đã kết thúc: bỏ qua, vẫn kéo được bằng các sự kiện còn lại.
      }
      setDragging(true);
    }
    const atEdge = (index === 0 && dx > 0) || (index === tabs.length - 1 && dx < 0);
    setDrag(atEdge ? dx / 3 : dx);
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (g.axis !== 'x') return;
    const dx = e.clientX - g.x;
    const width = viewportRef.current?.clientWidth || 1;
    const speed = Math.abs(dx) / Math.max(1, e.timeStamp - g.t);
    setDragging(false);
    setDrag(0);
    settle();
    suppressClickUntil.current = performance.now() + 400;
    if (cancelled) return;
    if (Math.abs(dx) > width * 0.2 || (speed > 0.45 && Math.abs(dx) > 30)) {
      const next = dx < 0 ? index + 1 : index - 1;
      if (next >= 0 && next < tabs.length) onChange(tabs[next].key);
    }
  };

  return (
    <div ref={rootRef}>
      <div ref={stickyRef} className={`border-b border-champagne-200 bg-ivory/95 backdrop-blur-md ${barClassName}`}>
        <div ref={barRef} role="tablist" aria-label={label} onKeyDown={onKeyDown} className="no-scrollbar relative flex overflow-x-auto">
          {tabs.map((t, i) => (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.key}`}
              aria-selected={i === index}
              aria-controls={`${base}-panel-${t.key}`}
              tabIndex={i === index ? 0 : -1}
              onClick={() => onChange(t.key)}
              className={`flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap px-3.5 text-sm transition-colors ${i === index ? 'font-bold text-forest-900' : 'text-stone-600 hover:text-forest-900'}`}
            >
              {t.label}
              {!!t.count && (
                <span className={`rounded-full px-1.5 text-xs font-bold tabular-nums ${i === index ? 'bg-forest-900 text-champagne-100' : 'bg-champagne-100 text-champagne-900'}`}>{t.count}</span>
              )}
            </button>
          ))}
          {indicator && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 h-[3px] rounded-full bg-forest-800"
              style={{ left: indicator.left, width: indicator.width, transition: reduceMotion ? 'none' : 'left 250ms ease, width 250ms ease' }}
            />
          )}
        </div>
      </div>

      <div
        ref={viewportRef}
        className="overflow-hidden"
        style={{ height, touchAction: zoomed ? 'auto' : 'pan-y pinch-zoom' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => onPointerEnd(e, false)}
        onPointerCancel={(e) => onPointerEnd(e, true)}
        onClickCapture={(e) => {
          if (performance.now() < suppressClickUntil.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div
          className="flex items-start"
          style={{ transform: `translate3d(calc(${-index * 100}% + ${drag}px), 0, 0)`, transition }}
          onTransitionEnd={(e) => e.target === e.currentTarget && setSettling(false)}
        >
          {tabs.map((t, i) => (
            <div
              key={t.key}
              ref={(el) => {
                panelRefs.current[i] = el;
              }}
              role="tabpanel"
              id={`${base}-panel-${t.key}`}
              aria-labelledby={`${base}-tab-${t.key}`}
              aria-hidden={i !== index}
              inert={i !== index}
              className="w-full shrink-0"
            >
              {i === index || ((dragging || settling || sliding) && Math.abs(i - index) === 1) ? renderPanel(t.key) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
