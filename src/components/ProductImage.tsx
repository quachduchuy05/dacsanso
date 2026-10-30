import { AppImage } from './AppImage';
import { useState } from 'react';
import type { Product } from '../domain/types';
import { IllustrationBackdrop, IllustrationSubject } from './ProductIllustration';

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

export function ProductImage({ product, className = '', variant = 'thumb' }: { product: Product; className?: string; variant?: Variant }) {
  const [failed, setFailed] = useState(false);
  if (product.image && !failed) {
    return (
      <AppImage
        src={product.image}
        alt={product.name}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <div role="img" aria-label={`Ảnh minh hoạ: ${product.name}`} className={`relative overflow-hidden bg-paper ${className}`}>
      <IllustrationBackdrop />
      <IllustrationSubject product={product} glow={variant !== 'thumb'} />
      {variant === 'cover' && (
        <span className="absolute top-3 left-3 rounded-full bg-ivory/90 px-2.5 py-1 text-xs font-semibold text-stone-700 shadow-xs">Ảnh minh hoạ</span>
      )}
    </div>
  );
}
