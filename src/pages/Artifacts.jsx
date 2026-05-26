import { useEffect, useMemo, useState } from 'react';
import {
  ARTIFACT_TYPE_OPTIONS,
  LOCAL_ARTIFACTS,
  fetchArtifactGraph,
  fetchArtifactVersions,
  fetchArtifacts,
} from '../services/artifactsApi';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './Artifacts.css';

const TYPE_LABELS = Object.fromEntries(
  ARTIFACT_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

function typeLabel(type) {
  return TYPE_LABELS[type] || type;
}

function formatDate(value) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function buildGraph(artifacts) {
  const ids = new Set(artifacts.map((artifact) => artifact.id));
  const edges = artifacts.flatMap((artifact) =>
    (artifact.relationships || [])
      .filter((relationship) => ids.has(relationship.artifactId))
      .map((relationship) => ({
        source: artifact.id,
        target: relationship.artifactId,
        type: relationship.type || 'related',
        label: relationship.label || relationship.type || 'related',
      }))
  );

  return {
    nodes: artifacts.map((artifact) => ({
      id: artifact.id,
      title: artifact.title,
      type: artifact.type,
      version: artifact.version,
    })),
    edges,
  };
}

function filterArtifacts(artifacts, query, type, tag) {
  const normalizedQuery = query.trim().toLowerCase();
  return artifacts.filter((artifact) => {
    if (type !== 'all' && artifact.type !== type) return false;
    if (tag !== 'all' && !(artifact.tags || []).includes(tag)) return false;
    if (!normalizedQuery) return true;

    const searchable = [
      artifact.type,
      artifact.title,
      artifact.description,
      artifact.version,
      ...(artifact.tags || []),
      ...(artifact.relationships || []).map((relationship) => relationship.artifactId),
    ]
      .join(' ')
      .toLowerCase();
    return searchable.includes(normalizedQuery);
  });
}

function currentVersionFallback(artifact) {
  if (!artifact) return [];
  return [
    {
      id: `${artifact.id}:${artifact.version}`,
      version: artifact.version,
      title: artifact.title,
      description: artifact.description,
      changeSummary: 'Current catalog version',
      createdAt: artifact.createdAt,
    },
  ];
}

function RelationshipGraph({ artifacts, selectedId, onSelect }) {
  const graph = useMemo(() => buildGraph(artifacts.slice(0, 12)), [artifacts]);
  const positions = graph.nodes.map((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(graph.nodes.length, 1) - Math.PI / 2;
    const radius = graph.nodes.length <= 2 ? 90 : 130;
    return {
      ...node,
      x: 180 + Math.cos(angle) * radius,
      y: 165 + Math.sin(angle) * radius,
    };
  });
  const byId = new Map(positions.map((node) => [node.id, node]));

  if (positions.length === 0) {
    return <p className="artifacts-empty">No artifact relationships match the current view.</p>;
  }

  return (
    <div className="artifacts-graph" aria-label="Artifact relationship graph">
      <svg viewBox="0 0 360 330" role="img" aria-label="Artifact relationship graph">
        {graph.edges.map((edge) => {
          const source = byId.get(edge.source);
          const target = byId.get(edge.target);
          if (!source || !target) return null;
          return (
            <g key={`${edge.source}-${edge.target}-${edge.type}`}>
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                className="artifacts-graph__edge"
              />
              <text
                x={(source.x + target.x) / 2}
                y={(source.y + target.y) / 2}
                className="artifacts-graph__edge-label"
              >
                {edge.type}
              </text>
            </g>
          );
        })}
        {positions.map((node) => (
          <g
            key={node.id}
            role="button"
            tabIndex="0"
            aria-label={`Select ${node.title}`}
            className={`artifacts-graph__node${
              node.id === selectedId ? ' artifacts-graph__node--selected' : ''
            }`}
            onClick={() => onSelect(node.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onSelect(node.id);
            }}
          >
            <circle cx={node.x} cy={node.y} r={28} />
            <text x={node.x} y={node.y + 4}>
              {node.title
                .split(' ')
                .map((word) => word[0])
                .join('')
                .slice(0, 3)}
            </text>
          </g>
        ))}
      </svg>
      <div className="artifacts-graph__legend" aria-label="Graph artifacts">
        {positions.map((node) => (
          <button
            key={node.id}
            type="button"
            className={node.id === selectedId ? 'is-selected' : ''}
            onClick={() => onSelect(node.id)}
          >
            <span>{node.title}</span>
            <small>{typeLabel(node.type)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Artifacts() {
  const [artifacts, setArtifacts] = useState([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [versions, setVersions] = useState([]);
  const [graphMeta, setGraphMeta] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadArtifacts() {
      setLoading(true);
      const [catalogResult, graphResult] = await Promise.all([
        fetchArtifacts(),
        fetchArtifactGraph(),
      ]);

      if (cancelled) return;

      const loadedArtifacts = catalogResult.ok && catalogResult.artifacts.length > 0
        ? catalogResult.artifacts
        : LOCAL_ARTIFACTS;

      setArtifacts(loadedArtifacts);
      setGraphMeta(
        graphResult.ok && graphResult.nodes.length > 0 ? graphResult : buildGraph(loadedArtifacts)
      );
      setSelectedId((current) =>
        loadedArtifacts.some((artifact) => artifact.id === current)
          ? current
          : loadedArtifacts[0]?.id || ''
      );
      setNotice(catalogResult.ok ? '' : `Using local artifact catalog. ${catalogResult.message}`);
      setLoading(false);
    }

    loadArtifacts();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredArtifacts = useMemo(
    () => filterArtifacts(artifacts, query, typeFilter, tagFilter),
    [artifacts, query, typeFilter, tagFilter]
  );

  const selectedArtifact = useMemo(
    () =>
      artifacts.find((artifact) => artifact.id === selectedId) ||
      filteredArtifacts[0] ||
      artifacts[0] ||
      null,
    [artifacts, filteredArtifacts, selectedId]
  );

  const availableTags = useMemo(
    () => [...new Set(artifacts.flatMap((artifact) => artifact.tags || []))].sort(),
    [artifacts]
  );

  useEffect(() => {
    if (!selectedArtifact) {
      setVersions([]);
      return undefined;
    }

    let cancelled = false;
    setVersions(currentVersionFallback(selectedArtifact));

    fetchArtifactVersions(selectedArtifact.id).then((result) => {
      if (cancelled) return;
      setVersions(result.ok && result.versions.length > 0 ? result.versions : currentVersionFallback(selectedArtifact));
    });

    return () => {
      cancelled = true;
    };
  }, [selectedArtifact]);

  const stats = useMemo(
    () => ({
      total: artifacts.length,
      filtered: filteredArtifacts.length,
      relationships: graphMeta.edges.length,
      versions: versions.length,
    }),
    [artifacts.length, filteredArtifacts.length, graphMeta.edges.length, versions.length]
  );

  return (
    <main className="artifacts-page" aria-labelledby="artifacts-title">
      <section className="artifacts-hero">
        <div className="artifacts-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.clipboardList} size={28} />
        </div>
        <div>
          <p className="artifacts-eyebrow">Artifact Knowledge System</p>
          <h1 id="artifacts-title">CareDroid Artifacts</h1>
          <p>
            Search calculators, workflows, prompts, dashboards, templates, protocols,
            telemetry schemas, maps, and AI outputs from one governed knowledge surface.
          </p>
        </div>
      </section>

      {notice ? (
        <div className="artifacts-notice" role="status">
          {notice}
        </div>
      ) : null}

      <section className="artifacts-stats" aria-label="Artifact summary">
        <div>
          <strong>{stats.total}</strong>
          <span>Total artifacts</span>
        </div>
        <div>
          <strong>{stats.filtered}</strong>
          <span>Matching current view</span>
        </div>
        <div>
          <strong>{stats.relationships}</strong>
          <span>Relationship edges</span>
        </div>
        <div>
          <strong>{stats.versions}</strong>
          <span>Selected versions</span>
        </div>
      </section>

      <section className="artifacts-controls" aria-label="Artifact search and filters">
        <label className="artifacts-search">
          <span>Search artifacts</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, tag, type, relationship..."
          />
        </label>
        <div className="artifacts-filter-row" aria-label="Filter by artifact type">
          <button
            type="button"
            className={typeFilter === 'all' ? 'is-active' : ''}
            onClick={() => setTypeFilter('all')}
          >
            All
          </button>
          {ARTIFACT_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={typeFilter === option.value ? 'is-active' : ''}
              onClick={() => setTypeFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="artifacts-tag-filter">
          <span>Tag</span>
          <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
            <option value="all">All tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="artifacts-layout">
        <section className="artifacts-list" aria-label="Artifact results">
          <div className="artifacts-section-heading">
            <h2>Artifacts</h2>
            <span>{loading ? 'Loading...' : `${filteredArtifacts.length} results`}</span>
          </div>
          {filteredArtifacts.length === 0 ? (
            <div className="artifacts-empty" role="status">
              No artifacts match the current search and filters.
            </div>
          ) : (
            <div className="artifacts-card-list">
              {filteredArtifacts.map((artifact) => (
                <button
                  key={artifact.id}
                  type="button"
                  className={`artifacts-card${
                    selectedArtifact?.id === artifact.id ? ' artifacts-card--selected' : ''
                  }`}
                  onClick={() => setSelectedId(artifact.id)}
                >
                  <span className="artifacts-card__header">
                    <span className="artifacts-type">{typeLabel(artifact.type)}</span>
                    <span className="artifacts-version">v{artifact.version}</span>
                  </span>
                  <span className="artifacts-card__title">{artifact.title}</span>
                  <span className="artifacts-card__description">{artifact.description}</span>
                  <span className="artifacts-tags">
                    {(artifact.tags || []).slice(0, 4).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="artifacts-detail" aria-label="Selected artifact detail">
          {selectedArtifact ? (
            <>
              <div className="artifacts-detail__header">
                <span className="artifacts-type">{typeLabel(selectedArtifact.type)}</span>
                <strong>v{selectedArtifact.version}</strong>
              </div>
              <h2>{selectedArtifact.title}</h2>
              <p>{selectedArtifact.description}</p>
              <dl className="artifacts-metadata">
                <div>
                  <dt>ID</dt>
                  <dd>
                    <code>{selectedArtifact.id}</code>
                  </dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatDate(selectedArtifact.createdAt)}</dd>
                </div>
              </dl>
              <div className="artifacts-relationships">
                <h3>Relationships</h3>
                {(selectedArtifact.relationships || []).length === 0 ? (
                  <p>No direct relationships recorded.</p>
                ) : (
                  <ul>
                    {selectedArtifact.relationships.map((relationship) => {
                      const target = artifacts.find(
                        (artifact) => artifact.id === relationship.artifactId
                      );
                      return (
                        <li key={`${selectedArtifact.id}-${relationship.artifactId}`}>
                          <button type="button" onClick={() => setSelectedId(relationship.artifactId)}>
                            {target?.title || relationship.artifactId}
                          </button>
                          <span>{relationship.label || relationship.type || 'related'}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <p className="artifacts-empty">Select an artifact to review details.</p>
          )}
        </aside>
      </div>

      <section className="artifacts-insight-grid">
        <div className="artifacts-panel">
          <div className="artifacts-section-heading">
            <h2>Relationship Graph</h2>
            <span>{graphMeta.edges.length} edges</span>
          </div>
          <RelationshipGraph
            artifacts={filteredArtifacts.length > 0 ? filteredArtifacts : artifacts}
            selectedId={selectedArtifact?.id}
            onSelect={setSelectedId}
          />
        </div>

        <div className="artifacts-panel">
          <div className="artifacts-section-heading">
            <h2>Version History</h2>
            <span>{selectedArtifact ? selectedArtifact.title : 'None selected'}</span>
          </div>
          {versions.length === 0 ? (
            <p className="artifacts-empty">No versions available.</p>
          ) : (
            <ol className="artifacts-versions">
              {versions.map((version) => (
                <li key={version.id || `${version.version}-${version.createdAt}`}>
                  <div>
                    <strong>v{version.version}</strong>
                    <span>{formatDate(version.createdAt)}</span>
                  </div>
                  <p>{version.changeSummary || version.description || 'Version snapshot'}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </main>
  );
}
