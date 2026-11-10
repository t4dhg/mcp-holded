import { describe, it, expect } from 'vitest';
import { checkRawRequestConfirmation } from '../../request-gate.js';

const base = 'https://api.holded.com/api/v2';

describe('holded_request gate', () => {
  it('lets GET through', () => {
    expect(checkRawRequestConfirmation({ method: 'GET', path: '/contacts' }, base)).toEqual({
      proceed: true,
    });
  });

  it('gates every write method regardless of the route', () => {
    for (const method of ['POST', 'DELETE', 'PUT', 'PATCH'] as const) {
      for (const path of ['/contacts', '/webhooks/abc/disable', '/inbox/abc/attach']) {
        expect(
          checkRawRequestConfirmation({ method, path }, base).proceed,
          `${method} ${path}`
        ).toBe(false);
      }
    }
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
      expect(put.message).toContain('change Holded data');
      expect(put.message).toContain('Body: {"name":"X"}');
    }
  });

  it('proceeds with confirm: true', () => {
    expect(
      checkRawRequestConfirmation({ method: 'DELETE', path: '/contacts/abc', confirm: true }, base)
    ).toEqual({ proceed: true });
  });
});
