import { useState } from 'react';
import { useUi } from '../../app/UiContext';
import { ApplicationSteps } from '../../components/ApplicationSteps';
import { BottomSheet } from '../../components/BottomSheet';
import { SimBadge } from '../../components/EmptyState';
import { Field, Input, PrimaryButton, SecondaryButton, Textarea } from '../../components/form';
import { PhotoPicker } from '../../components/PhotoPicker';
import { DEMO_OTP } from '../../domain/auth';
import { resubmitCoopApplication, submitCoopApplication, type ApplicationInput, type CoopApplication } from '../../store/commands/coopApplication';
import { ADDRESS_MAX_LENGTH, CONTACT_PHONE_RULE, formatContactPhone } from '../../store/commands/coopContact';
import { formatPhone, PHONE_RULE } from '../../domain/phone';
import { useStore } from '../../store/AppDataContext';
import { api } from '../../store/backend';
import { applicationCache } from '../../store/applicationCache';

const EMPTY: ApplicationInput = { taxCode:'', coopName: '', region: '', address: '', representative: '', loginPhone: '', phones: ['', ''], payoutAccount: '', description: '', products: '', documents: [] };

/**
 * HTX đăng ký bán hàng trên sàn (bước 1 của quy trình phê duyệt HTX, domain/coopApplication.ts), mở từ màn đăng nhập.
 * Có `applicationId`: HTX bổ sung hồ sơ Admin yêu cầu (điền sẵn nội dung cũ, nhập lại số tài khoản).
 */
