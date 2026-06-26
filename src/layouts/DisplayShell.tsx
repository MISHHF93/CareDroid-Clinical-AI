import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { EMERGENCY_OS_BRANDING } from '../config/emergencyOsBranding.config';
import './DisplayShell.css';

type DisplayShellProps = Readonly<{
  children?: ReactNode;
}>;

/**
 * Wall/overhead display chrome — no sidebar, no copilot, PHI-safe layouts only.
 */
export function DisplayShell({ children }: DisplayShellProps) {
  return (
    <div className="display-shell" data-care-surface="display">
      <header className="display-shell__brand" aria-label="CareDroid display">
        <span className="display-shell__title">{EMERGENCY_OS_BRANDING.productName}</span>
        <span className="display-shell__subtitle">{EMERGENCY_OS_BRANDING.platformLine}</span>
      </header>
      <main className="display-shell__main">{children ?? <Outlet />}</main>
    </div>
  );
}