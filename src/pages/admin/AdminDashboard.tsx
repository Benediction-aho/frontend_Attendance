import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api/adminApi';
import AppLayout from '../../layouts/AppLayout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAnalytics({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setData(res.data);
    } catch {}
    setLoading(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 48, height: 48 }} />
          <p style={{ color: 'var(--text-muted)' }}>Chargement du tableau de bord...</p>
        </div>
      </AppLayout>
    );
  }

  const stats = data?.stats || {};

  // Chart: presence per day (last 10 days)
  const attendanceByDay: Record<string, number> = {};
  (data?.attendances || []).forEach((a: any) => {
    attendanceByDay[a.date] = (attendanceByDay[a.date] || 0) + 1;
  });
  const presenceChartData = Object.entries(attendanceByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-10)
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      présences: count,
    }));

  // Tasks by employee
  const tasksByEmployee: Record<string, { name: string; total: number; done: number }> = {};
  (data?.tasks || []).forEach((task: any) => {
    const uid = task.userId?._id || 'unknown';
    const name = `${task.userId?.firstName || ''} ${task.userId?.lastName || ''}`.trim();
    if (!tasksByEmployee[uid]) tasksByEmployee[uid] = { name, total: 0, done: 0 };
    tasksByEmployee[uid].total++;
    if (task.status === 'completed') tasksByEmployee[uid].done++;
  });
  const taskChartData = Object.values(tasksByEmployee).slice(0, 8);

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏠 {t('dashboard')}</h1>
          <p className="page-subtitle">Vue d'ensemble — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" className="form-input" style={{ width: 160, padding: '8px 12px' }}
            value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
          <input type="date" className="form-input" style={{ width: 160, padding: '8px 12px' }}
            value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
          <button className="btn btn-primary btn-sm" onClick={loadAnalytics}>🔍</button>
        </div>
      </div>

      {/* Stats overview */}
      <div className="stat-grid">
        {[
          { label: 'Employés actifs', value: stats.totalEmployees, color: 'var(--primary)', icon: '👥' },
          { label: 'Présences', value: stats.totalAttendances, color: 'var(--success)', icon: '✅' },
          { label: 'Retards', value: stats.lateCount, color: 'var(--warning)', icon: '⚠️' },
          { label: 'Départs anticipés', value: stats.earlyLeaveCount, color: 'var(--danger)', icon: '🚪' },
          { label: 'Heures totales', value: `${stats.totalHours}h`, color: 'var(--secondary)', icon: '⏱️' },
          { label: 'Tâches terminées', value: stats.completedTasks, color: 'var(--success)', icon: '🎯' },
          { label: 'Tâches en cours', value: stats.pendingTasks, color: 'var(--warning)', icon: '📝' },
          { label: 'Tentatives hors zone', value: stats.totalAttempts, color: 'var(--danger)', icon: '🚨' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ borderLeftColor: s.color, animationDelay: `${i * 0.05}s` }}>
            <div className="stat-value" style={{ color: s.color, fontSize: 28 }}>
              {s.icon} {s.value ?? 0}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <Link to="/admin/employees" style={{ textDecoration: 'none' }}>
          <div className="card" style={{
            display: 'flex', alignItems: 'center', gap: 16,
            cursor: 'pointer', transition: 'transform 0.2s',
            borderTop: '3px solid var(--primary)',
          }}
            onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ fontSize: 32 }}>👥</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Employés</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Gérer les comptes</div>
            </div>
          </div>
        </Link>
        <Link to="/admin/analytics" style={{ textDecoration: 'none' }}>
          <div className="card" style={{
            display: 'flex', alignItems: 'center', gap: 16,
            cursor: 'pointer', transition: 'transform 0.2s',
            borderTop: '3px solid var(--secondary)',
          }}
            onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ fontSize: 32 }}>📈</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Analytiques</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Rapports détaillés</div>
            </div>
          </div>
        </Link>
        <Link to="/admin/attempts" style={{ textDecoration: 'none' }}>
          <div className="card" style={{
            display: 'flex', alignItems: 'center', gap: 16,
            cursor: 'pointer', transition: 'transform 0.2s',
            borderTop: '3px solid var(--danger)',
          }}
            onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ fontSize: 32 }}>🚨</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Alertes</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Hors périmètre</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>📅 Présences quotidiennes</h3>
          {presenceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={presenceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Line type="monotone" dataKey="présences" stroke="#256ead" strokeWidth={3} dot={{ fill: '#efa12f', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">📈</div><div className="empty-state-text">Pas de données</div></div>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>🎯 Tâches par employé</h3>
          {taskChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={taskChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="total" fill="#256ead" name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="done" fill="#27ae60" name="Terminées" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-text">Pas de données</div></div>
          )}
        </div>
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

export default AdminDashboard;
