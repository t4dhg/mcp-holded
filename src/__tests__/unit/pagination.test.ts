import { describe, it, expect } from 'vitest';
import { clampLimit, formatPageInfo, toPage } from '../../pagination.js';

describe('pagination', () => {
  it('clamps limit to the API maximum of 200', () => {
    expect(clampLimit(undefined)).toBeUndefined();
    expect(clampLimit(1000)).toBe(200);
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(50.7)).toBe(50);
  });

  it('normalises unpaginated lists into a complete page', () => {
    expect(toPage({ items: [1, 2] })).toEqual({ items: [1, 2], cursor: null, has_more: false });
  });

  it('formats continuation hints', () => {
    expect(formatPageInfo({ items: [1], cursor: 'abc', has_more: true }, 'contact')).toContain(
      'cursor "abc"'
    );
    expect(formatPageInfo({ items: [], cursor: null, has_more: false }, 'contact')).toBe(
      '0 contacts, end of list'
    );
  });
});
