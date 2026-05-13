import React from 'react';
import './AuthShell.css';

const AuthShell = ({ children }) => {
  return (
    <div className="auth-shell">
      <div className="auth-shell-hero">
        <div className="auth-shell-title">CareDroid-Clinical-AI</div>
        <p className="auth-shell-lead">
          A premium clinical AI workspace for fast, structured guidance. Secure, compliant, and built for teams.
        </p>
        <div className="auth-shell-cards">
          <div className="card-subtle auth-shell-card">⚡ Evidence‑based responses and clinical calculators</div>
          <div className="card-subtle auth-shell-card">🔒 HIPAA‑ready workflow with auditability</div>
          <div className="card-subtle auth-shell-card">🧠 Contextual tools surfaced inside chat</div>
        </div>
      </div>
      <div className="auth-shell-form-wrap">{children}</div>
    </div>
  );
};

export default AuthShell;
