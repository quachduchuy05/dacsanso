import { AppImage } from './AppImage';
import { useState } from 'react';
import type { Product } from '../domain/types';
import { IllustrationBackdrop, IllustrationSubject } from './ProductIllustration';
import { productConcept } from '../domain/productConcept';

/**
 * Ảnh sản phẩm.
 * - Có ảnh HTX tự tải lên thì hiện ảnh đó.
 * - Không có thì hiện tranh minh hoạ vẽ bằng SVG (ProductIllustration): nền ruộng bậc thang và vật minh hoạ.
 *   Không dùng ảnh stock vì nhóm chưa có quyền dùng ảnh (mục 9.4).
 *
 * - `thumb`: ảnh nhỏ cạnh tên sản phẩm.
 * - `card`: thẻ sản phẩm.
 * - `cover`: ảnh lớn ở trang chi tiết, có nhãn "Ảnh minh hoạ".
 */
type Variant = 'thumb' | 'card' | 'cover';

export function ProductImage({ product, className = '', variant = 'thumb',priority=false }: { product: Product; className?: string; variant?: Variant;priority?:boolean }) {
  const [failed, setFailed] = useState<string[]>([]);
  const concept=productConcept(product);
  const source=[product.image,concept].find(src=>src&&!failed.includes(src));
  if(source&&source===concept)return <div className={`relative overflow-hidden bg-paper ${className}`}>
    <AppImage src={source} alt={product.name} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'}
      srcSet={`${source.replace('.webp','-480.webp')} 480w, ${source.replace('.webp','-960.webp')} 960w, ${source} 1122w`}
      sizes={variant==='thumb'?'80px':variant==='card'?'(max-width: 767px) 78vw, 360px':'(max-width: 767px) 100vw, 640px'}
      className="absolute inset-0 h-full w-full object-cover" onError={()=>setFailed(old=>[...old,source])}/>
  </div>;
  if (source) {
    return (
      <AppImage
        src={source}
        alt={product.name}
        loading={priority?'eager':'lazy'}
        fetchPriority={priority?'high':'auto'}
        decoding="async"
        sizes={variant==='thumb'?'80px':variant==='card'?'(max-width: 767px) 78vw, 360px':'(max-width: 767px) 100vw, 640px'}
        onError={() => setFailed(old=>[...old,source])}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <div role="img" aria-label={product.name} className={`relative overflow-hidden bg-paper ${className}`}>
      <IllustrationBackdrop />
      <IllustrationSubject product={product} glow={variant !== 'thumb'} />
    </div>
  );
}
