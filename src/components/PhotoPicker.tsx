import { AppImage } from './AppImage';
import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import {storePhoto} from '../store/media';

const MAX_PHOTOS = 5;
const MAX_SIDE = 320;

/** Thu nhỏ ảnh còn cạnh dài tối đa 320px để lưu được trong localStorage. Dùng chung cho ảnh tin nhắn (MessagePhotos.tsx). */
export function downscale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được ảnh'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Tệp không phải ảnh'));
      img.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        void storePhoto(canvas.toDataURL('image/jpeg', 0.7)).then(resolve,reject);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** Chọn ảnh từ thiết bị. Ảnh được thu nhỏ rồi lưu cùng dữ liệu demo (máy này, hoặc dữ liệu dùng chung khi có API), mô phỏng tải ảnh. */
export function PhotoPicker({ photos, onChange, max = MAX_PHOTOS }: { photos: string[]; onChange: (photos: string[]) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const room = max - photos.length;
    const picked = Array.from(files).slice(0, room);
    try {
      const urls = await Promise.all(picked.map(downscale));
      onChange([...photos, ...urls]);
      if (files.length > room) setError(`Tối đa ${max} ảnh.`);
    } catch (e) {
      setError((e as Error).message);
    }
    if (input.current) input.current.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {photos.map((src, i) => (
          <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-stone-200">
            <AppImage src={src} alt={`Ảnh ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
              aria-label={`Xoá ảnh ${i + 1}`}
              className="absolute top-0 right-0 flex h-11 w-11 items-start justify-end p-1 text-white"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70">
                <X size={14} />
              </span>
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 text-xs font-semibold text-stone-600 hover:border-forest-600"
          >
            <Camera size={20} className="text-forest-700" />
            Thêm ảnh
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <p className="text-sm text-stone-600">Ảnh được thu nhỏ trước khi lưu, tối đa {max} ảnh.</p>
      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
