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
const REREGISTER = {
  title: 'Register Face ID again',
  body: 'Use this if Face ID was reset or the passkey was deleted on this phone. Your phone will ask for Face ID, then an administrator approves the new registration. Until then, an administrator can check you in.',
};

export function FaceIdSetup({
  state,
  onDone,
  compact = false,
  reregister = false,
  onCancel,
  hideBody = false,
}: {
  hideBody?: boolean;
  state: FaceIdState;
  onDone?: (state: FaceIdState) => void;
  compact?: boolean;
  /** Lost passkey on this phone: register again (pending admin approval). */
  reregister?: boolean;
  onCancel?: () => void;
}) {
  const reg = useRegisterFaceId(reregister);
  const copy = reregister ? REREGISTER : COPY[state];
  const canRegister = reregister || state === 'not_registered' || state === 'other_device';
  return (
    <div data-testid="faceid-setup">
      {!compact && <h2 className="text-base font-semibold text-ink-900">{copy.title}</h2>}
      {/* hideBody: the page title and subtitle already explain it. */}
      {!hideBody && <p className="mt-1 text-sm text-ink-600">{copy.body}</p>}
      <AnimatePresence initial={false}>
        {reg.isError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
            <Alert tone="danger">{registrationError(reg.error)}</Alert>
          </motion.div>
        )}
      </AnimatePresence>
      {reregister && reg.isSuccess && (
        <Alert tone="info" className="mt-3" title="Waiting for approval">
          Face ID is registered again on this phone. An administrator must approve it; you will get
          a notification. Until then, an administrator can check you in.
        </Alert>
      )}
      {canRegister && !(reregister && reg.isSuccess) && (
        <Button
          className="mt-4"
          size="lg"
          block
          loading={reg.isPending}
          onClick={() => reg.mutate(undefined, { onSuccess: (r) => onDone?.(r.state) })}
        >
          {reregister
            ? 'Register Face ID again'
            : state === 'other_device'
              ? 'Register this phone'
              : 'Set up Face ID'}
        </Button>
      )}
      {onCancel && (
        <Button variant="ghost" block className="mt-2" onClick={onCancel}>
          Back
        </Button>
      )}
    </div>
  );
}
