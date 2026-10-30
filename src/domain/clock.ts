/**
 * Mọi phép tính thời gian đọc giờ qua now() để Bảng điều khiển demo tua được thời gian (mục 5.4).
 */
let offsetMs = 0;

export const now = (): Date => new Date(Date.now() + offsetMs);

export const getClockOffset = (): number => offsetMs;

export function setClockOffset(ms: number): void {
  offsetMs = ms;
}

export function advanceClock(ms: number): void {
  offsetMs += ms;
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
