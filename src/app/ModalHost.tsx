import { lazy, Suspense } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { DemoPanel } from '../components/DemoPanel';
import { ListBoundary } from '../components/ListBoundary';
import { NotificationsSheet } from '../components/NotificationsSheet';
import { AddressBookSheet } from '../screens/customer/AddressBookSheet';
import { AddressFormSheet } from '../screens/customer/AddressFormSheet';
import { CartSheet } from '../screens/customer/CartSheet';
import { PaymentSheet } from '../screens/customer/PaymentSheet';
import { ProductDetailSheet } from '../screens/customer/ProductDetailSheet';
import { TraceLotSheet } from '../screens/customer/TraceLotSheet';
import { useStore } from '../store/AppDataContext';
import { lazyWithReload } from './chunkReload';
import { useUi } from './UiContext';

// Sheet ít mở hoặc chỉ dùng ở màn HTX: tải khi mở lần đầu, để phần tải ban đầu của app nhẹ hơn.
const CheckoutSheet = lazy(lazyWithReload(() => import('../screens/customer/CheckoutSheet').then((m) => ({ default: m.CheckoutSheet }))));
const OrderDetailSheet = lazy(lazyWithReload(() => import('../screens/customer/OrderDetailSheet').then((m) => ({ default: m.OrderDetailSheet }))));
const ComplaintSheet = lazy(lazyWithReload(() => import('../screens/customer/ComplaintSheet').then((m) => ({ default: m.ComplaintSheet }))));
const ComplaintsSheet = lazy(lazyWithReload(() => import('../screens/customer/ComplaintsSheet').then((m) => ({ default: m.ComplaintsSheet }))));
const ReviewSheet = lazy(lazyWithReload(() => import('../screens/customer/ReviewSheet').then((m) => ({ default: m.ReviewSheet }))));
const CoopOrderSheet = lazy(lazyWithReload(() => import('../screens/coop/CoopOrderSheet').then((m) => ({ default: m.CoopOrderSheet }))));
const CoopHarvestSheet = lazy(lazyWithReload(() => import('../screens/coop/CoopHarvestSheet').then((m) => ({ default: m.CoopHarvestSheet }))));
const ShipperOrderSheet = lazy(lazyWithReload(() => import('../screens/shipper/ShipperOrderSheet').then((m) => ({ default: m.ShipperOrderSheet }))));
const CoopProductFormSheet = lazy(lazyWithReload(() => import('../screens/coop/CoopProductFormSheet').then((m) => ({ default: m.CoopProductFormSheet }))));
const CoopApplySheet = lazy(lazyWithReload(() => import('../screens/coopApply/CoopApplySheet').then((m) => ({ default: m.CoopApplySheet }))));
const CoopApplyStatusSheet = lazy(lazyWithReload(() => import('../screens/coopApply/CoopApplyStatusSheet').then((m) => ({ default: m.CoopApplyStatusSheet }))));
const ChatSheet = lazy(lazyWithReload(() => import('../components/ChatSheet').then((m) => ({ default: m.ChatSheet }))));
const CoopShopSheet = lazy(lazyWithReload(() => import('../screens/customer/CoopShopSheet').then((m) => ({ default: m.CoopShopSheet }))));
const FavoritesSheet = lazy(lazyWithReload(() => import('../screens/customer/FavoritesSheet').then((m) => ({ default: m.FavoritesSheet }))));
const VoucherWalletSheet = lazy(lazyWithReload(() => import('../screens/customer/VoucherWalletSheet').then((m) => ({ default: m.VoucherWalletSheet }))));
const SeasonWatchSheet = lazy(lazyWithReload(() => import('../screens/customer/SeasonWatchSheet').then((m) => ({ default: m.SeasonWatchSheet }))));
const InvoiceDefaultSheet = lazy(lazyWithReload(() => import('../screens/customer/InvoiceDefaultSheet').then((m) => ({ default: m.InvoiceDefaultSheet }))));
const CoopVariantFormSheet = lazy(lazyWithReload(() => import('../screens/coop/CoopVariantFormSheet').then((m) => ({ default: m.CoopVariantFormSheet }))));

