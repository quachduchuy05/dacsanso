import { useState } from 'react';
import {CoopReviewsPanel} from '../../components/CoopReviewsPanel';
import { useUi } from '../../app/UiContext';
import { EmptyState } from '../../components/EmptyState';
import { SecondaryButton, Textarea } from '../../components/form';
import { Stars } from '../../components/Stars';
import { coopReplyReview } from '../../store/commands/reviews';
import type { Review } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/** HTX xem và phản hồi đánh giá sản phẩm của HTX mình; không sửa, không xoá (FR-CSKH-08). */
export function CoopReviewsTab() {
  const { state } = useStore();
  const { coopId } = useUi();
  const mine = state.reviews.filter((r) => state.orders.find((o) => o.id === r.orderId)?.coopId === coopId);
  if (mine.length === 0) return <><CoopReviewsPanel coopId={coopId}/><EmptyState>Chưa có đánh giá sản phẩm nào.</EmptyState></>;
  return (
    <><CoopReviewsPanel coopId={coopId}/><ul className="grid items-start gap-3 xl:grid-cols-2 2xl:grid-cols-3">
      {mine.map((r) => (
        <ReviewRow key={r.id} review={r} />
      ))}
    </ul></>
  );
}

function ReviewRow({ review: r }: { review: Review }) {
  const { state, run } = useStore();
  const { coopActor, showToast } = useUi();
  const [text, setText] = useState('');
  const product = state.products.find((p) => p.id === r.productId);
  return (
    <li className="space-y-2 rounded-2xl border border-stone-200 bg-white p-3 text-sm">
      <p className="flex flex-wrap items-center gap-2">
        <Stars value={r.stars} /> <strong>{product?.name}</strong>
        {r.status === 'hidden' && <span className="rounded-md bg-stone-200 px-2 py-0.5 text-xs">Đã bị ẩn: {r.hiddenReason}</span>}
      </p>
      {r.comment && <p className="text-stone-700">{r.comment}</p>}
      {r.coopReply ? (
        <p className="border-l-2 border-forest-600 pl-2">Đã phản hồi: {r.coopReply}</p>
      ) : (
        <>
          <Textarea rows={2} aria-label="Phản hồi đánh giá" value={text} onChange={(e) => setText(e.target.value)} placeholder="Cảm ơn hoặc giải thích cho khách…" />
          <SecondaryButton
            onClick={async () => {
              const res = await run((s, at) => coopReplyReview(s, coopActor, r.id, text, at));
              showToast(res.ok ? 'Đã phản hồi đánh giá.' : res.error);
            }}
          >
            Gửi phản hồi
          </SecondaryButton>
        </>
      )}
    </li>
  );
}
