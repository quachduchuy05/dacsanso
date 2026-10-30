import { useId, useState } from 'react';
import { useUi } from '../../app/UiContext';
import { SectionHeading } from '../../components/Brand';
import { Segmented } from '../../components/Charts';
import { formatMoney } from '../../domain/pricing';
import { coopBestSellers, SALES_METRIC_LABEL, SALES_RANGE_LABEL, type ProductSales, type SalesMetric, type SalesRange } from '../../domain/salesStats';
import { useStore } from '../../store/AppDataContext';

/** Tiền gọn cho ô số liệu: 1,4 triệu đ; dưới 1 triệu thì ghi đủ. */
function compactMoney(n: number): string {
  const fmt = (v: number) => v.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  if (n >= 1e9) return `${fmt(n / 1e9)} tỷ đ`;
  if (n >= 1e6) return `${fmt(n / 1e6)} triệu đ`;
  return formatMoney(n);
}

/**
 * Sản phẩm bán chạy của HTX (chủ repo yêu cầu): biểu đồ thanh ngang xếp hạng, một màu cho mọi thanh (một chuỗi số liệu),
 * giá trị ghi ở đầu thanh, rê chuột / chạm vào dòng để xem đủ số liệu, có dạng bảng. Bộ lọc thời gian và cách xếp nằm
 * trên cùng, áp cho cả ô số liệu, biểu đồ và bảng.
 */
