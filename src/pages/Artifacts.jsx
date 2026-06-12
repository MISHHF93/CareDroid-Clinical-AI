import { useEffect, useMemo, useState } from 'react';
import {
  ARTIFACT_TYPE_OPTIONS,
  LOCAL_ARTIFACTS,
  fetchArtifactGraph,
  fetchArtifactVersions,
  fetchArtifacts,
} from '../services/artifactsApi';
import { ARTIFACT_SCHEMA_FIELDS, rowsToCsv } from '../data/artifactIntelligence';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './Artifacts.css';

const TYPE_LABELS = Object.fromEntries(
  ARTIFACT_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

function typeLabel(type) {
  return TYPE_LABELS[type] || type;
}

function artifactId(artifact) {
  return artifact?.artifactId || artifact?.id || '';
}

function artifactName(artifact) {
  return artifact?.name || artifact?.title || artifactId(artifact);
}

function artifactTags(artifact) {
  if (Array.isArray(artifact?.tags)) return artifact.tags;
  if (typeof artifact?.tags === 'string' && artifact.tags !== 'unknown') return artifact.tags.split('|');
  return [];
}

function artifactField(artifact, field) {
  return artifact?.[field] || 'unknown';
}

function relationshipTargetId(relationship) {
  return relationship.artifactId || relationship.targetArtifactId || relationship.target || '';
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
  const ids = new Set(artifacts.map(artifactId));
  const edges = artifacts.flatMap((artifact) =>
    (artifact.relationships || [])
      .filter((relationship) => ids.has(relationshipTargetId(relationship)))
      .map((relationship) => ({
        source: artifactId(artifact),
        target: relationshipTargetId(relationship),
        type: relationship.type || 'related',
        label: relationship.label || relationship.type || 'related',
      }))
  );

  return {
    nodes: artifacts.map((artifact) => ({
      id: artifactId(artifact),
      title: artifactName(artifact),
      type: artifact.type,
      version: artifact.version,
    })),
    edges,
  };
}

function filterArtifacts(artifacts, filters) {
  const {
    query,
    type,
    tag,
    sourceFile,
    packProduct,
    frontendStatus,
    backendStatus,
    riskLevel,
    demoStatus,
  } = filters;
  const normalizedQuery = query.trim().toLowerCase();
  return artifacts.filter((artifact) => {
    if (type !== 'all' && artifact.type !== type) return false;
    if (tag !== 'all' && !artifactTags(artifact).includes(tag)) return false;
    if (sourceFile !== 'all' && artifactField(artifact, 'sourceFile') !== sourceFile) return false;
    if (
      packProduct !== 'all' &&
      !`${artifactField(artifact, 'assetPack')}|${artifactField(artifact, 'product')}`
        .split('|')
        .includes(packProduct)
    ) {
      return false;
    }
    if (frontendStatus !== 'all' && artifactField(artifact, 'frontendStatus') !== frontendStatus) return false;
    if (backendStatus !== 'all' && artifactField(artifact, 'backendStatus') !== backendStatus) return false;
    if (riskLevel !== 'all' && artifactField(artifact, 'riskLevel') !== riskLevel) return false;
    if (demoStatus !== 'all' && artifactField(artifact, 'demoStatus') !== demoStatus) return false;
    if (!normalizedQuery) return true;

    const searchable = [
      artifact.type,
      artifactName(artifact),
      artifact.description,
      artifact.version,
      artifact.sourceFile,
      artifact.frontendStatus,
      artifact.backendStatus,
      artifact.demoStatus,
      artifact.assetPack,
      artifact.product,
      artifact.workspace,
      ...artifactTags(artifact),
      ...(artifact.relationships || []).map(relationshipTargetId),
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
      id: `${artifactId(artifact)}:${artifact.version || '1.0.0'}`,
      version: artifact.version,
      title: artifactName(artifact),
      description: artifact.description,
      changeSummary: 'Current catalog version',
      createdAt: artifact.createdAt,
    },
  ];
}

function canonicalizeArtifact(artifact) {
  return Object.fromEntries(
    ARTIFACT_SCHEMA_FIELDS.map((field) => [
      field,
      artifact[field] ||
        (field === 'artifactId'
          ? artifactId(artifact)
          : field === 'name'
            ? artifactName(artifact)
            : field === 'tags'
              ? artifactTags(artifact).join('|') || 'unknown'
              : 'unknown'),
    ])
  );
}

function downloadTextFile(filename, contents, type) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
  const [sourceFilter, setSourceFilter] = useState('all');
  const [packProductFilter, setPackProductFilter] = useState('all');
  const [frontendFilter, setFrontendFilter] = useState('all');
  const [backendFilter, setBackendFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [demoFilter, setDemoFilter] = useState('all');
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
        loadedArtifacts.some((artifact) => artifactId(artifact) === current)
          ? current
          : artifactId(loadedArtifacts[0]) || ''
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
    () =>
      filterArtifacts(artifacts, {
        query,
        type: typeFilter,
        tag: tagFilter,
        sourceFile: sourceFilter,
        packProduct: packProductFilter,
        frontendStatus: frontendFilter,
        backendStatus: backendFilter,
        riskLevel: riskFilter,
        demoStatus: demoFilter,
      }),
    [
      artifacts,
      query,
      typeFilter,
      tagFilter,
      sourceFilter,
      packProductFilter,
      frontendFilter,
      backendFilter,
      riskFilter,
      demoFilter,
    ]
  );

  const selectedArtifact = useMemo(
    () =>
      artifacts.find((artifact) => artifactId(artifact) === selectedId) ||
      filteredArtifacts[0] ||
      artifacts[0] ||
      null,
    [artifacts, filteredArtifacts, selectedId]
  );

  const availableTags = useMemo(
    () => [...new Set(artifacts.flatMap(artifactTags))].sort(),
    [artifacts]
  );

  const filterOptions = useMemo(
    () => ({
      sourceFiles: [...new Set(artifacts.map((artifact) => artifactField(artifact, 'sourceFile')))].sort(),
      packProducts: [
        ...new Set(
          artifacts.flatMap((artifact) =>
            `${artifactField(artifact, 'assetPack')}|${artifactField(artifact, 'product')}`
              .split('|')
              .filter((value) => value && value !== 'unknown')
          )
        ),
      ].sort(),
      frontendStatuses: [...new Set(artifacts.map((artifact) => artifactField(artifact, 'frontendStatus')))].sort(),
      backendStatuses: [...new Set(artifacts.map((artifact) => artifactField(artifact, 'backendStatus')))].sort(),
      riskLevels: [...new Set(artifacts.map((artifact) => artifactField(artifact, 'riskLevel')))].sort(),
      demoStatuses: [...new Set(artifacts.map((artifact) => artifactField(artifact, 'demoStatus')))].sort(),
    }),
    [artifacts]
  );

  useEffect(() => {
    if (!selectedArtifact) {
      setVersions([]);
      return undefined;
    }

    let cancelled = false;
    setVersions(currentVersionFallback(selectedArtifact));

    fetchArtifactVersions(artifactId(selectedArtifact)).then((result) => {
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

  const exportRows = useMemo(() => filteredArtifacts.map(canonicalizeArtifact), [filteredArtifacts]);

  const handleDownloadCsv = () => {
    downloadTextFile(
      'caredroid_artifacts.csv',
      rowsToCsv(exportRows, ARTIFACT_SCHEMA_FIELDS),
      'text/csv;charset=utf-8'
    );
  };

  const handleDownloadJson = () => {
    downloadTextFile(
      'caredroid_artifacts.json',
      JSON.stringify(exportRows, null, 2),
      'application/json;charset=utf-8'
    );
  };

  return (
    <section className="artifacts-page" aria-labelledby="artifacts-title">
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
        <div className="artifacts-downloads" aria-label="Artifact downloads">
          <button type="button" onClick={handleDownloadCsv}>
            Download CSV
          </button>
          <button type="button" onClick={handleDownloadJson}>
            Download JSON
          </button>
        </div>
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
        <div className="artifacts-select-grid">
          <label className="artifacts-tag-filter">
            <span>Source file</span>
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
              <option value="all">All source files</option>
              {filterOptions.sourceFiles.map((sourceFile) => (
                <option key={sourceFile} value={sourceFile}>
                  {sourceFile}
                </option>
              ))}
            </select>
          </label>
          <label className="artifacts-tag-filter">
            <span>Pack / product</span>
            <select value={packProductFilter} onChange={(event) => setPackProductFilter(event.target.value)}>
              <option value="all">All packs and products</option>
              {filterOptions.packProducts.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="artifacts-tag-filter">
            <span>Frontend status</span>
            <select value={frontendFilter} onChange={(event) => setFrontendFilter(event.target.value)}>
              <option value="all">All frontend statuses</option>
              {filterOptions.frontendStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="artifacts-tag-filter">
            <span>Backend status</span>
            <select value={backendFilter} onChange={(event) => setBackendFilter(event.target.value)}>
              <option value="all">All backend statuses</option>
              {filterOptions.backendStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="artifacts-tag-filter">
            <span>Risk level</span>
            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
              <option value="all">All risk levels</option>
              {filterOptions.riskLevels.map((riskLevel) => (
                <option key={riskLevel} value={riskLevel}>
                  {riskLevel}
                </option>
              ))}
            </select>
          </label>
          <label className="artifacts-tag-filter">
            <span>Demo/live status</span>
            <select value={demoFilter} onChange={(event) => setDemoFilter(event.target.value)}>
              <option value="all">All demo/live statuses</option>
              {filterOptions.demoStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
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
                  key={artifactId(artifact)}
                  type="button"
                  className={`artifacts-card${
                    artifactId(selectedArtifact) === artifactId(artifact) ? ' artifacts-card--selected' : ''
                  }`}
                  onClick={() => setSelectedId(artifactId(artifact))}
                >
                  <span className="artifacts-card__header">
                    <span className="artifacts-type">{typeLabel(artifact.type)}</span>
                    <span className="artifacts-version">{artifact.version ? `v${artifact.version}` : artifactField(artifact, 'status')}</span>
                  </span>
                  <span className="artifacts-card__title">{artifactName(artifact)}</span>
                  <span className="artifacts-card__description">{artifact.description}</span>
                  <span className="artifacts-tags">
                    {artifactTags(artifact).slice(0, 4).map((tag) => (
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
                <strong>{selectedArtifact.version ? `v${selectedArtifact.version}` : artifactField(selectedArtifact, 'status')}</strong>
              </div>
              <h2>{artifactName(selectedArtifact)}</h2>
              <p>{selectedArtifact.description}</p>
              <dl className="artifacts-metadata">
                <div>
                  <dt>ID</dt>
                  <dd>
                    <code>{artifactId(selectedArtifact)}</code>
                  </dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{artifactField(selectedArtifact, 'sourceFile')}</dd>
                </div>
                <div>
                  <dt>Pack / product</dt>
                  <dd>{artifactField(selectedArtifact, 'assetPack')} / {artifactField(selectedArtifact, 'product')}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    {artifactField(selectedArtifact, 'frontendStatus')} / {artifactField(selectedArtifact, 'backendStatus')} /{' '}
                    {artifactField(selectedArtifact, 'demoStatus')}
                  </dd>
                </div>
                <div>
                  <dt>Risk</dt>
                  <dd>{artifactField(selectedArtifact, 'riskLevel')}</dd>
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
                        (artifact) => artifactId(artifact) === relationshipTargetId(relationship)
                      );
                      return (
                        <li key={`${artifactId(selectedArtifact)}-${relationshipTargetId(relationship)}`}>
                          <button type="button" onClick={() => setSelectedId(relationshipTargetId(relationship))}>
                            {target ? artifactName(target) : relationshipTargetId(relationship)}
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

      <section className="artifacts-panel" aria-labelledby="artifact-table-title">
        <div className="artifacts-section-heading">
          <h2 id="artifact-table-title">Artifact Table</h2>
          <span>{filteredArtifacts.length} rows</span>
        </div>
        <div className="artifacts-table-wrap">
          <table className="artifacts-table">
            <thead>
              <tr>
                <th scope="col">Artifact</th>
                <th scope="col">Type</th>
                <th scope="col">Source</th>
                <th scope="col">Pack / product</th>
                <th scope="col">Frontend</th>
                <th scope="col">Backend</th>
                <th scope="col">Risk</th>
                <th scope="col">Demo/live</th>
              </tr>
            </thead>
            <tbody>
              {filteredArtifacts.slice(0, 80).map((artifact) => (
                <tr key={`table-${artifactId(artifact)}`}>
                  <td>
                    <button type="button" onClick={() => setSelectedId(artifactId(artifact))}>
                      {artifactName(artifact)}
                    </button>
                    <small>{artifactId(artifact)}</small>
                  </td>
                  <td>{typeLabel(artifact.type)}</td>
                  <td>{artifactField(artifact, 'sourceFile')}</td>
                  <td>{artifactField(artifact, 'assetPack')} / {artifactField(artifact, 'product')}</td>
                  <td>{artifactField(artifact, 'frontendStatus')}</td>
                  <td>{artifactField(artifact, 'backendStatus')}</td>
                  <td>{artifactField(artifact, 'riskLevel')}</td>
                  <td>{artifactField(artifact, 'demoStatus')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
    </section>
  );
}
