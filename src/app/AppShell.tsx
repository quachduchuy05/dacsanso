import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Bell, FlaskConical, LogOut } from 'lucide-react';
import { BrandEmblem, BrandWordmark } from '../components/Brand';
import { DemoBand } from '../components/DemoBand';
import { ListBoundary } from '../components/ListBoundary';
import { Toast } from '../components/Toast';
import { ACCOUNT_ROLE_LABEL, ADMIN_GROUP_LABEL } from '../domain/types';
import { CustomerScreen } from '../screens/customer/CustomerScreen';
import { useStore } from '../store/AppDataContext';
import { lazyWithReload } from './chunkReload';
import { PAGE_X } from './layout';
import { StorefrontHeader } from '../screens/customer/StorefrontHeader';
import {api} from '../store/backend';
import {AccountSecuritySettings} from './PasswordTools';
import { LoginScreen } from './LoginScreen';
import { ModalHost } from './ModalHost';
import { useUi } from './UiContext';

// Màn HTX, Admin, QLNN tải riêng theo vai trò, để khách trên điện thoại không phải tải mã của các màn này.
const CoopScreen = lazy(lazyWithReload(() => import('../screens/coop/CoopScreen').then((m) => ({ default: m.CoopScreen }))));
const AdminScreen = lazy(lazyWithReload(() => import('../screens/admin/AdminScreen').then((m) => ({ default: m.AdminScreen }))));
const RegulatorScreen = lazy(lazyWithReload(() => import('../screens/regulator/RegulatorScreen').then((m) => ({ default: m.RegulatorScreen }))));
const ShipperScreen = lazy(lazyWithReload(() => import('../screens/shipper/ShipperScreen').then((m) => ({ default: m.ShipperScreen }))));

/**
 * Khung app. Không có thanh chuyển vai trò công khai: vai trò theo tài khoản đăng nhập (mục 5.9).
 * Mọi vai trò dùng toàn bộ bề rộng màn hình trên máy tính: trang giãn ra lưới nhiều cột thay vì một cột hẹp như điện thoại;
 * HTX có thanh mục bên trái từ màn hình lớn.
 */
