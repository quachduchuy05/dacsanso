import { BellRing } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { BottomSheet } from '../../components/BottomSheet';
import { EmptyState } from '../../components/EmptyState';
import { ProductImage } from '../../components/ProductImage';
import { seasonWatchItems } from '../../store/commands/seasonWatch';
import { useStore } from '../../store/AppDataContext';
import { useMarketplace } from './useMarketplace';

/** Danh sách "Báo tôi khi vào mùa" ở Tài khoản (Giai đoạn 8, mục 2): sản phẩm đặt trước khách đang chờ, mới thêm trước. */
export function SeasonWatchSheet({ onClose }: { onClose: () => void }) {
  const { state, now } = useStore();
  const { openModal } = useUi();
  const { customerId, toggleSeasonWatch } = useMarketplace();
  const items = seasonWatchItems(state, customerId, now());

  return (
    <BottomSheet title="Báo khi vào mùa" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-stone-600">Khi Admin – Chất lượng duyệt đợt đặt trước mới hoặc thêm suất, bạn nhận 1 thông báo cho mỗi đợt.</p>
        {items.length === 0 ? (
          <EmptyState>Chưa theo dõi sản phẩm nào. Với sản phẩm đặt trước chưa mở, hết suất hoặc hết thời gian nhận đặt, bấm "Báo tôi khi vào mùa".</EmptyState>
        ) : (
          <ul className="space-y-2">
            {items.map(({ key, product: p, open }) => (
              <li key={key} className="flex items-center gap-2 rounded-2xl border border-champagne-200 bg-white p-2">
                <button
                  type="button"
                  disabled={p.status !== 'active'}
                  onClick={() => openModal({ type: 'product_detail', productId: p.id })}
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl text-left disabled:cursor-default"
                >
                  <span aria-hidden="true" className="shrink-0">
                    <ProductImage product={p} className="h-14 w-14 rounded-xl" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                    <span className="block truncate text-xs text-muted">{state.coops.find((c) => c.id === p.coopId)?.name}</span>
                    <span className={`block text-sm font-semibold ${open ? 'text-forest-800' : 'text-stone-600'}`}>
                      {open ? 'Đang nhận đặt trước – đặt ngay' : p.status === 'active' ? 'Đang chờ vào mùa' : 'Sản phẩm đang không hiển thị'}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleSeasonWatch(p.id)}
                  aria-label={`Tắt báo khi vào mùa ${p.name}`}
                  className="flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold text-stone-600 hover:bg-stone-100"
                >
                  <BellRing size={16} aria-hidden="true" /> Tắt
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
}
