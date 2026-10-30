import { ChevronRight, Store } from 'lucide-react';
import { useUi } from '../../app/UiContext';

/** Tên HTX bấm được để mở trang HTX công khai (Giai đoạn 8, mục 1). Cao 44px; tên dài thì cắt bớt. */
export function CoopNameButton({ coopId, name, className = '' }: { coopId: string; name: string; className?: string }) {
  const { openModal } = useUi();
  return (
    <button
      type="button"
      onClick={() => openModal({ type: 'coop_shop', coopId })}
      aria-label={`Mở trang ${name}`}
      className={`flex min-h-11 max-w-full items-center gap-1 rounded-lg text-left text-sm text-stone-600 hover:text-forest-800 ${className}`}
    >
      <Store size={14} aria-hidden="true" className="shrink-0" />
      <span className="truncate">{name}</span>
      <ChevronRight size={14} aria-hidden="true" className="shrink-0" />
    </button>
  );
}
