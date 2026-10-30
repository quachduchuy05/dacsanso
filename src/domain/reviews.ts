/**
 * Đánh giá (FR-CSKH-04, 06, 08; mục 5.8).
 * - Chỉ đơn Đã giao, sản phẩm thuộc đơn của khách; mỗi sản phẩm trong một đơn đánh giá 1 lần.
 * - 1–5 sao bắt buộc; 1–2 sao thì nhận xét tối thiểu 20 ký tự; nhận xét tối đa 500 ký tự; tối đa 5 ảnh.
 * - Điểm trung bình chỉ tính các đánh giá đang Hiển thị.
 * - Admin – CSKH ẩn đánh giá phải ghi lý do, không được ẩn vì sao thấp.
 * - HTX chỉ phản hồi, không sửa, không xoá.
 * - Đánh giá công khai không hiện SĐT, địa chỉ, mã đơn đầy đủ.
 */
import { generateId } from './ids';
import { audit, findOrder, iso } from './state';
import { fail, ok, type Actor, type DemoState, type Result, type Review } from './types';

export const REVIEW_MIN_LOW_STAR_COMMENT = 20;
export const REVIEW_MAX_COMMENT = 500;
export const REVIEW_MAX_PHOTOS = 5;

/** Lý do được phép ẩn đánh giá. Không có lý do "sao thấp". */
export const REVIEW_HIDE_REASONS = [
  'Chứa thông tin cá nhân (SĐT, địa chỉ…)',
  'Ngôn từ xúc phạm, thô tục',
  'Quảng cáo, spam, chứa đường link',
  'Không liên quan đến sản phẩm',
] as const;

export interface ReviewInput {
  orderId: string;
  productId: string;
  stars: number;
  comment: string;
  photos: string[];
}

export function submitReview(state: DemoState, actor: Actor, input: ReviewInput, at: Date): Result<{ state: DemoState; review: Review }> {
  const order = findOrder(state, input.orderId);
  if (!order) return fail('Không tìm thấy đơn.');
  if (actor.kind !== 'customer' || actor.id !== order.customerId) return fail('Bạn chỉ đánh giá sản phẩm trong đơn của mình.');
  if (order.status !== 'delivered') return fail('Chỉ đánh giá được đơn Đã giao.');
  if(order.deliveredAt&&at.getTime()>Date.parse(order.deliveredAt)+(state.reviewPolicy?.windowDays??30)*86400000)return fail('Đã quá thời hạn đánh giá của đơn hàng.');
  if (!order.items.some((i) => i.productId === input.productId)) return fail('Sản phẩm không thuộc đơn này.');
  if (state.reviews.some((r) => r.orderId === order.id && r.productId === input.productId)) return fail('Sản phẩm này trong đơn đã được đánh giá.');
  if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5) return fail('Vui lòng chọn từ 1 đến 5 sao.');
  const comment = input.comment.trim();
  if (input.stars <= 2 && comment.length < REVIEW_MIN_LOW_STAR_COMMENT) return fail(`Đánh giá 1–2 sao cần nhận xét tối thiểu ${REVIEW_MIN_LOW_STAR_COMMENT} ký tự.`);
  if (comment.length > REVIEW_MAX_COMMENT) return fail(`Nhận xét tối đa ${REVIEW_MAX_COMMENT} ký tự.`);
  if (input.photos.length > REVIEW_MAX_PHOTOS) return fail(`Tối đa ${REVIEW_MAX_PHOTOS} ảnh.`);
  const review: Review = {
    id: generateId('DG'),
    orderId: order.id,
    productId: input.productId,
    customerId: order.customerId,
    stars: input.stars,
    comment,
    photos: input.photos,
    status: state.reviewPolicy?.requireModeration?'pending':'visible',
    flagged:/ngộ độc|dị vật|hết hạn|quá hạn|hàng hỏng|đau bụng|mốc|an toàn thực phẩm|qr.{0,30}(bất thường|không đúng|không rõ)|nguồn gốc.{0,20}(không rõ|không đúng)/i.test(comment),
    createdAt: iso(at),
  };
  return ok({ state: { ...state, reviews: [review, ...state.reviews] }, review });
}

