import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiError, errorMessage } from '../../lib/api';
import {
  checkOutPlace,
  formatTime,
  type Attendance,
  type Today,
  type TodayRules,
} from '../../lib/attendance';
import { tryLocate } from '../../lib/geo';
import { serverNow } from '../../lib/serverTime';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Textarea } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { useToast } from '../../ui/Toast';
import { TODAY_KEY } from './useAttendance';

const hhmm = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Africa/Accra',
});

/**
 * Display hint only: whether to show the reason field up front. The server decides
 * (422 reason_required) and the field appears then as well.
 */
export function looksBeforeEndOfDay(rules: TodayRules, now = serverNow()): boolean {
  if (rules.early_checkout_reason_required === false || !rules.end_of_day) return false;
  return hhmm.format(now) < rules.end_of_day;
}

export function CheckOutDialog({
  open,
  onClose,
  rules,
}: {
  open: boolean;
  onClose: () => void;
  rules: TodayRules;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [needReason, setNeedReason] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const showReason = needReason || looksBeforeEndOfDay(rules);

  const m = useMutation({
    mutationFn: async () => {
      // Position is optional: the check-out works from anywhere, even without location.
      const pos = await tryLocate(8000);
      return api.post<{ data: Attendance; today?: Today }>('/attendance/check-out', {
        ...(pos
          ? { latitude: pos.latitude, longitude: pos.longitude, accuracy: pos.accuracy }
          : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
    },
    onSuccess: (r) => {
      const place = checkOutPlace(r.data);
      toast.show(`Checked out at ${formatTime(r.data.check_out_at)}${place ? ` · ${place}` : ''}.`);
      setReason('');
      onClose();
      if (r.today) qc.setQueryData(TODAY_KEY, r.today);
      void qc.invalidateQueries({ queryKey: TODAY_KEY });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'reason_required') {
        setNeedReason(true);
        setFieldError(
          `Please give a reason for leaving before ${rules.end_of_day ?? 'the end of the day'}.`,
        );
      }
      if (
        e instanceof ApiError &&
        (e.code === 'already_checked_out' || e.code === 'not_checked_in')
      ) {
        void qc.invalidateQueries({ queryKey: TODAY_KEY });
      }
    },
  });

  const submit = () => {
    if (showReason && reason.trim().length < 3) {
      setFieldError(
        `Please give a reason for leaving before ${rules.end_of_day ?? 'the end of the day'}.`,
      );
      return;
    }
    setFieldError(undefined);
    m.mutate();
  };

  const otherError =
    m.isError && !(m.error instanceof ApiError && m.error.code === 'reason_required')
      ? m.error instanceof ApiError && m.error.kind === 'network'
        ? 'You appear to be offline. Connect to the internet and try again.'
        : errorMessage(m.error)
      : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Check out"
      description="Your position is recorded if available, to show your distance from the office. You can check out from anywhere."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={m.isPending}>
            Check out now
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {showReason && (
          <Textarea
            label="Reason for leaving early"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={fieldError}
            hint={`Needed before ${rules.end_of_day ?? 'the end of the day'}. Authorised administrators can read it.`}
          />
        )}
        {otherError && <Alert tone="danger">{otherError}</Alert>}
      </div>
    </Modal>
  );
}
