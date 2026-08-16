import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, X } from 'lucide-react';
import useAiChiefOrchestrator from '../../hooks/useAiChiefOrchestrator';
import useThreeMinuteMission from '../../hooks/useThreeMinuteMission';
import useUnifiedWorkflowAutomation from '../../hooks/useUnifiedWorkflowAutomation';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { isHospitalOperationalPath } from '../emergency/operationalCommandBarUtils';
import OperationalIntelligenceBar from '../emergency/OperationalIntelligenceBar';
import ThreeMinuteMissionBar from '../emergency/ThreeMinuteMissionBar';
import WorkflowAutomationCommandBar from '../emergency/WorkflowAutomationCommandBar';
import './OperationsCenterMenu.css';

/**
 * Single header-anchored entry point for AI Chief / operational intelligence / 3-minute
 * missions / workflow automation — content that used to be four permanently-stacked bars
 * in AppShell's page body on every route. The hooks here (all realtime where the removed
 * bars used to be the app's sole always-mounted instance) keep mission-breach detection and
 * workflow-queue refresh alive regardless of whether the panel is open; opening the panel
 * mounts the same bar components the old stack used, just inside a dropdown instead of the
 * page flow.
 */
export default function OperationsCenterMenu() {
  const { pathname } = useLocation();
  const surfaces = usePractitionerSurfaceVisibility();
  const aiChief = useAiChiefOrchestrator({ realtime: false });
  const missionState = useThreeMinuteMission({ realtime: true });
  const workflow = useUnifiedWorkflowAutomation({ realtime: true });
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  // HEAL-272: click-outside already closes this menu (above), but there
  // was no Escape-key handler for the AI Chief / 3-minute-mission /
  // workflow-automation panel.
  useEffect(() => {
    if (!open) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const surfacesVisible =
    surfaces.emergencyRoutes.showAiChiefBar ||
    surfaces.emergencyRoutes.showThreeMinuteMissionBar ||
    surfaces.emergencyRoutes.showWorkflowAutomationBar;

  if (!surfacesVisible || !isHospitalOperationalPath(pathname)) {
    return null;
  }

  const criticalCount = aiChief.criticalDomainCount + missionState.breachCount + workflow.criticalCount;
  const attentionCount =
    aiChief.watchDomainCount + missionState.unacknowledgedCount + workflow.pendingCount;
  const tone = criticalCount > 0 ? 'critical' : attentionCount > 0 ? 'warning' : 'neutral';
  const badgeCount = criticalCount > 0 ? criticalCount : attentionCount;
  const label =
    badgeCount > 0
      ? `Operations center, ${badgeCount} item${badgeCount === 1 ? '' : 's'} need attention`
      : 'Operations center, all clear';

  const triggerInner = (
    <>
      <Activity size={18} strokeWidth={2} aria-hidden="true" />
      {badgeCount > 0 ? <span className="operations-center-menu__badge">{badgeCount}</span> : null}
    </>
  );

  return (
    <div className="operations-center-menu" ref={rootRef}>
      {/* Dual trigger branches use static aria-expanded true/false tokens, mirroring UserAccountMenu. */}
      {open ? (
        <button
          type="button"
          className={`operations-center-menu__trigger operations-center-menu__trigger--open operations-center-menu__trigger--${tone}`}
          aria-haspopup="dialog"
          aria-expanded="true"
          aria-controls="operations-center-panel"
          id="operations-center-trigger"
          aria-label={label}
          title="Operations center"
          onClick={() => setOpen(false)}
        >
          {triggerInner}
        </button>
      ) : (
        <button
          type="button"
          className={`operations-center-menu__trigger operations-center-menu__trigger--${tone}`}
          aria-haspopup="dialog"
          aria-expanded="false"
          aria-controls="operations-center-panel"
          id="operations-center-trigger"
          aria-label={label}
          title="Operations center"
          onClick={() => setOpen(true)}
        >
          {triggerInner}
        </button>
      )}

      {open ? (
        <div
          className="operations-center-menu__dropdown"
          id="operations-center-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="operations-center-title"
        >
          <header className="operations-center-menu__header">
            <h2 id="operations-center-title">Operations center</h2>
            <button
              type="button"
              className="operations-center-menu__close"
              onClick={() => setOpen(false)}
              aria-label="Close operations center"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </header>

          <div className="operations-center-menu__body">
            <OperationalIntelligenceBar />
            <ThreeMinuteMissionBar />
            <WorkflowAutomationCommandBar />
          </div>

          <footer className="operations-center-menu__footer">
            <Link
              to={CANONICAL_ROUTES.emergencyCommandCenter}
              className="operations-center-menu__footer-link"
              onClick={() => setOpen(false)}
            >
              Open Command Center
            </Link>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
