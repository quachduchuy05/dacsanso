import { INVOICE_LIMITS, INVOICE_SIMULATED_LABEL } from '../store/commands/invoice';
import type { CompanyInvoice } from '../domain/types';
import { Field, Input } from './form';

/**
 * Ô nhập thông tin xuất hoá đơn công ty (Giai đoạn 8, mục 6), dùng ở bước đặt hàng và ở Tài khoản.
 * `errors` chỉ hiện sau khi khách bấm lưu / đặt hàng, để không báo lỗi khi đang gõ.
 */
export function InvoiceFields({ value, onChange, errors = {} }: { value: CompanyInvoice; onChange: (v: CompanyInvoice) => void; errors?: Partial<Record<keyof CompanyInvoice, string>> }) {
  const set = (k: keyof CompanyInvoice) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  const err = (k: keyof CompanyInvoice) =>
    errors[k] ? (
      <span role="alert" className="font-semibold text-rose-700">
        {errors[k]}
      </span>
    ) : undefined;
  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700">{INVOICE_SIMULATED_LABEL}. Không nhập thông tin công ty thật.</p>
      <Field label="Tên công ty" hint={err('companyName')}>
        <Input value={value.companyName} onChange={set('companyName')} maxLength={INVOICE_LIMITS.companyName} autoComplete="organization" aria-invalid={!!errors.companyName} />
      </Field>
      <Field label="Mã số thuế" hint={err('taxCode') ?? '10 chữ số, hoặc 10 chữ số + "-" + 3 chữ số.'}>
        <Input value={value.taxCode} onChange={set('taxCode')} inputMode="numeric" maxLength={20} aria-invalid={!!errors.taxCode} />
      </Field>
      <Field label="Địa chỉ công ty" hint={err('address')}>
        <Input value={value.address} onChange={set('address')} maxLength={INVOICE_LIMITS.address} aria-invalid={!!errors.address} />
      </Field>
      <Field label="Email nhận hoá đơn" hint={err('email')}>
        <Input type="email" value={value.email} onChange={set('email')} maxLength={INVOICE_LIMITS.email} autoComplete="email" aria-invalid={!!errors.email} />
      </Field>
    </div>
  );
}

/** Thông tin hoá đơn đã chốt trong đơn (HTX, Admin – Tài chính, khách). */
export function InvoiceSummary({ invoice }: { invoice: CompanyInvoice }) {
  return (
    <div className="space-y-1 text-sm">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="text-muted">Công ty</dt>
        <dd className="font-semibold break-words text-ink">{invoice.companyName}</dd>
        <dt className="text-muted">Mã số thuế</dt>
        <dd className="font-semibold tabular-nums text-ink">{invoice.taxCode}</dd>
        <dt className="text-muted">Địa chỉ</dt>
        <dd className="break-words text-ink">{invoice.address}</dd>
        <dt className="text-muted">Email</dt>
        <dd className="break-all text-ink">{invoice.email}</dd>
      </dl>
      <p className="text-xs font-semibold text-stone-600">{INVOICE_SIMULATED_LABEL}.</p>
    </div>
  );
}
