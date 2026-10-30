import { useUi } from '../../app/UiContext';
import { isFavorite, isFollowing, isVoucherSaved, saveVoucher, setFavorite, setFollow, unsaveVoucher } from '../../store/commands/marketplace';
import { isSeasonWatched, setSeasonWatch } from '../../store/commands/seasonWatch';
import type { Product } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/** Yêu thích, theo dõi HTX, lưu mã của khách đang đăng nhập; mỗi thao tác báo kết quả bằng thông báo nổi. */
export function useMarketplace() {
  const { state, run } = useStore();
  const { customerActor, showToast } = useUi();
  const customerId = customerActor.id ?? '';

  const toggleFav = async (productId: string) => {
    const product = state.products.find((p) => p.id === productId);
    const on = !(product && isFavorite(state, customerId, product));
    const r = await run((s) => setFavorite(s, customerActor, productId, on));
    showToast(r.ok ? (on ? 'Đã thêm vào Yêu thích.' : 'Đã bỏ khỏi Yêu thích.') : r.error);
  };

  const toggleFollowCoop = async (coopId: string) => {
    const name = state.coops.find((c) => c.id === coopId)?.name ?? 'HTX';
    const on = !isFollowing(state, customerId, coopId);
    const r = await run((s) => setFollow(s, customerActor, coopId, on));
    showToast(r.ok ? (on ? `Đã theo dõi ${name}. Bạn được báo khi HTX có sản phẩm mới.` : `Đã bỏ theo dõi ${name}.`) : r.error);
  };

  const toggleSeasonWatch = async (productId: string) => {
    const product = state.products.find((p) => p.id === productId);
    const on = !(product && isSeasonWatched(state, customerId, product));
    const r = await run((s, at) => setSeasonWatch(s, customerActor, productId, on, at));
    showToast(r.ok ? (on ? 'Đã bật "Báo tôi khi vào mùa". Bạn được báo khi HTX mở đợt đặt trước mới.' : 'Đã tắt báo khi vào mùa.') : r.error);
  };

  const save = async (voucherId: string) => {
    const code = state.vouchers.find((v) => v.id === voucherId)?.code ?? '';
    const r = await run((s, at) => saveVoucher(s, customerActor, voucherId, at));
    showToast(r.ok ? `Đã lưu mã ${code} vào Kho voucher.` : r.error);
  };

  const unsave = async (voucherId: string) => {
    const code = state.vouchers.find((v) => v.id === voucherId)?.code ?? '';
    const r = await run((s) => unsaveVoucher(s, customerActor, voucherId));
    showToast(r.ok ? `Đã bỏ mã ${code} khỏi Kho voucher.` : r.error);
  };

  return {
    customerId,
    isFav: (p: Pick<Product, 'id' | 'variantOf'>) => isFavorite(state, customerId, p),
    isFollowing: (coopId: string) => isFollowing(state, customerId, coopId),
    isSaved: (voucherId: string) => isVoucherSaved(state, customerId, voucherId),
    isSeasonWatched: (p: Pick<Product, 'id' | 'variantOf'>) => isSeasonWatched(state, customerId, p),
    toggleSeasonWatch,
    toggleFav,
    toggleFollowCoop,
    save,
    unsave,
  };
}
