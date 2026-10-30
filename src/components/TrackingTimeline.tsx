import { AppImage } from './AppImage';
import { useId } from 'react';
import { trackingEvents } from '../domain/tracking';
import type { Order } from '../domain/types';

const DOT = { normal: 'bg-forest-700', success: 'bg-forest-900 ring-2 ring-champagne-400', warning: 'bg-rose-700' } as const;

/**
 * Theo dõi vận chuyển kiểu sàn TMĐT: các mốc giao hàng, mới nhất ở trên (domain/tracking.ts).
 * Hiện từ lúc HTX bàn giao hoặc lúc có shipper; ảnh giao hàng của shipper hiện ở mốc "Giao hàng thành công".
 */
export function TrackingTimeline({ order }: { order: Order }) {
  const titleId = useId();
  const events = trackingEvents(order);
  if (events.length === 0) return null;
  const time = (iso: string) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  return (
    <section aria-labelledby={titleId} className="space-y-3 rounded-3xl border border-champagne-200 bg-white p-4">
      <h4 id={titleId} className="font-display text-lg font-semibold text-ink">
        Theo dõi vận chuyển
      </h4>
      <ol className="space-y-0">
        {events.map((e, i) => (
          <li key={`${e.at}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
            {i < events.length - 1 && <span aria-hidden="true" className="absolute top-4 bottom-0 left-[5px] w-0.5 bg-stone-200" />}
            <span aria-hidden="true" className={`relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full ${i === 0 ? DOT[e.tone] : 'bg-stone-300'}`} />
            <div className="min-w-0">
              <p className={`text-sm ${i === 0 ? 'font-bold text-ink' : 'text-stone-700'}`}>{e.title}</p>
              <p className="text-xs text-stone-600">
                <time dateTime={e.at}>{time(e.at)}</time>
                {e.detail ? ` · ${e.detail}` : ''}
              </p>
              {e.photos && (
                <ul className="mt-1.5 flex gap-2" aria-label="Ảnh giao hàng">
                  {e.photos.map((src, j) => (
                    <li key={j}>
                      <AppImage src={src} alt={`Ảnh giao hàng ${j + 1}`} className="h-20 w-20 rounded-xl border border-champagne-200 object-cover" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
