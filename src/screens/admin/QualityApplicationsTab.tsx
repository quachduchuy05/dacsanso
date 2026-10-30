import { AppImage } from '../../components/AppImage';
import { useState } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import { useUi } from '../../app/UiContext';
import { AdminTable, Td } from '../../components/AdminTable';
import { ApplicationStatusBadge, ApplicationSteps } from '../../components/ApplicationSteps';
import { CoopCallLinks } from '../../components/CoopPhones';
import { EmptyState } from '../../components/EmptyState';
import { DangerButton, Input, PrimaryButton, SecondaryButton } from '../../components/form';
import {
  allChecksPassed,
  APPLICATION_CHECKS,
  qualityAcceptApplication,
  qualityDecideApplication,
  qualityRequestInfo,
  qualitySetCheck,
  type ApplicationStatus,
  type CoopApplication,
} from '../../store/commands/coopApplication';
import { formatPhone } from '../../domain/phone';
import { useStore } from '../../store/AppDataContext';

type Filter = 'todo' | ApplicationStatus | 'all';

const FILTERS: { key: Filter; label: string; match: (a: CoopApplication) => boolean }[] = [
  { key: 'todo', label: 'Cần xử lý', match: (a) => a.status === 'submitted' || a.status === 'reviewing' },
  { key: 'submitted', label: 'Chờ tiếp nhận', match: (a) => a.status === 'submitted' },
  { key: 'reviewing', label: 'Đang thẩm định', match: (a) => a.status === 'reviewing' },
  { key: 'needs_info', label: 'Chờ HTX bổ sung', match: (a) => a.status === 'needs_info' },
  { key: 'approved', label: 'Đã duyệt', match: (a) => a.status === 'approved' },
  { key: 'rejected', label: 'Từ chối', match: (a) => a.status === 'rejected' },
  { key: 'all', label: 'Tất cả', match: () => true },
];

const PROCESS = ['HTX nộp hồ sơ', 'Tiếp nhận', 'Thẩm định 4 mục', 'Duyệt / bổ sung / từ chối', 'Tạo HTX + tài khoản'];

/**
 * Admin – Chất lượng duyệt HTX mới (góp ý kiểm thử: "Thiếu quy trình phê duyệt HTX"), domain/coopApplication.ts.
 * Hồ sơ HTX nộp ở màn đăng nhập; tiếp nhận → thẩm định theo 4 mục → duyệt (tạo HTX và tài khoản) / yêu cầu bổ sung / từ chối.
 */
export function QualityApplicationsTab() {
  const { state } = useStore();
  const [filter, setFilter] = useState<Filter>('todo');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const all = [...(state.coopApplications ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const current = FILTERS.find((f) => f.key === filter)!;
  const list = all.filter(current.match);
  const selected = list.find((a) => a.id === selectedId) ?? list[0];

  return (
    <div className="space-y-4">
      <section aria-labelledby="quy-trinh-htx" className="space-y-2 rounded-2xl border border-stone-200 bg-white p-3">
        <h3 id="quy-trinh-htx" className="text-sm font-bold text-ink">
          Quy trình phê duyệt HTX
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
        <p className="text-xs text-muted">HTX nộp hồ sơ ở màn đăng nhập ("Đăng ký HTX") và tra cứu bằng SĐT người đại diện. Yêu cầu bổ sung thì HTX sửa và nộp lại, hồ sơ quay về bước tiếp nhận.</p>
      </section>

      <div className="no-scrollbar flex gap-2 overflow-x-auto" role="group" aria-label="Lọc hồ sơ theo bước">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setSelectedId(null);
            }}
            aria-pressed={filter === f.key}
            className={`min-h-11 whitespace-nowrap rounded-xl px-3 text-sm ${filter === f.key ? 'bg-forest-800 font-bold text-white' : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}`}
          >
            {f.label} ({all.filter(f.match).length})
          </button>
        ))}
      </div>

      {!selected ? (
        <EmptyState>{all.length === 0 ? 'Chưa có hồ sơ đăng ký HTX nào. HTX nộp hồ sơ ở màn đăng nhập.' : `Không có hồ sơ ở mục "${current.label}".`}</EmptyState>
      ) : (
        <>
          <AdminTable columns={['Mã hồ sơ', 'HTX · vùng', 'Người đại diện', 'Cập nhật', 'Trạng thái', '']} minWidth={820}>
            {list.map((a) => {
              const active = a.id === selected.id;
              return (
                <tr key={a.id} className={active ? 'bg-forest-50' : ''}>
                  <Td className="font-mono font-bold">{a.id}</Td>
                  <Td>
                    <strong className="block">{a.coopName}</strong>
                    <span className="text-stone-600">{a.region}</span>
                  </Td>
                  <Td>
                    {a.representative}
                    <span className="block tabular-nums text-stone-600">{formatPhone(a.loginPhone)}</span>
                  </Td>
                  <Td className="whitespace-nowrap">{new Date(a.updatedAt).toLocaleString('vi-VN')}</Td>
                  <Td>
                    <ApplicationStatusBadge status={a.status} />
                  </Td>
                  <Td>
                    <button
                      onClick={() => setSelectedId(a.id)}
                      aria-pressed={active}
                      aria-label={`Xem hồ sơ ${a.id}`}
                      className={`min-h-11 rounded-xl px-3 font-semibold ${active ? 'bg-forest-800 text-white' : 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50'}`}
                    >
                      {active ? 'Đang xem' : 'Xem'}
                    </button>
                  </Td>
                </tr>
              );
            })}
          </AdminTable>
          <ApplicationDetail key={selected.id} application={selected} />
        </>
      )}
    </div>
  );
}

