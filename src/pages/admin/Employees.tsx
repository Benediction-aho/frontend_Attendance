import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi, CreateUserPayload } from '../../api/adminApi';
import AppLayout from '../../layouts/AppLayout';
import Toast from '../../components/Toast';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  employeeType: string;
  position: string;
  isBlocked: boolean;
  createdAt: string;
}

const CreateUserModal: React.FC<{
  role: 'employee' | 'admin';
  onSave: (data: CreateUserPayload) => void;
  onClose: () => void;
  loading: boolean;
}> = ({ role, onSave, onClose, loading }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<CreateUserPayload>({
    firstName: '', lastName: '', email: '', password: '',
    employeeType: 'employe', position: '', role,
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <h3 className="modal-title">
          {role === 'admin' ? '🛡️ ' + t('createAdmin') : '👤 ' + t('createEmployee')}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div className="form-group">
            <label className="form-label">{t('firstName')}</label>
            <input className="form-input" value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">{t('lastName')}</label>
            <input className="form-input" value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })} required />
          </div>
        </div>
        {role === 'employee' && (
          <>
            <div className="form-group">
              <label className="form-label">{t('employeeType')}</label>
              <select className="form-input" value={form.employeeType}
                onChange={e => setForm({ ...form, employeeType: e.target.value })}>
                <option value="employe">{t('employe')}</option>
                <option value="stagiaire">{t('stagiaire')}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('position')}</label>
              <input className="form-input" value={form.position}
                onChange={e => setForm({ ...form, position: e.target.value })} />
            </div>
          </>
        )}
        <div className="form-group">
          <label className="form-label">{t('email')}</label>
          <input type="email" className="form-input" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="form-group">
          <label className="form-label">{t('password')}</label>
          <input type="password" className="form-input" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} minLength={6} required />
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>{t('cancel')}</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={loading}>
            {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : null}
            Créer
          </button>
        </div>
      </div>
    </div>
  );
};

const Employees: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalRole, setModalRole] = useState<'employee' | 'admin' | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers();
      setUsers(res.data.users);
    } catch {}
    setLoading(false);
  };

  const handleCreate = async (data: CreateUserPayload) => {
    setModalLoading(true);
    try {
      await adminApi.createUser(data);
      setToast({ message: 'Utilisateur créé avec succès', type: 'success' });
      setModalRole(null);
      await loadUsers();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Error', type: 'error' });
    }
    setModalLoading(false);
  };

  const handleToggleBlock = async (user: User) => {
    const action = user.isBlocked ? 'Débloquer' : 'Bloquer';
    if (!confirm(`${action} ${user.firstName} ${user.lastName} ?`)) return;
    try {
      await adminApi.toggleBlock(user._id);
      setToast({ message: `Utilisateur ${user.isBlocked ? 'débloqué' : 'bloqué'}`, type: 'success' });
      await loadUsers();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Error', type: 'error' });
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Supprimer définitivement ${user.firstName} ${user.lastName} ?`)) return;
    try {
      await adminApi.deleteUser(user._id);
      setToast({ message: 'Utilisateur supprimé', type: 'success' });
      await loadUsers();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Error', type: 'error' });
    }
  };

  const filtered = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email} ${u.position}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {modalRole && (
        <CreateUserModal
          role={modalRole}
          onSave={handleCreate}
          onClose={() => setModalRole(null)}
          loading={modalLoading}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">👥 {t('employees')}</h1>
          <p className="page-subtitle">{users.length} utilisateurs enregistrés</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => setModalRole('admin')}>
            🛡️ {t('createAdmin')}
          </button>
          <button className="btn btn-primary" onClick={() => setModalRole('employee')}>
            ➕ {t('createEmployee')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          className="form-input"
          style={{ maxWidth: 400 }}
          placeholder="🔍 Rechercher par nom, email, poste..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto', width: 40, height: 40 }} />
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Type</th>
                <th>Poste</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: user.role === 'admin' ? 'var(--secondary)' : 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 900, fontSize: 14, flexShrink: 0,
                      }}>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{user.firstName} {user.lastName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Depuis {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user.email}</td>
                  <td>
                    <span className={`badge ${user.role === 'admin' ? 'badge-secondary' : 'badge-primary'}`}>
                      {user.role === 'admin' ? '🛡️ Admin' : '👤 Employé'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-primary">
                      {user.employeeType === 'stagiaire' ? t('stagiaire') : t('employe')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user.position || '—'}</td>
                  <td>
                    <span className={`badge ${user.isBlocked ? 'badge-danger' : 'badge-success'}`}>
                      {user.isBlocked ? t('blocked') : t('active')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className={`btn btn-sm ${user.isBlocked ? 'btn-secondary' : 'btn-outline'}`}
                        onClick={() => handleToggleBlock(user)}
                        title={user.isBlocked ? t('unblockUser') : t('blockUser')}
                      >
                        {user.isBlocked ? '🔓' : '🔒'}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(user)}
                        title={t('deleteUser')}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
};

export default Employees;
