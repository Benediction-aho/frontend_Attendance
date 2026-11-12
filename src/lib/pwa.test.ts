import { describe, expect, it } from 'vitest';
import { detectInAppBrowser, detectPlatform, inAppMessage, isIosSafari } from './browser';
import { b64urlToBuffer, bufferToB64url, requestOptionsFromJSON } from './webauthn';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const IPHONE_WHATSAPP = `${IPHONE_SAFARI} WhatsApp/24.1.0`;
const ANDROID_FB =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/460.0.0.0;]';

describe('in-app browser and platform detection', () => {
  it('detects WhatsApp and Facebook in-app browsers', () => {
    expect(detectInAppBrowser(IPHONE_WHATSAPP)).toBe('whatsapp');
    expect(detectInAppBrowser(ANDROID_FB)).toBe('facebook');
    expect(detectInAppBrowser(IPHONE_SAFARI)).toBeNull();
  });

  it('tells which browser to open', () => {
    expect(detectPlatform(IPHONE_SAFARI)).toBe('ios');
    expect(isIosSafari(IPHONE_SAFARI)).toBe(true);
    expect(isIosSafari(IPHONE_WHATSAPP)).toBe(false);
    expect(inAppMessage('whatsapp', 'ios')).toContain('Open in Safari');
    expect(inAppMessage('facebook', 'android')).toContain('Chrome');
  });
});

describe('WebAuthn JSON helpers (older Safari fallback)', () => {
  it('round-trips base64url', () => {
    const bytes = new Uint8Array([0, 250, 255, 62, 63, 1]);
    const s = bufferToB64url(bytes);
    expect(s).not.toMatch(/[+/=]/);
    expect(new Uint8Array(b64urlToBuffer(s))).toEqual(bytes);
  });

  it('decodes request options for navigator.credentials.get', () => {
    const o = requestOptionsFromJSON({
      challenge: 'AAEC',
      rpId: 'example.test',
      userVerification: 'required',
      allowCredentials: [{ id: 'AQID', type: 'public-key' }],
    });
    expect(new Uint8Array(o.challenge as ArrayBuffer)).toEqual(new Uint8Array([0, 1, 2]));
    expect(o.allowCredentials?.[0]?.type).toBe('public-key');
    expect(o.userVerification).toBe('required');
  });
});
