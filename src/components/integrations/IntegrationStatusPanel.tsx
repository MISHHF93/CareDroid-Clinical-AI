import {
  buildIntegrationCategorySummaries,
  mergeRegistryWithLiveSources,
  normalizeIntegrationStatusLabel,
} from '../../config/integrationStatusModel';
import IntegrationStatusBadge from './IntegrationStatusBadge';
import './IntegrationStatusPanel.css';

function formatCounts(counts: any = {}) {
  return ['implemented', 'partial', 'placeholder']
    .filter((key) => counts[key])
    .map((key) => `${counts[key]} ${normalizeIntegrationStatusLabel(key).toLowerCase()}`)
    .join(' · ');
}

export default function IntegrationStatusPanel({
  liveSources = [] as any[],
  showDetailTable = true,
  className = '',
}) {
  const categories = buildIntegrationCategorySummaries();
  const mergedPoints = mergeRegistryWithLiveSources(undefined, liveSources);

  return (
    <section
      className={['integration-status-panel', className].filter(Boolean).join(' ')}
      aria-label="Integration status by category"
    >
      <p className="integration-status-panel__intro">
        Normalized status across FHIR, HL7, Provincial, Notification, and Identity systems.
        Implemented = production behavior; Partial = contracts or local UX without full feed;
        Placeholder = demo or stub only.
      </p>

      <div className="integration-status-panel__categories">
        {categories.map((category) => (
          <article key={category.category} className="integration-status-panel__category">
            <header>
              <h3>{category.category}</h3>
              <IntegrationStatusBadge status={category.status} />
            </header>
            <p>{category.guidance}</p>
            <span className="integration-status-panel__counts">
              {category.pointCount} integration point{category.pointCount === 1 ? '' : 's'}
              {formatCounts(category.counts) ? ` · ${formatCounts(category.counts)}` : ''}
            </span>
          </article>
        ))}
      </div>

      {showDetailTable ? (
        <div className="integration-status-panel__table-wrap">
          <table className="integration-status-panel__table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Integration</th>
                <th>Status</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {mergedPoints.map((point) => (
                <tr key={point.id}>
                  <td>{point.category}</td>
                  <td>
                    <strong>{point.label}</strong>
                    {point.liveStatus ? (
                      <span className="integration-status-panel__live">
                        Live source: {point.liveStatus}
                        {point.liveLastEventAt ? ` · ${point.liveLastEventAt}` : ''}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <IntegrationStatusBadge status={point.status} />
                  </td>
                  <td>{point.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
