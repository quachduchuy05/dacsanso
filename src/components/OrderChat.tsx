import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { PhoneCall, Send } from 'lucide-react';
import { useUi } from '../app/UiContext';
import { chatClosedReason, markOrderChatRead, MESSAGE_MAX_LENGTH, messagesOf, sendOrderMessage, unreadCount, type ChatSide } from '../store/commands/orderContact';
import { CALL_OUTCOME_LABEL, type Order } from '../domain/types';
import { useStore } from '../store/AppDataContext';
import { AttachPhotoButton, MessagePhotoGrid, PendingPhotos, useMessagePhotos } from './MessagePhotos';

/**
 * Trao đổi theo đơn giữa khách và HTX của đơn (chủ repo yêu cầu): nhắn tin qua lại, cuộc gọi HTX ghi lại cũng hiện ở đây.
 * Dữ liệu nằm trong dữ liệu dùng chung nên máy khách và máy HTX cùng thấy (app hỏi dữ liệu mới mỗi 10 giây).
 * Mở phần này là đánh dấu đã đọc.
 */
export function OrderChat({
  order,
  side,
  prefill,
  inputRef,
}: {
  order: Order;
  side: ChatSide;
  /** Điền sẵn nội dung (tin nhắn mẫu của HTX); đổi `nonce` để điền lại. */
  prefill?: { text: string; nonce: number } | null;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const { state, run } = useStore();
  const { customerActor, coopActor, showToast } = useUi();
  const actor = side === 'customer' ? customerActor : coopActor;
  const [text, setText] = useState('');
  const photos = useMessagePhotos();
  const titleId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const ownInput = useRef<HTMLTextAreaElement>(null);
  const input = inputRef ?? ownInput;
  const messages = messagesOf(state, order.id);
  const unread = unreadCount(state, order, side);
  const closed = chatClosedReason(order);

  // Mở phần trao đổi (hoặc có tin mới khi đang mở) thì đánh dấu đã đọc.
  useEffect(() => {
    if (unread > 0) void run((s, at) => markOrderChatRead(s, order.id, actor, at));
  }, [unread, order.id, actor, run]);

  // Tin mới thì cuộn xuống cuối.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (!prefill) return;
    setText(prefill.text);
    input.current?.focus();
  }, [prefill, input]);

  // Gửi không được (vd. dữ liệu gần đầy) thì giữ nguyên chữ và ảnh đang soạn.
  const send = async () => {
    const r = await run((s, at) => sendOrderMessage(s, order.id, actor, text, at, photos.photos));
    if (!r.ok) return showToast(r.error);
    setText('');
    photos.clear();
  };

  const time = (iso: string) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  const other = side === 'customer' ? order.coopName : 'khách';

  return (
    <section aria-labelledby={titleId} className="space-y-3 rounded-3xl border border-champagne-200 bg-white p-4">
      <h4 id={titleId} className="font-display text-lg font-semibold text-ink">
        Trao đổi với {other}
      </h4>
      <div
        ref={listRef}
        role="log"
        aria-label={`Tin nhắn trong đơn ${order.id}`}
        aria-live="polite"
        className="max-h-80 space-y-2 overflow-y-auto overscroll-contain rounded-2xl bg-champagne-50/60 p-2.5"
      >
        {messages.length === 0 && (
          <p className="py-3 text-center text-sm text-muted">{side === 'customer' ? 'Chưa có tin nhắn. Bạn có thể hỏi HTX về đơn này.' : 'Chưa có tin nhắn. Nhắn cho khách về đơn này.'}</p>
        )}
        {messages.map((m) => {
          if (m.kind === 'call') {
            return (
              <div key={m.id} className="mx-auto flex max-w-[90%] items-start gap-2 rounded-2xl border border-champagne-300 bg-white px-3 py-2 text-sm text-stone-700">
                <PhoneCall size={15} className="mt-0.5 shrink-0 text-forest-800" aria-hidden="true" />
                <span>
                  <strong className="text-ink">{m.senderName} đã gọi điện</strong> · {CALL_OUTCOME_LABEL[m.callOutcome ?? 'scheduled']}
                  {m.text && <span className="block">{m.text}</span>}
                  <span className="block text-xs text-muted">{time(m.at)}</span>
                </span>
              </div>
            );
          }
          const own = m.sender === side;
          return (
            <div key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${own ? 'rounded-br-md bg-forest-900 text-white' : 'rounded-bl-md border border-champagne-200 bg-white text-ink'}`}>
                {!own && <span className="block text-xs font-semibold text-champagne-800">{m.senderName}</span>}
                {m.text && <span className="whitespace-pre-line break-words">{m.text}</span>}
                <MessagePhotoGrid photos={m.photos} label={`Tin của ${m.senderName}`} />
                <span className={`block text-right text-xs ${own ? 'text-forest-100' : 'text-muted'}`}>{time(m.at)}</span>
              </div>
            </div>
          );
        })}
      </div>
      {closed ? (
        <p className="text-sm text-stone-600">{closed}</p>
      ) : (
        <div className="space-y-2">
          <PendingPhotos state={photos} />
          <div className="flex flex-wrap items-end gap-2">
            <AttachPhotoButton state={photos} />
            <label className="min-w-0 flex-1">
              <span className="sr-only">Nội dung tin nhắn</span>
              <textarea
                ref={input}
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
                placeholder={side === 'customer' ? 'Nhắn cho HTX…' : 'Nhắn cho khách…'}
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
        </div>
      )}
    </section>
  );
}
