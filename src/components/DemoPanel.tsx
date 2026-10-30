import { useEffect, useMemo, useState } from 'react';
import { useUi } from '../app/UiContext';
import { canUseDemoTools, DEMO_TOOLS_ROLES, demoCodeIsSet, demoGatewaySuccess } from '../store/commands/demoAccess';
import { DAY_MS, HOUR_MS, MINUTE_MS } from '../domain/state';
import { generateId } from '../domain/ids';
import { GATEWAY_OUTCOME_MESSAGE } from '../store/commands/payment';
import { formatMoney } from '../domain/pricing';
import { TRANSACTION_STATUS_LABEL } from '../domain/types';
import { useNow, useStore } from '../store/AppDataContext';
import { fetchMapsConfigured, GOOGLE_CLIENT_ID } from '../store/serviceStatus';
import { BottomSheet } from './BottomSheet';
import { DangerButton, Select, SecondaryButton } from './form';

/**
 * Bảng điều khiển demo (mục 5.4). Chỉ để trình diễn, không phải chức năng của sản phẩm.
 * Giai đoạn 7: các nút thay đổi dữ liệu của mọi máy (tua giờ, kết quả cổng, khôi phục dữ liệu) chỉ Quản trị gốc và
 * Admin – Vận hành dùng được (kiểm trong domain/demoAccess.ts); ai cũng xem được giờ demo và tình trạng cấu hình.
 */
