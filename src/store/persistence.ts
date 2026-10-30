/**
 * Lưu dữ liệu demo vào localStorage để các vai trò trên cùng trình duyệt thấy chung dữ liệu.
 * Mọi thao tác đọc/ghi bọc try/catch: trình duyệt chặn lưu trữ thì app vẫn chạy với dữ liệu mẫu.
 */
export const STORAGE_KEY = 'dac-san-so-lao-cai:data';
export const STORAGE_VERSION = 4;

interface Envelope<T> {
  version: number;
  data: T;
}

export function loadState<T>(fallback: () => T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback();
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (parsed?.version !== STORAGE_VERSION || !parsed.data) return fallback();
    return { ...fallback(), ...parsed.data };
  } catch {
    return fallback();
  }
}

export function saveState<T>(data: T): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, data } satisfies Envelope<T>));
  } catch {
    // Không lưu được (chế độ riêng tư, hết dung lượng…): bỏ qua, dữ liệu vẫn giữ trong phiên.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // bỏ qua
  }
}

/** Phiên đăng nhập lưu theo từng tab (sessionStorage): hai tab có thể đăng nhập hai vai trò khác nhau trên cùng dữ liệu. */
const SESSION_KEY = 'dac-san-so-lao-cai:session';

export function loadSession(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveSession(userId: string | null): void {
  try {
    if (userId) sessionStorage.setItem(SESSION_KEY, userId);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // bỏ qua
  }
}

/** Tab đã nhập đúng mã trình diễn (NEW-01): nhớ bản băm của mã theo từng tab, đóng tab là quên. */
const DEMO_UNLOCK_KEY = 'dac-san-so-lao-cai:demo-unlock';

export function loadDemoUnlock(): string | null {
  try {
    return sessionStorage.getItem(DEMO_UNLOCK_KEY);
  } catch {
    return null;
  }
}

export function saveDemoUnlock(codeHash: string): void {
  try {
    sessionStorage.setItem(DEMO_UNLOCK_KEY, codeHash);
  } catch {
    // bỏ qua: không nhớ được thì lần sau nhập lại mã
  }
}
