/**
 * Shared stubs for the `window.accomplish` bridge in renderer tests.
 *
 * The Zustand stores register their IPC subscriptions at module load, so any
 * test that resets modules and renders a store-backed component needs every
 * event channel to exist. Keeping the list here means new channels only have
 * to be added once instead of in every suite.
 */

import { vi } from 'vitest';

export const ACCOMPLISH_EVENT_SUBSCRIPTIONS = [
  'onAuthError',
  'onBrowserFrame',
  'onBrowserNavigate',
  'onBrowserStatus',
  'onCloseRequested',
  'onDaemonDisconnected',
  'onDaemonReconnectFailed',
  'onDaemonReconnected',
  'onDebugLog',
  'onHuggingFaceDownloadProgress',
  'onPermissionRequest',
  'onStatusChanged',
  'onTaskProgress',
  'onTaskStatusChange',
  'onTaskSummary',
  'onTaskUpdate',
  'onTaskUpdateBatch',
  'onThemeChange',
  'onTodoUpdate',
  'onWhatsAppQR',
  'onWhatsAppStatus',
  'onWorkspaceChanged',
] as const;

export type AccomplishEventSubscription = (typeof ACCOMPLISH_EVENT_SUBSCRIPTIONS)[number];

/** No-op subscribe functions that return an unsubscribe callback. */
export function accomplishEventStubs(): Record<AccomplishEventSubscription, () => () => void> {
  const stubs = {} as Record<AccomplishEventSubscription, () => () => void>;
  for (const channel of ACCOMPLISH_EVENT_SUBSCRIPTIONS) {
    stubs[channel] = vi.fn().mockReturnValue(() => {});
  }
  return stubs;
}

/** Bridge members that are called unconditionally but rarely asserted on. */
export function accomplishBaseStubs() {
  return {
    ...accomplishEventStubs(),
    daemonPing: vi.fn().mockResolvedValue({ status: 'ok', uptime: 0 }),
    getBuildCapabilities: vi.fn().mockResolvedValue({ hasFreeMode: true, hasAnalytics: false }),
  };
}

const NON_BRIDGE_KEYS = new Set(['then', 'toJSON', 'constructor', 'prototype']);

/**
 * Fill in bridge members a test does not care about.
 *
 * Panels like Integrations mount a dozen connector cards, each with its own
 * `get*`/`set*` bridge call. Asserting every one in every suite is noise, so
 * unknown members resolve to `undefined` instead of throwing.
 */
export function withUnknownBridgeStubs<T extends object>(api: T): T {
  return new Proxy(api, {
    get(target, prop, receiver) {
      if (typeof prop === 'symbol' || NON_BRIDGE_KEYS.has(prop)) {
        return Reflect.get(target, prop, receiver);
      }
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }
      const stub = vi.fn().mockResolvedValue(undefined);
      (target as Record<string, unknown>)[prop] = stub;
      return stub;
    },
  });
}
