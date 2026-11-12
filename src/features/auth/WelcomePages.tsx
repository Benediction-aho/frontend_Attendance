import { motion } from 'motion/react';
import { useState } from 'react';
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

const STEPS = ['Sign in', 'Your password', 'Your profile'];

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
        <Stepper steps={STEPS} current={1} />
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
            toast.show('Your password is set. Your other devices have been signed out.');
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
  return (
    <AuthLayout step={3}>
      <div className="mb-6">
        <Stepper steps={STEPS} current={2} />
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
            navigate('/app', { replace: true });
          }}
          secondary={
            <Button variant="ghost" size="lg" onClick={() => navigate('/app', { replace: true })}>
              Skip for now
            </Button>
          }
        />
      )}
    </AuthLayout>
  );
}
