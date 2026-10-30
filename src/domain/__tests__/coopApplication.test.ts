import { describe, expect, it } from 'vitest';
import { requestOtp } from '../auth';
import {
  applicationSteps,
  lookupCoopApplications,
  qualityAcceptApplication,
  qualityDecideApplication,
  qualityRequestInfo,
  qualitySetCheck,
  resubmitCoopApplication,
  submitCoopApplication,
  APPLICATION_CHECKS,
  type ApplicationInput,
} from '../coopApplication';
import { coopDirectory } from '../coopDirectory';
import { deriveNotifications } from '../notifications';
import type { DemoState, Result } from '../types';
import { ADMIN_OPS, ADMIN_QA, makeState, T0 } from './fixtures';

const must = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

const INPUT: ApplicationInput = {
  taxCode:'0123456789',
  coopName: 'HTX mẫu Mới',
  region: 'Bát Xát',
  address: 'Thôn mẫu, xã mẫu, tỉnh Lào Cai',
  representative: 'Người đại diện mẫu',
  loginPhone: '0900000501',
  phones: ['0900000511', '0900000512'],
  payoutAccount: '0000 1234 5678',
  description: '',
  products: 'Chè, gạo',
  documents: ['data:image/jpeg;base64,AA'],
};

function submitted(): { s: DemoState; id: string } {
  const r = must(submitCoopApplication(makeState(), INPUT, '123456', T0));
  return { s: r.state, id: r.application.id };
}

const keys = (s: DemoState, id: string) => applicationSteps(s.coopApplications!.find((a) => a.id === id)!).map((x) => `${x.key}:${x.state}`);

