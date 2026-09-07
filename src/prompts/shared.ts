/**
 * Shared pieces for the prompts.
 *
 * A prompt here follows one shape: resolve the arguments, pre-read the facts
 * through the API layer, and return a single user message containing the
 * report, what to do with it, and the exact tool calls to make. Prompts do not
 * write. A prompt that wants a write emits the gated call for a person to
 * approve.
 */
import type { DocumentSummary } from '../schemas/index.js';

/** Injected clock. Tests pass a fixed date; the server uses the wall clock. */
export interface PromptDeps {
  now?: () => Date;
}

/** Read caps. A prompt must not hang on a large account. */
export const PRE_READ_LIMIT = 200;

export const READ_ONLY_NOTICE =
  'This prompt has written nothing and must write nothing. Report only. If a change is needed, make the tool call shown above so the person can approve it.';

export function today(deps: PromptDeps = {}): string {
  const now = (deps.now ?? (() => new Date()))();
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function lastDayOfMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function previousMonth(todayIso: string): { start: string; end: string } {
  const [year, month] = todayIso.split('-').map(Number) as [number, number, number];
  const m = month === 1 ? 12 : month - 1;
  const y = month === 1 ? year - 1 : year;
  return { start: toIso(y, m, 1), end: toIso(y, m, lastDayOfMonth(y, m)) };
}

export function previousQuarter(todayIso: string): { start: string; end: string } {
  const [year, month] = todayIso.split('-').map(Number) as [number, number, number];
  const currentQuarter = Math.floor((month - 1) / 3); // 0..3
  const previous = currentQuarter === 0 ? 3 : currentQuarter - 1;
  const y = currentQuarter === 0 ? year - 1 : year;
  const startMonth = previous * 3 + 1;
  const endMonth = startMonth + 2;
  return {
    start: toIso(y, startMonth, 1),
    end: toIso(y, endMonth, lastDayOfMonth(y, endMonth)),
  };
}

export function resolveWindow(
  start: string | undefined,
  end: string | undefined,
  fallback: { start: string; end: string }
): { start_date: string; end_date: string } {
  return {
    start_date: start ?? fallback.start,
    end_date: end ?? fallback.end,
  };
}

export function userMessage(lines: string[]): {
  messages: { role: 'user'; content: { type: 'text'; text: string } }[];
} {
  return {
    messages: [{ role: 'user', content: { type: 'text', text: lines.join('\n') } }],
  };
}

/** Render arguments the way a caller would type them, so the line is copy-pasteable. */
export function toolCall(tool: string, args: Record<string, unknown>): string {
  const body = Object.entries(args)
    .map(
      ([key, value]) =>
        `${key}: ${typeof value === 'string' ? `'${value}'` : JSON.stringify(value)}`
    )
    .join(', ');
  return `${tool}({ ${body} })`;
}

/**
 * Parse a Holded amount string to a number, for report aggregation only.
 *
 * Documents and salary records use a comma decimal separator ("63500,00");
 * payments, treasury and accounting use a dot ("8.3"). Thousands separators
 * appear in the comma convention, so the last separator wins. Never feed the
 * result back to the API: the server sends amounts through unchanged so
 * nothing is rounded.
 */
export function parseAmount(value: string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const raw = String(value).trim();
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  let normalised: string;
  if (lastComma === -1 && lastDot === -1) {
    normalised = raw;
  } else if (lastComma > lastDot) {
    // Comma is the decimal separator; dots are thousands separators.
    normalised = raw.replace(/\./g, '').replace(',', '.');
  } else {
    // Dot is the decimal separator; commas are thousands separators.
    normalised = raw.replace(/,/g, '');
  }
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Unpaid remainder on a document.
 *
 * `payments_pending` is `NullableAmount.optional()` on `DocumentSummary`
 * (src/schemas/documents.ts), so it may be ABSENT from a response. This
 * codebase has repeatedly been bitten by exactly one defect class:
 * conflating a field that is absent with a field that is zero or false.
 * Three prompts used to implement this arithmetic separately, and two of
 * them got the absent case wrong by defaulting it to zero or to the whole
 * total. Zero understates what is owed and hides a wholly unpaid, badly
 * overdue invoice from a checklist; the whole total overstates it and
 * double-counts a part-paid invoice. Neither is safe to guess, so when the
 * figure is absent it is derived instead: total less what was paid, which is
 * the same arithmetic Holded's own summary would do, clamped so it never
 * goes negative (more paid than billed is a data problem elsewhere, not a
 * negative debt). Every caller that needs "how much is still owed on this
 * document" must go through this one function rather than reimplementing it,
 * so the absent case is handled exactly once, correctly, in one place.
 */
export function unpaidRemainder(doc: DocumentSummary): number {
  if (doc.payments_pending != null) return parseAmount(doc.payments_pending);
  const derived = parseAmount(doc.total) - parseAmount(doc.payments_total ?? null);
  return derived > 0 ? derived : 0;
}

/** True when a document's unpaid remainder came from derivation rather than the API. */
export function remainderWasDerived(doc: DocumentSummary): boolean {
  return doc.payments_pending == null;
}

export function formatAmount(value: number, currency?: string): string {
  const fixed = value.toFixed(2);
  return currency ? `${fixed} ${currency}` : fixed;
}

/**
 * Run a bounded pre-read, reporting failure rather than throwing.
 *
 * A prompt whose pre-read throws gives the caller a stack trace instead of a
 * workflow. Returning the failure lets the prompt still say what it wanted to
 * do and which tool call would do it.
 */
export async function preRead<T>(
  label: string,
  read: () => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; message: string }> {
  try {
    return { ok: true, value: await read() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message: `Could not read ${label}: ${message}\n\nA bad or revoked v2 token returns 403, not 401. Check HOLDED_API_KEY.`,
    };
  }
}
