import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { PageHeader } from '../../ui/PageHeader';
import { Badge } from '../../ui/Badge';
import { useToast } from '../../ui/Toast';
import { fadeUp, stagger } from '../../ui/motion';
import { employeeTypeLabel } from '../../lib/employeeType';
import { ROLE_LABEL } from '../../lib/format';
import { signOut, useMe } from '../auth/useSession';
import { EmailForm } from './EmailForm';
import { PasswordForm } from './PasswordForm';
import { PersonalForm } from './PersonalForm';
import { PhotoCard } from './PhotoCard';
import { PushSettingsCard } from '../pwa/PushSettings';
import { FaceIdSetup } from '../faceid/FaceIdSetup';
import { useMyFaceId } from '../faceid/useFaceId';
import { Skeleton } from '../../ui/Skeleton';

function FaceIdCard() {
  const q = useMyFaceId();
  return (
    <Card>
      <CardHeader title="Face ID on this phone" />
      <CardBody>
        {q.isPending && <Skeleton className="h-12 w-full" />}
        {q.data && <FaceIdSetup state={q.data.state} compact />}
      </CardBody>
    </Card>
  );
}

export function ProfilePage() {
  const { data: me } = useMe();
  const toast = useToast();
  const navigate = useNavigate();
  if (!me) return null;
  return (
    <>
      <PageHeader
        title="My profile"
        description="Keep your details up to date so your team can reach you."
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <div className="flex flex-col gap-5">
          <motion.div variants={fadeUp}>
            <Card>
              <CardBody className="py-6">
                <PhotoCard user={me} />
              </CardBody>
            </Card>
          </motion.div>
          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader title="Personal information" />
              <CardBody>
                <PersonalForm user={me} onDone={() => toast.show('Profile saved.')} key={me.id} />
              </CardBody>
            </Card>
          </motion.div>
        </div>
        <div className="flex flex-col gap-5">
          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader title="Account" />
              <CardBody className="flex flex-wrap gap-2">
                <Badge tone="primary">{ROLE_LABEL[me.role]}</Badge>
                {me.employee_type && <Badge>{employeeTypeLabel(me)}</Badge>}
              </CardBody>
            </Card>
          </motion.div>
          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader title="Email address" />
              <CardBody>
                <EmailForm user={me} />
              </CardBody>
            </Card>
          </motion.div>
          {me.role !== 'super_admin' && (
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader
                  title="Password"
                  description="Changing it signs out your other devices."
                />
                <CardBody>
                  <PasswordForm
                    onDone={() =>
                      toast.show('Password changed. Your other devices have been signed out.')
                    }
                  />
                </CardBody>
              </Card>
            </motion.div>
          )}
          {me.role === 'employee' && (
            <motion.div variants={fadeUp}>
              <FaceIdCard />
            </motion.div>
          )}
          <motion.div variants={fadeUp}>
            <PushSettingsCard />
          </motion.div>
          <motion.div variants={fadeUp}>
            <Button
              variant="outline"
              block
              onClick={() => void signOut().then(() => navigate('/sign-in', { replace: true }))}
            >
              Sign out of this device
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}
