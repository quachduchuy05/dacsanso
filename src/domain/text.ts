/** Tìm kiếm không phân biệt dấu và hoa/thường (FR-TKSP-02). */
export function normalizeVi(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Mọi từ trong câu tìm đều xuất hiện trong ít nhất một trường. */
export function matchesSearch(query: string, fields: (string | undefined)[]): boolean {
  const terms = normalizeVi(query).split(' ').filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalizeVi(fields.filter(Boolean).join(' '));
  return terms.every((t) => haystack.includes(t));
}
