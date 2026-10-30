/**
 * Tiện ích riêng của từng máy cho trang chủ kiểu sàn (chủ repo yêu cầu ngày 18/10/2026): tìm kiếm gần đây và
 * sản phẩm đã xem gần đây. Lưu trong localStorage theo mã khách, không đưa vào dữ liệu dùng chung (máy khác không thấy).
 * Mọi thao tác đọc/ghi bọc try/catch: trình duyệt chặn lưu trữ thì danh sách chỉ giữ trong phiên.
 */
import { useCallback, useEffect, useState } from 'react';

export type ViewerList = 'recent-searches' | 'recently-viewed';

export const VIEWER_LIST_MAX: Record<ViewerList, number> = { 'recent-searches': 6, 'recently-viewed': 12 };

const keyOf = (kind: ViewerList, customerId: string) => `dac-san-so-lao-cai:${kind}:${customerId}`;
const EVENT = 'dac-san-so-lao-cai:viewer-prefs';

/** Danh sách giữ trong phiên khi trình duyệt chặn lưu trữ. */
const memory = new Map<string, string[]>();

export function loadViewerList(kind: ViewerList, customerId: string): string[] {
  const key = keyOf(kind, customerId);
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, VIEWER_LIST_MAX[kind]) : [];
  } catch {
    return memory.get(key) ?? [];
  }
}

function saveViewerList(kind: ViewerList, customerId: string, list: string[]): void {
  const key = keyOf(kind, customerId);
  memory.set(key, list);
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // bỏ qua: danh sách vẫn giữ trong phiên
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

/** Đưa một mục lên đầu danh sách (bỏ bản trùng, giữ tối đa VIEWER_LIST_MAX mục). */
export function pushViewerList(kind: ViewerList, customerId: string, value: string): void {
  const v = value.trim();
  if (!v) return;
  const list = loadViewerList(kind, customerId);
  saveViewerList(kind, customerId, [v, ...list.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, VIEWER_LIST_MAX[kind]));
}

export const clearViewerList = (kind: ViewerList, customerId: string) => saveViewerList(kind, customerId, []);

/** Đọc danh sách và cập nhật khi chỗ khác trong app (hoặc tab khác) thay đổi nó. */
export function useViewerList(kind: ViewerList, customerId: string | undefined): string[] {
  const read = useCallback(() => (customerId ? loadViewerList(kind, customerId) : []), [kind, customerId]);
  const [list, setList] = useState(read);
  useEffect(() => {
    setList(read());
    const onChange = () => setList(read());
    window.addEventListener(EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [read]);
  return list;
}
