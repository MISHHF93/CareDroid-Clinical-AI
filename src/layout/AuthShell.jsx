import React from 'react';

const AuthShell = ({ children }) => {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'var(--navy-bg)',
      color: 'var(--text-color)',
      display: 'grid',
      gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 520px)',
      gap: '32px',
      padding: '48px'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '20px'
      }}>
        <div style={{
          fontSize: '36px',
          fontWeight: 700,
          lineHeight: 1.1,
          background: 'var(--accent-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          CareDroid-Clinical-AI
        </div>
        <p style={{ fontSize: '16px', color: 'var(--muted-text)', maxWidth: '480px' }}>
          A premium clinical AI workspace for fast, structured guidance. Secure, compliant, and built for teams.
        </p>
        <div style={{ display: 'grid', gap: '10px', maxWidth: '380px' }}>
          <div className="card-subtle" style={{ padding: '14px 16px' }}>
            ⚡ Evidence‑based responses and clinical calculators
          </div>
          <div className="card-subtle" style={{ padding: '14px 16px' }}>
            🔒 HIPAA‑ready workflow with auditability
          </div>
          <div className="card-subtle" style={{ padding: '14px 16px' }}>
            🧠 Contextual tools surfaced inside chat
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
};

export default AuthShell;
