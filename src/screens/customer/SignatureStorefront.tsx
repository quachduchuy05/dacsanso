import {CommerceFooter} from './CommerceFooter';
import {EditorialRegions} from './EditorialRegions';
import {trackExperience} from '../../store/experienceEvents';
import { useLayoutEffect,useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Leaf, MapPin, PackageCheck, Truck } from 'lucide-react';
import { useStorefront } from '../../app/StorefrontContext';
import { useStore } from '../../store/AppDataContext';
import { FaqSection } from '../../components/FaqSection';
import { groupFamilies } from '../../domain/variants';
import { isOrderableIn } from '../../domain/cart';
import { remainingFor } from '../../domain/state';
import { type Product } from '../../domain/types';
import { StorefrontProductCard } from './StorefrontPage';
import {FeaturedCollections} from './FeaturedCollections';
import { useSignatureMotion } from './useSignatureMotion';
import { ProductOrbit } from './ProductOrbit';

/** Product-led storefront; images and quantities always come from the live catalog. */
export function SignatureStorefront() {
  const motionRoot = useSignatureMotion();
  const { state } = useStore();
  const { openCatalog, setQuery, goTo } = useStorefront();
  const [selection, setSelection] = useState<'all' | 'ready' | 'preorder'>('all');
  const families = useMemo(() => groupFamilies(state.products.filter(p => p.status === 'active'))
    .map(items => items.find(p => isOrderableIn(state, p) && remainingFor(state, p) > 0) ?? items[0]), [state]);
  const shown = families.filter(p => selection === 'all' || p.kind === selection);
  const searchRegion = (region: string) => { setQuery(region); openCatalog(); };
  return <div className="shop-page signature-home" ref={motionRoot}>
    <div className="signature-reading-progress" aria-hidden="true"/>
    <section className="signature-stage hero-fullbleed hero-product-orbit" id="shop-home" aria-labelledby="signature-title">
      <picture className="warm-hero-picture"><source media="(max-width: 767px)" srcSet="/images/concepts/warm-specialties-hero-v1-768.webp"/><img src="/images/concepts/warm-specialties-hero-v1.webp" alt="Mật ong, chè và mận trên bàn đá sáng" fetchPriority="high" decoding="async"/></picture>
      <div className="shop-container signature-stage-inner">
        <div className="signature-intro"><span className="signature-kicker"><span /> LÀO CAI · TUYỂN TẬP HƯƠNG VỊ</span>
          <h1 id="signature-title">{state.homepage?.title||'Thức quà của đất.'}<br/><em>{state.homepage?.subtitle||'Dư vị của lòng.'}</em></h1>
          <p className="compact-hero-description">{state.homepage?.description||'Đặc sản vùng miền, chọn theo vị bạn.'}</p>
          <button className="signature-primary" onClick={openCatalog}>Khám phá đặc sản <ArrowUpRight size={20}/></button>
          <button className="signature-text-link editorial-story-link" onClick={()=>goTo('about')}>Về chúng tôi <ArrowRight size={16}/></button>
          <span className="signature-origin"><MapPin size={14}/> Sản vật Lào Cai · Giao tại Hà Nội</span>
        </div>
        <ProductOrbit products={families}/>
        <div className="signature-stage-foot"><span>ĂN ĐẶC SẢN</span><button onClick={() => goTo('products')}>Xem sản phẩm <ArrowDown size={16}/></button></div>
      </div>
    </section>

    <div className="signature-content">
      <div className="shop-container signature-assurances" aria-label="Thông tin mua hàng">
        <span><MapPin size={18}/> Xem nguồn gốc</span><span><PackageCheck size={18}/> Chọn quy cách</span><span><Truck size={18}/> Theo dõi đơn</span>
      </div>
      <div className="shop-container"><FeaturedCollections renderRail={(products,label)=><SignatureRail products={products} label={label} onViewAll={openCatalog}/>}/></div>
      <section className="shop-container signature-selection" id="shop-products" aria-labelledby="signature-selection-title">
        <div className="signature-heading"><h2 id="signature-selection-title">Chọn vị bạn thích.</h2></div>
        <div className="signature-selection-tools"><div role="group" aria-label="Chọn hình thức mua">{([['all', 'Tất cả'], ['ready', 'Có sẵn'], ['preorder', 'Hàng đặt trước']] as const).map(([key, label]) => <button key={key} aria-pressed={selection === key} onClick={() => setSelection(key)}>{label}</button>)}</div><button className="signature-text-link" onClick={openCatalog}>Xem tất cả <ArrowUpRight size={16}/></button></div>
        <SignatureRail products={shown} label="Danh mục thức quà" onViewAll={openCatalog}/>
      </section>

      <section className="shop-container signature-provenance" id="shop-about" aria-labelledby="signature-provenance-title">
        <div className="signature-provenance-art editorial-story-photo"><img src="/images/concepts/honey-tea-3d-v1.webp" alt="Chè và mật ong trên bàn đá" loading="lazy" width="1122" height="1402"/><span className="signature-monogram" aria-hidden="true">ĐS</span><Leaf size={42} strokeWidth={1}/><p>Đất lành<br/><em>gửi vị.</em></p><span>LÀO CAI, VIỆT NAM</span></div>
        <div className="signature-provenance-copy"><h2 id="signature-provenance-title">Biết nguồn, hiểu vị.</h2><p>Xem nguồn gốc, quy cách và giá trước khi chọn.</p>
          <details className="compact-story"><summary>Tìm hiểu thêm</summary>
          <div className="signature-value"><span>01</span><div><h3>Biết nguồn, hiểu vị</h3><p>Vùng sản xuất và nhà cung cấp được trình bày cùng sản phẩm. Chứng nhận có thể xem khi hồ sơ đã được xác minh.</p></div></div>
          <div className="signature-value"><span>02</span><div><h3>Trọn vẹn trước khi chọn</h3><p>Xem giá, quy cách, tình trạng hàng và thông tin đặt trước. Kiểm tra phí giao cùng số tiền tại bước đặt hàng.</p></div></div>
          </details>
          <button className="signature-text-link" onClick={openCatalog}>Chọn đặc sản <ArrowRight size={18}/></button>
        </div>
      </section>

      <EditorialRegions products={families} onSelect={searchRegion}/>

      <section className="shop-container signature-journal" id="shop-journal" aria-labelledby="signature-journal-title"><h2 id="signature-journal-title">Chè ngon, chuyện dài.</h2><button className="signature-text-link" onClick={() => {setQuery('chè'); openCatalog();}}>Khám phá chè <ArrowRight size={18}/></button><Leaf className="signature-journal-mark" size={160} strokeWidth={.5} aria-hidden="true"/></section>
      <details className="shop-container compact-help"><summary>Câu hỏi thường gặp</summary><FaqSection/></details>
    </div>
    <CommerceFooter/>
  </div>;
}

