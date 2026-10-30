import { useUi } from '../app/UiContext';
import { BottomSheet } from './BottomSheet';
import { ChatInbox } from './ChatInbox';

/** Sheet tin nhắn: khách mở từ nút chat nổi hoặc "Hỏi HTX" ở trang sản phẩm; HTX mở từ thông báo tin nhắn mới. */
export function ChatSheet({ withId, productId, onClose }: { withId?: string; productId?: string; onClose: () => void }) {
  const { user } = useUi();
  const side = user?.role === 'coop' ? 'coop' : 'customer';
  return (
    <BottomSheet title={side === 'customer' ? 'Tin nhắn với HTX' : 'Tin nhắn với khách'} onClose={onClose} wide>
      <ChatInbox side={side} initialWithId={withId} productId={productId} />
    </BottomSheet>
  );
}
