import {TicketActions} from '../../components/TicketActions';
import { AppImage } from '../../components/AppImage';
import { useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { AdminTable, Td } from '../../components/AdminTable';
import { EmptyState } from '../../components/EmptyState';
import { DangerButton, Input, PrimaryButton, SecondaryButton } from '../../components/form';
import { TicketProgress, TicketStatusBadge } from '../../components/TicketProgress';
import { cskhRequestCoopReply, cskhUpdateTicket, eventKind, eventLabel, isTicketOpen, nextTicketAction, returnRefundAmount } from '../../store/commands/complaint';
import { formatMoney } from '../../domain/pricing';
import { findOrder } from '../../domain/state';
import { COMPLAINT_REASON_LABEL, type Ticket, type TicketStatus } from '../../domain/types';
import { useNow, useStore } from '../../store/AppDataContext';

type Filter = 'todo' | 'open' | 'processing' | 'concluded' | 'closed' | 'all';

const FILTERS: { key: Filter; label: string; match: (t: Ticket) => boolean }[] = [
  { key: 'todo', label: 'Cần xử lý', match: (t) => t.status !== 'closed' },
  { key: 'open', label: 'Chờ tiếp nhận', match: (t) => t.status === 'open' },
  { key: 'processing', label: 'Đang xử lý', match: (t) => t.status === 'processing' },
  { key: 'concluded', label: 'Đã kết luận, chờ đóng', match: (t) => t.status === 'resolved' || t.status === 'rejected' },
  { key: 'closed', label: 'Đã đóng', match: (t) => t.status === 'closed' },
  { key: 'all', label: 'Tất cả', match: () => true },
];

/** Các bước của quy trình, hiện ở đầu màn để CSKH biết thứ tự xử lý. */
const PROCESS = ['Tiếp nhận', 'HTX kiểm tra, đề xuất', 'Kết luận', 'Hoàn tiền (Tài chính)', 'Đóng ticket'];

/**
 * Admin – CSKH xử lý ticket (FR-CSKH-07..09) và duyệt trả hàng – hoàn tiền (FR-DH-11) theo quy trình
 * (góp ý kiểm thử: "thiếu quy trình xử lý khiếu nại"): lọc theo bước, xem các bước của ticket, việc cần làm tiếp,
 * và chỉ hiện thao tác của bước hiện tại (tiếp nhận → đề nghị HTX phản hồi / kết luận → đóng).
 */
export function CskhTicketsTab() {
  const { state } = useStore();
  const at = useNow(30_000);
  const [filter, setFilter] = useState<Filter>('todo');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const late = (t: Ticket) => isTicketOpen(t) && at.getTime() > new Date(t.status === 'open' ? t.ackDueAt : t.resolveDueAt).getTime();
  const all = [...state.tickets].sort((a, b) => Number(late(b)) - Number(late(a)) || Number(b.priority === 'high') - Number(a.priority === 'high') || b.createdAt.localeCompare(a.createdAt));
  if (all.length === 0) return <EmptyState>Chưa có ticket nào.</EmptyState>;
  const current = FILTERS.find((f) => f.key === filter)!;
  const tickets = all.filter(current.match);
  const selected = tickets.find((t) => t.id === selectedId) ?? tickets[0];
  const overdue = all.filter(late).length;

  return (
    <div className="space-y-4">
      <section aria-labelledby="quy-trinh-khieu-nai" className="space-y-2 rounded-2xl border border-stone-200 bg-white p-3">
        <h3 id="quy-trinh-khieu-nai" className="text-sm font-bold text-ink">
          Quy trình xử lý khiếu nại
        </h3>
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm">
          {PROCESS.map((p, i) => (
            <li key={p} className="flex items-center gap-1.5">
              <span className="flex items-center gap-1.5 rounded-full bg-forest-50 px-2.5 py-1 font-semibold text-forest-900">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest-900 text-xs text-champagne-100">{i + 1}</span>
                {p}
              </span>
              {i < PROCESS.length - 1 && <ArrowRight size={14} aria-hidden="true" className="text-stone-400" />}
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted">
          Hạn SLA-01: tiếp nhận trong {state.params.ticketAckHours} giờ, kết luận trong {state.params.ticketResolveHours} giờ kể từ lúc khách gửi. HTX chỉ phản hồi, đề xuất; CSKH quyết định.
          {overdue > 0 && <strong className="text-rose-700"> Đang có {overdue} ticket quá hạn.</strong>}
        </p>
      </section>

      <div className="no-scrollbar flex gap-2 overflow-x-auto" role="group" aria-label="Lọc ticket theo bước">
        {FILTERS.map((f) => {
          const n = all.filter(f.match).length;
          return (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setSelectedId(null);
              }}
              aria-pressed={filter === f.key}
              className={`min-h-11 whitespace-nowrap rounded-xl px-3 text-sm ${filter === f.key ? 'bg-forest-800 font-bold text-white' : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}`}
            >
              {f.label} ({n})
            </button>
          );
        })}
      </div>

      {tickets.length === 0 || !selected ? (
        <EmptyState>Không có ticket ở mục "{current.label}".</EmptyState>
      ) : (
        <>
          <AdminTable columns={['Mã ticket', 'Đơn · HTX', 'Lý do', 'Ưu tiên', 'Trạng thái', 'Hạn của bước hiện tại', '']} minWidth={900}>
            {tickets.map((t) => {
              const order = findOrder(state, t.orderId);
              const active = t.id === selected.id;
              const due = t.status === 'open' ? t.ackDueAt : t.status === 'processing' ? t.resolveDueAt : null;
              return (
                <tr key={t.id} className={active ? 'bg-forest-50' : ''}>
                  <Td className="font-mono font-bold">{t.id}</Td>
                  <Td>
                    <span className="font-mono">{t.orderId}</span>
                    <span className="block text-stone-600">{order?.coopName}</span>
                  </Td>
                  <Td>
                    {COMPLAINT_REASON_LABEL[t.reason]}
                    {t.requestRefund && <span className="block text-stone-600">Yêu cầu trả hàng – hoàn tiền</span>}
                  </Td>
                  <Td>{t.priority === 'high' ? <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">Cao</span> : 'Thường'}</Td>
                  <Td>
                    <TicketStatusBadge status={t.status} />
                  </Td>
                  <Td className={late(t) ? 'font-bold text-rose-700' : ''}>
                    {due ? `${t.status === 'open' ? 'Tiếp nhận' : 'Kết luận'} trước ${new Date(due).toLocaleString('vi-VN')}${late(t) ? ' – quá hạn' : ''}` : '—'}
                  </Td>
                  <Td>
                    <button
                      onClick={() => setSelectedId(t.id)}
                      aria-pressed={active}
                      aria-label={`Xem ticket ${t.id}`}
                      className={`min-h-11 rounded-xl px-3 font-semibold ${active ? 'bg-forest-800 text-white' : 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50'}`}
                    >
                      {active ? 'Đang xem' : 'Xem'}
                    </button>
                  </Td>
                </tr>
              );
            })}
          </AdminTable>
          <TicketDetail key={selected.id} ticket={selected} />
        </>
      )}
    </div>
  );
}

function TicketDetail({ ticket: t }: { ticket: Ticket }) {
  const { state, run } = useStore();
  const { adminActor, showToast } = useUi();
  const [note, setNote] = useState('');
  const order = findOrder(state, t.orderId);
  const coopReplied = t.history.some((e) => eventKind(e) === 'coop_reply');
  const update = async (status: TicketStatus, refund = false) => {
    const r = await run((s, time) => cskhUpdateTicket(s, t.id, adminActor, status, note, time, refund));
    showToast(r.ok ? 'Đã cập nhật ticket.' : r.error);
    if (r.ok) setNote('');
  };
  const requestCoop = async () => {
    const r = await run((s, time) => cskhRequestCoopReply(s, t.id, adminActor, note, time));
    showToast(r.ok ? 'Đã đề nghị HTX phản hồi. HTX nhận được thông báo.' : r.error);
    if (r.ok) setNote('');
  };

  return (
    <section aria-label={`Chi tiết ticket ${t.id}`} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-4 text-sm lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-base font-bold">{t.id}</span>
          <span className="flex gap-1">
            {t.priority === 'high' && <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">Ưu tiên Cao</span>}
            <TicketStatusBadge status={t.status} />
          </span>
        </div>
        <p>
          Đơn {t.orderId} · {order?.coopName} · {COMPLAINT_REASON_LABEL[t.reason]}
          {t.requestRefund ? ' · yêu cầu trả hàng – hoàn tiền' : ''}
        </p>
        {order && (
          <p className="text-stone-600">
            Sản phẩm:{' '}
            {order.items
              .filter((i) => t.productIds.includes(i.productId))
              .map((i) => `${i.name} (${i.unit}) × ${i.quantity}`)
              .join(', ')}
          </p>
        )}
        {t.description && <p className="rounded-lg bg-stone-50 p-2">"{t.description}"</p>}
        {t.photos.length > 0 && (
          <div className="flex gap-1">
            {t.photos.map((src, i) => (
              <AppImage key={i} src={src} alt={`Ảnh ${i + 1}`} className="h-16 w-16 rounded-lg object-cover" />
            ))}
          </div>
        )}
        {t.coopProposal && (
          <p className="rounded-lg bg-champagne-50 p-2">
            HTX đề xuất: <strong>{t.coopProposal === 'refund' ? 'hoàn tiền' : 'không hoàn tiền'}</strong> (CSKH quyết định)
          </p>
        )}

        <p className="flex items-start gap-2 rounded-xl border border-forest-200 bg-forest-50 p-2.5 text-forest-900">
          <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>
            <strong>Bước tiếp theo:</strong> {nextTicketAction(state, t)}
          </span>
        </p>

        {t.status !== 'closed' && (
          <div className="space-y-2">
            <Input
              aria-label="Kết luận / ghi chú"
              placeholder={t.status === 'processing' ? 'Kết luận gửi khách (bắt buộc khi Đã xử lý, Từ chối) hoặc nội dung đề nghị HTX' : 'Ghi chú (không bắt buộc)'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {t.status === 'open' && <PrimaryButton onClick={() => update('processing')}>Tiếp nhận</PrimaryButton>}
              {t.status === 'processing' && (
                <>
                  {!coopReplied && <SecondaryButton onClick={requestCoop}>Đề nghị HTX phản hồi</SecondaryButton>}
                  {t.requestRefund && order && <PrimaryButton onClick={() => update('resolved', true)}>Đã xử lý – duyệt hoàn {formatMoney(returnRefundAmount(order, t.productIds))}</PrimaryButton>}
                  <SecondaryButton onClick={() => update('resolved')}>Đã xử lý{t.requestRefund ? ' – không hoàn' : ''}</SecondaryButton>
                  <DangerButton onClick={() => update('rejected')}>Từ chối</DangerButton>
                </>
              )}
              {(t.status === 'resolved' || t.status === 'rejected') && <SecondaryButton onClick={() => update('closed')}>Đóng ticket</SecondaryButton>}
            </div>
          </div>
        )}

        <details className="space-y-1">
          <summary className="flex min-h-11 cursor-pointer items-center font-bold text-stone-700">Lịch sử ticket ({t.history.length})</summary>
          <ul className="space-y-0.5 text-stone-600">
            {t.history.map((h, i) => (
              <li key={i}>
                {new Date(h.at).toLocaleString('vi-VN')} · {h.actor.name ?? h.actor.kind}: {eventLabel(h)}
                {h.note ? ` – ${h.note}` : ''}
              </li>
            ))}
          </ul>
        </details>
      </div>
      <div className="space-y-2 rounded-2xl bg-stone-50 p-3">
        <h4 className="font-bold text-ink">Các bước của ticket</h4>
        <TicketProgress ticket={t} /><TicketActions ticket={t}/>
      </div>
    </section>
  );
}