export function AppShell() {
  const { state, syncNotice, clearSyncNotice } = useStore();
  const { user, logout, openModal, showToast } = useUi();
  const [guestBrowsing, setGuestBrowsing] = useState(!['/dang-nhap','/dang-ky'].includes(window.location.pathname));
  useEffect(() => {
    const authPath=()=>['/dang-nhap','/dang-ky'].includes(window.location.pathname);
    const browse=()=>{if(authPath()){history.pushState(null,'','/');window.dispatchEvent(new PopStateEvent('popstate'));}setGuestBrowsing(true);};
    const login=()=>{if(!authPath()){history.pushState(null,'','/dang-nhap');window.dispatchEvent(new PopStateEvent('popstate'));}setGuestBrowsing(false);};
    const sync=()=>setGuestBrowsing(!authPath());
    window.addEventListener('browse-catalog',browse);window.addEventListener('show-login',login);window.addEventListener('backend-logout',browse);window.addEventListener('popstate',sync);
    return()=>{window.removeEventListener('browse-catalog',browse);window.removeEventListener('show-login',login);window.removeEventListener('backend-logout',browse);window.removeEventListener('popstate',sync);};
  },[]);
  const storefront = !user || user.role === 'customer';
  const unread = user ? state.notifications.filter((n) => n.userId === user.id && !n.read).length : 0;
  const roleText = user ? (user.role === 'admin' && user.adminGroup ? `Admin – ${ADMIN_GROUP_LABEL[user.adminGroup]}` : ACCOUNT_ROLE_LABEL[user.role]) : '';

  // Chiều cao header (có dải demo, có thể xuống 2 dòng trên điện thoại) để thanh dính bên dưới nằm ngay dưới header.
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const sync = () => document.documentElement.style.setProperty('--app-header-h', `${el.offsetHeight}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Thao tác bị bỏ khi đồng bộ dữ liệu dùng chung (máy khác vừa đổi dữ liệu): báo cho người dùng.
  useEffect(() => {
    if (!syncNotice) return;
    showToast(syncNotice);
    clearSyncNotice();
  }, [syncNotice, showToast, clearSyncNotice]);

  // Đăng nhập, đăng xuất thì về đầu trang (màn đăng nhập dài, không giữ vị trí cuộn sang màn mới).
  // Thân hàm để trong ngoặc nhọn: Chrome mới cho window.scrollTo trả về Promise; nếu effect trả về giá trị đó,
  // React coi là hàm dọn dẹp và gọi nó khi đổi tài khoản → lỗi "… is not a function" (sửa lỗi bản web 18/10/2026).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [user?.id]);

  // Link chia sẻ sản phẩm (FR-TKSP-05): #/san-pham/<mã>. Chưa đăng nhập thì giữ link, mở sau khi khách đăng nhập.
  useEffect(() => {
    const open = async () => {
      const lot=window.location.hash.match(/^#\/lo-hang\/([\w-]+)$/);
      if(lot){if(!state.products.length)return;try{const r=await api('/api/v1/lots/'+lot[1]);openModal({type:'trace_lot',productId:r.product.id,lotId:lot[1]});history.replaceState(null,'',window.location.pathname+window.location.search);}catch(e){showToast(e instanceof Error?e.message:'Không mở được lô hàng.');}return;}
      const m = window.location.hash.match(/^#\/san-pham\/([\w-]+)$/);
      if (!m || (user && user.role !== 'customer') || !state.products.length) return;
      if (state.products.some((p) => p.id === m[1] && p.status === 'active')) openModal({ type: 'product_detail', productId: m[1] });
      else showToast('Sản phẩm trong link không còn mở bán.');
      history.replaceState(null, '', window.location.pathname + window.location.search);
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, state.products]);

  return (
    <div className={`flex min-h-dvh flex-col text-ink ${storefront ? 'shop-shell' : 'bg-stone-100'}`}>
      <header ref={headerRef} className={storefront ? "shop-site-header" : "sticky top-0 z-40 bg-forest-950 text-forest-100"}>{storefront ? <StorefrontHeader /> : <><DemoBand />

        <div className={`flex w-full items-center gap-1 py-1.5 ${PAGE_X}`}>
          {/* Logo và chữ thương hiệu. Trên điện thoại, tài khoản HTX / Admin / QLNN hiện tên và vai trò thay cho chữ thương hiệu. */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <BrandEmblem size={38} />
            <span className={storefront ? 'flex' : 'hidden sm:flex'}>
              <BrandWordmark />
            </span>
            {user && (
              <span className={`min-w-0 ${storefront ? 'hidden md:block' : 'block'} sm:ml-1 sm:border-l sm:border-champagne-400/30 sm:pl-3`}>
                <span className="block truncate text-sm font-bold text-white">{user.name}</span>
                <span className="block truncate text-xs text-forest-200">{roleText}</span>
              </span>
            )}
          </div>
          {user && (
            <button
              onClick={() => openModal({ type: 'notifications' })}
              aria-label={`Thông báo, ${unread} chưa đọc`}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-forest-100 hover:bg-forest-900"
            >
              <Bell size={20} />
              {unread > 0 && <span className="absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-champagne-500 px-1 text-xs font-bold text-ink">{unread}</span>}
            </button>
          )}
          <button
            onClick={() => openModal({ type: 'demo_panel' })}
            aria-label="Công cụ demo: tua thời gian, mô phỏng cổng thanh toán, khôi phục dữ liệu mẫu"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-champagne-400/50 px-2.5 text-sm font-semibold text-champagne-300 hover:bg-forest-900"
          >
            <FlaskConical size={16} />
            <span className="hidden sm:inline">Công cụ demo</span>
          </button>
          {user && (
            <button
              onClick={() => {
                logout();
                showToast('Đã đăng xuất.');
              }}
              aria-label="Đăng xuất"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm text-forest-100 hover:bg-forest-900"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          )}
        </div>
        <div aria-hidden="true" className="brocade-dark h-2.5 border-t border-forest-950" />
      </>}</header>

      <main className={`flex w-full flex-1 flex-col ${storefront ? '' : 'bg-ivory'}`}>
        {user&&user.role!=='customer'&&<AccountSecuritySettings/>}
        <ListBoundary key={user?.id ?? 'guest'} label="màn này" resetKey={state}>
          <Suspense fallback={<p className="p-6 text-center text-sm text-stone-600">Đang tải…</p>}>
            {!user && !guestBrowsing && <LoginScreen />}
            {!user && guestBrowsing && <CustomerScreen />}
            {user?.role === 'customer' && <CustomerScreen />}
            {user?.role === 'coop' && <CoopScreen />}
            {user?.role === 'regulator' && <RegulatorScreen />}
            {user?.role === 'shipper' && <ShipperScreen />}
            {user?.role === 'admin' && <AdminScreen />}
          </Suspense>
        </ListBoundary>
      </main>

      <ModalHost />
      <Toast />
    </div>
  );
}
