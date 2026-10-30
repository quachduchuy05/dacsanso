import { Bell, BellRing } from 'lucide-react';
import { canWatchSeason, seasonOpen } from '../../store/commands/seasonWatch';
import type { Product } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';
import { useMarketplace } from './useMarketplace';

/**
 * "Báo tôi khi vào mùa" (Giai đoạn 8): hiện với sản phẩm đặt trước chưa mở, hết suất hoặc hết thời gian nhận đặt.
 * Bấm để theo dõi, bấm lần nữa để bỏ. Đang nhận đặt trước thì không hiện (khách đặt được ngay).
 */
export function SeasonWatchButton({ product, className = '' }: { product: Product; className?: string }) {
  const { state, now } = useStore();
  const { isSeasonWatched, toggleSeasonWatch } = useMarketplace();
  const watching = isSeasonWatched(product);
  if (product.kind !== 'preorder' || seasonOpen(state, product, now())) return null;
  if (!watching && !canWatchSeason(state, product, now())) return null;
  const Icon = watching ? BellRing : Bell;
  return (
    <button
      type="button"
      onClick={() => toggleSeasonWatch(product.id)}
      className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold ${
        watching ? 'border-forest-700 bg-forest-50 text-forest-900 hover:bg-forest-100' : 'border-champagne-400 bg-champagne-50 text-forest-900 hover:border-champagne-600'
      } ${className}`}
    >
      <Icon size={17} aria-hidden="true" />
      {watching ? 'Đã bật báo khi vào mùa · bấm để tắt' : 'Báo tôi khi vào mùa'}
    </button>
  );
}
