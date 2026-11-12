import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import type { FaceIdState } from '../../lib/attendance';
import { getDeviceName } from '../../lib/session';
import { createPasskey, PasskeyError } from '../../lib/webauthn';
import { TODAY_KEY } from '../attendance/useAttendance';

export interface FaceIdCredential {
  id: number;
  name: string | null;
  status: 'pending' | 'approved' | 'revoked';
  device: { id: number; name: string | null } | null;
  created_at: string;
  approved_at: string | null;
  revoked_at: string | null;
  revoke_reason: 'superseded' | 'replaced' | 'rejected' | 'revoked' | null;
  last_used_at: string | null;
  this_device?: boolean;
  user?: { id: number; first_name: string; last_name: string };
  registration?: {
    device_id: number | string | null;
    registered_at: string | null;
    ip: string | null;
    platform: string | null;
    browser: string | null;
    user_agent: string | null;
    device_first_seen_at: string | null;
  };
}

export const FACEID_KEY = ['me', 'faceid'] as const;

export function useMyFaceId(enabled = true) {
  return useQuery({
    queryKey: FACEID_KEY,
    queryFn: () => api.get<{ state: FaceIdState; data: FaceIdCredential[] }>('/me/faceid'),
    enabled,
  });
}

/** User-facing message for a failed registration. */
export function registrationError(e: unknown): string {
  if (e instanceof PasskeyError) return e.message;
  if (e instanceof ApiError) {
    if (e.kind === 'network')
      return 'You appear to be offline. Connect to the internet and try again.';
    switch (e.code) {
      case 'challenge_invalid':
        return 'The setup took too long. Please try again.';
      case 'faceid_failed':
        return 'Face ID could not be verified. Make sure Face ID (or a fingerprint) is set up on this phone and try again.';
      case 'faceid_already_registered':
        return 'Face ID is already set up on this phone.';
      case 'device_required':
        return 'Please sign out and sign in again on this phone, then set up Face ID.';
    }
    return e.message;
  }
  return 'Face ID could not be set up. Please try again.';
}

/** Registration: options → navigator.credentials.create → register. */
export function useRegisterFaceId() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const opts = await api.post<{ challenge_id: string; public_key: Record<string, unknown> }>(
        '/me/faceid/register/options',
      );
      const credential = await createPasskey(opts.public_key);
      return api.post<{ data: FaceIdCredential; state: FaceIdState }>('/me/faceid/register', {
        challenge_id: opts.challenge_id,
        credential,
        name: getDeviceName(),
      });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: FACEID_KEY });
      void qc.invalidateQueries({ queryKey: TODAY_KEY });
    },
  });
}
