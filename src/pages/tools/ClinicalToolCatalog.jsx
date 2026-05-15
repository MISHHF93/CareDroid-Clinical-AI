import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversation } from '../../contexts/ConversationContext';
import toolRegistry from '../../data/toolRegistry';
import {
  builtinUiCalculators,
  clinicalIntentTools,
  getCatalogSummary,
  ORCHESTRATOR_TO_REGISTRY_ID,
} from '../../data/clinicalIntentToolCatalog';
import {
  chatAndAiCapabilities,
  clinicalDataApis,
  emergencyCapabilities,
  getFullCapabilitiesSummary,
} from '../../data/platformCapabilitiesCatalog';
import { emergencyPatternGroups } from '../../data/emergencyPatternCatalog';
import {
  clientClinicalCapabilities,
  collaborationCapabilities,
  getAllDiscoveredTools,
  getSourceCodeDiscoverySummary,
  orchestratorApiCapabilities,
  phantomToolReferences,
  routingCapabilities,
  SOURCE_SCAN_LOCATIONS,
  toolIdAliases,
} from '../../data/sourceCodeToolDiscovery';
import { resolveCatalogLaunch } from '../../data/clinicalCatalogWiring';
import {
  getMedicalCatalogSummary,
  getMedicalToolsCatalogRows,
} from '../../data/medicalToolsCatalogIndex';
import { fetchBackendClinicalTools } from '../../services/clinicalToolsApi';
import { sortCatalogRows } from '../../utils/catalogSort';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';
import './ClinicalToolCatalog.css';

const CATEGORY_CLASS = {
  calculator: 'catalog-badge--calculator',
  checker: 'catalog-badge--checker',
  interpreter: 'catalog-badge--interpreter',
  protocol: 'catalog-badge--protocol',
  reference: 'catalog-badge--reference',
  ai: 'catalog-badge--ai',
  data: 'catalog-badge--data',
  emergency: 'catalog-badge--emergency',
  platform: 'catalog-badge--platform',
  enterprise: 'catalog-badge--enterprise',
  clinical: 'catalog-badge--checker',
  integration: 'catalog-badge--data',
  support: 'catalog-badge--platform',
  phantom: 'catalog-badge--phantom',
  monitoring: 'catalog-badge--ai',
  oncology: 'catalog-badge--reference',
  medication: 'catalog-badge--checker',
};

const STATUS_LABEL = {
  'shipped-page': 'Shipped page',
  'shipped-calculator': 'Calculator UI',
  'backend-executor': 'Backend executor',
  'nlu-chat': 'NLU / chat',
  'chat-api': 'Chat / API',
  phantom: 'In code only',
  'marketing-copy': 'Marketing copy',
  alias: 'Alias',
  platform: 'Platform feature',
  client: 'Client helper',
  orchestrator: 'Orchestrator API',
  routing: 'NLU routing',
  'emergency-pattern': 'Emergency NLU',
  collaboration: 'Collaboration',
  configuration: 'Configuration',
};

function statusBadgeClass(status) {
  if (status === 'phantom' || status === 'marketing-copy') return 'catalog-badge--phantom';
  if (status === 'backend-executor') return 'catalog-badge--backend';
  if (status === 'chat-api' || status === 'routing') return 'catalog-badge--ai';
  if (status === 'alias') return 'catalog-badge--platform';
  if (status === 'platform') return 'catalog-badge--enterprise';
  if (status === 'emergency-pattern') return 'catalog-badge--emergency';
  if (status === 'orchestrator') return 'catalog-badge--data';
  return 'catalog-badge--client';
}

function StatusBadge({ status }) {
  const label = STATUS_LABEL[status] || status;
  return <span className={`catalog-badge ${statusBadgeClass(status)}`}>{label}</span>;
}

function SortableTh({ label, sortKey, activeKey, sortDir, onSort }) {
  const active = activeKey === sortKey;
  const indicator = active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
  return (
    <th>
      <button
        type="button"
        className={`catalog-sort-btn${active ? ' catalog-sort-btn--active' : ''}`}
        onClick={() => onSort(sortKey)}
      >
        {label}
        <span className="catalog-sort-indicator" aria-hidden>
          {indicator}
        </span>
      </button>
    </th>
  );
}

