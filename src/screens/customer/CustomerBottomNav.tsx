import { Sparkles, User, Wheat, type LucideIcon } from 'lucide-react';
import { useUi, type CustomerTab } from '../../app/UiContext';

const TABS: { key: CustomerTab; label: string; Icon: LucideIcon }[] = [
  { key: 'explore', label: 'Khám phá', Icon: Sparkles },
  { key: 'season', label: 'Vụ mùa', Icon: Wheat },
  { key: 'account', label: 'Tài khoản', Icon: User },
];

/**
 * Thanh tab của khách: nền xanh rừng đậm, tab đang mở có quả trám vàng phía trên. Trên máy tính là thanh nổi bo tròn.
 * Đơn mua nằm trong Tài khoản (chủ repo yêu cầu gộp), nên thanh còn 3 mục.
 */
export function CustomerBottomNav() {
  const { customerTab, setCustomerTab } = useUi();
  return (
    <nav
      aria-label="Điều hướng khách hàng"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[640px] items-center justify-around border-t border-champagne-400/40 bg-forest-950/95 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(14,37,27,0.18)] backdrop-blur-md md:bottom-4 md:max-w-md md:rounded-full md:border md:px-3 md:pb-1.5"
    >
      {TABS.map(({ key, label, Icon }) => {
        const active = customerTab === key;
        return (
          <button
            key={key}
            onClick={() => setCustomerTab(key)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-xl px-3 transition-colors md:rounded-full ${active ? 'font-bold text-champagne-300' : 'font-medium text-forest-200 hover:text-white'}`}
          >
            {active && <span aria-hidden="true" className="absolute top-0 h-1.5 w-1.5 rotate-45 bg-champagne-400" />}
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            <span className="text-xs">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
