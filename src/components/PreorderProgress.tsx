import { reservedSlots } from '../domain/stock';
import { formatDateKey } from '../domain/state';
import type { Product } from '../domain/types';
import { useStore } from '../store/AppDataContext';

/**
 * Thanh "Đã giữ x/y suất", tính từ đơn trong store (mục 5.6), không gõ cứng.
 * `compact`: bản gọn cho thẻ sản phẩm (số suất còn lại, ngày giao sớm nhất).
 */
export function PreorderProgress({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { state } = useStore();
  const total = product.preorder?.totalSlots ?? 0;
  if (product.kind !== 'preorder' || total <= 0) return null;
  const reserved = Math.min(total, reservedSlots(product.id, state.orders));
  const percent = Math.round((reserved / total) * 100);
  if (compact) {
    return (
      <div className="space-y-1">
        <div className="h-1 w-full overflow-hidden rounded-full bg-champagne-200" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={reserved} aria-label={`Đã giữ ${reserved} trên ${total} suất`}>
          <div className="h-full rounded-full bg-champagne-600" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-xs text-champagne-800">
          Còn {total - reserved}/{total} suất
          {product.preorder && (
            <span className="block">
              Giao từ {formatDateKey(product.preorder.deliveryFrom)}
              {product.sample?.deliveryWindowIsSample && ' (mẫu)'}
            </span>
          )}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-champagne-200/60 bg-champagne-50 p-2">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 text-xs font-medium text-champagne-900">
        <span>
          Đã giữ {reserved}/{total} suất
        </span>
        {product.preorder && (
          <span>
            Giao {formatDateKey(product.preorder.deliveryFrom)} – {formatDateKey(product.preorder.deliveryTo)}
            {product.sample?.deliveryWindowIsSample && ' (mẫu, chờ HTX xác nhận)'}
          </span>
        )}
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-champagne-200/70"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={reserved}
        aria-label={`Đã giữ ${reserved} trên ${total} suất`}
      >
        <div className="h-full rounded-full bg-champagne-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
