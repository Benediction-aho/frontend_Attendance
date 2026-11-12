import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import type { Attendance, IntentResponse, TodayRules } from '../../lib/attendance';
import { locate, tryLocate, type GeoProgress, type Position } from '../../lib/geo';
import { getAssertion } from '../../lib/webauthn';
import { checkInProblem, MAX_ACCURACY_RETRIES, type CheckInProblem } from './checkInErrors';
import { TODAY_KEY } from './useAttendance';

export type CheckInStep =
  'idle' | 'locating' | 'checking' | 'faceid' | 'confirming' | 'done' | 'error';
export type CheckInKind = 'gps' | 'mission' | 'remote';

export interface CheckInState {
  step: CheckInStep;
  kind: CheckInKind | null;
  progress: GeoProgress | null;
  problem: CheckInProblem | null;
  result: Attendance | null;
  distance: number | null;
}

const initial: CheckInState = {
  step: 'idle',
  kind: null,
  progress: null,
  problem: null,
  result: null,
  distance: null,
};

/**
 * Check-in orchestration: position (GPS only) → intent (server checks perimeter) →
 * Face ID assertion → confirmation. Times and dates are never sent: the server
 * records its own time.
 */
export function useCheckIn(rules: TodayRules | undefined) {
  const qc = useQueryClient();
  const [state, setState] = useState<CheckInState>(initial);
  const abort = useRef<AbortController | null>(null);
  const patch = (p: Partial<CheckInState>) => setState((s) => ({ ...s, ...p }));

  const run = useCallback(
    async (kind: CheckInKind, reason?: string) => {
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;
      setState({ ...initial, kind, step: kind === 'remote' ? 'checking' : 'locating' });
      try {
        if (globalThis.navigator?.onLine === false) throw new ApiError('network', null, 'offline');
        const target = rules?.max_accuracy_m ?? null;
        const onProgress = (p: GeoProgress) => !ac.signal.aborted && patch({ progress: p });

        let position: Position | null = null;
        if (kind === 'gps')
          position = await locate({ targetAccuracy: target, onProgress, signal: ac.signal });
        else if (kind === 'mission') position = await tryLocate();

        let intent: IntentResponse | null = null;
        for (let retry = 0; ; retry++) {
          patch({ step: 'checking' });
          try {
            intent = await api.post<IntentResponse>('/attendance/check-in/intent', {
              type: kind,
              ...(position
                ? {
                    latitude: position.latitude,
                    longitude: position.longitude,
                    accuracy: position.accuracy,
                  }
                : {}),
              ...(reason ? { reason } : {}),
            });
            break;
          } catch (e) {
            // Low accuracy: keep reading the position while it improves, then ask again.
            if (
              kind === 'gps' &&
              e instanceof ApiError &&
              e.code === 'low_accuracy' &&
              retry < MAX_ACCURACY_RETRIES
            ) {
              patch({ step: 'locating' });
              const next = await locate({
                targetAccuracy: target,
                signal: ac.signal,
                timeoutMs: 15_000,
                onProgress: (p) => onProgress({ ...p, attempt: p.attempt + retry + 1 }),
              });
              position = !position || next.accuracy <= position.accuracy ? next : position;
              continue;
            }
            throw e;
          }
        }
        if (ac.signal.aborted) return;
        patch({ distance: intent.distance_m ?? null });

        let assertion: Record<string, unknown> | undefined;
        if (intent.faceid_options?.public_key) {
          patch({ step: 'faceid' });
          assertion = await getAssertion(intent.faceid_options.public_key);
        }
        patch({ step: 'confirming' });
        const res = await api.post<{ data: Attendance; created: boolean }>(
          '/attendance/check-in/confirm',
          { intent_id: intent.intent_id, ...(assertion ? { assertion } : {}) },
          { retries: 2 }, // idempotent on the server: a double submit returns the same attendance
        );
        patch({ step: 'done', result: res.data });
        await qc.invalidateQueries({ queryKey: TODAY_KEY });
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        const problem = checkInProblem(e);
        setState((s) => ({ ...s, step: 'error', problem }));
        if (problem.kind === 'already' || problem.kind === 'faceid_setup')
          void qc.invalidateQueries({ queryKey: TODAY_KEY });
      }
    },
    [qc, rules?.max_accuracy_m],
  );

  const reset = useCallback(() => {
    abort.current?.abort();
    setState(initial);
  }, []);

  return { state, run, reset };
}
