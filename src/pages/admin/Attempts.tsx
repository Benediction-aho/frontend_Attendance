import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../../api/attendanceApi';
import AppLayout from '../../layouts/AppLayout';

interface Attempt {
  _id: string;
  userId: { firstName: string; lastName: string; email: string };
  date: string;
  attemptTime: string;
  latitude: number;
  longitude: number;
  distance: number;
  reason: string;
  createdAt: string;
}

const Attempts: React.FC = () => {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });

  useEffect(() => { loadAttempts(); }, []);

  const loadAttempts = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getAttempts({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setAttempts(res.data.attempts);
    } catch {}
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">🚨 Tentatives hors périmètre</h1>
          <p className="page-subtitle">{attempts.length} tentatives enregistrées</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="date" className="form-input" style={{ width: 160, padding: '8px 12px' }}
            value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
          <input type="date" className="form-input" style={{ width: 160, padding: '8px 12px' }}
            value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
          <button className="btn btn-primary btn-sm" onClick={loadAttempts}>🔍 Filtrer</button>
        </div>
      </div>

      {/* Stats mini */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card" style={{ borderLeftColor: 'var(--danger)' }}>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{attempts.length}</div>
          <div className="stat-label">🚨 Total tentatives</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--warning)' }}>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>
            {attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.distance, 0) / attempts.length) : 0}m
          </div>
          <div className="stat-label">📍 Distance moyenne</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {new Set(attempts.map(a => a.userId?.email)).size}
          </div>
          <div className="stat-label">👥 Employés concernés</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto', width: 40, height: 40 }} />
        </div>
      ) : attempts.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-text">Aucune tentative hors périmètre</div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Employé</th>
                <th>Date</th>
                <th>Heure</th>
                <th>Distance</th>
                <th>Coordonnées</th>
                <th>Raison</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map(attempt => (
                <tr key={attempt._id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>
                      {attempt.userId?.firstName} {attempt.userId?.lastName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {attempt.userId?.email}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {new Date(attempt.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td>{attempt.attemptTime?.slice(0, 5)}</td>
                  <td>
                    <span style={{
                      fontWeight: 900,
                      color: attempt.distance > 500 ? 'var(--danger)' : attempt.distance > 200 ? 'var(--warning)' : 'var(--text)',
                    }}>
                      {attempt.distance}m
                    </span>
                  </td>
                  <td>
                    <a
                      href={`https://maps.google.com/?q=${attempt.latitude},${attempt.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 600 }}
                    >
                      📍 {attempt.latitude.toFixed(4)}, {attempt.longitude.toFixed(4)}
                    </a>
                  </td>
                  <td>
                    <span className="badge badge-danger">{attempt.reason}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
};

export default Attempts;
