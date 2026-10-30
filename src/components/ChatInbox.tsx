import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, PhoneCall, Send, Store, X } from 'lucide-react';
import { useUi } from '../app/UiContext';
import { conversationsFor, coopMayMessage, markThreadRead, ordersBetween, previewOf, sendDirectMessage, threadItems, threadUnread, totalUnread, type Conversation } from '../store/commands/coopChat';
import { chatClosedReason, MESSAGE_MAX_LENGTH, sendOrderMessage, type ChatSide } from '../store/commands/orderContact';
import { formatMoney } from '../domain/pricing';
import { findProduct } from '../domain/state';
import { CALL_OUTCOME_LABEL, ORDER_STATUS_LABEL } from '../domain/types';
import { useStore } from '../store/AppDataContext';
import { EmptyState, ErrorState } from './EmptyState';
import { Select } from './form';
import { AttachPhotoButton, MessagePhotoGrid, PendingPhotos, useMessagePhotos } from './MessagePhotos';
import { ProductImage } from './ProductImage';

const time = (iso: string) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

const initialsOf = (name: string) => {
  const words = name
    .replace(/^HTX( mẫu)?\s+/i, '')
    .trim()
    .split(/\s+/);
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? (words[words.length - 1][0] ?? '') : '')).toUpperCase();
};

/**
 * Hộp tin nhắn giữa khách và HTX (góp ý kiểm thử: tab riêng nhắn tin với HTX). Dùng ở sheet của nút chat nổi (khách)
 * và tab Tin nhắn (HTX). Phần chứa rộng thì danh sách bên trái, cuộc trò chuyện bên phải; hẹp thì mở từng màn, có nút quay lại.
 */
