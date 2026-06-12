import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiStateBanner from '../components/ApiStateBanner';
import { sendClinicalChatMessage } from '../services/clinicalChatService';
import {
  ARTIFACT_KNOWLEDGE_GRAPH_NODE_TYPES,
  ARTIFACT_KNOWLEDGE_GRAPH_RELATIONSHIPS,
  buildKnowledgeGraphAiPrompt,
  createArtifactKnowledgeGraphService,
} from '../data/artifactKnowledgeGraph';
import './ClinicalKnowledgeGraph.css';

function getAssistantText(response) {
  return response?.data?.response || response?.data?.message || response?.message?.content || response?.message || '';
}

export default function ClinicalKnowledgeGraph() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [relationship, setRelationship] = useState('all');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [assistantExplanation, setAssistantExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const graphService = useMemo(() => createArtifactKnowledgeGraphService(), []);

  const snapshot = useMemo(
    () => graphService.buildSnapshot({ query, type, relationship, selectedNodeId }),
    [graphService, query, relationship, selectedNodeId, type]
  );
  const selectedNode = snapshot.selectedNode;
  const visibleRelationships = snapshot.relationshipRows.slice(0, 12);
  const visibleOrphans = snapshot.orphanNodes.slice(0, 6);
  const visibleDuplicateGroups = snapshot.duplicateGroups.slice(0, 4);

  const explainWithAi = async () => {
    if (!selectedNode) return;
    setLoading(true);
    setError('');
    setAssistantExplanation('');
    try {
      const response = await sendClinicalChatMessage({
        tool: 'artifact-knowledge-graph',
        message: buildKnowledgeGraphAiPrompt(selectedNode, snapshot.neighbors),
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
    <section className="knowledge-graph-page">
      <section className="knowledge-graph-hero" aria-labelledby="knowledge-graph-title">
        <div>
          <p className="knowledge-graph-eyebrow">Artifact intelligence graph</p>
          <h1 id="knowledge-graph-title">Artifact Knowledge Graph</h1>
          <p>
            Explore how assets, packs, products, workspaces, organizations, roles, routes,
            simulations, workflows, AI agents, and integrations connect across CareDroid.
          </p>
        </div>
        <div className="knowledge-graph-hero__actions">
          <Link to="/artifacts">Artifacts</Link>
          <Link to="/asset-packs">Packs</Link>
          <Link to="/products">Products</Link>
          <Link to="/ai-models">AI Models</Link>
          <Link to="/integrations-marketplace">Integrations</Link>
        </div>
      </section>

      <section className="knowledge-graph-stats" aria-label="Artifact graph summary">
        <article className="knowledge-graph-card">
          <strong>{snapshot.summary.nodes}</strong>
          <span>Nodes</span>
        </article>
        <article className="knowledge-graph-card">
          <strong>{snapshot.summary.edges}</strong>
          <span>Relationships</span>
        </article>
        <article className="knowledge-graph-card">
          <strong>{snapshot.coverage.connectedAssetIds.length}/{snapshot.coverage.totalAssets}</strong>
          <span>Connected assets</span>
        </article>
        <article className="knowledge-graph-card">
          <strong>{snapshot.coverage.allAssetsConnected ? 'Pass' : 'Review'}</strong>
          <span>Acceptance</span>
        </article>
      </section>

      <section className="knowledge-graph-panel" aria-label="Knowledge graph search">
        <div className="knowledge-graph-search">
          <input
            type="search"
            aria-label="Search knowledge graph"
            placeholder="Search assets, packs, roles, workflows, agents, integrations..."
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
          {ARTIFACT_KNOWLEDGE_GRAPH_NODE_TYPES.map((nodeType) => (
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
        <div className="knowledge-graph-filters" aria-label="Knowledge graph relationship filters">
          <button type="button" className={relationship === 'all' ? 'is-active' : ''} onClick={() => setRelationship('all')}>
            All relationships
          </button>
          {ARTIFACT_KNOWLEDGE_GRAPH_RELATIONSHIPS.map((relationshipType) => (
            <button
              key={relationshipType}
              type="button"
              className={relationship === relationshipType ? 'is-active' : ''}
              onClick={() => setRelationship(relationshipType)}
            >
              {relationshipType}
            </button>
          ))}
        </div>
      </section>

      <section className="knowledge-graph-layout">
        <div className="knowledge-graph-panel" aria-labelledby="knowledge-graph-visualization">
          <div>
            <p className="knowledge-graph-eyebrow">
              Showing {snapshot.visibleNodeCount} of {snapshot.matchingNodeCount} matching nodes
            </p>
            <h2 id="knowledge-graph-visualization">Graph explorer</h2>
          </div>
          <div className="knowledge-graph-canvas" aria-label="Artifact knowledge graph nodes">
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
                <small>{node.tags.slice(0, 4).join(' | ')}</small>
              </button>
            ))}
          </div>
          <div className="knowledge-graph-edge-list" aria-label="Visible graph relationships">
            {snapshot.edges.length ? (
              snapshot.edges.map((edge) => (
                <div key={edge.id} className="knowledge-graph-edge">
                  <strong>{edge.type}</strong>
                  <span>
                    {edge.source} -&gt; {edge.target}
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
                {selectedNode.path && (
                  <div className="knowledge-graph-links">
                    <Link to={selectedNode.path}>Open source</Link>
                  </div>
                )}
              </article>
              <article className="knowledge-graph-card">
                <strong>Connected relationships</strong>
                <ul>
                  {snapshot.neighbors.map(({ edge, node }) => (
                    <li key={edge.id}>
                      <strong>{edge.type}</strong> {node.label}: {edge.rationale}
                    </li>
                  ))}
                </ul>
              </article>
              <article className="knowledge-graph-card">
                <strong>Recommendations</strong>
                <ul>
                  {snapshot.recommendations.map(({ node, relationship: recommendationType, reason }) => (
                    <li key={node.id}>
                      <strong>{recommendationType}</strong> {node.label}: {reason}
                    </li>
                  ))}
                </ul>
              </article>
              <article className="knowledge-graph-card">
                <strong>Graph coverage</strong>
                <ul>
                  {ARTIFACT_KNOWLEDGE_GRAPH_NODE_TYPES.map((nodeType) => (
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

      <section className="knowledge-graph-layout">
        <section className="knowledge-graph-panel" aria-labelledby="knowledge-graph-relationships">
          <div>
            <p className="knowledge-graph-eyebrow">Relationship explorer</p>
            <h2 id="knowledge-graph-relationships">Normalized relationships</h2>
          </div>
          <div className="knowledge-graph-edge-list">
            {visibleRelationships.map((edge) => (
              <article key={edge.id} className="knowledge-graph-edge">
                <strong>{edge.type}</strong>
                <span>
                  {edge.sourceLabel} ({edge.sourceType}) -&gt; {edge.targetLabel} ({edge.targetType})
                </span>
                <small>{edge.rationale}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="knowledge-graph-panel" aria-labelledby="knowledge-graph-quality">
          <div>
            <p className="knowledge-graph-eyebrow">Graph quality</p>
            <h2 id="knowledge-graph-quality">Orphans and duplicates</h2>
          </div>
          <article className="knowledge-graph-card">
            <strong>Orphan detection</strong>
            <p>
              {snapshot.coverage.allAssetsConnected
                ? 'Every mounted asset is connected to the graph.'
                : `${snapshot.coverage.orphanAssetIds.length} mounted assets need graph relationships.`}
            </p>
            <ul>
              {visibleOrphans.map((node) => (
                <li key={node.id}>
                  {node.label} ({node.type})
                </li>
              ))}
            </ul>
          </article>
          <article className="knowledge-graph-card">
            <strong>Duplicate detection</strong>
            <p>{snapshot.duplicateGroups.length} duplicate label groups detected across node types.</p>
            <ul>
              {visibleDuplicateGroups.map((group) => (
                <li key={`${group[0].type}-${group[0].label}`}>
                  {group[0].label}: {group.map((node) => node.sourceId).join(', ')}
                </li>
              ))}
            </ul>
          </article>
        </section>
      </section>
    </section>
  );
}
