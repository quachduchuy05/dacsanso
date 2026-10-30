import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';

/**
 * Chọn số lượng: bấm − / + hoặc gõ thẳng số vào ô giữa (mua nhiều không phải bấm từng cái).
 * Số gõ vào có hiệu lực ngay (không phải chờ rời ô), vượt mức tối đa thì tự về mức tối đa.
 * Có `onRemove` thì ở số lượng nhỏ nhất nút − thành nút bỏ khỏi giỏ.
 * `compact` (thẻ sản phẩm hẹp, rộng ~140px ở màn 320px): chỉ có − / + và con số, không có ô gõ,
 * vì ô gõ sẽ hẹp hơn vùng bấm tối thiểu 44px. Gõ số lượng lớn ở trang chi tiết hoặc giỏ hàng.
 */
export function QuantityStepper({
  value,
  max,
  min = 1,
  onChange,
  itemName,
  onRemove,
  compact = false,
  className = '',
}: {
  value: number;
  max: number;
  min?: number;
  onChange: (quantity: number) => void;
  /** Tên sản phẩm, dùng cho nhãn đọc màn hình của các nút. */
  itemName: string;
  onRemove?: () => void;
  /** Thẻ sản phẩm hẹp: giãn hết chiều rộng, chỉ có − / + và con số. */
  compact?: boolean;
  className?: string;
}) {
  // Chữ đang gõ trong ô; null khi không gõ (ô hiện đúng số lượng hiện tại).
  const [draft, setDraft] = useState<string | null>(null);
  const upper = Math.max(min, max);

  const type = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    const n = Number.parseInt(digits, 10);
    if (!Number.isFinite(n) || n < min) {
      setDraft(digits); // đang xoá để gõ số mới: giữ số cũ cho tới khi gõ xong
      return;
    }
    const next = Math.min(n, upper);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const buttonClass =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone-800 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent';
  return (
    <div
      role="group"
      aria-label={`Số lượng ${itemName}`}
      className={`${compact ? 'flex w-full justify-between' : 'inline-flex'} items-center rounded-xl border border-stone-300 bg-white focus-within:border-forest-600 focus-within:ring-2 focus-within:ring-forest-600/20 ${className}`}
    >
      {onRemove && value <= min ? (
        <button type="button" onClick={onRemove} aria-label={`Bỏ ${itemName} khỏi giỏ`} className={`${buttonClass} text-rose-700`}>
          <Trash2 size={15} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Giảm số lượng ${itemName}`}
          className={buttonClass}
        >
          <Minus size={15} />
        </button>
      )}
      {compact ? (
        <span className="min-w-0 text-center text-base font-bold tabular-nums text-ink">{value}</span>
      ) : (
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={`Nhập số lượng ${itemName}`}
          value={draft ?? String(value)}
          onChange={(e) => type(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => setDraft(null)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="h-11 w-12 bg-transparent text-center text-base font-bold tabular-nums text-ink focus:outline-none md:text-sm"
        />
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(upper, value + 1))}
        disabled={value >= max}
        aria-label={`Tăng số lượng ${itemName}`}
        className={buttonClass}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
