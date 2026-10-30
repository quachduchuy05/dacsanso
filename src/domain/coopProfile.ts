/**
 * Hồ sơ HTX và quyền bán (FR-TK-06..09, FR-TK-13).
 * - HTX sửa hồ sơ và gửi duyệt; trong lúc chờ duyệt vẫn hiện hồ sơ cũ.
 * - Admin – Chất lượng duyệt hoặc từ chối (bắt buộc lý do); kích hoạt hoặc tạm khoá quyền bán (bắt buộc lý do khi khoá).
 */
import { audit } from './state';
import { fail, ok, type Actor, type CoopProfile, type DemoState, type Result } from './types';

export function coopSubmitProfile(state: DemoState, actor: Actor, profile: CoopProfile, at: Date): Result<DemoState> {
  if (actor.kind !== 'coop' || !actor.id) return fail('Chỉ HTX gửi được hồ sơ của mình.');
  const coop = state.coops.find((c) => c.id === actor.id);
  if (!coop) return fail('Không tìm thấy HTX.');
  if (!profile.name.trim()) return fail('Vui lòng nhập tên HTX.');
  if (!profile.region.trim()) return fail('Vui lòng nhập vùng sản xuất.');
  if (!profile.representative.trim()) return fail('Vui lòng nhập người đại diện.');
  if (coop.profileStatus === 'pending') return fail('Hồ sơ đang chờ duyệt, chưa gửi lại được.');
  const pendingProfile: CoopProfile = {
    name: profile.name.trim(),
    region: profile.region.trim(),
    representative: profile.representative.trim(),
    description: profile.description.trim(),
  };
  const next = { ...state, coops: state.coops.map((c) => (c.id === coop.id ? { ...c, profileStatus: 'pending' as const, pendingProfile, profileRejectReason: undefined } : c)) };
  return ok(audit(next, actor, 'Gửi duyệt hồ sơ HTX', coop.name, at));
}

export function qualityDecideCoopProfile(state: DemoState, actor: Actor, coopId: string, approve: boolean, reason: string, at: Date): Result<DemoState> {
  if (actor.kind !== 'admin' || actor.adminGroup !== 'quality') return fail('Chỉ Admin – Chất lượng được duyệt hồ sơ HTX.');
  const coop = state.coops.find((c) => c.id === coopId);
  if (!coop || coop.profileStatus !== 'pending' || !coop.pendingProfile) return fail('HTX không có hồ sơ chờ duyệt.');
  if (!approve && !reason.trim()) return fail('Từ chối hồ sơ phải ghi lý do.');
  const p = coop.pendingProfile;
  const next = {
    ...state,
    coops: state.coops.map((c) =>
      c.id !== coopId
        ? c
        : approve
          ? { ...c, ...p, profileStatus: 'approved' as const, pendingProfile: undefined }
          : { ...c, profileStatus: 'rejected' as const, profileRejectReason: reason.trim() },
    ),
  };
  return ok(audit(next, actor, approve ? 'Duyệt hồ sơ HTX' : 'Từ chối hồ sơ HTX', coop.name, at, approve ? undefined : reason));
}

export function qualitySetSellingRights(state: DemoState, actor: Actor, coopId: string, active: boolean, reason: string, at: Date): Result<DemoState> {
  if (actor.kind !== 'admin' || actor.adminGroup !== 'quality') return fail('Chỉ Admin – Chất lượng được kích hoạt hoặc tạm khoá quyền bán.');
  const coop = state.coops.find((c) => c.id === coopId);
  if (!coop) return fail('Không tìm thấy HTX.');
  if(active&&state.users.some(u=>u.coopId===coopId&&u.accessClosedAt)&&!state.users.some(u=>u.coopId===coopId&&u.status==='active'&&!u.accessClosedAt))return fail('Đại diện HTX đã đóng quyền truy cập theo yêu cầu; cần giải quyết tài khoản đại diện trước khi mở lại bán hàng.');
  if (!active && !reason.trim()) return fail('Tạm khoá quyền bán phải ghi lý do.');
  const next = {
    ...state,
    coops: state.coops.map((c) => (c.id === coopId ? { ...c, status: active ? ('active' as const) : ('suspended' as const), suspendReason: active ? undefined : reason.trim() } : c)),
  };
  return ok(audit(next, actor, active ? 'Kích hoạt quyền bán' : 'Tạm khoá quyền bán', coop.name, at, reason.trim() || undefined));
}
