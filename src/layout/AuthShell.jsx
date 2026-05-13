import React from 'react';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './AuthShell.css';

const BULLETS = [
  {
    icon: CHROME_ICONS.sparkles,
    text: 'Evidence-based guidance and built-in clinical tools',
  },
  {
    icon: CHROME_ICONS.shield,
    text: 'HIPAA-ready workflow with audit-friendly design',
  },
  {
    icon: CHROME_ICONS.hospital,
    text: 'Built for hospitals, universities, and care teams',
  },
];

const AuthShell = ({ children }) => {
  return (
    <div className="auth-shell">
      <aside className="auth-shell-hero" aria-label="Product overview">
        <div className="auth-shell-brand">
          <span className="auth-shell-brand-icon" aria-hidden>
            <NavIcon icon={CHROME_ICONS.hospital} size={36} />
          </span>
          <span className="auth-shell-brand-text">CareDroid Clinical AI</span>
        </div>
        <h1 className="auth-shell-title">Your clinical workspace</h1>
        <p className="auth-shell-lead">
          Sign in once to reach secure chat, calculators, drug checks, and lab support in one place.
        </p>
        <ul className="auth-shell-list">
          {BULLETS.map(({ icon, text }) => (
            <li key={text} className="auth-shell-list-item">
              <span className="auth-shell-list-icon" aria-hidden>
                <NavIcon icon={icon} size={20} />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </aside>
      <main className="auth-shell-main">
        <div className="auth-shell-form-inner">{children}</div>
      </main>
    </div>
  );
};

export default AuthShell;
