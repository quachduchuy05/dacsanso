import { useState } from 'react';
import {CoopReviewsPanel} from '../../components/CoopReviewsPanel';
import { BadgeCheck, Bell, BellRing, MessageCircle, Star } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { BottomSheet } from '../../components/BottomSheet';
import { EmptyState, ErrorState } from '../../components/EmptyState';
import { coopShop, SORT_LABEL, sortProducts, type SortKey } from '../../store/commands/marketplace';
import { formatDateKey } from '../../domain/state';
import { useStore } from '../../store/AppDataContext';
import { ProductCard } from './ExploreTab';
import { useMarketplace } from './useMarketplace';

/**
 * Trang shop của HTX kiểu sàn TMĐT (chủ repo yêu cầu ngày 18/10/2026): thông tin công khai, sản phẩm đang bán có sắp
 * xếp, theo dõi để được báo khi HTX có sản phẩm mới, nhắn tin cho HTX. Không có SĐT, địa chỉ cửa hàng (chỉ Admin xem).
 */
export function CoopShopSheet({ coopId, onClose }: { coopId: string; onClose: () => void }) {
  const { state, now } = useStore();
  const { openModal } = useUi();
  const { isFollowing, toggleFollowCoop } = useMarketplace();
  const [sort, setSort] = useState<SortKey>('relevant');
  const shop = coopShop(state, coopId, now());
  if (!shop) {
    return (
      <BottomSheet title="Shop HTX" onClose={onClose}>
        <ErrorState>Không tìm thấy HTX.</ErrorState>
      </BottomSheet>
    );
  }
  const following = isFollowing(shop.id);
  const products = sortProducts(state, shop.products, sort);

  return (
    <BottomSheet
      title={
        <>
          <span className="block font-sans text-xs font-semibold uppercase tracking-[0.14em] text-champagne-700">Shop HTX</span>
          <span className="block font-display text-2xl font-semibold leading-tight">{shop.name}</span>
        </>
      }
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        <section aria-label="Thông tin shop" className="relative overflow-hidden rounded-3xl bg-forest-950 p-4 text-white md:p-5">
          <div aria-hidden="true" className="lattice absolute inset-0" />
          <div className="relative flex flex-wrap items-center gap-4">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-forest-900 font-display text-2xl font-semibold text-champagne-200 ring-2 ring-champagne-400/80 ring-offset-2 ring-offset-forest-950"
            >
              {shop.name
                .replace(/^HTX( mẫu)?\s*/i, '')
                .charAt(0)
                .toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-semibold leading-tight text-champagne-100">{shop.name}</p>
              <p className="text-sm text-forest-100">{shop.region}</p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
              <button
                type="button"
                aria-pressed={following}
                onClick={() => toggleFollowCoop(shop.id)}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold ${
                  following ? 'border border-champagne-300/70 text-champagne-100 hover:bg-white/5' : 'bg-champagne-300 text-forest-950 hover:bg-champagne-200'
                }`}
              >
                {following ? <BellRing size={16} aria-hidden="true" /> : <Bell size={16} aria-hidden="true" />}
                {following ? 'Đang theo dõi' : 'Theo dõi'}
              </button>
              <button
                type="button"
                onClick={() => openModal({ type: 'chat', withId: shop.id })}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-champagne-300/70 px-4 text-sm font-bold text-champagne-100 hover:bg-white/5"
              >
                <MessageCircle size={16} aria-hidden="true" /> Nhắn tin
              </button>
            </div>
          </div>
          <dl className="relative mt-4 grid grid-cols-3 divide-x divide-champagne-400/30 rounded-2xl border border-champagne-400/30 bg-forest-950/60 text-center">
            <div className="flex flex-col-reverse px-2 py-2">
              <dt className="text-xs text-forest-100">Sản phẩm</dt>
              <dd className="font-display text-lg font-semibold text-champagne-200">{shop.products.length}</dd>
            </div>
            <div className="flex flex-col-reverse px-2 py-2">
              <dt className="text-xs text-forest-100">{shop.rating.count > 0 ? `${shop.rating.count} đánh giá sản phẩm` : 'Đánh giá sản phẩm'}</dt>
              <dd className="flex items-center justify-center gap-1 font-display text-lg font-semibold text-champagne-200">
                {shop.rating.average !== null ? (
                  <>
                    <Star size={15} aria-hidden="true" className="fill-champagne-300 text-champagne-300" /> {shop.rating.average}
                  </>
                ) : (
                  'Chưa có'
                )}
              </dd>
            </div>
            <div className="flex flex-col-reverse px-2 py-2">
              <dt className="text-xs text-forest-100">Người theo dõi</dt>
              <dd className="font-display text-lg font-semibold text-champagne-200">{shop.followers}</dd>
            </div>
          </dl>
        </section>

        {shop.sample && (
          <p role="note" className="rounded-2xl border border-stone-300 bg-stone-50 p-3 text-sm text-stone-700">
            <strong className="text-ink">Dữ liệu mẫu – chờ HTX xác nhận.</strong> Tên, giới thiệu và sản phẩm của shop là dữ liệu mẫu của nhóm dự án.
          </p>
        )}

        {shop.suspended && (
          <p role="note" className="rounded-2xl border border-stone-300 bg-stone-50 p-3 text-sm text-stone-800">
            HTX đang tạm ngừng nhận đơn. Bạn vẫn xem được sản phẩm và theo dõi shop.
          </p>
        )}

        <section aria-labelledby="gioi-thieu-shop" className="space-y-1.5 rounded-2xl border border-champagne-200 bg-champagne-50/60 p-3.5 text-sm">
          <h3 id="gioi-thieu-shop" className="font-bold text-ink">
            Giới thiệu
          </h3>
          <p className="leading-relaxed text-stone-700">{shop.description ?? 'HTX chưa có giới thiệu.'}</p>
          <p className="text-xs text-muted">Cần hỗ trợ đơn hàng: nhắn tin cho HTX hoặc gửi khiếu nại theo đơn. SĐT và địa chỉ cửa hàng của HTX không công khai.</p>
        </section>

        <section aria-labelledby="chung-nhan-shop" className="space-y-1.5 rounded-2xl border border-champagne-200 bg-white p-3.5 text-sm">
          <h3 id="chung-nhan-shop" className="font-bold text-ink">
            Chứng nhận đã xác minh
          </h3>
          {shop.certifications.length === 0 ? (
            <p className="text-stone-600">Chưa có chứng nhận nào được Admin – Chất lượng xác minh.</p>
          ) : (
            <ul className="space-y-1.5">
              {shop.certifications.map((c) => (
                <li key={c.id} className="flex gap-1.5 text-stone-700">
                  <BadgeCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-forest-600" />
                  <span>
                    <strong className="text-ink">{c.label}</strong> · {c.issuer} · hiệu lực đến {formatDateKey(c.validUntil)}
                    <span className="block text-xs text-muted">Sản phẩm: {c.productNames.join(', ')} (Admin đã xem hồ sơ – mô phỏng)</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <CoopReviewsPanel coopId={coopId}/>
        <section aria-labelledby="san-pham-shop" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="san-pham-shop" className="font-display text-xl font-semibold text-ink">
              Sản phẩm của shop
            </h3>
            <div role="group" aria-label="Sắp xếp sản phẩm của shop" className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={sort === k}
                  onClick={() => setSort(k)}
                  className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-3.5 text-sm font-medium ${sort === k ? 'bg-forest-900 text-champagne-100' : 'border border-champagne-300/80 bg-white text-stone-700 hover:border-champagne-500'}`}
                >
                  {SORT_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
          {products.length === 0 ? (
            <EmptyState>Shop chưa có sản phẩm đang bán.</EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} showCoop={false} />
              ))}
            </div>
          )}
        </section>
      </div>
    </BottomSheet>
  );
}
