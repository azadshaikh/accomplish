import { describe, it, expect } from 'vitest';
import { formatSessionErrorMessage } from '../../../src/opencode/session-error.js';

describe('formatSessionErrorMessage', () => {
  it('falls back to the generic message when the payload is absent', () => {
    expect(formatSessionErrorMessage(undefined)).toBe('Session error');
    expect(formatSessionErrorMessage(null)).toBe('Session error');
  });

  it('reads the message from the SDK error payload, not the top level', () => {
    // Every SDK variant nests the reason under `data`; the old handler read
    // `error.message` and therefore always produced "Session error".
    expect(formatSessionErrorMessage({ name: 'UnknownError', data: { message: 'boom' } })).toBe(
      'boom',
    );
  });

  it('names the provider for ProviderAuthError and points at settings', () => {
    const message = formatSessionErrorMessage({
      name: 'ProviderAuthError',
      data: { providerID: 'custom', message: 'Unauthorized' },
    });

    expect(message).toContain('Custom Endpoint');
    expect(message).toContain('Unauthorized');
    expect(message).toContain('Settings → Providers');
  });

  it('reports the HTTP status for APIError', () => {
    const message = formatSessionErrorMessage(
      {
        name: 'APIError',
        data: { message: 'Unauthorized', statusCode: 401, isRetryable: false },
      },
      { providerId: 'custom' },
    );

    expect(message).toContain('Unauthorized');
    expect(message).toContain('HTTP 401');
    expect(message).toContain('Custom Endpoint');
  });

  it('does not repeat the provider when the payload lacks a provider id', () => {
    const message = formatSessionErrorMessage(
      { name: 'APIError', data: { message: 'Service Unavailable', statusCode: 503 } },
      { providerId: 'openai' },
    );

    expect(message).toBe(
      'OpenAI rejected the request: Service Unavailable (HTTP 503). Check the API key for OpenAI in Settings → Providers.',
    );
  });

  it('keeps the error name when there is no message at all', () => {
    expect(formatSessionErrorMessage({ name: 'MessageOutputLengthError', data: {} })).toBe(
      'MessageOutputLengthError',
    );
  });
});
