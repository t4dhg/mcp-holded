import { describe, it, expect } from 'vitest';
import {
  parseAmount,
  formatAmount,
  previousMonth,
  previousQuarter,
  resolveWindow,
  today,
  toolCall,
  userMessage,
  preRead,
} from '../../prompts/shared.js';

describe('prompt helpers', () => {
  it('parses both decimal conventions without losing cents', () => {
    expect(parseAmount('63500,00')).toBe(63500);
    expect(parseAmount('8.3')).toBe(8.3);
    expect(parseAmount('-1.234,56')).toBeCloseTo(-1234.56, 2);
    expect(parseAmount('0.00')).toBe(0);
    expect(parseAmount(null)).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
  });

  it('formats a total to two decimals with a currency', () => {
    expect(formatAmount(1234.5, 'EUR')).toBe('1234.50 EUR');
    expect(formatAmount(0)).toBe('0.00');
  });

  it('resolves the previous calendar month, including across a year boundary', () => {
    expect(previousMonth('2026-09-07')).toEqual({ start: '2026-08-01', end: '2026-08-31' });
    expect(previousMonth('2026-01-15')).toEqual({ start: '2025-12-01', end: '2025-12-31' });
    expect(previousMonth('2026-03-10')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('resolves the previous calendar quarter', () => {
    expect(previousQuarter('2026-09-07')).toEqual({ start: '2026-04-01', end: '2026-06-30' });
    expect(previousQuarter('2026-02-01')).toEqual({ start: '2025-10-01', end: '2025-12-31' });
  });

  it('prefers explicit window arguments over the fallback', () => {
    const fallback = { start: '2026-08-01', end: '2026-08-31' };
    expect(resolveWindow('2026-01-01', '2026-01-31', fallback)).toEqual({
      start_date: '2026-01-01',
      end_date: '2026-01-31',
    });
    expect(resolveWindow(undefined, undefined, fallback)).toEqual({
      start_date: '2026-08-01',
      end_date: '2026-08-31',
    });
  });

  it('renders a copy-pasteable tool call', () => {
    expect(toolCall('holded_sales', { action: 'list', type: 'invoice' })).toBe(
      "holded_sales({ action: 'list', type: 'invoice' })"
    );
    expect(toolCall('holded_treasury', { action: 'reconcile', confirm: true })).toBe(
      "holded_treasury({ action: 'reconcile', confirm: true })"
    );
  });

  it('builds a single user message from lines', () => {
    const result = userMessage(['first', 'second']);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.role).toBe('user');
    expect(result.messages[0]!.content.text).toBe('first\nsecond');
  });

  it('reads today from the injected clock', () => {
    expect(today({ now: () => new Date('2026-09-07T10:30:00Z') })).toBe('2026-09-07');
  });

  it('reports a failed pre-read instead of throwing', async () => {
    const failed = await preRead('the invoices', async () => {
      throw new Error('403 Access denied');
    });
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.message).toContain('the invoices');
      expect(failed.message).toContain('403 Access denied');
    }
  });

  it('returns the value on a successful pre-read', async () => {
    const ok = await preRead('the invoices', async () => [1, 2, 3]);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value).toEqual([1, 2, 3]);
  });
});
