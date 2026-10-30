import { useUi } from '../../app/UiContext';
import {OpsAccountsTab} from './OpsAccountsTab';
import { rootSetAdminGroup } from '../../store/commands/account';
import { loginIdentityLabel } from '../../domain/auth';
import { ACCOUNT_ROLE_LABEL, ADMIN_GROUP_LABEL, type AdminSubGroup } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/** Quản trị gốc: xem tài khoản và phân quyền nhóm Admin (FR-TK-11). Cấp và khoá tài khoản do Admin – Vận hành làm. */
export function AdminAccountsTab() {
  const { state, run } = useStore();
  const { adminActor, showToast } = useUi();
  return (
    <div className="space-y-2">
      <OpsAccountsTab createOnly/>
      <p className="text-sm text-stone-600">Root tạo tài khoản Admin và phân quyền. Vận hành cấp tài khoản HTX, QLNN, Shipper và xử lý khóa tài khoản.</p>
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-stone-50 text-xs text-muted">
            <tr>
              <th className="px-3 py-2">Tên</th>
              <th className="px-3 py-2">SĐT</th>
              <th className="px-3 py-2">Vai trò</th>
              <th className="px-3 py-2">Đơn vị / nhóm quyền</th>
              <th className="px-3 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {state.users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-stone-600">
                  Chưa có tài khoản nào.
                </td>
              </tr>
            )}
            {state.users.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2 font-mono">{loginIdentityLabel(u)}</td>
                <td className="px-3 py-2">{ACCOUNT_ROLE_LABEL[u.role]}</td>
                <td className="px-3 py-2">
                  {u.role === 'admin' && u.adminGroup && u.adminGroup !== 'root' && u.id !== adminActor.userId ? (
                    <select
                      aria-label={`Nhóm quyền của ${u.name}`}
                      value={u.adminGroup}
                      onChange={async (e) => {
                        const r = await run((s, at) => rootSetAdminGroup(s, adminActor, u.id, e.target.value as AdminSubGroup, at));
                        showToast(r.ok ? 'Đã đổi nhóm quyền.' : r.error);
                      }}
                      className="min-h-11 rounded-xl border border-stone-300 px-2"
                    >
                      {(['operations', 'quality', 'cskh', 'finance'] as AdminSubGroup[]).map((g) => (
                        <option key={g} value={g}>
                          {ADMIN_GROUP_LABEL[g]}
                        </option>
                      ))}
                    </select>
                  ) : u.coopId ? (
                    state.coops.find((c) => c.id === u.coopId)?.name
                  ) : u.adminGroup ? (
                    ADMIN_GROUP_LABEL[u.adminGroup]
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2">{u.status === 'active' ? 'Đang hoạt động' : 'Đang khoá'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
