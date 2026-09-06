/**
 * Shared schema primitives.
 *
 * Holded returns every monetary value as a string. Documents, document lines
 * and salary records use a comma decimal separator ("63500,00"); payments,
 * treasury, bank movements, accounting accounts and ledger entries use a dot
 * ("8.3", "0.00"). Both are accepted and neither is converted: an accounting
 * tool must not round.
 */
import { z } from 'zod';

export const Id = z.string().min(1);
export const NullableId = Id.nullable();

export const Amount = z.string().regex(/^-?\d+([.,]\d+)?$/, 'decimal string expected');
export const NullableAmount = Amount.nullable();

export const NullableString = z.string().nullable();
export const OptionalNullableString = z.string().nullable().optional();
export const StringList = z.array(z.string());
export const UnknownList = z.array(z.unknown());

/** ISO date "2026-08-20" or ISO datetime with offset. */
export const IsoDate = z.string();

export const CustomField = z.looseObject({
  field: z.string(),
  value: z.unknown(),
});

/** Address as returned on contacts, warehouses and employees. */
export const Address = z.looseObject({
  address: NullableString.optional(),
  city: NullableString.optional(),
  postal_code: NullableString.optional(),
  province: NullableString.optional(),
  country: NullableString.optional(),
  country_code: NullableString.optional(),
  info: NullableString.optional(),
});

/** Holded returns `{ id }` (201) for every create and `{ id }` or nothing for updates. */
export const IdResponse = z.looseObject({ id: Id });
export type IdResponse = z.infer<typeof IdResponse>;

/** Used for endpoints whose payload is opaque or undocumented (project summary, employee contract). */
export const AnyRecord = z.record(z.string(), z.unknown());
