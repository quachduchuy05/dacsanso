import { useStore } from '../store/AppDataContext';

/** Câu cố định của dải demo (Giai đoạn 5, mục 9.2). */
export const DEMO_BAND_TEXT = 'Bản demo – dữ liệu mẫu. Thanh toán, giao hàng và OTP là mô phỏng.';

/**
 * Dải "Bản demo" hiện trên mọi màn hình: nằm trong header cố định của app,
 * và lặp lại ở đầu lớp phủ của bottom sheet để không bị che khi mở sheet.
 * Khi dùng API dữ liệu chung, dải ghi thêm trạng thái để người xem demo biết dữ liệu đang dùng chung giữa các máy.
 */
export function DemoBand({ className = '' }: { className?: string }) {
  const { sync, demoMode } = useStore();
  const note =
    sync.mode !== 'shared'
      ? null
      : sync.phase === 'offline'
        ? 'Mất kết nối – thao tác chưa được xác nhận lưu.'
        : sync.phase === 'error'
          ? 'Chưa lưu được thao tác. Vui lòng kiểm tra thông báo lỗi.'
          : 'Dữ liệu dùng chung giữa các máy.';
  return (
    <p role="note" className={`bg-champagne-200 px-3 py-1 text-center text-xs font-semibold leading-snug text-champagne-950 ${className}`}>
      <span>{demoMode ? DEMO_BAND_TEXT : 'Dữ liệu được quản lý trên máy chủ.'}</span>
      {note && <span className="font-normal"> {note}</span>}
      <span className="font-normal"> · Bản {__APP_BUILD__}</span>
    </p>
  );
}
