import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import type { Attendance, IntentResponse, Today, TodayRules } from '../../lib/attendance';
import { locate, tryLocate, type GeoProgress, type Position } from '../../lib/geo';
import { getAssertion } from '../../lib/webauthn';
import {
  checkInProblem,
  LOCATE_BUDGET_MS,
  MAX_ACCURACY_RETRIES,
  type CheckInProblem,
} from './checkInErrors';
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
  /** When the position search started (UI elapsed time only, never sent). */
  locateStartedAt: number | null;
  /** Face ID failures in a row on this screen (offer re-registration after 2). */
  faceIdFailures: number;
}

const initial: CheckInState = {
  locateStartedAt: null,
  faceIdFailures: 0,
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
      const startedAt = Date.now();
      setState((s) => ({
        ...initial,
        faceIdFailures: s.faceIdFailures,
        kind,
        step: kind === 'remote' ? 'checking' : 'locating',
        locateStartedAt: kind === 'remote' ? null : startedAt,
      }));
      let position: Position | null = null;
      try {
        if (globalThis.navigator?.onLine === false) throw new ApiError('network', null, 'offline');
        const target = rules?.max_accuracy_m ?? null;
        const onProgress = (p: GeoProgress) => {
          if (!ac.signal.aborted)
            setState((s) => ({ ...s, progress: mergeProgress(s.progress, p) }));
        };

        // The whole search for a precise position is capped: a clear message comes quickly.
        const deadline = startedAt + LOCATE_BUDGET_MS;
        if (kind === 'gps')
          position = await locate({
            targetAccuracy: target,
            onProgress,
            signal: ac.signal,
            timeoutMs: Math.min(20_000, LOCATE_BUDGET_MS),
          });
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
            const remaining = deadline - Date.now();
            if (
              kind === 'gps' &&
              e instanceof ApiError &&
              e.code === 'low_accuracy' &&
              retry < MAX_ACCURACY_RETRIES &&
              remaining > 2_000
            ) {
              patch({ step: 'locating' });
              const next = await locate({
                targetAccuracy: target,
                signal: ac.signal,
                timeoutMs: Math.min(15_000, remaining),
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
        const res = await api.post<{ data: Attendance; created: boolean; today?: Today }>(
          '/attendance/check-in/confirm',
          { intent_id: intent.intent_id, ...(assertion ? { assertion } : {}) },
          { retries: 2 }, // idempotent on the server: a double submit returns the same attendance
        );
        // Show the confirmed attendance at once, without waiting for a refetch on a slow network.
        // The server returns the full Today body; fall back to patching the cached one.
        qc.setQueryData<Today>(TODAY_KEY, (old) =>
          res.today ? res.today : old ? confirmedToday(old, res.data) : old,
        );
        patch({ step: 'done', result: res.data, faceIdFailures: 0 });
        void qc.invalidateQueries({ queryKey: TODAY_KEY });
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        if (ac.signal.aborted) return;
        const problem = checkInProblem(e, { accuracy: position?.accuracy ?? null });
        const faceFail = problem.kind === 'faceid_failed' || problem.kind === 'faceid_cancelled';
        setState((s) => ({
          ...s,
          step: 'error',
          problem,
          faceIdFailures: faceFail ? s.faceIdFailures + 1 : s.faceIdFailures,
        }));
        if (problem.kind === 'already' || problem.kind === 'faceid_setup')
          void qc.invalidateQueries({ queryKey: TODAY_KEY });
      }
    },
    [qc, rules?.max_accuracy_m],
  );

  const reset = useCallback(() => {
    // Cancelling keeps the Face ID failure count (re-registration help).
    abort.current?.abort();
    setState((s) => ({ ...initial, faceIdFailures: s.faceIdFailures }));
  }, []);

  // Leaving the screen stops any position search or pending request.
  useEffect(() => () => abort.current?.abort(), []);

  return { state, run, reset };
}

/** Today's status after a confirmed check-in, as returned by the server. */
export function confirmedToday(old: Today, a: Attendance): Today {
  return { ...old, checked_in: true, attendance: a, available_check_ins: [] };
}

/**
 * A new position search starts with "no reading yet": during accuracy retries the
 * last known accuracy stays on screen so the text does not flicker back to
 * "Getting your position…".
 */
export function mergeProgress(prev: GeoProgress | null, next: GeoProgress): GeoProgress {
  if (next.accuracy === null && prev && prev.accuracy !== null)
    return { ...next, accuracy: prev.accuracy };
  return next;
}
