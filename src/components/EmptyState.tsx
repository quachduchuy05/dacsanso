import type { ReactNode } from 'react';
import { Ornament } from './Brand';

/** Trạng thái rỗng của danh sách (Giai đoạn 6, mục 10.5). */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="space-y-3 rounded-3xl border border-champagne-200 bg-white/80 p-6 text-center text-sm text-stone-600">
      <Ornament className="mx-auto" />
      <div>{children}</div>
      {action}
    </div>
  );
}

/** Trạng thái lỗi của danh sách: không đọc được dữ liệu, không có quyền xem, lỗi hiển thị. */
export function ErrorState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="space-y-3 rounded-2xl border border-dashed border-rose-300 bg-rose-50 p-6 text-center text-sm text-rose-900">
      <div>{children}</div>
      {action}
    </div>
  );
}

/** Nhãn "Mô phỏng" bắt buộc trên mọi chức năng mô phỏng (nguyên tắc 6). */
export function SimBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-block rounded-md bg-stone-900 px-1.5 py-0.5 font-sans text-xs font-bold uppercase tracking-wide text-champagne-300 ${className}`}>
      Mô phỏng
    </span>
  );
}
