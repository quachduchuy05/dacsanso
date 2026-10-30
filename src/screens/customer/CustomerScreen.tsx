import { useEffect } from 'react';
import { useUi } from '../../app/UiContext';
import { ChatFab } from '../../components/ChatInbox';
import { ListBoundary } from '../../components/ListBoundary';
import { useStore } from '../../store/AppDataContext';
import { AccountTab } from './AccountTab';
import { CustomerBottomNav } from './CustomerBottomNav';
import { CustomerTopBar } from './CustomerTopBar';
import { StorefrontPage } from './StorefrontPage';
import { SeasonTab } from './SeasonTab';
import {useStorefront} from '../../app/StorefrontContext';
import {ProductCatalogPage} from './ProductCatalogPage';

export function CustomerScreen() {
  const { customerTab } = useUi();
  const { state } = useStore();
  const {catalog}=useStorefront();
  // Đổi tab thì về đầu trang, không giữ vị trí cuộn của tab trước. Không trả về kết quả của scrollTo (xem AppShell).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [customerTab]);
  return (
    <div className="flex flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      {customerTab !== 'explore' && <CustomerTopBar />}
      <ListBoundary key={customerTab} label="mục này" resetKey={state}>
        {customerTab === 'explore' && (catalog?<ProductCatalogPage/>:<StorefrontPage />)}
        {customerTab === 'season' && <SeasonTab />}
        {customerTab === 'account' && <AccountTab />}
      </ListBoundary>
      {customerTab !== 'explore' && <ChatFab />}
      <CustomerBottomNav />
    </div>
  );
}
