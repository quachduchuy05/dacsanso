import {AccountSecuritySettings} from '../../app/PasswordTools';
import { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, ChevronRight, ClipboardCheck, FileText, Heart, LogOut, MapPin, MessageCircle, MessageSquareWarning, Package, ShoppingBag, Sprout, Star, TicketPercent, Truck, UserRound, type LucideIcon } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { PAGE_X } from '../../app/layout';
import { BrocadeBand } from '../../components/Brand';
import { ErrorState } from '../../components/EmptyState';
import { ListBoundary } from '../../components/ListBoundary';
import { Field, Input, PrimaryButton, SecondaryButton } from '../../components/form';
import { updateCustomerProfile } from '../../store/commands/account';
import { listOrdersFor } from '../../domain/access';
import { loginIdentityLabel } from '../../domain/auth';
import { totalUnread } from '../../store/commands/coopChat';
import { isTicketOpen } from '../../store/commands/complaint';
import { favoriteItems, followedCoops, voucherWallet } from '../../store/commands/marketplace';
import { ordersAwaitingReview, tabCounts, type OrderTabKey } from '../../store/commands/orderTabs';
import { seasonWatchItems } from '../../store/commands/seasonWatch';
import { useStore } from '../../store/AppDataContext';
import { BankLinkSection } from './BankLinkSection';
import { OrdersSection } from './OrdersSection';

/**
 * Tài khoản của khách: thông tin cá nhân (FR-TK-03); "Đơn mua" gồm biểu tượng trạng thái và danh sách đơn (FR-DH-01),
 * "Tiện ích của tôi" (theo video mẫu của chủ repo; thêm Yêu thích, Kho voucher kiểu sàn TMĐT); liên kết ngân hàng nhận hoàn (mô phỏng); sổ địa chỉ (FR-TK-04); đăng xuất.
 */
export function AccountTab() {
  const { state, run } = useStore();
  const { customerActor, logout, showToast } = useUi();
  const customer = state.customers.find((c) => c.id === customerActor.id);
  const account = state.users.find((u) => u.id === customerActor.userId);
  const addressCount = state.addresses.filter((a) => a.customerId === customerActor.id).length;
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(customer?.name ?? '');
  if (!customer) return null;
  // Chữ viết tắt cho vòng tròn đại diện: chữ đầu của từ đầu và từ cuối trong tên.
  const words = customer.name.trim().split(/\s+/);
  const initials = (words[0]?.[0] ?? '') + (words.length > 1 ? (words[words.length - 1][0] ?? '') : '');

  return (
    <div className={`w-full space-y-4 pt-5 pb-8 md:pt-8 ${PAGE_X}`}>
      <AccountSecuritySettings/>
      <section className="relative overflow-hidden rounded-[28px] bg-forest-950 px-5 pt-5 pb-8 text-white shadow-[0_20px_50px_rgb(14,37,27,0.25)]" aria-labelledby="thong-tin-ca-nhan">
        <div aria-hidden="true" className="lattice absolute inset-0" />
        <div className="relative flex items-center gap-4">
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-forest-900 font-display text-2xl font-semibold text-champagne-200 ring-2 ring-champagne-400/80 ring-offset-2 ring-offset-forest-950">
            {initials.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="thong-tin-ca-nhan" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-champagne-300">
              <UserRound size={14} aria-hidden="true" /> Thông tin cá nhân
            </h2>
            <p className="font-display text-xl font-semibold leading-tight sm:text-2xl">{customer.name}</p>
          </div>
        </div>
        <div className="relative mt-3 flex items-end justify-between gap-3">
          <p className="text-sm text-forest-100">
            {account?.supabaseId ? `Đăng nhập: ${account.emailMasked || account.phone}` : account?.google
              ? `Đăng nhập bằng ${loginIdentityLabel(account)}`
              : `SĐT: ${customer.phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')} (dùng để đăng nhập, không đổi tại đây)`}
          </p>
          {!editingName && (
            <button
              onClick={() => {
                setName(customer.name);
                setEditingName(true);
              }}
              className="min-h-11 shrink-0 rounded-full border border-champagne-400/60 px-4 text-sm font-semibold text-champagne-100 hover:bg-white/5"
            >
              Sửa
            </button>
          )}
        </div>
        <BrocadeBand className="absolute inset-x-0 bottom-0" />
      </section>

      {editingName && (
        <section className="space-y-2 rounded-3xl border border-champagne-200 bg-white p-4 shadow-xs lg:max-w-2xl" aria-label="Sửa thông tin cá nhân">
          <Field label="Họ tên">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setEditingName(false)}>Huỷ</SecondaryButton>
            <PrimaryButton
              className="flex-1"
              onClick={async () => {
                const r = await run((s) => updateCustomerProfile(s, customerActor, name));
                showToast(r.ok ? 'Đã lưu thông tin.' : r.error);
                if (r.ok) setEditingName(false);
              }}
            >
              Lưu
            </PrimaryButton>
          </div>
        </section>
      )}

      {/* Điện thoại: Đơn mua (biểu tượng + danh sách đơn), Tiện ích, tài khoản ngân hàng, đăng xuất.
          Máy tính: Đơn mua ở cột rộng bên trái, các mục còn lại ở cột phải. */}
      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start lg:gap-6 lg:space-y-0">
        {/* Dữ liệu đơn hỏng thì chỉ khung Đơn mua báo lỗi; thông tin cá nhân, Tiện ích, Đăng xuất vẫn dùng được. */}
        <ListBoundary label="đơn mua" resetKey={state}>
          <OrdersBlock />
        </ListBoundary>

        <div className="space-y-4">
          <Utilities addressCount={addressCount} />
          <BankLinkSection />
          <button onClick={logout} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-white/70 text-sm font-bold text-rose-800 hover:bg-rose-50">
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}

/** Biểu tượng trạng thái đơn kiểu "Đơn mua" (theo video mẫu của chủ repo): bấm để lọc danh sách đơn ngay bên dưới. */
const SHORTCUTS: { tab: OrderTabKey; label: string; icon: LucideIcon; review?: boolean }[] = [
  { tab: 'confirm', label: 'Chờ xác nhận', icon: ClipboardCheck },
  { tab: 'harvest', label: 'Chờ thu hoạch', icon: Sprout },
  { tab: 'pickup', label: 'Chờ lấy hàng', icon: Package },
  { tab: 'shipping', label: 'Đang giao', icon: Truck },
  { tab: 'delivered', label: 'Đánh giá', icon: Star, review: true },
];

function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span aria-hidden="true" className="absolute -top-1.5 -right-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-champagne-600 px-1 text-xs font-bold text-white">
      {n > 99 ? '99+' : n}
    </span>
  );
}