export function DemoPanel({ onClose }: { onClose: () => void }) {
  const { state, run, advanceClock, resetClock, resetDemoData, sync, syncNow } = useStore();
  const shared = sync.mode === 'shared';
  const { actor, showToast, closeModal } = useUi();
  const allowed = canUseDemoTools(actor);
  const at = useNow(1000);
  const ended = state.transactions.filter((t) => t.kind === 'checkout' && ['failed', 'expired', 'cancelled'].includes(t.status));
  const paid = state.transactions.filter((t) => t.status === 'paid');
  const [lateTx, setLateTx] = useState('');
  const [dupTx, setDupTx] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const gateway = async (txId: string) => {
    if (!txId) return showToast('Chọn giao dịch trước.');
    let msg = '';
    const r = await run(
      (s, t) => demoGatewaySuccess(s, actor, txId, generateId('GW'), t),
      (v) => {
        msg = GATEWAY_OUTCOME_MESSAGE[v.outcome];
        return v.state;
      },
    );
    showToast(r.ok ? msg : r.error);
  };

  const shift = async (ms: number, label: string) => {
    const r = await advanceClock(actor, ms);
    showToast(r.ok ? `Đã tua thời gian ${label}. Các tác vụ theo giờ đã chạy.` : r.error);
  };

  const label = (t: (typeof state.transactions)[number]) => `${t.id} · ${formatMoney(t.amount)} · ${TRANSACTION_STATUS_LABEL[t.status]}`;

  return (
    <BottomSheet title="Công cụ demo" onClose={onClose}>
      <p className="rounded-xl border-2 border-dashed border-stone-400 bg-stone-50 p-2.5 text-sm text-stone-700">
        Công cụ demo dùng để trình diễn các tình huống theo thời gian và thanh toán. Không thuộc chức năng của sản phẩm.
      </p>
      {!allowed && (
        <p role="note" className="rounded-xl border border-champagne-300 bg-champagne-50 p-2.5 text-sm text-ink">
          Chỉ {DEMO_TOOLS_ROLES} dùng được các nút tua thời gian, gửi kết quả cổng thanh toán và khôi phục dữ liệu mẫu, vì chúng thay đổi dữ liệu của mọi máy đang xem demo. Người trình diễn có thể mở
          thêm một tab, đăng nhập Admin – Vận hành ở tab đó để điều khiển; mỗi tab giữ phiên đăng nhập riêng.
        </p>
      )}

      <section className="space-y-2">
        <h4 className="text-sm font-bold">Tua thời gian</h4>
        <p className="text-sm text-stone-700">
          Giờ demo: <strong>{at.toLocaleString('vi-VN')}</strong>
          {state.clockOffsetMs !== 0 && ` (lệch ${Math.round(state.clockOffsetMs / HOUR_MS)} giờ so với giờ thật)`}
        </p>
        {allowed && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <SecondaryButton onClick={() => shift(15 * MINUTE_MS, '+15 phút')}>+15 phút</SecondaryButton>
              <SecondaryButton onClick={() => shift(24 * HOUR_MS, '+24 giờ')}>+24 giờ</SecondaryButton>
              <SecondaryButton onClick={() => shift(3 * DAY_MS, '+3 ngày')}>+3 ngày</SecondaryButton>
            </div>
            {state.clockOffsetMs !== 0 && (
              <SecondaryButton
                className="w-full"
                onClick={async () => {
                  const r = await resetClock(actor);
                  showToast(r.ok ? 'Đồng hồ demo về giờ thật.' : r.error);
                }}
              >
                Đưa đồng hồ về giờ thật
              </SecondaryButton>
            )}
          </>
        )}
      </section>

      {allowed && (
        <>
          <section className="space-y-2">
            <h4 className="text-sm font-bold">Gửi "tiền về muộn"</h4>
            <p className="text-sm text-stone-600">Cổng báo thành công cho giao dịch đã thất bại / hết hạn / huỷ. Đơn giữ Đã huỷ và tự tạo yêu cầu hoàn.</p>
            <Select value={lateTx} onChange={(e) => setLateTx(e.target.value)} aria-label="Giao dịch đã kết thúc">
              <option value="">— {ended.length ? 'Chọn giao dịch' : 'Chưa có giao dịch thất bại / hết hạn'} —</option>
              {ended.map((t) => (
                <option key={t.id} value={t.id}>
                  {label(t)}
                </option>
              ))}
            </Select>
            <SecondaryButton className="w-full" disabled={!lateTx} onClick={() => gateway(lateTx)}>
              Gửi tiền về muộn
            </SecondaryButton>
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-bold">Gửi kết quả cổng lần hai</h4>
            <p className="text-sm text-stone-600">Cổng báo thành công lần nữa (mã tham chiếu khác) cho giao dịch đã thanh toán. Chỉ lần đầu được tính, lần sau tự tạo yêu cầu hoàn 100% (BR-TT-06).</p>
            <Select value={dupTx} onChange={(e) => setDupTx(e.target.value)} aria-label="Giao dịch đã thanh toán">
              <option value="">— {paid.length ? 'Chọn giao dịch' : 'Chưa có giao dịch đã thanh toán'} —</option>
              {paid.map((t) => (
                <option key={t.id} value={t.id}>
                  {label(t)}
                </option>
              ))}
            </Select>
            <SecondaryButton className="w-full" disabled={!dupTx} onClick={() => gateway(dupTx)}>
              Gửi kết quả lần hai
            </SecondaryButton>
          </section>
        </>
      )}

      <ServiceStatus />

      <section className="space-y-2">
        <h4 className="text-sm font-bold">Dữ liệu</h4>
        <div className="space-y-2 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
          <p className="font-semibold text-ink">
            {sync.mode === 'checking'
              ? 'Đang kiểm tra API dữ liệu chung…'
              : sync.mode === 'local'
                ? 'Lưu trên trình duyệt này'
                : sync.phase === 'offline'
                  ? 'Dữ liệu dùng chung – đang mất kết nối'
                  : sync.phase === 'error'
                    ? 'Dữ liệu dùng chung – không lưu được'
                    : sync.phase === 'saving'
                      ? 'Dữ liệu dùng chung – đang lưu…'
                      : 'Dữ liệu dùng chung – đã đồng bộ'}
          </p>
          {sync.mode === 'local' && <p>{sync.reason} Các tab cùng trình duyệt vẫn thấy chung dữ liệu.</p>}
          <DataSize />
          {shared && (
            <>
              <p>Mọi máy mở link demo thấy chung đơn, giỏ, khiếu nại… qua API /api/state. Máy khác thay đổi thì màn hình cập nhật trong khoảng 10 giây.</p>
              {sync.message && <p className="font-semibold text-rose-800">{sync.message}</p>}
              {sync.lastSyncAt && <p className="text-muted">Lần đồng bộ gần nhất: {new Date(sync.lastSyncAt).toLocaleTimeString('vi-VN')}</p>}
              <SecondaryButton
                className="w-full"
                onClick={() => {
                  syncNow();
                  showToast('Đang đồng bộ với API…');
                }}
              >
                Đồng bộ ngay
              </SecondaryButton>
            </>
          )}
        </div>
        {/* Xác nhận ngay trong trang: hộp confirm() của trình duyệt bị chặn khi app chạy trong khung nhúng. */}
        {allowed &&
          (confirmReset ? (
            <div role="alert" className="space-y-2 rounded-2xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
              <p>
                {shared
                  ? 'Khôi phục dữ liệu mẫu cho mọi máy đang dùng demo? Mọi đơn, giỏ hàng và thay đổi trên dữ liệu dùng chung sẽ bị xoá.'
                  : 'Khôi phục dữ liệu mẫu? Mọi đơn, giỏ hàng và thay đổi trên trình duyệt này sẽ bị xoá.'}{' '}
                Mã trình diễn được giữ nguyên.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <SecondaryButton onClick={() => setConfirmReset(false)}>Huỷ</SecondaryButton>
                <DangerButton
                  onClick={async () => {
                    const r = await resetDemoData(actor);
                    if (!r.ok) return showToast(r.error);
                    closeModal();
                    showToast('Đã khôi phục dữ liệu mẫu.');
                  }}
                >
                  Xoá và khôi phục
                </DangerButton>
              </div>
            </div>
          ) : (
            <SecondaryButton className="w-full" onClick={() => setConfirmReset(true)}>
              Khôi phục dữ liệu mẫu
            </SecondaryButton>
          ))}
      </section>
    </BottomSheet>
  );
}