function useTableSort(defaultKey = 'name') {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState('asc');
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };
  const applySort = (rows, getValue) => sortCatalogRows(rows, sortKey, sortDir, getValue);
  return { sortKey, sortDir, toggleSort, applySort };
}

function MedicalToolsTable({ rows, onOpenPath, onLaunch, sortKey, sortDir, onSort }) {
  if (rows.length === 0) {
    return <p className="catalog-empty catalog-empty--block">No medical tools match your search.</p>;
  }
  return (
    <div className="catalog-table-wrap">
      <table className="catalog-table catalog-table--medical">
        <thead>
          <tr>
            <SortableTh label="ID" sortKey="id" activeKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortableTh
              label="Name"
              sortKey="name"
              activeKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              label="Category"
              sortKey="category"
              activeKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              label="Access"
              sortKey="access"
              activeKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              label="Chat"
              sortKey="chat"
              activeKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th>Page / form</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.primaryId || row.id}>
              <td>
                <code>{row.primaryId || row.id}</code>
              </td>
              <td>
                {row.name}
                {row.chatOnlyForm && (
                  <span className="catalog-inline-badge" title="Chat + calculators hub; no dedicated form">
                    Chat on request
                  </span>
                )}
              </td>
              <td>
                <CategoryBadge category={row.category} />
              </td>
              <td>{row.accessSummary}</td>
              <td>{row.chatOnRequest ? 'Yes' : '—'}</td>
              <td className="catalog-source-cell">
                {row.pagePath && <code>{row.pagePath}</code>}
                {row.uiCalculatorSlug && (
                  <span>
                    {row.pagePath ? ' · ' : ''}
                    form: <code>{row.uiCalculatorSlug}</code>
                  </span>
                )}
                {!row.pagePath && !row.uiCalculatorSlug && '—'}
              </td>
              <td>
                <div className="catalog-actions">
                  {row.pagePath && (
                    <button
                      type="button"
                      className="catalog-btn catalog-btn--primary"
                      onClick={() => onOpenPath(row.pagePath)}
                    >
                      Open
                    </button>
                  )}
                  <button
                    type="button"
                    className="catalog-btn catalog-btn--secondary"
                    onClick={() => onLaunch(row)}
                  >
                    Launch
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiscoveredRowsTable({ rows, onOpenPath, onLaunch, sortKey, sortDir, onSort }) {
  if (rows.length === 0) {
    return <p className="catalog-empty catalog-empty--block">No entries match your search.</p>;
  }
  return (
    <div className="catalog-table-wrap">
      <table className="catalog-table">
        <thead>
          <tr>
            <SortableTh label="ID" sortKey="id" activeKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortableTh
              label="Name"
              sortKey="name"
              activeKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              label="Status"
              sortKey="status"
              activeKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              label="Category"
              sortKey="category"
              activeKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th>Notes / source</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.id}-${row.status}`}>
              <td>
                <code>{row.id}</code>
              </td>
              <td>{row.name}</td>
              <td>
                <StatusBadge status={row.status} />
              </td>
              <td>{row.category ? <CategoryBadge category={row.category} /> : '—'}</td>
              <td className="catalog-source-cell">
                {row.mapsTo && (
                  <span>
                    → <code>{row.mapsTo}</code>{' '}
                  </span>
                )}
                {row.apiPath && <span className="catalog-api-hint">{row.apiPath} </span>}
                {row.protocolReference && (
                  <span>
                    Protocol: <code>{row.protocolReference}</code>{' '}
                  </span>
                )}
                {row.notes || (row.sources || [row.source]).filter(Boolean).join('; ')}
              </td>
              <td>
                <div className="catalog-actions">
                  {row.path && !String(row.path).includes(':') && (
                    <button
                      type="button"
                      className="catalog-btn catalog-btn--primary"
                      onClick={() => onOpenPath(row.path)}
                    >
                      Open
                    </button>
                  )}
                  {onLaunch && (
                    <button
                      type="button"
                      className="catalog-btn catalog-btn--secondary"
                      onClick={() => onLaunch(row)}
                    >
                      Launch
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoryBadge({ category }) {
  return (
    <span className={`catalog-badge ${CATEGORY_CLASS[category] || ''}`}>
      {category}
    </span>
  );
}

const ClinicalToolCatalog = () => {
  const navigate = useNavigate();
  const { setActiveTool, addMessage } = useConversation();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [backendTools, setBackendTools] = useState([]);
  const [backendLoadError, setBackendLoadError] = useState(null);
  const medicalSort = useTableSort('name');
  const scanSort = useTableSort('name');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchBackendClinicalTools();
      if (cancelled) return;
      if (result.ok) {
        setBackendTools(result.tools);
        setBackendLoadError(null);
      } else {
        setBackendLoadError(result.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const backendIds = useMemo(
    () => new Set(backendTools.map((t) => t.id || t.toolId).filter(Boolean)),
    [backendTools]
  );

  const summary = getCatalogSummary({
    sidebarCount: toolRegistry.length,
    backendToolCount: backendTools.length || undefined,
  });
  const platformSummary = getFullCapabilitiesSummary();
  const discoverySummary = getSourceCodeDiscoverySummary();
  const medicalSummary = getMedicalCatalogSummary();
  const allDiscovered = useMemo(() => getAllDiscoveredTools(), []);
  const allMedicalRows = useMemo(() => getMedicalToolsCatalogRows(), []);

  const query = search.trim().toLowerCase();

  const matchesQuery = (text) => !query || String(text || '').toLowerCase().includes(query);

  const filteredSidebar = toolRegistry.filter(
    (t) =>
      matchesQuery(`${t.name} ${t.description} ${t.category} ${t.id}`) &&
      (categoryFilter === 'all' || t.category.toLowerCase() === categoryFilter)
  );

  const filteredCalculators = builtinUiCalculators.filter(
    (c) =>
      matchesQuery(`${c.name} ${c.description} ${c.id}`) &&
      (categoryFilter === 'all' || categoryFilter === 'calculator')
  );

  const filteredIntent = clinicalIntentTools.filter(
    (t) =>
      matchesQuery(`${t.toolName} ${t.description} ${t.category} ${t.toolId}`) &&
      (categoryFilter === 'all' || t.category === categoryFilter)
  );

  const filteredBackend = backendTools.filter((t) =>
    matchesQuery(`${t.name || ''} ${t.description || ''} ${t.id || ''} ${t.category || ''}`)
  );

  const filterCapabilityRows = (rows) =>
    rows.filter(
      (row) =>
        matchesQuery(`${row.name} ${row.description} ${row.id} ${row.category} ${row.apiPath || ''}`) &&
        (categoryFilter === 'all' || row.category === categoryFilter)
    );

  const filteredChatAi = filterCapabilityRows(chatAndAiCapabilities);
  const filteredDataApis = filterCapabilityRows(clinicalDataApis);
  const filteredEmergency = filterCapabilityRows(emergencyCapabilities);
  const discoverQueryMatch = (row) =>
    matchesQuery(
      `${row.id} ${row.name} ${row.notes} ${row.source} ${row.status} ${row.category || ''} ${row.mapsTo || ''} ${row.apiPath || ''} ${row.protocolReference || ''}`
    );

  const statusFilterFns = {
    phantom: (row) => row.status === 'phantom' || row.status === 'marketing-copy',
    alias: (row) => row.status === 'alias',
    platform: (row) => row.status === 'platform',
    client: (row) => row.status === 'client',
    orchestrator: (row) => row.status === 'orchestrator',
    routing: (row) => row.status === 'routing',
    'emergency-pattern': (row) => row.status === 'emergency-pattern',
    collaboration: (row) => row.status === 'collaboration',
  };

  const filteredDiscovered = allDiscovered.filter((row) => {
    if (!discoverQueryMatch(row)) return false;
    const statusFn = statusFilterFns[categoryFilter];
    if (statusFn) return statusFn(row);
    if (categoryFilter === 'all' || categoryFilter === 'medical') return true;
    return row.category === categoryFilter;
  });

  const sortedDiscovered = useMemo(
    () => scanSort.applySort(filteredDiscovered),
    [filteredDiscovered, scanSort.sortKey, scanSort.sortDir]
  );

  const filteredMedical = allMedicalRows.filter((row) => {
    if (!matchesQuery(`${row.name} ${row.primaryId} ${row.id} ${row.category} ${row.description}`)) {
      return false;
    }
    if (categoryFilter === 'all' || categoryFilter === 'medical') return true;
    return row.category === categoryFilter;
  });

  const sortedMedical = useMemo(
    () => medicalSort.applySort(filteredMedical),
    [filteredMedical, medicalSort.sortKey, medicalSort.sortDir]
  );

  const rowsForStatus = (status) =>
    scanSort.applySort(
      allDiscovered.filter((row) => row.status === status && discoverQueryMatch(row))
    );

  const showMedicalOnly = categoryFilter === 'medical';
  const showFocusedSections = categoryFilter === 'all';

  const handleOpenPath = (path) => {
    if (path) navigate(path);
  };

  const launchCatalogItem = (id) => {
    const launch = resolveCatalogLaunch(id);
    if (launch.registryId) {
      setActiveTool(launch.registryId);
    }
    if (launch.chatSeed) {
      addMessage(launch.chatSeed, 'user');
    }
    if (launch.path) {
      navigate(launch.path);
      return;
    }
    if (launch.chatSeed) {
      navigate('/dashboard');
    }
  };

  const launchFromRow = (row) => {
    const launchId = row?.primaryId || row?.id;
    if (launchId) {
      launchCatalogItem(launchId);
    }
  };

  const handleTryInChat = (sidebarToolId, chatSeed) => {
    if (sidebarToolId) {
      launchCatalogItem(sidebarToolId);
      if (chatSeed) {
        addMessage(chatSeed, 'user');
        navigate('/dashboard');
      }
      return;
    }
    if (chatSeed) {
      addMessage(chatSeed, 'user');
      navigate('/dashboard');
    }
  };

  const handleCapabilityAction = (row) => {
    if (row.chatSeed) {
      handleTryInChat(null, row.chatSeed);
      return;
    }
    if (row.path) {
      handleOpenPath(row.path);
      return;
    }
    launchFromRow(row);
  };

  const isBackendExecutable = (toolId) =>
    backendIds.has(toolId) || clinicalIntentTools.find((t) => t.toolId === toolId)?.backendExecutable;

  return (
    <div className="clinical-tool-catalog">
      <button type="button" className="catalog-back-link" onClick={() => navigate('/tools')}>
        <NavIcon icon={CHROME_ICONS.arrowLeft} size={16} aria-hidden />
        Back to Clinical Tools Suite
      </button>

      <header className="clinical-tool-catalog-header">
        <h1>
          <NavIcon icon={CHROME_ICONS.tools} size={32} aria-hidden />
          Full Clinical Catalog
        </h1>
        <p className="clinical-tool-catalog-subtitle">
          Every capability wired in CareDroid today: sidebar shortcuts, calculator forms, AI clinical
          tool profiles, backend executors, chat/AI APIs, and platform features.
        </p>
        <p className="clinical-tool-catalog-notice">
          <strong>Source-code scan:</strong> {discoverySummary.totalUniqueIds} unique tool-related
          IDs across this repo ({discoverySummary.nluPatternCount} NLU patterns,{' '}
          {discoverySummary.orchestratorExecutorCount} backend executors,{' '}
          {discoverySummary.phantomOrPlanned} phantom/roadmap IDs,{' '}
          {discoverySummary.externalCatalogInRepo} external “188-tool” import files). There is no
          hidden file with 188 calculators—only the entries listed below.
        </p>
        <div className="catalog-stats">
          <div className="catalog-stat">
            <span className="catalog-stat-number">{summary.sidebarShortcuts}</span>
            <span className="catalog-stat-label">Sidebar shortcuts</span>
          </div>
          <div className="catalog-stat">
            <span className="catalog-stat-number">{summary.calculatorForms}</span>
            <span className="catalog-stat-label">Calculator UIs</span>
          </div>
          <div className="catalog-stat">
            <span className="catalog-stat-number">{summary.aiClinicalProfiles}</span>
            <span className="catalog-stat-label">AI tool profiles</span>
          </div>
          <div className="catalog-stat">
            <span className="catalog-stat-number">{summary.backendExecutors}</span>
            <span className="catalog-stat-label">Backend executors</span>
          </div>
          <div className="catalog-stat">
            <span className="catalog-stat-number">{summary.chatOnlyProfiles}</span>
            <span className="catalog-stat-label">Chat-only NLU</span>
          </div>
          <div className="catalog-stat">
            <span className="catalog-stat-number">
              {platformSummary.chatAndAi + platformSummary.clinicalData + platformSummary.emergency}
            </span>
            <span className="catalog-stat-label">Hidden APIs</span>
          </div>
          <div className="catalog-stat">
            <span className="catalog-stat-number">{platformSummary.platform}</span>
            <span className="catalog-stat-label">Platform features</span>
          </div>
          <div className="catalog-stat">
            <span className="catalog-stat-number">{discoverySummary.totalUniqueIds}</span>
            <span className="catalog-stat-label">IDs in source scan</span>
          </div>
          <div className="catalog-stat">
            <span className="catalog-stat-number">{discoverySummary.phantomOrPlanned}</span>
            <span className="catalog-stat-label">Phantom / planned</span>
          </div>
          <div className="catalog-stat catalog-stat--highlight">
            <span className="catalog-stat-number">{medicalSummary.total}</span>
            <span className="catalog-stat-label">Medical catalog rows</span>
          </div>
          <div className="catalog-stat">
            <span className="catalog-stat-number">{medicalSummary.chatOnRequest}</span>
            <span className="catalog-stat-label">Chat on request</span>
          </div>
        </div>
      </header>

      <div className="catalog-toolbar">
        <input
          type="search"
          className="catalog-search"
          placeholder="Search tools by name, id, or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search clinical catalog"
        />
        <select
          className="catalog-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          <option value="medical">Medical tools &amp; calculators only</option>
          <option value="calculator">Calculator</option>
          <option value="checker">Checker</option>
          <option value="interpreter">Interpreter</option>
          <option value="protocol">Protocol</option>
          <option value="reference">Reference</option>
          <option value="diagnostic">Diagnostic (sidebar)</option>
          <option value="ai">AI / Chat API</option>
          <option value="data">Clinical data API</option>
          <option value="emergency">Emergency</option>
          <option value="enterprise">Enterprise</option>
          <option value="platform">Platform (filter)</option>
          <option value="phantom">Phantom / in-code only</option>
          <option value="alias">ID aliases</option>
          <option value="platform">Platform features</option>
          <option value="client">Client helpers</option>
          <option value="orchestrator">Orchestrator APIs</option>
          <option value="routing">NLU routing</option>
          <option value="emergency-pattern">Emergency NLU patterns</option>
          <option value="collaboration">Collaboration / analytics</option>
        </select>
      </div>

      <section className="catalog-section catalog-section--medical">
        <h2>
          Medical tools &amp; calculators ({medicalSummary.total})
        </h2>
        <p className="catalog-section-desc">
          Complete list of shipped clinical tools: all {medicalSummary.nluProfiles} NLU profiles
          (chat on request), {medicalSummary.calculatorForms} calculator forms,{' '}
          {medicalSummary.sidebarTools} sidebar shortcuts, and {medicalSummary.hubOnlyCalculators}{' '}
          hub-only calculators (APACHE, CURB-65, GCS, Wells). Click column headers to sort.
        </p>
        <MedicalToolsTable
          rows={sortedMedical}
          onOpenPath={handleOpenPath}
          onLaunch={launchFromRow}
          sortKey={medicalSort.sortKey}
          sortDir={medicalSort.sortDir}
          onSort={medicalSort.toggleSort}
        />
      </section>

      {!showMedicalOnly && (
      <section className="catalog-section catalog-section--highlight">
        <h2>Complete source-code scan</h2>
        <p className="catalog-section-desc">
          Every tool-like ID found in this repository (registry, NLU, calculators, cost tracking,
          recommendations, tests, and docs references).
        </p>
        <ul className="catalog-scan-locations">
          {SOURCE_SCAN_LOCATIONS.map((loc) => (
            <li key={loc.path}>
              <strong>{loc.label}</strong> — <code>{loc.path}</code> ({loc.count} entries)
            </li>
          ))}
        </ul>
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <SortableTh
                  label="ID"
                  sortKey="id"
                  activeKey={scanSort.sortKey}
                  sortDir={scanSort.sortDir}
                  onSort={scanSort.toggleSort}
                />
                <SortableTh
                  label="Name"
                  sortKey="name"
                  activeKey={scanSort.sortKey}
                  sortDir={scanSort.sortDir}
                  onSort={scanSort.toggleSort}
                />
                <SortableTh
                  label="Status"
                  sortKey="status"
                  activeKey={scanSort.sortKey}
                  sortDir={scanSort.sortDir}
                  onSort={scanSort.toggleSort}
                />
                <SortableTh
                  label="Category"
                  sortKey="category"
                  activeKey={scanSort.sortKey}
                  sortDir={scanSort.sortDir}
                  onSort={scanSort.toggleSort}
                />
                <th>Source file(s)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedDiscovered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="catalog-empty">
                    No discovered entries match your search.
                  </td>
                </tr>
              ) : (
                sortedDiscovered.map((row) => (
                  <tr key={`${row.id}-${row.status}`}>
                    <td>
                      <code>{row.id}</code>
                    </td>
                    <td>{row.name}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>
                      {row.category ? <CategoryBadge category={row.category} /> : '—'}
                    </td>
                    <td className="catalog-source-cell">
                      {(row.sources || [row.source]).filter(Boolean).join('; ')}
                    </td>
                    <td>
                      <div className="catalog-actions">
                        {row.path && !String(row.path).includes(':') && (
                          <button
                            type="button"
                            className="catalog-btn catalog-btn--primary"
                            onClick={() => handleOpenPath(row.path)}
                          >
                            Open
                          </button>
                        )}
                        <button
                          type="button"
                          className="catalog-btn catalog-btn--secondary"
                          onClick={() => launchFromRow(row)}
                        >
                          Launch
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <details className="catalog-details">
          <summary>Phantom / roadmap IDs ({phantomToolReferences.length})</summary>
          <p className="catalog-section-desc">
            Referenced in recommendation or cost code but not implemented as pages or orchestrator
            tools: {phantomToolReferences.map((p) => p.id).join(', ')}.
          </p>
        </details>
        <details className="catalog-details">
          <summary>ID aliases ({toolIdAliases.length})</summary>
          <ul className="catalog-alias-list">
            {toolIdAliases.map((a) => (
              <li key={a.id}>
                <code>{a.id}</code> → <code>{a.mapsTo}</code> ({a.source})
              </li>
            ))}
          </ul>
        </details>
      </section>
      )}

      {showFocusedSections && (
        <>
          <section className="catalog-section">
            <h2>Emergency NLU patterns ({emergencyPatternGroups.length})</h2>
            <p className="catalog-section-desc">
              Keyword groups from emergency.patterns.ts — evaluated on every chat message before
              clinical tool routing.
            </p>
            <DiscoveredRowsTable
              rows={rowsForStatus('emergency-pattern')}
              onOpenPath={handleOpenPath}
              onLaunch={launchFromRow}
              sortKey={scanSort.sortKey}
              sortDir={scanSort.sortDir}
              onSort={scanSort.toggleSort}
            />
          </section>

          <section className="catalog-section">
            <h2>Client-side clinical helpers ({clientClinicalCapabilities.length})</h2>
            <p className="catalog-section-desc">
              Risk scoring, insights, visualizations, and share UI on tool pages and chat.
            </p>
            <DiscoveredRowsTable
              rows={rowsForStatus('client')}
              onOpenPath={handleOpenPath}
              onLaunch={launchFromRow}
              sortKey={scanSort.sortKey}
              sortDir={scanSort.sortDir}
              onSort={scanSort.toggleSort}
            />
          </section>

          <section className="catalog-section">
            <h2>Tool orchestrator API ({orchestratorApiCapabilities.length})</h2>
            <p className="catalog-section-desc">
              REST surface beyond execute — list, validate, statistics, persisted results.
            </p>
            <DiscoveredRowsTable
              rows={rowsForStatus('orchestrator')}
              onOpenPath={handleOpenPath}
              onLaunch={launchFromRow}
              sortKey={scanSort.sortKey}
              sortDir={scanSort.sortDir}
              onSort={scanSort.toggleSort}
            />
          </section>

          <section className="catalog-section">
            <h2>NLU routing intents ({routingCapabilities.length})</h2>
            <p className="catalog-section-desc">
              Primary intents and chat parameters that route messages before a specific tool is
              selected.
            </p>
            <DiscoveredRowsTable
              rows={rowsForStatus('routing')}
              onOpenPath={handleOpenPath}
              onLaunch={launchFromRow}
              sortKey={scanSort.sortKey}
              sortDir={scanSort.sortDir}
              onSort={scanSort.toggleSort}
            />
          </section>

          <section className="catalog-section">
            <h2>Collaboration and analytics ({collaborationCapabilities.length})</h2>
            <p className="catalog-section-desc">
              Shared sessions, cost tracking, analytics routes, and Android client parity.
            </p>
            <DiscoveredRowsTable
              rows={rowsForStatus('collaboration')}
              onOpenPath={handleOpenPath}
              onLaunch={launchFromRow}
              sortKey={scanSort.sortKey}
              sortDir={scanSort.sortDir}
              onSort={scanSort.toggleSort}
            />
          </section>
        </>
      )}

      {!showMedicalOnly && (
      <>
      <section className="catalog-section">
        <h2>Chat &amp; AI APIs (backend)</h2>
        <p className="catalog-section-desc">
          Endpoints implemented on the server; most are reached through the dashboard chat or
          integrations—not separate tool pages.
        </p>
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>API</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredChatAi.length === 0 ? (
                <tr>
                  <td colSpan={5} className="catalog-empty">
                    No chat/AI APIs match your search.
                  </td>
                </tr>
              ) : (
                filteredChatAi.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <code>{row.id}</code>
                    </td>
                    <td>{row.name}</td>
                    <td>
                      <CategoryBadge category={row.category} />
                    </td>
                    <td>
                      <span className="catalog-api-hint">{row.apiPath}</span>
                    </td>
                    <td>
                      <div className="catalog-actions">
                        {row.path && (
                          <button
                            type="button"
                            className="catalog-btn catalog-btn--primary"
                            onClick={() => handleOpenPath(row.path)}
                          >
                            Open
                          </button>
                        )}
                        {row.chatSeed && (
                          <button
                            type="button"
                            className="catalog-btn catalog-btn--secondary"
                            onClick={() => handleCapabilityAction(row)}
                          >
                            Try in chat
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="catalog-section">
        <h2>Clinical data APIs</h2>
        <p className="catalog-section-desc">Drug and protocol reference stores (CRUD + chat context).</p>
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>API</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDataApis.length === 0 ? (
                <tr>
                  <td colSpan={4} className="catalog-empty">
                    No data APIs match your search.
                  </td>
                </tr>
              ) : (
                filteredDataApis.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <code>{row.id}</code>
                    </td>
                    <td>{row.name}</td>
                    <td>
                      <span className="catalog-api-hint">{row.apiPath}</span>
                    </td>
                    <td>
                      <div className="catalog-actions">
                        <button
                          type="button"
                          className="catalog-btn catalog-btn--primary"
                          onClick={() => handleCapabilityAction(row)}
                        >
                          {row.path ? 'Open / chat' : 'Try in chat'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="catalog-section">
        <h2>Emergency &amp; alerts</h2>
        <p className="catalog-section-desc">
          Automatic emergency NLU on chat plus the clinical alerts hub.
        </p>
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmergency.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code>{row.id}</code>
                  </td>
                  <td>{row.name}</td>
                  <td>
                    <div className="catalog-actions">
                      {row.path && (
                        <button
                          type="button"
                          className="catalog-btn catalog-btn--primary"
                          onClick={() => handleOpenPath(row.path)}
                        >
                          Open
                        </button>
                      )}
                      {row.chatSeed && (
                        <button
                          type="button"
                          className="catalog-btn catalog-btn--secondary"
                          onClick={() => handleCapabilityAction(row)}
                        >
                          Try in chat
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="catalog-section">
        <h2>Backend executors (API)</h2>
        <p className="catalog-section-desc">
          Registered in the tool orchestrator and callable via POST /api/tools/:id/execute.
        </p>
        {backendLoadError && (
          <p className="catalog-backend-status catalog-backend-status--error">
            Could not load live registry: {backendLoadError}. Showing static catalog entries marked as
            executable.
          </p>
        )}
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>UI page</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(filteredBackend.length > 0
                ? filteredBackend
                : clinicalIntentTools.filter((t) => t.backendExecutable)
              ).map((tool) => {
                const id = tool.id || tool.toolId;
                const intentRow = clinicalIntentTools.find((t) => t.toolId === id);
                const registryId = ORCHESTRATOR_TO_REGISTRY_ID[id];
                return (
                  <tr key={id}>
                    <td>
                      <code>{id}</code>
                    </td>
                    <td>{tool.name || intentRow?.toolName}</td>
                    <td>
                      <CategoryBadge category={tool.category || intentRow?.category} />
                    </td>
                    <td>{intentRow?.path || '—'}</td>
                    <td>
                      <div className="catalog-actions">
                        {intentRow?.path && (
                          <button
                            type="button"
                            className="catalog-btn catalog-btn--primary"
                            onClick={() => handleOpenPath(intentRow.path)}
                          >
                            Open
                          </button>
                        )}
                        <button
                          type="button"
                          className="catalog-btn catalog-btn--secondary"
                          onClick={() =>
                            handleTryInChat(registryId, intentRow?.chatSeed)
                          }
                        >
                          Try in chat
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="catalog-section">
        <h2>AI clinical tool profiles (NLU)</h2>
        <p className="catalog-section-desc">
          Recognized by the intent classifier when users ask in natural language.
        </p>
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>Tool ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Page</th>
                <th>Backend</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIntent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="catalog-empty">
                    No tools match your search.
                  </td>
                </tr>
              ) : (
                filteredIntent.map((tool) => (
                  <tr key={tool.toolId}>
                    <td>
                      <code>{tool.toolId}</code>
                    </td>
                    <td>{tool.toolName}</td>
                    <td>
                      <CategoryBadge category={tool.category} />
                    </td>
                    <td>{tool.path ? 'Yes' : 'Chat only'}</td>
                    <td>
                      {isBackendExecutable(tool.toolId) ? (
                        <span className="catalog-badge catalog-badge--backend">API</span>
                      ) : (
                        <span className="catalog-badge catalog-badge--client">Chat / UI</span>
                      )}
                    </td>
                    <td>
                      <div className="catalog-actions">
                        {tool.path ? (
                          <button
                            type="button"
                            className="catalog-btn catalog-btn--primary"
                            onClick={() => handleOpenPath(tool.path)}
                          >
                            Open
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="catalog-btn catalog-btn--secondary"
                          onClick={() =>
                            handleTryInChat(
                              tool.sidebarToolId || ORCHESTRATOR_TO_REGISTRY_ID[tool.toolId],
                              tool.chatSeed ||
                                `Help me use the ${tool.toolName}. ${tool.description}`
                            )
                          }
                        >
                          Try in chat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="catalog-section">
        <h2>Calculator forms (built-in UI)</h2>
        <p className="catalog-section-desc">Interactive forms in the Calculators module.</p>
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>Slug</th>
                <th>Name</th>
                <th>Implementation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCalculators.length === 0 ? (
                <tr>
                  <td colSpan={4} className="catalog-empty">
                    No calculators match your search.
                  </td>
                </tr>
              ) : (
                filteredCalculators.map((calc) => (
                  <tr key={calc.id}>
                    <td>
                      <code>{calc.id}</code>
                    </td>
                    <td>{calc.name}</td>
                    <td>{calc.implementation}</td>
                    <td>
                      <div className="catalog-actions">
                        <button
                          type="button"
                          className="catalog-btn catalog-btn--primary"
                          onClick={() => handleOpenPath(calc.path)}
                        >
                          Open
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="catalog-section">
        <h2>Sidebar shortcuts</h2>
        <p className="catalog-section-desc">Entries from toolRegistry.js shown in navigation.</p>
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>Registry ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Path</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSidebar.length === 0 ? (
                <tr>
                  <td colSpan={5} className="catalog-empty">
                    No shortcuts match your search.
                  </td>
                </tr>
              ) : (
                filteredSidebar.map((tool) => (
                  <tr key={tool.id}>
                    <td>
                      <code>{tool.id}</code>
                    </td>
                    <td>{tool.name}</td>
                    <td>{tool.category}</td>
                    <td>{tool.path}</td>
                    <td>
                      <div className="catalog-actions">
                        <button
                          type="button"
                          className="catalog-btn catalog-btn--primary"
                          onClick={() => handleOpenPath(tool.path)}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          className="catalog-btn catalog-btn--secondary"
                          onClick={() => handleTryInChat(tool.id)}
                        >
                          Try in chat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      </>
      )}
    </div>
  );
};

export default ClinicalToolCatalog;
