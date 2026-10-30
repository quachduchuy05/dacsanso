import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

// Cao tối thiểu 44px; chữ 16px trên điện thoại để iOS không tự phóng to khi nhập.
const fieldClass = 'min-h-11 min-w-0 max-w-full w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-ink md:text-sm focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20';

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block min-w-0 max-w-full space-y-1 [overflow-wrap:anywhere]">
      <span className="text-sm font-semibold text-stone-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`${fieldClass} ${props.className ?? ''}`} />;
export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={`${fieldClass} ${props.className ?? ''}`} />;
export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className={`${fieldClass} ${props.className ?? ''}`} />;

export function PrimaryButton({ children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`min-h-11 rounded-2xl bg-forest-800 bg-linear-to-b from-forest-700 to-forest-900 px-4 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgb(255,255,255,0.14),0_6px_16px_rgb(31,77,58,0.22)] transition hover:from-forest-600 hover:to-forest-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:bg-none disabled:text-stone-600 disabled:shadow-none ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`min-h-11 rounded-2xl border border-champagne-300 bg-white px-4 py-3 text-sm font-bold text-forest-900 transition-colors hover:border-champagne-500 hover:bg-champagne-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`min-h-11 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

/** Hộp nhập lý do dùng chung (từ chối, huỷ…). */
export function ReasonPrompt({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </Field>
  );
}
