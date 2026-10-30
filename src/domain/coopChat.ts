/**
 * Nhắn tin riêng giữa khách và HTX (góp ý kiểm thử: "Tab riêng nhắn tin với hợp tác xã", nút chat nổi ở góc màn hình).
 *
 * - Mỗi cặp khách – HTX có một cuộc trò chuyện. Khách hỏi HTX bất cứ lúc nào, kể cả trước khi mua (hỏi về một sản phẩm).
 * - Cuộc trò chuyện gộp cả tin nhắn chung và tin nhắn trong các đơn giữa hai bên (domain/orderContact.ts), xếp theo
 *   thời gian; tin trong đơn có ghi mã đơn. Gửi từ cuộc trò chuyện thì chọn gửi tin chung hoặc gửi vào một đơn.
 * - HTX chỉ nhắn cho khách đã nhắn cho HTX hoặc đã đặt đơn của HTX (không nhắn tin quảng cáo cho người lạ).
 * - Không hiện SĐT của hai bên. Dữ liệu dùng chung nên hai máy cùng thấy (app hỏi dữ liệu mới mỗi 10 giây).
 */
import { messagePhotosError } from './dataBudget';
import { generateId } from './ids';
import { MESSAGE_MAX_LENGTH, markOrderChatRead, messagesOf, unreadCount, type ChatSide } from './orderContact';
import { findProduct, iso } from './state';
import { CALL_OUTCOME_LABEL, fail, ok, type Actor, type CallOutcome, type DemoState, type DirectMessage, type Order, type Result } from './types';

export const threadKey = (customerId: string, coopId: string): string => `${customerId}|${coopId}`;

/** Bên của người thao tác và mã của bên kia. */
function parties(actor: Actor, otherId: string): Result<{ side: ChatSide; customerId: string; coopId: string }> {
  if (actor.kind === 'customer' && actor.id) return ok({ side: 'customer', customerId: actor.id, coopId: otherId });
  if (actor.kind === 'coop' && actor.id) return ok({ side: 'coop', customerId: otherId, coopId: actor.id });
  return fail('Chỉ khách hàng và HTX nhắn tin với nhau.');
}

export interface ThreadItem {
  id: string;
  at: string;
  sender: ChatSide;
  senderName: string;
  kind: 'text' | 'call';
  text: string;
  callOutcome?: CallOutcome;
  /** Tin trong đơn: mã đơn. */
  orderId?: string;
  /** Tin hỏi về một sản phẩm: mã và tên kèm quy cách lúc gửi. */
  productId?: string;
  productLabel?: string;
  photos?: string[];
}

const directOf = (state: DemoState, customerId: string, coopId: string): DirectMessage[] => (state.directMessages ?? []).filter((m) => m.customerId === customerId && m.coopId === coopId);

/** Đơn giữa hai bên (mới nhất trước), không tính đơn chưa thanh toán xong. */
export const ordersBetween = (state: DemoState, customerId: string, coopId: string): Order[] =>
  state.orders.filter((o) => o.customerId === customerId && o.coopId === coopId && o.status !== 'awaiting_payment').sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Toàn bộ cuộc trò chuyện của hai bên, cũ trước. */
export function threadItems(state: DemoState, customerId: string, coopId: string): ThreadItem[] {
  const direct: ThreadItem[] = directOf(state, customerId, coopId).map((m) => ({
    id: m.id,
    at: m.at,
    sender: m.sender,
    senderName: m.senderName,
    kind: 'text',
    text: m.text,
    productId: m.productId,
    productLabel: m.productLabel,
    photos: m.photos,
  }));
  const inOrders: ThreadItem[] = state.orders
    .filter((o) => o.customerId === customerId && o.coopId === coopId)
    .flatMap((o) =>
      messagesOf(state, o.id).map((m) => ({ id: m.id, at: m.at, sender: m.sender, senderName: m.senderName, kind: m.kind, text: m.text, photos: m.photos, callOutcome: m.callOutcome, orderId: o.id })),
    );
  return [...direct, ...inOrders].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
}

/** Số tin của bên kia mà bên `side` chưa đọc, gồm tin chung và tin trong đơn. */
export function threadUnread(state: DemoState, customerId: string, coopId: string, side: ChatSide): number {
  const readAt = state.chatReads?.[threadKey(customerId, coopId)]?.[side] ?? '';
  const direct = directOf(state, customerId, coopId).filter((m) => m.sender !== side && m.at > readAt).length;
  const inOrders = state.orders.filter((o) => o.customerId === customerId && o.coopId === coopId).reduce((n, o) => n + unreadCount(state, o, side), 0);
  return direct + inOrders;
}

export interface Conversation {
  customerId: string;
  coopId: string;
  /** Tên bên kia (HTX với khách, khách với HTX). */
  title: string;
  subtitle: string;
  last?: ThreadItem;
  unread: number;
}

export const previewOf = (item: ThreadItem): string => (item.kind === 'call' ? `Cuộc gọi: ${CALL_OUTCOME_LABEL[item.callOutcome ?? 'scheduled']}` : messagePreview(item));

/** Nội dung ngắn của tin: chữ, kèm số ảnh nếu có (tin chỉ có ảnh thì là "[N ảnh]"). */
export function messagePreview(m: { text: string; photos?: string[] }): string {
  const n = m.photos?.length ?? 0;
  if (n === 0) return m.text;
  return m.text ? `${m.text} · [${n} ảnh]` : `[${n} ảnh]`;
}

