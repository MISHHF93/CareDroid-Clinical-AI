import { Link } from 'react-router-dom';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import DrugChecker from '../tools/DrugChecker';
import './PharmacyDashboard.css';

/**
 * First non-emergency-department clinical workspace: proves the platform's
 * capability fabric (tool-orchestrator, permission gating, route chrome)
 * generalizes beyond the ED rather than being rebuilt per department. The
 * drug-interaction checker below is the same real, tool-orchestrator-backed
 * capability registered as `calculator:drug-interactions` in
 * lib/ai/capabilityRegistrations.ts — embedded here, not reimplemented.
 */
export default function PharmacyDashboard() {
  useRouteChromeRegistration({ title: 'Pharmacy' });

  return (
    <main className="pharmacy-page" aria-label="Pharmacy dashboard">
      <header className="pharmacy-page__header">
        <div className="pharmacy-page__title-row">
          <GraphicIconBadge iconKey="pharmacy" accent="brand" size="md" />
          <div>
            <p className="pharmacy-page-title-text" data-testid="cd-page-title-text">
              Pharmacy
            </p>
            <p>
              Medication safety review for this organization — drug-interaction and allergy
              cross-reactivity checking.
            </p>
          </div>
        </div>
        <div className="pharmacy-page__actions">
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
          <Link to={CANONICAL_ROUTES.laboratory}>Laboratory</Link>
          <Link to={CANONICAL_ROUTES.tools}>Tools overview</Link>
        </div>
      </header>

      <section className="pharmacy-page__panel" aria-label="Drug interaction checker">
        <DrugChecker embedded />
      </section>
    </main>
  );
}
