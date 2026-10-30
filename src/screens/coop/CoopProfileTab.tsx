import { useState } from 'react';
import { useUi } from '../../app/UiContext';
import { Field, Input, PrimaryButton, Textarea } from '../../components/form';
import { ADDRESS_MAX_LENGTH, CONTACT_PHONE_RULE, COOP_PHONE_COUNT, coopAddressOf, coopPhonesOf, coopSetAddress, coopSetPhones, formatContactPhone, isSampleAddress } from '../../store/commands/coopContact';
import { coopSubmitProfile } from '../../store/commands/coopProfile';
import { useStore } from '../../store/AppDataContext';

const STATUS = { approved: 'Đã duyệt', pending: 'Chờ duyệt', rejected: 'Bị từ chối' } as const;

/** Hồ sơ HTX: sửa và gửi duyệt, theo dõi kết quả (FR-TK-06/07); 2 SĐT và địa chỉ để Admin liên hệ HTX (lưu ngay, không công khai cho khách). */
export function CoopProfileTab() {
  const { state, run } = useStore();
  const { coopActor, showToast } = useUi();
  const coop = state.coops.find((c) => c.id === coopActor.id);
  const [form, setForm] = useState({
    name: coop?.pendingProfile?.name ?? coop?.name ?? '',
    region: coop?.pendingProfile?.region ?? coop?.region ?? '',
    representative: coop?.pendingProfile?.representative ?? coop?.representative ?? '',
    description: coop?.pendingProfile?.description ?? coop?.description ?? '',
  });
  // Luôn đủ 2 ô, kể cả HTX chưa có số nào.
  const phoneInputs = (saved: string[]) => Array.from({ length: COOP_PHONE_COUNT }, (_, i) => (saved[i] ? formatContactPhone(saved[i]) : ''));
  const [phones, setPhones] = useState<string[]>(() => phoneInputs(coop ? coopPhonesOf(coop) : []));
  const [phoneError, setPhoneError] = useState<string | null>(null);
  // Địa chỉ mẫu của HTX mẫu không điền sẵn vào ô: HTX nhập địa chỉ thật.
  const [address, setAddress] = useState(() => {
    const saved = coop ? coopAddressOf(coop) : '';
    return isSampleAddress(saved) ? '' : saved;
  });
  if (!coop) return null;
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const setPhone = (i: number, v: string) => {
    setPhoneError(null);
    setPhones((p) => p.map((x, j) => (j === i ? v : x)));
  };
  const savedAddress = coopAddressOf(coop);
  const saveContact = async () => {
    const r = await run((s, at) => {
      const withPhones = coopSetPhones(s, coopActor, phones, at);
      // HTX mẫu chưa nhập địa chỉ thật thì giữ địa chỉ mẫu, vẫn lưu được SĐT.
      if (!withPhones.ok || (!address.trim() && isSampleAddress(savedAddress))) return withPhones;
      return coopSetAddress(withPhones.value, coopActor, address, at);
    });
    if (!r.ok) {
      setPhoneError(r.error);
      return;
    }
    const saved = r.value.coops.find((c) => c.id === coop.id)!;
    setPhones(phoneInputs(coopPhonesOf(saved)));
    setAddress(isSampleAddress(coopAddressOf(saved)) ? '' : coopAddressOf(saved));
    showToast('Đã lưu số điện thoại và địa chỉ. Admin thấy thông tin mới trong Danh sách HTX.');
  };

  return (
    <div className="space-y-3 xl:grid xl:grid-cols-2 xl:items-start xl:gap-4 xl:space-y-0">
      <div className="space-y-3">
        <section className="space-y-1 rounded-2xl border border-stone-200 bg-white p-3 text-sm">
          <p>
            Tình trạng hồ sơ: <strong>{STATUS[coop.profileStatus]}</strong>
            {coop.profileStatus === 'rejected' && coop.profileRejectReason ? ` – ${coop.profileRejectReason}` : ''}
          </p>
          <p>
            Quyền bán: <strong>{coop.status === 'active' ? 'Đang được bán' : `Tạm khoá – ${coop.suspendReason ?? ''}`}</strong>
          </p>
          <p>Tài khoản nhận chi trả: {coop.payoutAccountMasked}</p>
        </section>
        <section aria-labelledby="sdt-htx" className="space-y-3 rounded-2xl border border-stone-200 bg-white p-3">
          <h4 id="sdt-htx" className="text-sm font-bold">
            Liên hệ của HTX: 2 số điện thoại và địa chỉ
          </h4>
          <p className="text-sm text-stone-600">Để Admin gọi, liên hệ HTX khi cần. Chỉ Admin xem được, không hiện cho khách. Lưu ngay, không cần chờ duyệt.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {phones.map((p, i) => (
              <Field key={i} label={`Số điện thoại ${i + 1}`}>
                <Input type="tel" inputMode="tel" autoComplete="tel" value={p} onChange={(e) => setPhone(i, e.target.value)} />
              </Field>
            ))}
          </div>
          <p className="text-xs text-muted">{CONTACT_PHONE_RULE}</p>
          <Field label="Địa chỉ cửa hàng / nơi sản xuất" hint={isSampleAddress(savedAddress) ? `Đang dùng địa chỉ mẫu: ${savedAddress}` : 'Số nhà / thôn, xã / phường, tỉnh.'}>
            <Textarea
              rows={2}
              maxLength={ADDRESS_MAX_LENGTH}
              autoComplete="street-address"
              value={address}
              onChange={(e) => {
                setPhoneError(null);
                setAddress(e.target.value);
              }}
              placeholder="Ví dụ: thôn …, xã …, tỉnh Lào Cai"
            />
          </Field>
          {phoneError && (
            <p role="alert" className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
              {phoneError}
            </p>
          )}
          <PrimaryButton className="w-full" onClick={saveContact}>
            Lưu số điện thoại và địa chỉ
          </PrimaryButton>
        </section>
      </div>
      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-3">
        <h4 className="text-sm font-bold">Hồ sơ HTX</h4>
        <Field label="Tên HTX">
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} disabled={coop.profileStatus === 'pending'} />
        </Field>
        <Field label="Vùng sản xuất">
          <Input value={form.region} onChange={(e) => set({ region: e.target.value })} disabled={coop.profileStatus === 'pending'} />
        </Field>
        <Field label="Người đại diện">
          <Input value={form.representative} onChange={(e) => set({ representative: e.target.value })} disabled={coop.profileStatus === 'pending'} />
        </Field>
        <Field label="Giới thiệu">
          <Textarea rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} disabled={coop.profileStatus === 'pending'} />
        </Field>
        <PrimaryButton
          className="w-full"
          disabled={coop.profileStatus === 'pending'}
          onClick={async () => {
            const r = await run((s, at) => coopSubmitProfile(s, coopActor, form, at));
            showToast(r.ok ? 'Đã gửi hồ sơ. Trạng thái: Chờ duyệt.' : r.error);
          }}
        >
          {coop.profileStatus === 'pending' ? 'Hồ sơ đang chờ duyệt' : 'Gửi duyệt hồ sơ'}
        </PrimaryButton>
        <p className="text-sm text-stone-600">Trong lúc chờ duyệt, khách vẫn thấy thông tin hồ sơ cũ.</p>
      </section>
    </div>
  );
}
