import { useRef, useState } from 'react';
import { MapPin, Search, Star } from 'lucide-react';
import { CoopCallLinks } from '../../components/CoopPhones';
import { EmptyState, ErrorState } from '../../components/EmptyState';
import { Select } from '../../components/form';
import { ProductImage } from '../../components/ProductImage';
import { useUi } from '../../app/UiContext';
import { isSampleAddress } from '../../store/commands/coopContact';
import { COOP_DIRECTORY_FILTERS, coopDirectory, filterCoopRows, type CoopDirectoryFilter, type CoopDirectoryRow } from '../../domain/coopDirectory';
import { formatMoney } from '../../domain/pricing';
import { averageRating } from '../../store/commands/reviews';
import { formatDateKey, remainingFor } from '../../domain/state';
import { ORDER_KIND_LABEL, PRODUCT_STATUS_LABEL, type Product } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/**
 * Danh sách HTX cho Admin, mọi nhóm quyền (góp ý kiểm thử: "Danh sách HTX", "Danh sách sản phẩm đang bán của từng HTX").
 * Thay cho Danh bạ HTX: vẫn có 2 nút gọi SĐT HTX và thêm địa chỉ; SĐT, địa chỉ chỉ Admin xem, khách và QLNN không thấy.
 * Máy tính: danh sách bên trái, chi tiết HTX và sản phẩm bên phải.
 */
