import { useState } from 'react';
import { Button } from '../../ui/Button';
import { Textarea } from '../../ui/Field';
import { Modal } from '../../ui/Modal';

/** Mission check-in: a reason, then the usual Face ID confirmation. */
export function MissionDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();
  const submit = () => {
    const r = reason.trim();
    if (r.length < 3) return setError('Please say where you are working (at least 3 characters).');
    setError(undefined);
    onSubmit(r);
    setReason('');
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mission check-in"
      description="For work outside the office (client visit, errand). An administrator approves it; you can use the app meanwhile."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Continue to Face ID</Button>
        </>
      }
    >
      <Textarea
        label="Reason"
        rows={3}
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={error}
        hint="For example: visit at a client's office in Tema."
      />
    </Modal>
  );
}
