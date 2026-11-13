import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  currentSubscription,
  disablePush,
  enablePush,
  pushAvailability,
  PUSH_MESSAGES,
} from '../../lib/push';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card, CardBody } from '../../ui/Card';
import { useToast } from '../../ui/Toast';
import { useStandalone } from './install';

const ASKED_KEY = 'ag.push.asked';
function asked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === '1';
  } catch {
    return false;
  }
}
function markAsked() {
  try {
    localStorage.setItem(ASKED_KEY, '1');
  } catch {
    // convenience only
  }
}

function usePushState() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void currentSubscription().then((s) => alive && setOn(Boolean(s)));
    return () => {
      alive = false;
    };
  }, []);
  return [on, setOn] as const;
}

/**
 * Invitation shown after installation (iOS needs the installed app): explains why,
 * then asks the system permission only when the user taps.
 */
export function PushPrompt() {
  const standalone = useStandalone();
  const [on, setOn] = usePushState();
  const [hidden, setHidden] = useState(asked);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avail = pushAvailability();
  if (!standalone || hidden || on !== false || avail !== 'ok') return null;
  return (
    <div
      data-testid="push-prompt"
      className="rounded-card border border-primary-100 bg-primary-50/40 px-4 py-4 sm:px-5"
    >
      <div>
        <p className="font-semibold text-ink-900">Turn on reminders</p>
        <p className="mt-1 text-sm text-ink-600">
          Get a reminder if you have not checked in by the morning, and alerts about your requests.
          Your phone will ask for permission next.
        </p>
        {error && (
          <Alert tone="danger" className="mt-3">
            {error}
          </Alert>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              const r = await enablePush();
              setBusy(false);
              markAsked();
              if (r.ok) {
                setOn(true);
                setHidden(true);
              } else setError(r.message);
            }}
          >
            Turn on notifications
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              markAsked();
              setHidden(true);
            }}
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Profile section: notification status on this device with on/off. */
export function PushSettingsCard() {
  const toast = useToast();
  const [on, setOn] = usePushState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avail = pushAvailability();
  return (
    <Card id="notifications">
      <CardBody>
        <h2 className="text-base font-semibold text-ink-900">Notifications on this device</h2>
        {avail === 'needs_install' ? (
          <p className="mt-1 text-sm text-ink-600">
            On iPhone, notifications work only from the installed app.{' '}
            <Link to="/app/install" className="font-semibold text-primary-700 hover:underline">
              Install the app
            </Link>
            , then open it from your Home Screen.
          </p>
        ) : avail === 'unsupported' ? (
          <p className="mt-1 text-sm text-ink-600">{PUSH_MESSAGES.unsupported}</p>
        ) : avail === 'denied' ? (
          <p className="mt-1 text-sm text-ink-600">{PUSH_MESSAGES.denied}</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-600">
              {on
                ? 'Notifications are on. You also see every notification in the app.'
                : 'Notifications are off. You still see every notification in the app.'}
            </p>
            {error && (
              <Alert tone="danger" className="mt-3">
                {error}
              </Alert>
            )}
            <Button
              className="mt-3"
              variant={on ? 'outline' : 'primary'}
              loading={busy || on === null}
              onClick={async () => {
                setBusy(true);
                setError(null);
                if (on) {
                  try {
                    await disablePush();
                    setOn(false);
                    toast.show('Notifications turned off on this device.');
                  } catch {
                    setError('Notifications could not be turned off. Please try again.');
                  }
                } else {
                  const r = await enablePush();
                  markAsked();
                  if (r.ok) {
                    setOn(true);
                    toast.show('Notifications turned on.');
                  } else setError(r.message);
                }
                setBusy(false);
              }}
            >
              {on ? 'Turn off notifications' : 'Turn on notifications'}
            </Button>
          </>
        )}
      </CardBody>
    </Card>
  );
}
