import { useState, type ReactNode } from 'react';
import {ContentManagementTab} from './ContentManagementTab';
import { useUi } from '../../app/UiContext';
import { PAGE_X } from '../../app/layout';
import { ListBoundary } from '../../components/ListBoundary';
import { useStore } from '../../store/AppDataContext';
import { ADMIN_GROUP_LABEL, type AdminSubGroup } from '../../domain/types';
import { AdminAccountsTab } from './AdminAccountsTab';
import { AdminAuditTab } from './AdminAuditTab';
import { AdminCoopsTab } from './AdminCoopsTab';
import { FinanceCodTab } from './FinanceCodTab';
import { FinanceInvoicesTab } from './FinanceInvoicesTab';
import { FinanceLedgerTab } from './FinanceLedgerTab';
import { AdminOrdersTab } from './AdminOrdersTab';
import { AdminOverviewTab } from './AdminOverviewTab';
import { AdminParamsTab } from './AdminParamsTab';
import { CarrierSimTab } from './CarrierSimTab';
import { CskhReviewsTab } from './CskhReviewsTab';
import { CskhTicketsTab } from './CskhTicketsTab';
import { OpsAccountsTab } from './OpsAccountsTab';
import { QualityCoopsTab } from './QualityCoopsTab';
import { SharedCatalogTab } from './SharedCatalogTab';
import { VouchersTab } from './VouchersTab';
import { FinanceRefundsTab } from './FinanceRefundsTab';
import { FinanceSettlementTab } from './FinanceSettlementTab';
import { QualityApplicationsTab } from './QualityApplicationsTab';
import { QualityChangesTab } from './QualityChangesTab';

type TabDef = { key: string; label: string; render: () => ReactNode };

const OVERVIEW: TabDef = { key: 'overview', label: 'Tổng quan', render: () => <AdminOverviewTab /> };
/** Danh sách HTX (có SĐT, địa chỉ để Admin liên hệ HTX, sản phẩm đang bán của từng HTX): mọi nhóm quyền đều có. */
const COOP_LIST: TabDef = { key: 'coop-list', label: 'Danh sách HTX', render: () => <AdminCoopsTab /> };

/** Chức năng theo nhóm quyền (mục 8). Nhóm quyền lấy từ tài khoản đăng nhập. */
const TABS: Record<AdminSubGroup, TabDef[]> = {
  operations: [
    OVERVIEW,
    { key: 'orders', label: 'Đơn hàng', render: () => <AdminOrdersTab /> },
    { key: 'carrier', label: 'Giao hàng', render: () => <CarrierSimTab /> },
    { key: 'accounts', label: 'Cấp & khoá tài khoản', render: () => <OpsAccountsTab /> },
    { key: 'params', label: 'Tham số', render: () => <AdminParamsTab /> },
    { key: 'catalog', label: 'Danh mục dùng chung', render: () => <SharedCatalogTab /> },
    { key:'content',label:'Nội dung trang chủ',render:()=> <ContentManagementTab/> },
    { key: 'vouchers', label: 'Mã ưu đãi', render: () => <VouchersTab /> },
    COOP_LIST,
  ],
  quality: [
    OVERVIEW,
    { key: 'applications', label: 'Duyệt HTX mới', render: () => <QualityApplicationsTab /> },
    { key: 'changes', label: 'Duyệt sản phẩm & giá', render: () => <QualityChangesTab /> },
    { key: 'coops', label: 'Hồ sơ HTX & quyền bán', render: () => <QualityCoopsTab /> },
    COOP_LIST,
  ],
  cskh: [
    OVERVIEW,
    { key: 'tickets', label: 'Ticket khiếu nại', render: () => <CskhTicketsTab /> },
    { key: 'reviews', label: 'Kiểm duyệt đánh giá', render: () => <CskhReviewsTab /> },
    COOP_LIST,
  ],
  finance: [
    OVERVIEW,
    { key: 'refunds', label: 'Hoàn tiền', render: () => <FinanceRefundsTab /> },
    { key: 'settlement', label: 'Đối soát HTX', render: () => <FinanceSettlementTab /> },
    { key: 'ledger', label: 'Sổ giao dịch', render: () => <FinanceLedgerTab /> },
    { key: 'cod', label: 'Thu hộ COD', render: () => <FinanceCodTab /> },
    { key: 'invoices', label: 'Hoá đơn công ty', render: () => <FinanceInvoicesTab /> },
    COOP_LIST,
  ],
  root: [
    { key: 'accounts', label: 'Phân quyền', render: () => <AdminAccountsTab /> },
    { key: 'audit', label: 'Nhật ký', render: () => <AdminAuditTab /> },
    { key:'params',label:'Tham số (chỉ xem)',render:()=> <AdminParamsTab/> },
  ],
};

/** Admin theo nhóm quyền (mục 8). Giao diện rộng cho máy tính. */
export function AdminScreen() {
  const { adminGroup } = useUi();
  const { state } = useStore();
  const [tab, setTab] = useState(TABS[adminGroup][0].key);
  const current = TABS[adminGroup].find((t) => t.key === tab) ?? TABS[adminGroup][0];

  return (
    <div className={`flex flex-1 flex-col gap-4 py-4 lg:flex-row lg:gap-6 ${PAGE_X}`}>
      <aside className="space-y-3 lg:sticky lg:top-[calc(var(--app-header-h,0px)+1rem)] lg:w-60 lg:shrink-0 lg:self-start">
        <div className="lattice relative overflow-hidden rounded-3xl bg-forest-950 p-4 pb-6 text-white">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne-300">Quản trị</span>
          <p className="font-display text-lg font-semibold">Admin – {ADMIN_GROUP_LABEL[adminGroup]}</p>
          <div aria-hidden="true" className="brocade-dark absolute inset-x-0 bottom-0 h-2" />
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col" aria-label="Chức năng quản trị">
          {TABS[adminGroup].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} aria-current={current.key === t.key ? 'page' : undefined} className={`min-h-11 whitespace-nowrap rounded-xl px-3 text-left text-sm font-medium ${current.key === t.key ? 'bg-forest-900 text-champagne-100 ring-1 ring-champagne-400/60' : 'bg-white text-stone-700 hover:bg-stone-100'}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </aside>
      <section className="min-w-0 flex-1">
        <ListBoundary key={current.key} label={`mục "${current.label}"`} resetKey={state}>
          {current.render()}
        </ListBoundary>
      </section>
    </div>
  );
}