export function AdminCoopsTab() {
  const { state } = useStore();
  const { adminActor } = useUi();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CoopDirectoryFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const all = coopDirectory(state, adminActor);
  if (!all.ok) return <ErrorState>{all.error}</ErrorState>;
  const rows = filterCoopRows(all.value, query, filter);
  const selected = rows.find((r) => r.coop.id === selectedId) ?? rows[0];

  const select = (id: string) => {
    setSelectedId(id);
    // Màn hẹp: chi tiết nằm dưới danh sách, cuộn tới cho người dùng thấy.
    if (window.matchMedia?.('(max-width: 1279px)').matches) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        {all.value.length} HTX · {all.value.filter((r) => r.coop.status === 'active').length} đang được bán · {all.value.reduce((n, r) => n + r.active.length, 0)} sản phẩm đang bán. Bấm số để gọi HTX
        bằng điện thoại của bạn; SĐT và địa chỉ do HTX tự cập nhật, chỉ Admin xem được.
      </p>
      <div role="search" aria-label="Tìm HTX" className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <label className="relative block">
          <span className="sr-only">Tìm theo tên HTX, vùng, người đại diện, sản phẩm</span>
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm HTX, vùng, người đại diện, sản phẩm…"
            className="min-h-11 w-full rounded-xl border border-stone-300 bg-white py-2.5 pr-3 pl-9 text-base text-ink focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 md:text-sm"
          />
        </label>
        <label className="block">
          <span className="sr-only">Lọc HTX</span>
          <Select value={filter} onChange={(e) => setFilter(e.target.value as CoopDirectoryFilter)}>
            {COOP_DIRECTORY_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label} ({filterCoopRows(all.value, '', f.key).length})
              </option>
            ))}
          </Select>
        </label>
      </div>

      {rows.length === 0 || !selected ? (
        <EmptyState>Không có HTX nào khớp.</EmptyState>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)]">
          <ul className="space-y-2" aria-label="Danh sách HTX">
            {rows.map((r) => {
              const active = r.coop.id === selected.coop.id;
              return (
                <li key={r.coop.id}>
                  <button
                    type="button"
                    onClick={() => select(r.coop.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full space-y-1.5 rounded-2xl border p-3 text-left transition-colors ${active ? 'border-forest-700 bg-forest-50 ring-1 ring-forest-700' : 'border-stone-200 bg-white hover:border-champagne-400'}`}
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-ink">{r.coop.name}</span>
                      <CoopBadges row={r} />
                    </span>
                    <span className="block text-sm text-stone-600">
                      Vùng {r.coop.region}
                      {r.coop.representative ? ` · Đại diện: ${r.coop.representative}` : ''}
                    </span>
                    <span className="block text-sm text-stone-700">
                      <strong>{r.active.length}</strong> sản phẩm đang bán · {r.orders} đơn · đã giao {formatMoney(r.deliveredGoodsValue)}
                      {r.openTickets > 0 && <span className="font-semibold text-rose-700"> · {r.openTickets} khiếu nại mở</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div ref={detailRef} className="xl:sticky xl:top-[calc(var(--app-header-h,0px)+1rem)]" style={{ scrollMarginTop: 'calc(var(--app-header-h, 0px) + 1rem)' }}>
            <CoopDetail key={selected.coop.id} row={selected} />
          </div>
        </div>
      )}
    </div>
  );
}

function CoopBadges({ row: r }: { row: CoopDirectoryRow }) {
  return (
    <span className="flex flex-wrap gap-1">
      <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${r.coop.status === 'active' ? 'bg-forest-100 text-forest-800' : 'bg-rose-100 text-rose-900'}`}>
        {r.coop.status === 'active' ? 'Đang được bán' : 'Tạm khoá bán'}
      </span>
      {r.coop.profileStatus === 'pending' && <span className="rounded-md bg-champagne-100 px-2 py-0.5 text-xs font-bold text-champagne-900">Hồ sơ chờ duyệt</span>}
    </span>
  );
}

function CoopDetail({ row: r }: { row: CoopDirectoryRow }) {
  const c = r.coop;
  return (
    <section aria-label={`Chi tiết ${c.name}`} className="space-y-4 rounded-3xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-semibold text-ink">{c.name}</h3>
          <p className="text-sm text-stone-600">
            Vùng {c.region}
            {c.representative ? ` · Đại diện: ${c.representative}` : ''} · Tài khoản nhận chi trả {c.payoutAccountMasked}
          </p>
        </div>
        <CoopBadges row={r} />
      </div>
      {c.suspendReason && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">Lý do tạm khoá bán: {c.suspendReason}</p>}
      {c.description && <p className="text-sm text-stone-700">{c.description}</p>}

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ['Đang bán', `${r.active.length} sản phẩm`],
            ['Đơn hàng', `${r.orders} đơn`],
            ['Hàng đã giao', formatMoney(r.deliveredGoodsValue)],
            ['Đánh giá', r.rating.average !== null ? `${r.rating.average}/5 (${r.rating.count})` : 'Chưa có'],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-stone-50 p-2.5">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="font-bold tabular-nums text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-2">
        <h4 className="text-sm font-bold text-ink">Liên hệ HTX (chỉ Admin)</h4>
        <CoopCallLinks name={c.name} phones={r.contact.phones} />
        <p className="flex items-start gap-2 text-sm text-stone-700">
          <MapPin size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-forest-800" />
          <span>
            {r.contact.address || 'HTX chưa cập nhật địa chỉ.'}
            {isSampleAddress(r.contact.address) && <span className="block text-xs text-muted">Bản demo: HTX mẫu chưa nhập địa chỉ thật.</span>}
          </span>
        </p>
      </div>

      <ProductTable title={`Sản phẩm đang bán (${r.active.length})`} products={r.active} empty="HTX chưa có sản phẩm đang bán." />
      {r.others.length > 0 && (
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-stone-700">Sản phẩm khác: ẩn, chờ duyệt, bị từ chối ({r.others.length})</summary>
          <ProductTable products={r.others} showStatus empty="" />
        </details>
      )}
    </section>
  );
}

function ProductTable({ title, products, empty, showStatus = false }: { title?: string; products: Product[]; empty: string; showStatus?: boolean }) {
  const { state } = useStore();
  return (
    <div className="space-y-2">
      {title && <h4 className="text-sm font-bold text-ink">{title}</h4>}
      {products.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200">
          {products.map((p) => {
            const rating = averageRating(state, p.id);
            return (
              <li key={p.id} className="flex items-center gap-3 p-2.5">
                <ProductImage product={p} className="h-12 w-12 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold text-ink">
                    {p.name} <span className="font-normal text-stone-600">· {p.unit}</span>
                  </p>
                  <p className="text-stone-600">
                    {ORDER_KIND_LABEL[p.kind]} · {formatMoney(p.price)} ·{' '}
                    {p.kind === 'preorder'
                      ? `còn ${remainingFor(state, p)}/${p.preorder?.totalSlots ?? 0} suất${p.preorder ? `, giao ${formatDateKey(p.preorder.deliveryFrom)} – ${formatDateKey(p.preorder.deliveryTo)}` : ''}`
                      : `còn ${remainingFor(state, p)} (tồn ${p.stockOnHand})`}
                    {showStatus && <span className="font-semibold text-stone-800"> · {PRODUCT_STATUS_LABEL[p.status]}</span>}
                  </p>
                </div>
                {rating.average !== null && (
                  <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-stone-700">
                    <Star size={14} aria-hidden="true" className="fill-champagne-500 text-champagne-500" />
                    {rating.average}
                    <span className="sr-only"> điểm, {rating.count} đánh giá</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
