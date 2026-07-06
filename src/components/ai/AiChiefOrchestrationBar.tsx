import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
import useAiChiefOrchestrator from '../../hooks/useAiChiefOrchestrator';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { isHospitalOperationalPath } from '../emergency/operationalCommandBarUtils';
import '../../styles/operational-command-bar-focus.css';
import './ai-chief-orchestration-bar.css';

function AiChiefOrchestrationBar() {
  const { pathname } = useLocation();
  const surfaces = usePractitionerSurfaceVisibility();
  // AppShell + unified OI engine own live refresh; avoid a second OI poll loop here.
  const aiChief = useAiChiefOrchestrator({ realtime: false });
  const { snapshot, topRecommendation, topRisk, criticalDomainCount, watchDomainCount, knowledgeGraphSummary } = aiChief;

  if (!surfaces.emergencyRoutes.showAiChiefBar || !isHospitalOperationalPath(pathname)) {
    return null;
  }

  const tone =
    criticalDomainCount > 0 || snapshot.metrics.unacknowledgedCriticalAlerts > 0
      ? 'critical'
      : watchDomainCount > 0
        ? 'warning'
        : 'neutral';

  return (
    <aside
      className={`ai-chief-orchestration-bar ai-chief-orchestration-bar--${tone}`}
      aria-label="AI Chief orchestration status"
    >
      <div className="ai-chief-orchestration-bar__identity">
        <BrainCircuit size={16} aria-hidden="true" />
        <strong>AI Chief</strong>
        <span className="ai-chief-orchestration-bar__domains">
          {criticalDomainCount > 0
            ? `${criticalDomainCount} critical domain${criticalDomainCount === 1 ? '' : 's'}`
            : watchDomainCount > 0
              ? `${watchDomainCount} domain${watchDomainCount === 1 ? '' : 's'} on watch`
              : 'All domains stable'}
        </span>
      </div>

      <div
        className="ai-chief-orchestration-bar__signals"
        role="status"
        aria-live="polite"
        aria-atomic="false"
      >
        <span>{snapshot.metrics.activePatients} active</span>
        <span>{snapshot.metrics.p1p2Patients} P1/P2</span>
        <span>{snapshot.metrics.inboundEms} EMS inbound</span>
        {snapshot.metrics.unacknowledgedCriticalAlerts > 0 ? (
          <span className="ai-chief-orchestration-bar__alert">
            {snapshot.metrics.unacknowledgedCriticalAlerts} unacked critical
          </span>
        ) : null}
        {knowledgeGraphSummary.criticalNodes.length > 0 ? (
          <span>{knowledgeGraphSummary.criticalNodes.length} graph signals</span>
        ) : null}
      </div>

      <div className="ai-chief-orchestration-bar__insight">
        {topRisk ? (
          <p className="ai-chief-orchestration-bar__risk" title={topRisk.summary}>
            <strong>Risk:</strong> {topRisk.title}
          </p>
        ) : null}
        {topRecommendation ? (
          <p className="ai-chief-orchestration-bar__recommendation" title={topRecommendation.rationale}>
            <strong>Suggest:</strong> {topRecommendation.action}
          </p>
        ) : (
          <p className="ai-chief-orchestration-bar__recommendation ai-chief-orchestration-bar__recommendation--idle">
            Monitoring patient flow, capacity, staffing, and alerts — advisory only.
          </p>
        )}
      </div>

      <div className="ai-chief-orchestration-bar__actions">
        {topRecommendation?.route ? (
          <Link to={topRecommendation.route} className="ai-chief-orchestration-bar__action">
            Open workflow
          </Link>
        ) : null}
        <Link to={CANONICAL_ROUTES.emergencyCopilot} className="ai-chief-orchestration-bar__action">
          Ask AI Chief
        </Link>
      </div>
    </aside>
  );
}

export default memo(AiChiefOrchestrationBar);