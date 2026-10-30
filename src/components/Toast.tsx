import { CheckCircle2 } from 'lucide-react';
import { useUi } from '../app/UiContext';

/** Thông báo nổi: xuống dòng được, đặt ở đáy màn hình phía trên thanh tab để không che thanh đầu trang. */
export function Toast() {
  const { toast } = useUi();
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md items-start gap-2 rounded-2xl border border-champagne-400/40 bg-forest-950/95 px-4 py-3 text-sm text-white shadow-xl md:bottom-24"
    >
      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-champagne-300" />
      <span className="leading-snug">{toast}</span>
    </div>
  );
}
