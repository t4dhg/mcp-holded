/**
 * The gate list as a resource, generated from the policy table.
 *
 * Hand-writing this list would create a second copy that drifts. The one in
 * write-safety.ts is the source of truth, the README is already tested against
 * it by confirmation-coverage.test.ts, and this resource is tested against it
 * too.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  OPERATION_POLICIES,
  gatedOperations,
  isGated,
  type OperationName,
} from '../write-safety.js';

export const IRREVERSIBLE_URI = 'holded://guide/irreversible-operations';

const PREAMBLE = `# Operations that require confirmation

Every operation below deletes, overwrites, locks or emails something. Calling one without \`confirm: true\` sends nothing: the tool returns what it would have done. The same call with \`confirm: true\` proceeds.

## Read this before approving a sales document

\`holded_sales({ action: 'approve' })\` assigns the document its legal invoice number. Under **Verifactu**, Spain's invoicing regime, an issued invoice is part of an immutable, chained record. Approving **cannot be undone**. Correcting an approved invoice means issuing a credit note (\`credit_note\`, factura rectificativa), not editing or deleting the original. Treat approve as the point of no return, and confirm the contact, the lines, the taxes and the numbering series before it.

\`holded_sales({ action: 'send' })\` emails the customer. That is also not undoable.

## The gate list

`;

export function buildIrreversibleGuide(): string {
  const rows = gatedOperations()
    .map(
      name =>
        `| \`${name}\` | ${OPERATION_POLICIES[name].risk} | ${OPERATION_POLICIES[name].impactDescription} |`
    )
    .join('\n');

  const ungated = (Object.keys(OPERATION_POLICIES) as OperationName[])
    .filter(name => !isGated(name))
    .map(name => `\`${name}\``)
    .join(', ');

  return `${PREAMBLE}| Operation | Risk | Effect |
| --- | --- | --- |
${rows}

## Writes that are not gated

These create or add rather than overwrite or destroy, so they proceed without \`confirm\`. They still change your Holded account.

${ungated}
`;
}

export function registerIrreversibleResource(server: McpServer): void {
  server.registerResource(
    'irreversible_operations_guide',
    IRREVERSIBLE_URI,
    {
      title: 'Operations that require confirmation',
      description:
        'Every gated operation with its risk and effect, generated from the policy table so it ' +
        'cannot drift, plus why approving a sales document is irreversible under Verifactu.',
      mimeType: 'text/markdown',
    },
    uri => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: buildIrreversibleGuide() }],
    })
  );
}
