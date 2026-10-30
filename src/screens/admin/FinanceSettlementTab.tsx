import {ReconciliationPanel} from '../../components/ReconciliationPanel';
import {SettlementPolicySettings} from '../../components/SettlementPolicySettings';
import {PayoutProgress} from '../../components/PayoutProgress';
import {ManualPayoutForm} from '../../components/ManualPayoutForm';
import {SettlementDetails} from '../../components/SettlementDetails';
import { useUi } from '../../app/UiContext';
import { SimBadge } from '../../components/EmptyState';
import { PrimaryButton, SecondaryButton } from '../../components/form';
import { formatMoney } from '../../domain/pricing';
import { closePeriod, eligibleLines, recordPayout, summarize, weekStart } from '../../store/commands/settlement';
import { useStore } from '../../store/AppDataContext';

/** Admin – Tài chính chốt kỳ tuần, duyệt bảng kê, ghi nhận chi trả (mô phỏng) vào tài khoản HTX (FR-DT-02..04, L13). */
export function FinanceSettlementTab() {
  const { state, run, now } = useStore();
  const { adminActor, showToast } = useUi();
  // Kỳ gần nhất đã qua giờ cắt: thứ Hai 00:00 của tuần hiện tại.
  const cutoff = weekStart(now());
  const act = async (op: Parameters<typeof run>[0], ok: string) => {
    const r = await run(op);
    showToast(r.ok ? ok : r.error);
  };
  return (
    <div className="space-y-4"><SettlementPolicySettings/><ReconciliationPanel/>
      <p className="text-sm text-stone-700">
        Giờ cắt kỳ gần nhất: <strong>{cutoff.toLocaleString('vi-VN')}</strong>. Đơn vào kỳ khi đã giao trước giờ cắt, thu đủ tiền, COD đã xác nhận nộp/đối soát và không còn khiếu nại đang mở. Hoa hồng {state.params.commissionPercent}% (COM-01) trên tiền hàng thực giữ lại.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-stone-50 text-xs text-muted">
            <tr>
              <th className="px-3 py-2">HTX</th>
              <th className="px-3 py-2 text-right">Đơn đủ điều kiện</th>
              <th className="px-3 py-2 text-right">Tiền hàng giữ lại</th>
              <th className="px-3 py-2 text-right">Hoa hồng</th>
              <th className="px-3 py-2 text-right">Chi trả</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {state.coops.map((c) => {
              const lines = eligibleLines(state, c.id, cutoff);
              const s = summarize(lines);
              return (
                <tr key={c.id}>
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2 text-right">{lines.length}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(s.retained)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(s.commission)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(s.payout)}</td>
                  <td className="px-3 py-2">
                    <SecondaryButton disabled={lines.length === 0} onClick={() => act((st, t) => closePeriod(st, c.id, adminActor, cutoff, t), 'Đã chốt kỳ. Kỳ đã chốt bị khoá.')}>
                      Chốt kỳ
                    </SecondaryButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h3 className="flex items-center gap-2 text-base font-bold">
        Kỳ đã chốt
      </h3>
      {state.payoutPeriods.length === 0 ? (
        <p className="text-sm text-stone-600">Chưa có kỳ nào được chốt. Dùng "Công cụ demo" để tua thời gian qua giờ cắt kỳ nếu cần.</p>
      ) : (
        <ul className="space-y-2">
          {state.payoutPeriods.map((p) => {
            const coop = state.coops.find((c) => c.id === p.coopId);
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-white p-3 text-sm">
                <span>
                  {coop?.name} · {p.lines.length} đơn · chi trả <strong>{formatMoney(p.payout)}</strong> vào {coop?.payoutAccountMasked}
                  <span className="block text-xs text-muted">
                    Chốt {new Date(p.closedAt).toLocaleString('vi-VN')} bởi {p.closedBy}
                    {p.paidAt ? ` · đã ghi nhận chi trả ${new Date(p.paidAt).toLocaleString('vi-VN')}, mã ${p.paidRef}` : ''}
                  </span>
                </span>
                <SettlementDetails lines={p.lines}/>
                <PayoutProgress period={p}/>
                {p.status === 'closed' && <ManualPayoutForm period={p}/>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
