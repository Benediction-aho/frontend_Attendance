import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import AppLayout from '../../layouts/AppLayout';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface UserRef {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface Attendance {
  _id: string;
  userId: string | UserRef;
  date: string;
  checkInTime?: string;
  checkOutTime?: string | null;
  hoursWorked?: number;
  isLate?: boolean;
  earlyLeave?: boolean;
}

interface Task {
  _id: string;
  userId: string | UserRef;
  description: string;
  difficulties?: string;
  status: 'completed' | 'pending';
  date: string;
}

const todayIso = () => new Date().toISOString().split('T')[0];

const getUserId = (value: string | UserRef | undefined) =>
  typeof value === 'string' ? value : value?._id || '';

const formatEmployeeName = (employee: Pick<User, 'firstName' | 'lastName'>) => {
  const parts = [employee.lastName, employee.firstName].filter(Boolean);
  return parts.join(', ') || 'Employé';
};

const formatTime = (time?: string | null) => (time ? time.slice(0, 5) : '-');

const formatHours = (hours?: number) =>
  typeof hours === 'number' ? `${Math.round(hours * 100) / 100}h` : '-';

const percent = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

const isDateInRange = (date: string, startDate: string, endDate: string) => {
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
};

const Performance: React.FC<{ value: number }> = ({ value }) => {
  const badgeClass = value >= 80 ? 'badge-success' : value >= 50 ? 'badge-warning' : 'badge-danger';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
      <div style={{
        height: 6,
        width: 90,
        background: 'var(--border)',
        borderRadius: 3,
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <div style={{
          height: '100%',
          width: `${Math.max(0, Math.min(value, 100))}%`,
          background: value >= 80 ? 'var(--success)' : value >= 50 ? 'var(--warning)' : 'var(--danger)',
          borderRadius: 3,
        }} />
      </div>
      <span className={`badge ${badgeClass}`}>{value}%</span>
    </div>
  );
};

const TaskList: React.FC<{ tasks: Task[]; emptyText: string }> = ({ tasks, emptyText }) => {
  if (tasks.length === 0) {
    return <span style={{ color: 'var(--text-muted)' }}>{emptyText}</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
      {tasks.map(task => (
        <div key={task._id} style={{ lineHeight: 1.4 }}>
          <span style={{ fontWeight: 600 }}>{task.description}</span>
          {task.status === 'pending' && (
            <span className="badge badge-warning" style={{ marginLeft: 8 }}>En cours</span>
          )}
        </div>
      ))}
    </div>
  );
};

const Analytics: React.FC = () => {
  const [data, setData] = useState<{ users: User[]; attendances: Attendance[]; tasks: Task[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    reportDate: todayIso(),
    startDate: '',
    endDate: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAnalytics();
      setData({
        users: res.data.users || [],
        attendances: res.data.attendances || [],
        tasks: res.data.tasks || [],
      });
    } catch {
      setData({ users: [], attendances: [], tasks: [] });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div className="spinner" style={{ margin: '0 auto', width: 48, height: 48 }} />
        </div>
      </AppLayout>
    );
  }

  const employees = (data?.users || [])
    .filter(user => user.role === 'employee')
    .sort((a, b) => formatEmployeeName(a).localeCompare(formatEmployeeName(b)));

  const attendances = data?.attendances || [];
  const tasks = data?.tasks || [];

  const dailyAttendances = attendances.filter(attendance => attendance.date === filters.reportDate);
  const dailyTasks = tasks.filter(task => task.date === filters.reportDate);
  const totalAttendances = attendances.filter(attendance => isDateInRange(attendance.date, filters.startDate, filters.endDate));
  const totalTasks = tasks.filter(task => isDateInRange(task.date, filters.startDate, filters.endDate));
  const totalDates = new Set([
    ...totalAttendances.map(attendance => attendance.date),
    ...totalTasks.map(task => task.date),
  ]);
  const totalDayCount = totalDates.size || 1;

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytiques</h1>
          <p className="page-subtitle">Rapports de présence et d'activité par employé</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="date"
            className="form-input"
            style={{ width: 160, padding: '8px 12px' }}
            value={filters.reportDate}
            onChange={e => setFilters({ ...filters, reportDate: e.target.value })}
            title="Date du rapport journalier"
          />
          <input
            type="date"
            className="form-input"
            style={{ width: 160, padding: '8px 12px' }}
            value={filters.startDate}
            onChange={e => setFilters({ ...filters, startDate: e.target.value })}
            title="Début de période"
          />
          <input
            type="date"
            className="form-input"
            style={{ width: 160, padding: '8px 12px' }}
            value={filters.endDate}
            onChange={e => setFilters({ ...filters, endDate: e.target.value })}
            title="Fin de période"
          />
          <button className="btn btn-primary btn-sm" onClick={loadData}>Actualiser</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>
          Rapport de présence journalier
        </h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Employé</th>
                <th>Présence</th>
                <th>Heure d'arrivée</th>
                <th>Heure de départ</th>
                <th>Total heure</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => {
                const attendance = dailyAttendances.find(item => getUserId(item.userId) === employee._id);
                const isPresent = !!attendance;

                return (
                  <tr key={employee._id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{formatEmployeeName(employee)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{employee.email}</div>
                    </td>
                    <td>
                      <span className={`badge ${isPresent ? 'badge-success' : 'badge-danger'}`}>
                        {isPresent ? 'Oui' : 'Non'}
                      </span>
                    </td>
                    <td>{formatTime(attendance?.checkInTime)}</td>
                    <td>{formatTime(attendance?.checkOutTime)}</td>
                    <td style={{ color: isPresent ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 800 }}>
                      {formatHours(attendance?.hoursWorked)}
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Aucun employé trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>
          Rapport d'activité journalier
        </h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Employé</th>
                <th>Liste des tâches</th>
                <th>Liste des tâches non accomplies</th>
                <th>Non accomplies / Total tâches</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => {
                const employeeTasks = dailyTasks.filter(task => getUserId(task.userId) === employee._id);
                const pendingTasks = employeeTasks.filter(task => task.status !== 'completed');
                const completedCount = employeeTasks.length - pendingTasks.length;
                const performance = percent(completedCount, employeeTasks.length);

                return (
                  <tr key={employee._id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{formatEmployeeName(employee)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{employee.email}</div>
                    </td>
                    <td><TaskList tasks={employeeTasks} emptyText="Aucune tâche" /></td>
                    <td><TaskList tasks={pendingTasks} emptyText="Aucune tâche non accomplie" /></td>
                    <td>
                      <span className={`badge ${pendingTasks.length > 0 ? 'badge-warning' : 'badge-success'}`}>
                        {pendingTasks.length}/{employeeTasks.length}
                      </span>
                    </td>
                    <td><Performance value={performance} /></td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Aucun employé trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>
          Rapport détaillé par employé
        </h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Employé</th>
                <th>Présence</th>
                <th>Retard</th>
                <th>Départ anticipé</th>
                <th>Total tâches</th>
                <th>Total tâches non accomplies</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => {
                const employeeAttendances = totalAttendances.filter(attendance => getUserId(attendance.userId) === employee._id);
                const employeeTasks = totalTasks.filter(task => getUserId(task.userId) === employee._id);
                const lateCount = employeeAttendances.filter(attendance => attendance.isLate).length;
                const earlyLeaveCount = employeeAttendances.filter(attendance => attendance.earlyLeave).length;
                const pendingCount = employeeTasks.filter(task => task.status !== 'completed').length;
                const completedCount = employeeTasks.length - pendingCount;
                const attendanceAverage = percent(employeeAttendances.length, totalDayCount);
                const taskAverage = percent(completedCount, employeeTasks.length);
                const performance = Math.round((attendanceAverage + taskAverage) / 2);

                return (
                  <tr key={employee._id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{formatEmployeeName(employee)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{employee.email}</div>
                    </td>
                    <td><span className="badge badge-primary">{employeeAttendances.length}</span></td>
                    <td>
                      <span className={`badge ${lateCount > 0 ? 'badge-warning' : 'badge-success'}`}>
                        {lateCount}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${earlyLeaveCount > 0 ? 'badge-danger' : 'badge-success'}`}>
                        {earlyLeaveCount}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{employeeTasks.length}</td>
                    <td>
                      <span className={`badge ${pendingCount > 0 ? 'badge-warning' : 'badge-success'}`}>
                        {pendingCount}
                      </span>
                    </td>
                    <td><Performance value={performance} /></td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Aucun employé trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default Analytics;
