import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/authApi';
import { useAuthContext } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import Logo from '../components/Logo';
import Toast from '../components/Toast';

const LoginAdmin: React.FC = () => {
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
      if (user.role !== 'admin') {
        setToast({ message: 'Access denied: Admins only', type: 'error' });
        setLoading(false);
        return;
      }
      login(user, token);
      navigate('/admin');
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Login failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1a3a5c 50%, #256ead 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Decorative elements */}
      <div style={{
        position: 'absolute', top: -100, right: -100,
        width: 500, height: 500, borderRadius: '50%',
        background: 'rgba(239,161,47,0.08)',
      }} />
      <div style={{
        position: 'absolute', bottom: -100, left: -100,
        width: 400, height: 400, borderRadius: '50%',
        background: 'rgba(37,110,173,0.15)',
      }} />
      <div style={{
        position: 'absolute', top: '30%', left: '10%',
        width: 8, height: 8, borderRadius: '50%',
        background: 'var(--secondary)', opacity: 0.6,
      }} />
      <div style={{
        position: 'absolute', top: '60%', right: '15%',
        width: 12, height: 12, borderRadius: '50%',
        background: '#256ead', opacity: 0.4,
      }} />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'absolute', top: 24, right: 24,
          padding: '8px 16px',
          borderRadius: 20,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: 'white',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          backdropFilter: 'blur(4px)',
        }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div style={{
        width: '100%',
        maxWidth: 440,
        margin: '0 20px',
        animation: 'fadeIn 0.5s ease',
      }}>
        {/* Logo card */}
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 20,
          padding: '32px',
          marginBottom: 8,
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          textAlign: 'center',
        }}>
          <Logo size="md" />
        </div>

        {/* Form card */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: '40px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 24,
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'var(--secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}>
              🛡️
            </div>
            <div>
              <h2 style={{
                fontSize: 20,
                fontWeight: 900,
                color: 'white',
                fontFamily: 'Roboto, Arial, sans-serif',
              }}>
                {t('adminLogin')}
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                Espace administrateur sécurisé
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.6)',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}>
                {t('email')}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="admin@example.com"
                required
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '2px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: 'white',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--secondary)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.6)',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}>
                {t('password')}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '2px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: 'white',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--secondary)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? 'rgba(239,161,47,0.5)' : 'var(--secondary)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? (
                <div style={{
                  width: 18, height: 18,
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
              ) : '🔐'}
              {loading ? 'Connexion...' : t('login')}
            </button>
          </form>

          <div style={{
            marginTop: 24,
            textAlign: 'center',
            fontSize: 13,
            color: 'rgba(255,255,255,0.4)',
            paddingTop: 20,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}>
            Employé ?{' '}
            <Link to="/login" style={{ color: 'rgba(37,110,173,0.9)', fontWeight: 700 }}>
              Connexion Employé
            </Link>
          </div>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: 24,
          fontSize: 12,
          color: 'rgba(255,255,255,0.3)',
        }}>
          GIMA Services © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

export default LoginAdmin;
