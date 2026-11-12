import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { ProductImage } from '../../components/ProductImage';
import { useStorefront } from '../../app/StorefrontContext';
import { useUi } from '../../app/UiContext';
import { formatMoney } from '../../domain/pricing';
import type { Product } from '../../domain/types';
import './product-orbit.css';

/** Live catalog photographs arranged on a draggable, perspective sphere. */
export function ProductOrbit({ products }: { products: Product[] }) {
  const { productPosters } = useStorefront();
  const { openModal } = useUi();
  const root = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const drag = useRef<{ id: number; x: number; start: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const interacting = useRef(false);
  const [paused, setPaused] = useState(false);
  const items = products.slice(0, 12);
  const key = items.map(p => p.id).join('|');

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true, frame = 0, last = 0;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(el);
    const draw = (now: number) => {
      const delta = Math.min(now - last, 40); last = now;
      if (visible && !document.hidden) {
        if (!paused && !reduce.matches && !drag.current && !interacting.current) angle.current += delta * .00012;
        const radius = Math.min(el.clientWidth * .35, 225);
        const cards = el.querySelectorAll<HTMLElement>('.product-orbit-card');
        cards.forEach((card, i) => {
          const y = cards.length === 1 ? 0 : 1 - 2 * (i + .5) / cards.length;
          const ring = Math.sqrt(1 - y * y);
          const theta = i * 2.3999632297 + angle.current;
          const x = Math.cos(theta) * ring * radius;
          const z = Math.sin(theta) * ring * radius;
          card.style.transform = `translate3d(${x}px,${y * radius * .8}px,${z}px)`;
          card.style.opacity = String(.55 + .45 * (z / radius + 1) / 2);
          card.style.zIndex = String(Math.round(z + radius));
        });
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [key, paused]);

  if (!items.length) return null;
  return <div className="product-orbit" role="region" aria-label="Khám phá đặc sản xoay 3D">
    <div className="product-orbit-scene" ref={root}
      onPointerDown={e => {
        if (e.button !== 0) return;
        suppressClick.current = false;
        drag.current = { id: e.pointerId, x: e.clientX, start: angle.current, moved: false };
      }}
      onPointerMove={e => {
        const d = drag.current; if (!d || d.id !== e.pointerId) return;
        const distance = e.clientX - d.x;
        if (Math.abs(distance) > 8) { d.moved = true; e.currentTarget.setPointerCapture(e.pointerId); }
        if (d.moved) angle.current = d.start + distance * .009;
      }}
      onPointerUp={() => { suppressClick.current = !!drag.current?.moved; drag.current = null; }}
      onPointerCancel={() => { suppressClick.current = true; drag.current = null; }}
      onPointerLeave={() => { if (!drag.current?.moved) drag.current = null; }}
      onFocusCapture={() => { interacting.current = true; }}
      onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) interacting.current = false; }}
      onDragStart={e => e.preventDefault()}>
      <div className="product-orbit-halo" aria-hidden="true"/>
      {items.map(product => <button key={product.id} className="product-orbit-card"
        aria-label={`Xem ${product.name}, ${formatMoney(product.price)}`}
        onClick={e => { if (e.detail === 0 || !suppressClick.current) openModal({ type: 'product_detail', productId: product.id }); }}>
        <ProductImage product={{ ...product, image: productPosters[product.variantOf ?? product.id] ?? product.image }} variant="card" className="product-orbit-photo"/>
        <span>{product.name}</span>
      </button>)}
    </div>
    <div className="product-orbit-controls"><span>Kéo xoay · Chạm để khám phá</span><div>
      <button aria-label="Xoay sản phẩm sang trái" onClick={() => { angle.current -= .45; }}><ChevronLeft size={17}/></button>
      <button aria-label={paused ? 'Tiếp tục xoay tự động' : 'Dừng xoay tự động'} aria-pressed={paused} onClick={() => setPaused(p => !p)}>{paused ? <Play size={15}/> : <Pause size={15}/>}</button>
      <button aria-label="Xoay sản phẩm sang phải" onClick={() => { angle.current += .45; }}><ChevronRight size={17}/></button>
    </div></div>
  </div>;
}