/** Tình trạng cấu hình (chỉ đọc): bản đang chạy dùng dịch vụ thật hay mô phỏng. Cấu hình do chủ repo đặt ở Vercel. */
function ServiceStatus() {
  const { state, sync } = useStore();
  // undefined: đang hỏi; null: không hỏi được (vd. chạy không có máy chủ API).
  const [maps, setMaps] = useState<boolean | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void fetchMapsConfigured().then((v) => alive && setMaps(v));
    return () => {
      alive = false;
    };
  }, []);
  const rows: { name: string; value: string }[] = [
    {
      name: 'Dữ liệu dùng chung',
      value: sync.mode === 'shared' ? 'Đã nối – mọi máy thấy chung dữ liệu' : sync.mode === 'local' ? 'Chưa nối – đang lưu trên trình duyệt này' : 'Đang kiểm tra…',
    },
    { name: 'Đăng nhập Google', value: GOOGLE_CLIENT_ID ? 'Thật – đã có Client ID' : 'Mô phỏng – chưa có VITE_GOOGLE_CLIENT_ID' },
    {
      name: 'Google Maps (lấy địa chỉ GPS)',
      value:
        maps === undefined
          ? 'Đang kiểm tra…'
          : maps === null
            ? 'Không kiểm tra được – bản này chạy không có máy chủ API'
            : maps
              ? 'Đã có khoá – nút lấy địa chỉ GPS dùng được'
              : 'Chưa có khoá GOOGLE_MAPS_API_KEY – nút GPS báo chưa dùng được',
    },
    { name: 'Mã trình diễn (NEW-01)', value: demoCodeIsSet(state) ? 'Đã đặt – danh sách tài khoản demo đang ẩn' : 'Chưa đặt – danh sách tài khoản demo hiện cho mọi người' },
  ];
  return (
    <section className="space-y-2" aria-labelledby="tinh-trang-cau-hinh">
      <h4 id="tinh-trang-cau-hinh" className="text-sm font-bold">
        Tình trạng cấu hình
      </h4>
      <dl className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white text-sm">
        {rows.map((r) => (
          <div key={r.name} className="grid gap-0.5 px-3 py-2 sm:grid-cols-[minmax(0,12rem)_1fr] sm:gap-3">
            <dt className="font-semibold text-ink">{r.name}</dt>
            <dd className="text-stone-700">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted">Chỉ đọc. Dịch vụ thật do chủ repo cấu hình trên Vercel (xem docs/FIX_REPORT.md).</p>
    </section>
  );
}

/**
 * Dung lượng dữ liệu demo (sửa lỗi bản web 18/10/2026): dữ liệu dùng chung đầy thì không lưu được lên máy chủ.
 * Máy chủ nén trước khi lưu (giới hạn 900 KB sau khi nén); ảnh hầu như không nén được nên chiếm phần lớn.
 */
function DataSize() {
  const { state } = useStore();
  const { kb, photos } = useMemo(() => {
    const json = JSON.stringify(state);
    return { kb: Math.round(json.length / 1000), photos: (json.match(/data:image\//g) ?? []).length };
  }, [state]);
  return (
    <p className="text-muted">
      Dữ liệu demo: khoảng {kb.toLocaleString('vi-VN')} KB, {photos} ảnh. Máy chủ nén trước khi lưu, tối đa 900 KB sau khi nén; ảnh chiếm nhiều chỗ nhất.
    </p>
  );
}
