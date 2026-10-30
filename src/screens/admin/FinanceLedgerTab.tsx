import { EmptyState, SimBadge } from '../../components/EmptyState';
import { formatMoney } from '../../domain/pricing';
import { LEDGER_TYPE_LABEL, type LedgerType } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/** Sổ giao dịch (Admin – Tài chính): tiền vào qua cổng, thu COD, hoàn tiền, chi trả HTX. Chỉ thêm, không sửa, không xoá. */
export function FinanceLedgerTab() {
  const { state,demoMode } = useStore();
  if (state.ledgerEntries.length === 0) return <EmptyState>Sổ giao dịch chưa có dòng nào.</EmptyState>;
  const totals = (Object.keys(LEDGER_TYPE_LABEL) as LedgerType[]).map((t) => [t, state.ledgerEntries.filter((e) => e.type === t).reduce((s, e) => s + e.amount, 0)] as const);
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm text-stone-700">
        {demoMode?<><SimBadge /> Dữ liệu tiền trong chế độ demo.</>:<>Sổ ghi nhận giao dịch và chứng từ. Bút toán điều chỉnh không tự chuyển tiền hoặc sửa kỳ đã chốt.</>}
      </p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {totals.map(([t, v]) => (
          <div key={t} className="rounded-2xl border border-stone-200 bg-white p-3">
            <p className="text-xs text-stone-600">{LEDGER_TYPE_LABEL[t]}</p>
            <p className="font-bold tabular-nums">{formatMoney(v)}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-stone-50 text-xs text-muted">
            <tr>
              <th className="px-3 py-2">Thời điểm</th>
              <th className="px-3 py-2">Loại</th>
              <th className="px-3 py-2 text-right">Số tiền</th>
              <th className="px-3 py-2">Đơn / HTX</th>
              <th className="px-3 py-2">Tham chiếu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {state.ledgerEntries.map((e) => (
              <tr key={e.id}>
                <td className="px-3 py-2 whitespace-nowrap">{new Date(e.at).toLocaleString('vi-VN')}</td>
                <td className="px-3 py-2">{LEDGER_TYPE_LABEL[e.type]}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${e.amount < 0 ? 'text-rose-700' : 'text-forest-700'}`}>{e.amount < 0 ? `−${formatMoney(-e.amount)}` : formatMoney(e.amount)}</td>
                <td className="px-3 py-2 font-mono text-xs">{e.orderId ?? state.coops.find((c) => c.id === e.coopId)?.name ?? '—'}</td>
                <td className="px-3 py-2 text-xs">
                  {e.refId} {e.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
