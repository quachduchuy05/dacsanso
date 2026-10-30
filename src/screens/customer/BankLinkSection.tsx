import { useState } from 'react';
import { Landmark } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { SimBadge } from '../../components/EmptyState';
import { Field, Input, PrimaryButton, SecondaryButton, Select } from '../../components/form';
import { viewRefundAccount } from '../../domain/access';
import { linkRefundAccount, normalizeHolderName, prepareBankLink, unlinkRefundAccount, type BankLinkInput } from '../../store/commands/account';
import { DEMO_OTP } from '../../domain/auth';
import { bankCodeOf, BANKS, OTHER_BANK_CODE } from '../../domain/banks';
import { useStore } from '../../store/AppDataContext';

type Step = 'view' | 'form' | 'otp';

/**
 * Liên kết tài khoản ngân hàng nhận hoàn tiền đơn COD (FR-TK-03). Liên kết là mô phỏng:
 * 1. chọn ngân hàng, nhập số tài khoản và tên chủ tài khoản;
 * 2. "ngân hàng" gửi OTP (không gửi tin thật, mã luôn là 123456), khách nhập để xác nhận;
 * 3. tài khoản hiện "Đã liên kết", đổi hoặc huỷ liên kết được.
 * App không kết nối ngân hàng nào và không tra cứu tên chủ tài khoản thật.
 */
