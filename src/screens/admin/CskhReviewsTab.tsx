import {ReviewPolicyPanel} from '../../components/ReviewPolicyPanel';
import {CoopReviewsPanel} from '../../components/CoopReviewsPanel';
import {api} from '../../store/backend';
import { useState } from 'react';
import { useUi } from '../../app/UiContext';
import { AdminTable, Td } from '../../components/AdminTable';
import { EmptyState } from '../../components/EmptyState';
import { Select, SecondaryButton } from '../../components/form';
import { Stars } from '../../components/Stars';
import { cskhSetReviewVisibility, REVIEW_HIDE_REASONS } from '../../store/commands/reviews';
import type { Review } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/** Admin – CSKH kiểm duyệt đánh giá (FR-CSKH-06): ẩn phải ghi lý do, không được ẩn vì sao thấp. */
export function CskhReviewsTab() {
  const { state } = useStore();
  if (state.reviews.length === 0) return <><CoopReviewsPanel/><ReviewPolicyPanel/><EmptyState>Chưa có đánh giá sản phẩm nào.</EmptyState></>;
  return (
    <><CoopReviewsPanel/><ReviewPolicyPanel/><AdminTable columns={['Sao', 'Sản phẩm · đơn', 'Nội dung', 'Trạng thái', 'Thao tác']} minWidth={960}>
      {state.reviews.map((r) => (
        <ReviewRow key={r.id} review={r} />
      ))}
    </AdminTable></>
  );
}

function ReviewRow({ review: r }: { review: Review }) {
  const { state, run, syncNow } = useStore();
  const { adminActor, showToast } = useUi();
  const [reason, setReason] = useState('');
  const product = state.products.find((p) => p.id === r.productId);
  const act = async (hide: boolean) => {
    const res = await run((s, at) => cskhSetReviewVisibility(s, adminActor, r.id, hide, reason, at));
    showToast(res.ok ? (hide ? 'Đã ẩn đánh giá.' : 'Đã hiện lại đánh giá.') : res.error);
  };
  return (
    <tr>
      <Td>
        <Stars value={r.stars} />
        <span className="sr-only">{r.stars} sao</span>
      </Td>
      <Td className="min-w-40">
        <strong className="block">{product?.name}</strong>
        <span className="font-mono text-stone-600">{r.orderId}</span>
      </Td>
      <Td className="min-w-56">
        {r.comment ? <p className="text-stone-700">{r.comment}</p> : <p className="text-muted">Không có lời nhận xét.</p>}
        {r.coopReply && <p className="mt-1 border-l-2 border-forest-600 pl-2">HTX: {r.coopReply}</p>}
      </Td>
      <Td>
        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-bold">{r.status==='pending'?'Chờ duyệt':r.status==='rejected'?'Đã từ chối':r.status==='visible'?'Đang hiển thị':'Đã ẩn'} {r.flagged&&'· Cần kiểm tra an toàn thực phẩm'}</span>
      </Td>
      <Td>
        {r.status==='pending'?<div className="space-y-2"><Select aria-label="Lý do từ chối đánh giá" value={reason} onChange={e=>setReason(e.target.value)}><option value="">Chọn lý do từ chối</option>{REVIEW_HIDE_REASONS.map(x=><option key={x}>{x}</option>)}</Select>{(['visible','rejected'] as const).map(status=><SecondaryButton key={status} onClick={async()=>{try{await api('/api/v1/reviews/'+r.id+'/moderate',{status,reason});syncNow();}catch(e){showToast(e instanceof Error?e.message:'Không xử lý được.');}}}>{status==='visible'?'Duyệt hiển thị':'Từ chối vi phạm'}</SecondaryButton>)}</div>:r.status === 'visible' ? (
          <div className="flex flex-wrap gap-2">
            <Select aria-label="Lý do ẩn" value={reason} onChange={(e) => setReason(e.target.value)} className="max-w-xs">
              <option value="">— Lý do ẩn (không được ẩn vì sao thấp) —</option>
              {REVIEW_HIDE_REASONS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
            <SecondaryButton onClick={() => act(true)}>Ẩn đánh giá</SecondaryButton>
          </div>
        ) : (
          <SecondaryButton onClick={() => act(false)}>Hiện lại</SecondaryButton>
        )}
      </Td>
    </tr>
  );
}
