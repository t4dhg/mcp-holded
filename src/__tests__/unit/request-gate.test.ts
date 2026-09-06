import { describe, it, expect } from 'vitest';
import { checkRawRequestConfirmation, isDestructiveRawCall } from '../../request-gate.js';

const base = 'https://api.holded.com/api/v2';

describe('holded_request gate', () => {
  it('lets GET and ordinary POST through', () => {
    expect(isDestructiveRawCall('GET', '/contacts')).toBe(false);
    expect(isDestructiveRawCall('POST', '/contacts')).toBe(false);
    expect(isDestructiveRawCall('POST', '/invoices/abc/payments')).toBe(false);
    expect(checkRawRequestConfirmation({ method: 'GET', path: '/contacts' }, base)).toEqual({
      proceed: true,
    });
  });

  it('gates DELETE, PUT and PATCH', () => {
    for (const method of ['DELETE', 'PUT', 'PATCH'] as const) {
      expect(isDestructiveRawCall(method, '/contacts/abc')).toBe(true);
      const r = checkRawRequestConfirmation({ method, path: '/contacts/abc' }, base);
      expect(r.proceed).toBe(false);
    }
  });

  it('gates destructive POST paths', () => {
    for (const path of [
      '/invoices/bulk/cancel',
      '/invoices/bulk/approve',
      '/contacts/bulk-delete',
      '/contacts/bulk-archive',
      '/invoices/abc/cancel',
      '/invoices/abc/approve',
      '/invoices/abc/send',
      '/treasury/accounts/abc/archive',
      '/treasury/accounts/a/bank-movements/b/reconcile',
      '/sales-orders/abc/ship',
      '/recurring-invoices/abc/skip',
      '/employees/abc/clock-out',
    ]) {
      expect(isDestructiveRawCall('POST', path), path).toBe(true);
    }
    expect(isDestructiveRawCall('POST', '/sendings')).toBe(false);
  });

  it('shows the exact request and sends nothing without confirm', () => {
    const r = checkRawRequestConfirmation(
      { method: 'DELETE', path: '/contacts/abc', query: { force: true, empty: '' } },
      base
    );
    expect(r.proceed).toBe(false);
    if (!r.proceed) {
      expect(r.message).toContain('DELETE https://api.holded.com/api/v2/contacts/abc?force=true');
      expect(r.message).toContain('permanently delete');
      expect(r.message).toContain('Nothing has been sent');
    }
    const put = checkRawRequestConfirmation(
      { method: 'PUT', path: '/contacts/abc', body: { name: 'X' } },
      base
    );
    if (!put.proceed) {
      expect(put.message).toContain('overwrite');
      expect(put.message).toContain('Body: {"name":"X"}');
    }
  });

  it('proceeds with confirm: true', () => {
    expect(
      checkRawRequestConfirmation({ method: 'DELETE', path: '/contacts/abc', confirm: true }, base)
    ).toEqual({ proceed: true });
  });
});
