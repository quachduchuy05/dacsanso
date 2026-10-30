import { useState } from 'react';
import { ShoppingBasket, Trash2 } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { BottomSheet } from '../../components/BottomSheet';
import { ProductImage } from '../../components/ProductImage';
import { QuantityStepper } from '../../components/QuantityStepper';
import { isOrderableIn } from '../../store/commands/cart';
import { formatMoney } from '../../domain/pricing';
import { findProduct, formatDateKey, remainingFor } from '../../domain/state';
import type { CartLine, OrderKind, Product } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';
import { useCartActions } from './useCartActions';

/**
 * Giỏ hàng dạng bottom sheet, chia hai nhóm Mua sẵn / Đặt trước (MHTT-01).
 * Khách chọn các sản phẩm muốn đặt rồi đặt chung một lần: các đơn tách theo HTX và loại hàng
 * nhưng phần trả online gộp một giao dịch (PAR-19). Sản phẩm không chọn vẫn ở lại giỏ.
 */
export function CartSheet({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const { openModal } = useUi();
  const { cart, update, remove } = useCartActions();
  // Lưu các sản phẩm khách bỏ chọn: sản phẩm mới thêm vào giỏ mặc định được chọn.
  const [unselected, setUnselected] = useState<Set<string>>(new Set());

  const withProduct = cart.map((l) => ({ line: l, product: findProduct(state, l.productId) })).filter((x): x is { line: CartLine; product: Product } => !!x.product);
  const canOrder = (p: Product) => isOrderableIn(state, p) && remainingFor(state, p) > 0;
  const orderable = withProduct.filter((x) => canOrder(x.product));
  const isSelected = (p: Product) => canOrder(p) && !unselected.has(p.id);
  const selected = withProduct.filter((x) => isSelected(x.product));
  const allSelected = orderable.length > 0 && selected.length === orderable.length;
  const subtotal = selected.reduce((s, x) => s + x.product.price * x.line.quantity, 0);
  const selectedQty = selected.reduce((s, x) => s + x.line.quantity, 0);

  const toggle = (productId: string) =>
    setUnselected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  const toggleAll = () => setUnselected(allSelected ? new Set(orderable.map((x) => x.product.id)) : new Set());

  const groups: { kind: OrderKind; title: string; items: typeof withProduct }[] = [
    { kind: 'ready', title: 'Mua sẵn', items: withProduct.filter((x) => x.product.kind === 'ready') },
    { kind: 'preorder', title: 'Đặt trước', items: withProduct.filter((x) => x.product.kind === 'preorder') },
  ];

  const row = (line: CartLine, product: Product) => {
    const remaining = remainingFor(state, product);
    const available = canOrder(product);
    const checked = isSelected(product);
    return (
      <div key={line.productId} className={`space-y-1 rounded-2xl border p-2 ${checked ? 'border-forest-600 bg-forest-50/40' : 'border-stone-200 bg-stone-50/50'}`}>
        <div className="flex items-start gap-1.5">
          <label className={`flex h-11 w-11 shrink-0 items-center justify-center ${available ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
            <input
              type="checkbox"
              className="h-5 w-5 accent-forest-700"
              checked={checked}
              disabled={!available}
              onChange={() => toggle(product.id)}
              aria-label={`Chọn ${product.name} để đặt hàng`}
            />
          </label>
          <ProductImage product={product} className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <h5 className="truncate text-sm font-bold text-ink">{product.name}</h5>
            <span className="block text-sm font-bold tabular-nums text-forest-800">
              {formatMoney(product.price)}/{product.unit}
            </span>
            <span className={`text-xs ${available ? 'text-muted' : 'font-semibold text-rose-700'}`}>
              {available ? `Còn ${remaining}` : isOrderableIn(state, product) ? 'Hết hàng' : 'Tạm ngừng bán'}
              {line.deliveryDate ? ` · giao ${formatDateKey(line.deliveryDate)}` : ''}
            </span>
          </div>
          <button onClick={() => remove(line.productId)} aria-label={`Xoá ${product.name} khỏi giỏ`} className="flex h-11 w-11 shrink-0 items-center justify-center text-muted hover:text-rose-700">
            <Trash2 size={16} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 pl-[3.25rem]">
          <span className="text-sm tabular-nums text-stone-700">{formatMoney(product.price * line.quantity)}</span>
          <QuantityStepper value={line.quantity} max={remaining} onChange={(quantity) => update(line.productId, { quantity })} itemName={product.name} />
        </div>
      </div>
    );
  };

  return (
    <BottomSheet
      title={`Giỏ hàng (${cart.length})`}
      onClose={onClose}
      footer={
        cart.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="text-stone-600">
                Đã chọn {selected.length}/{withProduct.length} sản phẩm
              </span>
              <span>
                <span className="text-stone-600">Tạm tính </span>
                <strong className="tabular-nums">{formatMoney(subtotal)}</strong>
              </span>
            </div>
            <button
              disabled={selected.length === 0}
              onClick={() => openModal({ type: 'checkout', source: { type: 'cart', productIds: selected.map((x) => x.product.id) } })}
              className="min-h-12 w-full rounded-2xl bg-forest-800 text-sm font-bold text-white hover:bg-forest-700 disabled:bg-stone-300 disabled:text-stone-600"
            >
              {selected.length === 0 ? 'Chọn sản phẩm để đặt hàng' : `Đặt hàng ${selected.length} sản phẩm (${selectedQty} món)`}
            </button>
          </div>
        )
      }
    >
      {cart.length === 0 ? (
        <div className="space-y-2 py-10 text-center text-sm text-muted">
          <ShoppingBasket size={40} className="mx-auto text-stone-300" />
          <p>Giỏ hàng chưa có sản phẩm nào.</p>
        </div>
      ) : (
        <>
          <label className={`flex min-h-11 items-center gap-2 text-sm font-semibold text-stone-800 ${orderable.length === 0 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <span className="flex h-11 w-11 items-center justify-center">
              <input type="checkbox" className="h-5 w-5 accent-forest-700" checked={allSelected} disabled={orderable.length === 0} onChange={toggleAll} />
            </span>
            Chọn tất cả ({orderable.length} sản phẩm đặt được)
          </label>
          {groups
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <section key={g.kind} className="space-y-2">
                <h4 className="text-sm font-bold text-stone-600">{g.title}</h4>
                {g.items.map((x) => row(x.line, x.product))}
              </section>
            ))}
          <p className="text-sm text-stone-600">
            Các sản phẩm đã chọn được đặt và thanh toán chung một lần; đơn tách theo HTX và loại hàng. Phí giao, mã ưu đãi và tiền cọc tính ở bước đặt hàng. Thêm vào giỏ chưa giữ
            hàng.
          </p>
        </>
      )}
    </BottomSheet>
  );
}
