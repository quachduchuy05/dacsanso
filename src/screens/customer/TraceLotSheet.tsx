import {LotTools} from '../../components/LotTools';
import { BottomSheet } from '../../components/BottomSheet';
import { ProductImage } from '../../components/ProductImage';
import { latestHarvest } from '../../store/commands/harvest';
import { findProduct, formatDateKey } from '../../domain/state';
import { CATEGORY_LABEL, ORDER_KIND_LABEL } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/**
 * Thông tin nguồn gốc của đúng sản phẩm được chọn (L10).
 * Chỉ hiện dữ liệu có trong hồ sơ sản phẩm; không dựng nhật ký thu hái, toạ độ hay lời xác nhận của cơ quan nhà nước.
 */
export function TraceLotSheet({ productId, lotId, onClose }: { productId: string;lotId?:string; onClose: () => void }) {
  const { state,now } = useStore();
  const product = findProduct(state, productId);
  if (!product) return null;
  const coop = state.coops.find((c) => c.id === product.coopId);
  const harvest = latestHarvest(state, product.id);
  const rows: [string, string | undefined][] = [
    ['Sản phẩm', product.name],
    ['Đơn vị bán', coop?.name],
    ['Vùng sản xuất', `${product.region}, Lào Cai`],
    ['Nhóm hàng', CATEGORY_LABEL[product.category]],
    ['Loại đơn', ORDER_KIND_LABEL[product.kind]],
    ['Quy cách', product.unit],
    ['Tháng thu hoạch',product.harvestMonths?.length?product.harvestMonths.join(', '):undefined],
    // Chỉ hiện chứng nhận Admin – Chất lượng đã xem hồ sơ (FR-SP-08); không có mã chứng nhận mẫu (mục 9.3).
    ['Chứng nhận', product.certifications?.filter((c) => c.verified&&c.validUntil>=now().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})).map((c) => `${c.label} · ${c.issuer}${c.number?` · Số ${c.number}`:''}${c.issuedOn?` · Cấp ${formatDateKey(c.issuedOn)}`:''} · Hết hạn ${formatDateKey(c.validUntil)}`).join('; ') || undefined],
    ['Ghi chú hồ sơ', product.sample?.dossierNote],
    [
      'Khoảng ngày giao',
      product.preorder
        ? `${formatDateKey(product.preorder.deliveryFrom)} – ${formatDateKey(product.preorder.deliveryTo)}${product.sample?.deliveryWindowIsSample ? ' (mẫu, chờ HTX xác nhận)' : ''}`
        : undefined,
    ],
    ['Thu hoạch gần nhất', harvest ? `${formatDateKey(harvest.harvestedOn)} (HTX xác nhận)` : undefined],
  ];
  return (
    <BottomSheet title="Thông tin nguồn gốc" onClose={onClose}><LotTools productId={productId} lotId={lotId}/>
      {product.traceUrl&&/^https?:\/\//i.test(product.traceUrl)&&<a className="block min-h-11 rounded border p-3 underline" href={product.traceUrl} target="_blank" rel="noopener noreferrer">Mở trang truy xuất do HTX cung cấp</a>}
      <div className="flex gap-3">
        <ProductImage product={product} className="h-20 w-20 shrink-0 rounded-2xl" />
        <div className="min-w-0">
          <h3 className="text-base font-bold text-ink">{product.name}</h3>
          <p className="text-sm text-muted">{coop?.name}</p>
        </div>
      </div>
      <dl className="divide-y divide-stone-100 rounded-2xl border border-stone-200 text-sm">
        {rows
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-3 py-2.5">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-semibold text-ink">{value}</dd>
            </div>
          ))}
      </dl>
      <p className="text-sm leading-relaxed text-stone-600">{product.description}</p>
      <p className="rounded-2xl border border-champagne-200 bg-champagne-50 p-3 text-sm leading-relaxed text-champagne-950">
        Thông tin lô (mã lô, ngày thu hoạch, ngày đóng gói) do HTX khai khi tạo lô hàng.
        {harvest && ' Ngày thu hoạch gần nhất do HTX tự khai khi xác nhận thu hoạch xong, sàn không kiểm chứng.'}
        {product.sample && ' Dữ liệu trên là dữ liệu mẫu, chờ HTX xác nhận.'}
      </p>
    </BottomSheet>
  );
}
