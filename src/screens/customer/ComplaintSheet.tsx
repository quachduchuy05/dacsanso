import { useState } from 'react';
import { useUi } from '../../app/UiContext';
import { BottomSheet } from '../../components/BottomSheet';
import { Field, PrimaryButton, Select, Textarea } from '../../components/form';
import { PhotoPicker } from '../../components/PhotoPicker';
import { isTicketOpen, returnDeadline, submitComplaint } from '../../store/commands/complaint';
import { COMPLAINT_REASON_LABEL, type ComplaintReason } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/**
 * Khiếu nại / yêu cầu trả hàng (FR-CSKH-01, FR-DH-04, L11).
 * Bắt buộc chọn đơn, sản phẩm, lý do, có ít nhất 1 ảnh và còn trong hạn RET-01.
 */
export function ComplaintSheet({ orderId, onClose }: { orderId?: string; onClose: () => void }) {
  const { state, run, now } = useStore();
  const { customerActor, showToast, openModal } = useUi();
  const at = now();
  const eligible = state.orders.filter((o) => {
    const d = returnDeadline(o);
    return o.customerId === customerActor.id && !state.tickets.some((t) => t.orderId === o.id && isTicketOpen(t));
  });
  const [selectedOrder, setSelectedOrder] = useState(orderId ?? '');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [reason, setReason] = useState<ComplaintReason | ''>('');
  const [resolution,setResolution]=useState<'check'|'refund'|'exchange'|'resupply'>('check');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [requestRefund, setRequestRefund] = useState(false);
  const order = state.orders.find((o) => o.id === selectedOrder);
  const deadline = order ? returnDeadline(order, productIds) : null;

  const submit = async () => {
    let ticketId = '';
    const r = await run(
      (s, t) => submitComplaint(s, customerActor, { orderId: selectedOrder, productIds, reason, description, photos, requestRefund, resolution }, t),
      (v) => {
        ticketId = v.ticket.id;
        return v.state;
      },
    );
    if (!r.ok) return showToast(r.error);
    showToast(`Đã gửi khiếu nại ${ticketId}. CSKH phản hồi tiếp nhận trong ${state.params.ticketAckHours} giờ làm việc.`);
    // Mở chi tiết đơn để thấy khiếu nại vừa gửi và các bước xử lý (khiếu nại hiện theo đơn).
    openModal({ type: 'order_detail', orderId: selectedOrder });
  };

  return (
    <BottomSheet
      title="Hỗ trợ / Khiếu nại đơn hàng"
      onClose={onClose}
      footer={
        <PrimaryButton className="w-full" onClick={submit}>
          Gửi khiếu nại
        </PrimaryButton>
      }
    >
      <Field label="Đơn hàng cần hỗ trợ">
        <Select
          value={selectedOrder}
          onChange={(e) => {
            setSelectedOrder(e.target.value);
            setProductIds([]);
          }}
        >
          <option value="">— Chọn đơn —</option>
          {eligible.map((o) => (
            <option key={o.id} value={o.id}>
              {o.id} · {o.items.map((i) => i.name).join(', ')}
            </option>
          ))}
        </Select>
      </Field>
      {eligible.length === 0 && <p className="text-sm text-stone-600">Không có đơn nào có thể tạo yêu cầu mới.</p>}

      {order && (
        <fieldset className="space-y-1">
          <legend className="text-sm font-semibold text-stone-700">Sản phẩm cần khiếu nại</legend>
          {order.items.map((i) => (
            <label key={i.productId} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={productIds.includes(i.productId)}
                onChange={(e) => setProductIds((p) => (e.target.checked ? [...p, i.productId] : p.filter((x) => x !== i.productId)))}
              />
              {i.name} ({i.unit}) × {i.quantity}
            </label>
          ))}
          {deadline && <p className="text-sm text-stone-600">Hạn gửi: {deadline.toLocaleString('vi-VN')} (RET-01, tính từ lúc Đã giao).</p>}
        </fieldset>
      )}

      <Field label="Lý do">
        <Select value={reason} onChange={(e) => setReason(e.target.value as ComplaintReason)}>
          <option value="">— Chọn lý do —</option>
          {(Object.keys(COMPLAINT_REASON_LABEL) as ComplaintReason[]).map((r) => (
            <option key={r} value={r}>
              {COMPLAINT_REASON_LABEL[r]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Phương án mong muốn"><Select value={resolution} onChange={e=>setResolution(e.target.value as typeof resolution)}><option value="check">Kiểm tra và hỗ trợ</option><option value="exchange">Đổi hàng</option><option value="resupply">Giao bù</option><option value="refund">Xem xét hoàn tiền</option></Select></Field>
      <Field label="Mô tả">
        <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả tình trạng sản phẩm khi nhận…" />
      </Field>
      <div className="space-y-1">
        <span className="text-sm font-semibold text-stone-700">Ảnh (bắt buộc ít nhất 1 ảnh)</span>
        <PhotoPicker photos={photos} onChange={setPhotos} />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-5 w-5" checked={requestRefund} onChange={(e) => setRequestRefund(e.target.checked)} />
        Yêu cầu trả hàng – hoàn tiền
      </label>
      <p className="text-sm text-stone-600">
        HTX xác nhận và đề xuất; Admin – CSKH quyết định. Số tiền hoàn bằng số bạn đã thực trả cho phần được duyệt. Mốc phản hồi: tiếp nhận trong {state.params.ticketAckHours} giờ, kết luận trong {state.params.ticketResolveHours} giờ làm việc (SLA-01).
      </p>
    </BottomSheet>
  );
}
