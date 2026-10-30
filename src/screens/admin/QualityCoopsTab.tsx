import { useState } from 'react';
import { useUi } from '../../app/UiContext';
import { AdminTable, Td } from '../../components/AdminTable';
import { EmptyState } from '../../components/EmptyState';
import { DangerButton, Input, PrimaryButton, SecondaryButton } from '../../components/form';
import { coopPhonesOf, formatContactPhone } from '../../store/commands/coopContact';
import { qualityDecideCoopProfile, qualitySetSellingRights } from '../../store/commands/coopProfile';
import type { Coop } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/** Admin – Chất lượng duyệt hồ sơ HTX (FR-TK-08/09) và kích hoạt / tạm khoá quyền bán (FR-TK-13). */
export function QualityCoopsTab() {
  const { state } = useStore();
  if (state.coops.length === 0) return <EmptyState>Chưa có HTX nào.</EmptyState>;
  return (
    <AdminTable columns={['HTX', 'Hồ sơ', 'Quyền bán', 'Thao tác']} minWidth={900}>
      {state.coops.map((c) => (
        <CoopRow key={c.id} coop={c} />
      ))}
    </AdminTable>
  );
}

const PROFILE_LABEL: Record<Coop['profileStatus'], string> = { approved: 'Đã duyệt', pending: 'Chờ duyệt', rejected: 'Bị từ chối' };

function CoopRow({ coop: c }: { coop: Coop }) {
  const { run } = useStore();
  const { adminActor, showToast } = useUi();
  const [reason, setReason] = useState('');
  const act = async (op: Parameters<typeof run>[0], ok: string) => {
    const r = await run(op);
    showToast(r.ok ? ok : r.error);
    if (r.ok) setReason('');
  };
  return (
    <tr>
      <Td className="min-w-48">
        <strong className="block">{c.name}</strong>
        <span className="text-stone-600">
          Vùng {c.region}
          {c.representative ? ` · Đại diện: ${c.representative}` : ''}
        </span>
        <span className="block tabular-nums text-stone-600">SĐT: {coopPhonesOf(c).map(formatContactPhone).join(' · ') || 'chưa cập nhật'}</span>
      </Td>
      <Td className="min-w-48">
        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-bold">{PROFILE_LABEL[c.profileStatus]}</span>
        {c.profileStatus === 'pending' && c.pendingProfile && (
          <div className="mt-1 rounded-xl bg-champagne-50 p-2">
            <p className="font-semibold">Hồ sơ gửi duyệt:</p>
            <p>
              {c.pendingProfile.name} · {c.pendingProfile.region} · Đại diện: {c.pendingProfile.representative}
            </p>
            {c.pendingProfile.description && <p className="text-stone-700">{c.pendingProfile.description}</p>}
          </div>
        )}
      </Td>
      <Td>
        <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${c.status === 'active' ? 'bg-forest-100 text-forest-800' : 'bg-rose-100 text-rose-900'}`}>
          {c.status === 'active' ? 'Đang được bán' : 'Tạm khoá bán'}
        </span>
        {c.suspendReason && <p className="mt-1 text-stone-600">Lý do khoá: {c.suspendReason}</p>}
      </Td>
      <Td>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-56 flex-1">
            <Input aria-label={`Lý do cho ${c.name}`} placeholder="Lý do (bắt buộc khi từ chối hoặc khoá bán)" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {c.profileStatus === 'pending' && (
            <>
              <DangerButton onClick={() => act((s, t) => qualityDecideCoopProfile(s, adminActor, c.id, false, reason, t), 'Đã từ chối hồ sơ.')}>Từ chối hồ sơ</DangerButton>
              <PrimaryButton onClick={() => act((s, t) => qualityDecideCoopProfile(s, adminActor, c.id, true, '', t), 'Đã duyệt hồ sơ.')}>Duyệt hồ sơ</PrimaryButton>
            </>
          )}
          {c.status === 'active' ? (
            <DangerButton onClick={() => act((s, t) => qualitySetSellingRights(s, adminActor, c.id, false, reason, t), 'Đã tạm khoá quyền bán.')}>Tạm khoá bán</DangerButton>
          ) : (
            <SecondaryButton onClick={() => act((s, t) => qualitySetSellingRights(s, adminActor, c.id, true, reason, t), 'Đã kích hoạt quyền bán.')}>Kích hoạt bán</SecondaryButton>
          )}
        </div>
      </Td>
    </tr>
  );
}
