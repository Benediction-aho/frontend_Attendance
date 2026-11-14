import { useState } from 'react';
import { detectInAppBrowser, detectPlatform, inAppMessage } from '../../lib/browser';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';

/** Warning shown when the app is opened inside WhatsApp, Facebook, etc. */
export function InAppBrowserNotice({ className }: { className?: string }) {
  const [kind] = useState(() => detectInAppBrowser());
  const [copied, setCopied] = useState(false);
  if (!kind) return null;
  const platform = detectPlatform();
  return (
    <Alert
      tone="warning"
      title={`Open in ${platform === 'ios' ? 'Safari' : 'Chrome'}`}
      className={className}
    >
      <p>{inAppMessage(kind, platform)}</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => {
          void navigator.clipboard
            ?.writeText(window.location.href)
            .then(() => setCopied(true))
            .catch(() => setCopied(false));
        }}
      >
        {copied ? 'Link copied' : 'Copy the link'}
      </Button>
    </Alert>
  );
}