export function CoopApplySheet({ applicationId, onClose }: { applicationId?: string; onClose: () => void }) {
  const { state, run } = useStore();
  const { openModal } = useUi();
  const existing = applicationId ? applicationCache.get(applicationId) ?? state.coopApplications?.find((a) => a.id === applicationId) : undefined;
  const [form, setForm] = useState<ApplicationInput>(() =>
    existing
      ? {
          taxCode:existing.taxCode??'',
          coopName: existing.coopName,
          region: existing.region,
          address: existing.address,
          representative: existing.representative,
          loginPhone: existing.loginPhone,
          phones: existing.phones.map(formatContactPhone),
          payoutAccount: '',
          description: existing.description,
          products: existing.products,
          documents: existing.documents,
        }
      : EMPTY,
  );
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<CoopApplication | null>(null);
  const [challengeId, setChallengeId] = useState('');
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const sendOtp = async () => { try { const r = await api('/api/v1/auth/otp', {phone:form.loginPhone,purpose:'application'}); setChallengeId(r.challengeId);setDemo(r.demo);setError(null); } catch(e) {setError(e instanceof Error?e.message:'Không gửi được OTP.');} };
  const set = (patch: Partial<ApplicationInput>) => {
    setError(null);
    setForm((f) => ({ ...f, ...patch }));
  };

  const submit = async () => {
    if(busy)return;setBusy(true);
    try {const r=await api('/api/v1/applications',{challengeId,otp,input:form,applicationId:existing?.id});applicationCache.set(r.application.id,r.application);setDone(r.application);}
    catch(e){setError(e instanceof Error?e.message:'Không nộp được hồ sơ.');}
    finally{setBusy(false);}
  };

  if (done) {
    return (
      <BottomSheet title={existing ? 'Đã bổ sung hồ sơ' : 'Đã nộp hồ sơ đăng ký HTX'} onClose={onClose}>
        <p className="rounded-2xl bg-forest-50 p-3 text-sm text-forest-900">
          Mã hồ sơ <strong className="font-mono">{done.id}</strong>. Admin – Chất lượng sẽ tiếp nhận và thẩm định. Theo dõi bằng "Tra cứu hồ sơ HTX" ở màn đăng nhập với SĐT{' '}
          <strong>{formatPhone(done.loginPhone)}</strong>. Khi được duyệt, HTX đăng nhập bằng số này và OTP.
        </p>
        <ApplicationSteps application={state.coopApplications?.find((a) => a.id === done.id) ?? done} />
        <SecondaryButton className="w-full" onClick={() => openModal({ type: 'coop_apply_status', phone: done.loginPhone })}>
          Xem tình trạng hồ sơ
        </SecondaryButton>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      title={existing ? `Bổ sung hồ sơ ${existing.id}` : 'Đăng ký bán hàng cho HTX'}
      onClose={onClose}
      wide
      footer={
        <PrimaryButton disabled={busy} className="w-full lg:ml-auto lg:block lg:w-auto lg:px-8" onClick={submit}>
          {existing ? 'Nộp lại hồ sơ' : 'Nộp hồ sơ'}
        </PrimaryButton>
      }
    >
      {existing?.reviewNote && (
        <p role="note" className="rounded-2xl border border-champagne-400 bg-champagne-100 p-3 text-sm text-champagne-950">
          <strong>Admin cần bổ sung:</strong> {existing.reviewNote}
        </p>
      )}
      <p className="text-sm text-stone-600">
        Quy trình: nộp hồ sơ → Admin – Chất lượng tiếp nhận → thẩm định → duyệt / yêu cầu bổ sung / từ chối → tạo tài khoản HTX. SĐT, địa chỉ, tài khoản của HTX chỉ Admin xem, không hiện cho khách.
      </p>
      <div className="grid gap-x-5 gap-y-3 lg:grid-cols-2">
        <Field label="Mã số thuế HTX"><Input required value={form.taxCode??''} maxLength={14} onChange={e=>set({taxCode:e.target.value})} placeholder="10 số hoặc mã chi nhánh"/></Field>
        <Field label="Tên HTX">
          <Input value={form.coopName} onChange={(e) => set({ coopName: e.target.value })} placeholder="Ví dụ: HTX Nông sản …" />
        </Field>
        <Field label="Vùng sản xuất">
          <Input value={form.region} onChange={(e) => set({ region: e.target.value })} placeholder="Ví dụ: Bắc Hà" />
        </Field>
        <Field label="Địa chỉ HTX / nơi sản xuất" hint="Thôn / tổ, xã / phường, tỉnh Lào Cai.">
          <Input value={form.address} maxLength={ADDRESS_MAX_LENGTH} autoComplete="street-address" onChange={(e) => set({ address: e.target.value })} />
        </Field>
        <Field label="Người đại diện">
          <Input value={form.representative} autoComplete="name" onChange={(e) => set({ representative: e.target.value })} />
        </Field>
        <Field label="SĐT người đại diện (dùng để đăng nhập)" hint={existing ? 'Không đổi khi bổ sung hồ sơ.' : PHONE_RULE}>
          <Input type="tel" inputMode="tel" autoComplete="tel" value={form.loginPhone} disabled={!!existing} onChange={(e) => set({ loginPhone: e.target.value })} />
        </Field>
        <Field label="Số tài khoản nhận chi trả" hint="Sàn chỉ lưu 4 số cuối dạng che (**** 1234).">
          <Input inputMode="numeric" autoComplete="off" value={form.payoutAccount} onChange={(e) => set({ payoutAccount: e.target.value })} />
        </Field>
        {form.phones.map((p, i) => (
          <Field key={i} label={`SĐT liên hệ ${i + 1} của HTX`} hint={i === 1 ? CONTACT_PHONE_RULE : 'Để Admin gọi cho HTX khi cần.'}>
            <Input type="tel" inputMode="tel" value={p} onChange={(e) => set({ phones: form.phones.map((x, j) => (j === i ? e.target.value : x)) })} />
          </Field>
        ))}
        <Field label="Sản phẩm dự kiến bán">
          <Textarea rows={3} value={form.products} onChange={(e) => set({ products: e.target.value })} placeholder="Tên sản phẩm, quy cách, mùa vụ…" />
        </Field>
        <Field label="Giới thiệu HTX (không bắt buộc)">
          <Textarea rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
      </div>
      <fieldset className="space-y-1.5">
        <legend className="flex flex-wrap items-center gap-2 text-sm font-semibold text-stone-700">
          Ảnh giấy chứng nhận đăng ký HTX <SimBadge />
        </legend>
        <p className="text-xs text-muted">Admin xem ảnh để thẩm định; bản demo không đối chiếu với cơ quan cấp giấy.</p>
        <PhotoPicker photos={form.documents} onChange={(documents) => set({ documents })} max={3} />
      </fieldset>
      <div className="space-y-2 rounded-2xl border border-dashed border-champagne-500 bg-champagne-50 p-3">
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
          Xác nhận SĐT người đại diện bằng mã OTP. {demo && <>Mã demo: <strong className="font-mono">{DEMO_OTP}</strong></>}
        </p>
        <div className="flex gap-2">
          <Input aria-label="Mã OTP (6 số)" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="Mã OTP" className="flex-1" />
          <SecondaryButton onClick={sendOtp}>Nhận OTP</SecondaryButton>
          {demo && <SecondaryButton onClick={() => setOtp(DEMO_OTP)}>Điền OTP mô phỏng</SecondaryButton>}
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
          {error}
        </p>
      )}
    </BottomSheet>
  );
}
