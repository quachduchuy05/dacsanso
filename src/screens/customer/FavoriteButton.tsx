import { Heart } from 'lucide-react';
import type { Product } from '../../domain/types';
import { useMarketplace } from './useMarketplace';

/** Nút trái tim Yêu thích: vùng bấm 44px, vòng tròn trắng nhỏ bên trong để nổi trên ảnh. */
export function FavoriteButton({ product, className = '' }: { product: Product; className?: string }) {
  const { isFav, toggleFav } = useMarketplace();
  const on = isFav(product);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`Yêu thích ${product.name}`}
      onClick={() => toggleFav(product.id)}
      className={`group/fav flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-forest-600 ${className}`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-[0_2px_8px_rgb(31,77,58,0.18)] ring-1 ring-champagne-300/80 transition group-hover/fav:scale-105">
        <Heart size={16} aria-hidden="true" className={on ? 'fill-rose-600 text-rose-600' : 'text-forest-900'} />
      </span>
    </button>
  );
}
