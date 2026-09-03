import { Link } from 'react-router-dom';
import { GitBranch } from 'lucide-react';
import useUnifiedApplicationKnowledgeGraph from '../../hooks/useUnifiedApplicationKnowledgeGraph';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import './unified-application-knowledge-graph-panel.css';

type UnifiedApplicationKnowledgeGraphPanelProps = {
  className?: string;
  selectedPatientId?: string | null;
};

export function UnifiedApplicationKnowledgeGraphPanel({
  className = '',
  selectedPatientId = null,
}: UnifiedApplicationKnowledgeGraphPanelProps) {
  const { snapshot, dashboardSummary, selectedPatientContext, metrics, lastRefreshedAt } =
    useUnifiedApplicationKnowledgeGraph({ selectedPatientId });

  return (
    <section
      className={`unified-application-knowledge-graph-panel ${className}`.trim()}
      aria-label="Unified application knowledge graph"
    >
      <header className="unified-application-knowledge-graph-panel__header">
        <div className="unified-application-knowledge-graph-panel__identity">
          <GitBranch size={16} aria-hidden="true" />
          <strong>Application knowledge graph</strong>
          <span>
            {metrics.nodeCount} nodes · {metrics.edgeCount} edges
          </span>
          {lastRefreshedAt ? (
            <span className="unified-application-knowledge-graph-panel__refreshed">
              Updated {new Date(lastRefreshedAt).toLocaleTimeString()}
            </span>
          ) : null}
        </div>
      </header>

      <p className="unified-application-knowledge-graph-panel__safety" role="note">
        {snapshot.safetyStatement} Connected references only — no duplicated entity records.
      </p>

      <div className="unified-application-knowledge-graph-panel__metrics" role="status">
        <span>{metrics.patients} patients</span>
        <span>{metrics.staff} staff</span>
        <span>{metrics.departments} departments</span>
        <span>{metrics.activeAlerts} alerts</span>
        <span>{metrics.openWorkflows} workflows</span>
        <span>{metrics.aiRecommendations} AI recs</span>
        <span>{metrics.connectedServices} services</span>
        <span>{metrics.occupiedBeds} beds</span>
      </div>

      {selectedPatientContext ? (
        <div className="unified-application-knowledge-graph-panel__patient-context">
          <strong>Selected patient connections</strong>
          <span>
            {selectedPatientContext.alerts.length} alerts ·{' '}
            {selectedPatientContext.recommendations.length} recommendations ·{' '}
            {selectedPatientContext.workflows.length} workflows ·{' '}
            {selectedPatientContext.staff.length} staff
          </span>
        </div>
      ) : null}

      <div className="unified-application-knowledge-graph-panel__sections">
        <section>
          <h3>Most connected patients</h3>
          {dashboardSummary.topConnectedPatients.length === 0 ? (
            <p className="unified-application-knowledge-graph-panel__empty">
              No active patient connections.
            </p>
          ) : (
            <ul>
              {dashboardSummary.topConnectedPatients.map((entry) => (
                <li key={entry.patientId}>
                  <Link
                    to={`${CANONICAL_ROUTES.emergencyPatients}?patient=${encodeURIComponent(entry.patientId)}`}
                  >
                    {entry.label}
                  </Link>
                  <span>{entry.connectionCount} connections</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3>Department load</h3>
          <ul>
            {dashboardSummary.departmentLoad
              .filter((entry) => entry.patientCount > 0)
              .slice(0, 6)
              .map((entry) => (
                <li key={entry.departmentId}>
                  <span>{entry.label}</span>
                  <span>{entry.patientCount} patients</span>
                </li>
              ))}
          </ul>
        </section>

        <section>
          <h3>Critical connected signals</h3>
          {dashboardSummary.criticalNodes.length === 0 ? (
            <p className="unified-application-knowledge-graph-panel__empty">
              No critical graph signals.
            </p>
          ) : (
            <ul>
              {dashboardSummary.criticalNodes.slice(0, 6).map((node) => (
                <li key={node.id}>
                  <strong>{node.label}</strong>
                  <span>{node.entityType.replace(/_/g, ' ')}</span>
                  {node.route ? (
                    <Link to={node.route} className="cd-btn cd-btn--ghost cd-btn--sm">
                      Open
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3>Recent operational events</h3>
          <ul>
            {dashboardSummary.recentOperationalEvents.slice(0, 5).map((node) => (
              <li key={node.id}>
                <strong>{node.label}</strong>
                <span>{node.summary}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

export default UnifiedApplicationKnowledgeGraphPanel;
