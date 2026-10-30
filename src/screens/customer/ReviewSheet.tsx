import { useState } from 'react';
import { useUi } from '../../app/UiContext';
import { BottomSheet } from '../../components/BottomSheet';
import { Field, PrimaryButton, Textarea } from '../../components/form';
import { PhotoPicker } from '../../components/PhotoPicker';
import { StarPicker } from '../../components/Stars';
import { REVIEW_MAX_COMMENT, REVIEW_MAX_PHOTOS, REVIEW_MIN_LOW_STAR_COMMENT, submitReview } from '../../store/commands/reviews';
import { findOrder } from '../../domain/state';
import { useStore } from '../../store/AppDataContext';

/** Đánh giá sản phẩm trong đơn Đã giao (FR-CSKH-04). */
export function ReviewSheet({ orderId, productId, onClose }: { orderId: string; productId: string; onClose: () => void }) {
  const { state, run } = useStore();
  const { customerActor, showToast, openModal } = useUi();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const item = findOrder(state, orderId)?.items.find((i) => i.productId === productId);

  const submit = async () => {
    const r = await run(
      (s, at) => submitReview(s, customerActor, { orderId, productId, stars, comment, photos }, at),
      (v) => v.state,
    );
    if (!r.ok) return showToast(r.error);
    showToast('Cảm ơn bạn đã đánh giá.');
    openModal({ type: 'order_detail', orderId });
  };

  return (
    <BottomSheet
      title={`Đánh giá: ${item?.name ?? ''}`}
      onClose={onClose}
      footer={
        <PrimaryButton className="w-full" onClick={submit}>
          Gửi đánh giá
        </PrimaryButton>
      }
    >
      <StarPicker value={stars} onChange={setStars} />
      <Field label="Nhận xét" hint={`${comment.trim().length}/${REVIEW_MAX_COMMENT} ký tự${stars > 0 && stars <= 2 ? `. Đánh giá 1–2 sao cần tối thiểu ${REVIEW_MIN_LOW_STAR_COMMENT} ký tự.` : ''}`}>
        <Textarea rows={4} maxLength={REVIEW_MAX_COMMENT} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Chia sẻ cảm nhận về sản phẩm…" />
      </Field>
      <div className="space-y-1">
        <span className="text-sm font-semibold text-stone-700">Ảnh (không bắt buộc)</span>
        <PhotoPicker photos={photos} onChange={setPhotos} max={REVIEW_MAX_PHOTOS} />
      </div>
      <p className="text-sm text-stone-600">Đánh giá công khai hiện tên rút gọn, không hiện SĐT, địa chỉ hay mã đơn đầy đủ.</p>
    </BottomSheet>
  );
}
