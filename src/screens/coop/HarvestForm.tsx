import { useId, useState } from 'react';
import { useUi } from '../../app/UiContext';
import { Field, Input, PrimaryButton, SecondaryButton, Textarea } from '../../components/form';
import { PhotoPicker } from '../../components/PhotoPicker';
import { allocateHarvest, coopConfirmHarvest, HARVEST_NOTE_MAX_LENGTH, HARVEST_PHOTO_MAX, ordersAwaitingHarvest, quantityIn } from '../../store/commands/harvest';
import { findProduct, formatDateKey, toDateKey } from '../../domain/state';
import { useStore } from '../../store/AppDataContext';

/**
 * Biểu mẫu HTX xác nhận thu hoạch xong (chủ repo yêu cầu sau Giai đoạn 6).
 * Có `orderId`: xác nhận cho một đơn. Không có: xác nhận cả lô, nhập sản lượng, xem trước đơn nào đủ hàng
 * (chia theo thứ tự đặt, đơn đặt sớm nhận trước).
 */
export function HarvestForm({ productId, orderId, onDone, onCancel }: { productId: string; orderId?: string; onDone: () => void; onCancel?: () => void }) {
  const { state, run, now } = useStore();
  const { coopActor, showToast } = useUi();
  const listId = useId();
  const today = toDateKey(now());
  const [harvestedOn, setHarvestedOn] = useState(today);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [reportReady, setReportReady] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Sửa bất kỳ ô nào thì ẩn lỗi của lần bấm trước.
  const edit =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      setError(null);
      set(v);
    };
  const product = findProduct(state, productId);
  if (!product) return null;

  const waiting = ordersAwaitingHarvest(state, productId);
  const q = Number(quantity);
  const validQty = quantity.trim() !== '' && Number.isInteger(q) && q >= 1;
  const alloc = allocateHarvest(waiting, productId, validQty ? q : 0);
  const coveredIds = new Set(alloc.covered.map((o) => o.id));
  const batch = !orderId;

  const submit = async () => {
    setError(null);
    const r = await run(
      (s, at) => coopConfirmHarvest(s, coopActor, { productId, orderId, harvestedOn, quantity: batch ? (validQty ? q : 0) : undefined, note, photos, reportReady }, at),
      (v) => v.state,
    );
    if (!r.ok) {
      setError(r.error);
      return;
    }
    const { covered, uncovered, ready } = r.value;
    const parts = [batch ? `Đã xác nhận thu hoạch cho ${covered.length} đơn` : 'Đã xác nhận thu hoạch'];
    if (ready.length > 0) parts.push(batch ? `báo sẵn sàng giao ${ready.length} đơn` : 'báo sẵn sàng giao');
    let message = `${parts.join(', ')}.`;
    if (batch && uncovered.length > 0) message += ` ${uncovered.length} đơn chờ lần thu hoạch sau.`;
    if (ready.length === 0) message += ' Khách được thông báo.';
    showToast(message);
    onDone();
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      <Field label="Ngày thu hoạch" hint="Không chọn được ngày sau hôm nay.">
        <Input type="date" required max={today} value={harvestedOn} onChange={(e) => edit(setHarvestedOn)(e.target.value)} />
      </Field>

      {batch && (
        <>
          <Field label={`Sản lượng thu được (${product.unit})`} hint={`${waiting.length} đơn đang chờ, cần tổng ${alloc.needed.toLocaleString('vi-VN')} ${product.unit}.`}>
            <Input type="number" inputMode="numeric" min={1} step={1} required value={quantity} onChange={(e) => edit(setQuantity)(e.target.value)} placeholder={`Ví dụ: ${alloc.needed}`} />
          </Field>
          <div className="space-y-2 rounded-2xl border border-champagne-200 bg-champagne-50/60 p-3">
            <p id={listId} className="text-sm font-semibold text-ink" aria-live="polite">
              {validQty
                ? `Đủ hàng cho ${alloc.covered.length}/${waiting.length} đơn${
                    alloc.covered.length === 0
                      ? ` · đơn đặt sớm nhất cần ${quantityIn(waiting[0], productId)} ${product.unit}`
                      : q > alloc.used && alloc.uncovered.length === 0
                        ? ` · dư ${(q - alloc.used).toLocaleString('vi-VN')} ${product.unit}`
                        : ''
                  }`
                : 'Nhập sản lượng để xem đơn nào đủ hàng'}
            </p>
            <ol aria-labelledby={listId} className="space-y-1 text-sm">
              {waiting.map((o, i) => {
                const ok = coveredIds.has(o.id);
                return (
                  <li key={o.id} className={`flex flex-wrap items-baseline justify-between gap-x-2 rounded-xl px-2 py-1.5 ${ok ? 'bg-white font-semibold text-ink' : 'text-stone-600'}`}>
                    <span>
                      <span className="text-muted">{i + 1}.</span> <span className="font-mono">{o.id}</span>
                    </span>
                    <span className="tabular-nums">
                      {quantityIn(o, productId)} {product.unit}
                      {o.deliveryDate ? ` · giao ${formatDateKey(o.deliveryDate)}` : ''}
                      {validQty && <span className={ok ? 'text-forest-800' : 'text-muted'}>{ok ? ' · đủ hàng' : ' · chờ lần sau'}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="text-xs text-muted">Hàng chia theo thứ tự đặt: đơn đặt sớm nhận trước. Đơn chưa đủ hàng giữ nguyên Chờ thu hoạch, chờ lần thu hoạch sau.</p>
          </div>
        </>
      )}

      <Field label="Ghi chú (không bắt buộc)" hint="Khách thấy ghi chú này trong hành trình đơn hàng.">
        <Textarea rows={2} maxLength={HARVEST_NOTE_MAX_LENGTH} value={note} onChange={(e) => edit(setNote)(e.target.value)} placeholder="Ví dụ: hái sáng sớm, đã phân loại quả đều" />
      </Field>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-stone-700">Ảnh lô hàng (không bắt buộc)</p>
        <PhotoPicker photos={photos} onChange={edit(setPhotos)} max={HARVEST_PHOTO_MAX} />
      </div>

      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-champagne-200 bg-white p-3">
        <input type="checkbox" checked={reportReady} onChange={(e) => edit(setReportReady)(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-forest-800" />
        <span className="text-sm text-stone-700">
          <span className="block font-semibold text-ink">Báo sẵn sàng giao luôn</span>
          Cho các đơn đã thu hoạch đủ mọi sản phẩm. Bỏ chọn nếu còn cần phân loại, đóng gói trước khi giao.
        </span>
      </label>

      <p className="text-xs text-muted">Ngày thu hoạch, ghi chú và ảnh do HTX tự khai, sàn không kiểm chứng.</p>

      {error && (
        <p role="alert" className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <SecondaryButton type="button" onClick={onCancel}>
            Huỷ
          </SecondaryButton>
        )}
        <PrimaryButton type="submit" className="flex-1">
          Xác nhận đã thu hoạch xong
        </PrimaryButton>
      </div>
    </form>
  );
}