/** Hiển thị đúng một sheet đang mở. Sheet nhận mã bản ghi và đọc dữ liệu mới nhất từ store. */
export function ModalHost() {
  const { modal, closeModal } = useUi();
  const { state } = useStore();
  if (!modal) return null;
  // Sheet gặp lỗi thì hiện sheet báo lỗi thay vì làm trắng cả app (mục 10.5).
  return (
    <ListBoundary
      key={modal.type}
      label="cửa sổ này"
      resetKey={state}
      wrap={(node) => (
        <BottomSheet title="Có lỗi" onClose={closeModal}>
          {node}
        </BottomSheet>
      )}
    >
      <Suspense fallback={null}>
        <ModalContent />
      </Suspense>
    </ListBoundary>
  );
}

function ModalContent() {
  const { modal, closeModal, openModal, user } = useUi();
  if (!modal) return null;
  switch (modal.type) {
    case 'product_detail':
      return <ProductDetailSheet key={modal.productId} productId={modal.productId} onClose={closeModal} />;
    case 'trace_lot':
      return <TraceLotSheet lotId={modal.lotId} productId={modal.productId} onClose={closeModal} />;
    case 'cart':
      return <CartSheet onClose={closeModal} />;
    case 'checkout':
      return <CheckoutSheet source={modal.source} preferredAddressId={modal.addressId} onClose={closeModal} />;
    case 'payment':
      return <PaymentSheet txId={modal.txId} onClose={closeModal} />;
    case 'order_detail':
      return <OrderDetailSheet key={modal.orderId} orderId={modal.orderId} onClose={closeModal} />;
    case 'address_book':
      return <AddressBookSheet onClose={closeModal} />;
    case 'address_form':
      return <AddressFormSheet key={modal.addressId ?? 'new'} addressId={modal.addressId} returnTo={modal.returnTo} onClose={closeModal} />;
    case 'complaint':
      return <ComplaintSheet orderId={modal.orderId} onClose={closeModal} />;
    case 'complaints':
      return <ComplaintsSheet onClose={closeModal} />;
    case 'coop_order':
      return <CoopOrderSheet key={modal.orderId} orderId={modal.orderId} onClose={closeModal} />;
    case 'shipper_order':
      return <ShipperOrderSheet key={modal.orderId} orderId={modal.orderId} onClose={closeModal} />;
    case 'coop_harvest':
      return <CoopHarvestSheet key={modal.productId} productId={modal.productId} onClose={() => (modal.returnTo ? openModal(modal.returnTo) : closeModal())} />;
    case 'coop_apply':
      return <CoopApplySheet key={modal.applicationId ?? 'new'} applicationId={modal.applicationId} onClose={closeModal} />;
    case 'coop_apply_status':
      return <CoopApplyStatusSheet key={modal.phone ?? 'lookup'} phone={modal.phone} onClose={closeModal} />;
    case 'demo_panel':
      return <DemoPanel onClose={closeModal} />;
    case 'review':
      return <ReviewSheet key={`${modal.orderId}-${modal.productId}`} orderId={modal.orderId} productId={modal.productId} onClose={closeModal} />;
    case 'coop_product_form':
      return user?.role==='admin'&&user.adminGroup==='quality'?<CoopProductFormSheet key={modal.productId ?? 'new'} productId={modal.productId} onClose={closeModal} />:null;
    case 'coop_variant_form':
      return <CoopVariantFormSheet key={modal.productId} productId={modal.productId} onClose={closeModal} />;
    case 'notifications':
      return <NotificationsSheet onClose={closeModal} />;
    case 'coop_shop':
      return <CoopShopSheet key={modal.coopId} coopId={modal.coopId} onClose={closeModal} />;
    case 'favorites':
      return <FavoritesSheet onClose={closeModal} />;
    case 'voucher_wallet':
      return <VoucherWalletSheet onClose={closeModal} />;
    case 'season_watch':
      return <SeasonWatchSheet onClose={closeModal} />;
    case 'invoice_default':
      return <InvoiceDefaultSheet onClose={closeModal} />;
    case 'chat':
      return <ChatSheet key={`${modal.withId ?? ''}-${modal.productId ?? ''}`} withId={modal.withId} productId={modal.productId} onClose={closeModal} />;
  }
}
