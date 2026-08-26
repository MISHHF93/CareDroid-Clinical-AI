import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { CAREDROID_PRODUCT } from '../config/caredroidProduct.config';
import { resolveAppStartupRoute } from '../config/appStartupModel';
import './EntryShell.css';

type EntryShellProps = {
  children: ReactNode;
};

/**
 * Minimal shell for optional platform orientation (/start).
 * Keeps entry hub out of the operational AppShell so it cannot stack over ED pages.
 */
export function EntryShell({ children }: EntryShellProps) {
  const clinicalHome = resolveAppStartupRoute();

  return (
    <div className="entry-shell cdl-shell cdl-shell--entry">
      <header className="entry-shell__header">
        <div className="entry-shell__brand">
          <span className="entry-shell__eyebrow">CareDroid · {CAREDROID_PRODUCT.tagline}</span>
          <strong className="entry-shell__title">Platform entry</strong>
        </div>
        <nav className="entry-shell__nav" aria-label="Entry shortcuts">
          <Link className="entry-shell__link" to={clinicalHome}>
            Skip to clinical workspace
          </Link>
          <Link className="entry-shell__link entry-shell__link--primary" to={CANONICAL_ROUTES.emergencyReception}>
            Start at reception
          </Link>
        </nav>
      </header>
      <main className="entry-shell__main" id="main-content" role="main">
        {children}
      </main>
    </div>
  );
}