import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { useProfileNavigate } from '../../hooks/useProfileNavigate';
import { useConversation } from '../../contexts/ConversationContext';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import { applyRegistryToolLaunch } from '../../navigation/registryToolLaunch';
import toolRegistry from '../../data/toolRegistry';
import {
  builtinUiCalculators,
  clinicalIntentTools,
  getCatalogSummary,
  nluCalculatorHubOnly,
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
  aliasOnlyToolReferences,
  apiOnlyToolReferences,
  orchestratorApiCapabilities,
  phantomToolReferences,
  routingCapabilities,
  SOURCE_SCAN_LOCATIONS,
  toolIdAliases,
  truePhantomToolReferences,
} from '../../data/sourceCodeToolDiscovery';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
} from '../../data/clinicalCatalogWiring';
import {
  getMedicalCatalogSummary,
  getMedicalToolsCatalogRows,
} from '../../data/medicalToolsCatalogIndex';
import { fetchBackendClinicalTools } from '../../services/clinicalToolsApi';
import { sortCatalogRows } from '../../utils/catalogSort';
import {
  catalogRowsMatchingQuery,
  enrichDiscoveredCatalogRow,
  isDiscoveredRowLaunchable,
  getDiscoveredLaunchLabel,
  isOrchestratorRegisteredNlu,
  matchesDiscoveredRow,
  matchesMedicalCatalogCategoryFilter,
  normalizeCatalogCategory,
  textMatchesCatalogQuery,
} from '../../utils/catalogSearch';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';
import ClinicalDecisionSupportDisclaimer from '../../components/clinical/ClinicalDecisionSupportDisclaimer';
import './ClinicalToolCatalog.css';
import '../../styles/catalog-mobile.css';

const CATEGORY_CLASS = {
  'chat-assisted': 'catalog-badge--ai',
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
  fleet: 'catalog-badge--data',
  monitoring: 'catalog-badge--ai',
  oncology: 'catalog-badge--reference',
  medication: 'catalog-badge--checker',
};

const CATEGORY_QUICK_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'medical', label: 'Medical' },
  { value: 'calculator', label: 'Calculators' },
  { value: 'chat-assisted', label: 'Chat-assisted' },
  { value: 'checker', label: 'Checkers' },
  { value: 'interpreter', label: 'Interpreters' },
  { value: 'reference', label: 'Reference' },
  { value: 'ai', label: 'Chat/API' },
  { value: 'data', label: 'Data APIs' },
  { value: 'apis', label: 'All APIs' },
  { value: 'phantom', label: 'Phantom' },
];

const PLATFORM_API_CATEGORIES = new Set(['ai', 'data', 'emergency']);

const STATUS_LABEL = {
  'shipped-page': 'Shipped page',
  'shipped-calculator': 'Calculator UI',
  'backend-executor': 'Backend executor',
  'nlu-api-intent': 'NLU API intent',
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
  if (status === 'backend-executor' || status === 'nlu-api-intent') return 'catalog-badge--backend';
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
  const applySort = (rows, getValue = undefined) => sortCatalogRows(rows, sortKey, sortDir, getValue);
  return { sortKey, sortDir, toggleSort, applySort };
}

