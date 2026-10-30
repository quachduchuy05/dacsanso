import { useState } from 'react';
import { useUi } from '../../app/UiContext';
import { Field, Input, PrimaryButton, SecondaryButton, Select } from '../../components/form';
import { adminCreateVoucher, adminSetVoucherActive, type VoucherInput } from '../../store/commands/adminConfig';
import { voucherUsedCount } from '../../store/commands/checkout';
import { formatMoney } from '../../domain/pricing';
import { CATEGORY_LABEL, type Category } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/** Mã ưu đãi (FR-HT-01): Admin tạo mã. Mã chỉ giảm tiền hàng; mỗi lần đặt 1 mã (PAR-28). */
export function VouchersTab() {
  const { state, run, now } = useStore();
  const { adminActor, showToast } = useUi();
  const [form, setForm] = useState({ code: '', title: '', kind: 'fixed' as 'fixed' | 'percent', value: '', maxDiscount: '', minSpend: '0', category: '', coopId: '', expiresAt: '', usageLimit: '100', firstOrderOnly: false });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const create = async () => {
    const input: VoucherInput = {
      code: form.code,
      title: form.title,
      kind: form.kind,
      value: Number(form.value),
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      minSpend: Number(form.minSpend),
      categories: form.category ? [form.category as Category] : undefined,
      coopIds: form.coopId ? [form.coopId] : undefined,
      expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : '',
      usageLimit: Number(form.usageLimit),
      firstOrderOnly: form.firstOrderOnly,
    };
    const r = await run((s, at) => adminCreateVoucher(s, adminActor, input, at));
    showToast(r.ok ? `Đã tạo mã ${input.code.toUpperCase()}.` : r.error);
  };
  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-3">
        <h3 className="text-base font-bold">Tạo mã ưu đãi</h3>
        <p className="text-sm text-stone-600">Mã chỉ giảm tiền hàng của sản phẩm hợp lệ, không giảm phí giao, phụ phí hoả tốc hay phí hộp quà. Sàn chịu chi phí mã.</p>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Mã">
            <Input value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="VD: GIAM20K" />
          </Field>
          <Field label="Mô tả">
            <Input value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field label="Kiểu giảm">
            <Select value={form.kind} onChange={(e) => set({ kind: e.target.value as 'fixed' | 'percent' })}>
              <option value="fixed">Số tiền</option>
              <option value="percent">Phần trăm</option>
            </Select>
          </Field>
          <Field label={form.kind === 'fixed' ? 'Số tiền giảm (đ)' : 'Phần trăm giảm'}>
            <Input type="number" value={form.value} onChange={(e) => set({ value: e.target.value })} />
          </Field>
          {form.kind === 'percent' && (
            <Field label="Giảm tối đa (đ)">
              <Input type="number" value={form.maxDiscount} onChange={(e) => set({ maxDiscount: e.target.value })} />
            </Field>
          )}
          <Field label="Chi tối thiểu (đ, trên tiền hàng hợp lệ)">
            <Input type="number" value={form.minSpend} onChange={(e) => set({ minSpend: e.target.value })} />
          </Field>
          <Field label="Chỉ nhóm hàng">
            <Select value={form.category} onChange={(e) => set({ category: e.target.value })}>
              <option value="">Mọi nhóm</option>
              {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Chỉ HTX">
            <Select value={form.coopId} onChange={(e) => set({ coopId: e.target.value })}>
              <option value="">Mọi HTX</option>
              {state.coops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hạn dùng">
            <Input type="date" value={form.expiresAt} onChange={(e) => set({ expiresAt: e.target.value })} />
          </Field>
          <Field label="Số lượt">
            <Input type="number" value={form.usageLimit} onChange={(e) => set({ usageLimit: e.target.value })} />
          </Field>
          <label className="flex min-h-11 items-center gap-2 self-end text-sm font-semibold">
            <input type="checkbox" className="h-5 w-5" checked={form.firstOrderOnly} onChange={(e) => set({ firstOrderOnly: e.target.checked })} />
            Chỉ khách lần đầu
          </label>
        </div>
        <PrimaryButton onClick={create}>Tạo mã</PrimaryButton>
      </section>
      <div className="relative min-w-0 max-w-full overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-stone-50 text-xs text-muted">
            <tr>
              <th className="px-3 py-2">Mã</th>
              <th className="px-3 py-2">Điều kiện</th>
              <th className="px-3 py-2">Hạn</th>
              <th className="px-3 py-2">Lượt đã giữ/dùng</th>
              <th className="px-3 py-2">Trạng thái</th>
              <th className="px-3 py-2">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {state.vouchers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-stone-600">
                  Chưa có mã ưu đãi nào. Tạo mã ở biểu mẫu phía trên.
                </td>
              </tr>
            )}
            {state.vouchers.map((v) => {
              const expired = new Date(v.expiresAt).getTime() < now().getTime();
              return (
                <tr key={v.id}>
                  <td className="px-3 py-2 font-mono font-bold">{v.code}</td>
                  <td className="px-3 py-2">
                    {v.title}
                    <span className="block text-xs text-muted">
                      {v.kind === 'fixed' ? formatMoney(v.value) : `${v.value}%${v.maxDiscount ? `, tối đa ${formatMoney(v.maxDiscount)}` : ''}`} · chi từ {formatMoney(v.minSpend)}
                      {v.categories ? ` · ${v.categories.map((c) => CATEGORY_LABEL[c as Category]).join(', ')}` : ''}
                      {v.coopIds ? ` · ${v.coopIds.map((id) => state.coops.find((c) => c.id === id)?.name).join(', ')}` : ''}
                      {v.firstOrderOnly ? ' · khách lần đầu' : ''}
                    </span>
                  </td>
                  <td className="px-3 py-2">{new Date(v.expiresAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-3 py-2">
                    {voucherUsedCount(state, v.id)}/{v.usageLimit}
                  </td>
                  <td className="px-3 py-2">{v.active === false ? 'Đã tắt' : expired ? 'Hết hạn' : 'Đang áp dụng'}</td>
                  <td className="px-3 py-2">
                    <SecondaryButton
                      onClick={async () => {
                        const r = await run((s, at) => adminSetVoucherActive(s, adminActor, v.id, v.active === false, at));
                        showToast(r.ok ? 'Đã cập nhật mã.' : r.error);
                      }}
                    >
                      {v.active === false ? 'Bật lại' : 'Tắt mã'}
                    </SecondaryButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
