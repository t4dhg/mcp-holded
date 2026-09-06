/**
 * Holded v2 pagination, as observed live.
 *
 * List endpoints return `{ items, cursor, has_more }`. `cursor` is the id of the
 * last item; pass it back as `?cursor=` for the next page. `limit` defaults to
 * 50 and is capped at 200 (larger values are clamped, 0 and non-numbers give 1).
 * `page` and `offset` are silently ignored. Configuration lists (taxes, tags,
 * warehouses, accounting accounts, numbering series and a few more) return
 * `{ items }` with no cursor at all.
 */

import { z } from 'zod';

export const MAX_LIMIT = 200;
export const DEFAULT_LIMIT = 50;

export interface Page<T> {
  items: T[];
  cursor: string | null;
  has_more: boolean;
}

export function pageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.looseObject({
    items: z.array(item),
    cursor: z.string().nullable().optional(),
    has_more: z.boolean().optional(),
  });
}

/** Normalise any list envelope into a Page. Unpaginated lists become a single complete page. */
export function toPage<T>(raw: {
  items: T[];
  cursor?: string | null;
  has_more?: boolean;
}): Page<T> {
  return {
    items: raw.items,
    cursor: raw.cursor ?? null,
    has_more: raw.has_more ?? false,
  };
}

export function clampLimit(limit?: number): number | undefined {
  if (limit === undefined) return undefined;
  if (!Number.isFinite(limit) || limit < 1) return 1;
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

export function formatPageInfo(page: Page<unknown>, noun: string): string {
  const count = page.items.length;
  const label = `${count} ${noun}${count === 1 ? '' : 's'}`;
  if (page.has_more && page.cursor) {
    return `${label}, more available: call again with cursor "${page.cursor}"`;
  }
  return `${label}, end of list`;
}
