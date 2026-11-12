/**
 * Face ID / fingerprint through passkeys (WebAuthn). Only a cryptographic proof
 * leaves the phone; no face data. JSON helpers fall back to a manual
 * base64url conversion on older Safari versions without parse…FromJSON/toJSON.
 */

export function b64urlToBuffer(s: string): ArrayBuffer {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export function bufferToB64url(buf: ArrayBuffer | ArrayBufferView): string {
  const bytes =
    buf instanceof ArrayBuffer
      ? new Uint8Array(buf)
      : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

type Json = Record<string, unknown>;
type Desc = { id: string; type?: string; transports?: string[] };

export function creationOptionsFromJSON(o: Json): PublicKeyCredentialCreationOptions {
  const PKC = globalThis.PublicKeyCredential as unknown as {
    parseCreationOptionsFromJSON?: (j: Json) => PublicKeyCredentialCreationOptions;
  };
  if (PKC?.parseCreationOptionsFromJSON) return PKC.parseCreationOptionsFromJSON(o);
  const user = o.user as Json;
  return {
    ...(o as object),
    challenge: b64urlToBuffer(o.challenge as string),
    user: { ...(user as object), id: b64urlToBuffer(user.id as string) },
    excludeCredentials: ((o.excludeCredentials as Desc[] | undefined) ?? []).map((c) => ({
      ...c,
      type: 'public-key',
      id: b64urlToBuffer(c.id),
    })),
  } as PublicKeyCredentialCreationOptions;
}

export function requestOptionsFromJSON(o: Json): PublicKeyCredentialRequestOptions {
  const PKC = globalThis.PublicKeyCredential as unknown as {
    parseRequestOptionsFromJSON?: (j: Json) => PublicKeyCredentialRequestOptions;
  };
  if (PKC?.parseRequestOptionsFromJSON) return PKC.parseRequestOptionsFromJSON(o);
  return {
    ...(o as object),
    challenge: b64urlToBuffer(o.challenge as string),
    allowCredentials: ((o.allowCredentials as Desc[] | undefined) ?? []).map((c) => ({
      ...c,
      type: 'public-key',
      id: b64urlToBuffer(c.id),
    })),
  } as PublicKeyCredentialRequestOptions;
}

/** PublicKeyCredential → JSON (base64url), using toJSON() when the browser has it. */
export function credentialToJSON(cred: PublicKeyCredential): Json {
  const withJson = cred as PublicKeyCredential & { toJSON?: () => Json };
  if (typeof withJson.toJSON === 'function') {
    try {
      return withJson.toJSON() as unknown as Json;
    } catch {
      // fall through to the manual conversion
    }
  }
  const r = cred.response as AuthenticatorResponse & {
    attestationObject?: ArrayBuffer;
    authenticatorData?: ArrayBuffer;
    signature?: ArrayBuffer;
    userHandle?: ArrayBuffer | null;
    getTransports?: () => string[];
  };
  const response: Json = { clientDataJSON: bufferToB64url(r.clientDataJSON) };
  if (r.attestationObject) {
    response.attestationObject = bufferToB64url(r.attestationObject);
    response.transports = r.getTransports?.() ?? [];
  }
  if (r.authenticatorData) response.authenticatorData = bufferToB64url(r.authenticatorData);
  if (r.signature) response.signature = bufferToB64url(r.signature);
  if (r.userHandle) response.userHandle = bufferToB64url(r.userHandle);
  return {
    id: cred.id,
    rawId: bufferToB64url(cred.rawId),
    type: cred.type,
    response,
    authenticatorAttachment: cred.authenticatorAttachment ?? undefined,
    clientExtensionResults: cred.getClientExtensionResults?.() ?? {},
  };
}

export function isWebAuthnSupported(): boolean {
  return (
    typeof globalThis.PublicKeyCredential !== 'undefined' &&
    typeof globalThis.navigator?.credentials?.create === 'function'
  );
}

/** True when the phone has Face ID / fingerprint usable by web apps. */
export async function hasPlatformAuthenticator(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export type PasskeyErrorKind = 'cancelled' | 'unsupported' | 'exists' | 'security' | 'failed';

export class PasskeyError extends Error {
  readonly kind: PasskeyErrorKind;
  constructor(kind: PasskeyErrorKind, message: string) {
    super(message);
    this.name = 'PasskeyError';
    this.kind = kind;
  }
}

export const PASSKEY_MESSAGES: Record<PasskeyErrorKind, string> = {
  cancelled:
    'Face ID was cancelled or did not recognise you. Try again; if it keeps failing, use your phone passcode when it is offered.',
  unsupported:
    'This phone or browser cannot use Face ID or a fingerprint for this app. Open it in Safari (iPhone) or Chrome (Android), and check that Face ID or a screen lock is set up.',
  exists: 'Face ID is already set up for this app on this phone.',
  security:
    'Face ID cannot be used from this address. Open the app from its official address in Safari or Chrome.',
  failed: 'Face ID could not be completed. Please try again.',
};

function mapDomError(e: unknown): PasskeyError {
  const name = e instanceof Error ? e.name : '';
  if (name === 'NotAllowedError' || name === 'AbortError')
    return new PasskeyError('cancelled', PASSKEY_MESSAGES.cancelled);
  if (name === 'InvalidStateError') return new PasskeyError('exists', PASSKEY_MESSAGES.exists);
  if (name === 'SecurityError') return new PasskeyError('security', PASSKEY_MESSAGES.security);
  if (name === 'NotSupportedError')
    return new PasskeyError('unsupported', PASSKEY_MESSAGES.unsupported);
  return new PasskeyError('failed', PASSKEY_MESSAGES.failed);
}

export async function createPasskey(publicKey: Json): Promise<Json> {
  if (!isWebAuthnSupported()) throw new PasskeyError('unsupported', PASSKEY_MESSAGES.unsupported);
  try {
    const cred = (await navigator.credentials.create({
      publicKey: creationOptionsFromJSON(publicKey),
    })) as PublicKeyCredential | null;
    if (!cred) throw new PasskeyError('failed', PASSKEY_MESSAGES.failed);
    return credentialToJSON(cred);
  } catch (e) {
    throw e instanceof PasskeyError ? e : mapDomError(e);
  }
}

export async function getAssertion(publicKey: Json): Promise<Json> {
  if (!isWebAuthnSupported()) throw new PasskeyError('unsupported', PASSKEY_MESSAGES.unsupported);
  try {
    const cred = (await navigator.credentials.get({
      publicKey: requestOptionsFromJSON(publicKey),
    })) as PublicKeyCredential | null;
    if (!cred) throw new PasskeyError('failed', PASSKEY_MESSAGES.failed);
    return credentialToJSON(cred);
  } catch (e) {
    throw e instanceof PasskeyError ? e : mapDomError(e);
  }
}
