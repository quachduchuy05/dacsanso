import { Star } from 'lucide-react';

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-champagne-500 text-champagne-500' : 'text-stone-300'} aria-hidden />
      ))}
    </span>
  );
}

export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Số sao">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} sao`} onClick={() => onChange(i)} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-champagne-50">
          <Star size={26} className={i <= value ? 'fill-champagne-500 text-champagne-500' : 'text-stone-300'} />
        </button>
      ))}
    </div>
  );
}
