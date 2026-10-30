/**
 * Trung tâm thông báo cho từng tài khoản (FR-CSKH-10, mục 7).
 *
 * Thông báo được sinh bằng cách so dữ liệu trước và sau mỗi thao tác (deriveNotifications), nên mọi đường thay đổi
 * (người dùng bấm, tác vụ theo giờ, cổng thanh toán mô phỏng) đều sinh thông báo giống nhau.
 * Các sự kiện: đổi trạng thái đơn, kết quả duyệt, ticket, tồn thấp (tối đa 1 lần/ngày/sản phẩm), mời đánh giá,
 * tin nhắn / cuộc gọi trong đơn giữa khách và HTX, tin nhắn chung (nút chat nổi), HTX xác nhận thu hoạch,
 * HTX khách theo dõi có sản phẩm mới, sản phẩm khách theo dõi "Báo tôi khi vào mùa" mở đợt đặt trước.
 */
import { messagePreview } from './coopChat';
import { generateId } from './ids';
import { followerIdsOf } from './marketplace';
import { formatMoney } from './pricing';
import { roundKeyOf, seasonAlertKey, seasonOpen, seasonWatcherIds } from './seasonWatch';
import { formatDateKey, iso, remainingFor, toDateKey } from './state';
import { shipperLabel } from './tracking';
import {
  CALL_OUTCOME_LABEL,
  ORDER_STATUS_LABEL,
  PRODUCT_CHANGE_LABEL,
  TICKET_STATUS_LABEL,
  type AdminSubGroup,
  type AppNotification,
  type DemoState,
  type NotificationLink,
  type Order,
} from './types';

type Draft = { userIds: string[]; title: string; body: string; link?: NotificationLink };

export const usersOfCoop = (s: DemoState, coopId: string): string[] =>
  s.users.filter((u) => u.role === 'coop' && u.coopId === coopId && u.status === 'active').map((u) => u.id);

export const usersOfCustomer = (s: DemoState, customerId: string): string[] =>
  s.users.filter((u) => u.role === 'customer' && u.customerId === customerId).map((u) => u.id);

export const adminsOf = (s: DemoState, group: AdminSubGroup): string[] =>
  s.users.filter((u) => u.role === 'admin' && u.adminGroup === group && u.status === 'active').map((u) => u.id);

