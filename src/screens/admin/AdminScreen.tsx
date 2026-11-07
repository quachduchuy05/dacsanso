import { useEffect, useId, useState, type ReactNode } from 'react';
import { ArrowRight, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Headphones, LayoutDashboard, Package, Search, Settings2, Store, Wallet, X, type LucideIcon } from 'lucide-react';
import {ContentManagementTab} from './ContentManagementTab';
import { useUi } from '../../app/UiContext';
import { matchesSearch } from '../../domain/text';
import { AccountSecuritySettings } from '../../app/PasswordTools';
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
  root: [], // Filled with the combined administrative workspace below.
};

const UNIFIED_TABS:TabDef[]=[
  ...new Map([...TABS.operations,...TABS.quality,...TABS.cskh,...TABS.finance].map(tab=>[tab.key,tab])).values(),
  {key:'permissions',label:'Phân quyền Admin',render:()=> <AdminAccountsTab/>},
  {key:'audit',label:'Nhật ký',render:()=> <AdminAuditTab/>},
];
TABS.root=UNIFIED_TABS;
for (const tabs of Object.values(TABS)) tabs.push({key:'security',label:'Bảo mật tài khoản',render:()=> <AccountSecuritySettings/>});

const GROUPS: {label:string; Icon:LucideIcon; keys:string[]}[] = [
  {label:'Tổng quan',Icon:LayoutDashboard,keys:['overview']},
  {label:'Bán hàng & giao nhận',Icon:ClipboardList,keys:['orders','carrier','vouchers']},
  {label:'Sản phẩm & nhà cung cấp',Icon:Package,keys:['changes','applications','coops','coop-list','catalog','content']},
  {label:'Chăm sóc khách hàng',Icon:Headphones,keys:['tickets','reviews']},
  {label:'Tài chính',Icon:Wallet,keys:['refunds','settlement','ledger','cod','invoices']},
  {label:'Hệ thống',Icon:Settings2,keys:['accounts','permissions','params','audit','security']},
];
const DESCRIPTIONS:Record<string,string>={
  overview:'Bắt đầu từ công việc cần làm, mở báo cáo khi cần xem sâu hơn.',
  orders:'Tra cứu trạng thái, thanh toán và thông tin của các đơn hàng.',
  carrier:'Phân công và theo dõi giao nhận. Shipper tự cập nhật kết quả giao hàng.',
  vouchers:'Quản lý điều kiện và thời gian áp dụng mã ưu đãi.',
  changes:'Quản lý sản phẩm, giá bán và các yêu cầu cần duyệt.',
  applications:'Tiếp nhận, kiểm tra và duyệt hồ sơ nhà cung cấp mới.',
  coops:'Kiểm tra hồ sơ và điều kiện mở bán của hợp tác xã.',
  'coop-list':'Tra cứu đầu mối liên hệ và sản phẩm của từng hợp tác xã.',
  catalog:'Quản lý danh mục và các thông tin dùng chung.',
  content:'Chỉnh nội dung hiển thị trên trang chủ cửa hàng.',
  tickets:'Tiếp nhận khiếu nại và theo dõi quá trình hỗ trợ khách hàng.',
  reviews:'Kiểm tra nội dung đánh giá trước khi hiển thị công khai.',
  refunds:'Theo dõi và xử lý yêu cầu hoàn tiền theo quy trình.',
  settlement:'Kiểm tra kỳ đối soát và khoản chi trả cho hợp tác xã.',
  ledger:'Tra cứu các bút toán và lịch sử giao dịch.',
  cod:'Kiểm tra khoản thu hộ và tình trạng nộp tiền.',
  invoices:'Tra cứu thông tin xuất hóa đơn của khách hàng.',
  accounts:'Cấp tài khoản và quản lý trạng thái truy cập.',
  permissions:'Quản lý quyền truy cập của các tài khoản Admin.',
  params:'Điều chỉnh tham số vận hành. Kiểm tra kỹ trước khi lưu.',
  audit:'Tra cứu người thao tác, thời điểm và nội dung thay đổi.',
  security:'Quản lý hồ sơ cá nhân, mật khẩu và bảo mật tài khoản.',
};

