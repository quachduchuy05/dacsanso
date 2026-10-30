import { Check, X } from 'lucide-react';
import { applicationSteps, APPLICATION_STATUS_LABEL, type ApplicationStatus, type ApplicationStep, type CoopApplication } from '../store/commands/coopApplication';

const DOT: Record<ApplicationStep['state'], string> = {
  done: 'bg-forest-900 text-champagne-200 ring-1 ring-champagne-400/70',
  current: 'bg-white ring-2 ring-champagne-500',
  upcoming: 'bg-white ring-1 ring-stone-300',
  failed: 'bg-rose-700 text-white',
};

const STATE_TEXT: Record<ApplicationStep['state'], string> = { done: 'đã xong', current: 'đang làm', upcoming: 'sắp tới', failed: 'chưa đạt' };

const TONE: Record<ApplicationStatus, string> = {
  submitted: 'bg-sky-100 text-sky-900',
  reviewing: 'bg-champagne-100 text-champagne-900',
  needs_info: 'bg-champagne-300 text-forest-950',
  approved: 'bg-forest-100 text-forest-800',
  rejected: 'bg-rose-100 text-rose-900',
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${TONE[status]}`}>{APPLICATION_STATUS_LABEL[status]}</span>;
}

const time = (iso: string) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

/** Các bước của hồ sơ đăng ký HTX (domain/coopApplication.ts), cho Admin và cho HTX tra cứu. */
export function ApplicationSteps({ application }: { application: CoopApplication }) {
  const steps = applicationSteps(application);
  return (
    <ol className="space-y-0" aria-label={`Các bước của hồ sơ ${application.id}`}>
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex gap-3 pb-3.5 last:pb-0">
          {i < steps.length - 1 && <span aria-hidden="true" className={`absolute top-7 bottom-0 left-[13px] w-0.5 ${s.state === 'done' ? 'bg-champagne-400' : 'bg-stone-200'}`} />}
          <span aria-hidden="true" className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${DOT[s.state]}`}>
            {s.state === 'done' && <Check size={15} strokeWidth={2.5} />}
            {s.state === 'current' && <span className="h-2.5 w-2.5 rounded-full bg-champagne-500" />}
            {s.state === 'failed' && <X size={15} strokeWidth={2.5} />}
          </span>
          <div className="min-w-0 pt-0.5">
            <p
              className={`text-sm ${s.state === 'current' ? 'font-bold text-forest-900' : s.state === 'failed' ? 'font-bold text-rose-800' : s.state === 'done' ? 'font-semibold text-ink' : 'text-muted'}`}
            >
              {s.title}
              <span className="sr-only"> – {STATE_TEXT[s.state]}</span>
            </p>
            {(s.at || s.detail) && (
              <p className="text-xs text-stone-600">
                {s.at && time(s.at)}
                {s.at && s.detail ? ' · ' : ''}
                {s.detail}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
