import { useState } from 'react';
import { Link } from 'react-router-dom';
import ClinicalKnowledgeGraph from '../ClinicalKnowledgeGraph';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useIntegrationHub } from '../../hooks/useIntegrationHub';
import './CosmosViewer.css';

const TABS = Object.freeze([
  { id: 'artifacts', label: 'Artifacts' },
  { id: 'integration', label: 'Integration topology' },
]);

export default function CosmosViewer() {
  const [activeTab, setActiveTab] = useState('artifacts');
  const { status, envelope, recentEvents } = useIntegrationHub(12);
  const sources = envelope?.data?.sources || [];

  return (
    <div className="cosmos-viewer">
      <header className="cosmos-viewer__hero">
        <p className="cosmos-viewer__eyebrow">CareDroid Cosmos Viewer</p>
        <h1>Cosmos Viewer</h1>
        <p>
          Artifact relationships and integration topology across CareDroid modules, routes, and
          connector spines.
        </p>
        <div className="cosmos-viewer__links">
          <Link to={CANONICAL_ROUTES.integrationHub}>Integration Hub</Link>
          <Link to={CANONICAL_ROUTES.knowledgeGraph}>Clinical Knowledge Graph</Link>
        </div>
      </header>

      <div className="cosmos-viewer__tabs" role="tablist" aria-label="Cosmos Viewer tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="cosmos-viewer__panel" role="tabpanel">
        {activeTab === 'artifacts' ? (
          <ClinicalKnowledgeGraph />
        ) : (
          <>
            <div className="cosmos-viewer__integration-summary">
              <article>
                <strong>Hub status</strong>
                <p>{status === 'loading' ? 'Loading...' : `${sources.length} connector source(s)`}</p>
              </article>
              <article>
                <strong>Recent events</strong>
                <p>{recentEvents.length ? `${recentEvents.length} persisted event(s)` : 'No events'}</p>
              </article>
              <article>
                <strong>Spine</strong>
                <p>POST /api/interoperability/events → normalized records</p>
              </article>
            </div>
            <p>
              Integration topology maps FHIR, HL7, and device telemetry into the real Integration
              Hub. CareDroid still consumes the fixture envelope at GET /api/emergency/integrations
              until store consumers are wired.
            </p>
            <Link to={CANONICAL_ROUTES.integrationHub}>Open Integration Hub dashboard</Link>
          </>
        )}
      </div>
    </div>
  );
}