function conversation(state: DemoState, customerId: string, coopId: string, side: ChatSide): Conversation {
  const items = threadItems(state, customerId, coopId);
  const coop = state.coops.find((c) => c.id === coopId);
  const customer = state.customers.find((c) => c.id === customerId);
  const orders = ordersBetween(state, customerId, coopId).length;
  return {
    customerId,
    coopId,
    title: side === 'customer' ? (coop?.name ?? 'HTX') : (customer?.name ?? 'Khách hàng'),
    subtitle: side === 'customer' ? `Vùng ${coop?.region ?? '—'}` : orders > 0 ? `${orders} đơn với HTX` : 'Chưa đặt đơn',
    last: items[items.length - 1],
    unread: threadUnread(state, customerId, coopId, side),
  };
}

/** Các cuộc trò chuyện của khách / HTX đang đăng nhập, có tin mới nhất ở trên. */
export function conversationsFor(state: DemoState, actor: Actor): Result<Conversation[]> {
  if ((actor.kind !== 'customer' && actor.kind !== 'coop') || !actor.id) return fail('Chỉ khách hàng và HTX có hộp tin nhắn.');
  const side: ChatSide = actor.kind;
  const pairs = new Set<string>();
  for (const m of state.directMessages ?? []) if ((side === 'customer' ? m.customerId : m.coopId) === actor.id) pairs.add(threadKey(m.customerId, m.coopId));
  for (const m of state.orderMessages ?? []) {
    const o = state.orders.find((x) => x.id === m.orderId);
    if (o && (side === 'customer' ? o.customerId : o.coopId) === actor.id) pairs.add(threadKey(o.customerId, o.coopId));
  }
  const list = [...pairs].map((k) => {
    const [customerId, coopId] = k.split('|');
    return conversation(state, customerId, coopId, side);
  });
  return ok(list.sort((a, b) => (b.last?.at ?? '').localeCompare(a.last?.at ?? '')));
}

/** Tổng số tin chưa đọc của khách / HTX (cho nút chat nổi, tab Tin nhắn). */
export function totalUnread(state: DemoState, actor: Actor): number {
  const r = conversationsFor(state, actor);
  return r.ok ? r.value.reduce((n, c) => n + c.unread, 0) : 0;
}

/** HTX có nhắn được cho khách này không: khách đã nhắn cho HTX hoặc đã đặt đơn của HTX. */
export function coopMayMessage(state: DemoState, coopId: string, customerId: string): boolean {
  return directOf(state, customerId, coopId).some((m) => m.sender === 'customer') || state.orders.some((o) => o.customerId === customerId && o.coopId === coopId);
}

/** Gửi tin chung cho bên kia. Khách có thể kèm sản phẩm đang hỏi. */
export function sendDirectMessage(state: DemoState, actor: Actor, otherId: string, text: string, at: Date, productId?: string, photos: string[] = []): Result<DemoState> {
  const p = parties(actor, otherId);
  if (!p.ok) return p;
  const { side, customerId, coopId } = p.value;
  const coop = state.coops.find((c) => c.id === coopId);
  if (!coop) return fail('Không tìm thấy HTX.');
  const customer = state.customers.find((c) => c.id === customerId);
  if (!customer) return fail('Không tìm thấy khách hàng.');
  if (side === 'coop' && !coopMayMessage(state, coopId, customerId)) return fail('HTX chỉ nhắn cho khách đã nhắn cho HTX hoặc đã đặt đơn của HTX.');
  const body = text.trim();
  if (!body && photos.length === 0) return fail('Vui lòng nhập nội dung tin nhắn.');
  if (body.length > MESSAGE_MAX_LENGTH) return fail(`Tin nhắn tối đa ${MESSAGE_MAX_LENGTH.toLocaleString('vi-VN')} ký tự.`);
  // Ảnh kèm tin: tối đa NEW-04 ảnh, chặn khi dữ liệu dùng chung gần đầy (domain/dataBudget.ts).
  const photoErr = messagePhotosError(state, photos, state.params.messagePhotoMax);
  if (photoErr) return fail(photoErr);
  let product: { productId: string; productLabel: string } | undefined;
  if (productId) {
    const found = findProduct(state, productId);
    if (!found || found.coopId !== coopId) return fail('Sản phẩm không thuộc HTX này.');
    product = { productId: found.id, productLabel: `${found.name} (${found.unit})` };
  }
  const message: DirectMessage = {
    id: generateId('TN'),
    customerId,
    coopId,
    sender: side,
    senderName: side === 'coop' ? coop.name : (actor.name ?? customer.name),
    text: body,
    at: iso(at),
    ...product,
    ...(photos.length > 0 ? { photos } : {}),
  };
  const key = threadKey(customerId, coopId);
  // Người gửi coi như đã đọc hết tin chung trước đó.
  return ok({
    ...state,
    directMessages: [...(state.directMessages ?? []), message],
    chatReads: { ...state.chatReads, [key]: { ...state.chatReads?.[key], [side]: iso(at) } },
  });
}

/** Mở cuộc trò chuyện: đánh dấu đã đọc tin chung và tin trong các đơn. Không có tin mới thì trả lại đúng dữ liệu cũ. */
export function markThreadRead(state: DemoState, actor: Actor, otherId: string, at: Date): Result<DemoState> {
  const p = parties(actor, otherId);
  if (!p.ok) return p;
  const { side, customerId, coopId } = p.value;
  if (threadUnread(state, customerId, coopId, side) === 0) return ok(state);
  const key = threadKey(customerId, coopId);
  let next: DemoState = { ...state, chatReads: { ...state.chatReads, [key]: { ...state.chatReads?.[key], [side]: iso(at) } } };
  for (const o of state.orders.filter((x) => x.customerId === customerId && x.coopId === coopId)) {
    if (unreadCount(next, o, side) === 0) continue;
    const r = markOrderChatRead(next, o.id, actor, at);
    if (r.ok) next = r.value;
  }
  return ok(next);
}
