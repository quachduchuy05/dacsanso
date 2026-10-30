import {CategoryManager} from '../../components/CategoryManager';
import {CatalogDictionaryManager} from './ContentManagementTab';
import { useState } from 'react';
import { useUi } from '../../app/UiContext';
import { AdminTable, Td } from '../../components/AdminTable';
import { DangerButton, Input, PrimaryButton, SecondaryButton } from '../../components/form';
import { GIFT_BOX_MAX, GIFT_BOX_MIN, opsDeleteGiftBox, opsDeleteWard, opsSaveGiftBox, opsSaveWard, opsUpdateParam } from '../../store/commands/adminConfig';
import { formatMoney } from '../../domain/pricing';
import type { ExpressTier } from '../../domain/params';
import type { GiftBoxType, Ward } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/** Danh mục dùng chung (FR-HT-04): phường/xã giao hàng, loại hộp quà (2–3 loại), bậc phụ phí hoả tốc (FEE-02). */
export function SharedCatalogTab() {
  const { state } = useStore();
  return (
    <div className="space-y-6">
      <CategoryManager/><CatalogDictionaryManager/>
      <section className="space-y-2">
        <h3 className="text-base font-bold">Phường/xã giao hàng (Hà Nội)</h3>
        <p className="text-sm text-stone-600">Danh sách mẫu, ghi "(mẫu)" cho tới khi nhóm nạp danh mục chính thức. Không dùng cấp quận/huyện. Khoảng cách dùng để tính phụ phí hoả tốc.</p>
        <AdminTable columns={['Phường/xã', 'Khoảng cách (km)', 'Thao tác']} minWidth={640}>
          {state.wards.length === 0 && (
            <tr>
              <Td colSpan={3} className="text-center text-stone-600">
                Chưa có phường/xã nào. Thêm ở dòng dưới.
              </Td>
            </tr>
          )}
          {state.wards.map((w) => (
            <WardRow key={w.id} ward={w} />
          ))}
          <WardRow />
        </AdminTable>
      </section>
      <section className="space-y-2">
        <h3 className="text-base font-bold">
          Loại hộp quà ({state.giftBoxTypes.length}/{GIFT_BOX_MAX}, tối thiểu {GIFT_BOX_MIN})
        </h3>
        <AdminTable columns={['Tên hộp', 'Phí (đồng)', 'Mô tả', 'Thao tác']} minWidth={760}>
          {state.giftBoxTypes.length === 0 && (
            <tr>
              <Td colSpan={4} className="text-center text-stone-600">
                Chưa có loại hộp quà nào. Thêm ở dòng dưới.
              </Td>
            </tr>
          )}
          {state.giftBoxTypes.map((b) => (
            <GiftRow key={b.id} box={b} />
          ))}
          {state.giftBoxTypes.length < GIFT_BOX_MAX && <GiftRow />}
        </AdminTable>
      </section>
      <ExpressTiers />
    </div>
  );
}

function WardRow({ ward }: { ward?: Ward }) {
  const { run } = useStore();
  const { adminActor, showToast } = useUi();
  const [name, setName] = useState(ward?.name ?? '');
  const [km, setKm] = useState(ward ? String(ward.distanceKm) : '');
  return (
    <tr>
      <Td className="min-w-56">
        <Input aria-label="Tên phường/xã" value={name} onChange={(e) => setName(e.target.value)} placeholder="Thêm phường/xã (mẫu)" />
      </Td>
      <Td className="w-36">
        <Input aria-label="Khoảng cách km" type="number" step="0.1" value={km} onChange={(e) => setKm(e.target.value)} placeholder="km" />
      </Td>
      <Td className="space-x-2 whitespace-nowrap">
        <SecondaryButton
          onClick={async () => {
            const r = await run((s, at) => opsSaveWard(s, adminActor, { id: ward?.id, name, distanceKm: Number(km) }, at));
            showToast(r.ok ? 'Đã lưu phường/xã.' : r.error);
            if (r.ok && !ward) {
              setName('');
              setKm('');
            }
          }}
        >
          {ward ? 'Lưu' : 'Thêm'}
        </SecondaryButton>
        {ward && (
          <DangerButton
            onClick={async () => {
              const r = await run((s, at) => opsDeleteWard(s, adminActor, ward.id, at));
              showToast(r.ok ? 'Đã xoá.' : r.error);
            }}
          >
            Xoá
          </DangerButton>
        )}
      </Td>
    </tr>
  );
}

