import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { attendanceApi } from '../api/attendanceApi';
import useGeolocation from '../hooks/useGeolocation';
import { useAuthContext } from '../context/AuthContext';
import Toast from '../components/Toast';
import AppLayout from '../layouts/AppLayout';

interface AttendanceRecord {
  checkInTime: string;
  checkOutTime?: string;
  date: string;
  isLate: boolean;
  hoursWorked?: number;
}

const CheckIn: React.FC = () => {
  const isSubmitting = useRef(false);
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { loading: geoLoading, getPosition } = useGeolocation();
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    loadToday();
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadToday = async () => {
    try {
      const res = await attendanceApi.getToday();
      setAttendance(res.data.attendance);
    } catch {}
  };

  

const handleCheckIn = async () => {
  if (isSubmitting.current) return;
  isSubmitting.current = true;
  setLoading(true);
  try {
    const pos = await getPosition();
    const res = await attendanceApi.checkIn(pos.latitude, pos.longitude);

    if (res.data.attendance) {
      setAttendance(res.data.attendance);
    } else {
      // Safety net: re-fetch from server if attendance is null
      await loadToday();
    }

    setToast({ message: t('checkInSuccess'), type: 'success' });
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || t('locationRequired');
    setToast({ message: msg, type: 'error' });
  } finally {
    setLoading(false);
    isSubmitting.current = false;
  }
};

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.checkOut();
      setAttendance(res.data.attendance);
      setToast({ message: t('checkOutSuccess'), type: 'success' });
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    return `${h}:${m}`;
  };

  const isCheckedIn = !!attendance;
  const isCheckedOut = !!attendance?.checkOutTime;

  return (
    <AppLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">👋 Hello, {user?.firstName}!</h1>
            <p className="page-subtitle">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Live clock */}
        <div className="card" style={{
          textAlign: 'center',
          marginBottom: 24,
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
          color: 'white',
          border: 'none',
        }}>
          <div style={{
            fontSize: 64,
            fontWeight: 900,
            fontFamily: 'Roboto, monospace',
            letterSpacing: 4,
            lineHeight: 1,
          }}>
            {clock.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ fontSize: 14, opacity: 0.7, marginTop: 8, fontWeight: 600 }}>
            {clock.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>

        {/* Status card */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              📍 Statut du jour
            </h2>
            <span className={`badge ${isCheckedIn ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 13, padding: '6px 16px' }}>
              {isCheckedIn ? '✅ ' + t('present') : '⚪ ' + t('absent')}
            </span>
          </div>

          {attendance ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              <div style={{
                padding: '16px',
                background: 'rgba(39,174,96,0.08)',
                borderRadius: 10,
                border: '1px solid rgba(39,174,96,0.2)',
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>
                  Entrée
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--success)', fontFamily: 'Roboto' }}>
                  {formatTime(attendance.checkInTime)}
                </div>
                <span className={`badge ${attendance.isLate ? 'badge-warning' : 'badge-success'}`} style={{ marginTop: 6 }}>
                  {attendance.isLate ? t('late') : t('onTime')}
                </span>
              </div>

              {attendance.checkOutTime ? (
                <div style={{
                  padding: '16px',
                  background: 'rgba(37,110,173,0.08)',
                  borderRadius: 10,
                  border: '1px solid rgba(37,110,173,0.2)',
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>
                    Sortie
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)', fontFamily: 'Roboto' }}>
                    {formatTime(attendance.checkOutTime)}
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '16px',
                  background: 'var(--surface2)',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>
                    Sortie
                  </div>
                  <div style={{ fontSize: 18, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    En cours...
                  </div>
                </div>
              )}

              {attendance.checkOutTime && attendance.hoursWorked !== undefined && (
                <div style={{
                  padding: '16px',
                  background: 'rgba(239,161,47,0.08)',
                  borderRadius: 10,
                  border: '1px solid rgba(239,161,47,0.2)',
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>
                    Heures
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--secondary)', fontFamily: 'Roboto' }}>
                    {attendance.hoursWorked}h
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state-icon">⏰</div>
              <div className="empty-state-text">Vous n'avez pas encore pointé aujourd'hui</div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Actions</h3>

          {!isCheckedIn ? (
            <div>
              <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14, lineHeight: 1.6 }}>
                📡 Votre position GPS sera vérifiée. Vous devez être à moins de 60m du bureau pour pointer.
              </p>
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleCheckIn}
                disabled={loading || geoLoading}
              >
                {(loading || geoLoading) ? (
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                ) : '📍'}
                {(loading || geoLoading) ? 'Localisation...' : t('checkInNow')}
              </button>
            </div>
          ) : !isCheckedOut ? (
            <div>
              <div className="geo-indicator geo-in" style={{ marginBottom: 20 }}>
                ✅ Présence enregistrée — Vous pouvez gérer vos tâches
              </div>
              <button
                className="btn btn-secondary btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleCheckOut}
                disabled={loading}
              >
                {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : '🚪'}
                {loading ? 'Enregistrement...' : t('checkOut')}
              </button>
            </div>
          ) : (
            <div className="geo-indicator geo-in">
              Au revoir {user?.firstName}! Sortie enregistrée à {formatTime(attendance!.checkOutTime!)}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default CheckIn;
