import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { ProductCatalogApi } from '../services/productCatalogApi';
import { createCareDroidBrainService } from '../services/careDroidBrainService';
import './CareDroidBrainDashboard.css';

function normalizeList(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
}

function KnowledgeMetric({ metric }) {
  return (
    <article className="brain-metric">
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
    </article>
  );
}

function KnowledgeSection({ title, domain }) {
  return (
    <section className="brain-panel" aria-labelledby={`brain-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <header>
        <div>
          <p className="brain-eyebrow">Brain domain</p>
          <h2 id={`brain-${title.toLowerCase().replace(/\s+/g, '-')}`}>{title}</h2>
        </div>
      </header>
      <div className="brain-metric-grid">
        {(domain.metrics || []).map((metric) => (
          <KnowledgeMetric key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="brain-insight-list">
        {(domain.insights || []).slice(0, 4).map((insight, index) => (
          <p key={`${title}-${index}-${insight}`}>{insight}</p>
        ))}
        {!domain.insights?.length ? <p>No insights available yet.</p> : null}
      </div>
    </section>
  );
}

function ActionCard({ action }) {
  return (
    <article className={`brain-action brain-action--${action.priority}`}>
      <div>
        <span>{action.type.replace(/_/g, ' ')}</span>
        <strong>{Math.round(action.confidence * 100)}%</strong>
      </div>
      <h3>{action.title}</h3>
      <p>{action.rationale}</p>
      <footer>
        <span>{action.sourceSignals.slice(0, 3).join(' | ')}</span>
        <Link to={action.route || '/dashboard'}>Review</Link>
      </footer>
    </article>
  );
}

export default function CareDroidBrainDashboard() {
  const { user } = useUser();
  const userIdentity = useUserIdentity();
  const workspaceContext = useWorkspace();
  const toolPreferences = useToolPreferences();
  const [productRows, setProductRows] = useState([]);
  const [agentRows, setAgentRows] = useState([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      ProductCatalogApi.listProductBuilder(userIdentity.organization?.id),
      ProductCatalogApi.listAgents(),
    ]).then(([productsResult, agentsResult]) => {
      if (cancelled) return;
      if (productsResult.status === 'fulfilled') {
        setProductRows(normalizeList(productsResult.value, 'products'));
      }
      if (agentsResult.status === 'fulfilled') {
        setAgentRows(normalizeList(agentsResult.value, 'agents'));
      }
      if (productsResult.status === 'rejected' || agentsResult.status === 'rejected') {
        setNotice('Using local Brain intelligence where product or agent catalog data is unavailable.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userIdentity.organization?.id]);

  const brain = useMemo(() => {
    const service = createCareDroidBrainService();
    return service.buildSnapshot({
      ...userIdentity,
      user,
      workspaceContext,
      toolPreferences,
      productRows,
      agentRows,
      memoryFabricContext: userIdentity.memoryFabricContext,
      activity: userIdentity.activity,
    });
  }, [agentRows, productRows, toolPreferences, user, userIdentity, workspaceContext]);

  const domains = brain.domains;

  return (
    <section className="brain-page">
      <section className="brain-hero" aria-labelledby="brain-title">
        <div>
          <p className="brain-eyebrow">CareDroid Brain Layer</p>
          <h1 id="brain-title">Centralized Platform Intelligence</h1>
          <p>
            The Brain understands artifacts, knowledge graph relationships, memory, recommendations,
            automations, AI agents, and learning signals so CareDroid can recommend action across the whole platform.
          </p>
          <p className="brain-support-copy">
            Advisory only: the Brain recommends and explains; it does not automatically change products,
            assets, automations, or workflows.
          </p>
        </div>
        <div className="brain-hero__scorecard" aria-label="Brain summary">
          <strong>{brain.summary.actions}</strong>
          <span>Brain actions</span>
          <small>{brain.summary.artifacts} artifacts | {brain.summary.graphNodes} graph nodes</small>
        </div>
      </section>

      {notice ? <p className="brain-notice">{notice}</p> : null}

      <section className="brain-source-strip" aria-label="Brain source systems">
        {brain.sourceSystems.map((source) => (
          <span key={source}>{source}</span>
        ))}
      </section>

      <section className="brain-panel" aria-labelledby="brain-actions-title">
        <header>
          <div>
            <p className="brain-eyebrow">Recommended actions</p>
            <h2 id="brain-actions-title">What the Brain recommends next</h2>
          </div>
          <span>{brain.actions.length} actions</span>
        </header>
        <div className="brain-action-grid">
          {brain.actions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      </section>

      <div className="brain-domain-grid">
        <KnowledgeSection title="Platform Knowledge" domain={domains.platformKnowledge} />
        <KnowledgeSection title="Organization Knowledge" domain={domains.organizationKnowledge} />
        <KnowledgeSection title="Role Knowledge" domain={domains.roleKnowledge} />
        <KnowledgeSection title="Asset Knowledge" domain={domains.assetKnowledge} />
        <KnowledgeSection title="Automation Knowledge" domain={domains.automationKnowledge} />
      </div>
    </section>
  );
}
