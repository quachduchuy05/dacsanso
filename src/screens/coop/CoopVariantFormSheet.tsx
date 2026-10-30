import { useState } from 'react';
import { useUi } from '../../app/UiContext';
import { BottomSheet } from '../../components/BottomSheet';
import { Field, Input, PrimaryButton } from '../../components/form';
import { formatMoney } from '../../domain/pricing';
import { findProduct, formatDateKey } from '../../domain/state';
import { coopAddVariant, familyOf, MAX_VARIANTS } from '../../store/commands/variants';
import { PRODUCT_STATUS_LABEL } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/**
 * HTX thêm quy cách bán cho sản phẩm (góp ý kiểm thử: hộp mứt có hộp 300 g, 500 g…).
 * Tên, mô tả, nhóm hàng, vùng lấy theo sản phẩm; HTX nhập quy cách, giá và tồn kho / số suất. Quy cách mới chờ duyệt.
 */
export function CoopVariantFormSheet({ productId, onClose }: { productId: string; onClose: () => void }) {
  const { state, run } = useStore();
  const { coopActor, showToast } = useUi();
  const [form, setForm] = useState({ unit: '', price: '', quantity: '' });
  const [error, setError] = useState<string | null>(null);
  const product = findProduct(state, productId);
  if (!product) return null;
  const family = familyOf(state, product).filter((p) => p.status !== 'rejected');
  const preorder = product.kind === 'preorder';
  const set = (patch: Partial<typeof form>) => {
    setError(null);
    setForm((f) => ({ ...f, ...patch }));
  };

  const save = async () => {
    const r = await run(
      (s, at) => coopAddVariant(s, coopActor, product.id, { unit: form.unit, price: Number(form.price), quantity: Number(form.quantity || 0) }, at),
      (v) => v.state,
    );
    if (!r.ok) return setError(r.error);
    showToast(`Đã thêm quy cách "${form.unit.trim()}". Trạng thái: Chờ duyệt.`);
    onClose();
  };

  return (
    <BottomSheet
      title={`Thêm quy cách: ${product.name}`}
      onClose={onClose}
      footer={
        <PrimaryButton className="w-full" onClick={save} disabled={family.length >= MAX_VARIANTS}>
          Gửi duyệt quy cách
        </PrimaryButton>
      }
    >
      <section className="space-y-1.5 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm">
        <h4 className="font-bold text-ink">
          Quy cách đang có ({family.length}/{MAX_VARIANTS})
        </h4>
        <ul className="space-y-1">
          {family.map((v) => (
            <li key={v.id} className="flex flex-wrap justify-between gap-2">
              <span className="font-semibold">{v.unit}</span>
              <span className="text-stone-600">
                {formatMoney(v.price)} · {PRODUCT_STATUS_LABEL[v.status]}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Quy cách mới">
          <Input value={form.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="Ví dụ: hộp 500 g" maxLength={40} />
        </Field>
        <Field label="Giá bán (đồng)">
          <Input type="number" inputMode="numeric" min={1} value={form.price} onChange={(e) => set({ price: e.target.value })} />
        </Field>
        <Field label={preorder ? 'Số suất' : 'Tồn kho'}>
          <Input type="number" inputMode="numeric" min={preorder ? 1 : 0} value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} />
        </Field>
      </div>
      {preorder && product.preorder && (
        <p className="text-sm text-stone-600">
          Quy cách đặt trước lấy khoảng ngày giao {formatDateKey(product.preorder.deliveryFrom)} – {formatDateKey(product.preorder.deliveryTo)} của sản phẩm; sau đó báo thu hoạch riêng ở thẻ của từng
          quy cách.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
          {error}
        </p>
      )}
      <p className="text-sm text-stone-600">Tên, mô tả, nhóm hàng và vùng lấy theo sản phẩm. Quy cách mới cần Admin – Chất lượng duyệt trước khi khách thấy.</p>
    </BottomSheet>
  );
}
