import { useState } from 'react';
import { useUi } from '../../app/UiContext';
import { ApplicationStatusBadge, ApplicationSteps } from '../../components/ApplicationSteps';
import { BottomSheet } from '../../components/BottomSheet';
import { SimBadge } from '../../components/EmptyState';
import { Field, Input, PrimaryButton, SecondaryButton } from '../../components/form';
import { DEMO_OTP } from '../../domain/auth';
import { lookupCoopApplications } from '../../store/commands/coopApplication';
import { PHONE_RULE } from '../../domain/phone';
import { useStore } from '../../store/AppDataContext';
import { api } from '../../store/backend';
import { applicationCache } from '../../store/applicationCache';
import type { CoopApplication } from '../../domain/coopApplication';

/** HTX tra cứu hồ sơ đăng ký bằng SĐT người đại diện + OTP mô phỏng: các bước, kết quả, bổ sung hồ sơ khi Admin yêu cầu. */
export function CoopApplyStatusSheet({ phone: initialPhone, onClose }: { phone?: string; onClose: () => void }) {
  const { state } = useStore();
  const { openModal } = useUi();
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [otp, setOtp] = useState(initialPhone ? DEMO_OTP : '');
  const [shown, setShown] = useState(!!initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<CoopApplication[] | null>(null);
  const [challengeId, setChallengeId] = useState('');
  const [demo, setDemo] = useState(false);
  const result = applications ? {ok:true as const,value:applications} : null;
  const sendOtp = async () => {try{const r=await api('/api/v1/auth/otp',{phone,purpose:'application'});setChallengeId(r.challengeId);setDemo(r.demo);setError(null);}catch(e){setError(e instanceof Error?e.message:'Không gửi được OTP.');}};

  const lookup = async () => {
    try{const r=await api('/api/v1/applications/lookup',{challengeId,otp});setApplications(r.applications);for(const a of r.applications)applicationCache.set(a.id,a);setError(null);}
    catch(e){setError(e instanceof Error?e.message:'Không tra cứu được hồ sơ.');}
  };

  return (
    <BottomSheet title="Tra cứu hồ sơ HTX" onClose={onClose}>
      {!result?.ok ? (
        <>
          <Field label="SĐT người đại diện đã đăng ký" hint={PHONE_RULE}>
            <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
            Nhận OTP để xác minh SĐT. {demo && <>Mã demo: <strong className="font-mono">{DEMO_OTP}</strong></>}
          </p>
          <div className="flex gap-2">
            <Input aria-label="Mã OTP (6 số)" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="Mã OTP" className="flex-1" />
            <SecondaryButton onClick={sendOtp}>Nhận OTP</SecondaryButton>
            {demo && <SecondaryButton onClick={() => setOtp(DEMO_OTP)}>Điền OTP</SecondaryButton>}
          </div>
          {error && (
            <p role="alert" className="text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}
          <PrimaryButton className="w-full" onClick={lookup}>
            Tra cứu
          </PrimaryButton>
        </>
      ) : (
        <ul className="space-y-4">
          {result.value.map((a) => (
            <li key={a.id} className="space-y-3 rounded-3xl border border-champagne-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-semibold text-ink">{a.coopName}</p>
                  <p className="text-xs text-muted">
                    Hồ sơ <span className="font-mono">{a.id}</span> · nộp {new Date(a.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <ApplicationStatusBadge status={a.status} />
              </div>
              <ApplicationSteps application={a} />
              {a.status === 'needs_info' && (
                <PrimaryButton className="w-full" onClick={() => openModal({ type: 'coop_apply', applicationId: a.id })}>
                  Bổ sung hồ sơ
                </PrimaryButton>
              )}
              {a.status === 'approved' && <p className="rounded-2xl bg-forest-50 p-3 text-sm text-forest-900">Hồ sơ đã duyệt. Đóng cửa sổ này rồi đăng nhập bằng SĐT người đại diện và OTP.</p>}
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
