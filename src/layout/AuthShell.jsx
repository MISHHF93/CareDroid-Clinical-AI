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

/**
 * Single-column auth layout: intro, highlights, and form share one card.
 */
const AuthShell = ({ children }) => {
  return (
    <div className="auth-shell">
      <div className="auth-shell-card">
        <header className="auth-shell-intro">
          <div className="auth-shell-brand">
            <span className="auth-shell-brand-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.hospital} size={32} />
            </span>
            <span className="auth-shell-brand-text">CareDroid Clinical AI</span>
          </div>
          <h1 className="auth-shell-title">Your clinical workspace</h1>
          <p className="auth-shell-lead">
            Sign in once to reach secure chat, calculators, drug checks, and lab support in one place.
          </p>
        </header>

        <ul className="auth-shell-list" aria-label="Product highlights">
          {BULLETS.map(({ icon, text }) => (
            <li key={text} className="auth-shell-list-item">
              <span className="auth-shell-list-icon" aria-hidden>
                <NavIcon icon={icon} size={18} />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <div className="auth-shell-form">{children}</div>
      </div>
    </div>
  );
};

export default AuthShell;
