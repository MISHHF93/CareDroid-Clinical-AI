import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiStateBanner from '../components/ApiStateBanner';
import { sendClinicalChatMessage } from '../services/clinicalChatService';
import {
  buildKnowledgeGraphAiPrompt,
  buildKnowledgeGraphSnapshot,
  KNOWLEDGE_GRAPH_NODE_TYPES,
} from '../data/clinicalKnowledgeGraph';
import './ClinicalKnowledgeGraph.css';

function getAssistantText(response) {
  return response?.data?.response || response?.data?.message || response?.message?.content || response?.message || '';
}

export default function ClinicalKnowledgeGraph() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [selectedNodeId, setSelectedNodeId] = useState('protocol-sepsis');
  const [assistantExplanation, setAssistantExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const snapshot = useMemo(
    () => buildKnowledgeGraphSnapshot({ query, type, selectedNodeId }),
    [query, selectedNodeId, type]
  );
  const selectedNode = snapshot.selectedNode;

  const explainWithAi = async () => {
    if (!selectedNode) return;
    setLoading(true);
    setError('');
    setAssistantExplanation('');
    try {
      const response = await sendClinicalChatMessage({
        tool: 'clinical-knowledge-graph',
        message: buildKnowledgeGraphAiPrompt(selectedNode),
      });
      if (!response?.ok) {
        throw new Error(response?.data?.message || response?.message || 'Unable to explain graph relationship.');
      }
      setAssistantExplanation(getAssistantText(response) || 'No graph explanation returned.');
    } catch (err) {
      setError(err.message || 'Unable to explain graph relationship.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="knowledge-graph-page">
      <section className="knowledge-graph-hero" aria-labelledby="knowledge-graph-title">
        <div>
          <p className="knowledge-graph-eyebrow">Clinical decision support graph</p>
          <h1 id="knowledge-graph-title">Clinical Knowledge Graph</h1>
          <p>
            Explore relationships across calculators, protocols, simulations, laboratory values,
            devices, and AI workflows. Use search and the graph explorer to inspect connected care paths.
          </p>
        </div>
        <div className="knowledge-graph-hero__actions">
          <Link to="/tools/calculators">Calculators</Link>
          <Link to="/protocols">Protocols</Link>
          <Link to="/simulation">Simulations</Link>
          <Link to="/laboratory">Laboratory</Link>
          <Link to="/medical-iot">Devices</Link>
        </div>
      </section>

      <section className="knowledge-graph-panel" aria-label="Knowledge graph search">
        <div className="knowledge-graph-search">
          <input
            type="search"
            aria-label="Search knowledge graph"
            placeholder="Search sepsis, lactate, stroke, device, AI workflow..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" className="knowledge-graph-ai-button" onClick={explainWithAi} disabled={loading}>
            {loading ? 'Explaining...' : 'Explain selected with AI'}
          </button>
        </div>
        <div className="knowledge-graph-filters" aria-label="Knowledge graph type filters">
          <button type="button" className={type === 'all' ? 'is-active' : ''} onClick={() => setType('all')}>
            All
          </button>
          {KNOWLEDGE_GRAPH_NODE_TYPES.map((nodeType) => (
            <button
              key={nodeType}
              type="button"
              className={type === nodeType ? 'is-active' : ''}
              onClick={() => setType(nodeType)}
            >
              {nodeType}
            </button>
          ))}
        </div>
      </section>

      <section className="knowledge-graph-layout">
        <div className="knowledge-graph-panel" aria-labelledby="knowledge-graph-visualization">
          <div>
            <p className="knowledge-graph-eyebrow">Visualize relationships</p>
            <h2 id="knowledge-graph-visualization">Graph explorer</h2>
          </div>
          <div className="knowledge-graph-canvas" aria-label="Clinical knowledge graph nodes">
            {snapshot.nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                className={`knowledge-graph-node knowledge-graph-node--${node.type} ${
                  selectedNode?.id === node.id ? 'is-selected' : ''
                }`}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <span>{node.type}</span>
                <strong>{node.label}</strong>
                <small>{node.tags.join(' · ')}</small>
              </button>
            ))}
          </div>
          <div className="knowledge-graph-edge-list" aria-label="Visible graph relationships">
            {snapshot.edges.length ? (
              snapshot.edges.map((edge) => (
                <div key={`${edge.source}-${edge.target}-${edge.relation}`} className="knowledge-graph-edge">
                  <strong>{edge.relation}</strong>
                  <span>
                    {edge.source} → {edge.target}
                  </span>
                  <small>{edge.rationale}</small>
                </div>
              ))
            ) : (
              <div className="knowledge-graph-edge">No visible relationships match the current filters.</div>
            )}
          </div>
        </div>

        <aside className="knowledge-graph-panel" aria-labelledby="knowledge-graph-selected-node">
          <div>
            <p className="knowledge-graph-eyebrow">Selected node</p>
            <h2 id="knowledge-graph-selected-node">{selectedNode?.label || 'No node selected'}</h2>
          </div>
          {selectedNode && (
            <>
              <article className="knowledge-graph-card">
                <strong>{selectedNode.type}</strong>
                <p>{selectedNode.summary}</p>
                <div className="knowledge-graph-links">
                  <Link to={selectedNode.path}>Open source</Link>
                </div>
              </article>
              <article className="knowledge-graph-card">
                <strong>Connected relationships</strong>
                <ul>
                  {snapshot.neighbors.map(({ edge, node }) => (
                    <li key={`${edge.source}-${edge.target}`}>
                      <strong>{edge.relation}</strong> {node.label}: {edge.rationale}
                    </li>
                  ))}
                </ul>
              </article>
              <article className="knowledge-graph-card">
                <strong>Graph coverage</strong>
                <ul>
                  {KNOWLEDGE_GRAPH_NODE_TYPES.map((nodeType) => (
                    <li key={nodeType}>
                      {nodeType}: {snapshot.counts[nodeType]}
                    </li>
                  ))}
                </ul>
              </article>
            </>
          )}
          <ApiStateBanner error={error} onRetry={explainWithAi} />
          {loading && <div className="knowledge-graph-card">Loading AI graph explanation...</div>}
          {assistantExplanation && (
            <article className="knowledge-graph-card">
              <strong>AI assistant explanation</strong>
              <p>{assistantExplanation}</p>
            </article>
          )}
        </aside>
      </section>
    </main>
  );
}
