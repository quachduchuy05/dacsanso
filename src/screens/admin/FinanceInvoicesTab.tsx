import { AdminTable, Td } from '../../components/AdminTable';
import { EmptyState, SimBadge } from '../../components/EmptyState';
import { INVOICE_SIMULATED_LABEL, invoiceOrders } from '../../store/commands/invoice';
import { formatMoney } from '../../domain/pricing';
import { ORDER_STATUS_LABEL } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/** Yêu cầu xuất hoá đơn công ty (Admin – Tài chính, Giai đoạn 8): thông tin khách chốt lúc đặt, theo từng đơn. Chưa phát hành hoá đơn điện tử. */
export function FinanceInvoicesTab() {
  const { state } = useStore();
  const orders = invoiceOrders(state);
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm text-stone-700">
        <SimBadge /> {INVOICE_SIMULATED_LABEL}. Bảng chỉ để xem thông tin khách yêu cầu.
      </p>
      {orders.length === 0 ? (
        <EmptyState>Chưa có đơn nào yêu cầu xuất hoá đơn công ty.</EmptyState>
      ) : (
        <AdminTable
          caption={`${orders.length} đơn yêu cầu hoá đơn`}
          columns={['Đơn', 'HTX', 'Công ty', 'Mã số thuế', 'Địa chỉ', 'Email', { label: 'Tổng đơn', align: 'right' }, 'Trạng thái']}
          minWidth={1080}
        >
          {orders.map((o) => (
            <tr key={o.id}>
              <Td className="font-mono font-bold whitespace-nowrap">{o.id}</Td>
              <Td>{o.coopName}</Td>
              <Td className="font-semibold">{o.invoice!.companyName}</Td>
              <Td className="font-mono whitespace-nowrap">{o.invoice!.taxCode}</Td>
              <Td>{o.invoice!.address}</Td>
              <Td className="break-all">{o.invoice!.email}</Td>
              <Td className="text-right tabular-nums">{formatMoney(o.pricing.total)}</Td>
              <Td>{ORDER_STATUS_LABEL[o.status]}</Td>
            </tr>
          ))}
        </AdminTable>
      )}
    </div>
  );
}
