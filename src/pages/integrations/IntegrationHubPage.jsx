import { Link } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { mapLiveSourceStatusToNormalized } from '../../config/integrationStatusModel';
import IntegrationStatusBadge from '../../components/integrations/IntegrationStatusBadge';
import IntegrationStatusPanel from '../../components/integrations/IntegrationStatusPanel';
import { useIntegrationHub } from '../../hooks/useIntegrationHub';
import './IntegrationHubPage.css';

function sourceLabel(source) {
  return String(source?.label || source?.id || 'Unknown source');
}

export default function IntegrationHubPage() {
  const { status, error, envelope, interoperabilitySummary, recentEvents, refresh } =
    useIntegrationHub();

  const sources = envelope?.data?.sources || [];
  const reviewQueue = envelope?.data?.reviewQueue || [];
  const gaps = envelope?.remainingGaps || [];
  const connectionState =
    typeof interoperabilitySummary?.uiStates === 'object' &&
    interoperabilitySummary.uiStates &&
    'connectionState' in interoperabilitySummary.uiStates
      ? String(interoperabilitySummary.uiStates.connectionState)
      : 'unknown';

  return (
    <div className="integration-hub-page">
      <header className="integration-hub-page__hero">
        <p className="integration-hub-page__eyebrow">CareDroid Integration Hub</p>
        <h1>Integration Hub</h1>
        <p>
          Connector status, review queue, and recent interoperability events. CareDroid fixture
          envelope is merged with live `/api/interoperability/*` when available.
        </p>
        <div className="integration-hub-page__links">
          <Link to={CANONICAL_ROUTES.emergencySettings}>Emergency Settings</Link>
          <Link to={CANONICAL_ROUTES.cosmosViewer}>Cosmos Viewer</Link>
          <button type="button" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </header>

      <IntegrationStatusPanel liveSources={sources} />

      <div className="integration-hub-page__cards" aria-label="Integration Hub summary">
        <article>
          <strong>Backend envelope</strong>
          <p>
            {status === 'loading'
              ? 'Loading...'
              : status === 'error'
                ? error
                : `${sources.length} source(s) from ${envelope?.module || 'Integration Hub'}.`}
          </p>
          <small>{envelope?.source || 'backend-fixture'}</small>
        </article>
        <article>
          <strong>Interoperability spine</strong>
          <p>{connectionState.replace(/_/g, ' ')}</p>
          <small>/api/interoperability/summary</small>
        </article>
        <article>
          <strong>Review queue</strong>
          <p>
            {reviewQueue.length
              ? `${reviewQueue.length} item(s) require staff awareness.`
              : 'No review items returned.'}
          </p>
        </article>
        <article>
          <strong>Recent events</strong>
          <p>{recentEvents.length ? `${recentEvents.length} event(s) loaded.` : 'No events yet.'}</p>
        </article>
      </div>

      <section className="integration-hub-page__section" aria-label="Integration sources">
        <h2>Sources</h2>
        {sources.length ? (
          <table className="integration-hub-page__table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Status</th>
                <th>Last event</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={String(source.id)}>
                  <td>{sourceLabel(source)}</td>
                  <td>
                    <IntegrationStatusBadge
                      status={
                        mapLiveSourceStatusToNormalized(source.status) || 'placeholder'
                      }
                    />
                    <small style={{ display: 'block', marginTop: 4, color: '#64748b' }}>
                      {String(source.status || 'unknown')}
                    </small>
                  </td>
                  <td>{source.lastEventAt ? String(source.lastEventAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="integration-hub-page__empty">No integration sources returned.</p>
        )}
      </section>

      {gaps.length ? (
        <section className="integration-hub-page__section" aria-label="Remaining gaps">
          <h2>Remaining gaps</h2>
          <ul>
            {gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="integration-hub-page__section" aria-label="Recent integration events">
        <h2>Recent events</h2>
        {recentEvents.length ? (
          <table className="integration-hub-page__table">
            <thead>
              <tr>
                <th>Family</th>
                <th>Type</th>
                <th>Status</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.slice(0, 12).map((event) => (
                <tr key={String(event.id || `${event.family}-${event.receivedAt}`)}>
                  <td>{String(event.family || '—')}</td>
                  <td>{String(event.eventType || '—')}</td>
                  <td>{String(event.processingStatus || event.status || '—')}</td>
                  <td>{String(event.receivedAt || '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="integration-hub-page__empty">
            No persisted interoperability events yet. Ingest via POST /api/interoperability/events.
          </p>
        )}
      </section>
    </div>
  );
}
