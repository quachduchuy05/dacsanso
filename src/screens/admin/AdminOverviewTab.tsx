import { useEffect,useId, useState, type ReactNode } from 'react';
import {api} from '../../store/backend';
import { BarList, ColumnChart, Segmented, type ChartDatum } from '../../components/Charts';
import { ExportButtons } from '../../components/ExportButtons';
import { formatMoney } from '../../domain/pricing';
import { aggregateStats, periodStats, STATS_METRIC_LABEL, STATS_RANGE_LABEL, type Bucket, type StatsMetric, type StatsRange } from '../../domain/stats';
import { COMPLAINT_REASON_LABEL, ORDER_STATUS_LABEL } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

const orders = (n: number) => `${n.toLocaleString('vi-VN')} đơn`;

function ChartCard({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <figure aria-labelledby={id} className={`space-y-3 rounded-3xl border border-stone-200 bg-white p-4 ${className}`}>
      <figcaption id={id}>
        <span className="block font-display text-lg font-semibold text-ink">{title}</span>
        {subtitle && <span className="block text-xs text-muted">{subtitle}</span>}
      </figcaption>
      {children}
    </figure>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-stone-50 p-4 text-center text-sm text-stone-600">{children}</p>;
}

/**
 * Số liệu tổng hợp tính từ store (FR-BCTK-01, L17). Dùng chung cho Admin và Cơ quan QLNN; không có dữ liệu cá nhân của khách.
 * Góp ý kiểm thử: thêm biểu đồ để trực quan hơn. Ô số liệu là tình trạng hiện tại; bộ lọc thời gian và chỉ số ở một hàng
 * phía trên, áp cho mọi biểu đồ và bảng bên dưới. Dạng bảng nằm cuối (mở ra xem đủ số).
 */
export function StatsPanel() {
  const { state, now } = useStore();
  const [range, setRange] = useState<StatsRange>('30d');
  const [metric, setMetric] = useState<StatsMetric>('orders');
  const [refresh,setRefresh]=useState(0),[preview,setPreview]=useState<{snapshotId:string;dataAsOf:string;range:StatsRange;aggregate:ReturnType<typeof aggregateStats>;period:ReturnType<typeof periodStats>}|null>(null),[previewError,setPreviewError]=useState('');
  useEffect(()=>{let cancelled=false;setPreview(null);setPreviewError('');void api('/api/v1/reports/dashboard?range='+range).then(value=>{if(!cancelled)setPreview(value);}).catch(e=>{if(!cancelled)setPreviewError(e instanceof Error?e.message:'Không tải được báo cáo.');});return()=>{cancelled=true;};},[range,refresh]);
  const current=preview?.range===range?preview:null;
  const s = current?.aggregate??state.serverStats?.aggregate ?? aggregateStats(state);
  const p = current?.period??state.serverStats?.periods[range] ?? periodStats(state, range, now());
  const tiles: [string, string][] = [
    ['HTX đang hoạt động', String(s.coopsActive)],
    ['Sản phẩm đang bán', String(s.productsActive)],
    ['Sản phẩm có chứng nhận đã xác minh còn hiệu lực',String(s.productsVerified??0)],
    ['Tổng số đơn', String(s.ordersTotal)],
    ['Giá trị hàng đã giao', formatMoney(s.deliveredGoodsValue)],
    ['Khiếu nại đang mở', String(s.ticketsOpen)],
    ['Khiếu nại ưu tiên Cao', String(s.ticketsHighPriority)],
  ];
  const period = range === 'all' ? 'từ trước tới nay' : `${STATS_RANGE_LABEL[range]} gần nhất`;
  const bucketData = (rows: Bucket[]): ChartDatum[] =>
    rows.map((b) => ({
      key: b.key,
      label: b.label,
      value: b[metric],
      display: metric === 'orders' ? orders(b.orders) : formatMoney(b.goods),
      detail: metric === 'orders' ? `Tiền hàng ${formatMoney(b.goods)}` : orders(b.orders),
    }));
  // Chỉ vẽ trạng thái có đơn; đủ 11 trạng thái ở dạng bảng.
  const statusData: ChartDatum[] = p.byStatus.filter((x) => x.orders > 0).map((x) => ({ key: x.status, label: ORDER_STATUS_LABEL[x.status], value: x.orders, display: orders(x.orders) }));
  const reasonData: ChartDatum[] = p.ticketsByReason.map((x) => ({
    key: x.reason,
    label: COMPLAINT_REASON_LABEL[x.reason],
    value: x.tickets,
    display: `${x.tickets} khiếu nại`,
    detail: `${x.open} đang mở`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm"><button className="min-h-11 rounded border bg-white px-3" onClick={()=>setRefresh(value=>value+1)}>Làm mới số liệu</button><span>{current?`Dữ liệu chốt lúc ${new Date(current.dataAsOf).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}`:previewError||'Đang chốt phiên dữ liệu…'}</span></div>
      <ExportButtons filters={{range}} snapshotId={current?.snapshotId} snapshotRequired/>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-6">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-stone-200 bg-white p-3">
            <p className="text-sm text-stone-600">{label}</p>
            <p className="text-xl font-extrabold text-ink">{value}</p>
          </div>
        ))}
      </div>

      {/* Bộ lọc: một hàng, áp cho mọi biểu đồ và bảng bên dưới. */}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Khoảng thời gian" value={range} options={STATS_RANGE_LABEL} onChange={setRange} />
        <Segmented label="Chỉ số" value={metric} options={STATS_METRIC_LABEL} onChange={setMetric} />
        <span className="text-sm text-stone-600">
          {period}: {orders(p.totals.orders)} · tiền hàng {formatMoney(p.totals.goods)} · {p.totals.tickets} khiếu nại
        </span>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ChartCard
          className="lg:col-span-2"
          title={`${STATS_METRIC_LABEL[metric]} theo ngày`}
          subtitle={`${period}${range === 'all' ? ' (tối đa 90 ngày gần nhất)' : ''} · theo ngày đặt đơn${metric === 'goods' ? ' · tiền hàng không tính đơn chưa thanh toán xong, đã huỷ, trả hàng' : ''}`}
        >
          {p.totals.orders === 0 ? (
            <Empty>Chưa có đơn nào trong {period}.</Empty>
          ) : (
            <ColumnChart data={bucketData(p.daily)} label={`${STATS_METRIC_LABEL[metric]} theo ngày, ${period}`} integer={metric === 'orders'} />
          )}
        </ChartCard>
        <ChartCard title="Đơn theo trạng thái" subtitle={`Số đơn đặt trong ${period}, theo trạng thái hiện tại; trạng thái chưa có đơn xem ở dạng bảng`}>
          {p.totals.orders === 0 ? <Empty>Chưa có đơn.</Empty> : <BarList data={statusData} label="Đơn theo trạng thái" />}
        </ChartCard>
        <ChartCard title={`${STATS_METRIC_LABEL[metric]} theo HTX`} subtitle={period}>
          {p.byCoop.length === 0 ? <Empty>Chưa có đơn.</Empty> : <BarList data={bucketData(p.byCoop)} label={`${STATS_METRIC_LABEL[metric]} theo HTX`} />}
        </ChartCard>
        <ChartCard title={`${STATS_METRIC_LABEL[metric]} theo vùng`} subtitle={`${period} · theo vùng của sản phẩm đầu tiên trong đơn`}>
          {p.byRegion.length === 0 ? <Empty>Chưa có đơn.</Empty> : <BarList data={bucketData(p.byRegion)} label={`${STATS_METRIC_LABEL[metric]} theo vùng`} />}
        </ChartCard>
        <ChartCard title="Khiếu nại theo lý do" subtitle={`Khiếu nại gửi trong ${period}`}>
          {reasonData.length === 0 ? <Empty>Chưa có khiếu nại.</Empty> : <BarList data={reasonData} label="Khiếu nại theo lý do" />}
        </ChartCard>
      </div>

      <details className="rounded-3xl border border-stone-200 bg-white p-4">
        <summary className="flex min-h-11 cursor-pointer items-center font-bold text-ink">Xem số liệu dạng bảng ({period})</summary>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <DataTable caption="Đơn theo trạng thái" head={['Trạng thái', 'Số đơn']} rows={p.byStatus.map((x) => [ORDER_STATUS_LABEL[x.status], String(x.orders)])} />
          <DataTable caption="Theo HTX" head={['HTX', 'Số đơn', 'Tiền hàng']} rows={p.byCoop.map((b) => [b.label, String(b.orders), formatMoney(b.goods)])} />
          <DataTable caption="Theo vùng" head={['Vùng', 'Số đơn', 'Tiền hàng']} rows={p.byRegion.map((b) => [b.label, String(b.orders), formatMoney(b.goods)])} />
          <DataTable
            caption="Khiếu nại theo lý do"
            head={['Lý do', 'Khiếu nại', 'Đang mở']}
            rows={p.ticketsByReason.map((x) => [COMPLAINT_REASON_LABEL[x.reason], String(x.tickets), String(x.open)])}
          />
          <div className="md:col-span-2">
            <DataTable caption="Theo ngày" head={['Ngày', 'Số đơn', 'Tiền hàng']} rows={p.daily.filter((d) => d.orders > 0).map((d) => [d.label, String(d.orders), formatMoney(d.goods)])} />
          </div>
        </div>
      </details>
    </div>
  );
}

function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <table className="w-full rounded-2xl border border-stone-200 bg-white text-left text-sm">
      <caption className="p-2 text-left font-bold">{caption}</caption>
      <thead className="text-xs text-muted">
        <tr>
          {head.map((h, i) => (
            <th key={h} scope="col" className={`px-3 py-1 ${i > 0 ? 'text-right' : ''}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">
        {rows.length === 0 ? (
          <tr>
            <td colSpan={head.length} className="px-3 py-2 text-muted">
              Chưa có số liệu.
            </td>
          </tr>
        ) : (
          rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-1.5 ${j > 0 ? 'text-right tabular-nums' : ''}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export function AdminOverviewTab() {
  return (
    <div className="space-y-4">
      <StatsPanel />
    </div>
  );
}
