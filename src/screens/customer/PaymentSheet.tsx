import { Clock } from 'lucide-react';
import {useState} from 'react';
import {api} from '../../store/backend';
import { useUi } from '../../app/UiContext';
import { BottomSheet } from '../../components/BottomSheet';
import { SimBadge } from '../../components/EmptyState';
import { generateId } from '../../domain/ids';
import { applyGatewayResult, GATEWAY_OUTCOME_MESSAGE, secondsLeft, type GatewayResult } from '../../store/commands/payment';
import { formatMoney } from '../../domain/pricing';
import { findOrder } from '../../domain/state';
import { ORDER_KIND_LABEL, TRANSACTION_STATUS_LABEL } from '../../domain/types';
import { useNow, useStore } from '../../store/AppDataContext';
import {DemoPaymentQr} from '../../components/DemoPaymentQr';

/** Cổng thanh toán – MÔ PHỎNG (mục 5.4). Kết quả chỉ ghi nhận qua applyGatewayResult(). */
export function PaymentSheet({ txId, onClose }: { txId: string; onClose: () => void }) {
  const { state, run,demoMode } = useStore();
  const { showToast, openOrders } = useUi();
  const at = useNow(1000);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const tx = state.transactions.find((t) => t.id === txId);
  if (!tx) return null;

  const left = secondsLeft(tx, at);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const pending = tx.status === 'pending' && left > 0;
  const isRemaining = tx.kind === 'remaining';

  const send = async (result: GatewayResult) => {
    let message = '';
    const r = await run(
      (s, t) => applyGatewayResult(s, tx.id, result, generateId('GW'), t),
      (v) => {
        message =
          tx.kind === 'remaining' && v.outcome === 'paid'
            ? 'Đã trả phần còn lại. Đơn chuyển sang Đang chuẩn bị nếu HTX đã báo hàng sẵn sàng.'
            : tx.kind === 'remaining' && (v.outcome === 'failed' || v.outcome === 'cancelled')
              ? 'Trả phần còn lại chưa thành công. Bạn có thể thử lại trước hạn; hạn không được gia hạn.'
              : GATEWAY_OUTCOME_MESSAGE[v.outcome];
        return v.state;
      },
    );
    showToast(r.ok ? message : r.error);
    onClose();
    openOrders('all');
  };

  return (
    <BottomSheet
      title={
        <span className="flex flex-wrap items-center gap-2">
          Cổng thanh toán {demoMode&&<SimBadge />}
        </span>
      }
      onClose={onClose}
      closeLabel="Đóng cổng thanh toán (giao dịch vẫn giữ, không gia hạn)"
      footer={
        pending && !demoMode ? <div className="space-y-2"><button disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const session=await api<{checkoutUrl:string}>('/api/v1/transactions/'+tx.id+'/session',{});window.location.assign(session.checkoutUrl);}catch(e){setError(e instanceof Error?e.message:'Chưa mở được cổng thanh toán.');}finally{setBusy(false);}}} className="min-h-12 w-full rounded-2xl bg-forest-600 px-4 text-sm font-bold text-white disabled:opacity-50">{busy?'Đang kết nối…':'Tiếp tục đến cổng thanh toán'}</button>{error&&<p role="alert" className="text-sm text-rose-800">{error}</p>}<p className="text-sm text-stone-600">Kết quả được xác nhận từ cổng thanh toán. Quay lại ứng dụng không tự xác nhận đã trả tiền.</p></div> : pending ? (
          <div className="space-y-2">
            <button onClick={() => send('success')} className="min-h-12 w-full rounded-2xl bg-forest-600 text-sm font-bold text-white hover:bg-forest-500">
              Thanh toán thành công
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => send('failed')} className="min-h-12 rounded-2xl border border-rose-300 bg-rose-50 text-sm font-bold text-rose-800">
                Thanh toán thất bại
              </button>
              <button onClick={() => send('cancelled')} className="min-h-12 rounded-2xl border border-stone-300 bg-white text-sm font-bold text-stone-800">
                Huỷ
              </button>
            </div>
          </div>
        ) : (
          <button onClick={onClose} className="min-h-12 w-full rounded-2xl bg-stone-900 text-sm font-bold text-white">
            Đóng
          </button>
        )
      }
    >
      <p className="rounded-2xl border-2 border-dashed border-stone-900 bg-champagne-50 p-3 text-center text-sm font-bold text-ink">
        {demoMode?'Đây là cổng mô phỏng, không trừ tiền thật.':'Kiểm tra đúng số tiền và thông tin người nhận tại cổng thanh toán trước khi xác nhận.'}
      </p>

      <div className="text-center">
        <p className="text-sm text-stone-600">{isRemaining ? 'Số tiền phần còn lại' : 'Số tiền thanh toán'}</p>
        <p className="text-3xl font-extrabold tabular-nums text-ink">{formatMoney(tx.amount)}</p>
        {pending ? (
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-champagne-800" role="timer" aria-live="off">
            <Clock size={16} />
            {isRemaining ? 'Hạn trả phần còn lại' : 'Giữ hàng'} còn {left >= 3600 ? `${Math.floor(left / 3600)} giờ ` : ''}
            {mm}:{ss}
          </p>
        ) : (
          <p className="mt-1 text-sm font-semibold text-stone-700">Giao dịch: {TRANSACTION_STATUS_LABEL[tx.status]}</p>
        )}
      </div>

      {demoMode&&pending&&<DemoPaymentQr transaction={tx}/>}
      <section className="space-y-2">
        <h4 className="text-sm font-bold text-stone-700">Các đơn trong giao dịch</h4>
        {tx.orderIds.map((id) => {
          const o = findOrder(state, id);
          if (!o) return null;
          return (
            <div key={id} className="flex justify-between gap-2 rounded-xl border border-stone-200 p-2.5 text-sm">
              <span>
                <span className="block font-mono text-xs font-bold">{o.id}</span>
                {o.coopName} · {ORDER_KIND_LABEL[o.kind]}
                {o.kind === 'preorder' && !isRemaining ? ' (tiền cọc)' : ''}
              </span>
              <span className="font-bold tabular-nums">{formatMoney(tx.amounts[id] ?? 0)}</span>
            </div>
          );
        })}
      </section>
      <p className="text-sm text-stone-600">
        Đóng màn này giao dịch vẫn được giữ; mở lại từ "Đơn hàng". Thử lại hoặc mở lại không gia hạn thời gian. Sau khi hết giờ, các đơn thanh toán online tự huỷ và hàng được nhả.
      </p>
    </BottomSheet>
  );
}
