import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  CookingPot,
  Heart,
  History,
  Leaf,
  Package,
  PackageCheck,
  Plus,
  Search,
  Sprout,
  Star,
  Store,
  TicketPercent,
  Truck,
  Wheat,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { PAGE_X } from '../../app/layout';
import { BrandEmblem, BrandWordmark, BrocadeBand, Ornament, SectionHeading } from '../../components/Brand';
import { EmptyState } from '../../components/EmptyState';
import { LandscapeArt } from '../../components/LandscapeArt';
import { PreorderProgress } from '../../components/PreorderProgress';
import { ProductImage } from '../../components/ProductImage';
import { QuantityStepper } from '../../components/QuantityStepper';
import { isOrderableIn } from '../../store/commands/cart';
import {
  coopShop,
  familyPrice,
  familyRating,
  favoriteItems,
  inPriceBand,
  inPriceRange,
  parsePriceInput,
  PRICE_BANDS,
  SORT_LABEL,
  sortProducts,
  voucherWallet,
  type PriceBand,
  type SortKey,
} from '../../store/commands/marketplace';
import { formatMoney } from '../../domain/pricing';
import { isSamplePrice, regionsOf, remainingFor } from '../../domain/state';
import { matchesSearch } from '../../domain/text';
import { CATEGORY_LABEL, type Category, type DemoState, type Product } from '../../domain/types';
import { familyKey, groupFamilies, listedFamilyOf, priceRange } from '../../domain/variants';
import { useStore } from '../../store/AppDataContext';
import { clearViewerList, pushViewerList, useViewerList } from '../../store/viewerPrefs';
import { CoopNameButton } from './CoopNameButton';
import { FavoriteButton } from './FavoriteButton';
import { useCartActions } from './useCartActions';
import { useMarketplace } from './useMarketplace';
import { VoucherTicket } from './VoucherTicket';

const ALL = 'all';

/** Kéo khối ra sát mép màn hình (bù lề PAGE_X), cho thanh tìm kiếm dính và các dải cuộn ngang. */
const BLEED = '-mx-4 px-4 md:-mx-6 md:px-6 xl:-mx-10 xl:px-10 2xl:-mx-14 2xl:px-14';

const CATEGORY_ICON: Record<Category, LucideIcon> = { dry: Wheat, processed: CookingPot, fresh: Leaf };

/** Các bước mua, mô tả đúng luồng của app (không phải cam kết dịch vụ). */
const STEPS = [
  { Icon: Sprout, title: 'Chọn đặc sản', text: 'Hàng mua sẵn đặt là giao; nông sản theo mùa đặt trước, cọc để giữ suất.' },
  { Icon: PackageCheck, title: 'HTX chuẩn bị đơn', text: 'HTX xác nhận đơn, đóng gói và bàn giao cho đơn vị vận chuyển.' },
  { Icon: Truck, title: 'Nhận hàng tại Hà Nội', text: 'Theo dõi đơn ở Tài khoản › Đơn mua; xem nguồn gốc lô hàng ở trang sản phẩm.' },
];

/** Thẻ đại diện của nhóm quy cách: quy cách còn đặt được, không thì quy cách giá thấp nhất. */
const representative = (state: DemoState, family: Product[]) => family.find((p) => isOrderableIn(state, p) && remainingFor(state, p) > 0) ?? family[0];

const coopNameOf = (state: DemoState, p: Product) => state.coops.find((c) => c.id === p.coopId)?.name;

/**
 * Trang Khám phá của khách (FR-TKSP-01..03), bố cục kiểu sàn TMĐT (chủ repo yêu cầu ngày 18/10/2026):
 * thanh tìm kiếm dính kèm gợi ý và tìm kiếm gần đây, đầu trang gọn, lối tắt danh mục, mã ưu đãi, đặt trước theo mùa,
 * shop HTX, đã xem gần đây, lưới sản phẩm có sắp xếp và lọc khoảng giá, cách mua.
 * Giữ màu thương hiệu: nền rừng tối có hoa văn chìm, chữ ánh vàng, khung ảnh hình vòm.
 */
