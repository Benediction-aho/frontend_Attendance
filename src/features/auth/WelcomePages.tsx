import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Stepper } from '../../ui/Stepper';
import { Button } from '../../ui/Button';
import { fadeUp } from '../../ui/motion';
import { useToast } from '../../ui/Toast';
import { PasswordForm } from '../profile/PasswordForm';
import { PersonalForm } from '../profile/PersonalForm';
import { AuthLayout, AuthTitle } from './AuthLayout';
import { signOut, useMe } from './useSession';
import { forgetFirstCode, peekFirstCode } from './pendingCode';
import { useStayOnPage } from './useStayOnPage';
import type { FaceIdState } from '../../lib/attendance';
import { FaceIdSetup } from '../faceid/FaceIdSetup';
import { useMyFaceId } from '../faceid/useFaceId';
import { InAppBrowserNotice } from '../pwa/InAppBrowserNotice';

const BASE_STEPS = ['Sign in', 'Password', 'Profile'];
/** Employees also set up Face ID (needed to check in). */
const stepsFor = (role?: string) => (role === 'employee' ? [...BASE_STEPS, 'Face ID'] : BASE_STEPS);

/** Forced replacement of the identification code after the first sign-in. */
export function WelcomeCodePage() {
  useStayOnPage();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const toast = useToast();
  const [done, setDone] = useState(false);
  const [knownCode] = useState(peekFirstCode);
  if (me && !me.must_change_password && !done) return <Navigate to="/app" replace />;
  return (
    <AuthLayout step={3}>
      <div className="mb-6">
        <Stepper steps={stepsFor(me?.role)} current={1} />
      </div>
      <AuthTitle
        title={me ? `Welcome, ${me.first_name}` : 'Welcome'}
        subtitle={
          knownCode
            ? 'Before you continue, choose a password only you know. It replaces your identification code.'
            : 'Before you continue, replace your identification code with a password only you know.'
        }
      />
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <PasswordForm
          currentLabel="Identification code (from the email)"
          submitLabel="Save my password"
          knownCurrent={knownCode}
          onDone={() => {
            forgetFirstCode();
            setDone(true);
            toast.show('Your password is set.');
            navigate('/welcome/profile', { replace: true });
          }}
        />
      </motion.div>
      <button
        type="button"
        onClick={() => {
          forgetFirstCode();
          void signOut().then(() => navigate('/sign-in', { replace: true }));
        }}
        className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-ink-500 hover:text-primary-700"
      >
        Sign out
      </button>
    </AuthLayout>
  );
}

/** Optional profile completion right after the password is set. */
export function WelcomeProfilePage() {
  useStayOnPage();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const toast = useToast();
  const next = me?.role === 'employee' ? '/welcome/faceid' : '/app';
  return (
    <AuthLayout step={3}>
      <div className="mb-6">
        <Stepper steps={stepsFor(me?.role)} current={2} />
      </div>
      <AuthTitle
        title="Complete your profile"
        subtitle="This helps your team reach you. You can change it later from your profile."
      />
      {me && (
        <PersonalForm
          user={me}
          showNames={false}
          allowClean
          submitLabel="Save and continue"
          onDone={() => {
            toast.show('Profile saved.');
            navigate(next, { replace: true });
          }}
          secondary={
            <Button variant="ghost" size="lg" onClick={() => navigate(next, { replace: true })}>
              Skip for now
            </Button>
          }
        />
      )}
    </AuthLayout>
  );
}

/** Face ID registration right after the first sign-in (employees). */
export function WelcomeFaceIdPage() {
  useStayOnPage();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const faceid = useMyFaceId(me?.role === 'employee');
  const [state, setState] = useState<FaceIdState | null>(null);
  const [justDone, setJustDone] = useState(false);
  // Short success moment after registration, then on to the check-in.
  useEffect(() => {
    if (!justDone) return;
    const id = setTimeout(() => navigate('/app', { replace: true }), 1200);
    return () => clearTimeout(id);
  }, [justDone, navigate]);
  if (me && me.role !== 'employee') return <Navigate to="/app" replace />;
  const current = state ?? faceid.data?.state ?? null;
  if (justDone)
    return (
      <AuthLayout step={3}>
        <div className="mb-6">
          <Stepper steps={stepsFor('employee')} current={4} />
        </div>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.25 }}
          role="status"
          data-testid="faceid-success"
        >
          <AuthTitle
            title="Face ID is ready"
            subtitle="You are all set. Taking you to your check-in…"
          />
        </motion.div>
      </AuthLayout>
    );
  return (
    <AuthLayout step={3}>
      <div className="mb-6">
        <Stepper steps={stepsFor('employee')} current={3} />
      </div>
      <InAppBrowserNotice className="mb-4" />
      <AuthTitle
        title={
          current === 'ready'
            ? 'Face ID is ready'
            : current === 'pending_approval'
              ? 'Almost there'
              : 'Set up Face ID'
        }
        subtitle={
          current === 'ready'
            ? 'You will confirm each check-in with Face ID (or your fingerprint).'
            : current === 'pending_approval'
              ? 'An administrator must approve this phone before you can check in.'
              : 'Face ID confirms that it is really you at each check-in. Your face never leaves your phone. It takes a few seconds.'
        }
      />
      {current && current !== 'ready' && current !== 'pending_approval' && (
        <FaceIdSetup
          state={current}
          compact
          hideBody
          onDone={(s) => {
            setState(s);
            if (s === 'ready') setJustDone(true);
          }}
        />
      )}
      {current === 'pending_approval' && <FaceIdSetup state={current} compact hideBody />}
      {current === 'ready' && (
        <Button size="lg" block onClick={() => navigate('/app', { replace: true })}>
          Continue to check-in
        </Button>
      )}
      {current !== 'ready' && (
        <Button
          variant="ghost"
          size="lg"
          block
          className="mt-3"
          onClick={() => navigate('/app', { replace: true })}
        >
          {current === 'pending_approval' ? 'Continue' : 'Do it later'}
        </Button>
      )}
    </AuthLayout>
  );
}
