import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/authApi';
import { useAuthContext } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import Logo from '../components/Logo';
import Toast from '../components/Toast';
import i18n from '../i18n';

const LoginEmployee: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuthContext();
  const { theme, toggleTheme } = useThemeContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(form);
      const { token, user } = res.data;
      if (user.role !== 'employee') {
        setToast({ message: 'Use the Admin login page', type: 'error' });
        setLoading(false);
        return;
      }
      login(user, token);
      navigate('/check-in');
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Login failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = () => {
    const newLang = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
    localStorage.setItem('lang', newLang);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg)',
    }}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Left panel - decorative */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, var(--primary) 0%, #1a3a5c 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 40px',
        position: 'relative',
        overflow: 'hidden',
      }} className="login-panel-left">
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 300, height: 300, borderRadius: '50%',
          background: 'rgba(239,161,47,0.15)',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />

        <div style={{ position: 'relative', textAlign: 'center', color: 'white' }}>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 20,
            padding: '32px 40px',
            marginBottom: 40,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <Logo size="md" />
          </div>
          <h1 style={{
            fontSize: 32,
            fontWeight: 900,
            marginBottom: 16,
            fontFamily: 'Roboto, Arial, sans-serif',
          }}>
            Attendance System
          </h1>
          <p style={{ fontSize: 16, opacity: 0.8, lineHeight: 1.6 }}>
            Gérez votre présence et vos tâches quotidiennes avec précision et efficacité.
          </p>
          <div style={{
            marginTop: 40,
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {['📍 Géolocalisation', '✅ Tâches', '📊 Statistiques'].map(item => (
              <span key={item} style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
              }}>{item}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '40px',
        background: 'var(--surface)',
        position: 'relative',
      }}>
        {/* Top controls */}
        <div style={{
          position: 'absolute',
          top: 24,
          right: 24,
          display: 'flex',
          gap: 8,
        }}>
          <button
            onClick={toggleLang}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🌐 {i18n.language === 'fr' ? 'EN' : 'FR'}
          </button>
          <button
            onClick={toggleTheme}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          {/* Mobile logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }} className="mobile-logo">
            <Logo size="sm" />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            background: 'rgba(37,110,173,0.1)',
            borderRadius: 20,
            marginBottom: 24,
          }}>
            <span style={{ fontSize: 18 }}>👤</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('employeeLogin')}
            </span>
          </div>

          <h2 style={{
            fontSize: 28,
            fontWeight: 900,
            color: 'var(--text)',
            marginBottom: 8,
            fontFamily: 'Roboto, Arial, sans-serif',
          }}>
            Bon retour ! 👋
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: 15 }}>
            Connectez-vous à votre espace employé
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('email')}</label>
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="votre@email.com"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('password')}</label>
              <input
                type="password"
                className="form-input"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : null}
              {loading ? 'Connexion...' : t('login')}
            </button>
          </form>

          <div style={{
            marginTop: 28,
            textAlign: 'center',
            fontSize: 14,
            color: 'var(--text-muted)',
          }}>
            {t('noAccount')}{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>
              {t('register')}
            </Link>
          </div>

          <div style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 14,
            color: 'var(--text-muted)',
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
          }}>
            Administrateur ?{' '}
            <Link to="/admin/login" style={{ color: 'var(--secondary)', fontWeight: 700 }}>
              Connexion Admin
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-panel-left { display: none !important; }
          .mobile-logo { display: block !important; }
        }
        .mobile-logo { display: none; }
      `}</style>
    </div>
  );
};

export default LoginEmployee;
