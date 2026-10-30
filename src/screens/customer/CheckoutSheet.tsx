/**
 * Đặt hàng 3 bước (MHTT-02..05, mục 5.1–5.4).
 * 1. Giao hàng: địa chỉ, ngày giao (đặt trước), cách giao, hộp quà, ghi chú.
 * 2. Ưu đãi & thanh toán: panel chọn 1 mã nằm ngay trong màn này (L7), COD/online theo từng đơn, điều kiện huỷ đặt trước,
 *    yêu cầu xuất hoá đơn công ty (Giai đoạn 8, mô phỏng).
 * 3. Xác nhận: từng đơn, từng món, từng khoản phí; nút ghi đúng số tiền trả ngay (L1).
 * Mọi phép tính tiền nằm ở src/domain (planCheckout / placeCheckout).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, Gift, Plus, Ticket } from 'lucide-react';
import { useUi, type CheckoutSource } from '../../app/UiContext';
import { BottomSheet } from '../../components/BottomSheet';
import { Field, Input, PrimaryButton, SecondaryButton, Select, Textarea } from '../../components/form';
import { InvoiceFields, InvoiceSummary } from '../../components/InvoiceFields';
import { defaultAddressOf } from '../../store/commands/address';
import { acceptCurrentPrices, deliveryWindow, revalidateLines, type RevalidationNotice } from '../../store/commands/cart';
import { evaluateVoucherFor, groupKey, placeCheckout, planCheckout, type GroupOptions, type PlannedOrder } from '../../store/commands/checkout';
import { generateId } from '../../domain/ids';
import { emptyInvoice, invoiceErrors, normalizeInvoice } from '../../store/commands/invoice';
import { isVoucherSaved, savedFirst } from '../../store/commands/marketplace';
import { formatMoney, type PaymentMethod } from '../../domain/pricing';
import { findProduct, formatDateKey, snapshotAddress } from '../../domain/state';
import { PHONE_RULE } from '../../domain/phone';
import { ORDER_KIND_LABEL, type CartLine, type CompanyInvoice } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

type Step = 1 | 2 | 3;
const STEP_LABEL: Record<Step, string> = { 1: 'Giao hàng', 2: 'Ưu đãi & thanh toán', 3: 'Xác nhận' };

function noticeText(n: RevalidationNotice): string {
  switch (n.type) {
    case 'price_down':
      return `${n.name}: giá giảm từ ${formatMoney(n.oldPrice)} còn ${formatMoney(n.newPrice)}, đã áp giá mới.`;
    case 'price_up':
      return `${n.name}: giá tăng từ ${formatMoney(n.oldPrice)} lên ${formatMoney(n.newPrice)}. Vui lòng xác nhận lại ở bước cuối.`;
    case 'reduced':
      return `${n.name}: chỉ còn ${n.to}, đã giảm số lượng từ ${n.from} xuống ${n.to}.`;
    case 'removed':
      return `${n.name}: ${n.reason}, đã bỏ khỏi đơn.`;
  }
}

export function CheckoutSheet({ source, preferredAddressId, onClose }: { source: CheckoutSource; preferredAddressId?: string; onClose: () => void }) {
  const { state, now, run } = useStore();
  const { customerActor, openModal, showToast, openOrders } = useUi();
  const customerId = customerActor.id!;

  // Đặt từ giỏ: chỉ các sản phẩm khách đã chọn; sản phẩm không chọn vẫn ở lại giỏ.
  const initialLines =
    source.type === 'cart'
      ? (state.carts[customerId] ?? []).filter((l) => !source.productIds || source.productIds.includes(l.productId))
      : [source.line];
  const [step, setStep] = useState<Step>(1);
  const [lines, setLines] = useState<CartLine[]>(initialLines);
  const [notices, setNotices] = useState<RevalidationNotice[]>([]);
  // Địa chỉ chọn sẵn: địa chỉ vừa thêm từ bước này (nếu có), không thì địa chỉ mặc định.
  const [addressId, setAddressId] = useState(
    (preferredAddressId && state.addresses.some((a) => a.id === preferredAddressId && a.customerId === customerId) ? preferredAddressId : undefined) ??
      defaultAddressOf(state, customerId)?.id ??
      '',
  );
  const [options, setOptions] = useState<Record<string, GroupOptions>>({});
  const [voucherId, setVoucherId] = useState<string | undefined>();
  const [voucherCode, setVoucherCode] = useState('');
  const [note, setNote] = useState('');
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [confirmedPriceUp, setConfirmedPriceUp] = useState(false);
  const [placing, setPlacing] = useState(false);
  // Hoá đơn công ty: điền sẵn thông tin mặc định khách đã lưu.
  const savedInvoice = state.customers.find((c) => c.id === customerId)?.invoiceDefault;
  const [wantInvoice, setWantInvoice] = useState(false);
  const [invoice, setInvoice] = useState<CompanyInvoice>(savedInvoice ?? emptyInvoice());
  const [saveInvoice, setSaveInvoice] = useState(false);
  const allInvoiceErrors = wantInvoice ? invoiceErrors(invoice) : {};
  // Chỉ báo lỗi ô đã nhập; ô còn trống báo ở chân màn.
  const invoiceFieldErrors = Object.fromEntries(Object.entries(allInvoiceErrors).filter(([k]) => invoice[k as keyof CompanyInvoice].trim() !== ''));
  // Một lần mở màn đặt hàng = một khoá chống tạo trùng (BR-DAT-07).
  const idempotencyKey = useRef(generateId('IDEM')).current;

  // BR-DAT-03: kiểm tra lại giá và tồn khi mở màn Đặt hàng.
  useEffect(() => {
    const re = revalidateLines(state, initialLines);
    setLines(re.lines);
    setNotices(re.notices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const at = now();
  const input = { customerId, lines, addressId, voucherId, note, groupOptions: options };
  const plan = useMemo(() => planCheckout(state, input, at), [state, lines, addressId, voucherId, note, options, step]); // eslint-disable-line react-hooks/exhaustive-deps
  const addresses = state.addresses.filter((a) => a.customerId === customerId);

  /**
   * Chọn hoặc bỏ mã ưu đãi (BR-KM-01..08). Mã chưa đủ điều kiện thì không chọn được và báo lý do.
   * `fromInput`: nhập tay thì luôn áp dụng (không bỏ chọn khi nhập lại mã đang dùng). Trả về true nếu đã áp dụng.
   */
  const chooseVoucher = (id: string, fromInput = false): boolean => {
    const v = state.vouchers.find((x) => x.id === id);
    if (!v) return false;
    if (voucherId === id && !fromInput) {
      setVoucherId(undefined);
      showToast(`Đã bỏ mã ${v.code}.`);
      return false;
    }
    const ev = evaluateVoucherFor(state, v, customerId, lines, at);
    if (!ev.ok) {
      showToast(`Chưa dùng được mã ${v.code}: ${ev.error}`);
      return false;
    }
    setVoucherId(id);
    showToast(`Đã áp dụng mã ${v.code}: giảm ${formatMoney(ev.value.discount)}.`);
    return true;
  };
  const priceUp = notices.some((n) => n.type === 'price_up');

  const setOpt = (key: string, patch: Partial<GroupOptions>) =>
    setOptions((prev) => {
      const order = plan.orders.find((o) => o.key === key);
      const base: GroupOptions = prev[key] ?? { shipping: order?.shipping ?? 'standard', paymentMethod: order?.paymentMethod ?? 'online' };
      return { ...prev, [key]: { ...base, ...patch } };
    });

  const setLineDate = (productId: string, date: string) => {
    const old = lines.find((l) => l.productId === productId);
    const product = findProduct(state, productId);
    if (!old || !product) return;
    // Khoá nhóm đổi theo ngày giao: chuyển tuỳ chọn sang khoá mới.
    const oldKey = groupKey(product.coopId, 'preorder', old.deliveryDate);
    const newKey = groupKey(product.coopId, 'preorder', date);
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, deliveryDate: date } : l)));
    if (options[oldKey]) setOptions((prev) => ({ ...prev, [newKey]: prev[oldKey] }));
  };

  const stepErrors = (s: Step): string[] => {
    if (s === 1) return plan.errors;
    if (s === 2) {
      const invoiceError = Object.values(allInvoiceErrors)[0];
      if (invoiceError) return [`Thông tin hoá đơn: ${invoiceError}`];
      return plan.hasPreorder && !acceptedPolicy ? ['Vui lòng đọc và tick đồng ý điều kiện huỷ đơn đặt trước.'] : [];
    }
    return priceUp && !confirmedPriceUp ? ['Vui lòng xác nhận giá mới trước khi đặt.'] : [];
  };

  const place = async () => {
    if (placing) return;
    setPlacing(true);
    const placeLines = confirmedPriceUp ? acceptCurrentPrices(state, lines) : lines;
    let outcome: ReturnType<typeof placeCheckout> | undefined;
    const saved = await run(
      (s, t) => {
        outcome = placeCheckout(
          s,
          {
            ...input,
            lines: placeLines,
            idempotencyKey,
            acceptedPreorderPolicy: acceptedPolicy,
            confirmedPriceIncrease: confirmedPriceUp,
            fromCart: source.type === 'cart',
            invoice: wantInvoice ? invoice : undefined,
            saveInvoiceAsDefault: wantInvoice && saveInvoice,
          },
          customerActor,
          t,
        );
        return outcome.ok ? { ok: true, value: outcome.state } : { ok: false, error: outcome.error };
      },
    );
    setPlacing(false);
    if (!saved.ok) { showToast(saved.error); return; }
    if (!outcome) return;
    if (!outcome.ok) {
      if (outcome.lines) setLines(outcome.lines);
      if (outcome.notices) setNotices(outcome.notices);
      if (outcome.dropVoucher) setVoucherId(undefined);
      showToast(outcome.error);
      return;
    }
    if (outcome.transaction && outcome.transaction.status === 'pending') {
      openModal({ type: 'payment', txId: outcome.transaction.id });
    } else {
      onClose();
      openOrders('all');
      showToast(outcome.reused ? 'Lần đặt này đã được tạo trước đó.' : `Đã tạo ${outcome.checkout.orderIds.length} đơn. Đơn thanh toán khi nhận hàng đang chờ HTX xác nhận.`);
    }
  };

  const payNow = plan.totals.payNowOnline;
  const errors = stepErrors(step);

  return (
    <BottomSheet
      title={
        <div className="space-y-2">
          <span className="block">Đặt hàng</span>
          <ol className="flex gap-1 font-sans text-xs font-semibold" aria-label="Các bước đặt hàng">
            {([1, 2, 3] as Step[]).map((s) => (
              <li key={s} aria-current={step === s ? 'step' : undefined} className={`flex-1 rounded-lg px-2 py-1 text-center ${step === s ? 'bg-forest-800 text-white' : s < step ? 'bg-forest-100 text-forest-800' : 'bg-stone-100 text-muted'}`}>
                {s}. {STEP_LABEL[s]}
              </li>
            ))}
          </ol>
        </div>
      }
      onClose={onClose}
      footer={
        <div className="space-y-2">
          {errors.length > 0 && step !== 1 && <p className="text-sm font-semibold text-rose-700">{errors[0]}</p>}
          <div className="flex gap-2">
            {step > 1 && (
              <SecondaryButton onClick={() => setStep((s) => (s - 1) as Step)} aria-label="Quay lại bước trước" className="flex items-center gap-1">
                <ChevronLeft size={16} />
                Quay lại
              </SecondaryButton>
            )}
            {step < 3 ? (
              <PrimaryButton className="flex-1" disabled={errors.length > 0 || lines.length === 0} onClick={() => setStep((s) => (s + 1) as Step)}>
                Tiếp tục
              </PrimaryButton>
            ) : (
              <PrimaryButton className="flex-1" disabled={placing || errors.length > 0 || plan.errors.length > 0 || lines.length === 0} onClick={place}>
                {placing ? 'Đang đặt…' : payNow > 0 ? `Đặt hàng – trả ngay ${formatMoney(payNow)}` : 'Đặt hàng – thanh toán khi nhận'}
              </PrimaryButton>
            )}
          </div>
        </div>
      }
    >
      {notices.length > 0 && (
        <div className="space-y-1 rounded-2xl border border-champagne-300 bg-champagne-50 p-3 text-sm text-champagne-950" role="alert">
          <p className="flex items-center gap-1.5 font-bold">
            <AlertTriangle size={16} /> Giỏ hàng vừa được kiểm tra lại
          </p>
          {notices.map((n, i) => (
            <p key={i}>{noticeText(n)}</p>
          ))}
        </div>
      )}

      {lines.length === 0 && <p className="rounded-2xl border border-dashed border-stone-300 p-4 text-center text-sm text-stone-600">Không còn sản phẩm nào để đặt.</p>}

      {step === 1 && (
        <StepDelivery
          plan={plan.orders}
          lines={lines}
          addresses={addresses.map((a) => ({ id: a.id, label: `${a.label}: ${snapshotAddress(state, a).text}` }))}
          addressId={addressId}
          setAddressId={setAddressId}
          onAddAddress={() => openModal({ type: 'address_form', returnTo: { type: 'checkout', source } })}
          setLineDate={setLineDate}
          setOpt={setOpt}
          options={options}
          note={note}
          setNote={setNote}
          errors={plan.errors}
        />
      )}

      {step === 2 && (
        <>
          <section className="space-y-2 rounded-2xl border border-stone-200 p-3" aria-label="Mã ưu đãi">
            <h4 className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <Ticket size={16} /> Mã ưu đãi <span className="font-normal text-muted">(mỗi lần đặt dùng tối đa {state.params.vouchersPerCheckout} mã)</span>
            </h4>
            {plan.voucher && (
              <div
                className={`flex flex-wrap items-center gap-2 rounded-xl border p-2.5 text-sm ${plan.voucherError ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-forest-600 bg-forest-50 text-forest-900'}`}
              >
                <span className="min-w-0 flex-1">
                  {plan.voucherError ? (
                    <>
                      Mã <strong>{plan.voucher.code}</strong> không còn dùng được: {plan.voucherError}
                    </>
                  ) : (
                    <>
                      Đang áp dụng mã <strong>{plan.voucher.code}</strong>: giảm {formatMoney(plan.voucherDiscount)}
                    </>
                  )}
                </span>
                <button type="button" onClick={() => setVoucherId(undefined)} className="min-h-11 rounded-lg px-3 font-semibold hover:bg-white">
                  Bỏ mã
                </button>
              </div>
            )}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const code = voucherCode.trim();
                if (!code) return showToast('Vui lòng nhập mã ưu đãi.');
                const v = state.vouchers.find((x) => x.code === code);
                if (!v) return showToast(`Mã "${code}" không tồn tại.`);
                if (chooseVoucher(v.id, true)) setVoucherCode('');
              }}
            >
              <Input aria-label="Nhập mã ưu đãi" placeholder="Nhập mã" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value.toUpperCase())} />
              <SecondaryButton type="submit" className="shrink-0 whitespace-nowrap">
                Áp dụng
              </SecondaryButton>
            </form>
            <p className="text-sm text-stone-600">Hoặc bấm chọn một mã bên dưới:</p>
            <ul className="space-y-2">
              {/* Mã trong Kho voucher của khách lên đầu, có nhãn "Đã lưu" (domain/marketplace.ts). */}
              {savedFirst(state, customerId, state.vouchers).map((v) => {
                const ev = evaluateVoucherFor(state, v, customerId, lines, at);
                const selected = voucherId === v.id;
                const saved = isVoucherSaved(state, customerId, v.id);
                return (
                  <li key={v.id}>
                    {/* Mã chưa đủ điều kiện vẫn bấm được để xem lý do (BR-KM: không chọn được và phải hiện lý do). */}
                    <button
                      type="button"
                      onClick={() => chooseVoucher(v.id)}
                      aria-pressed={selected}
                      aria-disabled={!ev.ok}
                      className={`flex w-full items-start gap-2 rounded-xl border p-2.5 text-left text-sm ${
                        selected ? 'border-forest-600 bg-forest-50' : ev.ok ? 'border-stone-200 bg-white hover:border-forest-600' : 'border-dashed border-stone-300 bg-stone-50'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-forest-600 bg-forest-600 text-white' : 'border-stone-300'}`}>
                        {selected && <Check size={12} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5 font-bold text-ink">
                          {v.code}
                          {saved && <span className="rounded-full bg-forest-50 px-2 py-0.5 text-xs font-semibold text-forest-800">Đã lưu</span>}
                        </span>
                        <span className="block text-stone-700">{v.title}</span>
                        <span className={`block text-xs ${ev.ok ? 'text-forest-700' : 'text-rose-700'}`}>
                          {ev.ok ? (selected ? `Đang áp dụng · giảm ${formatMoney(ev.value.discount)}` : `Bấm để dùng · giảm ${formatMoney(ev.value.discount)}`) : `Chưa dùng được: ${ev.error}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-sm text-stone-600">Mã chỉ giảm tiền hàng của sản phẩm hợp lệ, không giảm phí giao, phụ phí hoả tốc hay phí hộp quà.</p>
          </section>

          {plan.orders.map((o) => (
            <section key={o.key} className="space-y-2 rounded-2xl border border-stone-200 p-3">
              <h4 className="text-sm font-bold text-ink">
                {o.coopName} · {ORDER_KIND_LABEL[o.kind]}
                {o.deliveryDate ? ` · giao ${formatDateKey(o.deliveryDate)}` : ''}
              </h4>
              {o.kind === 'preorder' && (
                <p className="text-sm text-stone-700">
                  Cọc {formatMoney(o.pricing.deposit)} trả online ngay. Phần còn lại {formatMoney(o.pricing.remaining)}:
                </p>
              )}
              <PaymentChoice order={o} onChange={(m) => setOpt(o.key, { paymentMethod: m })} />
            </section>
          ))}

          <section aria-label="Hoá đơn công ty" className="space-y-2 rounded-2xl border border-stone-200 p-3">
            <label className="flex min-h-11 items-center gap-2 text-sm font-bold text-ink">
              <input type="checkbox" className="h-5 w-5" checked={wantInvoice} onChange={(e) => setWantInvoice(e.target.checked)} />
              Xuất hoá đơn công ty <span className="font-normal text-muted">(mô phỏng)</span>
            </label>
            {wantInvoice && (
              <>
                <InvoiceFields value={invoice} onChange={setInvoice} errors={invoiceFieldErrors} />
                <p className="text-sm text-stone-600">Thông tin được chốt vào từng đơn của lần đặt này; HTX và Admin – Tài chính xem được.</p>
                <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-stone-700">
                  <input type="checkbox" className="h-5 w-5" checked={saveInvoice} onChange={(e) => setSaveInvoice(e.target.checked)} />
                  {savedInvoice ? 'Cập nhật thông tin mặc định' : 'Lưu làm thông tin mặc định cho lần sau'}
                </label>
              </>
            )}
          </section>

          {plan.hasPreorder && (
            <section className="space-y-2 rounded-2xl border border-champagne-300 bg-champagne-50 p-3 text-sm text-champagne-950">
              <h4 className="font-bold">Điều kiện huỷ đơn đặt trước</h4>
              {plan.orders
                .filter((o) => o.cancelPolicy)
                .map((o) => (
                  <p key={o.key}>
                    <strong>{o.coopName}</strong> (giao {formatDateKey(o.deliveryDate!)}): {o.cancelPolicy}
                  </p>
                ))}
              <label className="flex min-h-11 items-center gap-2 font-semibold">
                <input type="checkbox" className="h-5 w-5" checked={acceptedPolicy} onChange={(e) => setAcceptedPolicy(e.target.checked)} />
                Tôi đã đọc và đồng ý điều kiện huỷ trên
              </label>
            </section>
          )}
        </>
      )}

      {step === 3 && (
        <>
          {plan.orders.map((o, i) => (
            <OrderSummary key={o.key} order={o} index={i + 1} total={plan.orders.length} />
          ))}
          <section className="space-y-1 rounded-2xl bg-stone-900 p-3 text-sm text-white">
            <Row label="Tổng lần đặt" value={formatMoney(plan.totals.grandTotal)} />
            {plan.voucher && plan.voucherDiscount > 0 && <Row label={`Đã giảm (mã ${plan.voucher.code})`} value={`−${formatMoney(plan.voucherDiscount)}`} />}
            <Row label="Trả ngay (online, gộp một giao dịch)" value={formatMoney(plan.totals.payNowOnline)} strong />
            {plan.totals.payOnDelivery > 0 && <Row label="Trả khi nhận hàng (COD)" value={formatMoney(plan.totals.payOnDelivery)} />}
            {plan.totals.remainingLater > 0 && <Row label="Phần còn lại trả online khi hàng sẵn sàng" value={formatMoney(plan.totals.remainingLater)} />}
          </section>
          {note && (
            <p className="rounded-xl bg-stone-50 p-2.5 text-sm text-stone-700">
              <strong>Ghi chú:</strong> {note}
            </p>
          )}
          {wantInvoice && (
            <section aria-label="Hoá đơn công ty" className="space-y-1 rounded-xl bg-stone-50 p-2.5">
              <h4 className="text-sm font-bold text-ink">Xuất hoá đơn công ty</h4>
              <InvoiceSummary invoice={normalizeInvoice(invoice)} />
            </section>
          )}
          {priceUp && (
            <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-champagne-300 bg-champagne-50 p-3 text-sm font-semibold text-champagne-950">
              <input type="checkbox" className="h-5 w-5" checked={confirmedPriceUp} onChange={(e) => setConfirmedPriceUp(e.target.checked)} />
              Tôi đồng ý với giá mới đã tăng
            </label>
          )}
          {payNow > 0 && <p className="text-sm text-stone-600">Sau khi bấm đặt hàng, bạn có {state.params.paymentHoldMinutes} phút để thanh toán ở cổng thanh toán mô phỏng. Hàng được giữ trong thời gian này.</p>}
        </>
      )}
    </BottomSheet>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'text-base font-extrabold' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function PaymentChoice({ order, onChange }: { order: PlannedOrder; onChange: (m: PaymentMethod) => void }) {
  const opt = (m: PaymentMethod, label: string, disabled = false) => (
    <label className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm ${order.paymentMethod === m ? 'border-forest-600 bg-forest-50 font-semibold' : 'border-stone-200'} ${disabled ? 'opacity-50' : ''}`}>
      <input type="radio" name={`pay-${order.key}`} checked={order.paymentMethod === m} disabled={disabled} onChange={() => onChange(m)} />
      {label}
    </label>
  );
  return (
    <div className="space-y-1.5">
      {opt('online', order.kind === 'preorder' ? 'Trả online khi HTX báo hàng sẵn sàng' : 'Thanh toán online (cổng mô phỏng)')}
      {opt('cod', order.kind === 'preorder' ? 'Trả tiền mặt khi nhận hàng' : 'Thanh toán khi nhận hàng (COD)', !order.codAllowed)}
      {!order.codAllowed && <p className="text-sm text-stone-600">{order.codBlockedReason}</p>}
    </div>
  );
}

function OrderSummary({ order: o, index, total }: { order: PlannedOrder; index: number; total: number }) {
  const p = o.pricing;
  return (
    <section className="space-y-2 rounded-2xl border border-stone-200 p-3 text-sm">
      <h4 className="font-bold text-ink">
        Đơn {index}/{total}: {o.coopName} · {ORDER_KIND_LABEL[o.kind]}
        {o.deliveryDate ? ` · giao ${formatDateKey(o.deliveryDate)}` : ''}
      </h4>
      <p className="text-stone-600">
        Giao tới: {o.address.receiverName}, {o.address.text}
      </p>
      <table className="w-full text-left">
        <thead className="text-xs text-muted">
          <tr>
            <th className="font-medium">Sản phẩm</th>
            <th className="text-right font-medium">SL</th>
            <th className="text-right font-medium">Đơn giá</th>
            <th className="text-right font-medium">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.productId}>
              <td className="py-0.5 pr-2">{i.name}</td>
              <td className="text-right tabular-nums">
                {i.quantity} {i.unit}
              </td>
              <td className="text-right tabular-nums">{formatMoney(i.unitPrice)}</td>
              <td className="text-right tabular-nums">{formatMoney(i.unitPrice * i.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-0.5 border-t border-stone-100 pt-2">
        <Row label="Tiền hàng" value={formatMoney(p.itemsTotal)} />
        {p.discount > 0 && <Row label="Giảm giá" value={`−${formatMoney(p.discount)}`} />}
        <Row label="Phí giao" value={formatMoney(p.shippingFee)} />
        {p.expressSurcharge > 0 && <Row label="Phụ phí hoả tốc" value={formatMoney(p.expressSurcharge)} />}
        {p.giftBoxFee > 0 && <Row label={`Hộp quà (${o.gift?.boxName})`} value={formatMoney(p.giftBoxFee)} />}
        <Row label="Tổng đơn" value={formatMoney(p.total)} strong />
        {o.kind === 'preorder' ? (
          <>
            <Row label="Cọc (trả ngay)" value={formatMoney(p.deposit)} />
            <Row label={`Phần còn lại (${o.paymentMethod === 'cod' ? 'trả khi nhận' : 'trả online khi hàng sẵn sàng'})`} value={formatMoney(p.remaining)} />
          </>
        ) : (
          <Row label={o.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng' : 'Thanh toán online ngay'} value={formatMoney(p.total)} />
        )}
      </div>
    </section>
  );
}

function StepDelivery(props: {
  plan: PlannedOrder[];
  lines: CartLine[];
  addresses: { id: string; label: string }[];
  addressId: string;
  setAddressId: (id: string) => void;
  /** Thêm địa chỉ ngay từ bước này; lưu xong quay lại bước đặt hàng. */
  onAddAddress: () => void;
  setLineDate: (productId: string, date: string) => void;
  setOpt: (key: string, patch: Partial<GroupOptions>) => void;
  options: Record<string, GroupOptions>;
  note: string;
  setNote: (v: string) => void;
  errors: string[];
}) {
  const { state, now } = useStore();
  const params = state.params;
  return (
    <>
      {props.addresses.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-center text-sm text-stone-700">
          <p className="font-semibold text-ink">Bạn chưa có địa chỉ giao hàng.</p>
          <p>Giai đoạn 1 chỉ giao trong Hà Nội. Thêm địa chỉ rồi quay lại đây để đặt hàng.</p>
          <PrimaryButton className="w-full" onClick={props.onAddAddress}>
            Thêm địa chỉ giao hàng
          </PrimaryButton>
        </div>
      ) : (
        <div className="space-y-1">
          <Field label="Địa chỉ giao hàng (Hà Nội)">
            <Select value={props.addressId} onChange={(e) => props.setAddressId(e.target.value)}>
              <option value="">— Chọn địa chỉ —</option>
              {props.addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
          <button type="button" onClick={props.onAddAddress} className="flex min-h-11 items-center gap-1 text-sm font-semibold text-forest-700 hover:underline">
            <Plus size={16} /> Thêm địa chỉ mới
          </button>
        </div>
      )}

      {props.plan.map((o) => {
        const gift = props.options[o.key]?.gift;
        return (
          <section key={o.key} className="space-y-3 rounded-2xl border border-stone-200 p-3">
            <h4 className="text-sm font-bold text-ink">
              {o.coopName} · {ORDER_KIND_LABEL[o.kind]}
            </h4>
            <ul className="space-y-2 text-sm">
              {o.items.map((i) => {
                const product = findProduct(state, i.productId)!;
                const win = o.kind === 'preorder' ? deliveryWindow(product, now(), params) : null;
                const line = props.lines.find((l) => l.productId === i.productId);
                return (
                  <li key={i.productId} className="space-y-1">
                    <div className="flex justify-between gap-2">
                      <span>
                        {i.name} × {i.quantity} {i.unit}
                      </span>
                      <span className="tabular-nums">{formatMoney(i.unitPrice * i.quantity)}</span>
                    </div>
                    {win && (
                      <Field label="Ngày giao (D)" hint={`Từ ${formatDateKey(win.min)} đến ${formatDateKey(win.max)}. Đổi được tối đa 1 lần, trước D − ${params.preorderMinLeadDays} ngày.`}>
                        <Input type="date" min={win.min} max={win.max} value={line?.deliveryDate ?? ''} onChange={(e) => props.setLineDate(i.productId, e.target.value)} />
                      </Field>
                    )}
                  </li>
                );
              })}
            </ul>

            {o.kind === 'ready' ? (
              <div className="space-y-1.5">
                <span className="text-sm font-semibold text-stone-700">Cách giao</span>
                <label className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm ${o.shipping === 'standard' ? 'border-forest-600 bg-forest-50 font-semibold' : 'border-stone-200'}`}>
                  <input type="radio" name={`ship-${o.key}`} checked={o.shipping === 'standard'} onChange={() => props.setOpt(o.key, { shipping: 'standard' })} />
                  Giao thường · {formatMoney(params.standardShippingFee)}
                </label>
                <label className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm ${o.shipping === 'express' ? 'border-forest-600 bg-forest-50 font-semibold' : 'border-stone-200'} ${o.express.available ? '' : 'opacity-50'}`}>
                  <input type="radio" name={`ship-${o.key}`} disabled={!o.express.available} checked={o.shipping === 'express'} onChange={() => props.setOpt(o.key, { shipping: 'express' })} />
                  Hoả tốc · thêm {o.express.surcharge !== null ? formatMoney(o.express.surcharge) : '—'} {Number.isFinite(o.address.distanceKm) ? `(${o.address.distanceKm} km)` : ''}
                </label>
                {!o.express.available && <p className="text-sm text-stone-600">Không có hoả tốc: {o.express.reasons.join(' ')}</p>}
              </div>
            ) : (
              <p className="text-sm text-stone-600">Giao thường · {formatMoney(params.standardShippingFee)}. Đơn đặt trước không có hoả tốc.</p>
            )}

            <div className="space-y-2 rounded-xl bg-stone-50 p-2.5">
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={!!gift}
                  onChange={(e) => props.setOpt(o.key, { gift: e.target.checked ? { boxTypeId: state.giftBoxTypes[0]?.id ?? '', message: '', sendToOther: false } : undefined })}
                />
                <Gift size={16} /> Thêm hộp quà cho đơn này
              </label>
              {gift && (
                <>
                  <Field label="Loại hộp">
                    <Select value={gift.boxTypeId} onChange={(e) => props.setOpt(o.key, { gift: { ...gift, boxTypeId: e.target.value } })}>
                      {state.giftBoxTypes.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} · {formatMoney(b.fee)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Lời nhắn (không bắt buộc)" hint={`${gift.message.length}/${params.giftMessageMaxLength} ký tự. Không ghi link hay số điện thoại.`}>
                    <Textarea rows={2} maxLength={params.giftMessageMaxLength} value={gift.message} onChange={(e) => props.setOpt(o.key, { gift: { ...gift, message: e.target.value } })} />
                  </Field>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={gift.sendToOther}
                      onChange={(e) =>
                        props.setOpt(o.key, {
                          gift: { ...gift, sendToOther: e.target.checked, recipient: e.target.checked ? gift.recipient ?? { name: '', phone: '', wardId: '', street: '' } : undefined },
                          paymentMethod: e.target.checked ? 'online' : props.options[o.key]?.paymentMethod ?? 'online',
                        })
                      }
                    />
                    Gửi người khác (chỉ thanh toán online, phiếu giao không in giá)
                  </label>
                  {gift.sendToOther && gift.recipient && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Tên người nhận">
                        <Input value={gift.recipient.name} onChange={(e) => props.setOpt(o.key, { gift: { ...gift, recipient: { ...gift.recipient!, name: e.target.value } } })} />
                      </Field>
                      <Field label="SĐT người nhận" hint={PHONE_RULE}>
                        <Input inputMode="tel" value={gift.recipient.phone} onChange={(e) => props.setOpt(o.key, { gift: { ...gift, recipient: { ...gift.recipient!, phone: e.target.value } } })} />
                      </Field>
                      <Field label="Phường/xã (Hà Nội)">
                        <Select value={gift.recipient.wardId} onChange={(e) => props.setOpt(o.key, { gift: { ...gift, recipient: { ...gift.recipient!, wardId: e.target.value } } })}>
                          <option value="">— Chọn —</option>
                          {state.wards.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Số nhà, đường, toà–căn">
                        <Input value={gift.recipient.street} onChange={(e) => props.setOpt(o.key, { gift: { ...gift, recipient: { ...gift.recipient!, street: e.target.value } } })} />
                      </Field>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        );
      })}

      <Field label="Ghi chú cho HTX (không bắt buộc)">
        <Textarea rows={2} value={props.note} onChange={(e) => props.setNote(e.target.value)} placeholder="Ví dụ: gọi trước khi giao, giao giờ hành chính…" />
      </Field>

      {props.errors.length > 0 && (
        <ul className="space-y-1 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
          {props.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </>
  );
}