function MedicalToolsTable({ rows, onOpenPath, onLaunch, sortKey, sortDir, onSort, hideEmpty }) {
  if (rows.length === 0) {
    if (hideEmpty) return null;
    return <p className="catalog-empty catalog-empty--block">No medical tools match your search.</p>;
  }
  return (
    <div className="catalog-table-wrap catalog-table-wrap--stacked">
      <table className="catalog-table catalog-table--medical catalog-table--stacked">
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
              <td data-label="ID">
                <code>{row.primaryId || row.id}</code>
              </td>
              <td data-label="Name" className="catalog-tool-name-cell">
                <span className="catalog-tool-name-text">{row.name}</span>
                {row.description ? (
                  <p className="catalog-tool-desc">{row.description}</p>
                ) : null}
                {row.registryShortcut && (
                  <span className="catalog-inline-badge" title="Sidebar shortcut from toolRegistry.js">
                    Sidebar shortcut
                  </span>
                )}
                {row.chatOnlyForm && (
                  <span className="catalog-inline-badge" title="Guided chat from calculators hub; no dedicated form">
                    Chat-assisted
                  </span>
                )}
                {row.backendApiIntentOnly && (
                  <span
                    className="catalog-inline-badge catalog-inline-badge--muted"
                    title="NLU routes to API; not a registered POST /api/tools executor"
                  >
                    NLU API intent
                  </span>
                )}
                {row.backendApiRegistered && (
                  <span className="catalog-inline-badge" title="Registered backend tool executor">
                    Backend API
                  </span>
                )}
              </td>
              <td data-label="Category">
                <CategoryBadge category={row.category} />
              </td>
              <td data-label="Access">{row.accessSummary}</td>
              <td data-label="Chat">{row.chatOnRequest ? 'Yes' : '—'}</td>
              <td className="catalog-source-cell" data-label="Page / form">
                {row.pagePath && <code>{row.pagePath}</code>}
                {row.uiCalculatorSlug && !row.chatOnlyForm && (
                  <span>
                    {row.pagePath ? ' · ' : ''}
                    form: <code>{row.uiCalculatorSlug}</code>
                  </span>
                )}
                {row.chatOnlyForm && row.pagePath && (
                  <span>{row.pagePath ? ' · ' : ''}hub (chat-assisted)</span>
                )}
                {!row.pagePath && !row.uiCalculatorSlug && !row.chatOnlyForm && '—'}
              </td>
              <td className="catalog-actions-cell" data-label="Actions">
                <div className="catalog-actions">
                  {row.pagePath && !row.chatOnlyForm && (
                    <button
                      type="button"
                      className="catalog-btn catalog-btn--primary"
                      onClick={() => onOpenPath(row.pagePath)}
                    >
                      Open
                    </button>
                  )}
                  {row.launchable ? (
                    <button
                      type="button"
                      className={`catalog-btn ${
                        row.chatOnlyForm ? 'catalog-btn--primary' : 'catalog-btn--secondary'
                      }`}
                      onClick={() => onLaunch(row)}
                    >
                      {row.launchLabel || 'Launch'}
                    </button>
                  ) : (
                    <span className="catalog-action-muted" title="No page or chat route wired">
                      Not launchable
                    </span>
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

function DiscoveredRowsTable({ rows, onOpenPath, onLaunch, sortKey, sortDir, onSort, hideEmpty = undefined as any }) {
  if (rows.length === 0) {
    if (hideEmpty) return null;
    return <p className="catalog-empty catalog-empty--block">No entries match your search.</p>;
  }
  return (
    <div className="catalog-table-wrap catalog-table-wrap--stacked">
      <table className="catalog-table catalog-table--stacked">
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
              <td data-label="ID">
                <code>{row.id}</code>
              </td>
              <td data-label="Name">{row.name}</td>
              <td data-label="Status">
                <StatusBadge status={row.status} />
              </td>
              <td data-label="Category">{row.category ? <CategoryBadge category={row.category} /> : '—'}</td>
              <td className="catalog-source-cell" data-label="Notes / source">
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
              <td className="catalog-actions-cell" data-label="Actions">
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
                  {onLaunch && isDiscoveredRowLaunchable(row) && (
                    <button
                      type="button"
                      className={`catalog-btn ${
                        row.status === 'nlu-chat' || row.chatOnly
                          ? 'catalog-btn--primary'
                          : 'catalog-btn--secondary'
                      }`}
                      onClick={() => onLaunch(row)}
                    >
                      {getDiscoveredLaunchLabel(row)}
                    </button>
                  )}
                  {onLaunch && !isDiscoveredRowLaunchable(row) && (
                    <span className="catalog-action-muted" title="Roadmap or reference only">
                      Not launchable
                    </span>
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
  useRouteChromeRegistration({ title: 'Developer Catalog / Source Audit' });
  const surfaces = usePractitionerSurfaceVisibility();
  const { profileNavigate, rawNavigate } = useProfileNavigate();
  const { setActiveTool, addMessage, selectTool } = useConversation();
  const { recordToolAccess } = useToolPreferences();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [backendTools, setBackendTools] = useState<any[]>([]);
  const [backendLoadError, setBackendLoadError] = useState<any>(null);
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

  const query = search.trim();

  const hubOnlyToolIds = useMemo(
    () => new Set(nluCalculatorHubOnly.map((h) => h.toolId)),
    []
  );

  const intentToolCategory = (tool) =>
    normalizeCatalogCategory(tool.category, {
      chatOnlyForm: hubOnlyToolIds.has(tool.toolId),
    });

  const discoveryRowCategory = (row) =>
    normalizeCatalogCategory(row.category, {
      chatOnlyForm:
        Boolean(row.chatOnly) ||
        (row.status === 'nlu-chat' && !row.path) ||
        (row.status === 'nlu-chat' && row.path === '/tools/calculators'),
    });

  const sidebarMatchesCategory = (category) => {
    const normalized = normalizeCatalogCategory(category);
    if (categoryFilter === 'all' || categoryFilter === 'medical') return true;
    if (categoryFilter === 'checker') {
      return normalized === 'checker' || normalized === 'diagnostic';
    }
    if (categoryFilter === 'diagnostic') {
      return normalized === 'diagnostic' || normalized === 'checker';
    }
    return normalized === categoryFilter;
  };

  const filteredSidebar = toolRegistry.filter(
    (t) =>
      textMatchesCatalogQuery(`${t.name} ${t.description} ${t.category} ${t.id}`, query, {
        ids: [t.id],
      }) && sidebarMatchesCategory(t.category)
  );

  const filteredCalculators = builtinUiCalculators.filter(
    (c) =>
      textMatchesCatalogQuery(`${c.name} ${c.description} ${c.id}`, query, { ids: [c.id] }) &&
      (categoryFilter === 'all' ||
        categoryFilter === 'medical' ||
        categoryFilter === 'calculator')
  );

  const filteredIntent = clinicalIntentTools.filter(
    (t) =>
      textMatchesCatalogQuery(`${t.toolName} ${t.description} ${t.category} ${t.toolId}`, query, {
        ids: [t.toolId],
      }) &&
      (categoryFilter === 'all' || intentToolCategory(t) === categoryFilter)
  );

  const filteredBackend = backendTools.filter((t) =>
    textMatchesCatalogQuery(
      `${t.name || ''} ${t.description || ''} ${t.id || ''} ${t.category || ''}`,
      query,
      { ids: [t.id || t.toolId].filter(Boolean) }
    )
  );

  const matchesPlatformCategory = (rowCategory) => {
    if (categoryFilter === 'all' || categoryFilter === 'medical') return true;
    if (categoryFilter === 'apis') return PLATFORM_API_CATEGORIES.has(rowCategory);
    return rowCategory === categoryFilter;
  };

  const filterCapabilityRows = (rows) =>
    rows.filter(
      (row) =>
        textMatchesCatalogQuery(
          `${row.name} ${row.description} ${row.id} ${row.category} ${row.apiPath || ''}`,
          query,
          { ids: [row.id] }
        ) && matchesPlatformCategory(row.category)
    );

  const filteredChatAi = filterCapabilityRows(chatAndAiCapabilities);
  const filteredDataApis = filterCapabilityRows(clinicalDataApis);
  const filteredEmergency = filterCapabilityRows(emergencyCapabilities);
  const discoverQueryMatch = (row) => matchesDiscoveredRow(row, query);

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
    return discoveryRowCategory(row) === categoryFilter;
  });

  const enrichedDiscovered = useMemo(
    () => filteredDiscovered.map(enrichDiscoveredCatalogRow),
    [filteredDiscovered]
  );

  const sortedDiscovered = useMemo(
    () => scanSort.applySort(enrichedDiscovered),
    [enrichedDiscovered, scanSort.sortKey, scanSort.sortDir]
  );

  const filteredMedical = catalogRowsMatchingQuery(allMedicalRows, query).filter((row) =>
    matchesMedicalCatalogCategoryFilter(row, categoryFilter)
  );

  const sortedMedical = useMemo(
    () => medicalSort.applySort(filteredMedical),
    [filteredMedical, medicalSort.sortKey, medicalSort.sortDir]
  );

  if (!surfaces.tools.showDeveloperCatalog) {
    return <Navigate to={CANONICAL_ROUTES.emergencyTools} replace />;
  }

  const rowsForStatus = (status) =>
    scanSort.applySort(
      allDiscovered.filter((row) => row.status === status && discoverQueryMatch(row))
    );

  const showMedicalOnly = categoryFilter === 'medical';
  const showFocusedSections =
    categoryFilter === 'all' || categoryFilter === 'phantom' || categoryFilter === 'alias';
  const showPlatformSections =
    categoryFilter === 'all' ||
    categoryFilter === 'apis' ||
    PLATFORM_API_CATEGORIES.has(categoryFilter);
  const showLegacyToolSections =
    showFocusedSections ||
    categoryFilter === 'calculator' ||
    categoryFilter === 'chat-assisted' ||
    categoryFilter === 'checker' ||
    categoryFilter === 'interpreter' ||
    categoryFilter === 'reference' ||
    categoryFilter === 'diagnostic';

  const showGlobalEmpty =
    Boolean(query) &&
    sortedMedical.length === 0 &&
    (showMedicalOnly || sortedDiscovered.length === 0);

  const showCategoryEmpty =
    !query &&
    categoryFilter !== 'all' &&
    categoryFilter !== 'medical' &&
    sortedMedical.length === 0 &&
    sortedDiscovered.length === 0;

  const handleOpenPath = (path) => {
    if (path) profileNavigate(path);
  };

  const launchCatalogItem = (id) => {
    const launch = resolveCatalogLaunch(id);
    const resolvedNavigationPath = resolveNavigationPathForLaunch(launch);
    applyRegistryToolLaunch(id, {
      navigate: rawNavigate,
      addMessage,
      selectTool,
      setActiveTool,
      recordToolAccess,
      state: { source: 'developer-catalog', resolvedNavigationPath },
    });
  };

  const launchFromRow = (row) => {
    if (row?.status === 'phantom' || row?.status === 'marketing-copy') return;
    if (row?.launchable === false) return;
    const launchId = row?.sidebarToolId || row?.mapsTo || row?.primaryId || row?.id;
    if (launchId) {
      launchCatalogItem(launchId);
    }
  };

  const handleTryInChat = (sidebarToolId, chatSeed = undefined) => {
    if (sidebarToolId) {
      launchCatalogItem(sidebarToolId);
      return;
    }
    if (chatSeed) {
      addMessage(chatSeed, 'user');
      profileNavigate('/assistant');
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

  const isPostExecutable = (toolId) =>
    backendIds.has(toolId) || isOrchestratorRegisteredNlu(toolId);

  const isBackendRouted = (toolId) =>
    clinicalIntentTools.find((t) => t.toolId === toolId)?.backendRouted;

  return (
    <div className="clinical-tool-catalog">
      <button type="button" className="catalog-back-link" onClick={() => profileNavigate('/tools')}>
        <NavIcon icon={CHROME_ICONS.arrowLeft} size={16} aria-hidden />
        Back to All Tools
      </button>

      <header className="clinical-tool-catalog-header">
        <p className="clinical-tool-catalog-title-text" data-testid="cd-page-title-text">
          <NavIcon icon={CHROME_ICONS.tools} size={32} aria-hidden />
          Developer Catalog / Source Audit
        </p>
        <p className="clinical-tool-catalog-subtitle">
          Developer-facing source inventory for CareDroid: launchable references, backend executors,
          source-scan rows, aliases, platform APIs, and audit artifacts.
        </p>
        <p className="clinical-tool-catalog-notice">
          <strong>User-facing tools now live at /tools.</strong> This page intentionally includes
          internal and audit-only records that are not shown in the default user catalog.{' '}
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

      <ClinicalDecisionSupportDisclaimer className="catalog-safety-disclaimer" />

      <div className="catalog-toolbar">
        <input
          type="search"
          className="catalog-search"
          placeholder="Search by name, id, alias, or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search developer catalog"
        />
        <select
          className="catalog-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          <option value="medical">Medical tools &amp; calculators only</option>
          <option value="calculator">Calculator (form)</option>
          <option value="chat-assisted">Chat-assisted (Tier B / hub)</option>
          <option value="checker">Checker</option>
          <option value="interpreter">Interpreter</option>
          <option value="protocol">Protocol</option>
          <option value="reference">Reference</option>
          <option value="apis">Platform APIs (chat / data / emergency)</option>
          <option value="diagnostic">Diagnostic (sidebar)</option>
          <option value="ai">AI / Chat API</option>
          <option value="data">Clinical data API</option>
          <option value="emergency">Emergency</option>
          <option value="enterprise">Enterprise</option>
          <option value="fleet">Fleet</option>
          <option value="platform">Platform features</option>
          <option value="phantom">Phantom / in-code only</option>
          <option value="alias">ID aliases</option>
          <option value="client">Client helpers</option>
          <option value="orchestrator">Orchestrator APIs</option>
          <option value="routing">NLU routing</option>
          <option value="emergency-pattern">Emergency NLU patterns</option>
          <option value="collaboration">Collaboration / analytics</option>
        </select>
      </div>

      <div className="catalog-category-chips" role="group" aria-label="Quick category filters">
        {CATEGORY_QUICK_FILTERS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            className={`catalog-category-chip${
              categoryFilter === chip.value ? ' catalog-category-chip--active' : ''
            }`}
            {...((categoryFilter === chip.value) ? { 'aria-pressed': 'true' as const } : { 'aria-pressed': 'false' as const })}
            onClick={() => setCategoryFilter(chip.value)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {showGlobalEmpty && (
        <div className="catalog-empty catalog-empty--global" role="status">
          <p>
            No tools match <strong>&quot;{search.trim()}&quot;</strong>.
            Try an alias (e.g. pe-score, depression screen) or clear the search.
          </p>
          <div className="catalog-empty-actions">
            <button
              type="button"
              className="catalog-btn catalog-btn--secondary"
              aria-label="Clear search"
              onClick={() => setSearch('')}
            >
              Clear search
            </button>
          </div>
        </div>
      )}

      {showCategoryEmpty && (
        <div className="catalog-empty catalog-empty--global" role="status">
          <p>
            No tools in the <strong>{categoryFilter}</strong> category. Choose another filter or show all
            categories.
          </p>
          <div className="catalog-empty-actions">
            <button
              type="button"
              className="catalog-btn catalog-btn--secondary"
              onClick={() => setCategoryFilter('all')}
            >
              Show all categories
            </button>
          </div>
        </div>
      )}

      <section className="catalog-section catalog-section--medical" id="catalog-medical-tools">
        <h2>
          Medical tools &amp; calculators (
          {query || categoryFilter !== 'all' ? `${sortedMedical.length} shown` : medicalSummary.total})
          )
        </h2>
        <p className="catalog-section-desc">
          Audit reference for shipped clinical rows: {medicalSummary.nluProfiles} NLU profiles
          (chat on request), {medicalSummary.calculatorForms} calculator forms,{' '}
          {medicalSummary.sidebarTools} registry shortcuts, and {medicalSummary.hubOnlyCalculators}{' '}
          hub-only calculators. The canonical user-facing browser is /tools.
        </p>
        <MedicalToolsTable
          rows={sortedMedical}
          onOpenPath={handleOpenPath}
          onLaunch={launchFromRow}
          sortKey={medicalSort.sortKey}
          sortDir={medicalSort.sortDir}
          onSort={medicalSort.toggleSort}
          hideEmpty={showCategoryEmpty}
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
        <div className="catalog-table-wrap catalog-table-wrap--stacked">
          <table className="catalog-table catalog-table--stacked">
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
                  <td colSpan={6} className="catalog-empty catalog-empty-row">
                    No discovered entries match your search.
                  </td>
                </tr>
              ) : (
                sortedDiscovered.map((row) => (
                  <tr key={`${row.id}-${row.status}`}>
                    <td data-label="ID">
                      <code>{row.id}</code>
                    </td>
                    <td data-label="Name" className="catalog-tool-name-cell">
                      {row.name}
                    </td>
                    <td data-label="Status">
                      <StatusBadge status={row.displayStatus || row.status} />
                    </td>
                    <td data-label="Category">
                      {row.category ? <CategoryBadge category={row.category} /> : '—'}
                    </td>
                    <td className="catalog-source-cell" data-label="Source file(s)">
                      {(row.sources || [row.source]).filter(Boolean).join('; ')}
                    </td>
                    <td className="catalog-actions-cell" data-label="Actions">
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
                        {row.launchable ? (
                          <button
                            type="button"
                            className={`catalog-btn ${
                              row.chatOnly ||
                              row.displayStatus === 'nlu-chat' ||
                              row.displayStatus === 'nlu-api-intent'
                                ? 'catalog-btn--primary'
                                : 'catalog-btn--secondary'
                            }`}
                            onClick={() => launchFromRow(row)}
                          >
                            {row.launchLabel || getDiscoveredLaunchLabel(row)}
                          </button>
                        ) : (
                          <span className="catalog-action-muted" title="Roadmap or reference only">
                            Not launchable
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <details className="catalog-details">
          <summary>Source-audit-only IDs ({phantomToolReferences.length})</summary>
          <p className="catalog-section-desc">
            True phantoms: {truePhantomToolReferences.map((p) => p.id).join(', ') || 'none'}.
            API-only: {apiOnlyToolReferences.map((p) => p.id).join(', ') || 'none'}.
            Aliases: {aliasOnlyToolReferences.map((p) => p.id).join(', ') || 'none'}.
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
          <section className="catalog-section" id="catalog-discovery-sections">
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
              Shared sessions, cost tracking, analytics routes, and web platform parity.
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

      {!showMedicalOnly && showPlatformSections && (
      <>
      <section
        className="catalog-section catalog-section--platform"
        id="catalog-platform-apis"
      >
        <h2>Platform &amp; chat APIs (surfaced)</h2>
        <p className="catalog-section-desc">
          Backend chat, clinical data, and emergency capabilities—available from dashboard chat and
          integrations, not as separate sidebar shortcuts.
        </p>
        <div className="catalog-table-wrap catalog-table-wrap--stacked">
          <table className="catalog-table catalog-table--stacked">
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
                  <td colSpan={5} className="catalog-empty catalog-empty-row">
                    No chat/AI APIs match your search.
                  </td>
                </tr>
              ) : (
                filteredChatAi.map((row) => (
                  <tr key={row.id}>
                    <td data-label="ID">
                      <code>{row.id}</code>
                    </td>
                    <td data-label="Name" className="catalog-tool-name-cell">
                      {row.name}
                    </td>
                    <td data-label="Category">
                      <CategoryBadge category={row.category} />
                    </td>
                    <td data-label="API">
                      <span className="catalog-api-hint">{row.apiPath}</span>
                    </td>
                    <td className="catalog-actions-cell" data-label="Actions">
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
        <div className="catalog-table-wrap catalog-table-wrap--stacked">
          <table className="catalog-table catalog-table--stacked">
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
                  <td colSpan={4} className="catalog-empty catalog-empty-row">
                    No data APIs match your search.
                  </td>
                </tr>
              ) : (
                filteredDataApis.map((row) => (
                  <tr key={row.id}>
                    <td data-label="ID">
                      <code>{row.id}</code>
                    </td>
                    <td data-label="Name" className="catalog-tool-name-cell">
                      {row.name}
                    </td>
                    <td data-label="API">
                      <span className="catalog-api-hint">{row.apiPath}</span>
                    </td>
                    <td className="catalog-actions-cell" data-label="Actions">
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
        <div className="catalog-table-wrap catalog-table-wrap--stacked">
          <table className="catalog-table catalog-table--stacked">
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
                  <td data-label="ID">
                    <code>{row.id}</code>
                  </td>
                  <td data-label="Name" className="catalog-tool-name-cell">
                    {row.name}
                  </td>
                  <td className="catalog-actions-cell" data-label="Actions">
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
      </>
      )}

      {!showMedicalOnly && showLegacyToolSections && (
      <>
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
        <div className="catalog-table-wrap catalog-table-wrap--stacked">
          <table className="catalog-table catalog-table--stacked">
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
                : clinicalIntentTools.filter((t) => t.postExecutable)
              ).map((tool) => {
                const id = tool.id || tool.toolId;
                const intentRow = clinicalIntentTools.find((t) => t.toolId === id);
                const registryId = ORCHESTRATOR_TO_REGISTRY_ID[id];
                return (
                  <tr key={id}>
                    <td data-label="ID">
                      <code>{id}</code>
                    </td>
                    <td data-label="Name" className="catalog-tool-name-cell">
                      {tool.name || intentRow?.toolName}
                      {intentRow?.backendRouted && !isOrchestratorRegisteredNlu(id) && (
                        <span
                          className="catalog-inline-badge catalog-inline-badge--muted"
                          title="NLU profile only — not registered for POST /api/tools/:id/execute"
                        >
                          NLU API intent
                        </span>
                      )}
                    </td>
                    <td data-label="Category">
                      <CategoryBadge category={tool.category || intentRow?.category} />
                    </td>
                    <td data-label="UI page">{intentRow?.path || '—'}</td>
                    <td className="catalog-actions-cell" data-label="Actions">
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
                        {intentRow && (
                          <button
                            type="button"
                            className="catalog-btn catalog-btn--secondary"
                            onClick={() =>
                              handleTryInChat(registryId, intentRow?.chatSeed)
                            }
                          >
                            {isOrchestratorRegisteredNlu(id) ? 'Try in chat' : 'Chat-assisted'}
                          </button>
                        )}
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
        <div className="catalog-table-wrap catalog-table-wrap--stacked">
          <table className="catalog-table catalog-table--stacked">
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
                  <td colSpan={6} className="catalog-empty catalog-empty-row">
                    No tools match your search.
                  </td>
                </tr>
              ) : (
                filteredIntent.map((tool) => (
                  <tr key={tool.toolId}>
                    <td data-label="Tool ID">
                      <code>{tool.toolId}</code>
                    </td>
                    <td data-label="Name" className="catalog-tool-name-cell">
                      {tool.toolName}
                    </td>
                    <td data-label="Category">
                      <CategoryBadge category={tool.category} />
                    </td>
                    <td data-label="Page">{tool.path ? 'Yes' : 'Chat only'}</td>
                    <td data-label="Backend">
                      {isPostExecutable(tool.toolId) ? (
                        <span className="catalog-badge catalog-badge--backend">POST API</span>
                      ) : isBackendRouted(tool.toolId) ? (
                        <span className="catalog-badge catalog-badge--backend">NLU backend</span>
                      ) : (
                        <span className="catalog-badge catalog-badge--client">Chat / UI</span>
                      )}
                    </td>
                    <td className="catalog-actions-cell" data-label="Actions">
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
        <div className="catalog-table-wrap catalog-table-wrap--stacked">
          <table className="catalog-table catalog-table--stacked">
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
                  <td colSpan={4} className="catalog-empty catalog-empty-row">
                    No calculators match your search.
                  </td>
                </tr>
              ) : (
                filteredCalculators.map((calc) => (
                  <tr key={calc.id}>
                    <td data-label="Slug">
                      <code>{calc.id}</code>
                    </td>
                    <td data-label="Name" className="catalog-tool-name-cell">
                      {calc.name}
                    </td>
                    <td data-label="Implementation">{calc.implementation}</td>
                    <td className="catalog-actions-cell" data-label="Actions">
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
        <div className="catalog-table-wrap catalog-table-wrap--stacked">
          <table className="catalog-table catalog-table--stacked">
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
                  <td colSpan={5} className="catalog-empty catalog-empty-row">
                    No shortcuts match your search.
                  </td>
                </tr>
              ) : (
                filteredSidebar.map((tool) => (
                  <tr key={tool.id}>
                    <td data-label="Registry ID">
                      <code>{tool.id}</code>
                    </td>
                    <td data-label="Name" className="catalog-tool-name-cell">
                      {tool.name}
                    </td>
                    <td data-label="Category">{tool.category}</td>
                    <td data-label="Path">{tool.path}</td>
                    <td className="catalog-actions-cell" data-label="Actions">
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
