/** Mã đơn duy nhất dạng DH-yyyymmdd-xxxxxx; không dùng 4 số cuối của timestamp (mục 5.1). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/*
 * Ghi lại / phát lại phần ngẫu nhiên của mã (đồng bộ dữ liệu dùng chung, src/store/remoteSync.ts).
 * Khi hai máy ghi cùng lúc, thao tác của máy đến sau được chạy lại trên dữ liệu mới nhất;
 * phát lại đúng các chuỗi ngẫu nhiên cũ để đơn, giao dịch, ticket… giữ nguyên mã mà màn hình đang dùng.
 */
let recording: string[] | null = null;
let replaying: string[] | null = null;

function randomSuffix(length: number): string {
  if (replaying && replaying.length > 0) return replaying.shift()!;
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  recording?.push(suffix);
  return suffix;
}

/** Chạy `fn` và ghi lại các chuỗi ngẫu nhiên đã dùng. */
export function recordRandom<T>(fn: () => T): { value: T; draws: string[] } {
  const outer = recording;
  const draws: string[] = [];
  recording = draws;
  try {
    return { value: fn(), draws };
  } finally {
    recording = outer;
    outer?.push(...draws);
  }
}

/** Chạy lại `fn`, dùng lại đúng các chuỗi ngẫu nhiên đã ghi (hết thì sinh mới). */
export function replayRandom<T>(draws: string[], fn: () => T): T {
  const outer = replaying;
  replaying = [...draws];
  try {
    return fn();
  } finally {
    replaying = outer;
  }
}

export function generateOrderCode(at: Date, existing: Iterable<string> = []): string {
  const taken = new Set(existing);
  const ymd = `${at.getFullYear()}${String(at.getMonth() + 1).padStart(2, '0')}${String(at.getDate()).padStart(2, '0')}`;
  let code: string;
  do {
    code = `DH-${ymd}-${randomSuffix(6)}`;
  } while (taken.has(code));
  return code;
}

/** Mã định danh nội bộ cho bản ghi khác (địa chỉ, ticket…). */
export function generateId(prefix: string): string {
  return `${prefix}-${randomSuffix(10)}`;
}
