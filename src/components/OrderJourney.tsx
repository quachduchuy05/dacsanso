import { AppImage } from './AppImage';
import { useId } from 'react';
import { Check, Minus, X } from 'lucide-react';
import { orderJourney, type StepState } from '../store/commands/orderContact';
import type { Order } from '../domain/types';
import { useStore } from '../store/AppDataContext';

const DOT: Record<StepState, string> = {
  done: 'bg-forest-900 text-champagne-200 ring-1 ring-champagne-400/70',
  current: 'bg-white ring-2 ring-champagne-500',
  upcoming: 'bg-white ring-1 ring-stone-300',
  skipped: 'bg-stone-100 text-muted ring-1 ring-stone-300',
};

const STATE_TEXT: Record<StepState, string> = { done: 'đã xong', current: 'đang chờ', upcoming: 'sắp tới', skipped: 'bỏ qua' };

/**
 * Hành trình đơn hàng (chủ repo yêu cầu): các bước từ đặt hàng tới nhận hàng, bước nào xong, bước nào đang chờ.
 * Đơn đặt trước có thêm: vào mùa – HTX thu hoạch xong (ngày, ghi chú, ảnh lô hàng HTX khai), HTX báo sẵn sàng giao,
 * HTX gọi điện / nhắn tin hẹn lịch giao, trả phần còn lại.
 */
export function OrderJourney({ order }: { order: Order }) {
  const { state } = useStore();
  const titleId = useId();
  const { steps, ended } = orderJourney(state, order);
  const time = (iso: string) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <section aria-labelledby={titleId} className="space-y-3 rounded-3xl border border-champagne-200 bg-white p-4">
      <h4 id={titleId} className="font-display text-lg font-semibold text-ink">
        Hành trình đơn hàng
      </h4>
      <ol className="space-y-0">
        {steps.map((s, i) => {
          const last = i === steps.length - 1 && !ended;
          return (
            <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
              {!last && <span aria-hidden="true" className={`absolute top-7 bottom-0 left-[13px] w-0.5 ${s.state === 'done' ? 'bg-champagne-400' : 'bg-stone-200'}`} />}
              <span aria-hidden="true" className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${DOT[s.state]}`}>
                {s.state === 'done' && <Check size={15} strokeWidth={2.5} />}
                {s.state === 'current' && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-champagne-500" />}
                {s.state === 'skipped' && <Minus size={14} />}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={`text-sm ${s.state === 'current' ? 'font-bold text-forest-900' : s.state === 'done' ? 'font-semibold text-ink' : 'text-muted'}`}>
                  {s.title}
                  <span className="sr-only"> – {STATE_TEXT[s.state]}</span>
                </p>
                {(s.at || (s.detail && s.state !== 'upcoming')) && (
                  <p className="text-xs text-stone-600">
                    {s.at && time(s.at)}
                    {s.at && s.detail && s.state !== 'upcoming' ? ' · ' : ''}
                    {s.state !== 'upcoming' && s.detail}
                  </p>
                )}
                {s.photos && (
                  <ul className="mt-1.5 flex gap-2" aria-label="Ảnh lô hàng HTX chụp">
                    {s.photos.map((src, j) => (
                      <li key={j}>
                        <AppImage src={src} alt={`Ảnh lô hàng ${j + 1}`} className="h-16 w-16 rounded-xl border border-champagne-200 object-cover" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
        {ended && (
          <li className="flex gap-3">
            <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-700 text-white">
              <X size={15} strokeWidth={2.5} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-bold text-rose-800">{ended.label}</p>
              <p className="text-xs text-stone-600">
                {time(ended.at)}
                {ended.reason ? ` · ${ended.reason}` : ''}
              </p>
            </div>
          </li>
        )}
      </ol>
    </section>
  );
}
