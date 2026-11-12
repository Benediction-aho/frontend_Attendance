import { AnimatePresence, motion } from 'motion/react';
import type { FaceIdState } from '../../lib/attendance';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { registrationError, useRegisterFaceId } from './useFaceId';

const COPY: Record<FaceIdState, { title: string; body: string }> = {
  not_registered: {
    title: 'Set up Face ID',
    body: 'Face ID confirms that it is really you when you check in. Your face never leaves your phone: the app only receives a secure confirmation.',
  },
  pending_approval: {
    title: 'Waiting for approval',
    body: 'This phone is registered and waiting for an administrator to approve it. You will get a notification when it is approved. If it is urgent, ask an administrator to check you in.',
  },
  other_device: {
    title: 'Face ID is set up on another phone',
    body: 'Check in from the phone you registered. If you changed phone, register this one: an administrator will need to approve it before you can check in.',
  },
  ready: {
    title: 'Face ID is ready',
    body: 'You will be asked for Face ID (or your fingerprint) at each check-in.',
  },
};

/** Face ID state with the next action (register, wait for approval). */
export function FaceIdSetup({
  state,
  onDone,
  compact = false,
}: {
  state: FaceIdState;
  onDone?: (state: FaceIdState) => void;
  compact?: boolean;
}) {
  const reg = useRegisterFaceId();
  const copy = COPY[state];
  const canRegister = state === 'not_registered' || state === 'other_device';
  return (
    <div data-testid="faceid-setup">
      {!compact && <h2 className="text-base font-semibold text-ink-900">{copy.title}</h2>}
      <p className="mt-1 text-sm text-ink-600">{copy.body}</p>
      <AnimatePresence initial={false}>
        {reg.isError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
            <Alert tone="danger">{registrationError(reg.error)}</Alert>
          </motion.div>
        )}
      </AnimatePresence>
      {canRegister && (
        <Button
          className="mt-4"
          size="lg"
          block
          loading={reg.isPending}
          onClick={() => reg.mutate(undefined, { onSuccess: (r) => onDone?.(r.state) })}
        >
          {state === 'other_device' ? 'Register this phone' : 'Set up Face ID'}
        </Button>
      )}
    </div>
  );
}
