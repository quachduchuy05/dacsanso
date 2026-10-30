import { useUi } from '../../app/UiContext';
import {ExportButtons} from '../../components/ExportButtons';
import {SettlementDetails} from '../../components/SettlementDetails';
import { EmptyState } from '../../components/EmptyState';
import { formatMoney } from '../../domain/pricing';
import { addMs, DAY_MS } from '../../domain/state';
import { eligibleLines, summarize, weekStart } from '../../store/commands/settlement';
import { useStore } from '../../store/AppDataContext';

/**
 * Doanh thu và đối soát của HTX (FR-DT-01..03, L13).
 * Hoa hồng COM-01 trên tiền hàng thực giữ lại; phí giao không phải doanh thu HTX; không có nút rút tiền, không có dòng thuế TNCN.
 */
export function CoopWalletTab() {
  const { state, now } = useStore();
  const { coopId } = useUi();
  const coop = state.coops.find((c) => c.id === coopId);
  const at = now();
  const currentEnd = addMs(weekStart(at), 7 * DAY_MS);
  const lines = eligibleLines(state, coopId, currentEnd);
  const sum = summarize(lines);
  const periods = state.payoutPeriods.filter((p) => p.coopId === coopId);

  return (
    <div className="space-y-3 xl:grid xl:grid-cols-2 xl:items-start xl:gap-4 xl:space-y-0">
      <div className="xl:col-span-2"><ExportButtons/></div>
      <div className="space-y-1 rounded-3xl bg-forest-900 p-4 text-white xl:col-span-2">
        <p className="text-sm text-forest-100">
          Kỳ tuần {weekStart(at).toLocaleDateString('vi-VN')} – {addMs(currentEnd, -1).toLocaleDateString('vi-VN')} (tạm tính)
        </p>
        <p className="text-2xl font-extrabold tabular-nums text-forest-300">{formatMoney(sum.payout)}</p>
        <p className="text-sm text-forest-100">
          Tiền hàng thực giữ lại {formatMoney(sum.retained)} − hoa hồng sàn {state.params.commissionPercent}% ({formatMoney(sum.commission)})
        </p>
        <p className="text-sm text-forest-100">
          Phí giao không tính vào doanh thu HTX. Mã ưu đãi do sàn chịu. Admin – Tài chính chốt kỳ và ghi nhận chi trả (mô phỏng) vào tài khoản {coop?.payoutAccountMasked}. HTX không tự rút tiền.
        </p>
      </div>

      <section className="space-y-1 rounded-2xl border border-stone-200 bg-white p-3 text-sm">
        <h4 className="font-bold">Đơn đủ điều kiện kỳ này</h4>
        {lines.length === 0 ? (
          <p className="text-stone-600">Chưa có đơn Đã giao nào đủ điều kiện (không còn khiếu nại hay trả hàng đang mở).</p>
        ) : (
          lines.map((l) => (
            <div key={l.orderId} className="flex justify-between gap-2">
              <span className="font-mono">{l.orderId}</span>
              <span className="tabular-nums">
                {formatMoney(l.retained)} − {formatMoney(l.commission)} = <strong>{formatMoney(l.payout)}</strong>
              </span>
            </div>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-bold">Các kỳ đã chốt</h4>
        {periods.length === 0 ? (
          <EmptyState>Chưa có kỳ nào được chốt.</EmptyState>
        ) : (
          periods.map((p) => (
            <div key={p.id} className="rounded-2xl border border-stone-200 bg-white p-3 text-sm">
              <p className="font-bold">
                {new Date(p.start).toLocaleDateString('vi-VN')} – {addMs(new Date(p.end), -1).toLocaleDateString('vi-VN')} · {p.lines.length} đơn
              </p>
              <p>
                Chi trả {formatMoney(p.payout)} · {p.status === 'paid' ? `Đã ghi nhận chi trả ${new Date(p.paidAt!).toLocaleString('vi-VN')}` : 'Đã chốt, chờ chi trả'}
              </p>
              <SettlementDetails lines={p.lines}/>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
