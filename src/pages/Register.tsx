import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/authApi';
import { useAuthContext } from '../context/AuthContext';
import Logo from '../components/Logo';
import Toast from '../components/Toast';

const Register: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuthContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    password: '', employeeType: 'employe', position: '',
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.register(form);
      const { token, user } = res.data;
      login(user, token);
      navigate('/check-in');
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Registration failed', type: 'error' });
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
      background: 'var(--bg)',
      padding: '24px',
    }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ width: '100%', maxWidth: 520, animation: 'fadeIn 0.5s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Logo size="md" />
        </div>

        <div className="card">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            background: 'rgba(239,161,47,0.1)',
            borderRadius: 20,
            marginBottom: 20,
          }}>
            <span style={{ fontSize: 16 }}>✨</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Nouveau compte
            </span>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 24, color: 'var(--text)' }}>
            {t('register')}
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="form-group">
                <label className="form-label">{t('firstName')}</label>
                <input
                  className="form-input"
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  placeholder="John"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('lastName')}</label>
                <input
                  className="form-input"
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('employeeType')}</label>
              <select
                className="form-input"
                value={form.employeeType}
                onChange={e => setForm({ ...form, employeeType: e.target.value })}
              >
                <option value="employe">{t('employe')}</option>
                <option value="stagiaire">{t('stagiaire')}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('position')}</label>
              <input
                className="form-input"
                value={form.position}
                onChange={e => setForm({ ...form, position: e.target.value })}
                placeholder="Développeur, Comptable..."
              />
            </div>

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
                placeholder="Min. 6 caractères"
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : '🚀'}
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
            {t('haveAccount')}{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>
              {t('login')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
