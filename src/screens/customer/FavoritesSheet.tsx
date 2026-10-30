import { Heart, Store } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { BottomSheet } from '../../components/BottomSheet';
import { EmptyState } from '../../components/EmptyState';
import { ProductImage } from '../../components/ProductImage';
import { coopShop, familyPrice, favoriteItems, followedCoops } from '../../store/commands/marketplace';
import { formatMoney } from '../../domain/pricing';
import { useStore } from '../../store/AppDataContext';
import { useMarketplace } from './useMarketplace';

/** Yêu thích của khách: sản phẩm đã thả tim (mới trước) và HTX đang theo dõi. */
export function FavoritesSheet({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const { openModal } = useUi();
  const { customerId, toggleFav, toggleFollowCoop } = useMarketplace();
  const items = favoriteItems(state, customerId);
  const coops = followedCoops(state, customerId);

  return (
    <BottomSheet title="Yêu thích" onClose={onClose} wide>
      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="sp-yeu-thich" className="space-y-2">
          <h3 id="sp-yeu-thich" className="font-display text-lg font-semibold text-ink">
            Sản phẩm yêu thích ({items.length})
          </h3>
          {items.length === 0 ? (
            <EmptyState>Chưa có sản phẩm yêu thích. Bấm trái tim trên thẻ sản phẩm để lưu lại xem sau.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {items.map(({ key, product: p, listed }) => (
                <li key={key} className="flex items-center gap-2 rounded-2xl border border-champagne-200 bg-white p-2">
                  <button
                    type="button"
                    disabled={!listed}
                    onClick={() => openModal({ type: 'product_detail', productId: p.id })}
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl text-left disabled:cursor-default"
                  >
                    <span aria-hidden="true" className="shrink-0">
                      <ProductImage product={p} className="h-14 w-14 rounded-xl" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                      <span className="block truncate text-xs text-muted">{state.coops.find((c) => c.id === p.coopId)?.name}</span>
                      <span className={`block text-sm font-semibold tabular-nums ${listed ? 'text-forest-900' : 'text-stone-600'}`}>
                        {listed ? `từ ${formatMoney(familyPrice(state, p))}` : 'Không còn bán'}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFav(p.id)}
                    aria-label={`Bỏ yêu thích ${p.name}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-rose-600 hover:bg-rose-50"
                  >
                    <Heart size={18} aria-hidden="true" className="fill-rose-600" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="htx-theo-doi" className="space-y-2">
          <h3 id="htx-theo-doi" className="font-display text-lg font-semibold text-ink">
            HTX đang theo dõi ({coops.length})
          </h3>
          {coops.length === 0 ? (
            <EmptyState>Chưa theo dõi HTX nào. Theo dõi shop HTX để được báo khi HTX có sản phẩm mới.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {coops.map((c) => {
                const shop = coopShop(state, c.id);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-champagne-200 bg-white p-3">
                    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-900 text-champagne-300">
                      <Store size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{c.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {c.region} · {shop?.products.length ?? 0} sản phẩm
                      </span>
                    </span>
                    <span className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => openModal({ type: 'coop_shop', coopId: c.id })}
                        aria-label={`Xem shop ${c.name}`}
                        className="min-h-11 rounded-full border border-champagne-300 px-3 text-sm font-bold text-forest-900 hover:bg-champagne-50"
                      >
                        Xem shop
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFollowCoop(c.id)}
                        aria-label={`Bỏ theo dõi ${c.name}`}
                        className="min-h-11 rounded-full px-3 text-sm font-semibold text-stone-600 hover:bg-stone-100"
                      >
                        Bỏ theo dõi
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </BottomSheet>
  );
}
