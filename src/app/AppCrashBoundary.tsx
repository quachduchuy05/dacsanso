import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { ErrorDetails, errorDetails } from '../components/ErrorDetails';
import { DEMO_OTP } from '../domain/auth';
import { emergencyReset } from '../store/emergencyReset';
import { clearState, saveSession } from '../store/persistence';
import { isChunkLoadError, reloadOnceForNewVersion } from './chunkReload';
import { api, saveTokens, type LoginResponse } from '../store/backend';

/**
 * Khung lỗi ở gốc app (sửa lỗi bản web 18/10/2026): trước đây lỗi ở khung app (thanh trên cùng, chuyển màn) làm trắng trang.
 * Lỗi do không tải được mã của bản cũ (vừa deploy bản mới) thì tự tải lại; lỗi khác thì hiện cách khôi phục.
 */
export class AppCrashBoundary extends Component<{ children: ReactNode }, { error: Error | null; componentStack: string | null }> {
  state: { error: Error | null; componentStack: string | null } = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error);
    this.setState({ componentStack: info.componentStack ?? null });
    if (isChunkLoadError(error)) reloadOnceForNewVersion();
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <CrashScreen error={this.state.error} componentStack={this.state.componentStack} />;
  }
}

function CrashScreen({ error, componentStack }: { error: Error; componentStack: string | null }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const updating = isChunkLoadError(error);

  const resetLocal = () => {
    clearState();
    saveSession(null);
    window.location.reload();
  };
  const resetShared = async () => {
    setBusy(true);
    try {
      const challenge = await api('/api/v1/auth/otp', {phone,purpose:'login'});
      const session = await api<LoginResponse>('/api/v1/auth/login', {challengeId:challenge.challengeId,otp});
      saveTokens(session);
      await api('/api/v1/demo/tools', {action:'data-reset'});
      saveTokens(null);saveSession(null);window.location.reload();
    } catch(e) {setMessage(e instanceof Error?e.message:'Không khôi phục được.');}
    finally {setBusy(false);}
  };

  const button = 'min-h-11 rounded-2xl px-4 text-sm font-bold';
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 bg-ivory px-4 py-8 text-ink">
      <h1 className="font-display text-3xl font-semibold">{updating ? 'Ứng dụng vừa có bản mới' : 'Ứng dụng gặp lỗi'}</h1>
      <p className="text-base text-stone-700">
        {updating
          ? 'Trang đang mở là bản cũ nên không tải được màn này. Tải lại trang để dùng bản mới.'
          : 'Một phần dữ liệu không hiển thị được. Thử tải lại trang; nếu vẫn lỗi, xoá dữ liệu lưu trên máy này (dữ liệu dùng chung trên máy chủ không bị xoá).'}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button onClick={() => window.location.reload()} className={`${button} bg-forest-900 text-champagne-100`}>
          Tải lại trang
        </button>
        {!updating && (
          <button onClick={resetLocal} className={`${button} border border-champagne-300 bg-white text-forest-900`}>
            Xoá dữ liệu trên máy này
          </button>
        )}
      </div>
      {!updating && (
        <details className="rounded-2xl border border-stone-300 bg-white p-4 text-sm">
          <summary className="flex min-h-11 cursor-pointer items-center font-bold">Vẫn lỗi trên mọi máy? Khôi phục dữ liệu mẫu</summary>
          <div className="mt-2 space-y-3">
            <p className="text-stone-700">
              Dành cho Quản trị gốc hoặc Admin – Vận hành: ghi lại dữ liệu mẫu cho mọi máy đang xem demo. Mọi đơn, giỏ hàng và thay đổi trên dữ liệu dùng chung sẽ bị xoá.
            </p>
            <label className="block space-y-1">
              <span className="font-semibold text-stone-700">SĐT tài khoản</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="min-h-11 w-full rounded-xl border border-stone-300 px-3 text-base" />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-stone-700">Mã OTP (mô phỏng, luôn là {DEMO_OTP})</span>
              <input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" maxLength={6} className="min-h-11 w-full rounded-xl border border-stone-300 px-3 text-base" />
            </label>
            <button disabled={busy} onClick={resetShared} className={`${button} w-full border border-rose-300 bg-rose-50 text-rose-800 disabled:opacity-50`}>
              {busy ? 'Đang khôi phục…' : 'Khôi phục dữ liệu mẫu'}
            </button>
            {message && (
              <p role="alert" className="font-semibold text-rose-700">
                {message}
              </p>
            )}
          </div>
        </details>
      )}
      <p className="text-xs text-muted">Chi tiết lỗi: {error.message.slice(0, 160)}</p>
      <ErrorDetails text={errorDetails(error, 'khung app', componentStack)} />
    </main>
  );
}
