import { BottomSheet } from '../../components/BottomSheet';
import { EmptyState } from '../../components/EmptyState';
import { ProductImage } from '../../components/ProductImage';
import { useUi } from '../../app/UiContext';
import { ordersAwaitingHarvest } from '../../store/commands/harvest';
import { findProduct } from '../../domain/state';
import { useStore } from '../../store/AppDataContext';
import { HarvestForm } from './HarvestForm';

/** HTX xác nhận thu hoạch cả lô cho một sản phẩm đặt trước (chủ repo yêu cầu sau Giai đoạn 6). */
export function CoopHarvestSheet({ productId, onClose }: { productId: string; onClose: () => void }) {
  const { state } = useStore();
  const { coopId } = useUi();
  const product = findProduct(state, productId);
  if (!product || product.coopId !== coopId) return null;
  const waiting = ordersAwaitingHarvest(state, productId);

  return (
    <BottomSheet title="Xác nhận thu hoạch cả lô" onClose={onClose}>
      <div className="flex items-center gap-3">
        <ProductImage product={product} className="h-16 w-16 shrink-0 rounded-2xl" />
        <div className="min-w-0 font-sans">
          <h3 className="text-base font-bold text-ink">{product.name}</h3>
          <p className="text-sm text-muted">Hàng đặt trước · {product.unit}</p>
        </div>
      </div>
      {waiting.length === 0 ? (
        <EmptyState>Không còn đơn nào chờ thu hoạch sản phẩm này.</EmptyState>
      ) : (
        <HarvestForm productId={productId} onDone={onClose} onCancel={onClose} />
      )}
    </BottomSheet>
  );
}
