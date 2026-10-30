import { useId, useState } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { PrimaryButton, SecondaryButton, Textarea } from '../../components/form';
import { CALL_NOTE_MAX_LENGTH, chatClosedReason, contactForCoop, logCoopCall, needsReadyContact } from '../../store/commands/orderContact';
import { formatPhone } from '../../domain/phone';
import { CALL_OUTCOME_LABEL, type CallOutcome, type Order } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/**
 * Liên hệ khách (HTX): gọi điện bằng điện thoại của HTX (mở ứng dụng gọi của máy) rồi ghi lại kết quả cuộc gọi,
 * hoặc nhắn tin trong đơn. Hàng đặt trước vừa vào mùa (HTX đã báo sẵn sàng) mà chưa liên hệ thì thẻ nhắc HTX hẹn lịch giao.
 */
export function CoopContactCard({ order, onMessage, onTemplate }: { order: Order; onMessage: () => void; onTemplate: () => void }) {
  const { state, run } = useStore();
  const { coopActor, showToast } = useUi();
  const titleId = useId();
  const [logging, setLogging] = useState(false);
  const [outcome, setOutcome] = useState<CallOutcome>('scheduled');
  const [note, setNote] = useState('');
  if (chatClosedReason(order)) return null;
  const contact = contactForCoop(state, order);
  const needs = needsReadyContact(state, order);

  const save = async () => {
    const r = await run((s, at) => logCoopCall(s, order.id, coopActor, outcome, note, at));
    showToast(r.ok ? 'Đã ghi lại cuộc gọi. Khách thấy trong phần trao đổi của đơn.' : r.error);
    if (r.ok) {
      setLogging(false);
      setNote('');
      setOutcome('scheduled');
    }
  };

  return (
    <section aria-labelledby={titleId} className={`space-y-3 rounded-3xl border p-4 ${needs ? 'border-champagne-500 bg-champagne-50' : 'border-champagne-200 bg-white'}`}>
      <h4 id={titleId} className="font-display text-lg font-semibold text-ink">
        Liên hệ khách
      </h4>
      {needs && (
        <p role="note" className="rounded-2xl bg-forest-900 px-3 py-2 text-sm font-semibold text-champagne-100">
          Hàng đã vào mùa. Hãy gọi điện hoặc nhắn tin cho khách để hẹn lịch giao.
        </p>
      )}
      <div className="text-sm text-stone-700">
        <p>
          <span className="font-semibold text-ink">{contact.name}</span>
          {contact.phone && <span className="tabular-nums"> · {formatPhone(contact.phone)}</span>}
        </p>
        {contact.note && <p className="text-xs text-muted">{contact.note}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {contact.phone ? (
          <a
            href={`tel:${contact.phone.replace(/\D/g, '')}`}
            onClick={() => setLogging(true)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-forest-800 bg-linear-to-b from-forest-700 to-forest-900 px-4 text-sm font-bold text-white shadow-[inset_0_1px_0_rgb(255,255,255,0.14)] hover:from-forest-600 hover:to-forest-800"
          >
            <Phone size={16} aria-hidden="true" /> Gọi điện
          </a>
        ) : (
          <p className="flex min-h-11 items-center justify-center rounded-2xl bg-stone-100 px-3 text-center text-xs text-muted">Không có SĐT để gọi</p>
        )}
        <SecondaryButton type="button" className="flex items-center justify-center gap-2" onClick={onMessage}>
          <MessageCircle size={16} aria-hidden="true" /> Nhắn tin
        </SecondaryButton>
      </div>
      {needs && (
        <button type="button" onClick={onTemplate} className="min-h-11 w-full rounded-2xl border border-dashed border-champagne-500 px-3 text-sm font-semibold text-forest-900 hover:bg-white">
          Dùng tin nhắn mẫu hẹn lịch giao
        </button>
      )}
      <p className="text-xs text-muted">"Gọi điện" mở ứng dụng gọi trên máy của HTX. Gọi xong, ghi lại kết quả để khách cũng thấy trong đơn.</p>
      {!logging ? (
        <button type="button" onClick={() => setLogging(true)} className="min-h-11 text-sm font-semibold text-forest-800 underline-offset-2 hover:underline">
          Ghi lại kết quả cuộc gọi
        </button>
      ) : (
        <div className="space-y-2 rounded-2xl border border-champagne-200 bg-white p-3">
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-semibold text-stone-700">Kết quả cuộc gọi</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CALL_OUTCOME_LABEL) as CallOutcome[]).map((k) => (
                <label
                  key={k}
                  className={`flex min-h-11 cursor-pointer items-center rounded-full border px-3 text-sm ${outcome === k ? 'border-forest-700 bg-forest-900 font-semibold text-champagne-100' : 'border-champagne-300 bg-white text-stone-700'}`}
                >
                  <input type="radio" name={`ket-qua-${order.id}`} className="sr-only" checked={outcome === k} onChange={() => setOutcome(k)} />
                  {CALL_OUTCOME_LABEL[k]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-stone-700">Ghi chú (không bắt buộc)</span>
            <Textarea rows={2} maxLength={CALL_NOTE_MAX_LENGTH} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: giao sáng thứ Bảy, gọi trước 30 phút" />
          </label>
          <div className="flex gap-2">
            <SecondaryButton type="button" onClick={() => setLogging(false)}>
              Huỷ
            </SecondaryButton>
            <PrimaryButton type="button" className="flex-1" onClick={save}>
              Lưu cuộc gọi
            </PrimaryButton>
          </div>
        </div>
      )}
    </section>
  );
}