export function CoopSalesTab() {
  const { state, now } = useStore();
  const { coopId } = useUi();
  const [range, setRange] = useState<SalesRange>('30d');
  const [metric, setMetric] = useState<SalesMetric>('quantity');
  const [active, setActive] = useState<string | null>(null);
  const titleId = useId();
  const data = coopBestSellers(state, coopId, range, metric, now());
  const max = Math.max(1, ...data.rows.map((r) => r[metric]));
  const value = (r: ProductSales) => (metric === 'quantity' ? `${r.quantity.toLocaleString('vi-VN')} ${r.unit}` : formatMoney(r.revenue));
  const mixedUnits = new Set(data.rows.map((r) => r.unit)).size > 1;
  // Cùng một sản phẩm có nhiều quy cách: ghi kèm quy cách để phân biệt.
  const repeated = new Set(data.rows.filter((r, i) => data.rows.findIndex((x) => x.name === r.name) !== i).map((r) => r.name));
  const nameOf = (r: ProductSales) => (repeated.has(r.name) ? `${r.name} · ${r.unit}` : r.name);

  return (
    <div className="space-y-4">
      <SectionHeading eyebrow="Thống kê" title="Sản phẩm bán chạy" />

      {/* Bộ lọc: một hàng, áp cho mọi số liệu bên dưới. */}
      <div className="flex flex-wrap gap-2">
        <Segmented label="Khoảng thời gian" value={range} options={SALES_RANGE_LABEL} onChange={setRange} />
        <Segmented label="Xếp theo" value={metric} options={SALES_METRIC_LABEL} onChange={setMetric} />
      </div>

      <dl className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
        {[
          ['Tiền hàng', compactMoney(data.totals.revenue)],
          ['Số đơn', data.totals.orders.toLocaleString('vi-VN')],
          ['Sản phẩm có đơn', `${data.totals.products}/${data.totals.products + data.unsold}`],
        ].map(([label, v]) => (
          <div key={label} className="flex items-baseline justify-between gap-2 rounded-2xl border border-champagne-200 bg-white p-3 min-[360px]:flex-col-reverse min-[360px]:items-start min-[360px]:justify-start">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-lg font-semibold leading-tight text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <figure aria-labelledby={titleId} className="space-y-3 rounded-3xl border border-champagne-200 bg-white p-4">
        <figcaption id={titleId}>
          <span className="block font-display text-lg font-semibold text-ink">
            Xếp theo {SALES_METRIC_LABEL[metric].toLowerCase()} · {range === 'all' ? 'từ trước tới nay' : `${SALES_RANGE_LABEL[range]} gần nhất`}
          </span>
          <span className="block text-xs text-muted">Rê chuột hoặc chạm vào một dòng để xem đủ số liệu.</span>
        </figcaption>

        {data.rows.length === 0 ? (
          <div className="space-y-2 rounded-2xl bg-champagne-50/60 p-4 text-center text-sm text-stone-600">
            <p>Chưa có đơn nào {range === 'all' ? '' : `trong ${SALES_RANGE_LABEL[range]} gần nhất`}. Số liệu sẽ hiện khi khách đặt hàng.</p>
            {range !== 'all' && (
              <button type="button" onClick={() => setRange('all')} className="min-h-11 rounded-full border border-champagne-300 bg-white px-4 font-semibold text-forest-900 hover:bg-champagne-50">
                Xem tất cả
              </button>
            )}
          </div>
        ) : (
          <ol className="space-y-1">
            {data.rows.map((r, i) => {
              const ratio = r[metric] / max;
              const shown = active === r.productId;
              return (
                <li
                  key={r.productId}
                  tabIndex={0}
                  onPointerEnter={() => setActive(r.productId)}
                  onPointerLeave={() => setActive((a) => (a === r.productId ? null : a))}
                  onFocus={() => setActive(r.productId)}
                  onBlur={() => setActive((a) => (a === r.productId ? null : a))}
                  aria-label={`Hạng ${i + 1}: ${nameOf(r)}, ${r.quantity} ${r.unit}, ${r.orders} đơn, tiền hàng ${formatMoney(r.revenue)}`}
                  className="group relative rounded-xl px-1 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40"
                >
                  <p className="truncate text-sm font-semibold text-ink">
                    <span className="mr-1 text-muted">{i + 1}.</span>
                    {nameOf(r)}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {/* Thanh: dài nhất bằng phần còn lại sau chỗ ghi giá trị; đầu thanh bo 4px, gốc thẳng. */}
                    <span
                      aria-hidden="true"
                      className={`block h-4 shrink-0 rounded-r-[4px] transition-colors ${shown ? 'bg-chart-1-hover' : 'bg-chart-1'}`}
                      style={{ width: `max(4px, calc((100% - 7.5rem) * ${ratio}))` }}
                    />
                    <span aria-hidden="true" className="whitespace-nowrap text-sm font-semibold text-ink">
                      {value(r)}
                    </span>
                  </div>
                  {shown && (
                    <div role="tooltip" className="pointer-events-none absolute top-0 right-1 z-10 -translate-y-full rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lg">
                      <span className="block text-sm font-bold">{value(r)}</span>
                      <span className="block text-stone-300">{nameOf(r)}</span>
                      <span className="block text-stone-300">
                        {r.orders} đơn · {metric === 'quantity' ? `tiền hàng ${formatMoney(r.revenue)}` : `${r.quantity} ${r.unit}`}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        <p className="text-xs text-muted">
          Tính các đơn khách đã đặt (đã thanh toán hoặc trả khi nhận hàng), không tính đơn huỷ hay trả hàng. Tiền hàng = giá bán × số lượng.
          {metric === 'quantity' && mixedUnits && ' Các sản phẩm có đơn vị tính khác nhau; xếp theo tiền hàng để so sánh sát hơn.'}
          {data.unsold > 0 && ` ${data.unsold} sản phẩm đang bán chưa có đơn trong khoảng này.`}
        </p>

        {data.rows.length > 0 && (
          <details className="text-sm">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-forest-800">Xem dạng bảng</summary>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[22rem] text-left">
                <thead className="text-xs text-muted">
                  <tr>
                    <th scope="col" className="py-1.5 pr-2 font-semibold">
                      Hạng
                    </th>
                    <th scope="col" className="py-1.5 pr-2 font-semibold">
                      Sản phẩm
                    </th>
                    <th scope="col" className="py-1.5 pr-2 text-right font-semibold">
                      Số lượng
                    </th>
                    <th scope="col" className="py-1.5 pr-2 text-right font-semibold">
                      Số đơn
                    </th>
                    <th scope="col" className="py-1.5 text-right font-semibold">
                      Tiền hàng
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {data.rows.map((r, i) => (
                    <tr key={r.productId} className="border-t border-stone-100">
                      <td className="py-1.5 pr-2">{i + 1}</td>
                      <td className="py-1.5 pr-2">{nameOf(r)}</td>
                      <td className="py-1.5 pr-2 text-right whitespace-nowrap">
                        {r.quantity.toLocaleString('vi-VN')} {r.unit}
                      </td>
                      <td className="py-1.5 pr-2 text-right">{r.orders}</td>
                      <td className="py-1.5 text-right whitespace-nowrap">{formatMoney(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </figure>
    </div>
  );
}
