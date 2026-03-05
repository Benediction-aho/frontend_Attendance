import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import AppLayout from '../../layouts/AppLayout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#256ead', '#27ae60', '#efa12f', '#e74c3c', '#9b59b6'];

const Analytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
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
          <div className="spinner" style={{ margin: '0 auto', width: 48, height: 48 }} />
        </div>
      </AppLayout>
    );
  }

  // Hours per employee
  const hoursByEmp: Record<string, { name: string; hours: number; late: number }> = {};
  (data?.attendances || []).forEach((a: any) => {
    const uid = a.userId?._id || 'x';
    const name = `${a.userId?.firstName || ''} ${a.userId?.lastName || ''}`.trim().substring(0, 12);
    if (!hoursByEmp[uid]) hoursByEmp[uid] = { name, hours: 0, late: 0 };
    hoursByEmp[uid].hours += a.hoursWorked || 0;
    if (a.isLate) hoursByEmp[uid].late++;
  });
  const empHoursData = Object.values(hoursByEmp).map(e => ({ ...e, hours: Math.round(e.hours * 10) / 10 }));

  // Attendance per day
  const byDay: Record<string, number> = {};
  (data?.attendances || []).forEach((a: any) => {
    byDay[a.date] = (byDay[a.date] || 0) + 1;
  });
  const dailyData = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([d, c]) => ({
    date: new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    présences: c,
  }));

  // Status distribution
  const pieData = [
    { name: 'À l\'heure', value: (data?.attendances || []).filter((a: any) => !a.isLate).length },
    { name: 'Retards', value: (data?.attendances || []).filter((a: any) => a.isLate).length },
    { name: 'Départs anticipés', value: (data?.attendances || []).filter((a: any) => a.earlyLeave).length },
  ];

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">📈 Analytiques</h1>
          <p className="page-subtitle">Rapport global de présence et productivité</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="date" className="form-input" style={{ width: 160, padding: '8px 12px' }}
            value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
          <input type="date" className="form-input" style={{ width: 160, padding: '8px 12px' }}
            value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
          <button className="btn btn-primary btn-sm" onClick={loadData}>🔍 Filtrer</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>📅 Présences par jour</h3>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Line type="monotone" dataKey="présences" stroke="#256ead" strokeWidth={3}
                  dot={{ fill: '#efa12f', r: 5 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><div className="empty-state-icon">📈</div><div className="empty-state-text">Aucune donnée</div></div>}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>🎯 Distribution des statuts</h3>
          {pieData.some(p => p.value > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90}
                  dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-text">Aucune donnée</div></div>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>⏱️ Heures travaillées par employé</h3>
        {empHoursData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={empHoursData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="hours" fill="#256ead" name="Heures" radius={[0, 4, 4, 0]} />
              <Bar dataKey="late" fill="#e74c3c" name="Retards" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-text">Aucune donnée</div></div>}
      </div>

      {/* Detailed table */}
      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>📋 Rapport détaillé par employé</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Employé</th>
                <th>Total heures</th>
                <th>Retards</th>
                <th>Départs anticipés</th>
                <th>Performances</th>
              </tr>
            </thead>
            <tbody>
              {empHoursData.map((emp, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700 }}>{emp.name}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: 800 }}>{emp.hours}h</td>
                  <td>
                    <span className={`badge ${emp.late > 2 ? 'badge-danger' : emp.late > 0 ? 'badge-warning' : 'badge-success'}`}>
                      {emp.late}
                    </span>
                  </td>
                  <td>—</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        height: 6, width: 100, background: 'var(--border)',
                        borderRadius: 3, overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min((emp.hours / 40) * 100, 100)}%`,
                          background: 'var(--primary)',
                          borderRadius: 3,
                        }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {Math.round((emp.hours / 40) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {empHoursData.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune donnée</td></tr>
              )}
            </tbody>
          </table>
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

export default Analytics;
