import React from 'react';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './AuthShell.css';

/**
 * Full-page auth wrapper: single card, one brand row — form content is not double-framed.
 */
const AuthShell = ({ children }) => {
  const { branding, organizationName } = useWhiteLabel();
  const brandName = branding.displayName || organizationName || 'CareDroid Clinical AI';
  return (
    <div className="auth-shell">
      <div className="auth-shell-card">
        <header className="auth-shell-brandbar">
          <span className="auth-shell-brand-icon" aria-hidden>
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="auth-shell-brand-logo" />
            ) : (
              <NavIcon icon={CHROME_ICONS.hospital} size={28} />
            )}
          </span>
          <span className="auth-shell-brand-text">{brandName}</span>
        </header>
        <div className="auth-shell-body">{children}</div>
      </div>
    </div>
  );
};

export default AuthShell;
