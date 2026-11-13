import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { detectInAppBrowser, detectPlatform, isIosSafari, type Platform } from '../../lib/browser';
import { Button } from '../../ui/Button';
import { Card, CardBody } from '../../ui/Card';
import { PageHeader } from '../../ui/PageHeader';
import { Segmented } from '../../ui/Field';
import { fadeUp, stagger } from '../../ui/motion';
import { InAppBrowserNotice } from './InAppBrowserNotice';
import { dismissInstall, useInstallPrompt, useStandalone, wasInstallDismissed } from './install';

const STEPS: Record<'ios' | 'android', string[]> = {
  ios: [
    'Open this page in Safari (other browsers on iPhone may not offer it).',
    'Tap the Share button at the bottom of the screen (a square with an arrow pointing up).',
    'Scroll down and tap "Add to Home Screen".',
    'Tap "Add" at the top right.',
    'Close Safari and open Attendance from its icon on your Home Screen.',
  ],
  android: [
    'Open this page in Chrome.',
    'Tap the menu (three dots) at the top right.',
    'Tap "Install app" or "Add to Home screen".',
    'Confirm with "Install".',
    'Open Attendance from its icon on your Home screen.',
  ],
};

function Steps({ platform }: { platform: 'ios' | 'android' }) {
  return (
    <motion.ol
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mt-3 flex flex-col gap-3"
    >
      {STEPS[platform].map((s, i) => (
        <motion.li key={s} variants={fadeUp} className="flex gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700">
            {i + 1}
          </span>
          <span className="pt-0.5 text-sm text-ink-700">{s}</span>
        </motion.li>
      ))}
    </motion.ol>
  );
}

/** Guided installation page (iPhone Safari "Add to Home Screen", Android install). */
export function InstallPage() {
  const standalone = useStandalone();
  const detected = detectPlatform();
  const [platform, setPlatform] = useState<'ios' | 'android'>(
    detected === 'android' ? 'android' : 'ios',
  );
  const install = useInstallPrompt();
  return (
    <>
      <PageHeader
        title="Install the app"
        description="Installed on your Home Screen, the app opens in one tap and can send you reminders."
      />
      <div className="flex max-w-xl flex-col gap-4">
        <InAppBrowserNotice />
        {standalone ? (
          <Card>
            <CardBody>
              <p className="font-semibold text-ink-900">The app is installed on this device.</p>
              <p className="mt-1 text-sm text-ink-600">
                You can turn on notifications from your profile.
              </p>
              <Link
                to="/app/profile#notifications"
                className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 hover:underline"
              >
                Notification settings
              </Link>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody>
              {install.available && (
                <div className="mb-5">
                  <Button size="lg" block onClick={() => void install.prompt()}>
                    Install now
                  </Button>
                  <p className="mt-2 text-xs text-ink-500">Or follow the steps below.</p>
                </div>
              )}
              <Segmented
                label="Your phone"
                name="platform"
                value={platform}
                onChange={setPlatform}
                options={[
                  { value: 'ios', label: 'iPhone' },
                  { value: 'android', label: 'Android' },
                ]}
              />
              <Steps platform={platform} />
              {platform === 'ios' && (
                <p className="mt-4 text-xs text-ink-500">
                  Notifications on iPhone need iOS 16.4 or later and work only from the installed
                  app.
                </p>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}

/** Short invitation on the home screen, until installed or dismissed. */
export function InstallCard() {
  const standalone = useStandalone();
  const [hidden, setHidden] = useState(wasInstallDismissed);
  const platform: Platform = detectPlatform();
  if (standalone || hidden || platform === 'desktop' || detectInAppBrowser()) return null;
  const iosNotSafari = platform === 'ios' && !isIosSafari();
  return (
    <div
      data-testid="install-card"
      className="rounded-card border border-primary-100 bg-primary-50/40 px-4 py-4 sm:px-5"
    >
      <div>
        <p className="font-semibold text-ink-900">Add Attendance to your Home Screen</p>
        <p className="mt-1 text-sm text-ink-600">
          {iosNotSafari
            ? 'Open this page in Safari to install the app and receive check-in reminders.'
            : 'It opens in one tap and can remind you to check in.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/app/install"
            className="inline-flex min-h-11 items-center rounded-control border border-ink-200 bg-surface px-3 text-sm font-semibold text-ink-800 hover:border-primary-300 hover:bg-primary-50"
          >
            Show me how
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              dismissInstall();
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
