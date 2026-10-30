/**
 * Địa chỉ theo GPS: khớp kết quả Google Maps với danh sách phường giao hàng của app.
 * Toạ độ chỉ dùng để tra địa chỉ, không lưu.
 */
import { normalizeVi } from './text';
import type { Ward } from './types';

/** Khung toạ độ gần đúng của Hà Nội (giống api/geocode.ts). */
export const HANOI_BOUNDS = { south: 20.53, north: 21.39, west: 105.28, east: 106.03 };

export function inHanoiBounds(lat: number, lng: number): boolean {
  return lat >= HANOI_BOUNDS.south && lat <= HANOI_BOUNDS.north && lng >= HANOI_BOUNDS.west && lng <= HANOI_BOUNDS.east;
}

/** Làm tròn toạ độ ~11 m: đủ để tra địa chỉ, cùng chỗ thì dùng lại kết quả đã có trên CDN. */
export const roundCoord = (v: number) => Math.round(v * 1e4) / 1e4;

/** Tên phường bỏ dấu, bỏ chữ "phường / xã / thị trấn" và "(mẫu)" để so khớp. */
export function wardKey(name: string): string {
  return normalizeVi(name)
    .replace(/\(mau\)/g, '')
    .replace(/^(phuong|xa|thi tran|quan|huyen)\s+/, '')
    .trim();
}

/** Tìm phường giao hàng khớp với tên khu vực Google trả về; không khớp thì trả undefined. */
export function matchWard(wards: Ward[], areas: string[], formattedAddress = ''): Ward | undefined {
  const keys = areas.map(wardKey).filter(Boolean);
  const byArea = wards.find((w) => keys.includes(wardKey(w.name)));
  if (byArea) return byArea;
  // Dò trong địa chỉ đầy đủ: "…, Phường Thanh Xuân, Hà Nội".
  const full = normalizeVi(formattedAddress);
  return wards.find((w) => {
    const key = wardKey(w.name);
    return key.length > 2 && new RegExp(`(^|[ ,])(phuong |xa )?${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(,|$)`).test(full);
  });
}
