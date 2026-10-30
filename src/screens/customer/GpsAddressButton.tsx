import { useState } from 'react';
import { ExternalLink, LocateFixed } from 'lucide-react';
import { SecondaryButton } from '../../components/form';
import { inHanoiBounds, matchWard, roundCoord } from '../../domain/geo';
import { normalizeVi } from '../../domain/text';
import type { Ward } from '../../domain/types';

export interface GpsFill {
  street: string;
  wardId?: string;
}

interface Found {
  formattedAddress: string;
  accuracy: number;
  lat: number;
  lng: number;
  wardName?: string;
  unmatchedArea?: string;
}

const GEO_ERRORS: Record<number, string> = {
  1: 'Bạn chưa cho phép trang này dùng vị trí. Bật quyền vị trí cho trang trong cài đặt trình duyệt rồi thử lại.',
  2: 'Không xác định được vị trí. Hãy bật GPS / định vị trên máy rồi thử lại.',
  3: 'Lấy vị trí quá lâu. Vui lòng thử lại ở nơi thoáng hoặc nhập tay.',
};

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }));
}

/**
 * Thêm địa chỉ theo GPS (chủ repo yêu cầu): lấy vị trí của máy, nhờ Google Maps (qua /api/geocode, khoá nằm ở server)
 * đổi ra địa chỉ, rồi điền sẵn số nhà / đường và chọn phường nếu khớp danh sách giao hàng. Khách kiểm tra, sửa rồi lưu.
 * Không lưu toạ độ.
 */
export function GpsAddressButton({ wards, onFill }: { wards: Ward[]; onFill: (fill: GpsFill) => void }) {
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locate = async () => {
    setError(null);
    setFound(null);
    if (!('geolocation' in navigator) || !window.isSecureContext) {
      setError('Trình duyệt này không cho lấy vị trí (cần mở trang bằng https). Vui lòng nhập tay.');
      return;
    }
    setBusy(true);
    try {
      let pos: GeolocationPosition;
      try {
        pos = await currentPosition();
      } catch (e) {
        setError(GEO_ERRORS[(e as GeolocationPositionError).code] ?? 'Không lấy được vị trí. Vui lòng nhập tay.');
        return;
      }
      const lat = roundCoord(pos.coords.latitude);
      const lng = roundCoord(pos.coords.longitude);
      if (!inHanoiBounds(lat, lng)) {
        setError('Vị trí hiện tại không nằm trong Hà Nội. App chỉ giao trong Hà Nội.');
        return;
      }
      let res: Response;
      try {
        res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`, { headers: { Accept: 'application/json' } });
      } catch {
        setError('Không kết nối được máy chủ tra địa chỉ. Vui lòng nhập tay.');
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string; formattedAddress?: string; street?: string; areas?: string[]; city?: string } | null;
      if (!res.ok || !body || typeof body.formattedAddress !== 'string') {
        setError(body?.error ?? (res.status === 404 ? 'Bản đang mở chưa có chức năng tra địa chỉ. Vui lòng nhập tay.' : `Không tra được địa chỉ (lỗi ${res.status}). Vui lòng nhập tay.`));
        return;
      }
      if (body.city && !normalizeVi(body.city).includes('ha noi')) {
        setError('Vị trí hiện tại không nằm trong Hà Nội. App chỉ giao trong Hà Nội.');
        return;
      }
      const ward = matchWard(wards, body.areas ?? [], body.formattedAddress);
      // Không có số nhà / đường thì điền phần đầu của địa chỉ đầy đủ (bỏ thành phố, quốc gia).
      const street = body.street || body.formattedAddress.split(',').slice(0, 2).join(',').trim();
      onFill({ street, wardId: ward?.id });
      setFound({
        formattedAddress: body.formattedAddress,
        accuracy: Math.round(pos.coords.accuracy),
        lat,
        lng,
        wardName: ward?.name,
        unmatchedArea: ward ? undefined : body.areas?.[0],
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-champagne-200 bg-champagne-50/60 p-3">
      <SecondaryButton type="button" onClick={locate} disabled={busy} className="flex w-full items-center justify-center gap-2">
        <LocateFixed size={16} aria-hidden="true" />
        {busy ? 'Đang lấy vị trí…' : 'Dùng vị trí hiện tại (GPS)'}
      </SecondaryButton>
      <p className="text-xs text-muted">Toạ độ được gửi tới Google Maps qua máy chủ của app để tìm địa chỉ; app không lưu toạ độ.</p>
      {found && (
        <div role="status" className="space-y-1 rounded-xl bg-white p-2.5 text-sm text-stone-700">
          <p>
            <strong className="text-ink">Theo Google Maps:</strong> {found.formattedAddress}
          </p>
          <p className="text-xs text-muted">
            Sai số khoảng ±{found.accuracy} m.{' '}
            {found.accuracy > 200 && <span className="font-semibold text-champagne-800">Vị trí chưa chính xác, hãy kiểm tra kỹ. </span>}
            {found.wardName ? `Đã chọn ${found.wardName}.` : found.unmatchedArea ? `"${found.unmatchedArea}" chưa có trong danh sách giao hàng mẫu, vui lòng chọn phường.` : 'Vui lòng chọn phường.'}
          </p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${found.lat},${found.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-forest-800 underline-offset-2 hover:underline"
          >
            Xem trên Google Maps <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
