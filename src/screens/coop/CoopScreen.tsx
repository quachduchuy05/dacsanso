import { useState } from 'react';
import { useUi } from '../../app/UiContext';
import { PAGE_X } from '../../app/layout';
import { ChatInbox } from '../../components/ChatInbox';
import { ListBoundary } from '../../components/ListBoundary';
import { totalUnread } from '../../store/commands/coopChat';
import { coopPhonesOf, formatContactPhone } from '../../store/commands/coopContact';
import { useStore } from '../../store/AppDataContext';
import { CoopOrdersTab } from './CoopOrdersTab';
import { CoopProductsTab } from './CoopProductsTab';
import { CoopProfileTab } from './CoopProfileTab';
import { CoopReviewsTab } from './CoopReviewsTab';
import { CoopSalesTab } from './CoopSalesTab';
import { CoopTicketsTab } from './CoopTicketsTab';
import { CoopWalletTab } from './CoopWalletTab';

type CoopTab = 'orders' | 'messages' | 'products' | 'sales' | 'tickets' | 'reviews' | 'wallet' | 'profile';
const TABS: { key: CoopTab; label: string }[] = [
  { key: 'orders', label: 'Đơn hàng' },
  { key: 'messages', label: 'Tin nhắn' },
  { key: 'products', label: 'Sản phẩm' },
  { key: 'sales', label: 'Bán chạy' },
  { key: 'tickets', label: 'Khiếu nại' },
  { key: 'reviews', label: 'Đánh giá' },
  { key: 'wallet', label: 'Đối soát' },
  { key: 'profile', label: 'Hồ sơ' },
];

/** Kênh HTX. Điện thoại: thẻ HTX và lưới mục ở trên. Máy tính: thẻ HTX và danh sách mục ở cột trái, nội dung chiếm phần còn lại. */
export function CoopScreen() {
  const { state } = useStore();
  const { coopId, coopActor } = useUi();
  const [tab, setTab] = useState<CoopTab>('orders');
  const coop = state.coops.find((c) => c.id === coopId);
  const pendingConfirm = state.orders.filter((o) => o.coopId === coopId && o.status === 'awaiting_confirmation').length;
  const unreadChats = totalUnread(state, coopActor);
  const badges: Partial<Record<CoopTab, { count: number; label: string }>> = {
    orders: { count: pendingConfirm, label: 'đơn chờ xác nhận' },
    messages: { count: unreadChats, label: 'tin nhắn chưa đọc' },
  };

  return (
    <div className={`flex flex-1 flex-col gap-4 py-4 lg:flex-row lg:gap-6 ${PAGE_X}`}>
      <aside className="space-y-4 lg:sticky lg:top-[calc(var(--app-header-h,0px)+1rem)] lg:w-64 lg:shrink-0 lg:self-start">
        <div className="lattice relative space-y-1.5 overflow-hidden rounded-3xl bg-forest-950 p-4 pb-6 text-white shadow-md">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne-300">Kênh HTX</span>
          <h2 className="font-display text-2xl font-semibold">{coop?.name}</h2>
          <p className="text-sm text-forest-100">
            Vùng {coop?.region} · Tài khoản nhận chi trả {coop?.payoutAccountMasked}
          </p>
          {coop && coopPhonesOf(coop).length > 0 && <p className="text-sm tabular-nums text-forest-100">SĐT cửa hàng: {coopPhonesOf(coop).map(formatContactPhone).join(' · ')}</p>}
          <div aria-hidden="true" className="brocade-dark absolute inset-x-0 bottom-0 h-2" />
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-200/70 p-1 text-sm font-medium min-[360px]:grid-cols-4 lg:flex lg:flex-col" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`relative min-h-11 whitespace-nowrap rounded-xl px-1 lg:flex lg:items-center lg:justify-between lg:px-3 lg:text-left ${tab === t.key ? 'bg-white font-bold text-ink shadow-xs' : 'text-stone-700 lg:hover:bg-white/60'}`}
            >
              {t.label}
              {/* Số đơn chờ xác nhận, tin chưa đọc: chấm ở góc tab để chữ không bị xuống dòng khi chia 4 cột. */}
              {(badges[t.key]?.count ?? 0) > 0 && (
                <span className="absolute -top-1 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-champagne-600 px-1 text-xs font-bold text-white lg:static">
                  {badges[t.key]!.count}
                  <span className="sr-only"> {badges[t.key]!.label}</span>
                </span>
              )}
            </button>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <ListBoundary key={tab} label="mục này" resetKey={state}>
          {tab === 'orders' && <CoopOrdersTab />}
          {tab === 'messages' && <ChatInbox side="coop" />}
          {tab === 'products' && <CoopProductsTab />}
          {tab === 'sales' && <CoopSalesTab />}
          {tab === 'tickets' && <CoopTicketsTab />}
          {tab === 'reviews' && <CoopReviewsTab />}
          {tab === 'wallet' && <CoopWalletTab />}
          {tab === 'profile' && <CoopProfileTab />}
        </ListBoundary>
      </div>
    </div>
  );
}
