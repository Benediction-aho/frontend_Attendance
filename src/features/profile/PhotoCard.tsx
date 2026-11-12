import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { useToast } from '../../ui/Toast';
import { ApiError, api, errorMessage } from '../../lib/api';
import { ACCEPTED_IMAGE_TYPES, resizeImage } from '../../lib/image';
import type { User } from '../../lib/types';
import { setMe } from '../auth/useSession';

/** Photo upload with a preview before sending; the image is resized on the device. */
export function PhotoCard({ user }: { user: User }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const toast = useToast();

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.show('Choose a JPEG, PNG or WebP photo.', 'danger');
      return;
    }
    try {
      const blob = await resizeImage(file);
      setPreview({ url: URL.createObjectURL(blob), blob });
    } catch {
      // Older browsers: send the original, the server checks type and size.
      setPreview({ url: URL.createObjectURL(file), blob: file });
    }
  };

  const upload = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('photo', preview.blob, 'photo.jpg');
      const res = await api.post<{ data: User }>('/me/photo', fd);
      setMe(res.data);
      setPreview(null);
      toast.show('Profile photo updated.');
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 422
          ? (e.fieldErrors.photo ?? e.message)
          : errorMessage(e);
      toast.show(msg, 'danger');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await api.del<{ data: User }>('/me/photo');
      setMe(res.data);
      setConfirmRemove(false);
      toast.show('Profile photo removed.');
    } catch (e) {
      toast.show(errorMessage(e), 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
      <Avatar src={user.photo_url} first={user.first_name} last={user.last_name} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold text-ink-900">{user.full_name}</p>
        <p className="text-sm text-ink-500">{user.job_title ?? '–'}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button variant="outline" size="sm" onClick={() => input.current?.click()}>
            {user.photo_url ? 'Change photo' : 'Add a photo'}
          </Button>
          {user.photo_url && (
            <Button variant="danger-ghost" size="sm" onClick={() => setConfirmRemove(true)}>
              Remove
            </Button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className="sr-only"
          aria-label="Choose a profile photo"
          tabIndex={-1}
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title="New profile photo"
        description="This is how your photo will appear."
        footer={
          <>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Cancel
            </Button>
            <Button onClick={() => void upload()} loading={busy}>
              Use this photo
            </Button>
          </>
        }
      >
        {preview && (
          <img
            src={preview.url}
            alt="Preview of the new profile photo"
            className="mx-auto size-48 rounded-full object-cover shadow-card"
          />
        )}
      </Modal>
      <Modal
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remove your photo?"
        description="Your initials will be shown instead."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmRemove(false)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => void remove()} loading={busy}>
              Remove photo
            </Button>
          </>
        }
      />
    </div>
  );
}
