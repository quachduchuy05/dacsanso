import { useId } from 'react';
import { isOrderableIn } from '../store/commands/cart';
import { formatMoney } from '../domain/pricing';
import { remainingFor } from '../domain/state';
import type { Product } from '../domain/types';
import { useStore } from '../store/AppDataContext';

/** Chọn quy cách (hộp 300 g, 500 g…): mỗi quy cách có giá và số còn lại riêng. */
export function VariantPicker({ variants, selected, onSelect }: { variants: Product[]; selected: string; onSelect: (id: string) => void }) {
  const { state } = useStore();
  const name = useId();
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-champagne-700">Quy cách</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {variants.map((v) => {
          const out = remainingFor(state, v) <= 0 || !isOrderableIn(state, v);
          const active = v.id === selected;
          return (
            <label
              key={v.id}
              className={`flex min-h-14 cursor-pointer flex-col justify-center rounded-2xl border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest-600 ${
                active ? 'border-forest-700 bg-forest-50 ring-1 ring-forest-700' : 'border-champagne-300 bg-white hover:border-champagne-500'
              }`}
            >
              <input type="radio" name={name} className="sr-only" checked={active} onChange={() => onSelect(v.id)} />
              <span className="font-bold text-ink">{v.unit}</span>
              <span className="tabular-nums text-stone-700">
                {formatMoney(v.price)}
                {out && <span className="font-semibold text-rose-800"> · hết hàng</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
