import React from 'react';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './AuthShell.css';

/**
 * Full-page auth wrapper: single card, one brand row — form content is not double-framed.
 */
const AuthShell = ({ children }) => {
  return (
    <div className="auth-shell">
      <div className="auth-shell-card">
        <header className="auth-shell-brandbar">
          <span className="auth-shell-brand-icon" aria-hidden>
            <NavIcon icon={CHROME_ICONS.hospital} size={28} />
          </span>
          <span className="auth-shell-brand-text">CareDroid Clinical AI</span>
        </header>
        <div className="auth-shell-body">{children}</div>
      </div>
    </div>
  );
};

export default AuthShell;
