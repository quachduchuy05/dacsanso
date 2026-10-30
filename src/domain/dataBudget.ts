/**
 * Ước lượng dung lượng dữ liệu dùng chung (Giai đoạn 8, mục 5: ảnh trong tin nhắn).
 * Máy chủ nén gzip rồi lưu dạng base64, tối đa STATE_LIMIT_BYTES (api/state.ts). Đo trên dữ liệu mẫu: chữ còn khoảng 0,3 lần,
 * ảnh đã thu nhỏ (JPEG dạng base64) hầu như không nhỏ đi (khoảng 1 lần). Ước lượng nghiêng về phía an toàn.
 * Gần đầy thì chặn gửi thêm ảnh trước khi gửi, tin nhắn chữ vẫn gửi được.
 */
import type { DemoState } from './types';

/** Bằng STATE_LIMIT_BYTES ở api/state.ts. */
export const SHARED_DATA_LIMIT_BYTES = 900_000;
/** Từ mức này trở lên không nhận thêm ảnh trong tin nhắn. */
export const PHOTO_BLOCK_RATIO = 0.85;
/** Một ảnh tin nhắn đã thu nhỏ (PhotoPicker: cạnh 320px, JPEG) không quá chừng này ký tự. */
export const MESSAGE_PHOTO_MAX_CHARS = 120_000;

const TEXT_RATIO = 0.3;
const PHOTO_RATIO = 1;
const PHOTO_RE = /"data:image\/[^"]*"/g;

/** Số byte ước lượng sau khi nén của dữ liệu (cộng thêm ảnh sắp gửi). */
export function estimateSharedBytes(state: DemoState, extraPhotos: string[] = []): number {
  const json = JSON.stringify(state);
  const storedPhotoChars = Array.from(json.match(PHOTO_RE) ?? []).reduce<number>((s, m) => s + m.length, 0);
  const extraChars = extraPhotos.reduce((s, p) => s + p.length, 0);
  return Math.round((json.length - storedPhotoChars) * TEXT_RATIO + (storedPhotoChars + extraChars) * PHOTO_RATIO);
}

export interface PhotoBudget {
  /** Tỉ lệ đã dùng (ước lượng), 0–1+. */
  ratio: number;
  /** Gửi được thêm `extraPhotos`. */
  photosAllowed: boolean;
}

export function photoBudget(state: DemoState, extraPhotos: string[] = []): PhotoBudget {
  const ratio = estimateSharedBytes(state, extraPhotos) / SHARED_DATA_LIMIT_BYTES;
  return { ratio, photosAllowed: ratio < PHOTO_BLOCK_RATIO };
}

export const PHOTO_BUDGET_FULL_MESSAGE =
  'Dữ liệu dùng chung của bản demo gần đầy nên chưa gửi thêm ảnh được. Bỏ ảnh để gửi tin nhắn chữ; muốn gửi ảnh, nhờ Quản trị gốc hoặc Admin – Vận hành "Khôi phục dữ liệu mẫu".';

/**
 * Kiểm tra ảnh kèm tin nhắn: tối đa NEW-04 ảnh, đúng dạng ảnh đã thu nhỏ, và dữ liệu dùng chung chưa gần đầy.
 * Trả lỗi (chuỗi) hoặc null. Không có ảnh thì luôn hợp lệ, để tin nhắn chữ không bao giờ bị chặn vì dung lượng.
 */
export function messagePhotosError(state: DemoState, photos: string[], max: number): string | null {
  if (photos.length === 0) return null;
  if (photos.length > max) return `Mỗi tin nhắn tối đa ${max} ảnh.`;
  if (photos.some((p) => !(p.startsWith('data:image/') || /^sb:\/\/app-images\/[A-Za-z\d_-]+\/[a-f\d-]{36}\.(jpg|png|webp)$/.test(p)) || p.length > MESSAGE_PHOTO_MAX_CHARS)) return 'Ảnh không hợp lệ hoặc quá lớn. Vui lòng chọn lại ảnh.';
  return photoBudget(state, photos).photosAllowed ? null : PHOTO_BUDGET_FULL_MESSAGE;
}
