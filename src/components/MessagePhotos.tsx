import { AppImage } from './AppImage';
import { useMemo, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { PHOTO_BUDGET_FULL_MESSAGE, photoBudget } from '../domain/dataBudget';
import { useStore } from '../store/AppDataContext';
import { downscale } from './PhotoPicker';

/**
 * Ảnh trong tin nhắn (Giai đoạn 8, mục 5): tối đa NEW-04 ảnh mỗi tin, thu nhỏ như ảnh khiếu nại.
 * Dữ liệu dùng chung gần đầy thì báo ngay khi chọn ảnh (trước khi gửi) và không nhận thêm ảnh; tin nhắn chữ vẫn gửi được.
 */
export function useMessagePhotos() {
  const { state } = useStore();
  const [photos, setPhotos] = useState<string[]>([]);
  const max = state.params.messagePhotoMax;
  // Ước lượng dung lượng cần JSON của cả dữ liệu: chỉ tính lại khi dữ liệu hoặc ảnh đổi, không tính lại khi gõ chữ.
  const budget = useMemo(() => photoBudget(state, photos), [state, photos]);
  return { photos, setPhotos, max, photosAllowed: budget.photosAllowed, clear: () => setPhotos([]) };
}

export type MessagePhotosState = ReturnType<typeof useMessagePhotos>;

/** Nút đính ảnh 44px cạnh ô nhập tin. Đủ NEW-04 ảnh hoặc dữ liệu gần đầy thì không chọn thêm được. */
export function AttachPhotoButton({ state: ps, disabled = false }: { state: MessagePhotosState; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const full = ps.photos.length >= ps.max;
  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const room = ps.max - ps.photos.length;
    try {
      const urls = await Promise.all(Array.from(files).slice(0, room).map(downscale));
      ps.setPhotos([...ps.photos, ...urls]);
      if (files.length > room) setError(`Mỗi tin nhắn tối đa ${ps.max} ảnh.`);
    } catch (e) {
      setError((e as Error).message);
    }
    if (input.current) input.current.value = '';
  };
  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={disabled || full || !ps.photosAllowed}
        aria-label={full ? `Đã đủ ${ps.max} ảnh` : `Đính kèm ảnh (tối đa ${ps.max} ảnh)`}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-champagne-300 bg-white text-forest-900 hover:bg-champagne-50 disabled:border-stone-200 disabled:text-stone-400"
      >
        <ImagePlus size={19} aria-hidden="true" />
      </button>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      {/* Lỗi chọn ảnh chỉ hiện khi đang soạn ảnh; gửi xong (bỏ hết ảnh) thì ẩn. */}
      {error && ps.photos.length > 0 && (
        <p role="alert" className="basis-full text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
    </>
  );
}

/** Ảnh đã chọn, chưa gửi: xem trước và bỏ từng ảnh. Kèm cảnh báo khi dữ liệu dùng chung gần đầy. */
export function PendingPhotos({ state: ps }: { state: MessagePhotosState }) {
  if (ps.photos.length === 0 && ps.photosAllowed) return null;
  return (
    <div className="space-y-1.5">
      {ps.photos.length > 0 && (
        <ul aria-label="Ảnh sẽ gửi" className="flex flex-wrap gap-2">
          {ps.photos.map((src, i) => (
            <li key={i} className="relative h-16 w-16 overflow-hidden rounded-xl border border-stone-200">
              <AppImage src={src} alt={`Ảnh ${i + 1} sẽ gửi`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => ps.setPhotos(ps.photos.filter((_, j) => j !== i))}
                aria-label={`Bỏ ảnh ${i + 1}`}
                className="absolute top-0 right-0 flex h-11 w-11 items-start justify-end p-1 text-white"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70">
                  <X size={13} aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!ps.photosAllowed && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-900">
          {PHOTO_BUDGET_FULL_MESSAGE}
        </p>
      )}
    </div>
  );
}

/** Ảnh trong một tin đã gửi. */
export function MessagePhotoGrid({ photos, label }: { photos?: string[]; label: string }) {
  if (!photos || photos.length === 0) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1.5">
      {photos.map((src, i) => (
        <AppImage key={i} src={src} alt={`${label}, ảnh ${i + 1}`} className="h-28 w-28 rounded-xl object-cover ring-1 ring-black/5" loading="lazy" />
      ))}
    </span>
  );
}
