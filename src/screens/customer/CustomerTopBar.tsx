import { useEffect, useRef } from 'react';
import { MapPin, ShoppingBag, User } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { PAGE_X } from '../../app/layout';
import { defaultAddressOf } from '../../store/commands/address';
import { snapshotAddress } from '../../domain/state';
import { useStore } from '../../store/AppDataContext';

export function CustomerTopBar() {
  const { state } = useStore();
  const { openModal, customerActor, setCustomerTab } = useUi();
  const address = defaultAddressOf(state, customerActor.id!);
  const cartCount = (state.carts[customerActor.id!] ?? []).reduce((s, l) => s + l.quantity, 0);

  // Chiều cao thanh này, để hàng tab của "Đơn mua" dính ngay bên dưới khi cuộn.
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const sync = () => document.documentElement.style.setProperty('--customer-bar-h', `${el.offsetHeight}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={barRef}
      className={`sticky top-[var(--app-header-h,0px)] z-30 flex items-center justify-between gap-2 border-b border-champagne-200/80 bg-ivory/90 py-1.5 backdrop-blur-md ${PAGE_X}`}
    >
      <button onClick={() => openModal({ type: 'address_book' })} className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 text-left">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-900 text-champagne-300">
          <MapPin size={15} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-champagne-700">Nhận hàng tại (Hà Nội)</span>
          <span className="block truncate text-sm font-bold text-forest-900">{address ? snapshotAddress(state, address).text : 'Thêm địa chỉ giao hàng'}</span>
        </span>
      </button>
      <button
        onClick={() => openModal({ type: 'cart' })}
        aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-stone-100"
      >
        <ShoppingBag size={20} className="text-forest-900" />
        {cartCount > 0 && (
          <span className="absolute top-1 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-champagne-600 px-1 text-xs font-bold text-white">{cartCount}</span>
        )}
      </button>
      <button
        onClick={() => setCustomerTab('account')}
        aria-label="Tài khoản"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100"
      >
        <User size={18} />
      </button>
    </div>
  );
}