function GiftRow({ box }: { box?: GiftBoxType }) {
  const { run } = useStore();
  const { adminActor, showToast } = useUi();
  const [name, setName] = useState(box?.name ?? '');
  const [fee, setFee] = useState(box ? String(box.fee) : '');
  const [desc, setDesc] = useState(box?.description ?? '');
  return (
    <tr>
      <Td className="min-w-48">
        <Input aria-label="Tên hộp quà" value={name} onChange={(e) => setName(e.target.value)} placeholder="Thêm loại hộp" />
      </Td>
      <Td className="w-36">
        <Input aria-label="Phí hộp (đồng)" type="number" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="Phí (đ)" />
      </Td>
      <Td className="min-w-48">
        <Input aria-label="Mô tả hộp quà" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Mô tả" />
      </Td>
      <Td className="space-x-2 whitespace-nowrap">
        <SecondaryButton
          onClick={async () => {
            const r = await run((s, at) => opsSaveGiftBox(s, adminActor, { id: box?.id, name, fee: Number(fee), description: desc }, at));
            showToast(r.ok ? 'Đã lưu hộp quà.' : r.error);
          }}
        >
          {box ? 'Lưu' : 'Thêm'}
        </SecondaryButton>
        {box && (
          <DangerButton
            onClick={async () => {
              const r = await run((s, at) => opsDeleteGiftBox(s, adminActor, box.id, at));
              showToast(r.ok ? 'Đã xoá.' : r.error);
            }}
          >
            Xoá
          </DangerButton>
        )}
      </Td>
    </tr>
  );
}

function ExpressTiers() {
  const { state, run } = useStore();
  const { adminActor, showToast } = useUi();
  const [tiers, setTiers] = useState<ExpressTier[]>(state.params.expressTiers);
  const [reason, setReason] = useState('');
  return (
    <section className="space-y-2">
      <h3 className="text-base font-bold">Bậc phụ phí hoả tốc (FEE-02)</h3>
      <AdminTable columns={['Khoảng cách', 'Phụ phí mới (đồng)', 'Đang áp dụng']} minWidth={520}>
        {tiers.map((t, i) => (
          <tr key={i}>
            <Td className="space-x-2 whitespace-nowrap">
              {i === 0 ? 0 : tiers[i - 1].maxKm}–{t.maxKm} km
            </Td>
            <Td className="w-44">
              <Input aria-label={`Phụ phí bậc ${i + 1}`} type="number" value={t.fee} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, fee: Number(e.target.value) } : x)))} />
            </Td>
            <Td className="tabular-nums text-stone-700">{formatMoney(state.params.expressTiers[i]?.fee ?? 0)}</Td>
          </tr>
        ))}
      </AdminTable>
      <div className="flex flex-wrap gap-2">
        <div className="min-w-56 flex-1">
          <Input aria-label="Lý do sửa bậc phí" placeholder="Lý do" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <PrimaryButton
          onClick={async () => {
            const r = await run((s, at) => opsUpdateParam(s, adminActor, 'expressTiers', tiers, reason, at));
            showToast(r.ok ? 'Đã sửa bậc phụ phí. Áp cho đơn tạo từ bây giờ.' : r.error);
          }}
        >
          Lưu bậc phí
        </PrimaryButton>
      </div>
    </section>
  );
}
