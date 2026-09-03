import type { ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { EMERGENCY_OS_BRANDING } from '../config/emergencyOsBranding.config';
import ErrorBoundary from '../components/ErrorBoundary';
import './DisplayShell.css';

type DisplayShellProps = Readonly<{
  children?: ReactNode;
}>;

/**
 * Wall/overhead display chrome — no sidebar, no copilot, PHI-safe layouts only.
 */
export function DisplayShell({ children }: DisplayShellProps) {
  const location = useLocation();

  return (
    <div className="display-shell cdl-shell cdl-shell--display" data-care-surface="display">
      <header className="display-shell__brand" aria-label="CareDroid display">
        <span className="display-shell__title">{EMERGENCY_OS_BRANDING.productName}</span>
        <span className="display-shell__subtitle">{EMERGENCY_OS_BRANDING.platformLine}</span>
      </header>
      <main className="display-shell__main">
        {/* Unlike the interactive AppShell, nobody is standing in front of a
            wall/overhead display to click "reload" — a crash here previously
            fell through to the single top-level ErrorBoundary in App.tsx,
            unmounting the whole React tree (including this header) on an
            unattended screen. Scoping the boundary to the routed content
            keeps the display chrome up and resets automatically on the next
            navigation (resetKey), rather than needing a manual refresh. */}
        <ErrorBoundary
          key={location.pathname}
          resetKey={location.pathname}
          fallbackText={`${EMERGENCY_OS_BRANDING.productName} display encountered an error.`}
        >
          {children ?? <Outlet />}
        </ErrorBoundary>
      </main>
    </div>
  );
}
