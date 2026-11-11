/**
 * Formats the `error` payload of an OpenCode `session.error` event into a
 * message a user can act on.
 *
 * The SDK models every variant as `{ name, data: { message, ... } }`
 * (`EventSessionError` in `@opencode-ai/sdk`): `ProviderAuthError` carries
 * `data.providerID`, `APIError` carries `data.statusCode`. Reading
 * `error.message` yields `undefined` for all of them, which is why every
 * provider failure used to surface as the literal string "Session error" —
 * including the 401 that a missing custom-provider key produces.
 */

import { DEFAULT_PROVIDERS } from '../common/types/provider.js';

export interface SessionErrorLike {
  name?: string;
  message?: string;
  data?: {
    message?: string;
    statusCode?: number;
    providerID?: string;
  };
}

export interface SessionErrorContext {
  /** Provider the adapter is currently talking to (`custom`, `anthropic`, …). */
  providerId?: string | null;
}

/** Provider ids that are not part of DEFAULT_PROVIDERS but do have a UI name. */
const EXTRA_PROVIDER_LABELS: Record<string, string> = {
  custom: 'Custom Endpoint',
  openrouter: 'OpenRouter',
  'zai-coding-plan': 'Z.AI Coding Plan',
  'amazon-bedrock': 'Amazon Bedrock',
  litellm: 'LiteLLM',
  nim: 'NVIDIA NIM',
  lmstudio: 'LM Studio',
  ollama: 'Ollama',
};

function providerLabel(providerId: string | null | undefined): string | undefined {
  if (!providerId) {
    return undefined;
  }
  return (
    EXTRA_PROVIDER_LABELS[providerId] ??
    DEFAULT_PROVIDERS.find((provider) => provider.id === providerId)?.name ??
    providerId
  );
}

function settingsHint(providerId: string | null | undefined): string {
  const label = providerLabel(providerId);
  return label
    ? `Check the API key for ${label} in Settings → Providers.`
    : 'Check the provider API key in Settings → Providers.';
}

export function formatSessionErrorMessage(
  error: SessionErrorLike | null | undefined,
  context: SessionErrorContext = {},
): string {
  if (!error || typeof error !== 'object') {
    return 'Session error';
  }

  const name = typeof error.name === 'string' ? error.name : '';
  const data = error.data ?? {};
  const detail = [data.message, error.message].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  const statusCode = typeof data.statusCode === 'number' ? data.statusCode : undefined;
  const providerId = data.providerID ?? context.providerId ?? null;
  const label = providerLabel(providerId);

  if (name === 'ProviderAuthError') {
    const message = detail ?? 'Provider credentials are missing or invalid';
    return [
      label
        ? `Provider authentication failed for ${label}: ${message}.`
        : `Provider authentication failed: ${message}.`,
      settingsHint(providerId),
    ].join(' ');
  }

  if (statusCode !== undefined) {
    const reason = detail ?? (statusCode === 401 ? 'Unauthorized' : `HTTP ${statusCode}`);
    const prefix = label ? `${label} rejected the request: ` : '';
    return `${prefix}${reason} (HTTP ${statusCode}). ${settingsHint(providerId)}`;
  }

  if (detail) {
    return detail;
  }

  return name || 'Session error';
}