/** Chiều cao phần dính trên cùng (header + thanh "Nhận hàng tại"), để cuộn danh sách đơn tới ngay bên dưới. */
function stickyTop(): number {
  const css = getComputedStyle(document.documentElement);
  return (parseFloat(css.getPropertyValue('--app-header-h')) || 0) + (parseFloat(css.getPropertyValue('--customer-bar-h')) || 0);
}

/**
 * Đơn mua trong Tài khoản (chủ repo yêu cầu gộp, không còn tab Đơn hàng riêng): biểu tượng trạng thái ở trên,
 * danh sách đơn có tab vuốt ngang ngay bên dưới. Bấm biểu tượng là đổi tab của danh sách; danh sách đang khuất
 * thì cuộn tới. Mở từ nơi khác (đặt hàng xong, thanh toán, gửi khiếu nại) thì luôn cuộn tới danh sách.
 */
function OrdersBlock() {
  const { state } = useStore();
  const { customerActor, openOrders, ordersFocus, takeOrdersFocus } = useUi();
  const listRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const listed = listOrdersFor(state, customerActor);
  const mine = listed.ok ? listed.value : [];
  const counts = tabCounts(mine);
  const toReview = ordersAwaitingReview(state, mine).length;

  useEffect(() => {
    const justOpened = !mounted.current;
    mounted.current = true;
    if (!takeOrdersFocus()) return;
    // Chạy sau effect cuộn về đầu trang khi đổi tab của màn khách.
    setTimeout(() => {
      const el = listRef.current;
      if (!el) return;
      const offset = stickyTop();
      const top = el.getBoundingClientRect().top;
      if (justOpened || top > window.innerHeight * 0.55 || top < offset) window.scrollTo({ top: window.scrollY + top - offset - 8, behavior: justOpened ? 'auto' : 'smooth' });
    }, 0);
  }, [ordersFocus, takeOrdersFocus]);

  return (
    <section aria-labelledby="don-mua" className="min-w-0 space-y-3">
      <div className="space-y-2 rounded-3xl border border-champagne-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <h3 id="don-mua" className="font-display text-lg font-semibold text-ink">
            Đơn mua
          </h3>
          <button onClick={() => openOrders('all')} className="-mr-2 flex min-h-11 items-center gap-0.5 rounded-full px-2 text-sm font-semibold text-forest-800 hover:bg-champagne-50">
            Xem tất cả đơn <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
        <ul className="grid grid-cols-5 gap-1">
          {SHORTCUTS.map((s) => {
            const n = s.review ? toReview : counts[s.tab];
            const Icon = s.icon;
            return (
              <li key={s.label}>
                <button
                  onClick={() => openOrders(s.tab)}
                  aria-label={`${s.label}${n > 0 ? `: ${n} đơn` : ''}`}
                  className="flex min-h-16 w-full flex-col items-center gap-1.5 rounded-2xl px-0.5 pt-2 pb-1.5 text-center hover:bg-champagne-50"
                >
                  <span className="relative text-forest-800">
                    <Icon size={24} strokeWidth={1.6} aria-hidden="true" />
                    <CountBadge n={n} />
                  </span>
                  <span className="text-xs leading-tight text-stone-700">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {counts.payment > 0 && (
          <button onClick={() => openOrders('payment')} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-2xl bg-champagne-100 px-3 text-left text-sm font-semibold text-champagne-900 hover:bg-champagne-200">
            Bạn có {counts.payment} đơn chờ thanh toán
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <div ref={listRef}>{listed.ok ? <OrdersSection orders={mine} counts={counts} /> : <ErrorState>{listed.error}</ErrorState>}</div>
    </section>
  );
}

/** Tiện ích của tôi: các mục hay dùng của khách, mở đúng sheet. */
function Utilities({ addressCount }: { addressCount: number }) {
  const { state, now } = useStore();
  const { customerActor, user, openModal } = useUi();
  const favorites = favoriteItems(state, customerActor.id!).length;
  const follows = followedCoops(state, customerActor.id!).length;
  const usableSaved = voucherWallet(state, customerActor.id!, now()).saved.filter((e) => e.status === 'usable').length;
  const watches = seasonWatchItems(state, customerActor.id!, now());
  const inSeason = watches.filter((w) => w.open).length;
  const invoice = state.customers.find((c) => c.id === customerActor.id)?.invoiceDefault;
  const cartCount = (state.carts[customerActor.id!] ?? []).reduce((s, l) => s + l.quantity, 0);
  const unread = user ? state.notifications.filter((n) => n.userId === user.id && !n.read).length : 0;
  const chats = totalUnread(state, customerActor);
  const mine = state.tickets.filter((t) => t.customerId === customerActor.id);
  const tickets = mine.length;
  const openTickets = mine.filter(isTicketOpen).length;
  const items: { label: string; sub: string; icon: LucideIcon; count?: number; open: () => void }[] = [
    { label: 'Sổ địa chỉ', sub: `${addressCount}/10 địa chỉ`, icon: MapPin, open: () => openModal({ type: 'address_book' }) },
    { label: 'Giỏ hàng', sub: cartCount > 0 ? `${cartCount} sản phẩm` : 'Đang trống', icon: ShoppingBag, count: cartCount, open: () => openModal({ type: 'cart' }) },
    {
      label: 'Yêu thích',
      sub: favorites + follows > 0 ? `${favorites} sản phẩm · ${follows} HTX` : 'Sản phẩm và HTX đã lưu',
      icon: Heart,
      open: () => openModal({ type: 'favorites' }),
    },
    { label: 'Kho voucher', sub: usableSaved > 0 ? `${usableSaved} mã dùng được` : 'Lưu mã ưu đãi', icon: TicketPercent, open: () => openModal({ type: 'voucher_wallet' }) },
    {
      label: 'Báo khi vào mùa',
      sub: inSeason > 0 ? `${inSeason} sản phẩm đã vào mùa` : watches.length > 0 ? `Đang chờ ${watches.length} sản phẩm` : 'Hàng đặt trước chưa mở',
      icon: BellRing,
      count: inSeason,
      open: () => openModal({ type: 'season_watch' }),
    },
    { label: 'Hoá đơn công ty', sub: invoice ? invoice.companyName : 'Thông tin xuất hoá đơn', icon: FileText, open: () => openModal({ type: 'invoice_default' }) },
    { label: 'Thông báo', sub: unread > 0 ? `${unread} chưa đọc` : 'Đã đọc hết', icon: Bell, count: unread, open: () => openModal({ type: 'notifications' }) },
    { label: 'Tin nhắn', sub: chats > 0 ? `${chats} tin chưa đọc` : 'Hỏi HTX', icon: MessageCircle, count: chats, open: () => openModal({ type: 'chat' }) },
    {
      label: 'Khiếu nại',
      sub: openTickets > 0 ? `${openTickets} đang xử lý` : tickets > 0 ? `${tickets} khiếu nại theo đơn` : 'Gửi CSKH',
      icon: MessageSquareWarning,
      count: openTickets,
      open: () => openModal({ type: 'complaints' }),
    },
  ];
  return (
    <section aria-labelledby="tien-ich" className="space-y-2 rounded-3xl border border-champagne-200 bg-white p-4 shadow-xs">
      <h3 id="tien-ich" className="font-display text-lg font-semibold text-ink">
        Tiện ích của tôi
      </h3>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.label}>
              <button onClick={it.open} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-champagne-100 bg-champagne-50/50 p-3 text-left hover:border-champagne-300">
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-900 text-champagne-300">
                  <Icon size={17} aria-hidden="true" />
                  <CountBadge n={it.count ?? 0} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{it.label}</span>
                  <span className="block truncate text-xs text-muted">{it.sub}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
