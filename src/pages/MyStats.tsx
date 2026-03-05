import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { statsApi } from '../api/statsApi';
import AppLayout from '../layouts/AppLayout';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';

interface StatsData {
  stats: {
    totalPresence: number;
    lateCount: number;
    earlyLeaveCount: number;
    totalHours: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    totalAttempts: number;
  };
  attendances: any[];
  tasks: any[];
}

const COLORS = ['#27ae60', '#efa12f', '#256ead', '#e74c3c'];

const MyStats: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await statsApi.getMyStats({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setData(res.data);
    } catch {}
    setLoading(false);
  };

  const applyFilters = () => loadStats();

  if (loading) {
    return (
      <AppLayout>
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 48, height: 48 }} />
          <p style={{ color: 'var(--text-muted)' }}>Chargement des statistiques...</p>
        </div>
      </AppLayout>
    );
  }

  const stats = data?.stats;
  const attendances = data?.attendances || [];

  // Prepare chart data
  const recentAttendances = attendances.slice(0, 14).reverse();
  const hoursChartData = recentAttendances.map(a => ({
    date: new Date(a.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    heures: a.hoursWorked || 0,
    retard: a.isLate ? 1 : 0,
  }));

  const taskPieData = [
    { name: t('completed'), value: stats?.completedTasks || 0 },
    { name: t('pending'), value: stats?.pendingTasks || 0 },
  ];

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 {t('myStats')}</h1>
          <p className="page-subtitle">Votre tableau de bord personnel</p>
        </div>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="date"
            className="form-input"
            style={{ width: 160, padding: '8px 12px' }}
            value={filters.startDate}
            onChange={e => setFilters({ ...filters, startDate: e.target.value })}
          />
          <input
            type="date"
            className="form-input"
            style={{ width: 160, padding: '8px 12px' }}
            value={filters.endDate}
            onChange={e => setFilters({ ...filters, endDate: e.target.value })}
          />
          <button className="btn btn-primary btn-sm" onClick={applyFilters}>
            🔍 Filtrer
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card" style={{ borderLeftColor: 'var(--primary)' }}>
          <div className="stat-value">{stats?.totalPresence}</div>
          <div className="stat-label">📅 {t('totalPresence')}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--secondary)' }}>
          <div className="stat-value" style={{ color: 'var(--secondary)' }}>{stats?.totalHours}h</div>
          <div className="stat-label">⏱️ {t('hoursWorked')}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--warning)' }}>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats?.lateCount}</div>
          <div className="stat-label">⚠️ {t('lateArrivals')}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--danger)' }}>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats?.earlyLeaveCount}</div>
          <div className="stat-label">🚪 {t('earlyLeaves')}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--success)' }}>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats?.completedTasks}</div>
          <div className="stat-label">✅ {t('completedTasks')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalTasks}</div>
          <div className="stat-label">📝 {t('totalTasks')}</div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        {/* Hours chart */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>
            ⏱️ Heures travaillées (14 derniers jours)
          </h3>
          {hoursChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hoursChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="heures" fill="#256ead" radius={[4, 4, 0, 0]} name="Heures" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📈</div>
              <div className="empty-state-text">Pas encore de données</div>
            </div>
          )}
        </div>

        {/* Tasks pie */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>
            ✅ Répartition des tâches
          </h3>
          {(stats?.totalTasks || 0) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={taskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {taskPieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">Aucune tâche enregistrée</div>
            </div>
          )}
        </div>
      </div>

      {/* Attendance history */}
      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>📅 Historique des présences</h3>
        {attendances.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-text">Aucun historique</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Entrée</th>
                  <th>Sortie</th>
                  <th>Heures</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {attendances.slice(0, 20).map((a: any) => (
                  <tr key={a._id}>
                    <td style={{ fontWeight: 600 }}>
                      {new Date(a.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td>{a.checkInTime?.slice(0, 5)}</td>
                    <td>{a.checkOutTime ? a.checkOutTime.slice(0, 5) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {a.hoursWorked || '—'}h
                    </td>
                    <td>
                      {a.isLate ? (
                        <span className="badge badge-warning">Retard</span>
                      ) : (
                        <span className="badge badge-success">À l'heure</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </AppLayout>
  );
};

export default MyStats;