/** Admin theo nhóm quyền (mục 8). Giao diện rộng cho máy tính. */
export function AdminScreen() {
  const { adminGroup, user } = useUi();
  const { state } = useStore();
  const [tab, setTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const searchId = useId();
  const menuId = useId();
  const pageId = useId();
  const current = TABS[adminGroup].find((t) => t.key === tab) ?? TABS[adminGroup][0];
  const currentGroup = GROUPS.find(g=>g.keys.includes(current.key))!;
  useEffect(()=>{setTab('overview');setQuery('');setMenuOpen(false);},[user?.id,adminGroup]);
  const navigate = (key:string) => {if(!TABS[adminGroup].some(t=>t.key===key))return;setTab(key);setMenuOpen(false);setQuery('');};
  const groups = GROUPS.map(group=>({...group,tabs:group.keys.map(key=>TABS[adminGroup].find(t=>t.key===key)).filter((t):t is TabDef=>!!t).filter(t=>matchesSearch(query,[t.label,group.label,DESCRIPTIONS[t.key]]))})).filter(group=>group.tabs.length);

  return (
    <div className="admin-workspace">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand"><span><LayoutDashboard size={20}/></span><div><strong>Không gian quản trị</strong><small>{ADMIN_GROUP_LABEL[adminGroup]}</small></div></div>
        <button className="admin-menu-toggle" aria-expanded={menuOpen} aria-controls={menuId} onClick={()=>setMenuOpen(!menuOpen)}><span>Chức năng · {current.label}</span>{menuOpen?<X size={18}/>:<ChevronDown size={18}/>}</button>
        <div id={menuId} className={`admin-sidebar-body ${menuOpen?'is-open':''}`}>
          <label className="admin-menu-search" htmlFor={searchId}><Search size={16}/><input id={searchId} aria-label="Tìm chức năng quản trị" placeholder="Tìm chức năng…" value={query} onChange={event=>setQuery(event.target.value)}/>{query&&<button aria-label="Xóa tìm chức năng" onClick={()=>setQuery('')}><X size={15}/></button>}</label>
          <nav aria-label="Chức năng quản trị">{groups.map(({label,Icon,tabs})=><div className="admin-nav-group" key={label}><p><Icon size={14}/>{label}</p>{tabs.map(t=><button key={t.key} onClick={()=>navigate(t.key)} aria-current={current.key===t.key?'page':undefined}><span>{t.label}</span>{current.key===t.key&&<ChevronRight size={14}/>}</button>)}</div>)}{!groups.length&&<p className="admin-nav-empty" role="status">Không tìm thấy chức năng. Thử “đơn hàng”, “tài chính” hoặc “sản phẩm”.</p>}</nav>
          <div className="admin-sidebar-note"><CircleHelp size={16}/><span>Mỗi công việc có một nơi xử lý. Tìm nhanh theo tên ở phía trên.</span></div>
        </div>
      </aside>
      <section className="admin-main" aria-labelledby={pageId}>
        <header className="admin-page-heading"><div><p>QUẢN TRỊ <ChevronRight size={12}/> {currentGroup.label}</p><h1 id={pageId}>{current.label}</h1><span>{DESCRIPTIONS[current.key]}</span></div>{current.key!=='overview'&&<button className="admin-back-overview" onClick={()=>navigate('overview')}><LayoutDashboard size={16}/> Tổng quan</button>}</header>
        <ListBoundary key={current.key} label={`mục "${current.label}"`} resetKey={state}>
          <div className="admin-page-content">{current.key==='overview'?<AdminStart tabs={TABS[adminGroup]} onNavigate={navigate}/>:current.render()}</div>
        </ListBoundary>
      </section>
    </div>
  );
}

function AdminStart({tabs,onNavigate}:{tabs:TabDef[];onNavigate:(key:string)=>void}) {
  const {state}=useStore();
  const [reportsOpen,setReportsOpen]=useState(false);
  const has=(key:string)=>tabs.some(t=>t.key===key);
  const queues = [
    {key:'orders',label:'Đơn chờ xác nhận',value:state.orders.filter(o=>o.status==='awaiting_confirmation').length,Icon:ClipboardList},
    {key:'changes',label:'Sản phẩm chờ duyệt',value:state.products.filter(p=>p.status==='pending').length,Icon:Package},
    {key:'tickets',label:'Khiếu nại chưa đóng',value:state.tickets.filter(t=>t.status!=='closed').length,Icon:Headphones},
    {key:'refunds',label:'Hoàn tiền cần xử lý',value:state.refunds.filter(r=>r.status==='refund_pending'||r.status==='refunding').length,Icon:Wallet},
  ].filter(item=>has(item.key));
  return <div className="admin-start">
    <section aria-labelledby="admin-queues"><div className="admin-block-heading"><h2 id="admin-queues">Công việc hiện tại</h2><span>Theo dữ liệu đang tải trên hệ thống</span></div><div className="admin-queue-grid">{queues.map(({key,label,value,Icon})=><button key={key} className="admin-queue" onClick={()=>onNavigate(key)}><div><Icon size={20}/><ArrowRight size={16}/></div><strong>{value.toLocaleString('vi-VN')}</strong><span>{label}</span></button>)}</div>{!queues.length&&<p className="admin-muted">Chọn một nhóm bên dưới để bắt đầu.</p>}</section>
    <section aria-labelledby="admin-shortcuts"><div className="admin-block-heading"><h2 id="admin-shortcuts">Bạn muốn làm gì?</h2><span>Mở đúng nơi, bớt thao tác</span></div><div className="admin-shortcut-grid">{GROUPS.slice(1).map(({label,Icon,keys})=>{const allowed=keys.map(key=>tabs.find(t=>t.key===key)).filter((t):t is TabDef=>!!t);return allowed.length>0&&<article className="admin-shortcut-group" key={label}><h3><Icon size={19}/>{label}</h3>{allowed.map(t=><button key={t.key} onClick={()=>onNavigate(t.key)}>{t.label}<ArrowRight size={15}/></button>)}</article>;})}</div></section>
    <details className="admin-reports" onToggle={event=>setReportsOpen(event.currentTarget.open)}><summary><span><Store size={20}/><strong>Báo cáo & phân tích</strong><small>Biểu đồ, bộ lọc thời gian và xuất dữ liệu</small></span><ChevronDown size={18}/></summary>{reportsOpen&&<div><AdminOverviewTab/></div>}</details>
  </div>;
}