export function BankLinkSection() {
  const { state, run } = useStore();
  const { customerActor, showToast } = useUi();
  const customer = state.customers.find((c) => c.id === customerActor.id);
  const acc = viewRefundAccount(state, customerActor, customerActor.id ?? '');
  const linked = acc.ok ? acc.value : null;

  const [step, setStep] = useState<Step>('view');
  const [input, setInput] = useState<BankLinkInput>({ bankCode: '', otherBankName: '', accountNumber: '', holder: '' });
  const [otp, setOtp] = useState('');
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!customer) return null;

  const startForm = () => {
    const saved = customer.refundAccount;
    const code = bankCodeOf(saved);
    setInput({
      bankCode: code,
      otherBankName: code === OTHER_BANK_CODE ? (saved?.bankName ?? '') : '',
      accountNumber: '',
      holder: saved?.holder ?? customer.name,
    });
    setOtp('');
    setError(null);
    setConfirmUnlink(false);
    setStep('form');
  };

  const toOtp = () => {
    const r = prepareBankLink(input);
    if (!r.ok) return setError(r.error);
    setError(null);
    setOtp('');
    setStep('otp');
  };

  const confirmLink = async () => {
    const r = await run((s, at) => linkRefundAccount(s, customerActor, input, otp, at));
    if (!r.ok) return setError(r.error);
    setError(null);
    setStep('view');
    showToast('Đã liên kết tài khoản ngân hàng (mô phỏng).');
  };

  const unlink = async () => {
    const r = await run((s) => unlinkRefundAccount(s, customerActor));
    setConfirmUnlink(false);
    showToast(r.ok ? 'Đã huỷ liên kết tài khoản ngân hàng.' : r.error);
  };

  // Sửa ô nào thì ẩn lỗi cũ.
  const edit = (patch: Partial<BankLinkInput>) => {
    setInput({ ...input, ...patch });
    setError(null);
  };

  const preview = prepareBankLink(input);
  const lastDigits = input.accountNumber.replace(/\D/g, '').slice(-4);

  return (
    <section className="space-y-3 rounded-3xl border border-champagne-200 bg-white p-4 shadow-xs" aria-labelledby="bank-link-title">
      <h3 id="bank-link-title" className="flex items-start gap-2.5 font-display text-lg font-semibold leading-snug text-ink">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-900 text-champagne-300">
          <Landmark size={16} aria-hidden="true" />
        </span>
        <span className="pt-1">
          Tài khoản ngân hàng nhận hoàn tiền <SimBadge className="ml-1 align-middle" />
        </span>
      </h3>

      {step === 'view' &&
        (linked ? (
          <>
            <div className="space-y-1 rounded-2xl border border-forest-200 bg-forest-50/60 p-3 text-sm">
              <p className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-ink">{linked.bankName}</span>
                <span className="rounded-md bg-forest-700 px-1.5 py-0.5 text-xs font-semibold text-white">Đã liên kết</span>
              </p>
              <p className="font-mono font-bold tracking-wide text-stone-800">{linked.accountNumber}</p>
              <p className="text-stone-700">{linked.holder}</p>
              {linked.linkedAt && <p className="text-xs text-muted">Liên kết lúc {new Date(linked.linkedAt).toLocaleString('vi-VN')}</p>}
            </div>
            <p className="text-sm text-stone-600">
              Đơn COD bị huỷ hoặc trả hàng được hoàn vào tài khoản này. Số tài khoản luôn hiện dạng che; chỉ Admin – Tài chính xem được đầy đủ.
            </p>
            {confirmUnlink ? (
              <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 p-2 text-sm text-rose-900">
                <span className="min-w-0 flex-1">Huỷ liên kết? Khoản hoàn tiền đơn COD sẽ chờ tới khi bạn liên kết tài khoản mới.</span>
                <button onClick={() => setConfirmUnlink(false)} className="min-h-11 rounded-lg px-3 font-semibold text-stone-700 hover:bg-white">
                  Không
                </button>
                <button onClick={unlink} className="min-h-11 rounded-lg bg-rose-700 px-3 font-semibold text-white hover:bg-rose-800">
                  Huỷ liên kết
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <SecondaryButton className="flex-1" onClick={startForm}>
                  Đổi tài khoản
                </SecondaryButton>
                <SecondaryButton className="flex-1 text-rose-800" onClick={() => setConfirmUnlink(true)} aria-expanded={confirmUnlink}>
                  Huỷ liên kết
                </SecondaryButton>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-champagne-800">Chưa liên kết tài khoản ngân hàng. Hoàn tiền đơn COD cần tài khoản này.</p>
            <PrimaryButton className="w-full" onClick={startForm}>
              Liên kết ngân hàng
            </PrimaryButton>
          </>
        ))}

      {step === 'form' && (
        <>
          <p className="text-sm text-stone-600">Bước 1/2 · Nhập tài khoản đứng tên bạn để nhận hoàn tiền.</p>
          <Field label="Ngân hàng">
            <Select value={input.bankCode} onChange={(e) => edit({ bankCode: e.target.value })}>
              <option value="">Chọn ngân hàng</option>
              {BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
              <option value={OTHER_BANK_CODE}>Ngân hàng khác</option>
            </Select>
          </Field>
          {input.bankCode === OTHER_BANK_CODE && (
            <Field label="Tên ngân hàng">
              <Input value={input.otherBankName} onChange={(e) => edit({ otherBankName: e.target.value })} />
            </Field>
          )}
          <Field label="Số tài khoản" hint="6–19 chữ số.">
            <Input inputMode="numeric" autoComplete="off" value={input.accountNumber} onChange={(e) => edit({ accountNumber: e.target.value })} />
          </Field>
          <Field
            label="Tên chủ tài khoản"
            hint={
              normalizeHolderName(input.holder)
                ? `Lưu là ${normalizeHolderName(input.holder)} (viết hoa, không dấu như ngân hàng in).`
                : 'Viết đúng tên trên ứng dụng ngân hàng.'
            }
          >
            <Input autoComplete="off" value={input.holder} onChange={(e) => edit({ holder: e.target.value })} />
          </Field>
          {error && (
            <p role="alert" className="text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setStep('view')}>Huỷ</SecondaryButton>
            <PrimaryButton className="flex-1" onClick={toOtp}>
              Tiếp tục
            </PrimaryButton>
          </div>
        </>
      )}

      {step === 'otp' && preview.ok && (
        <>
          <p className="text-sm text-stone-600">Bước 2/2 · Xác thực liên kết</p>
          <div className="space-y-1 rounded-2xl bg-stone-50 p-3 text-sm text-stone-700">
            <p>
              <strong className="text-ink">{preview.value.bankName}</strong> · tài khoản đuôi <span className="font-mono font-bold">{lastDigits}</span>
            </p>
            <p>{preview.value.holder}</p>
          </div>
          <p className="text-sm text-stone-700">
            <SimBadge /> Ngân hàng mô phỏng gửi OTP tới số điện thoại đăng ký tài khoản. Không gửi tin nhắn thật, mã luôn là{' '}
            <strong className="font-mono">{DEMO_OTP}</strong>.
          </p>
          <Field label="Mã OTP của ngân hàng">
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ''));
                setError(null);
              }}
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}
          <SecondaryButton className="w-full" onClick={() => setOtp(DEMO_OTP)}>
            Điền OTP mô phỏng
          </SecondaryButton>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setStep('form')}>Quay lại</SecondaryButton>
            <PrimaryButton className="flex-1" disabled={otp.length !== 6} onClick={confirmLink}>
              Xác nhận liên kết
            </PrimaryButton>
          </div>
        </>
      )}
    </section>
  );
}