function orderDrafts(prev: DemoState, next: DemoState, o: Order): Draft[] {
  const before = prev.orders.find((x) => x.id === o.id);
  const link: NotificationLink = { type: 'order', id: o.id };
  const customer = usersOfCustomer(next, o.customerId);
  const coop = usersOfCoop(next, o.coopId);
  const out: Draft[] = [];

  if (!before) {
    out.push({ userIds: customer, title: `Đã tạo đơn ${o.id}`, body: `${o.coopName} · ${ORDER_STATUS_LABEL[o.status]}`, link });
    if (o.status === 'awaiting_confirmation') {
      out.push({ userIds: coop, title: `Đơn mới ${o.id} cần xác nhận`, body: `Khách trả khi nhận hàng. Hạn xác nhận ${o.confirmDeadline ? new Date(o.confirmDeadline).toLocaleString('vi-VN') : ''}.`, link });
    }
    return out;
  }

  if (before.status !== o.status) {
    const last = o.statusHistory[o.statusHistory.length - 1];
    const reason = last?.reason ? ` – ${last.reason}` : '';
    // Không báo lại cho chính bên vừa thao tác.
    if (last?.actor.kind !== 'customer') {
      out.push({ userIds: customer, title: `Đơn ${o.id}: ${ORDER_STATUS_LABEL[o.status]}`, body: `${o.coopName}${reason}`, link });
    }
    if (before.status === 'awaiting_payment' && o.status === 'awaiting_confirmation') {
      out.push({ userIds: coop, title: `Đơn mới ${o.id} đã thanh toán, cần xác nhận`, body: `Hạn xác nhận ${o.confirmDeadline ? new Date(o.confirmDeadline).toLocaleString('vi-VN') : ''}.`, link });
    } else if (o.status !== 'awaiting_payment' && before.status !== 'awaiting_payment' && last?.actor.kind !== 'coop') {
      out.push({ userIds: coop, title: `Đơn ${o.id}: ${ORDER_STATUS_LABEL[o.status]}`, body: reason.replace(/^ – /, '') || ORDER_STATUS_LABEL[o.status], link });
    }
    if (o.status === 'delivered') {
      out.push({ userIds: customer, title: 'Mời bạn đánh giá sản phẩm', body: `Đơn ${o.id} đã giao. Hãy cho HTX biết cảm nhận của bạn.`, link });
    }
  }

  // Thu hoạch xong mà chưa báo sẵn sàng trong cùng thao tác: báo khách (báo sẵn sàng luôn thì thông báo sẵn sàng đã đủ).
  const harvested = Object.keys(o.harvest ?? {}).filter((pid) => !before.harvest?.[pid]);
  if (harvested.length > 0 && !before.readyReportedAt === !o.readyReportedAt) {
    const records = harvested.map((pid) => (next.harvests ?? []).find((h) => h.id === o.harvest![pid])).filter((h) => !!h);
    const what = records.map((h) => `${h.productName} (thu hoạch ngày ${formatDateKey(h.harvestedOn)})`).join(', ');
    out.push({ userIds: customer, title: `${o.coopName} đã thu hoạch hàng đơn ${o.id}`, body: `${what}. HTX sẽ báo sẵn sàng giao và liên hệ hẹn lịch.`.slice(0, 200), link });
  }
  if (!before.readyReportedAt && o.readyReportedAt && o.remainingDueAt) {
    out.push({
      userIds: customer,
      title: `Hàng đơn ${o.id} đã sẵn sàng`,
      body: `Vui lòng trả phần còn lại ${formatMoney(o.pricing.remaining)} trước ${new Date(o.remainingDueAt).toLocaleString('vi-VN')}.`,
      link,
    });
  }
  if (before.paymentStatus !== o.paymentStatus && ['refund_pending', 'refunding', 'refunded'].includes(o.paymentStatus)) {
    const label = o.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : o.paymentStatus === 'refunding' ? 'Đang hoàn tiền' : 'Chờ hoàn tiền';
    out.push({ userIds: customer, title: `Đơn ${o.id}: ${label}`, body: 'Theo dõi chi tiết hoàn tiền trong đơn hàng.', link });
  }
  // Giao hàng bằng shipper: phân công → shipper; lấy hàng, giao thất bại, giao thành công → khách.
  if (o.shipment && o.shipment.shipperId !== before.shipment?.shipperId) {
    const cod = o.pricing.payOnDelivery > 0 ? `Thu hộ ${formatMoney(o.pricing.payOnDelivery)}` : 'Khách đã thanh toán';
    out.push({ userIds: [o.shipment.shipperId], title: `Đơn mới cần giao ${o.id}`, body: `${o.address.text} · ${cod}${o.shipment.pickupNote ? ` · ${o.shipment.pickupNote}` : ''}`.slice(0, 200), link });
    if (before.shipment) out.push({ userIds: [before.shipment.shipperId], title: `Đơn ${o.id} đã chuyển cho shipper khác`, body: 'Bạn không cần giao đơn này nữa.', link });
  }
  for (const e of o.deliveryLog.slice(before.deliveryLog.length)) {
    if (e.event === 'picked_up') out.push({ userIds: customer, title: `Đơn ${o.id} đang được giao`, body: e.by ? `${shipperLabel(e.by)} đã lấy hàng và đang giao tới bạn.` : 'Đơn vị vận chuyển đã lấy hàng.', link });
    else if (e.event === 'failed' && o.status === 'shipping')
      out.push({ userIds: customer, title: `Giao đơn ${o.id} chưa thành công`, body: `${e.reason ?? ''}. Đơn sẽ được giao lại (lần giao lại tối đa ${o.params.maxRedeliveries}).`.replace(/^\. /, ''), link });
    else if (e.event === 'delivered_reported') out.push({ userIds: customer, title: `Đơn ${o.id} đã được giao`, body: 'Bấm "Đã nhận hàng" trong đơn khi bạn đã nhận đủ hàng.', link });
  }

  if (o.cancelRequest?.status === 'pending' && before.cancelRequest?.status !== 'pending') {
    out.push({ userIds: coop, title: `Khách yêu cầu huỷ đơn ${o.id}`, body: o.cancelRequest.reason, link });
  }
  if (o.cancelRequest && before.cancelRequest?.status === 'pending' && o.cancelRequest.status === 'rejected') {
    out.push({ userIds: customer, title: `HTX từ chối yêu cầu huỷ đơn ${o.id}`, body: o.cancelRequest.rejectReason ?? '', link });
  }
  return out;
}