function ApplicationDetail({ application: a }: { application: CoopApplication }) {
  const { run } = useStore();
  const { adminActor, showToast } = useUi();
  const [note, setNote] = useState('');
  const act = async (op: Parameters<typeof run>[0], success: string) => {
    const r = await run(op);
    showToast(r.ok ? success : r.error);
    if (r.ok) setNote('');
  };
  const reviewing = a.status === 'reviewing';
  const passed = allChecksPassed(a);

  return (
    <section aria-label={`Chi tiết hồ sơ ${a.id}`} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-4 text-sm lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-xl font-semibold text-ink">{a.coopName}</h3>
            <p className="text-stone-600">
              Hồ sơ <span className="font-mono">{a.id}</span> · vùng {a.region} · đại diện {a.representative} ({formatPhone(a.loginPhone)})
            </p>
          </div>
          <ApplicationStatusBadge status={a.status} />
        </div>
        <p className="flex items-start gap-2">
          <MapPin size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-forest-800" />
          {a.address}
        </p>
        <div className="space-y-1">
          <p className="font-semibold text-stone-700">SĐT liên hệ (gọi để xác minh)</p>
          <CoopCallLinks name={a.coopName} phones={a.phones} />
        </div>
        <p>Tài khoản nhận chi trả: {a.payoutAccountMasked}</p>
        <div>
          <p className="font-semibold text-stone-700">Sản phẩm dự kiến bán</p>
          <p className="whitespace-pre-line text-stone-700">{a.products}</p>
        </div>
        {a.description && (
          <div>
            <p className="font-semibold text-stone-700">Giới thiệu</p>
            <p className="whitespace-pre-line text-stone-700">{a.description}</p>
          </div>
        )}
        <div className="space-y-1">
          <p className="font-semibold text-stone-700">Ảnh giấy chứng nhận đăng ký HTX (mô phỏng)</p>
          <ul className="flex flex-wrap gap-2">
            {a.documents.map((src, i) => (
              <li key={i}>
                <AppImage src={src} alt={`Giấy tờ ${i + 1} của ${a.coopName}`} className="h-28 rounded-xl border border-stone-200 object-cover" />
              </li>
            ))}
          </ul>
        </div>

        <fieldset className="space-y-1.5 rounded-2xl border border-stone-200 p-3" disabled={!reviewing}>
          <legend className="px-1 font-bold text-ink">
            Thẩm định ({APPLICATION_CHECKS.filter((c) => a.checks[c.key]).length}/{APPLICATION_CHECKS.length})
          </legend>
          {!reviewing && a.status === 'submitted' && <p className="text-xs text-muted">Tiếp nhận hồ sơ để bắt đầu thẩm định.</p>}
          {APPLICATION_CHECKS.map((c) => (
            <label key={c.key} className="flex min-h-11 items-center gap-2.5">
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0"
                checked={!!a.checks[c.key]}
                onChange={(e) => act((s, t) => qualitySetCheck(s, adminActor, a.id, c.key, e.target.checked, t), e.target.checked ? 'Đã đánh dấu đạt.' : 'Đã bỏ đánh dấu.')}
              />
              {c.label}
            </label>
          ))}
        </fieldset>

        {(a.status === 'submitted' || reviewing) && (
          <div className="space-y-2">
            {reviewing && (
              <Input
                aria-label="Ghi chú cho HTX"
                placeholder="Ghi chú: nội dung cần bổ sung / lý do từ chối (bắt buộc), ghi chú khi duyệt (không bắt buộc)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
            <div className="flex flex-wrap gap-2">
              {a.status === 'submitted' && (
                <PrimaryButton onClick={() => act((s, t) => qualityAcceptApplication(s, adminActor, a.id, t), 'Đã tiếp nhận hồ sơ. Bắt đầu thẩm định.')}>Tiếp nhận hồ sơ</PrimaryButton>
              )}
              {reviewing && (
                <>
                  <PrimaryButton disabled={!passed} onClick={() => act((s, t) => qualityDecideApplication(s, adminActor, a.id, true, note, t), 'Đã duyệt. Đã tạo HTX và tài khoản đăng nhập.')}>
                    Duyệt, tạo tài khoản HTX
                  </PrimaryButton>
                  <SecondaryButton onClick={() => act((s, t) => qualityRequestInfo(s, adminActor, a.id, note, t), 'Đã yêu cầu HTX bổ sung hồ sơ.')}>Yêu cầu bổ sung</SecondaryButton>
                  <DangerButton onClick={() => act((s, t) => qualityDecideApplication(s, adminActor, a.id, false, note, t), 'Đã từ chối hồ sơ.')}>Từ chối</DangerButton>
                </>
              )}
            </div>
            {reviewing && !passed && <p className="text-xs text-muted">Duyệt được khi đạt đủ 4 mục thẩm định.</p>}
          </div>
        )}

        <details>
          <summary className="flex min-h-11 cursor-pointer items-center font-bold text-stone-700">Lịch sử hồ sơ ({a.history.length})</summary>
          <ul className="space-y-0.5 text-stone-600">
            {a.history.map((h, i) => (
              <li key={i}>
                {new Date(h.at).toLocaleString('vi-VN')} · {h.actor.name ?? h.actor.kind}: {h.action}
                {h.note ? ` – ${h.note}` : ''}
              </li>
            ))}
          </ul>
        </details>
      </div>
      <div className="space-y-2 rounded-2xl bg-stone-50 p-3">
        <h4 className="font-bold text-ink">Các bước của hồ sơ</h4>
        <ApplicationSteps application={a} />
      </div>
    </section>
  );
}
