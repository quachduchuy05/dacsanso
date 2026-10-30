import { useState } from 'react';
import { Wheat } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { PAGE_X } from '../../app/layout';
import { BrocadeBand, SectionHeading } from '../../components/Brand';
import { EmptyState } from '../../components/EmptyState';
import { LandscapeArt } from '../../components/LandscapeArt';
import { PreorderProgress } from '../../components/PreorderProgress';
import { ProductImage } from '../../components/ProductImage';
import { QuantityStepper } from '../../components/QuantityStepper';
import { deliveryWindow, isOrderableIn } from '../../store/commands/cart';
import { computeDeposit, formatMoney } from '../../domain/pricing';
import { isSamplePrice, remainingFor } from '../../domain/state';
import { useStore } from '../../store/AppDataContext';
import { VariantPicker } from '../../components/VariantPicker';
import { groupFamilies } from '../../domain/variants';
import { CoopNameButton } from './CoopNameButton';
import { SeasonWatchButton } from './SeasonWatchButton';

/** Tab Vụ mùa: danh sách hàng đặt trước (chuyển từ bản index.html cũ). */
export function SeasonTab() {
  const { state, now } = useStore();
  const { openModal } = useUi();
  // Số suất muốn đặt của từng sản phẩm (mặc định 1).
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // Quy cách đang chọn của từng sản phẩm có nhiều quy cách (theo mã nhóm).
  const [selected, setSelected] = useState<Record<string, string>>({});
  const params = state.params;
  const families = groupFamilies(state.products.filter((p) => p.kind === 'preorder' && p.status === 'active'));

  return (
    <div className={`space-y-8 pt-4 pb-8 md:pt-6 ${PAGE_X}`}>
      <section className="relative overflow-hidden rounded-[32px] bg-forest-950 text-white shadow-[0_24px_60px_rgb(14,37,27,0.28)]">
        <div aria-hidden="true" className="lattice absolute inset-0" />
        <LandscapeArt className="absolute inset-0 h-full w-full" />
        <div className="relative space-y-3 px-6 pt-8 pb-28 md:max-w-xl md:px-10 md:pt-12 md:pb-36">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-champagne-300">
            <Wheat size={16} aria-hidden /> Đặt trước theo mùa
          </p>
          <h2 className="text-gold font-display text-[2rem] font-semibold leading-[1.1] text-balance md:text-5xl">Giữ suất trước mùa thu hoạch</h2>
          <p className="max-w-md text-sm leading-relaxed text-forest-100 md:text-base">
            Cọc {params.depositPercent}% khi đặt; phần còn lại trả khi hàng sẵn sàng hoặc khi nhận hàng. Đơn đặt trước không có giao hoả tốc.
          </p>
        </div>
        <BrocadeBand className="absolute inset-x-0 bottom-0" />
      </section>

      <SectionHeading eyebrow="Vụ mùa" title="Đang nhận đặt trước" action={<span className="pb-1 text-xs text-muted">{families.length} sản phẩm</span>} />

      {families.length === 0 ? (
        <EmptyState>Hiện chưa có sản phẩm nào mở đặt trước.</EmptyState>
      ) : (
        <div className="space-y-4 md:grid md:grid-cols-2 md:gap-5 md:space-y-0 lg:grid-cols-3 2xl:grid-cols-4">
          {families.map((family) => {
            const key = family[0].variantOf ?? family[0].id;
            const p = family.find((v) => v.id === selected[key]) ?? family.find((v) => isOrderableIn(state, v) && remainingFor(state, v) > 0) ?? family[0];
            const coop = state.coops.find((c) => c.id === p.coopId);
            const remaining = remainingFor(state, p);
            const win = deliveryWindow(p, now(), params);
            const blocked = !isOrderableIn(state, p) ? 'Chưa mở đặt trước' : remaining <= 0 ? 'Hết suất' : !win ? 'Đã hết thời gian nhận đặt trước' : null;
            const quantity = Math.min(quantities[p.id] ?? 1, Math.max(1, remaining));
            return (
              <article key={key} className="overflow-hidden rounded-[28px] bg-white p-2 shadow-[0_1px_2px_rgb(0,0,0,0.04),0_14px_34px_rgb(31,77,58,0.08)] ring-1 ring-champagne-200/80">
                <button
                  type="button"
                  onClick={() => openModal({ type: 'product_detail', productId: p.id })}
                  aria-label={`Xem ${p.name}`}
                  className="relative block aspect-[16/9] w-full overflow-hidden rounded-tl-[50%_40%] rounded-tr-[50%_40%] rounded-b-[20px] ring-1 ring-champagne-300/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
                >
                  <ProductImage product={p} variant="card" className="h-full w-full" />
                  <span aria-hidden="true" className="pointer-events-none absolute inset-1.5 rounded-tl-[50%_40%] rounded-tr-[50%_40%] rounded-b-[16px] border border-white/70" />
                </button>
                <div className="space-y-3 px-2.5 pt-3 pb-2.5">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-champagne-700">{p.region}</span>
                    <h3 className="font-display text-xl font-semibold leading-snug text-ink">{p.name}</h3>
                    {coop && <CoopNameButton coopId={coop.id} name={coop.name} />}
                    <p className="mt-1 text-sm">
                      <span className="font-display text-lg font-semibold tabular-nums text-forest-900">
                        {formatMoney(p.price)}/{p.unit}
                      </span>{' '}
                      {isSamplePrice(p) && <span className="text-xs font-semibold text-champagne-800">(giá mẫu) </span>}
                      <span className="text-xs text-champagne-800">
                        · cọc từ {formatMoney(computeDeposit(p.price, 0, params.depositPercent, params.depositRoundingStep))}
                      </span>
                    </p>
                  </div>
                  {family.length > 1 && <VariantPicker variants={family} selected={p.id} onSelect={(id) => setSelected((m) => ({ ...m, [key]: id }))} />}
                  <PreorderProgress product={p} />
                  {!blocked && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm">
                        <span className="block font-semibold text-stone-700">Số lượng ({p.unit})</span>
                        <span className="block text-xs text-muted">
                          Còn {remaining} suất · <span className="font-semibold tabular-nums text-ink">{formatMoney(p.price * quantity)}</span>
                        </span>
                      </span>
                      <QuantityStepper value={quantity} max={remaining} onChange={(q) => setQuantities((m) => ({ ...m, [p.id]: q }))} itemName={p.name} />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openModal({ type: 'trace_lot', productId: p.id })}
                      className="min-h-11 rounded-2xl border border-champagne-300 bg-white text-sm font-bold text-forest-900 hover:border-champagne-500 hover:bg-champagne-50"
                    >
                      Nguồn gốc
                    </button>
                    <button
                      disabled={!!blocked}
                      onClick={() =>
                        win &&
                        openModal({ type: 'checkout', source: { type: 'buy_now', line: { productId: p.id, quantity, deliveryDate: win.min, seenPrice: p.price } } })
                      }
                      className="min-h-11 rounded-2xl bg-forest-800 bg-linear-to-b from-forest-700 to-forest-900 text-sm font-bold text-white shadow-[inset_0_1px_0_rgb(255,255,255,0.14)] hover:from-forest-600 hover:to-forest-800 disabled:bg-stone-300 disabled:bg-none disabled:text-stone-600 disabled:shadow-none"
                    >
                      {blocked ?? 'Đặt trước'}
                    </button>
                  </div>
                  {blocked && <SeasonWatchButton product={p} />}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