describe('Quy trình phê duyệt HTX mới', () => {
  it('bắt buộc MST và ngăn dùng MST đã đăng ký',()=>{
    expect(submitCoopApplication(makeState(),{...INPUT,taxCode:''},'123456',T0).ok).toBe(false);
    const state=makeState();state.coops[0].taxCode=INPUT.taxCode;
    expect(submitCoopApplication(state,INPUT,'123456',T0).ok).toBe(false);
  });
  it('nộp hồ sơ: kiểm tra đủ thông tin, OTP, SĐT chưa có tài khoản; chỉ lưu tài khoản chi trả dạng che', () => {
    const s = makeState();
    expect(submitCoopApplication(s, INPUT, '000000', T0)).toEqual({ ok: false, error: 'Mã OTP không đúng.' });
    expect(submitCoopApplication(s, { ...INPUT, documents: [] }, '123456', T0)).toMatchObject({ ok: false, error: 'Vui lòng thêm ảnh giấy chứng nhận đăng ký HTX.' });
    expect(submitCoopApplication(s, { ...INPUT, loginPhone: '0900000101' }, '123456', T0)).toMatchObject({ ok: false });
    expect(submitCoopApplication(s, { ...INPUT, phones: ['0900000511', '0900000511'] }, '123456', T0)).toMatchObject({ ok: false, error: 'Hai SĐT liên hệ phải khác nhau.' });
    expect(submitCoopApplication(s, { ...INPUT, coopName: 'htx x' }, '123456', T0)).toMatchObject({ ok: false });
    expect(submitCoopApplication(s, { ...INPUT, address: 'ngắn' }, '123456', T0)).toMatchObject({ ok: false });
    const { s: s1, id } = submitted();
    const app = s1.coopApplications![0];
    expect(app).toMatchObject({ id, status: 'submitted', loginPhone: '0900000501', payoutAccountMasked: '**** 5678', phones: ['0900000511', '0900000512'] });
    expect(JSON.stringify(app)).not.toContain('000012345678');
    // Hồ sơ đang chờ thì không nộp trùng số.
    expect(submitCoopApplication(s1, INPUT, '123456', T0)).toMatchObject({ ok: false });
    expect(keys(s1, id)).toEqual(['submitted:done', 'accepted:current', 'review:upcoming', 'decided:upcoming', 'activated:upcoming']);
    // Chưa duyệt thì chưa đăng nhập được.
    expect(requestOtp(s1, '0900000501').ok).toBe(false);
  });

  it('T27: tiếp nhận → thẩm định đủ 4 mục → duyệt: tạo HTX (đang bán, hồ sơ đã duyệt) và tài khoản đăng nhập', () => {
    let { s, id } = submitted();
    expect(qualityAcceptApplication(s, ADMIN_OPS, id, T0)).toMatchObject({ ok: false });
    expect(qualitySetCheck(s, ADMIN_QA, id, 'documents', true, T0)).toMatchObject({ ok: false });
    s = must(qualityAcceptApplication(s, ADMIN_QA, id, T0));
    expect(keys(s, id)).toEqual(['submitted:done', 'accepted:done', 'review:current', 'decided:upcoming', 'activated:upcoming']);
    s = must(qualitySetCheck(s, ADMIN_QA, id, 'documents', true, T0));
    expect(qualityDecideApplication(s, ADMIN_QA, id, true, '', T0)).toEqual({ ok: false, error: 'Cần đạt đủ 4 mục thẩm định trước khi duyệt.' });
    for (const c of APPLICATION_CHECKS) s = must(qualitySetCheck(s, ADMIN_QA, id, c.key, true, T0));
    const before = s;
    s = must(qualityDecideApplication(s, ADMIN_QA, id, true, '', T0));
    const app = s.coopApplications![0];
    expect(app.status).toBe('approved');
    const coop = s.coops.find((c) => c.id === app.coopId)!;
    expect(coop).toMatchObject({
      name: 'HTX mẫu Mới',
      region: 'Bát Xát',
      status: 'active',
      profileStatus: 'approved',
      payoutAccountMasked: '**** 5678',
      phones: ['0900000511', '0900000512'],
      storeAddress: INPUT.address,
    });
    const user = must(requestOtp(s, '0900000501'));
    expect(user).toMatchObject({ role: 'coop', coopId: coop.id, id: app.userId });
    expect(keys(s, id)).toEqual(['submitted:done', 'accepted:done', 'review:done', 'decided:done', 'activated:done']);
    expect(s.auditLogs[0]).toMatchObject({ action: 'Duyệt hồ sơ HTX, cấp tài khoản', target: 'HTX mẫu Mới' });
    // HTX mới có trong Danh sách HTX của Admin, có thông báo chào mừng.
    expect(must(coopDirectory(s, ADMIN_OPS)).some((r) => r.coop.id === coop.id)).toBe(true);
    const added = deriveNotifications(before, s, T0).notifications.filter((n) => !before.notifications.includes(n));
    expect(added).toEqual([expect.objectContaining({ userId: user.id, title: 'Hồ sơ đăng ký HTX đã được duyệt' })]);
  });

  it('yêu cầu bổ sung → HTX tra cứu, sửa và nộp lại → về chờ tiếp nhận; từ chối phải có lý do', () => {
    let { s, id } = submitted();
    s = must(qualityAcceptApplication(s, ADMIN_QA, id, T0));
    expect(qualityRequestInfo(s, ADMIN_QA, id, ' ', T0)).toMatchObject({ ok: false });
    s = must(qualityRequestInfo(s, ADMIN_QA, id, 'Ảnh giấy tờ bị mờ', T0));
    expect(keys(s, id)).toEqual(['submitted:done', 'accepted:done', 'review:failed', 'decided:upcoming', 'activated:upcoming']);
    expect(lookupCoopApplications(s, '0900000501', '1')).toMatchObject({ ok: false });
    expect(must(lookupCoopApplications(s, '900 000 501', '123456'))[0]).toMatchObject({ id, status: 'needs_info', reviewNote: 'Ảnh giấy tờ bị mờ' });
    expect(resubmitCoopApplication(s, id, { ...INPUT, loginPhone: '0900000599' }, '123456', T0)).toMatchObject({ ok: false });
    s = must(resubmitCoopApplication(s, id, { ...INPUT, documents: ['data:image/jpeg;base64,BB'] }, '123456', T0));
    expect(s.coopApplications![0]).toMatchObject({ status: 'submitted', documents: ['data:image/jpeg;base64,BB'], checks: {} });
    s = must(qualityAcceptApplication(s, ADMIN_QA, id, T0));
    expect(qualityDecideApplication(s, ADMIN_QA, id, false, '', T0)).toEqual({ ok: false, error: 'Từ chối hồ sơ phải ghi lý do.' });
    s = must(qualityDecideApplication(s, ADMIN_QA, id, false, 'Không thuộc tỉnh Lào Cai', T0));
    expect(s.coopApplications![0].status).toBe('rejected');
    expect(keys(s, id)).toEqual(['submitted:done', 'accepted:done', 'review:done', 'decided:failed', 'activated:upcoming']);
    expect(s.coops).toHaveLength(2);
    // Bị từ chối thì nộp hồ sơ mới được.
    expect(submitCoopApplication(s, INPUT, '123456', T0).ok).toBe(true);
  });

  it('hồ sơ mới gửi thông báo cho Admin – Chất lượng', () => {
    const s0 = makeState();
    const s = must(submitCoopApplication(s0, INPUT, '123456', T0)).state;
    const added = deriveNotifications(s0, s, T0).notifications;
    expect(added).toEqual([expect.objectContaining({ userId: 'u-qa', title: expect.stringMatching(/^Hồ sơ đăng ký HTX mới HS-/) })]);
  });
});
