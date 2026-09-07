/**
 * holded_bank_reconciliation: propose matches between bank movements and
 * recorded payments, and report what is unmatched either way.
 *
 * Reconciling is gated, so this prompt proposes and the person approves. The
 * matcher is deliberately conservative: matching magnitude, agreeing
 * direction, booked within a few days, and a payment can only be claimed
 * once. A wrong automatic match is worse than an unmatched pair a human
 * resolves.
 *
 * Movements carry a SIGNED amount and their own currency; a negative amount
 * is money leaving the account. Payments carry an UNSIGNED amount, no
 * currency, and their direction in `type`: `payment` is money out,
 * `collection` is money in. Comparing the raw amounts directly would mean an
 * outgoing movement could never match its payment, so matching goes on
 * magnitude with an explicit direction check instead. A payment whose type is
 * neither `payment` nor `collection` is never auto-matched, because guessing
 * its direction could pair a refund with a receipt.
 *
 * A payment Holded already marks `reconciliation_status: 'reconciled'` is
 * excluded entirely, from both the candidate pool and the unmatched list,
 * since proposing it again is noise. Movements can be partially reconciled,
 * so they are never excluded; their `reconciled_amount` is shown instead so a
 * person can see what is already done.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api/index.js';
import type { BankMovement } from '../schemas/index.js';
import type { Payment } from '../schemas/index.js';
import {
  PRE_READ_LIMIT,
  READ_ONLY_NOTICE,
  formatAmount,
  parseAmount,
  preRead,
  previousMonth,
  resolveWindow,
  today,
  toolCall,
  userMessage,
  type PromptDeps,
} from './shared.js';

const MATCH_WINDOW_DAYS = 4;
const AMOUNT_TOLERANCE = 0.01;

type Direction = 'in' | 'out';

/** A negative movement is money leaving the account. */
function movementDirection(movement: BankMovement): Direction {
  return parseAmount(movement.amount) < 0 ? 'out' : 'in';
}

/**
 * Payments carry their direction in `type` rather than in the sign of the
 * amount: `payment` is money out, `collection` is money in. An unrecognised
 * type returns null, and such a payment is never auto-matched, because
 * guessing a direction can pair a refund with a receipt.
 */
function paymentDirection(payment: Payment): Direction | null {
  if (payment.type === 'payment') return 'out';
  if (payment.type === 'collection') return 'in';
  return null;
}

function magnitude(value: string | null | undefined): number {
  return Math.abs(parseAmount(value));
}

/** Formatted reconciled amount for a movement, blank when there is none. */
function reconciledDisplay(movement: BankMovement): string {
  if (movement.reconciled_amount == null || movement.reconciled_amount === '') return '';
  return formatAmount(parseAmount(movement.reconciled_amount), movement.currency);
}

function dayDistance(a: string | null | undefined, b: string | null | undefined): number {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const left = Date.parse(a.slice(0, 10));
  const right = Date.parse(b.slice(0, 10));
  if (Number.isNaN(left) || Number.isNaN(right)) return Number.POSITIVE_INFINITY;
  return Math.abs(left - right) / 86_400_000;
}

export function matchMovements(
  movements: BankMovement[],
  payments: Payment[]
): {
  matched: { movement: BankMovement; payment: Payment }[];
  unmatchedMovements: BankMovement[];
  unmatchedPayments: Payment[];
} {
  const claimed = new Set<string>();
  const matched: { movement: BankMovement; payment: Payment }[] = [];
  const unmatchedMovements: BankMovement[] = [];

  for (const movement of movements) {
    const target = magnitude(movement.amount);
    const wanted = movementDirection(movement);
    const candidate = payments
      .filter(p => p.reconciliation_status !== 'reconciled')
      .filter(p => !claimed.has(p.id))
      .filter(p => paymentDirection(p) === wanted)
      .filter(p => Math.abs(magnitude(p.amount) - target) <= AMOUNT_TOLERANCE)
      .filter(
        p => dayDistance(movement.booking_date ?? movement.value_date, p.date) <= MATCH_WINDOW_DAYS
      )
      .sort(
        (a, b) =>
          dayDistance(movement.booking_date ?? movement.value_date, a.date) -
          dayDistance(movement.booking_date ?? movement.value_date, b.date)
      )[0];

    if (candidate) {
      claimed.add(candidate.id);
      matched.push({ movement, payment: candidate });
    } else {
      unmatchedMovements.push(movement);
    }
  }

  return {
    matched,
    unmatchedMovements,
    unmatchedPayments: payments.filter(
      p => !claimed.has(p.id) && p.reconciliation_status !== 'reconciled'
    ),
  };
}