/** So dữ liệu trước và sau một thao tác, thêm thông báo cho đúng tài khoản. Hàm thuần. */
export function deriveNotifications(prev: DemoState, next: DemoState, at: Date): DemoState {
  if (prev === next) return next;
  const drafts: Draft[] = [];

  if (prev.orders !== next.orders) {
    for (const o of next.orders) {
      const before = prev.orders.find((x) => x.id === o.id);
      if (before === o) continue;
      drafts.push(...orderDrafts(prev, next, o));
    }
  }

  // Tin nhắn / cuộc gọi trong đơn → bên còn lại.
  const prevMessages = prev.orderMessages ?? [];
  const nextMessages = next.orderMessages ?? [];
  if (prevMessages !== nextMessages) {
    const known = new Set(prevMessages.map((m) => m.id));
    for (const m of nextMessages) {
      if (known.has(m.id)) continue;
      const order = next.orders.find((o) => o.id === m.orderId);
      if (!order) continue;
      const link: NotificationLink = { type: 'order', id: order.id };
      if (m.sender === 'customer') {
        drafts.push({ userIds: usersOfCoop(next, order.coopId), title: `Tin nhắn mới từ khách · đơn ${order.id}`, body: messagePreview(m).slice(0, 100), link });
      } else if (m.kind === 'call') {
        const outcome = CALL_OUTCOME_LABEL[m.callOutcome ?? 'scheduled'];
        drafts.push({ userIds: usersOfCustomer(next, order.customerId), title: `${order.coopName} đã gọi cho bạn`, body: `${outcome}${m.text ? ` – ${m.text}` : ''} · đơn ${order.id}`.slice(0, 160), link });
      } else {
        drafts.push({ userIds: usersOfCustomer(next, order.customerId), title: `Tin nhắn mới từ ${order.coopName}`, body: `${messagePreview(m).slice(0, 100)} · đơn ${order.id}`, link });
      }
    }
  }

  // Tin nhắn chung (nút chat nổi) → bên còn lại.
  const prevDirect = prev.directMessages ?? [];
  const nextDirect = next.directMessages ?? [];
  if (prevDirect !== nextDirect) {
    const known = new Set(prevDirect.map((m) => m.id));
    for (const m of nextDirect) {
      if (known.has(m.id)) continue;
      const about = m.productLabel ? ` · hỏi về ${m.productLabel}` : '';
      if (m.sender === 'customer') {
        drafts.push({
          userIds: usersOfCoop(next, m.coopId),
          title: `Tin nhắn mới từ ${m.senderName}`,
          body: `${messagePreview(m).slice(0, 100)}${about}`.slice(0, 160),
          link: { type: 'chat', id: m.customerId },
        });
      } else {
        drafts.push({ userIds: usersOfCustomer(next, m.customerId), title: `Tin nhắn mới từ ${m.senderName}`, body: messagePreview(m).slice(0, 100), link: { type: 'chat', id: m.coopId } });
      }
    }
  }

  // Hồ sơ đăng ký HTX: hồ sơ mới / nộp lại → Admin – Chất lượng; được duyệt → tài khoản HTX mới.
  const prevApps = prev.coopApplications ?? [];
  const nextApps = next.coopApplications ?? [];
  if (prevApps !== nextApps) {
    for (const a of nextApps) {
      const before = prevApps.find((x) => x.id === a.id);
      if (before?.status === a.status) continue;
      if (a.status === 'submitted') {
        drafts.push({ userIds: adminsOf(next, 'quality'), title: `${before ? 'HTX bổ sung hồ sơ' : 'Hồ sơ đăng ký HTX mới'} ${a.id}`, body: `${a.coopName} · vùng ${a.region}` });
      } else if (a.status === 'approved' && a.coopId) {
        drafts.push({
          userIds: usersOfCoop(next, a.coopId),
          title: 'Hồ sơ đăng ký HTX đã được duyệt',
          body: `Chào mừng ${a.coopName}. Thêm sản phẩm ở mục Sản phẩm; sản phẩm mới chờ Admin – Chất lượng duyệt.`,
        });
      }
    }
  }

  // Tiền thu hộ của shipper: nộp → Admin – Tài chính; xác nhận → shipper.
  const prevRemits = prev.codRemittances ?? [];
  const nextRemits = next.codRemittances ?? [];
  if (prevRemits !== nextRemits) {
    for (const r of nextRemits) {
      const before = prevRemits.find((x) => x.id === r.id);
      if (before?.status === r.status) continue;
      if (r.status === 'submitted') drafts.push({ userIds: adminsOf(next, 'finance'), title: `${r.shipperName} nộp tiền thu hộ ${formatMoney(r.amount)}`, body: `${r.orderIds.length} đơn · phiếu ${r.id} (mô phỏng). Xác nhận ở mục Thu hộ COD.` });
      else drafts.push({ userIds: [r.shipperId], title: `Đã xác nhận phiếu nộp tiền ${r.id}`, body: `Admin – Tài chính đã nhận ${formatMoney(r.amount)} (mô phỏng).` });
    }
  }

  // Nhắc thanh toán ở phút PAR-20.
  for (const tx of next.transactions) {
    const before = prev.transactions.find((t) => t.id === tx.id);
    if (tx.remindedAt && !before?.remindedAt && tx.status === 'pending') {
      drafts.push({
        userIds: usersOfCustomer(next, tx.customerId),
        title: 'Nhắc thanh toán',
        body: `Giao dịch ${formatMoney(tx.amount)} hết hạn lúc ${new Date(tx.expiresAt).toLocaleTimeString('vi-VN')}. Quá hạn các đơn online sẽ tự huỷ.`,
        link: { type: 'order', id: tx.orderIds[0] },
      });
    }
  }

  // Ticket.
  if (prev.tickets !== next.tickets) {
    for (const t of next.tickets) {
      const before = prev.tickets.find((x) => x.id === t.id);
      const link: NotificationLink = { type: 'ticket', id: t.id };
      if (!before) {
        const high = t.priority === 'high' ? ' (ưu tiên Cao)' : '';
        drafts.push({ userIds: [...usersOfCoop(next, t.coopId), ...adminsOf(next, 'cskh')], title: `Khiếu nại mới ${t.id}${high}`, body: `Đơn ${t.orderId}`, link });
        continue;
      }
      if (before.history.length === t.history.length) continue;
      const last = t.history[t.history.length - 1];
      if (before.status !== t.status) {
        drafts.push({ userIds: [...usersOfCustomer(next, t.customerId), ...usersOfCoop(next, t.coopId)], title: `Khiếu nại ${t.id}: ${TICKET_STATUS_LABEL[t.status]}`, body: last.note ?? '', link });
      } else if (last.actor.kind === 'coop') {
        drafts.push({ userIds: [...usersOfCustomer(next, t.customerId), ...adminsOf(next, 'cskh')], title: `HTX phản hồi khiếu nại ${t.id}`, body: last.note ?? '', link });
      } else if (last.kind === 'request_coop') {
        drafts.push({ userIds: usersOfCoop(next, t.coopId), title: `CSKH đề nghị HTX phản hồi khiếu nại ${t.id}`, body: last.note ?? `Đơn ${t.orderId}`, link });
      }
    }
  }

  // Kết quả duyệt sản phẩm / giá.
  let seasonAlerts = next.seasonAlerts;
  if (prev.productChanges !== next.productChanges) {
    for (const c of next.productChanges) {
      const before = prev.productChanges.find((x) => x.id === c.id);
      const name = next.products.find((p) => p.id === c.productId)?.name ?? c.productId;
      const what = PRODUCT_CHANGE_LABEL[c.type].toLowerCase();
      const link: NotificationLink = { type: 'product', id: c.productId };
      if (!before) {
        drafts.push({ userIds: adminsOf(next, 'quality'), title: `Yêu cầu ${what} chờ duyệt`, body: name, link });
      } else if (before.status === 'pending' && c.status !== 'pending') {
        drafts.push({
          userIds: usersOfCoop(next, c.coopId),
          title: `Yêu cầu ${what} ${c.status === 'approved' ? 'đã được duyệt' : 'bị từ chối'}`,
          body: c.status === 'approved' ? name : `${name}: ${c.rejectReason}`,
          link,
        });
        // Sản phẩm mới (không phải quy cách thêm) được duyệt → khách theo dõi HTX (domain/marketplace.ts).
        const product = next.products.find((p) => p.id === c.productId);
        if (c.status === 'approved' && c.type === 'new_product' && product && !product.variantOf && product.status === 'active') {
          const coopName = next.coops.find((x) => x.id === c.coopId)?.name ?? 'HTX';
          drafts.push({ userIds: followerIdsOf(next, c.coopId).flatMap((id) => usersOfCustomer(next, id)), title: `${coopName} có sản phẩm mới`, body: name, link });
        }
        // Đợt đặt trước mới hoặc thêm suất được duyệt → khách theo dõi "Báo tôi khi vào mùa", mỗi khách 1 lần cho mỗi đợt.
        if (c.status === 'approved' && c.type === 'preorder' && product?.preorder && seasonOpen(next, product, at)) {
          const family = product.variantOf ?? product.id;
          const round = roundKeyOf(product.preorder);
          const due = seasonWatcherIds(next, family).filter((id) => seasonAlerts?.[seasonAlertKey(id, family)] !== round);
          if (due.length > 0) {
            seasonAlerts = { ...(seasonAlerts ?? {}), ...Object.fromEntries(due.map((id) => [seasonAlertKey(id, family), round])) };
            const familyName = next.products.find((p) => p.id === family)?.name ?? name;
            drafts.push({
              userIds: due.flatMap((id) => usersOfCustomer(next, id)),
              title: `${familyName} đã vào mùa`,
              body: `Nhận đặt trước, giao từ ${formatDateKey(product.preorder.deliveryFrom)} đến ${formatDateKey(product.preorder.deliveryTo)}.`,
              link: { type: 'product', id: product.id },
            });
          }
        }
      }
    }
  }

  // Đánh giá mới → HTX; HTX phản hồi đánh giá → khách.
  if (prev.reviews !== next.reviews) {
    for (const r of next.reviews) {
      const before = prev.reviews.find((x) => x.id === r.id);
      const order = next.orders.find((o) => o.id === r.orderId);
      const name = next.products.find((p) => p.id === r.productId)?.name ?? '';
      if (!before && order) drafts.push({ userIds: usersOfCoop(next, order.coopId), title: `Đánh giá mới ${r.stars}★`, body: name, link: { type: 'product', id: r.productId } });
      if (before && !before.coopReply && r.coopReply) drafts.push({ userIds: usersOfCustomer(next, r.customerId), title: 'HTX đã phản hồi đánh giá của bạn', body: name });
    }
  }

  // Hồ sơ HTX: chờ duyệt → Admin – Chất lượng; kết quả → HTX. Quyền bán đổi → HTX.
  if (prev.coops !== next.coops) {
    for (const c of next.coops) {
      const before = prev.coops.find((x) => x.id === c.id);
      if (!before) continue;
      if (before.profileStatus !== 'pending' && c.profileStatus === 'pending') drafts.push({ userIds: adminsOf(next, 'quality'), title: 'Hồ sơ HTX chờ duyệt', body: c.name });
      if (before.profileStatus === 'pending' && c.profileStatus !== 'pending')
        drafts.push({ userIds: usersOfCoop(next, c.id), title: c.profileStatus === 'approved' ? 'Hồ sơ HTX đã được duyệt' : 'Hồ sơ HTX bị từ chối', body: c.profileRejectReason ?? '' });
      if (before.status !== c.status)
        drafts.push({ userIds: usersOfCoop(next, c.id), title: c.status === 'active' ? 'Đã kích hoạt quyền bán' : 'Quyền bán bị tạm khoá', body: c.suspendReason ?? '' });
    }
  }

  // Yêu cầu hoàn mới → Admin – Tài chính.
  if (prev.refunds !== next.refunds) {
    for (const r of next.refunds) {
      if (!prev.refunds.some((x) => x.id === r.id)) {
        drafts.push({ userIds: adminsOf(next, 'finance'), title: 'Yêu cầu hoàn tiền mới', body: `Đơn ${r.orderId} · ${formatMoney(r.amount)}`, link: { type: 'order', id: r.orderId } });
      }
    }
  }

  // Chi trả đối soát → HTX.
  if (prev.payoutPeriods !== next.payoutPeriods) {
    for (const p of next.payoutPeriods) {
      const before = prev.payoutPeriods.find((x) => x.id === p.id);
      if (p.status === 'paid' && before?.status !== 'paid') {
        drafts.push({ userIds: usersOfCoop(next, p.coopId), title: 'Đã ghi nhận chi trả kỳ đối soát (mô phỏng)', body: `${formatMoney(p.payout)} cho ${p.lines.length} đơn.` });
      }
    }
  }

  // Tồn thấp: tối đa 1 lần/ngày cho mỗi sản phẩm (mục 5.6).
  let lowStockAlerts = next.lowStockAlerts;
  if (prev.orders !== next.orders || prev.products !== next.products) {
    const today = toDateKey(at);
    for (const p of next.products) {
      if (p.kind !== 'ready' || p.status !== 'active') continue;
      const available = remainingFor(next, p);
      const threshold = p.lowStockThreshold ?? next.params.lowStockThreshold;
      if (available <= threshold && lowStockAlerts[p.id] !== today) {
        lowStockAlerts = { ...lowStockAlerts, [p.id]: today };
        drafts.push({ userIds: usersOfCoop(next, p.coopId), title: `Tồn thấp: ${p.name}`, body: `Còn ${available} ${p.unit} khả dụng (ngưỡng ${threshold}).`, link: { type: 'product', id: p.id } });
      }
    }
  }

  const created: AppNotification[] = drafts.flatMap((d) =>
    [...new Set(d.userIds)].map((userId) => ({ id: generateId('TB'), userId, at: iso(at), title: d.title, body: d.body, link: d.link, read: false })),
  );
  if (created.length === 0 && lowStockAlerts === next.lowStockAlerts && seasonAlerts === next.seasonAlerts) return next;
  return { ...next, notifications: capNotifications([...created, ...next.notifications]), lowStockAlerts, seasonAlerts };
}

export function notificationsOf(state: DemoState, userId: string): AppNotification[] {
  return state.notifications.filter((n) => n.userId === userId);
}

/** Mỗi tài khoản giữ tối đa chừng này thông báo mới nhất (sửa lỗi bản web: thông báo tăng mãi làm dữ liệu dùng chung đầy). */
export const NOTIFICATIONS_PER_USER = 40;

/** Bỏ thông báo cũ quá NOTIFICATIONS_PER_USER của mỗi tài khoản. `list` xếp mới nhất trước. */
export function capNotifications(list: AppNotification[], perUser = NOTIFICATIONS_PER_USER): AppNotification[] {
  const seen = new Map<string, number>();
  return list.filter((n) => {
    const count = (seen.get(n.userId) ?? 0) + 1;
    seen.set(n.userId, count);
    return count <= perUser;
  });
}

export function markNotificationsRead(state: DemoState, userId: string, ids?: string[]): DemoState {
  return {
    ...state,
    notifications: state.notifications.map((n) => (n.userId === userId && !n.read && (!ids || ids.includes(n.id)) ? { ...n, read: true } : n)),
  };
}
