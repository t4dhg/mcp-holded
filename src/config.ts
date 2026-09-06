/**
 * Configuration for the Holded v2 MCP server.
 *
 * Everything comes from environment variables so the MCP client config is the
 * single place a key lives. No .env loading: the server is launched by an MCP
 * client that passes `env` explicitly.
 */

import { ConfigurationError } from './errors.js';

export interface HoldedConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  debug: boolean;
}

export const DEFAULT_BASE_URL = 'https://api.holded.com/api/v2';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;

/**
 * The v2 API only accepts Personal Access Tokens, which look like
 * `pat_<id>_<secret>`. Classic v1 keys are 32 hex characters and are rejected
 * by v2 with a 403, which would otherwise be indistinguishable from a
 * permissions problem.
 */
export function getApiKey(): string {
  const apiKey = process.env.HOLDED_API_KEY;
  if (!apiKey) {
    throw new ConfigurationError(
      'HOLDED_API_KEY is not set. Create a Personal Access Token in Holded under Settings, Developers, API and pass it through the MCP client `env` block.'
    );
  }
  if (!apiKey.startsWith('pat_')) {
    throw new ConfigurationError(
      'HOLDED_API_KEY does not look like a v2 Personal Access Token (expected `pat_<id>_<secret>`). Classic v1 keys do not work against the v2 API.'
    );
  }
  return apiKey;
}

export function getBaseUrl(): string {
  return (process.env.HOLDED_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value < 0) {
    throw new ConfigurationError(`${name} must be a non-negative integer, got "${raw}".`);
  }
  return value;
}

export function getConfig(): HoldedConfig {
  return {
    apiKey: getApiKey(),
    baseUrl: getBaseUrl(),
    timeout: intFromEnv('HOLDED_TIMEOUT_MS', DEFAULT_TIMEOUT),
    maxRetries: intFromEnv('HOLDED_MAX_RETRIES', DEFAULT_MAX_RETRIES),
    debug: process.env.DEBUG === 'true',
  };
}

export function isDebugEnabled(): boolean {
  return process.env.DEBUG === 'true';
}

/** Debug logger: stderr only, and only when DEBUG=true. stdout is the MCP transport. */
export function debug(message: string, data?: unknown): void {
  if (!isDebugEnabled()) return;
  const suffix = data === undefined ? '' : ` ${JSON.stringify(data)}`;
  // eslint-disable-next-line no-console
  console.error(`[mcp-holded ${new Date().toISOString()}] ${message}${suffix}`);
}
