import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3500 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = { success: '✅', error: '❌', warning: '⚠️' };

  return (
    <div className={`toast ${type}`} onClick={onClose} style={{ cursor: 'pointer' }}>
      {icons[type]} {message}
    </div>
  );
};

export default Toast;
