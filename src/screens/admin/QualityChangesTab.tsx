import { AppImage } from '../../components/AppImage';
import {QualityCatalogPanel} from './QualityCatalogPanel';
import { useState } from 'react';
import { useUi } from '../../app/UiContext';
import { AdminTable, Td } from '../../components/AdminTable';
import { EmptyState } from '../../components/EmptyState';
import { DangerButton, Input, PrimaryButton } from '../../components/form';
import { formatMoney } from '../../domain/pricing';
import { decideProductChange } from '../../store/commands/productChanges';
import { findProduct, formatDateKey } from '../../domain/state';
import { PRODUCT_CHANGE_LABEL, type DemoState, type ProductChangeRequest } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/** Admin – Chất lượng duyệt sản phẩm mới, nội dung, giá, đặt trước, hoả tốc, chứng nhận của HTX; từ chối bắt buộc lý do (FR-SP-04, L12). */
export function QualityChangesTab() {
  const { state } = useStore();
  const pending = state.productChanges.filter((c) => c.status === 'pending');
  const done = state.productChanges.filter((c) => c.status !== 'pending');
  return (
    <div className="space-y-4">
      <QualityCatalogPanel/>
      <h3 className="text-base font-bold">Yêu cầu lưu từ phiên bản cũ ({pending.length})</h3>
      {pending.length === 0 ? (
        <EmptyState>Không có yêu cầu chờ duyệt.</EmptyState>
      ) : (
        <AdminTable columns={['Gửi lúc', 'HTX · sản phẩm', 'Yêu cầu', 'Nội dung', 'Thao tác']} minWidth={980}>
          {pending.map((c) => (
            <ChangeRow key={c.id} req={c} />
          ))}
        </AdminTable>
      )}
      <h3 className="text-base font-bold">Đã xử lý ({done.length})</h3>
      {done.length === 0 ? (
        <EmptyState>Chưa có yêu cầu nào được xử lý.</EmptyState>
      ) : (
        <AdminTable columns={['HTX · sản phẩm', 'Yêu cầu', 'Nội dung', 'Kết quả', 'Người xử lý']} minWidth={860}>
          {done.map((c) => (
            <tr key={c.id}>
              <SubjectCell req={c} />
              <Td>{PRODUCT_CHANGE_LABEL[c.type]}</Td>
              <Td className="min-w-64">{describe(c, state)}</Td>
              <Td>{c.status === 'approved' ? 'Đã duyệt' : `Từ chối: ${c.rejectReason}`}</Td>
              <Td>{c.decidedBy}</Td>
            </tr>
          ))}
        </AdminTable>
      )}
    </div>
  );
}

function SubjectCell({ req }: { req: ProductChangeRequest }) {
  const { state } = useStore();
  const p = findProduct(state, req.productId);
  const coop = state.coops.find((x) => x.id === req.coopId);
  return (
    <Td className="min-w-44">
      <strong className="block">{p?.name}</strong>
      {p && <span className="block text-stone-600">Quy cách: {p.unit}</span>}
      <span className="text-stone-600">{coop?.name}</span>
    </Td>
  );
}

function describe(c: ProductChangeRequest, state: DemoState): string {
  const p = findProduct(state, c.productId);
  switch (c.type) {
    case 'price':
      return `${formatMoney(p?.price ?? 0)} → ${formatMoney(c.newPrice!)}`;
    case 'preorder':
      return `${c.preorder?.totalSlots} suất, giao ${formatDateKey(c.preorder!.deliveryFrom)} – ${formatDateKey(c.preorder!.deliveryTo)}`;
    case 'new_product':
      return p?.variantOf
        ? `Quy cách mới "${p.unit}" của sản phẩm đang có, ${formatMoney(p.price)}. Tên, mô tả, vùng giữ như sản phẩm gốc.`
        : `${p?.unit}, ${formatMoney(p?.price ?? 0)}, vùng ${p?.region}. ${p?.description ?? ''}`;
    case 'content':
      return `Tên "${c.content?.name}", quy cách "${c.content?.unit}", vùng "${c.content?.region}". ${c.content?.description ?? ''}`;
    case 'express':
      return c.express ? 'Bật hoả tốc' : 'Tắt hoả tốc';
    case 'cert':
      return `${c.cert?.label} · ${c.cert?.issuer} · hiệu lực đến ${c.cert?.validUntil}`;
  }
}

function ChangeRow({ req }: { req: ProductChangeRequest }) {
  const { state, run } = useStore();
  const { adminActor, showToast } = useUi();
  const [reason, setReason] = useState('');
  const decide = async (approve: boolean) => {
    const r = await run((s, t) => decideProductChange(s, req.id, adminActor, approve, reason, t));
    showToast(r.ok ? (approve ? 'Đã duyệt.' : 'Đã từ chối.') : r.error);
  };
  return (
    <tr>
      <Td className="whitespace-nowrap">{new Date(req.createdAt).toLocaleString('vi-VN')}</Td>
      <SubjectCell req={req} />
      <Td>{PRODUCT_CHANGE_LABEL[req.type]}</Td>
      <Td className="min-w-64">
        <p>{describe(req, state)}</p>
        {req.cert?.photo && <AppImage src={req.cert.photo} alt="Ảnh chứng nhận" className="mt-1 h-24 rounded-lg border border-stone-200 object-cover" />}
      </Td>
      <Td>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <Input aria-label="Lý do từ chối" placeholder="Lý do (bắt buộc khi từ chối)" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DangerButton onClick={() => decide(false)}>Từ chối</DangerButton>
          <PrimaryButton onClick={() => decide(true)}>Duyệt</PrimaryButton>
        </div>
      </Td>
    </tr>
  );
}
