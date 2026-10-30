import { useState } from 'react';
import { useUi } from '../../app/UiContext';
import { BottomSheet } from '../../components/BottomSheet';
import { DangerButton, PrimaryButton } from '../../components/form';
import { InvoiceFields } from '../../components/InvoiceFields';
import { emptyInvoice, invoiceErrors, saveInvoiceDefault } from '../../store/commands/invoice';
import type { CompanyInvoice } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/** Thông tin xuất hoá đơn công ty mặc định (mô phỏng): điền sẵn ở bước đặt hàng. Đổi ở đây không ảnh hưởng đơn đã đặt. */
export function InvoiceDefaultSheet({ onClose }: { onClose: () => void }) {
  const { state, run } = useStore();
  const { customerActor, showToast } = useUi();
  const saved = state.customers.find((c) => c.id === customerActor.id)?.invoiceDefault;
  const [value, setValue] = useState<CompanyInvoice>(saved ?? emptyInvoice());
  const [tried, setTried] = useState(false);
  const errors = tried ? invoiceErrors(value) : {};

  const save = async () => {
    setTried(true);
    if (Object.keys(invoiceErrors(value)).length > 0) return;
    const r = await run((s) => saveInvoiceDefault(s, customerActor, value));
    showToast(r.ok ? 'Đã lưu thông tin hoá đơn. Đơn đã đặt giữ thông tin lúc đặt.' : r.error);
    if (r.ok) onClose();
  };
  const remove = async () => {
    const r = await run((s) => saveInvoiceDefault(s, customerActor, null));
    showToast(r.ok ? 'Đã xoá thông tin hoá đơn mặc định.' : r.error);
    if (r.ok) onClose();
  };

  return (
    <BottomSheet
      title="Thông tin hoá đơn công ty"
      onClose={onClose}
      footer={
        <div className={`grid gap-2 ${saved ? 'grid-cols-2' : ''}`}>
          {saved && <DangerButton onClick={remove}>Xoá thông tin</DangerButton>}
          <PrimaryButton onClick={save}>Lưu thông tin</PrimaryButton>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-stone-600">Thông tin này được điền sẵn khi bạn chọn "Xuất hoá đơn công ty" ở bước đặt hàng. Mỗi đơn giữ thông tin lúc đặt.</p>
        <InvoiceFields value={value} onChange={setValue} errors={errors} />
      </div>
    </BottomSheet>
  );
}
