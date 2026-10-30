import { useUi } from '../../app/UiContext';
import { AdminTable, Td } from '../../components/AdminTable';
import { EmptyState, SimBadge } from '../../components/EmptyState';
import { formatMoney } from '../../domain/pricing';
import { codOnHand, codTotal, financeConfirmRemittance, listShippers } from '../../store/commands/shipper';
import { useStore } from '../../store/AppDataContext';

/**
 * Tiền thu hộ (COD) của shipper (Admin – Tài chính, mô phỏng): shipper đang giữ bao nhiêu, phiếu nộp tiền chờ xác nhận.
 * Xác nhận chỉ ghi nhận trong demo, không đối chiếu ngân hàng thật.
 */
export function FinanceCodTab() {
  const { state, run,demoMode } = useStore();
  const { adminActor, showToast } = useUi();
  const remittances = state.codRemittances ?? [];
  const holding = listShippers(state)
    .map((u) => ({ user: u, orders: codOnHand(state, u.id) }))
    .filter((x) => x.orders.length > 0);
  const confirmReceived = async (id: string) => {
    const r = await run((s, t) => financeConfirmRemittance(s, adminActor, id, t));
    showToast(r.ok ? 'Đã ghi nhận Tài chính nhận tiền thu hộ.' : r.error);
  };
  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-2 text-sm text-stone-700">
        {demoMode&&<SimBadge />} Shipper lập phiếu nộp, Tài chính kiểm tra tiền/chứng từ ngoài hệ thống trước khi xác nhận. Ứng dụng không tự chuyển tiền hoặc đối chiếu ngân hàng.
      </p>
      <section aria-labelledby="shipper-dang-giu" className="space-y-2">
        <h3 id="shipper-dang-giu" className="font-display text-xl font-semibold text-ink">
          Shipper đang giữ
        </h3>
        {holding.length === 0 ? (
          <EmptyState>Không shipper nào đang giữ tiền thu hộ chưa nộp.</EmptyState>
        ) : (
          <AdminTable columns={['Shipper', 'Số đơn', { label: 'Số tiền', align: 'right' }]}>
            {holding.map((x) => (
              <tr key={x.user.id}>
                <Td>{x.user.name}</Td>
                <Td className="tabular-nums">{x.orders.length}</Td>
                <Td className="text-right tabular-nums">{formatMoney(codTotal(x.orders))}</Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </section>
      <section aria-labelledby="phieu-nop-tien" className="space-y-2">
        <h3 id="phieu-nop-tien" className="font-display text-xl font-semibold text-ink">
          Phiếu nộp tiền
        </h3>
        {remittances.length === 0 ? (
          <EmptyState>Chưa có phiếu nộp tiền.</EmptyState>
        ) : (
          <AdminTable columns={['Phiếu', 'Shipper', 'Đơn', { label: 'Số tiền', align: 'right' }, 'Nộp lúc', 'Trạng thái']} minWidth={860}>
            {remittances.map((r) => (
              <tr key={r.id}>
                <Td className="font-mono font-bold">{r.id}</Td>
                <Td>{r.shipperName}</Td>
                <Td className="font-mono text-xs">{r.orderIds.join(', ')}</Td>
                <Td className="text-right tabular-nums">{formatMoney(r.amount)}</Td>
                <Td>{new Date(r.createdAt).toLocaleString('vi-VN')}</Td>
                <Td>
                  {r.status === 'confirmed' ? (
                    <span className="text-forest-800">
                      Đã nhận · {r.confirmedBy}, {new Date(r.confirmedAt!).toLocaleString('vi-VN')}
                    </span>
                  ) : (
                    <button onClick={() => confirmReceived(r.id)} className="min-h-11 rounded-xl bg-forest-800 px-3 font-semibold text-white">
                      Xác nhận đã nhận tiền
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </section>
    </div>
  );
}