export function ExploreTab() {
  const { state } = useStore();
  const { setCustomerTab } = useUi();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<string>(ALL);
  const [category, setCategory] = useState<Category | typeof ALL>(ALL);
  const [sort, setSort] = useState<SortKey>('relevant');
  // Khoảng giá: các mức có sẵn, hoặc khách tự nhập từ / đến (Giai đoạn 8).
  const [band, setBand] = useState<PriceBand | 'custom'>('all');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const customMin = parsePriceInput(priceFrom);
  const customMax = parsePriceInput(priceTo);
  const inBand = (price: number) => (band === 'custom' ? inPriceRange(price, customMin, customMax) : inPriceBand(price, band));

  const listed = state.products.filter((p) => p.status === 'active');
  // Bộ lọc vùng sinh từ dữ liệu sản phẩm, cùng một cấp (L9). Sản phẩm ghi nhiều địa danh thì có ở từng địa danh.
  const regions = useMemo(() => [...new Set(listed.flatMap(regionsOf))].sort((a, b) => a.localeCompare(b, 'vi')), [listed]);
  const categories = useMemo(() => (Object.keys(CATEGORY_LABEL) as Category[]).filter((c) => listed.some((p) => p.category === c)), [listed]);

  // Mỗi sản phẩm một thẻ, các quy cách (hộp 300 g, 500 g…) gộp vào thẻ đó (domain/variants.ts).
  const matched = groupFamilies(
    listed
      .filter((p) => region === ALL || regionsOf(p).includes(region))
      .filter((p) => category === ALL || p.category === category)
      .filter((p) => matchesSearch(query, [p.name, p.region, p.unit, coopNameOf(state, p)])),
  )
    .map((family) => representative(state, family))
    .filter((p) => inBand(familyPrice(state, p)));
  const visible = sortProducts(state, matched, sort);
  const familyCount = groupFamilies(listed).length;

  const filtering = query.trim() !== '' || region !== ALL || category !== ALL || (band === 'custom' ? customMin !== undefined || customMax !== undefined : band !== 'all');
  const clearFilters = () => {
    setQuery('');
    setRegion(ALL);
    setCategory(ALL);
    setBand('all');
    setPriceFrom('');
    setPriceTo('');
  };

  const coopCount = new Set(listed.map((p) => p.coopId)).size;
  const preorders = groupFamilies(listed.filter((p) => p.kind === 'preorder' && isOrderableIn(state, p) && remainingFor(state, p) > 0)).map((f) => f[0]);
  const showcase = listed.slice(0, 3);

  // Cuộn tới lưới sau khi các mục quảng bá ẩn đi (đang lọc), để vị trí tính theo bố cục mới.
  const scrollToProducts = () => requestAnimationFrame(() => document.getElementById('san-pham')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

  return (
    <div className={`space-y-7 pb-8 md:space-y-9 ${PAGE_X}`}>
      <SearchBar query={query} setQuery={setQuery} listed={listed} onSubmit={scrollToProducts} />

      {/* Đầu trang gọn */}
      <section className="relative overflow-hidden rounded-[28px] bg-forest-950 text-white shadow-[0_24px_60px_rgb(14,37,27,0.28)]">
        <div aria-hidden="true" className="lattice absolute inset-0" />
        <LandscapeArt className="absolute inset-0 h-full w-full" />
        {/* Trên máy tính: ba khung tranh hình vòm bên phải. */}
        <div aria-hidden="true" className="pointer-events-none absolute right-10 bottom-8 hidden items-end gap-4 lg:flex">
          {showcase.map((p, i) => (
            <div key={p.id} className={`overflow-hidden rounded-t-full rounded-b-3xl p-1.5 ring-1 ring-champagne-400/70 ${i === 1 ? 'w-36 bg-champagne-200/20' : 'w-28 bg-champagne-200/10'}`}>
              <ProductImage product={p} variant="card" className="aspect-[4/5] w-full rounded-t-full rounded-b-[20px]" />
            </div>
          ))}
        </div>
        <div className="relative space-y-3 px-5 pt-6 pb-12 md:max-w-xl md:px-10 md:pt-9 md:pb-16">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-champagne-300">
            <span aria-hidden="true" className="h-px w-7 bg-champagne-400" />
            Từ các hợp tác xã vùng cao Lào Cai
          </p>
          <h2 className="text-gold font-display text-[1.65rem] font-semibold leading-[1.12] text-balance md:text-4xl">Đặc sản núi rừng, giao tận nhà tại Hà Nội</h2>
          <p className="max-w-md text-sm leading-relaxed text-forest-100">
            {familyCount} sản phẩm từ {coopCount} HTX · hàng mua sẵn và nông sản theo mùa.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={scrollToProducts}
              className="flex min-h-11 items-center gap-1.5 rounded-full bg-champagne-300 px-5 text-sm font-bold text-forest-950 shadow-[0_8px_20px_rgb(201,169,110,0.25)] hover:bg-champagne-200"
            >
              Xem sản phẩm <ArrowRight size={16} aria-hidden="true" />
            </button>
            {/* Trên điện thoại đã có lối tắt "Đặt trước" ngay bên dưới. */}
            <button onClick={() => setCustomerTab('season')} className="hidden min-h-11 rounded-full border border-champagne-300/70 px-5 text-sm font-semibold text-champagne-100 hover:bg-white/5 sm:block">
              Đặt trước theo mùa
            </button>
          </div>
        </div>
        <BrocadeBand className="absolute inset-x-0 bottom-0" />
      </section>

      <Shortcuts
        categories={categories}
        category={category}
        onCategory={(c) => {
          setCategory(category === c ? ALL : c);
          scrollToProducts();
        }}
      />

      {!filtering && <VoucherStrip />}

      {/* Đặt trước theo mùa (ẩn khi đang tìm / lọc) */}
      {!filtering && preorders.length > 0 && (
        <section className="relative overflow-hidden rounded-[28px] border border-champagne-300/80 bg-champagne-50 shadow-[0_10px_30px_rgb(116,90,42,0.10)]">
          <div className="grid items-center gap-4 p-5 sm:grid-cols-[1fr_auto] md:p-7">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne-700">Đặt trước theo mùa</p>
              <h3 className="font-display text-2xl font-semibold leading-tight text-forest-900">Giữ suất trước mùa thu hoạch</h3>
              <p className="text-sm text-stone-700">Cọc {state.params.depositPercent}% khi đặt, phần còn lại trả khi hàng sẵn sàng hoặc khi nhận hàng.</p>
              <ul className="flex flex-wrap gap-1.5 pt-1">
                {preorders.map((p) => (
                  <li key={p.id} className="rounded-full border border-champagne-300 bg-white px-3 py-1 text-xs font-semibold text-champagne-900">
                    {p.name}
                  </li>
                ))}
              </ul>
              <button onClick={() => setCustomerTab('season')} className="mt-1 flex min-h-11 items-center gap-1.5 text-sm font-bold text-forest-800 hover:text-forest-600">
                Xem vụ mùa <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
            <div aria-hidden="true" className="mx-auto hidden w-36 rounded-t-full rounded-b-3xl bg-white p-1.5 ring-1 ring-champagne-300 sm:block md:w-44">
              <ProductImage product={preorders[0]} variant="card" className="aspect-[4/5] w-full rounded-t-full rounded-b-[20px]" />
            </div>
          </div>
        </section>
      )}

      {!filtering && <CoopStrip />}
      {!filtering && <RecentlyViewed />}

      {/* Lưới sản phẩm */}
      <section
        className="space-y-3"
        aria-labelledby="san-pham"
        style={{ scrollMarginTop: 'calc(var(--app-header-h, 0px) + var(--customer-bar-h, 0px) + 4.75rem)' }}
      >
        <SectionHeading
          id="san-pham"
          eyebrow={filtering ? 'Kết quả' : 'Gợi ý cho bạn'}
          title="Sản phẩm"
          action={<span className="pb-1 text-xs text-muted">{visible.length} sản phẩm</span>}
        />

        <div className="space-y-2">
          <ChipRow label="Sắp xếp">
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <Chip key={k} active={sort === k} onClick={() => setSort(k)}>
                {SORT_LABEL[k]}
              </Chip>
            ))}
          </ChipRow>
          <ChipRow label="Lọc theo vùng">
            <Chip active={region === ALL} onClick={() => setRegion(ALL)}>
              Mọi vùng
            </Chip>
            {regions.map((r) => (
              <Chip key={r} active={region === r} onClick={() => setRegion(r)}>
                {r}
              </Chip>
            ))}
          </ChipRow>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-h-11 items-center gap-2 rounded-full border border-champagne-300/80 bg-white/90 pr-1 pl-4 text-sm text-stone-700">
              <span className="whitespace-nowrap font-medium">Khoảng giá</span>
              <select
                value={band}
                onChange={(e) => setBand(e.target.value as PriceBand | 'custom')}
                className="min-h-11 rounded-full bg-transparent pr-2 text-sm font-semibold text-forest-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne-400/50"
              >
                {PRICE_BANDS.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.label}
                  </option>
                ))}
                <option value="custom">Tự nhập khoảng giá</option>
              </select>
            </label>
            {band === 'custom' && (
              <div role="group" aria-label="Khoảng giá tự nhập" className="flex items-center gap-1.5 text-sm text-stone-700">
                <PriceInput label="Giá từ (đồng)" placeholder="Từ" value={priceFrom} onChange={setPriceFrom} />
                <span aria-hidden="true">–</span>
                <PriceInput label="Giá đến (đồng)" placeholder="Đến" value={priceTo} onChange={setPriceTo} />
                <span className="text-xs text-muted">đ</span>
              </div>
            )}
            {category !== ALL && (
              <button onClick={() => setCategory(ALL)} className="flex min-h-11 items-center gap-1 rounded-full bg-forest-900 px-4 text-sm font-semibold text-champagne-100" aria-label={`Bỏ lọc nhóm hàng ${CATEGORY_LABEL[category]}`}>
                {CATEGORY_LABEL[category]} <X size={14} aria-hidden="true" />
              </button>
            )}
            {filtering && (
              <button onClick={clearFilters} className="min-h-11 rounded-full px-3 text-sm font-semibold text-forest-800 underline underline-offset-4 hover:text-forest-600">
                Xoá tìm kiếm và bộ lọc
              </button>
            )}
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            action={
              <button onClick={clearFilters} className="min-h-11 rounded-full border border-champagne-300 bg-white px-4 text-sm font-semibold text-forest-900 hover:bg-champagne-50">
                Xoá tìm kiếm và bộ lọc
              </button>
            }
          >
            Không có sản phẩm phù hợp.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 md:gap-x-5 md:gap-y-6 lg:grid-cols-4 xl:grid-cols-5 min-[1800px]:grid-cols-6">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Cách mua */}
      {!filtering && (
        <section className="space-y-4" aria-labelledby="cach-mua">
          <BrocadeBand tone="light" />
          <SectionHeading id="cach-mua" eyebrow="Cách mua" title="Từ hợp tác xã tới nhà bạn" />
          <ol className="grid gap-3 md:grid-cols-3">
            {STEPS.map(({ Icon, title, text }, i) => (
              <li key={title} className="flex gap-3 rounded-3xl border border-champagne-200 bg-white/80 p-4">
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-900 text-champagne-300 ring-1 ring-champagne-400/60">
                  <Icon size={18} aria-hidden="true" />
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-champagne-300 font-display text-xs font-semibold text-forest-950">{i + 1}</span>
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-lg font-semibold text-ink">{title}</span>
                  <span className="block text-sm leading-relaxed text-stone-600">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Chân trang */}
      <footer className="space-y-3 pt-2 text-center">
        <Ornament className="mx-auto" />
        <div className="flex items-center justify-center gap-2.5">
          <BrandEmblem size={34} />
          <BrandWordmark tone="light" />
        </div>
        <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted">Bản demo – dữ liệu mẫu. Sản phẩm, giá và HTX là mẫu, chờ HTX xác nhận.</p>
      </footer>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors ${
        active ? 'bg-forest-900 text-champagne-100 ring-1 ring-champagne-400/60' : 'border border-champagne-300/80 bg-white/80 text-stone-700 hover:border-champagne-500'
      }`}
    >
      {children}
    </button>
  );
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={`no-scrollbar flex items-center gap-2 overflow-x-auto ${BLEED}`} role="group" aria-label={label}>
      {children}
    </div>
  );
}

/** Dải cuộn ngang có tiêu đề nhỏ và hành động bên phải (mã ưu đãi, shop HTX, đã xem gần đây). */
function Strip({ id, title, icon: Icon, action, children }: { id: string; title: string; icon: LucideIcon; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 id={id} className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-900 text-champagne-300">
            <Icon size={15} />
          </span>
          {title}
        </h2>
        {action}
      </div>
      <ul className={`no-scrollbar flex gap-3 overflow-x-auto pb-1 ${BLEED}`}>{children}</ul>
    </section>
  );
}

const linkButton = 'flex min-h-11 shrink-0 items-center gap-0.5 rounded-full px-2 text-sm font-bold text-forest-800 hover:text-forest-600';

/**
 * Thanh tìm kiếm dính dưới thanh địa chỉ. Đang gõ: gợi ý sản phẩm và shop HTX khớp; ô trống: tìm kiếm gần đây
 * (lưu trên máy này). Lưới sản phẩm lọc ngay khi gõ; Enter lưu từ khoá và cuộn tới kết quả.
 */
function SearchBar({ query, setQuery, listed, onSubmit }: { query: string; setQuery: (q: string) => void; listed: Product[]; onSubmit: () => void }) {
  const { state } = useStore();
  const { openModal, customerActor } = useUi();
  const customerId = customerActor.id ?? '';
  const recent = useViewerList('recent-searches', customerId);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const q = query.trim();

  const families = q ? groupFamilies(listed.filter((p) => matchesSearch(q, [p.name, p.region, p.unit, coopNameOf(state, p)]))).map((f) => representative(state, f)) : [];
  const coops = q ? state.coops.filter((c) => listed.some((p) => p.coopId === c.id) && matchesSearch(q, [c.name, c.region])).slice(0, 3) : [];
  const remember = (text = q) => customerId && pushViewerList('recent-searches', customerId, text);
  const showPanel = open && (q ? true : recent.length > 0);
  const close = () => {
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div
      className={`sticky z-20 bg-ivory/90 pt-3 pb-2 backdrop-blur-md md:pt-4 ${BLEED}`}
      style={{ top: 'calc(var(--app-header-h, 0px) + var(--customer-bar-h, 0px))' }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <form
        role="search"
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          if (q) remember();
          close();
          onSubmit();
        }}
      >
        <Search size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-champagne-700" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          aria-label="Tìm sản phẩm"
          placeholder="Tìm sản phẩm, vùng, HTX…"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className="min-h-12 w-full rounded-full border border-champagne-300/80 bg-white py-2.5 pr-4 pl-11 text-base text-ink shadow-xs placeholder-muted focus:border-champagne-500 focus:outline-none focus:ring-2 focus:ring-champagne-400/30 md:text-sm"
        />
      </form>
      {showPanel && (
        <div className="absolute inset-x-4 top-full z-30 max-h-[min(60vh,28rem)] space-y-3 overflow-y-auto rounded-3xl border border-champagne-200 bg-white p-3 shadow-[0_18px_40px_rgb(31,77,58,0.18)] md:inset-x-6 xl:inset-x-10 2xl:inset-x-14">
          {!q ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <History size={15} aria-hidden="true" /> Tìm kiếm gần đây
                </p>
                <button onClick={() => clearViewerList('recent-searches', customerId)} className="min-h-11 px-2 text-sm font-semibold text-stone-600 hover:text-ink">
                  Xoá lịch sử
                </button>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {recent.map((r) => (
                  <li key={r}>
                    <button
                      onClick={() => {
                        setQuery(r);
                        remember(r);
                        close();
                        onSubmit();
                      }}
                      className="min-h-11 rounded-full border border-champagne-300 bg-champagne-50 px-4 text-sm font-medium text-champagne-950 hover:border-champagne-500"
                    >
                      {r}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              {families.length === 0 && coops.length === 0 && <p className="px-1 py-2 text-sm text-stone-600">Không có sản phẩm hoặc HTX khớp "{q}".</p>}
              {families.length > 0 && (
                <ul aria-label="Sản phẩm gợi ý" className="divide-y divide-champagne-100">
                  {families.slice(0, 5).map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          remember();
                          close();
                          openModal({ type: 'product_detail', productId: p.id });
                        }}
                        className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-1 py-1.5 text-left hover:bg-champagne-50"
                      >
                        <span aria-hidden="true" className="shrink-0">
                          <ProductImage product={p} className="h-11 w-11 rounded-xl" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                          <span className="block truncate text-xs text-muted">
                            {coopNameOf(state, p)} · từ {formatMoney(familyPrice(state, p))}
                          </span>
                        </span>
                        <ChevronRight size={16} aria-hidden="true" className="text-stone-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {coops.length > 0 && (
                <ul aria-label="Shop HTX gợi ý" className="space-y-1">
                  {coops.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => {
                          remember();
                          close();
                          openModal({ type: 'coop_shop', coopId: c.id });
                        }}
                        className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-1 py-1.5 text-left hover:bg-champagne-50"
                      >
                        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-900 text-champagne-300">
                          <Store size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">Shop {c.name}</span>
                          <span className="block truncate text-xs text-muted">{c.region}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {families.length > 0 && (
                <button
                  onClick={() => {
                    remember();
                    close();
                    onSubmit();
                  }}
                  className="flex min-h-11 w-full items-center justify-center gap-1 rounded-2xl bg-forest-900 text-sm font-bold text-champagne-100 hover:bg-forest-800"
                >
                  Xem tất cả {families.length} kết quả <ArrowRight size={15} aria-hidden="true" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Lối tắt kiểu sàn: nhóm hàng (lọc lưới), đặt trước, kho voucher, yêu thích, shop HTX, đơn mua. */
function Shortcuts({ categories, category, onCategory }: { categories: Category[]; category: Category | typeof ALL; onCategory: (c: Category) => void }) {
  const { state } = useStore();
  const { openModal, setCustomerTab, customerActor } = useUi();
  const favorites = favoriteItems(state, customerActor.id ?? '').length;
  const tile = (active: boolean) =>
    `flex min-h-[4.75rem] w-full flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-2 text-center text-xs font-semibold leading-tight transition-colors ${
      active ? 'bg-forest-900 text-champagne-100 ring-1 ring-champagne-400/60' : 'bg-white/80 text-stone-800 ring-1 ring-champagne-200 hover:ring-champagne-400'
    }`;
  const icon = (active: boolean) => `relative flex h-9 w-9 items-center justify-center rounded-full ${active ? 'bg-champagne-300 text-forest-950' : 'bg-champagne-100 text-forest-900'}`;
  const others: { label: string; Icon: LucideIcon; count?: number; onClick: () => void }[] = [
    { label: 'Đặt trước', Icon: CalendarClock, onClick: () => setCustomerTab('season') },
    { label: 'Kho voucher', Icon: TicketPercent, onClick: () => openModal({ type: 'voucher_wallet' }) },
    { label: 'Yêu thích', Icon: Heart, count: favorites, onClick: () => openModal({ type: 'favorites' }) },
    { label: 'Shop HTX', Icon: Store, onClick: () => requestAnimationFrame(() => document.getElementById('shop-htx')?.scrollIntoView({ behavior: 'smooth', block: 'center' })) },
    { label: 'Đơn mua', Icon: Package, onClick: () => setCustomerTab('account') },
  ];
  return (
    <nav aria-label="Lối tắt">
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {categories.map((c) => {
          const Icon = CATEGORY_ICON[c];
          const active = category === c;
          return (
            <li key={c}>
              <button type="button" aria-pressed={active} onClick={() => onCategory(c)} className={tile(active)}>
                <span aria-hidden="true" className={icon(active)}>
                  <Icon size={17} />
                </span>
                {CATEGORY_LABEL[c]}
              </button>
            </li>
          );
        })}
        {others.map(({ label, Icon, count, onClick }) => (
          <li key={label}>
            <button type="button" onClick={onClick} className={tile(false)} aria-label={count ? `${label}, ${count} sản phẩm` : undefined}>
              <span aria-hidden="true" className={icon(false)}>
                <Icon size={17} />
                {count ? <span className="absolute -top-1 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-700 px-1 text-xs font-bold text-white">{count}</span> : null}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Mã ưu đãi đang phát hành: lưu vào Kho voucher để chọn nhanh khi đặt hàng. */
function VoucherStrip() {
  const { state, now } = useStore();
  const { openModal } = useUi();
  const { customerId, save } = useMarketplace();
  const wallet = voucherWallet(state, customerId, now());
  const entries = [...wallet.claimable, ...wallet.saved.filter((e) => e.status === 'usable' || e.status === 'upcoming')];
  if (entries.length === 0) return null;
  return (
    <Strip
      id="ma-uu-dai"
      title="Mã ưu đãi"
      icon={TicketPercent}
      action={
        <button onClick={() => openModal({ type: 'voucher_wallet' })} className={linkButton}>
          Kho voucher <ChevronRight size={16} aria-hidden="true" />
        </button>
      }
    >
      {entries.map((e) => (
        <li key={e.voucher.id}>
          <VoucherTicket
            compact
            voucher={e.voucher}
            status={e.status}
            action={
              e.saved ? (
                <span className="flex min-h-11 items-center rounded-full bg-forest-50 px-3 text-sm font-semibold text-forest-800">Đã lưu</span>
              ) : (
                <button onClick={() => save(e.voucher.id)} aria-label={`Lưu mã ${e.voucher.code}`} className="min-h-11 rounded-full bg-forest-900 px-5 text-sm font-bold text-champagne-100 hover:bg-forest-800">
                  Lưu
                </button>
              )
            }
          />
        </li>
      ))}
    </Strip>
  );
}

/** Shop HTX đang có sản phẩm bán: tên, vùng, số sản phẩm, điểm đánh giá, người theo dõi. */
function CoopStrip() {
  const { state } = useStore();
  const { openModal } = useUi();
  const shops = state.coops
    .map((c) => coopShop(state, c.id))
    .filter((s): s is NonNullable<typeof s> => !!s && s.products.length > 0)
    .sort((a, b) => b.products.length - a.products.length || a.name.localeCompare(b.name, 'vi'));
  if (shops.length === 0) return null;
  return (
    <div id="shop-htx" style={{ scrollMarginTop: 'calc(var(--app-header-h, 0px) + var(--customer-bar-h, 0px) + 4.75rem)' }}>
      <Strip id="shop-htx-tieu-de" title="Shop HTX" icon={Store}>
        {shops.map((s) => (
          <li key={s.id} className="w-64 shrink-0">
            <div className="flex h-full flex-col gap-3 rounded-3xl bg-white p-3.5 shadow-[0_1px_2px_rgb(0,0,0,0.04),0_10px_26px_rgb(31,77,58,0.08)] ring-1 ring-champagne-200/80">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest-900 font-display text-lg font-semibold text-champagne-200 ring-2 ring-champagne-300">
                  {s.name.replace(/^HTX( mẫu)?\s*/i, '').charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-base font-semibold text-ink">{s.name}</span>
                  <span className="block truncate text-xs text-muted">{s.region}</span>
                </span>
              </div>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-700">
                <span>{s.products.length} sản phẩm</span>
                <span aria-hidden="true">·</span>
                {s.rating.average !== null ? (
                  <span className="flex items-center gap-0.5">
                    <Star size={12} aria-hidden="true" className="fill-champagne-500 text-champagne-500" /> {s.rating.average} ({s.rating.count})
                  </span>
                ) : (
                  <span>Chưa có đánh giá</span>
                )}
                <span aria-hidden="true">·</span>
                <span>{s.followers} người theo dõi</span>
              </p>
              <div aria-hidden="true" className="flex gap-1.5">
                {s.products.slice(0, 3).map((p) => (
                  <ProductImage key={p.id} product={p} className="aspect-square w-1/3 rounded-xl ring-1 ring-champagne-200" />
                ))}
              </div>
              <button
                onClick={() => openModal({ type: 'coop_shop', coopId: s.id })}
                aria-label={`Xem shop ${s.name}`}
                className="mt-auto flex min-h-11 items-center justify-center gap-1 rounded-2xl border border-champagne-300 text-sm font-bold text-forest-900 hover:bg-champagne-50"
              >
                Xem shop <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </Strip>
    </div>
  );
}

/** Sản phẩm đã xem gần đây trên máy này (localStorage), chỉ các sản phẩm còn đang bán. */
function RecentlyViewed() {
  const { state } = useStore();
  const { openModal, customerActor } = useUi();
  const customerId = customerActor.id ?? '';
  const keys = useViewerList('recently-viewed', customerId);
  const items = keys.flatMap((key) => {
    const family = state.products.filter((p) => familyKey(p) === key && p.status === 'active');
    return family.length > 0 ? [representative(state, family.sort((a, b) => a.price - b.price))] : [];
  });
  if (items.length === 0) return null;
  return (
    <Strip
      id="da-xem"
      title="Đã xem gần đây"
      icon={History}
      action={
        <button onClick={() => clearViewerList('recently-viewed', customerId)} className="min-h-11 min-w-11 shrink-0 px-2 text-sm font-semibold text-stone-600 hover:text-ink">
          Xoá
        </button>
      }
    >
      {items.map((p) => (
        <li key={p.id} className="w-32 shrink-0 sm:w-36">
          <button
            onClick={() => openModal({ type: 'product_detail', productId: p.id })}
            aria-label={`Xem lại ${p.name}`}
            className="flex w-full flex-col gap-1.5 rounded-2xl bg-white p-1.5 text-left ring-1 ring-champagne-200 hover:ring-champagne-400"
          >
            <span aria-hidden="true">
              <ProductImage product={p} variant="card" className="block aspect-square w-full rounded-xl" />
            </span>
            <span className="line-clamp-2 min-h-[2.5rem] px-1 text-sm font-semibold leading-tight text-ink">{p.name}</span>
            <span className="px-1 pb-1 text-sm font-semibold tabular-nums text-forest-900">{formatMoney(familyPrice(state, p))}</span>
          </button>
        </li>
      ))}
    </Strip>
  );
}

/**
 * Thẻ sản phẩm: khung ảnh hình vòm viền vàng, tên chữ có chân căn giữa, điểm đánh giá, giá và nút thêm vào giỏ;
 * trái tim Yêu thích ở góc. Đã có trong giỏ thì thẻ hiện − / số / + để tăng giảm tại chỗ.
 * Dùng lại ở "Có thể bạn cũng thích" của Đơn mua và trang shop HTX.
 * Sản phẩm có nhiều quy cách: thẻ hiện các quy cách và giá "từ …"; nút + mở trang chi tiết để chọn quy cách.
 */
export function ProductCard({ product: p, showCoop = true }: { product: Product; showCoop?: boolean }) {
  const { state } = useStore();
  const { openModal } = useUi();
  const { add, cart, update, remove } = useCartActions();
  const family = listedFamilyOf(state, p);
  const variants = family.length > 0 ? family : [p];
  const multi = variants.length > 1;
  const remaining = remainingFor(state, p);
  const soldOut = multi ? variants.every((v) => remainingFor(state, v) <= 0 || !isOrderableIn(state, v)) : remaining <= 0 || !isOrderableIn(state, p);
  const coop = state.coops.find((c) => c.id === p.coopId);
  const inCart = soldOut || multi ? undefined : cart.find((l) => l.productId === p.id);
  const range = priceRange(variants);
  const rating = familyRating(state, p);

  return (
    <article className="group relative flex flex-col rounded-[28px] bg-white p-2 shadow-[0_1px_2px_rgb(0,0,0,0.04),0_14px_34px_rgb(31,77,58,0.08)] ring-1 ring-champagne-200/80 transition hover:shadow-[0_1px_2px_rgb(0,0,0,0.04),0_18px_40px_rgb(31,77,58,0.14)]">
      <button
        type="button"
        onClick={() => openModal({ type: 'product_detail', productId: p.id })}
        aria-label={`Xem ${p.name}`}
        className="flex flex-1 flex-col rounded-[22px] text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
      >
        <div className="relative w-full overflow-hidden rounded-t-full rounded-b-[20px] ring-1 ring-champagne-300/70">
          <ProductImage product={p} variant="card" className="aspect-[4/5] w-full transition duration-500 group-hover:scale-[1.03]" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-1.5 rounded-t-full rounded-b-[16px] border border-white/70" />
          <div className="absolute inset-x-0 bottom-2.5 flex flex-col items-center gap-1">
            {p.kind === 'preorder' && <span className="rounded-full bg-forest-950/85 px-2.5 py-0.5 text-xs font-bold text-champagne-200 ring-1 ring-champagne-400/60">Đặt trước</span>}
            {soldOut && <span className="rounded-full bg-ink/85 px-2.5 py-0.5 text-xs font-bold text-white">{isOrderableIn(state, p) ? 'Hết hàng' : 'Tạm ngừng bán'}</span>}
          </div>
        </div>
        <div className="flex w-full flex-1 flex-col items-center gap-1 px-1.5 pt-3 pb-1">
          <span className="w-full truncate text-xs font-semibold uppercase tracking-[0.14em] text-champagne-700">{p.region}</span>
          <h3 className="line-clamp-2 font-display text-[1.05rem] font-semibold leading-snug text-ink">{p.name}</h3>
          {rating.average !== null && (
            <span className="flex items-center gap-1 text-xs text-stone-700">
              <Star size={12} aria-hidden="true" className="fill-champagne-500 text-champagne-500" />
              <span className="font-semibold">{rating.average}</span> ({rating.count} đánh giá)
            </span>
          )}
          {multi && <VariantChips variants={variants} />}
          {p.kind === 'preorder' && (
            <div className="mt-1 w-full text-left">
              <PreorderProgress product={p} compact />
            </div>
          )}
        </div>
      </button>
      <FavoriteButton product={p} className="absolute top-0.5 right-0.5 z-10" />
      {/* Tên HTX nằm ngoài nút "Xem" để bấm riêng mở trang HTX. */}
      {showCoop && coop && <CoopNameButton coopId={coop.id} name={coop.name} className="mx-auto justify-center px-1 text-xs" />}
      <div className={`mt-1 space-y-2 border-t border-champagne-200/80 pt-2 pb-0.5 ${inCart ? 'px-0' : 'px-0.5 min-[360px]:px-1.5'}`}>
        <div className="flex min-h-11 items-center justify-between gap-1 min-[360px]:gap-2">
          <div className="min-w-0">
            <span className={`block font-display font-semibold tabular-nums text-forest-900 min-[390px]:whitespace-nowrap ${multi ? 'text-sm min-[390px]:text-base' : 'text-sm min-[390px]:text-lg'}`}>
              {multi && range.min !== range.max && <span className="font-sans text-xs font-normal text-muted">từ </span>}
              {formatMoney(multi ? range.min : p.price)}
            </span>
            <span className="block truncate text-xs text-muted">
              {multi ? `${variants.length} quy cách` : `/${p.unit}`}
              {isSamplePrice(p) && <span className="font-semibold text-champagne-800"> · giá mẫu</span>}
            </span>
          </div>
          {!inCart && (
            <button
              disabled={soldOut}
              onClick={() => (multi ? openModal({ type: 'product_detail', productId: p.id }) : add(p.id, 1))}
              aria-label={multi ? `Chọn quy cách ${p.name}` : `Thêm ${p.name} vào giỏ`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-900 text-champagne-200 ring-1 ring-champagne-400/60 transition hover:bg-forest-700 disabled:bg-stone-300 disabled:text-stone-600 disabled:ring-0"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
        {inCart && <QuantityStepper value={inCart.quantity} max={remaining} onChange={(quantity) => update(p.id, { quantity })} onRemove={() => remove(p.id)} itemName={p.name} compact />}
      </div>
    </article>
  );
}

/** Ô nhập giá cho khoảng giá tự nhập: chỉ nhận số, hiện dấu chấm phân cách nghìn. */
function PriceInput({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      aria-label={label}
      placeholder={placeholder}
      inputMode="numeric"
      value={value}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
        onChange(digits ? Number(digits).toLocaleString('vi-VN') : '');
      }}
      className="min-h-11 w-28 rounded-full border border-champagne-300/80 bg-white px-3 text-base tabular-nums text-ink focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 md:text-sm"
    />
  );
}

/** Các quy cách của sản phẩm trên thẻ (tối đa 3, còn lại ghi "+N"). */
function VariantChips({ variants }: { variants: Product[] }) {
  const shown = variants.slice(0, 3);
  return (
    <ul aria-label="Quy cách" className="mt-0.5 flex w-full flex-wrap justify-center gap-1">
      {shown.map((v) => (
        <li key={v.id} className="rounded-full border border-champagne-300 bg-champagne-50 px-2 py-0.5 text-xs font-semibold text-champagne-900">
          {v.unit}
        </li>
      ))}
      {variants.length > shown.length && <li className="px-1 py-0.5 text-xs font-semibold text-champagne-900">+{variants.length - shown.length}</li>}
    </ul>
  );
}
