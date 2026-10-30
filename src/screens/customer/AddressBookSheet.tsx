import { useState } from 'react';
import { CheckCircle2, Circle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { BottomSheet } from '../../components/BottomSheet';
import { EmptyState } from '../../components/EmptyState';
import { deleteAddress, MAX_ADDRESSES, setDefaultAddress } from '../../store/commands/address';
import { snapshotAddress } from '../../domain/state';
import { useStore } from '../../store/AppDataContext';

/**
 * Sổ địa chỉ (FR-TK-04): tối đa 10 địa chỉ, sửa, xoá.
 * Bấm vào một địa chỉ để chọn làm địa chỉ nhận hàng: địa chỉ đó thành mặc định, hiện ở thanh "Nhận hàng tại" và được chọn sẵn khi đặt hàng.
 * Nhãn ghi "Mặc định", không ghi "Đang giao tới" để khỏi bị hiểu nhầm là có đơn đang giao.
 */
export function AddressBookSheet({ onClose }: { onClose: () => void }) {
  const { state, run } = useStore();
  const { customerActor, openModal, showToast } = useUi();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const mine = state.addresses.filter((a) => a.customerId === customerActor.id);
  const full = mine.length >= MAX_ADDRESSES;

  const choose = async (id: string, label: string) => {
    const current = mine.find((a) => a.isDefault);
    if (current?.id !== id) {
      const r = await run((s) => setDefaultAddress(s, customerActor.id!, id));
      if (!r.ok) return showToast(r.error);
    }
    showToast(`Địa chỉ nhận hàng: ${label}.`);
    onClose();
  };

  return (
    <BottomSheet
      title={
        <>
            Sổ địa chỉ
            <span className="block font-sans text-sm font-normal text-muted">
              {mine.length}/{MAX_ADDRESSES} địa chỉ · chỉ giao trong Hà Nội
            </span>
        </>
      }
      onClose={onClose}
      footer={
        <button
          disabled={full}
          onClick={() => openModal({ type: 'address_form' })}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-forest-800 text-sm font-bold text-white disabled:bg-stone-300 disabled:text-stone-600"
        >
          <Plus size={16} />
          {full ? `Đã đủ ${MAX_ADDRESSES} địa chỉ` : 'Thêm địa chỉ'}
        </button>
      }
    >
      {mine.length === 0 ? (
        <EmptyState>Chưa có địa chỉ nào. Bấm "Thêm địa chỉ" để thêm địa chỉ giao hàng tại Hà Nội.</EmptyState>
      ) : (
        <>
          <p className="text-sm text-stone-600">Bấm vào một địa chỉ để chọn làm địa chỉ nhận hàng khi đặt đơn.</p>
          <div className="space-y-2" role="radiogroup" aria-label="Chọn địa chỉ giao hàng">
            {mine.map((a) => (
              <div key={a.id} className={`rounded-2xl border ${a.isDefault ? 'border-forest-600 bg-forest-50/50' : 'border-stone-200 bg-white'}`}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={a.isDefault}
                  onClick={() => choose(a.id, a.label)}
                  className="flex w-full items-start gap-3 rounded-2xl p-3 text-left hover:bg-forest-50/60"
                >
                  {a.isDefault ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-forest-700" aria-hidden /> : <Circle size={20} className="mt-0.5 shrink-0 text-muted" aria-hidden />}
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-ink">
                        {a.label}
                        {a.isDefault && <span className="ml-2 rounded-md bg-forest-700 px-1.5 py-0.5 text-xs text-white">Mặc định</span>}
                      </span>
                      <span className="text-xs text-muted">{a.houseType === 'apartment' ? 'Chung cư' : 'Nhà mặt đất'}</span>
                    </span>
                    <span className="block text-sm text-stone-700">
                      {a.receiverName} · {a.receiverPhone}
                    </span>
                    <span className="block text-sm text-stone-600">{snapshotAddress(state, a).text}</span>
                  </span>
                </button>
                <div className="flex gap-1 px-3 pb-2">
                  <button onClick={() => openModal({ type: 'address_form', addressId: a.id })} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-stone-700 hover:bg-stone-100">
                    <Pencil size={14} /> Sửa
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(a.id)}
                    aria-expanded={confirmDeleteId === a.id}
                    className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 size={14} /> Xoá
                  </button>
                </div>
                {/* Xác nhận ngay trong trang: hộp confirm() của trình duyệt bị chặn khi app chạy trong khung nhúng. */}
                {confirmDeleteId === a.id && (
                  <div role="alert" className="mx-3 mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 p-2 text-sm text-rose-900">
                    <span className="min-w-0 flex-1">Xoá địa chỉ "{a.label}"?</span>
                    <button onClick={() => setConfirmDeleteId(null)} className="min-h-11 rounded-lg px-3 font-semibold text-stone-700 hover:bg-white">
                      Huỷ
                    </button>
                    <button
                      onClick={async () => {
                        const r = await run((s) => deleteAddress(s, customerActor.id!, a.id));
                        showToast(r.ok ? 'Đã xoá địa chỉ.' : r.error);
                        setConfirmDeleteId(null);
                      }}
                      className="min-h-11 rounded-lg bg-rose-700 px-3 font-semibold text-white hover:bg-rose-800"
                    >
                      Xoá địa chỉ
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </BottomSheet>
  );
}
