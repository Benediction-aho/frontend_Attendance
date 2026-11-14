import { motion } from 'motion/react';
import { useState } from 'react';
import { Card, CardBody } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { Input } from '../../ui/Field';
import { Pagination } from '../../ui/Pagination';
import { SkeletonRows } from '../../ui/Skeleton';
import { Alert } from '../../ui/Alert';
import { errorMessage } from '../../lib/api';
import { fadeUp, stagger } from '../../ui/motion';
import { AttendanceBadges, AttendanceDate, AttendanceDetails, DayStatusBadge } from './parts';
import { useHistory } from './useAttendance';

/** Attendance history (own or, for admins, one employee's). Newest first. */
export function HistoryList({ path }: { path: string }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const q = useHistory(path, from || undefined, to || undefined, page);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <Input
          label="From"
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <Input
          label="To"
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
        />
      </div>
      {q.isPending && <SkeletonRows rows={4} />}
      {q.isError && <Alert tone="danger">{errorMessage(q.error)}</Alert>}
      {q.data && q.data.data.length === 0 && (
        <EmptyState title="No attendance yet" description="Check-ins appear here once recorded." />
      )}
      {q.data && q.data.data.length > 0 && (
        <motion.ul
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3"
        >
          {q.data.data.map((a) => (
            <motion.li key={a.id} variants={fadeUp}>
              <Card>
                <CardBody>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <AttendanceDate a={a} />
                      <DayStatusBadge status={a.day_status} checkInType={a.check_in_type} />
                    </span>
                    <AttendanceBadges a={a} />
                  </div>
                  <AttendanceDetails a={a} />
                </CardBody>
              </Card>
            </motion.li>
          ))}
        </motion.ul>
      )}
      {q.data && (
        <Pagination
          page={q.data.meta.current_page}
          lastPage={q.data.meta.last_page}
          total={q.data.meta.total}
          onPage={setPage}
        />
      )}
    </div>
  );
}
