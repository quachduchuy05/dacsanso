/**
 * Yêu cầu xuất hoá đơn công ty (Giai đoạn 8, mục 6; mô phỏng): khách tuỳ chọn ở bước đặt hàng, thông tin được chốt vào từng đơn.
 * HTX và Admin – Tài chính xem được. App chưa kết nối hệ thống hoá đơn điện tử nên không phát hành hoá đơn thật.
 */
import { fail, ok, type Actor, type CompanyInvoice, type DemoState, type Order, type Result } from './types';

export const INVOICE_SIMULATED_LABEL = 'Mô phỏng – chưa phát hành hoá đơn điện tử';

/** Mã số thuế: 10 chữ số (doanh nghiệp), hoặc 10 chữ số + "-" + 3 chữ số (đơn vị phụ thuộc). */
export const TAX_CODE_RE = /^\d{10}(-\d{3})?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const INVOICE_LIMITS = { companyName: 200, address: 300, email: 120 } as const;

export const emptyInvoice = (): CompanyInvoice => ({ companyName: '', taxCode: '', address: '', email: '' });

/** Bỏ khoảng trắng thừa; mã số thuế bỏ cả khoảng trắng giữa các số. */
export function normalizeInvoice(input: CompanyInvoice): CompanyInvoice {
  const squash = (s: string) => s.trim().replace(/\s+/g, ' ');
  return { companyName: squash(input.companyName), taxCode: input.taxCode.replace(/\s+/g, ''), address: squash(input.address), email: input.email.trim().toLowerCase() };
}

/** Lỗi theo từng ô; rỗng là hợp lệ. */
export function invoiceErrors(input: CompanyInvoice): Partial<Record<keyof CompanyInvoice, string>> {
  const v = normalizeInvoice(input);
  const errors: Partial<Record<keyof CompanyInvoice, string>> = {};
  if (!v.companyName) errors.companyName = 'Vui lòng nhập tên công ty.';
  else if (v.companyName.length > INVOICE_LIMITS.companyName) errors.companyName = `Tên công ty tối đa ${INVOICE_LIMITS.companyName} ký tự.`;
  if (!v.taxCode) errors.taxCode = 'Vui lòng nhập mã số thuế.';
  else if (!TAX_CODE_RE.test(v.taxCode)) errors.taxCode = 'Mã số thuế gồm 10 chữ số, hoặc 10 chữ số + "-" + 3 chữ số.';
  if (!v.address) errors.address = 'Vui lòng nhập địa chỉ công ty.';
  else if (v.address.length > INVOICE_LIMITS.address) errors.address = `Địa chỉ tối đa ${INVOICE_LIMITS.address} ký tự.`;
  if (!v.email) errors.email = 'Vui lòng nhập email nhận hoá đơn.';
  else if (v.email.length > INVOICE_LIMITS.email || !EMAIL_RE.test(v.email)) errors.email = 'Email nhận hoá đơn không đúng định dạng.';
  return errors;
}

/** Kiểm tra và chuẩn hoá; lỗi đầu tiên làm thông báo. */
export function validateInvoice(input: CompanyInvoice): Result<CompanyInvoice> {
  const first = Object.values(invoiceErrors(input))[0];
  return first ? fail(`Thông tin hoá đơn: ${first}`) : ok(normalizeInvoice(input));
}

/** Lưu (hoặc xoá khi `invoice` là null) thông tin hoá đơn mặc định của khách. Đơn đã đặt giữ bản chốt riêng nên không đổi. */
export function saveInvoiceDefault(state: DemoState, actor: Actor, invoice: CompanyInvoice | null): Result<DemoState> {
  if (actor.kind !== 'customer' || !actor.id) return fail('Chỉ khách hàng dùng được chức năng này.');
  const customer = state.customers.find((c) => c.id === actor.id);
  if (!customer) return fail('Không tìm thấy khách hàng.');
  let value: CompanyInvoice | undefined;
  if (invoice) {
    const v = validateInvoice(invoice);
    if (!v.ok) return v;
    value = v.value;
  }
  return ok({ ...state, customers: state.customers.map((c) => (c.id === customer.id ? { ...c, invoiceDefault: value } : c)) });
}

/** Đơn có yêu cầu hoá đơn công ty, mới đặt trước (Admin – Tài chính). */
export const invoiceOrders = (state: DemoState): Order[] => state.orders.filter((o) => !!o.invoice).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
