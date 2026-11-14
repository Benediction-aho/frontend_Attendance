/**
 * Web Push: subscription of this browser, linked by the API to the device session.
 * On iPhone, push works only once the app is installed on the Home Screen (iOS 16.4+).
 */
import { api, ApiError } from './api';
import { getDeviceId } from './session';
import { b64urlToBuffer } from './webauthn';
import { detectPlatform, isStandalone } from './browser';

export type PushAvailability = 'ok' | 'needs_install' | 'unsupported' | 'denied';

export function pushAvailability(): PushAvailability {
  const hasApis =
    typeof globalThis.Notification !== 'undefined' &&
    'serviceWorker' in (globalThis.navigator ?? {}) &&
    'PushManager' in globalThis;
  if (detectPlatform() === 'ios' && !isStandalone()) return 'needs_install';
  if (!hasApis) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return 'ok';
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((r) => setTimeout(() => r(null), 5000)),
  ]);
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  try {
    const reg = await registration();
    return (await reg?.pushManager.getSubscription()) ?? null;
  } catch {
    return null;
  }
}

export type SubscribeResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'denied' | 'unsupported' | 'not_configured' | 'conflict' | 'failed';
      message: string;
    };

export const PUSH_MESSAGES = {
  denied:
    'Notifications are blocked for this app. On iPhone: Settings > Notifications > Attendance > Allow Notifications. On Android: Settings > Apps > Chrome (or the app) > Notifications.',
  unsupported:
    'This browser cannot receive notifications. Install the app on your Home Screen first.',
  not_configured: 'Notifications are not available yet. You will still see them in the app.',
  conflict:
    'This browser already receives notifications for another account on another phone. Sign out there first, or use your own phone.',
  failed: 'Notifications could not be turned on. Please try again.',
} as const;

/** Asks the permission (must be called from a tap), subscribes and saves the subscription. */
export async function enablePush(): Promise<SubscribeResult> {
  const avail = pushAvailability();
  if (avail === 'denied') return { ok: false, reason: 'denied', message: PUSH_MESSAGES.denied };
  if (avail !== 'ok')
    return { ok: false, reason: 'unsupported', message: PUSH_MESSAGES.unsupported };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted')
    return { ok: false, reason: 'denied', message: PUSH_MESSAGES.denied };
  try {
    const { public_key } = await api.get<{ public_key: string | null }>('/push/public-key');
    if (!public_key)
      return { ok: false, reason: 'not_configured', message: PUSH_MESSAGES.not_configured };
    const reg = await registration();
    if (!reg) return { ok: false, reason: 'unsupported', message: PUSH_MESSAGES.unsupported };
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64urlToBuffer(public_key),
      }));
    await saveSubscription(sub);
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409 && e.code === 'push_endpoint_conflict')
      return { ok: false, reason: 'conflict', message: PUSH_MESSAGES.conflict };
    return { ok: false, reason: 'failed', message: PUSH_MESSAGES.failed };
  }
}

export async function saveSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  await api.post('/push/subscriptions', {
    endpoint: json.endpoint,
    keys: json.keys,
    content_encoding: 'aes128gcm',
    device_id: getDeviceId(),
  });
}

/** Re-sends an existing subscription after a sign-in (the server drops it on sign-out). */
export async function resyncPush(): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const sub = await currentSubscription();
  if (!sub) return;
  try {
    await saveSubscription(sub);
  } catch {
    // Shown again in the notification settings; never blocks the app.
  }
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  try {
    await api.request('/push/subscriptions', {
      method: 'DELETE',
      body: { endpoint: sub.endpoint },
    });
  } finally {
    await sub.unsubscribe().catch(() => false);
  }
}
