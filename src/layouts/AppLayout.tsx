import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import Logo from '../components/Logo';
import i18n from '../i18n';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthContext();
  const { theme, toggleTheme } = useThemeContext();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLang = () => {
    const newLang = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
    localStorage.setItem('lang', newLang);
  };

  const employeeLinks = [
    { path: '/check-in', label: t('checkIn'), icon: '📍' },
    { path: '/tasks', label: t('tasks'), icon: '✅' },
    { path: '/stats', label: t('myStats'), icon: '📊' },
  ];

  const adminLinks = [
    { path: '/admin', label: t('dashboard'), icon: '🏠' },
    { path: '/admin/employees', label: t('employees'), icon: '👥' },
    { path: '/admin/analytics', label: t('analytics'), icon: '📈' },
    { path: '/admin/attempts', label: t('outOfPerimeterAttempts'), icon: '🚨' },
  ];

  const links = user?.role === 'admin' ? adminLinks : employeeLinks;

  const Sidebar = () => (
    // ✅ FIX 1: ajout de className={mobileOpen ? 'open' : ''}
    // ✅ FIX 2: suppression de transform dans le style inline
    //    (le CSS gère maintenant tout via aside et aside.open)
    <aside
      className={mobileOpen ? 'open' : ''}
      style={{
        width: 260,
        minHeight: '100vh',
        background: 'var(--sidebar-bg)',
        color: 'var(--sidebar-text)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        boxShadow: '4px 0 20px rgba(0,0,0,0.2)',
        transition: 'transform 0.3s',
      }}>
      {/* Logo area */}
      <div style={{
        padding: '28px 24px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <Logo size="sm" />
        <div style={{
          marginTop: 12,
          fontSize: 11,
          color: 'rgba(255,255,255,0.5)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          Attendance System
        </div>
      </div>

      {/* User info */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 900,
            color: 'white',
            flexShrink: 0,
          }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'capitalize',
            }}>
              {user?.role} {user?.position ? `• ${user.position}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        {links.map(link => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 10,
                color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                background: isActive ? 'var(--primary)' : 'transparent',
                marginBottom: 4,
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                transition: 'all 0.2s',
                textDecoration: 'none',
              }}
              onMouseOver={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseOut={e => !isActive && (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 18 }}>{link.icon}</span>
              {link.label}
              {isActive && (
                <div style={{
                  marginLeft: 'auto',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--secondary)',
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        <button
          onClick={toggleTheme}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            fontWeight: 600,
            transition: 'background 0.2s',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
        <button
          onClick={toggleLang}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            fontWeight: 600,
            transition: 'background 0.2s',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          🌐 {i18n.language === 'fr' ? 'EN' : 'FR'}
        </button>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 8,
            background: 'rgba(231,76,60,0.2)',
            color: '#ff6b6b',
            fontSize: 13,
            fontWeight: 700,
            transition: 'background 0.2s',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          🚪 {t('logout')}
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      <div style={{ width: 260, flexShrink: 0 }} className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {/* ✅ FIX 3: suppression de display:'none' inline qui bloquait le CSS */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
          }}
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile header */}
        <header style={{
          display: 'none',
          padding: '16px 20px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: 'var(--shadow)',
        }} className="mobile-header">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text)' }}
          >
            ☰
          </button>
          <Logo size="sm" />
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--danger)' }}
          >
            🚪
          </button>
        </header>

        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {children}
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-header { display: flex !important; }
          .mobile-overlay { display: block !important; }
          aside { transform: translateX(-100%) !important; }
          aside.open { transform: translateX(0) !important; }
        }
      `}</style>
    </div>
  );
};

export default AppLayout;
