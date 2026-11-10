import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getApiKey, getBaseUrl, getConfig } from '../../config.js';
import { ConfigurationError } from '../../errors.js';

describe('config', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('fails without an API key', () => {
    vi.stubEnv('HOLDED_API_KEY', '');
    expect(() => getApiKey()).toThrow(ConfigurationError);
  });

  it('rejects a classic v1 key with a v2 explanation', () => {
    vi.stubEnv('HOLDED_API_KEY', '0123456789abcdef0123456789abcdef');
    expect(() => getApiKey()).toThrow(/pat_/);
  });

  it('accepts a pat_ token', () => {
    vi.stubEnv('HOLDED_API_KEY', 'pat_abc_def');
    expect(getApiKey()).toBe('pat_abc_def');
  });

  it('defaults the base URL and strips trailing slashes from an override', () => {
    vi.stubEnv('HOLDED_BASE_URL', '');
    expect(getBaseUrl()).toBe('https://api.holded.com/api/v2');
    vi.stubEnv('HOLDED_BASE_URL', 'https://example.test/v2///');
    expect(getBaseUrl()).toBe('https://example.test/v2');
  });

  it.each([
    'https://fixture-user:fixture-value@example.test/v2',
    'https://example.test/v2?mode=test',
    'https://example.test/v2#section',
    'file:///tmp/holded',
  ])('rejects invalid base URL overrides without echoing them', override => {
    vi.stubEnv('HOLDED_BASE_URL', override);
    expect(() => getBaseUrl()).toThrow(
      /^HOLDED_BASE_URL must be an HTTP\(S\) URL without credentials, a query, or a fragment\.$/
    );
  });

  it('reads numeric settings and rejects garbage', () => {
    vi.stubEnv('HOLDED_API_KEY', 'pat_x_y');
    vi.stubEnv('HOLDED_TIMEOUT_MS', '5000');
    vi.stubEnv('HOLDED_MAX_RETRIES', '1');
    expect(getConfig()).toMatchObject({ timeout: 5000, maxRetries: 1 });
    vi.stubEnv('HOLDED_MAX_RETRIES', 'lots');
    expect(() => getConfig()).toThrow(ConfigurationError);
  });
});