export function coopReplyReview(state: DemoState, actor: Actor, reviewId: string, reply: string, at: Date): Result<DemoState> {
  const review = state.reviews.find((r) => r.id === reviewId);
  if (!review) return fail('Không tìm thấy đánh giá.');
  const order = findOrder(state, review.orderId);
  if (actor.kind !== 'coop' || actor.id !== order?.coopId) return fail('HTX chỉ phản hồi đánh giá sản phẩm của HTX mình.');
  if (review.coopReply) return fail('HTX đã phản hồi đánh giá này.');
  if (!reply.trim()) return fail('Vui lòng nhập nội dung phản hồi.');
  if (reply.trim().length > REVIEW_MAX_COMMENT) return fail(`Phản hồi tối đa ${REVIEW_MAX_COMMENT} ký tự.`);
  const next = { ...state, reviews: state.reviews.map((r) => (r.id === reviewId ? { ...r, coopReply: reply.trim() } : r)) };
  return ok(audit(next, actor, 'Phản hồi đánh giá', reviewId, at));
}

export function cskhSetReviewVisibility(state: DemoState, actor: Actor, reviewId: string, hide: boolean, reason: string, at: Date): Result<DemoState> {
  if (actor.kind !== 'admin' || actor.adminGroup !== 'cskh') return fail('Chỉ Admin – CSKH được kiểm duyệt đánh giá.');
  const review = state.reviews.find((r) => r.id === reviewId);
  if (!review) return fail('Không tìm thấy đánh giá.');
  if (hide && !(REVIEW_HIDE_REASONS as readonly string[]).includes(reason)) {
    return fail('Ẩn đánh giá phải chọn lý do hợp lệ. Không được ẩn vì sao thấp.');
  }
  const next = {
    ...state,
    reviews: state.reviews.map((r) => (r.id === reviewId ? { ...r, status: hide ? ('hidden' as const) : ('visible' as const), hiddenReason: hide ? reason : undefined } : r)),
  };
  return ok(audit(next, actor, hide ? 'Ẩn đánh giá' : 'Hiện lại đánh giá', reviewId, at, hide ? reason : undefined));
}

/** Điểm trung bình chỉ tính các đánh giá đang Hiển thị. */
export function averageRating(state: DemoState, productId: string): { average: number | null; count: number } {
  const visible = state.reviews.filter((r) => r.productId === productId && r.status === 'visible');
  if (visible.length === 0) return { average: null, count: 0 };
  return { average: Math.round((visible.reduce((s, r) => s + r.stars, 0) / visible.length) * 10) / 10, count: visible.length };
}

export interface PublicReview {
  id: string;
  reviewerName: string;
  orderRef: string;
  stars: number;
  comment: string;
  photos: string[];
  coopReply?: string;
  createdAt: string;
}

/** Bản công khai: không có SĐT, địa chỉ, mã đơn đầy đủ. */
export function publicReviews(state: DemoState, productId: string): PublicReview[] {
  return state.reviews
    .filter((r) => r.productId === productId && r.status === 'visible')
    .map((r) => {
      const name = state.customers.find((c) => c.id === r.customerId)?.name ?? 'Khách hàng';
      const parts = name.split(' ');
      return {
        id: r.id,
        reviewerName: parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.` : `${name.charAt(0)}***`,
        orderRef: `…${r.orderId.slice(-3)}`,
        stars: r.stars,
        comment: r.comment,
        photos: r.photos,
        coopReply: r.coopReply,
        createdAt: r.createdAt,
      };
    });
}

// ---------- Lọc đánh giá kiểu sàn TMĐT (chủ repo yêu cầu ngày 18/10/2026) ----------

export type ReviewFilter = 'all' | 'photos' | 1 | 2 | 3 | 4 | 5;

export const REVIEW_FILTERS: { key: ReviewFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 5, label: '5 sao' },
  { key: 4, label: '4 sao' },
  { key: 3, label: '3 sao' },
  { key: 2, label: '2 sao' },
  { key: 1, label: '1 sao' },
  { key: 'photos', label: 'Có ảnh' },
];

export function matchesReviewFilter(r: Pick<Review, 'stars' | 'photos'>, filter: ReviewFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'photos') return r.photos.length > 0;
  return r.stars === filter;
}
