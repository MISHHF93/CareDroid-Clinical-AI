import React from 'react';

const toastStyles = {
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    zIndex: 2000,
  },
  toast: {
    minWidth: '240px',
    maxWidth: '320px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid var(--panel-border)',
    background: 'var(--panel-bg)',
    color: 'var(--text-color)',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  dot: (type) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: type === 'error' ? '#FF6B6B' : type === 'success' ? '#00FF88' : '#00FFFF',
  }),
  message: {
    fontSize: '13px',
    lineHeight: 1.4,
    flex: 1,
  },
  close: {
    background: 'transparent',
    border: 'none',
    color: 'var(--muted-text)',
    cursor: 'pointer',
    fontSize: '16px',
  },
};

const Toast = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div style={toastStyles.container}>
      {toasts.map((toast) => (
        <div key={toast.id} style={toastStyles.toast}>
          <span style={toastStyles.dot(toast.type)} />
          <div style={toastStyles.message}>{toast.message}</div>
          <button
            onClick={() => onDismiss(toast.id)}
            style={toastStyles.close}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
