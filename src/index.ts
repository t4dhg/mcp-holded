#!/usr/bin/env node
/**
 * Entry point for @t4dhg/mcp-holded.
 */
import { main } from './tools/index.js';

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error(`[mcp-holded] fatal: ${message}`);
  process.exit(1);
});

export { createServer } from './tools/index.js';
