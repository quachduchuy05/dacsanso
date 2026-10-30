import { useEffect, useState } from 'react';
import { useUi } from '../app/UiContext';
import { markNotificationsRead, notificationsOf } from '../store/commands/notifications';
import type { AppNotification, NotificationLink } from '../domain/types';
import { useStore } from '../store/AppDataContext';
import { BottomSheet } from './BottomSheet';
import { EmptyState } from './EmptyState';

/** Trung tâm thông báo của tài khoản đang đăng nhập (FR-CSKH-10). Mở ra thì đánh dấu đã đọc. */
export function NotificationsSheet({ onClose }: { onClose: () => void }) {
  const { state, run } = useStore();
  const { user, openModal } = useUi();
  const list = user ? notificationsOf(state, user.id) : [];
  // Giữ danh sách chưa đọc lúc mở để vẫn tô nổi sau khi đã đánh dấu đọc.
  const [unreadIds] = useState(() => list.filter((n) => !n.read).map((n) => n.id));

  useEffect(() => {
    if (user && unreadIds.length > 0) void run((s) => ({ ok: true, value: markNotificationsRead(s, user.id, unreadIds) }));
    // Chỉ đánh dấu những thông báo chưa đọc lúc mở.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Thông báo bấm được: khách mở đơn, khiếu nại, tin nhắn, sản phẩm đang bán; HTX mở đơn, khiếu nại, tin nhắn; shipper mở đơn. */
  const canOpen = (link: NotificationLink): boolean => {
    if (user?.role === 'customer') return link.type !== 'product' || state.products.some((p) => p.id === link.id && p.status === 'active');
    if (user?.role === 'coop') return link.type !== 'product';
    return user?.role === 'shipper' && link.type === 'order';
  };

  const open = (n: AppNotification) => {
    if (!n.link || !user || !canOpen(n.link)) return;
    if (n.link.type === 'product') return openModal({ type: 'product_detail', productId: n.link.id });
    if (n.link.type === 'chat') {
      if (user.role === 'customer' || user.role === 'coop') openModal({ type: 'chat', withId: n.link.id });
      return;
    }
    const orderId = n.link.type === 'order' ? n.link.id : n.link.type === 'ticket' ? state.tickets.find((t) => t.id === n.link!.id)?.orderId : undefined;
    if (!orderId) return;
    if (user.role === 'customer') openModal({ type: 'order_detail', orderId });
    else if (user.role === 'coop') openModal({ type: 'coop_order', orderId });
    else if (user.role === 'shipper') openModal({ type: 'shipper_order', orderId });
  };

  return (
    <BottomSheet title={`Thông báo (${list.length})`} onClose={onClose}>
      {list.length === 0 ? (
        <EmptyState>Chưa có thông báo nào.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {list.map((n) => {
            const clickable = !!n.link && canOpen(n.link);
            return (
              <li key={n.id}>
                <button
                  disabled={!clickable}
                  onClick={() => open(n)}
                  className={`w-full rounded-2xl border p-3 text-left text-sm ${unreadIds.includes(n.id) ? 'border-forest-600 bg-forest-50' : 'border-stone-200 bg-white'} disabled:cursor-default`}
                >
                  <span className="block font-bold text-ink">{n.title}</span>
                  {n.body && <span className="block text-stone-700">{n.body}</span>}
                  <span className="block text-xs text-muted">{new Date(n.at).toLocaleString('vi-VN')}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </BottomSheet>
  );
}
