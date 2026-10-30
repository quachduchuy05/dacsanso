import { describe, expect, it } from 'vitest';
import { matchesReviewFilter, REVIEW_FILTERS } from '../reviews';

describe('Lọc đánh giá ở trang sản phẩm', () => {
  it('lọc theo số sao và theo có ảnh', () => {
    const reviews = [
      { stars: 5, photos: ['a'] },
      { stars: 5, photos: [] },
      { stars: 2, photos: [] },
    ];
    const count = (key: (typeof REVIEW_FILTERS)[number]['key']) => reviews.filter((r) => matchesReviewFilter(r, key)).length;
    expect(REVIEW_FILTERS.map((f) => `${f.label}:${count(f.key)}`)).toEqual(['Tất cả:3', '5 sao:2', '4 sao:0', '3 sao:0', '2 sao:1', '1 sao:0', 'Có ảnh:1']);
  });
});
