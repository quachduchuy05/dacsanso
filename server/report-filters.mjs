import {assert} from './security.mjs';

const DAY = 86400000;
const OFFSET = 7 * 3600000;

// Date inputs represent Vietnamese calendar days, independently of server timezone.
export function reportBounds(filters, now = new Date()) {
  const date = value => {
    assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 400, 'Ngày phải có dạng YYYY-MM-DD.');
    const parsed = Date.parse(value + 'T00:00:00Z');
    assert(Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value, 400, 'Ngày không hợp lệ.');
    return parsed - OFFSET;
  };
  let from = filters.from ? date(filters.from) : 0;
  const to = filters.to ? date(filters.to) + DAY : Infinity;
  if (filters.range && filters.range !== 'all') {
    assert(['7d', '30d'].includes(filters.range), 400, 'Khoảng thời gian không hợp lệ.');
    if (!filters.from) {
      const today = Math.floor((now.getTime() + OFFSET) / DAY) * DAY - OFFSET;
      from = today - (Number(filters.range.slice(0, -1)) - 1) * DAY;
    }
  }
  assert(from < to, 400, 'Ngày bắt đầu không được sau ngày kết thúc.');
  return {from, to};
}
