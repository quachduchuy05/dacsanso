import {TicketActions} from './TicketActions';
import { AppImage } from './AppImage';
import { useId } from 'react';
import { AlertTriangle, Check, Minus } from 'lucide-react';
import { ticketSteps, type TicketStep } from '../store/commands/complaint';
import { COMPLAINT_REASON_LABEL, TICKET_STATUS_LABEL, type Ticket } from '../domain/types';
import { useNow, useStore } from '../store/AppDataContext';

const DOT: Record<TicketStep['state'], string> = {
  done: 'bg-forest-900 text-champagne-200 ring-1 ring-champagne-400/70',
  current: 'bg-white ring-2 ring-champagne-500',
  upcoming: 'bg-white ring-1 ring-stone-300',
  skipped: 'bg-stone-100 text-muted ring-1 ring-stone-300',
};

const STATE_TEXT: Record<TicketStep['state'], string> = { done: 'đã xong', current: 'đang làm', upcoming: 'sắp tới', skipped: 'bỏ qua' };

const time = (iso: string) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

const STATUS_TONE: Record<Ticket['status'], string> = {
  open: 'bg-sky-100 text-sky-900',
  processing: 'bg-champagne-100 text-champagne-900',
  resolved: 'bg-forest-100 text-forest-800',
  rejected: 'bg-rose-100 text-rose-900',
  closed: 'bg-stone-200 text-stone-800',
};

export function TicketStatusBadge({ status }: { status: Ticket['status'] }) {
  return <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${STATUS_TONE[status]}`}>{TICKET_STATUS_LABEL[status]}</span>;
}

/** Các bước xử lý một khiếu nại (domain/complaint.ts: ticketSteps), dùng chung cho khách, HTX và Admin – CSKH. */
export function TicketProgress({ ticket }: { ticket: Ticket }) {
  const { state } = useStore();
  const now = useNow(30_000);
  const steps = ticketSteps(state, ticket, now);
  return (
    <ol className="space-y-0" aria-label={`Các bước xử lý khiếu nại ${ticket.id}`}>
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex gap-3 pb-3.5 last:pb-0">
          {i < steps.length - 1 && <span aria-hidden="true" className={`absolute top-7 bottom-0 left-[13px] w-0.5 ${s.state === 'done' ? 'bg-champagne-400' : 'bg-stone-200'}`} />}
          <span aria-hidden="true" className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${DOT[s.state]}`}>
            {s.state === 'done' && <Check size={15} strokeWidth={2.5} />}
            {s.state === 'current' && <span className="h-2.5 w-2.5 rounded-full bg-champagne-500" />}
            {s.state === 'skipped' && <Minus size={14} />}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className={`text-sm ${s.state === 'current' ? 'font-bold text-forest-900' : s.state === 'done' ? 'font-semibold text-ink' : 'text-muted'}`}>
              {s.title}
              <span className="sr-only"> – {STATE_TEXT[s.state]}</span>
            </p>
            {(s.at || s.due || s.detail) && (
              <p className="text-xs text-stone-600">
                {s.at && time(s.at)}
                {!s.at && s.due && s.state !== 'skipped' && (
                  <span className={s.overdue ? 'inline-flex items-center gap-1 font-bold text-rose-700' : ''}>
                    {s.overdue && <AlertTriangle size={12} aria-hidden="true" />}
                    {s.overdue ? 'Quá hạn' : 'Hạn'} {time(s.due)}
                  </span>
                )}
                {(s.at || (s.due && s.state !== 'skipped')) && s.detail ? ' · ' : ''}
                {s.detail}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Thẻ khiếu nại của khách: lý do, sản phẩm, ảnh và các bước xử lý. */
export function CustomerTicketCard({ ticket: t }: { ticket: Ticket }) {
  const { state } = useStore();
  const titleId = useId();
  const order = state.orders.find((o) => o.id === t.orderId);
  const items = order?.items.filter((i) => t.productIds.includes(i.productId)) ?? [];
  return (
    <section aria-labelledby={titleId} className="space-y-3 rounded-3xl border border-champagne-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 id={titleId} className="font-display text-lg font-semibold text-ink">
            Khiếu nại {t.id}
          </h4>
          <p className="text-xs text-muted">
            Gửi {time(t.createdAt)} · {COMPLAINT_REASON_LABEL[t.reason]}
            {t.priority === 'high' ? ' · ưu tiên Cao' : ''}
          </p>
        </div>
        <TicketStatusBadge status={t.status} />
      </div>
      {items.length > 0 && <p className="text-sm text-stone-700">Sản phẩm: {items.map((i) => `${i.name} (${i.unit})`).join(', ')}</p>}
      {t.description && <p className="rounded-xl bg-stone-50 p-2 text-sm text-stone-700">"{t.description}"</p>}
      {t.photos.length > 0 && (
        <ul className="flex gap-1.5" aria-label="Ảnh khiếu nại">
          {t.photos.map((src, i) => (
            <li key={i}>
              <AppImage src={src} alt={`Ảnh khiếu nại ${i + 1}`} className="h-14 w-14 rounded-xl object-cover" />
            </li>
          ))}
        </ul>
      )}
      <TicketProgress ticket={t} /><TicketActions ticket={t}/>
    </section>
  );
}
