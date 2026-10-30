import { BottomSheet } from '../../components/BottomSheet';
import { EmptyState } from '../../components/EmptyState';
import { voucherWallet } from '../../store/commands/marketplace';
import { useStore } from '../../store/AppDataContext';
import { useMarketplace } from './useMarketplace';
import { VoucherTicket } from './VoucherTicket';

/**
 * Kho voucher (chủ repo yêu cầu kiểu sàn TMĐT, 18/10/2026): mã khách đã lưu kèm tình trạng, và mã đang phát hành để lưu.
 * Mã đã lưu hiện lên đầu ở bước đặt hàng. Quy tắc mã giữ nguyên (BR-KM): mỗi lần đặt tối đa PAR-28 mã, chỉ giảm tiền hàng.
 */
export function VoucherWalletSheet({ onClose }: { onClose: () => void }) {
  const { state, now } = useStore();
  const { customerId, save, unsave } = useMarketplace();
  const { saved, claimable } = voucherWallet(state, customerId, now());
  const perCheckout = state.params.vouchersPerCheckout;

  return (
    <BottomSheet title="Kho voucher" onClose={onClose} wide>
      <div className="space-y-5">
        <p className="rounded-2xl border border-champagne-200 bg-champagne-50 p-3 text-sm text-champagne-950">
          Lưu mã để chọn nhanh khi đặt hàng. Mỗi lần đặt dùng tối đa {perCheckout} mã. Mã chỉ giảm tiền hàng của sản phẩm hợp lệ, không giảm phí giao, phụ phí hoả tốc hay phí hộp quà.
        </p>
        <section aria-labelledby="ma-da-luu" className="space-y-2">
          <h3 id="ma-da-luu" className="font-display text-lg font-semibold text-ink">
            Mã đã lưu ({saved.length})
          </h3>
          {saved.length === 0 ? (
            <EmptyState>Chưa lưu mã nào. Bấm "Lưu" ở mã bên dưới hoặc ở trang Khám phá.</EmptyState>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {saved.map((e) => (
                <li key={e.voucher.id}>
                  <VoucherTicket
                    voucher={e.voucher}
                    status={e.status}
                    action={
                      <button
                        onClick={() => unsave(e.voucher.id)}
                        aria-label={`Bỏ lưu mã ${e.voucher.code}`}
                        className="min-h-11 rounded-full px-3 text-sm font-semibold text-stone-600 hover:bg-stone-100"
                      >
                        Bỏ lưu
                      </button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="ma-co-the-luu" className="space-y-2">
          <h3 id="ma-co-the-luu" className="font-display text-lg font-semibold text-ink">
            Mã có thể lưu ({claimable.length})
          </h3>
          {claimable.length === 0 ? (
            <EmptyState>Không còn mã nào để lưu.</EmptyState>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {claimable.map((e) => (
                <li key={e.voucher.id}>
                  <VoucherTicket
                    voucher={e.voucher}
                    status={e.status}
                    action={
                      <button
                        onClick={() => save(e.voucher.id)}
                        aria-label={`Lưu mã ${e.voucher.code}`}
                        className="min-h-11 rounded-full bg-forest-900 px-5 text-sm font-bold text-champagne-100 hover:bg-forest-800"
                      >
                        Lưu
                      </button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </BottomSheet>
  );
}