export function SignatureRail({ products, label, onViewAll }: { products: Product[]; label: string; onViewAll: () => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const productKey=products.map(p=>p.id).join('|');
  useLayoutEffect(()=>{
    const el=rail.current;if(!el)return;
    // The initial empty rail contains only "view all". Do not retain that snap anchor when data arrives.
    el.style.scrollSnapType='none';el.scrollLeft=0;
    const frame=requestAnimationFrame(()=>{el.scrollLeft=0;el.style.scrollSnapType='';});
    return()=>{cancelAnimationFrame(frame);el.style.scrollSnapType='';};
  },[productKey]);
  const lastSwipe=useRef(0);
  const drag = useRef<{x:number; scroll:number; moved:boolean} | null>(null);
  const move = (direction:number) => {const el=rail.current; if(el) el.scrollBy({left:direction*((el.firstElementChild?.getBoundingClientRect().width ?? 280)+24),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
  return <div className="signature-rail-wrap">
    <div className="signature-rail" ref={rail} role="region" aria-label={label} tabIndex={0} onScroll={()=>{if(Date.now()-lastSwipe.current>1200){lastSwipe.current=Date.now();trackExperience('swipe');}}}
      onKeyDown={event => {if(event.target!==event.currentTarget)return; if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}}}
      onPointerDown={event => {delete event.currentTarget.dataset.dragged;if(event.pointerType==='mouse'&&event.button===0){drag.current={x:event.clientX,scroll:event.currentTarget.scrollLeft,moved:false};}}}
      onPointerMove={event => {const d=drag.current;if(!d)return;const delta=event.clientX-d.x;if(Math.abs(delta)>7){d.moved=true;event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.classList.add('is-dragging');event.currentTarget.scrollLeft=d.scroll-delta;}}}
      onPointerUp={event => {if(drag.current?.moved){event.currentTarget.dataset.dragged='true';}drag.current=null;event.currentTarget.classList.remove('is-dragging');}}
      onPointerCancel={event => {drag.current=null;event.currentTarget.classList.remove('is-dragging');}}
      onPointerLeave={() => {if(!drag.current?.moved)drag.current=null;}}
      onClickCapture={event => {if(event.currentTarget.dataset.dragged==='true'){event.preventDefault();event.stopPropagation();delete event.currentTarget.dataset.dragged;}}}
      onDragStart={event => event.preventDefault()}>
      {products.slice(0,11).map(product => <StorefrontProductCard key={product.id} product={product} listContext={products.map(p=>p.id)}/>)}
      <button className="signature-view-all" onClick={onViewAll}><span>Tiếp tục<br/><em>khám phá.</em></span><ArrowUpRight size={36} strokeWidth={1}/><small>Xem tất cả đặc sản</small></button>
    </div>
    <div className="signature-rail-controls"><span>{products.length ? 'Vuốt để tìm vị bạn yêu' : 'Danh mục đang được cập nhật'} <span aria-hidden="true">↔</span></span><div><button aria-label={`${label}: sản phẩm trước`} onClick={() => move(-1)}><ArrowLeft size={18}/></button><button aria-label={`${label}: sản phẩm tiếp theo`} onClick={() => move(1)}><ArrowRight size={18}/></button></div></div>
  </div>;
}