export function ChatInbox({ side, initialWithId, productId }: { side: ChatSide; initialWithId?: string; productId?: string }) {
  const { state } = useStore();
  const { customerActor, coopActor } = useUi();
  const actor = side === 'customer' ? customerActor : coopActor;
  const listed = conversationsFor(state, actor);
  // Màn hình rộng (hai cột): mở sẵn cuộc trò chuyện mới nhất. Điện thoại: hiện danh sách trước.
  const [withId, setWithId] = useState<string | null>(() => {
    if (initialWithId) return initialWithId;
    const first = listed.ok ? listed.value[0] : undefined;
    return first && window.matchMedia?.('(min-width: 1024px)').matches ? (side === 'customer' ? first.coopId : first.customerId) : null;
  });
  const [asking, setAsking] = useState(productId);
  if (!listed.ok) return <ErrorState>{listed.error}</ErrorState>;
  const list = listed.value;

  return (
    <div className="@container">
      <div className="grid gap-4 @3xl:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
        <div className={withId ? 'hidden @3xl:block' : ''}>
          <ConversationList side={side} list={list} selected={withId} onSelect={(id) => setWithId(id)} />
        </div>
        {withId ? (
          <Thread key={withId} side={side} withId={withId} productId={asking} onClearProduct={() => setAsking(undefined)} onBack={() => setWithId(null)} />
        ) : (
          <div className="hidden @3xl:block">
            <EmptyState>{list.length > 0 ? 'Chọn một cuộc trò chuyện ở bên trái.' : side === 'customer' ? 'Chọn HTX để bắt đầu nhắn tin.' : 'Chưa có khách nào nhắn tin.'}</EmptyState>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationList({ side, list, selected, onSelect }: { side: ChatSide; list: Conversation[]; selected: string | null; onSelect: (id: string) => void }) {
  const { state } = useStore();
  const [pick, setPick] = useState('');
  const known = new Set(list.map((c) => c.coopId));
  const startable = side === 'customer' ? state.coops.filter((c) => !known.has(c.id)) : [];
  return (
    <div className="space-y-3">
      {side === 'customer' && startable.length > 0 && (
        <div className="space-y-1.5 rounded-2xl border border-champagne-200 bg-champagne-50/60 p-3">
          <label htmlFor="chat-new" className="block text-sm font-semibold text-stone-700">
            Nhắn cho HTX khác
          </label>
          <div className="flex gap-2">
            <Select id="chat-new" value={pick} onChange={(e) => setPick(e.target.value)} className="min-w-0 flex-1">
              <option value="">— Chọn HTX —</option>
              {startable.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <button
              type="button"
              disabled={!pick}
              onClick={() => onSelect(pick)}
              className="min-h-11 shrink-0 rounded-xl bg-forest-900 px-4 text-sm font-bold text-champagne-100 hover:bg-forest-800 disabled:bg-stone-300 disabled:text-stone-600"
            >
              Nhắn tin
            </button>
          </div>
        </div>
      )}
      {list.length === 0 ? (
        <EmptyState>{side === 'customer' ? 'Chưa có tin nhắn. Bạn có thể hỏi HTX về sản phẩm, mùa vụ, đơn hàng.' : 'Chưa có khách nào nhắn tin.'}</EmptyState>
      ) : (
        <ul aria-label="Cuộc trò chuyện" className="space-y-1.5">
          {list.map((c) => {
            const id = side === 'customer' ? c.coopId : c.customerId;
            const active = id === selected;
            return (
              <li key={`${c.customerId}|${c.coopId}`}>
                <button
                  type="button"
                  onClick={() => onSelect(id)}
                  aria-current={active ? 'true' : undefined}
                  aria-label={`${c.title}${c.unread > 0 ? `, ${c.unread} tin chưa đọc` : ''}`}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors ${active ? 'border-forest-700 bg-forest-50' : 'border-stone-200 bg-white hover:border-champagne-400'}`}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-900 font-display text-sm font-semibold text-champagne-200 ring-1 ring-champagne-400/60"
                  >
                    {initialsOf(c.title)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-bold text-ink">{c.title}</span>
                      {c.last && <span className="shrink-0 text-xs text-muted">{time(c.last.at)}</span>}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${c.unread > 0 ? 'font-semibold text-ink' : 'text-stone-600'}`}>
                        {c.last ? `${c.last.sender === side ? 'Bạn: ' : ''}${previewOf(c.last)}` : c.subtitle}
                      </span>
                      {c.unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-champagne-600 px-1.5 text-xs font-bold text-white">{c.unread}</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Thread({ side, withId, productId, onClearProduct, onBack }: { side: ChatSide; withId: string; productId?: string; onClearProduct: () => void; onBack: () => void }) {
  const { state, run } = useStore();
  const { customerActor, coopActor, showToast, openModal } = useUi();
  const actor = side === 'customer' ? customerActor : coopActor;
  const customerId = side === 'customer' ? actor.id! : withId;
  const coopId = side === 'customer' ? withId : actor.id!;
  const [text, setText] = useState('');
  const [target, setTarget] = useState('');
  const photos = useMessagePhotos();
  const titleId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const items = threadItems(state, customerId, coopId);
  const unread = threadUnread(state, customerId, coopId, side);
  const coop = state.coops.find((c) => c.id === coopId);
  const customer = state.customers.find((c) => c.id === customerId);
  const openOrders = ordersBetween(state, customerId, coopId).filter((o) => !chatClosedReason(o));
  const product = productId ? findProduct(state, productId) : undefined;
  const asking = product && product.coopId === coopId ? product : undefined;
  const blocked = side === 'coop' && !coopMayMessage(state, coopId, customerId);

  // Mở cuộc trò chuyện (hoặc có tin mới khi đang mở) thì đánh dấu đã đọc.
  useEffect(() => {
    if (unread > 0) void run((s, at) => markThreadRead(s, actor, withId, at));
  }, [unread, withId, actor, run]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length]);

  // Gửi không được (vd. dữ liệu gần đầy) thì giữ nguyên chữ và ảnh đang soạn.
  const send = async () => {
    const r = target ? await run((s, at) => sendOrderMessage(s, target, actor, text, at, photos.photos)) : await run((s, at) => sendDirectMessage(s, actor, withId, text, at, asking?.id, photos.photos));
    if (!r.ok) return showToast(r.error);
    setText('');
    photos.clear();
    if (!target && asking) onClearProduct();
  };

  const title = side === 'customer' ? (coop?.name ?? 'HTX') : (customer?.name ?? 'Khách hàng');
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3 rounded-3xl border border-champagne-200 bg-white p-3 @3xl:p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại danh sách tin nhắn"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 @3xl:hidden"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h4 id={titleId} className="truncate font-display text-lg font-semibold text-ink">
            {title}
          </h4>
          <p className="truncate text-xs text-muted">
            {side === 'customer' ? `Vùng ${coop?.region ?? '—'} · HTX trả lời trong giờ làm việc` : `${ordersBetween(state, customerId, coopId).length} đơn với HTX`}
          </p>
        </div>
        {side === 'customer' && coop && (
          <button
            type="button"
            onClick={() => openModal({ type: 'coop_shop', coopId: coop.id })}
            aria-label={`Mở trang ${coop.name}`}
            className="flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-champagne-300 px-3 text-sm font-bold text-forest-900 hover:bg-champagne-50"
          >
            <Store size={15} aria-hidden="true" /> Trang HTX
          </button>
        )}
      </div>

      <div
        ref={listRef}
        role="log"
        aria-label={`Tin nhắn với ${title}`}
        aria-live="polite"
        className="max-h-[50dvh] min-h-40 space-y-2 overflow-y-auto overscroll-contain rounded-2xl bg-champagne-50/60 p-2.5"
      >
        {items.length === 0 && <p className="py-6 text-center text-sm text-muted">{side === 'customer' ? `Chưa có tin nhắn. Hỏi ${title} về sản phẩm, mùa vụ hay đơn hàng.` : 'Chưa có tin nhắn.'}</p>}
        {items.map((m) => {
          const tag = m.orderId ? (
            side === 'customer' ? (
              <button type="button" onClick={() => openModal({ type: 'order_detail', orderId: m.orderId! })} className="underline decoration-dotted underline-offset-2">
                Đơn {m.orderId}
              </button>
            ) : (
              <button type="button" onClick={() => openModal({ type: 'coop_order', orderId: m.orderId! })} className="underline decoration-dotted underline-offset-2">
                Đơn {m.orderId}
              </button>
            )
          ) : m.productLabel ? (
            <span>Hỏi về {m.productLabel}</span>
          ) : null;
          if (m.kind === 'call') {
            return (
              <div key={m.id} className="mx-auto flex max-w-[90%] items-start gap-2 rounded-2xl border border-champagne-300 bg-white px-3 py-2 text-sm text-stone-700">
                <PhoneCall size={15} className="mt-0.5 shrink-0 text-forest-800" aria-hidden="true" />
                <span>
                  <strong className="text-ink">{m.senderName} đã gọi điện</strong> · {CALL_OUTCOME_LABEL[m.callOutcome ?? 'scheduled']}
                  {m.text && <span className="block">{m.text}</span>}
                  <span className="block text-xs text-muted">
                    {tag && <>{tag} · </>}
                    {time(m.at)}
                  </span>
                </span>
              </div>
            );
          }
          const own = m.sender === side;
          return (
            <div key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${own ? 'rounded-br-md bg-forest-900 text-white' : 'rounded-bl-md border border-champagne-200 bg-white text-ink'}`}>
                {!own && <span className="block text-xs font-semibold text-champagne-800">{m.senderName}</span>}
                {tag && <span className={`block text-xs font-semibold ${own ? 'text-champagne-200' : 'text-forest-800'}`}>{tag}</span>}
                {m.text && <span className="whitespace-pre-line break-words">{m.text}</span>}
                <MessagePhotoGrid photos={m.photos} label={`Tin của ${m.senderName}`} />
                <span className={`block text-right text-xs ${own ? 'text-forest-100' : 'text-muted'}`}>{time(m.at)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {asking && !target && (
        <div className="flex items-center gap-3 rounded-2xl border border-champagne-300 bg-champagne-50 p-2">
          <ProductImage product={asking} className="h-11 w-11 shrink-0 rounded-xl" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="block text-xs text-muted">Đang hỏi về</span>
            <span className="block truncate font-semibold text-ink">
              {asking.name} ({asking.unit}) · {formatMoney(asking.price)}
            </span>
          </p>
          <button type="button" onClick={onClearProduct} aria-label="Bỏ sản phẩm đang hỏi" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-600 hover:bg-white">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      {blocked ? (
        <p className="text-sm text-stone-600">HTX chỉ nhắn cho khách đã nhắn cho HTX hoặc đã đặt đơn của HTX.</p>
      ) : (
        <div className="space-y-2">
          {openOrders.length > 0 && (
            <label className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-stone-700">Gửi về</span>
              <Select value={target} onChange={(e) => setTarget(e.target.value)} className="min-w-0 flex-1">
                <option value="">Tin nhắn chung</option>
                {openOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    Đơn {o.id} · {ORDER_STATUS_LABEL[o.status]}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <PendingPhotos state={photos} />
          <div className="flex flex-wrap items-end gap-2">
            <AttachPhotoButton state={photos} />
            <label className="min-w-0 flex-1">
              <span className="sr-only">Nội dung tin nhắn</span>
              <textarea
                rows={2}
                maxLength={MESSAGE_MAX_LENGTH}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={side === 'customer' ? `Nhắn cho ${title}…` : 'Nhắn cho khách…'}
                className="min-h-11 w-full resize-none rounded-2xl border border-stone-300 bg-white px-3 py-2.5 text-base text-ink focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 md:text-sm"
              />
            </label>
            <button
              type="button"
              onClick={send}
              disabled={!text.trim() && photos.photos.length === 0}
              aria-label="Gửi tin nhắn"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest-900 text-champagne-200 ring-1 ring-champagne-400/60 hover:bg-forest-700 disabled:bg-stone-300 disabled:text-stone-600 disabled:ring-0"
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs text-muted">Không gửi số điện thoại, tài khoản ngân hàng qua tin nhắn. Tin mới hiện sau vài giây (app hỏi dữ liệu mới mỗi 10 giây).</p>
        </div>
      )}
    </section>
  );
}

/** Nút chat nổi ở góc dưới màn hình của khách: mở hộp tin nhắn với HTX, có số tin chưa đọc. */
export function ChatFab() {
  const { state } = useStore();
  const { customerActor, openModal, modal } = useUi();
  const count = totalUnread(state, customerActor);
  if (modal) return null;
  return (
    <button
      type="button"
      onClick={() => openModal({ type: 'chat' })}
      aria-label={`Tin nhắn với HTX${count > 0 ? `, ${count} tin chưa đọc` : ''}`}
      className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-forest-900 text-champagne-200 shadow-[0_10px_28px_rgb(14,37,27,0.35)] ring-1 ring-champagne-400/70 transition hover:bg-forest-800 md:right-6 md:bottom-6"
    >
      <MessageCircle size={24} aria-hidden="true" />
      {count > 0 && (
        <span aria-hidden="true" className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-champagne-500 px-1.5 text-xs font-bold text-ink ring-2 ring-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
