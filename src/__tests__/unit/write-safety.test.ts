import { describe, it, expect } from 'vitest';
import {
  OPERATION_POLICIES,
  OperationRisk,
  gatedOperations,
  getWarningMessage,
  isGated,
} from '../../write-safety.js';
import { checkConfirmation } from '../../tools/shared.js';

describe('write-safety policies', () => {
  it('gates every delete, update, approve, cancel, send and reconcile operation', () => {
    for (const [name, policy] of Object.entries(OPERATION_POLICIES)) {
      if (
        /^(delete|update|approve|cancel|send|reconcile|bulk|archive|skip|disable|move)_/.test(name)
      ) {
        expect(policy.requiresConfirmation, `${name} should be gated`).toBe(true);
      }
    }
  });

  it('leaves plain creates open', () => {
    expect(isGated('create_contact')).toBe(false);
    expect(isGated('create_payment')).toBe(false);
    expect(isGated('record_document_payment')).toBe(false);
  });

  it('marks irreversible bulk operations as critical', () => {
    expect(OPERATION_POLICIES.bulk_delete_invoices.risk).toBe(OperationRisk.CRITICAL);
    expect(OPERATION_POLICIES.delete_document.risk).toBe(OperationRisk.CRITICAL);
  });

  it('has an impact description for every policy', () => {
    for (const [name, policy] of Object.entries(OPERATION_POLICIES)) {
      expect(policy.impactDescription.length, name).toBeGreaterThan(10);
    }
  });

  it('lists a stable set of gated operations', () => {
    expect(gatedOperations().length).toBeGreaterThanOrEqual(60);
  });

  it('checkConfirmation blocks without confirm and passes with it', () => {
    const blocked = checkConfirmation('delete_contact');
    expect(blocked.needsConfirmation).toBe(true);
    if (blocked.needsConfirmation) {
      expect(blocked.message).toContain('Nothing has been sent');
      expect(blocked.message).toContain('confirm: true');
    }
    expect(checkConfirmation('delete_contact', true)).toEqual({ needsConfirmation: false });
    expect(checkConfirmation('create_contact')).toEqual({ needsConfirmation: false });
    expect(getWarningMessage('approve_document')).toMatch(/Verifactu/);
  });
});
