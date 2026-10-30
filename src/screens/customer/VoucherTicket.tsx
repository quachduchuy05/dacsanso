import type { ReactNode } from 'react';
import { TicketPercent } from 'lucide-react';
import { WALLET_STATUS_LABEL, type WalletStatus } from '../../store/commands/marketplace';
import { formatMoney } from '../../domain/pricing';
import type { Voucher } from '../../domain/voucher';
import { useStore } from '../../store/AppDataContext';

const dateOf = (isoText: string) => new Date(isoText).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Số giảm ngắn gọn trên cuống vé: "30.000đ" hoặc "10%". */
export const voucherValueText = (v: Voucher) => (v.kind === 'fixed' ? formatMoney(v.value) : `${v.value}%`);

/** Điều kiện chính của mã: mức chi tối thiểu, trần giảm, đơn đầu, hạn dùng. */
export function voucherTerms(v: Voucher, at: Date): string {
  const parts = [
    v.minSpend > 0 ? `Đơn từ ${formatMoney(v.minSpend)}` : 'Không cần mức chi tối thiểu',
    v.maxDiscount !== undefined ? `tối đa ${formatMoney(v.maxDiscount)}` : '',
    v.firstOrderOnly ? 'đơn đầu tiên' : '',
    v.startsAt && new Date(v.startsAt).getTime() > at.getTime() ? `dùng từ ${dateOf(v.startsAt)}` : '',
    `HSD ${dateOf(v.expiresAt)}`,
  ];
  return parts.filter(Boolean).join(' · ');
}

/** Vé mã ưu đãi: cuống màu rừng có số giảm, thân vé có mã, tên, điều kiện và một hành động (Lưu / Bỏ lưu…). */
export function VoucherTicket({ voucher: v, status, action, compact = false }: { voucher: Voucher; status?: WalletStatus; action?: ReactNode; compact?: boolean }) {
  const { now } = useStore();
  const dim = status !== undefined && status !== 'usable' && status !== 'upcoming';
  return (
    <div className={`flex overflow-hidden rounded-2xl border border-champagne-300 bg-white shadow-xs ${compact ? 'h-full w-72 shrink-0' : 'w-full'}`}>
      <div className={`flex w-24 shrink-0 flex-col items-center justify-center gap-1 px-2 py-3 text-center ${dim ? 'bg-stone-600 text-white' : 'bg-forest-900 text-champagne-200'}`}>
        <TicketPercent size={18} aria-hidden="true" />
        <span className="text-xs font-semibold">Giảm</span>
        <span className="font-display text-base font-semibold leading-none tabular-nums">{voucherValueText(v)}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 border-l-2 border-dashed border-champagne-300 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-sm font-bold text-ink">{v.code}</span>
          {status && status !== 'usable' && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">{WALLET_STATUS_LABEL[status]}</span>}
        </div>
        <span className="line-clamp-2 text-sm text-stone-700">{v.title}</span>
        <span className="text-xs text-muted">{voucherTerms(v, now())}</span>
        {action && <div className="mt-auto flex justify-end pt-1">{action}</div>}
      </div>
    </div>
  );
}
