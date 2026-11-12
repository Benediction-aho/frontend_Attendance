/** Browser / platform detection used only for guidance messages (never for security). */

export type InAppBrowser = 'whatsapp' | 'facebook' | 'instagram' | 'other' | null;

export function detectInAppBrowser(ua = globalThis.navigator?.userAgent ?? ''): InAppBrowser {
  if (/WhatsApp/i.test(ua)) return 'whatsapp';
  if (/FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(ua)) return 'facebook';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/\bLine\/|Snapchat|TikTok|musical_ly|LinkedInApp|Twitter/i.test(ua)) return 'other';
  // Android WebView ("; wv)") used by many apps to open links.
  if (/Android/.test(ua) && /; wv\)/.test(ua)) return 'other';
  return null;
}

export const IN_APP_NAME: Record<Exclude<InAppBrowser, null>, string> = {
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  instagram: 'Instagram',
  other: 'this app',
};

export type Platform = 'ios' | 'android' | 'desktop';

export function detectPlatform(ua = globalThis.navigator?.userAgent ?? ''): Platform {
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  // iPadOS reports a Mac user agent with touch support.
  if (/Macintosh/.test(ua) && (globalThis.navigator?.maxTouchPoints ?? 0) > 1) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/** On iPhone only Safari can add a web app to the Home Screen (iOS < 16.4). */
export function isIosSafari(ua = globalThis.navigator?.userAgent ?? ''): boolean {
  return (
    detectPlatform(ua) === 'ios' && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) && !detectInAppBrowser(ua)
  );
}

export function isStandalone(): boolean {
  try {
    return (
      globalThis.matchMedia?.('(display-mode: standalone)').matches === true ||
      (globalThis.navigator as Navigator & { standalone?: boolean })?.standalone === true
    );
  } catch {
    return false;
  }
}

/** Message for a link opened inside WhatsApp / Facebook etc. */
export function inAppMessage(kind: Exclude<InAppBrowser, null>, platform: Platform): string {
  const where = IN_APP_NAME[kind];
  const target = platform === 'ios' ? 'Safari' : 'Chrome';
  return `You opened this page inside ${where}. Location and Face ID do not work here. Tap the menu (three dots or the share button) and choose "Open in ${target}", or copy the link into ${target}.`;
}
