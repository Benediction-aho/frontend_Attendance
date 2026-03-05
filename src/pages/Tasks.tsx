import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { taskApi, TaskPayload } from '../api/taskApi';
import { attendanceApi } from '../api/attendanceApi';
import Toast from '../components/Toast';
import AppLayout from '../layouts/AppLayout';

interface Task {
  _id: string;
  description: string;
  difficulties: string;
  status: 'completed' | 'pending';
  date: string;
  createdAt: string;
}

const TaskModal: React.FC<{
  task?: Task;
  onSave: (data: TaskPayload) => void;
  onClose: () => void;
  loading: boolean;
}> = ({ task, onSave, onClose, loading }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    description: task?.description || '',
    difficulties: task?.difficulties || '',
    status: task?.status || 'pending' as 'pending' | 'completed',
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">
          {task ? '✏️ Modifier la tâche' : '➕ Nouvelle tâche'}
        </h3>
        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea
            className="form-input"
            rows={3}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Décrivez votre tâche..."
            required
            style={{ resize: 'vertical' }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Difficultés rencontrées</label>
          <textarea
            className="form-input"
            rows={2}
            value={form.difficulties}
            onChange={e => setForm({ ...form, difficulties: e.target.value })}
            placeholder="Problèmes rencontrés (optionnel)..."
            style={{ resize: 'vertical' }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Statut</label>
          <select
            className="form-input"
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value as 'pending' | 'completed' })}
          >
            <option value="pending">⏳ {t('pending')}</option>
            <option value="completed">✅ {t('completed')}</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>{t('cancel')}</button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(form)}
            disabled={loading || !form.description.trim()}
          >
            {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : null}
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
};

const Tasks: React.FC = () => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | undefined>(undefined);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  useEffect(() => {
    checkStatus();
    loadTasks();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await attendanceApi.getToday();
      setHasCheckedIn(!!res.data.attendance);
    } catch {}
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await taskApi.getMy({ date: today });
      setTasks(res.data.tasks);
    } catch {}
    setLoading(false);
  };

  const handleSave = async (data: TaskPayload) => {
    setModalLoading(true);
    try {
      if (editTask) {
        await taskApi.update(editTask._id, data);
        setToast({ message: t('taskUpdated'), type: 'success' });
      } else {
        await taskApi.create(data);
        setToast({ message: t('taskCreated'), type: 'success' });
      }
      await loadTasks();
      setShowModal(false);
      setEditTask(undefined);
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Error', type: 'error' });
    }
    setModalLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette tâche ?')) return;
    try {
      await taskApi.delete(id);
      setToast({ message: t('taskDeleted'), type: 'success' });
      await loadTasks();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Error', type: 'error' });
    }
  };

  const toggleStatus = async (task: Task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await taskApi.update(task._id, { status: newStatus });
      await loadTasks();
    } catch {}
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <AppLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showModal && (
        <TaskModal
          task={editTask}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTask(undefined); }}
          loading={modalLoading}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">✅ {t('tasks')}</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' • '}{completedCount}/{tasks.length} complétées
          </p>
        </div>
        {hasCheckedIn && (
          <button
            className="btn btn-primary"
            onClick={() => { setEditTask(undefined); setShowModal(true); }}
          >
            ➕ {t('addTask')}
          </button>
        )}
      </div>

      {!hasCheckedIn && (
        <div style={{
          padding: '20px 24px',
          background: 'rgba(231,76,60,0.08)',
          border: '1px solid rgba(231,76,60,0.2)',
          borderRadius: 'var(--radius)',
          color: 'var(--danger)',
          fontWeight: 600,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          🔒 {t('mustCheckIn')}
        </div>
      )}

      {/* Progress */}
      {tasks.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Progression du jour</span>
            <span style={{ fontWeight: 900, color: 'var(--primary)' }}>
              {tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%
            </span>
          </div>
          <div style={{
            height: 8,
            background: 'var(--border)',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%`,
              background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
              borderRadius: 4,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 40, height: 40 }} />
          <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-text">
            {hasCheckedIn ? 'Aucune tâche pour aujourd\'hui' : 'Pointez pour accéder aux tâches'}
          </div>
          {hasCheckedIn && (
            <button
              className="btn btn-primary"
              style={{ margin: '16px auto 0', display: 'flex' }}
              onClick={() => setShowModal(true)}
            >
              ➕ Créer ma première tâche
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tasks.map(task => (
            <div
              key={task._id}
              className="card"
              style={{
                padding: '20px',
                borderLeft: `4px solid ${task.status === 'completed' ? 'var(--success)' : 'var(--secondary)'}`,
                opacity: task.status === 'completed' ? 0.85 : 1,
                animation: 'fadeIn 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {/* Checkbox */}
                <button
                  onClick={() => hasCheckedIn && toggleStatus(task)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    border: `2px solid ${task.status === 'completed' ? 'var(--success)' : 'var(--border)'}`,
                    background: task.status === 'completed' ? 'var(--success)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 14,
                    flexShrink: 0,
                    cursor: hasCheckedIn ? 'pointer' : 'default',
                    marginTop: 2,
                  }}
                >
                  {task.status === 'completed' ? '✓' : ''}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: 'var(--text)',
                    textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                    marginBottom: task.difficulties ? 6 : 0,
                    wordBreak: 'break-word',
                  }}>
                    {task.description}
                  </p>
                  {task.difficulties && (
                    <p style={{
                      fontSize: 13,
                      color: 'var(--warning)',
                      background: 'rgba(243,156,18,0.08)',
                      padding: '4px 10px',
                      borderRadius: 6,
                      display: 'inline-block',
                    }}>
                      ⚠️ {task.difficulties}
                    </p>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <span className={`badge ${task.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                      {task.status === 'completed' ? t('completed') : t('pending')}
                    </span>
                  </div>
                </div>

                {hasCheckedIn && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => { setEditTask(task); setShowModal(true); }}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(task._id)}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default Tasks;
