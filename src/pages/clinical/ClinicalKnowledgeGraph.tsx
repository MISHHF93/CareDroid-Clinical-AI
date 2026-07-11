import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CategoryBarChart,
  MetricCard,
  VisualizationPanel,
} from '../../components/dashboard/DashboardVisualizations';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  CLINICAL_KNOWLEDGE_GRAPH_NODES,
  KNOWLEDGE_GRAPH_NODE_TYPES,
  buildKnowledgeGraphSnapshot,
} from '../../data/clinicalKnowledgeGraph';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { buildKnowledgeGraphTypeChart } from '../../utils/clinicalInsightsChartModel';
import './ClinicalKnowledgeGraph.css';

export default function ClinicalKnowledgeGraph() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [selectedNodeId, setSelectedNodeId] = useState(CLINICAL_KNOWLEDGE_GRAPH_NODES[0]?.id || '');

  const snapshot = useMemo(
    () => buildKnowledgeGraphSnapshot({ query, type, selectedNodeId }),
    [query, type, selectedNodeId],
  );
  const typeChart = useMemo(() => buildKnowledgeGraphTypeChart(snapshot.counts), [snapshot.counts]);

  return (
    <main className="knowledge-graph-page" aria-label="Clinical knowledge graph">
      <header className="knowledge-graph-page__header">
        <div className="knowledge-graph-page__title-row">
          <GraphicIconBadge iconKey="layout-dashboard" accent="brand" size="md" />
          <div>
            <h1>Clinical Knowledge Graph</h1>
            <p>Relationships across calculators, protocols, simulations, labs, devices, and AI workflows.</p>
          </div>
        </div>
        <div className="knowledge-graph-page__actions">
          <Link to={CANONICAL_ROUTES.clinicalDecisionSupport}>Decision support</Link>
          <Link to={CANONICAL_ROUTES.research}>Research hub</Link>
          <Link to={CANONICAL_ROUTES.simulation}>Simulation</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Knowledge graph source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LOCAL_ONLY]}
        details="Demo relationship graph for training and workflow orientation — not a live knowledge base."
      />

      <div className="knowledge-graph-page__metrics" role="group" aria-label="Knowledge graph summary metrics">
        <MetricCard label="Nodes visible" value={String(snapshot.nodes.length)} hint="Filtered graph nodes" tone="neutral" />
        <MetricCard label="Edges visible" value={String(snapshot.edges.length)} hint="Active relationships" tone="neutral" />
        <MetricCard label="Node types" value={String(KNOWLEDGE_GRAPH_NODE_TYPES.length)} hint="Graph taxonomy" tone="neutral" />
        <MetricCard
          label="Selected"
          value={snapshot.selectedNode?.label || '—'}
          hint="Focused node context"
          tone="good"
        />
      </div>

      <div className="knowledge-graph-page__filters">
        <input
          type="search"
          placeholder="Search nodes…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search knowledge graph"
        />
        <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter node type">
          <option value="all">All types</option>
          {KNOWLEDGE_GRAPH_NODE_TYPES.map((nodeType) => (
            <option key={nodeType} value={nodeType}>{nodeType}</option>
          ))}
        </select>
      </div>

      <VisualizationPanel title="Node type distribution" description="Visible nodes grouped by graph taxonomy." badge="Types">
        <CategoryBarChart
          data={typeChart}
          title="Node type distribution"
          color="var(--app-chart-3)"
          emptyMessage="Type chart appears when nodes match the current filter."
        />
      </VisualizationPanel>

      <div className="knowledge-graph-page__layout">
        <section className="knowledge-graph-page__panel" aria-label="Graph nodes">
          <h2>Nodes</h2>
          <div className="knowledge-graph-page__nodes">
            {snapshot.nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                className={`knowledge-graph-page__node${node.id === selectedNodeId ? ' is-selected' : ''}`}
                onClick={() => setSelectedNodeId(node.id)}
                {...((node.id === selectedNodeId) ? { 'aria-pressed': 'true' as const } : { 'aria-pressed': 'false' as const })}
              >
                <strong>{node.label}</strong>
                <span>{node.type}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="knowledge-graph-page__panel" aria-label="Selected node relationships">
          <h2>{snapshot.selectedNode?.label}</h2>
          <p>{snapshot.selectedNode?.summary}</p>
          <div className="knowledge-graph-page__tags">
            {(snapshot.selectedNode?.tags || []).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          {snapshot.selectedNode?.path ? (
            <Link to={snapshot.selectedNode.path}>Open linked surface</Link>
          ) : null}
          <h3>Relationships</h3>
          <ul>
            {snapshot.neighbors.map(({ edge, node }) => (
              <li key={`${edge.source}-${edge.target}-${edge.relation}`}>
                <strong>{edge.relation}</strong> — {node?.label}
                <span>{edge.rationale}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}