import { forgetFirstCode } from './pendingCode';
import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import {
  getDeviceId,
  getDeviceName,
  getToken,
  isStandalonePwa,
  setToken,
  subscribe,
} from '../../lib/session';
import type { LoginResponse, User } from '../../lib/types';
import { resyncPush } from '../../lib/push';

export const ME_KEY = ['me'] as const;

export function useToken(): string | null {
  return useSyncExternalStore(subscribe, getToken, getToken);
}

export function useMe() {
  const token = useToken();
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => (await api.get<{ data: User }>('/me')).data,
    enabled: Boolean(token),
    staleTime: 60_000,
  });
}

export function setMe(user: User): void {
  queryClient.setQueryData(ME_KEY, user);
}

export async function signIn(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', {
    email: email.trim(),
    password,
    device_id: getDeviceId(),
    device_name: getDeviceName(),
    is_pwa: isStandalonePwa(),
  });
  queryClient.clear();
  setToken(res.token);
  setMe({ ...res.user, must_change_password: res.must_change_password });
  // The server drops this device's push subscription on sign-out: send it again.
  void resyncPush();
  return res;
}

/** Signs this device out. The local session ends even if the server cannot be reached. */
export async function signOut(): Promise<void> {
  forgetFirstCode();
  try {
    await api.post('/auth/logout', undefined, { retries: 1 });
  } catch {
    // The token is still discarded locally; the server expires idle tokens.
  } finally {
    setToken(null);
    queryClient.clear();
  }
}
