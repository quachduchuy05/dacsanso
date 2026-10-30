import { Building2 } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { PAGE_X } from '../../app/layout';
import { regulatorOrderRows } from '../../domain/access';
import { formatMoney } from '../../domain/pricing';
import { ORDER_STATUS_LABEL } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';
import { AdminTable, Td } from '../../components/AdminTable';
import { EmptyState, ErrorState } from '../../components/EmptyState';
import { ExportButtons } from '../../components/ExportButtons';
import { StatsPanel } from '../admin/AdminOverviewTab';

/**
 * Cơ quan QLNN: chỉ đọc, số liệu tổng hợp tính từ dữ liệu trong store (L17, FR-BCTK-01).
 * Không hiện tên, SĐT, địa chỉ, tài khoản của khách; không xem nhật ký; không sửa được gì (mục 5.9).
 */
export function RegulatorScreen() {
  const { state } = useStore();
  const { actor } = useUi();
  const rows = regulatorOrderRows(state, actor);
  return (
    <div className={`space-y-4 py-4 ${PAGE_X}`}>
      <div className="lattice relative space-y-1 overflow-hidden rounded-3xl bg-forest-950 p-4 pb-6 text-white">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-champagne-300">
          <Building2 size={16} /> Cơ quan quản lý nhà nước – chỉ xem
        </span>
        <h2 className="font-display text-2xl font-semibold">Số liệu tổng hợp</h2>
        <p className="text-sm text-forest-100">Số liệu tính từ dữ liệu demo hiện có. Không có dữ liệu cá nhân của khách hàng.</p>
        <div aria-hidden="true" className="brocade-dark absolute inset-x-0 bottom-0 h-2" />
      </div>
      <StatsPanel />
      <p className="text-sm text-stone-600">Báo cáo được tổng hợp trên máy chủ. Tài khoản giám sát không truy cập dữ liệu đơn hàng cá nhân.</p>
    </div>
  );
}