export function registerReconciliationPrompt(server: McpServer, deps: PromptDeps = {}): void {
  server.registerPrompt(
    'holded_bank_reconciliation',
    {
      title: 'Reconcile a bank period',
      description:
        'Match bank movements against recorded payments for a period and report what is ' +
        'unmatched in both directions. Read-only; emits the gated reconcile calls to approve. ' +
        'Defaults to the previous month.',
      argsSchema: {
        start_date: z.string().optional().describe('Start YYYY-MM-DD (default: previous month)'),
        end_date: z.string().optional().describe('End YYYY-MM-DD (default: previous month)'),
        account_id: z
          .string()
          .optional()
          .describe('Treasury account id. Resolved automatically if the account has only one.'),
      },
    },
    async ({ start_date, end_date, account_id }) => {
      const window = resolveWindow(start_date, end_date, previousMonth(today(deps)));

      let accountId = account_id;
      if (!accountId) {
        const accounts = await preRead('the treasury accounts', () =>
          api.listTreasuryAccounts({ archived: false })
        );
        if (!accounts.ok) {
          return userMessage([
            `Reconcile ${window.start_date} to ${window.end_date}.`,
            '',
            accounts.message,
            '',
            `Retry with ${toolCall('holded_treasury', { action: 'list_accounts' })}.`,
          ]);
        }
        const banks = accounts.value.items.filter(a => !a.archived);
        const [onlyBank, ...otherBanks] = banks;
        if (onlyBank && otherBanks.length === 0) {
          accountId = onlyBank.id;
        } else {
          return userMessage([
            `Reconcile ${window.start_date} to ${window.end_date}.`,
            '',
            banks.length === 0
              ? 'This account has no active treasury accounts, so there is nothing to reconcile.'
              : 'This Holded account has more than one active treasury account, so tell the person to pick one rather than choosing for them:',
            '',
            ...banks.map(
              a =>
                `- \`${a.id}\` ${a.name} (${a.type}, balance ${formatAmount(parseAmount(a.balance), a.currency)})`
            ),
            '',
            `Then run this prompt again with \`account_id\`, or call ${toolCall('holded_treasury', { action: 'list_movements', id: '<account_id>', start_date: window.start_date, end_date: window.end_date })}.`,
          ]);
        }
      }

      const movements = await preRead('the bank movements', () =>
        api.listBankMovements(accountId, {
          start_date: window.start_date,
          end_date: window.end_date,
          limit: PRE_READ_LIMIT,
        })
      );
      const payments = await preRead('the payments', () =>
        api.listPayments({
          start_date: window.start_date,
          end_date: window.end_date,
          limit: PRE_READ_LIMIT,
        })
      );

      if (!movements.ok || !payments.ok) {
        return userMessage([
          `Reconcile account ${accountId} from ${window.start_date} to ${window.end_date}.`,
          '',
          ...(movements.ok ? [] : [movements.message]),
          ...(payments.ok ? [] : [payments.message]),
          '',
          'Say which read failed and stop. Do not report partial reconciliation figures.',
        ]);
      }

      const result = matchMovements(movements.value.items, payments.value.items);
      const truncated = movements.value.has_more || payments.value.has_more;

      return userMessage([
        `Reconcile treasury account ${accountId} from ${window.start_date} to ${window.end_date}.`,
        '',
        truncated
          ? `Data read: the first ${movements.value.items.length} movements and ${payments.value.items.length} payments. There are more, so this is a partial reconciliation.`
          : `Data read: all ${movements.value.items.length} movements and ${payments.value.items.length} payments in the window.`,
        '',
        `### Proposed matches (${result.matched.length})`,
        '',
        result.matched.length === 0
          ? '_None._'
          : [
              '| Movement | Date | Amount | Reconciled | Payment | Payment date | Contact |',
              '| --- | --- | --- | --- | --- | --- | --- |',
              ...result.matched.map(
                m =>
                  `| \`${m.movement.id}\` | ${m.movement.booking_date ?? ''} | ${formatAmount(parseAmount(m.movement.amount), m.movement.currency)} | ${reconciledDisplay(m.movement)} | \`${m.payment.id}\` | ${m.payment.date} | ${m.payment.contact_name ?? ''} |`
              ),
            ].join('\n'),
        '',
        `### Bank movements with no candidate payment (${result.unmatchedMovements.length})`,
        '',
        result.unmatchedMovements.length === 0
          ? '_None._'
          : result.unmatchedMovements
              .map(
                m =>
                  `- \`${m.id}\` ${m.booking_date ?? ''} ${formatAmount(parseAmount(m.amount), m.currency)}${reconciledDisplay(m) ? ` (reconciled so far: ${reconciledDisplay(m)})` : ''} ${m.description ?? ''}`
              )
              .join('\n'),
        '',
        `### Payments with no candidate movement (${result.unmatchedPayments.length})`,
        '',
        result.unmatchedPayments.length === 0
          ? '_None._'
          : result.unmatchedPayments
              .map(
                p =>
                  `- \`${p.id}\` ${p.date} ${formatAmount(magnitude(p.amount))} ${p.contact_name ?? ''}`
              )
              .join('\n'),
        '',
        'Do this:',
        `1. Read the Data read line first. Say if this is partial before any figure.`,
        `2. Present the proposed matches and say the rule used: matching magnitude, agreeing direction (a negative movement pairs only with a payment of type \`payment\`, a positive movement only with type \`collection\`), booked within ${MATCH_WINDOW_DAYS} days, each payment claimed at most once, and a payment Holded already marked reconciled is left out entirely.`,
        '3. List the unmatched items on both sides. These are the work: an unmatched movement usually means a payment was never recorded, and an unmatched payment usually means the bank feed has not arrived, the amount differs, or its direction did not match any movement.',
        '4. Ask the person to confirm the matches before anything is written.',
        '',
        'Reconciling is gated. For each match the person approves, make this call, one movement at a time:',
        '',
        `${toolCall('holded_treasury', { action: 'reconcile', id: accountId, movement_id: '<movement_id>', confirm: true })} with \`data: { documents: [{ id: '<document_id>', amount: '<amount>' }] }\`.`,
        '',
        'Treasury amounts use a dot decimal separator. See `holded://guide/api-behaviour`.',
        '',
        READ_ONLY_NOTICE,
      ]);
    }
  );
}
