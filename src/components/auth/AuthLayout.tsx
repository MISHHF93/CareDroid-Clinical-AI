import React from 'react';
import { Link } from 'react-router-dom';
import BuildInfoBadge from '../BuildInfoBadge';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext';
import '../../pages/Auth.css';

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footerExtra?: React.ReactNode;
};

export default function AuthLayout({ title, subtitle, children, footerExtra }: AuthLayoutProps) {
  const { branding } = useWhiteLabel();

  return (
    <div className="auth-root">
      <header className="auth-panel__header">
        <p className="auth-division-tag">{branding.displayName || 'CareDroid'}</p>
        <h1 className="auth-panel__title">{title}</h1>
        {subtitle ? <p className="auth-panel__subtitle">{subtitle}</p> : null}
      </header>

      {children}

      <footer className="auth-panel__footer">
        {footerExtra}
        <Link className="auth-back-link" to="/">
          ← Back to home
        </Link>
        <BuildInfoBadge className="auth-build-info" />
      </footer>
    </div>
  );
}
