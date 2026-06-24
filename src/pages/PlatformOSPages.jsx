import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useProfileNavigate from '../hooks/useProfileNavigate';
import { useNotifications } from '../contexts/NotificationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useUser } from '../contexts/UserContext';
import {
  CARE_WORKSPACES,
  buildCareWorkspaceModel,
} from '../config/workspace.config';
import {
  PLATFORM_NOTIFICATIONS,
  PLATFORM_TIMELINE_EVENTS,
  PLATFORM_WORKFLOWS,
  buildAssetRegistry,
  buildDigitalTwinSnapshot,
  filterByWorkspace,
  filterText,
  workspaceFilterSummary,
} from '../data/platformOperatingSystem';
import { buildSearchFirstResults } from '../data/searchFirstDiscovery';
import { buildDepartmentPerformanceIntelligence } from '../data/departmentPerformanceIntelligence';
import { buildWorkspaceDependencyGraph } from '../data/crossWorkspaceIntelligence';
import { buildWorkflowMiningReport } from '../data/workflowMiningEngine';
import { buildHealthcareKnowledgeHub } from '../data/healthcareKnowledgeHub';
import { buildCareDroidBusinessBrain } from '../data/caredroidBusinessBrain';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import { PlatformAssetsApi } from '../services/platformAssetsApi';
import { recordWorkflowCompletion } from '../services/usageMeteringService';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { buildAssetInventoryProjection } from '../data/assetInventory';
import { NavIcon } from '../navigation/NavIcon';
import { getWorkspaceIcon } from '../navigation/iconRegistry';
import {
  FilterPanel,
  FormField,
  InfoNotice,
  InsightCard,
  PageShell as CanonicalPageShell,
} from '../components/ui/CareDroidPrimitives';
import './PlatformOSPages.css';

const MAX_VISIBLE_SEARCH_RESULTS = 8;

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function PageShell({ eyebrow, title, description, children, actions = null }) {
  return (
    <CanonicalPageShell
      className="platform-os-page"
      headerClassName="platform-os-hero"
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={actions}
    >
      {children}
    </CanonicalPageShell>
  );
}

function DataSourceNotice({ label, detail }) {
  return <InfoNotice label={label} detail={detail} className="platform-source-notice" />;
}

function FilterBar({
  query,
  setQuery,
  workspaceId,
  setWorkspaceId,
  category,
  setCategory,
  categories,
  globalSearch = false,
}) {
  const searchLabel = globalSearch ? 'Search' : 'Filter this page';
  const searchPlaceholder = globalSearch
    ? 'Search everything...'
    : 'Filter visible capabilities...';
  return (
    <FilterPanel className="platform-filter-bar">
      <FormField label={searchLabel}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} />
      </FormField>
      <FormField label="CareDroid">
        <select value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}>
          <option value="all">All workspaces</option>
          {CARE_WORKSPACES.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.label}
            </option>
          ))}
        </select>
      </FormField>
      {categories ? (
        <FormField label="Category">
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}
    </FilterPanel>
  );
}

function KnowledgeFacetSelect({ label, value, onChange, options }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/-/g, ' ')}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResultCard({ item, onOpen }) {
  return (
    <InsightCard
      as="button"
      type="button"
      className="platform-result-card"
      eyebrow={item.category || item.type || item.kind}
      title={item.title || item.label || item.name}
      description={item.description || item.body || item.detail}
      meta={item.path}
      onClick={() => onOpen(item)}
      aria-label={`Open ${item.title || item.label || item.name}`}
    />
  );
}

function openSearchResult(item, navigate, launchTool) {
  if (item.tool?.id) {
    launchTool(item.tool);
    return;
  }
  if (item.path) navigate(item.path);
}

export function WorkspacesIndexPage() {
  const { profileNavigate } = useProfileNavigate();
  return (
    <PageShell
      eyebrow="Workspace Architecture"
      title="Workspaces"
      description="Clinical operating-system workspaces filter tools, calculators, dashboards, AI suggestions, maps, notifications, and workflows."
      actions={<Link className="platform-primary-link" to="/workspace/emergency">Open CareDroid</Link>}
    >
      <section className="platform-workspace-grid">
        {CARE_WORKSPACES.map((workspace) => {
          const Icon = getWorkspaceIcon(workspace.icon);
          const summary = workspaceFilterSummary(workspace.id);
          return (
            <button key={workspace.id} type="button" className="platform-workspace-card" onClick={() => profileNavigate(workspace.path)}>
              <NavIcon icon={Icon} size={28} aria-hidden />
              <strong>{workspace.label}</strong>
              <span>{workspace.description}</span>
              <small>
                {summary.tools.length} tools · {summary.calculators.length} calculators · {summary.notifications.length} alerts
              </small>
            </button>
          );
        })}
      </section>
    </PageShell>
  );
}

export function SearchResultsPage() {
  const { profileNavigate } = useProfileNavigate();
  const { recordToolAccess } = useToolPreferences();
  const { user } = useUser();
  const { workspaceState, platformContext, account } = useUserIdentity();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [workspaceId, setWorkspaceId] = useState('all');
  const [category, setCategory] = useState('all');
  const navigationPermissions = useMemo(
    () => [
      ...(workspaceState?.effectivePermissions || []),
      ...(platformContext?.permissions || []),
      ...(account?.permissions || []),
      ...(user?.permissions || []),
    ],
    [account?.permissions, platformContext?.permissions, user?.permissions, workspaceState?.effectivePermissions]
  );
  const results = useMemo(
    () => buildSearchFirstResults({ query, workspaceId, category, navigationPermissions }),
    [category, navigationPermissions, query, workspaceId]
  );
  const visibleResults = useMemo(
    () => (query.trim() ? results : results.slice(0, MAX_VISIBLE_SEARCH_RESULTS)),
    [query, results]
  );
  const launchTool = (tool) =>
    applyRegistryToolLaunch(tool.id, { navigate: profileNavigate, recordToolAccess, replace: false });

  return (
    <PageShell eyebrow="Search Everything" title="Global Search" description="Search assets, tools, calculators, workflows, simulations, protocols, AI agents, operations, workspaces, dashboards, maps, notifications, devices, rooms, and fleet assets.">
      <DataSourceNotice
        label="Local Search Demo"
        detail="Results are assembled from the frontend platform inventory until the backend SearchService is exposed by a controller."
      />
      <FilterBar
        query={query}
        setQuery={setQuery}
        workspaceId={workspaceId}
        setWorkspaceId={setWorkspaceId}
        category={category}
        setCategory={setCategory}
        categories={['workspace', 'asset', 'tool', 'calculator', 'workflow', 'automation', 'simulation', 'protocol', 'ai-agent', 'ai-model', 'operation', 'destination', 'dashboard', 'map', 'notification', 'document', 'admin', 'library']}
        globalSearch
      />
      <section className="platform-result-grid" aria-label="Search results">
        {visibleResults.map((item) => (
          <ResultCard key={item.id} item={item} onOpen={(result) => openSearchResult(result, profileNavigate, launchTool)} />
        ))}
      </section>
      {results.length > visibleResults.length ? (
        <p className="platform-muted-copy" role="status">
          Showing top {visibleResults.length} of {results.length} results. Refine search to reveal more.
        </p>
      ) : null}
    </PageShell>
  );
}

export function HealthcareKnowledgeHubPage() {
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [role, setRole] = useState('all');
  const [workspace, setWorkspace] = useState('all');
  const [department, setDepartment] = useState('all');
  const hub = useMemo(
    () => buildHealthcareKnowledgeHub({ query, specialty, role, workspace, department }),
    [department, query, role, specialty, workspace],
  );

  return (
    <PageShell
      eyebrow="Healthcare Knowledge Hub"
      title="Knowledge Hub"
      description="Search protocols, pathways, calculators, simulations, AI guidance, and documentation by specialty, role, workspace, and department."
    >
      <DataSourceNotice
        label="Centralized knowledge index"
        detail="Knowledge items are normalized across clinical, operational, AI, training, and documentation surfaces so users can discover the right next action."
      />

      <section className="platform-kpi-grid" aria-label="Knowledge hub summary">
        <article>
          <span>Knowledge items</span>
          <strong>{hub.summary.totalItems}</strong>
        </article>
        <article>
          <span>Visible results</span>
          <strong>{hub.summary.resultCount}</strong>
        </article>
        <article>
          <span>Categories</span>
          <strong>{hub.summary.representedTypeCount}</strong>
        </article>
        <article>
          <span>Search facets</span>
          <strong>4</strong>
        </article>
      </section>

      <section className="platform-filter-bar" aria-label="Knowledge hub filters">
        <label>
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search knowledge..."
          />
        </label>
        <KnowledgeFacetSelect label="Specialty" value={specialty} onChange={setSpecialty} options={hub.facets.specialties} />
        <KnowledgeFacetSelect label="Role" value={role} onChange={setRole} options={hub.facets.roles} />
        <KnowledgeFacetSelect label="CareDroid" value={workspace} onChange={setWorkspace} options={hub.facets.workspaces} />
        <KnowledgeFacetSelect label="Department" value={department} onChange={setDepartment} options={hub.facets.departments} />
      </section>

      <section className="platform-result-grid" aria-label="Knowledge categories">
        {hub.types.map((type) => (
          <article key={type} className="platform-result-card platform-result-card--static">
            <span className="platform-result-card__kind">category</span>
            <strong>{type.replace(/_/g, ' ')}</strong>
            <span>{hub.typeCounts[type]} matching items</span>
          </article>
        ))}
      </section>

      <section className="platform-result-grid" aria-label="Knowledge hub results">
        {hub.results.map((item) => (
          <article key={item.id} className="platform-result-card platform-result-card--static">
            <span className="platform-result-card__kind">{item.type.replace(/_/g, ' ')}</span>
            <strong>{item.title}</strong>
            <span>{item.description}</span>
            <small>{item.route}</small>
            <small>
              {item.specialties.join(', ')} · {item.roles.join(', ')}
            </small>
            <small>
              {item.workspaces.join(', ')} · {item.departments.join(', ')}
            </small>
          </article>
        ))}
        {!hub.results.length ? (
          <article className="platform-result-card platform-result-card--static">
            <span className="platform-result-card__kind">empty</span>
            <strong>No matching knowledge found</strong>
            <span>Adjust specialty, role, workspace, department, or search text.</span>
          </article>
        ) : null}
      </section>
    </PageShell>
  );
}

export function ClinicalTimelinePage() {
  const [query, setQuery] = useState('');
  const [workspaceId, setWorkspaceId] = useState('all');
  const [kind, setKind] = useState('all');
  const events = useMemo(() => {
    let items = filterByWorkspace(PLATFORM_TIMELINE_EVENTS, workspaceId);
    if (kind !== 'all') items = items.filter((event) => event.kind === kind);
    return [...filterText(items, query)].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [kind, query, workspaceId]);

  const exportTimeline = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'caredroid-clinical-timeline.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell eyebrow="Unified Clinical Timeline" title="Timeline" description="A single view of calculator runs, AI actions, telemetry, fleet activity, workflows, audit events, and alerts." actions={<button type="button" className="platform-secondary-button" onClick={exportTimeline}>Export JSON</button>}>
      <DataSourceNotice
        label="Local Timeline Demo"
        detail="Events are demo records from the frontend platform model until TimelineService is exposed through a backend endpoint."
      />
      <FilterBar query={query} setQuery={setQuery} workspaceId={workspaceId} setWorkspaceId={setWorkspaceId} category={kind} setCategory={setKind} categories={['calculator', 'ai', 'device', 'telemetry', 'fleet', 'workflow', 'audit', 'alert']} />
      <ol className="platform-timeline-list">
        {events.map((event) => (
          <li key={event.id}>
            <span>{event.kind}</span>
            <strong>{event.title}</strong>
            <p>{event.detail}</p>
            <time>{new Date(event.timestamp).toLocaleString()}</time>
          </li>
        ))}
      </ol>
    </PageShell>
  );
}

export function NotificationCenterPage() {
  const notificationContext = useNotifications();
  const [query, setQuery] = useState('');
  const [workspaceId, setWorkspaceId] = useState('all');
  const [filter, setFilter] = useState('all');
  const contextNotifications = (notificationContext.notifications || []).map((notification) => ({
    ...notification,
    title: notification.title || notification.message || 'Notification',
    body: notification.message || notification.body || notification.description,
    priority: notification.priority || notification.type || 'medium',
    workspaceIds: notification.workspaceIds || ['clinical'],
  }));
  const notifications = useMemo(() => {
    let items = [...PLATFORM_NOTIFICATIONS, ...contextNotifications];
    items = filterByWorkspace(items, workspaceId);
    if (filter === 'unread') items = items.filter((item) => !item.read);
    if (filter === 'read') items = items.filter((item) => item.read);
    if (filter === 'archived') items = items.filter((item) => item.archived);
    if (filter !== 'all' && !['read', 'unread', 'archived'].includes(filter)) {
      items = items.filter((item) => item.priority === filter || item.type === filter);
    }
    return filterText(items, query).sort(
      (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
    );
  }, [contextNotifications, filter, query, workspaceId]);

  return (
    <PageShell eyebrow="Operational Inbox" title="Notification Center" description="AI, telemetry, fleet, maintenance, workflow, and governance notifications grouped by priority and workspace.">
      <FilterBar query={query} setQuery={setQuery} workspaceId={workspaceId} setWorkspaceId={setWorkspaceId} category={filter} setCategory={setFilter} categories={['unread', 'read', 'critical', 'high', 'medium', 'low', 'ai', 'telemetry', 'fleet', 'maintenance', 'workflow', 'governance']} />
      <section className="platform-notification-list">
        {notifications.map((notification) => (
          <article key={notification.id} className={`platform-notification platform-notification--${notification.priority}`}>
            <div>
              <span>{notification.type}</span>
              <strong>{notification.title}</strong>
              <p>{notification.body}</p>
            </div>
            <div className="platform-notification__actions">
              <small>{notification.read ? 'Read' : 'Unread'} · {notification.priority}</small>
              {!notification.read && notificationContext.markAsRead ? (
                <button type="button" onClick={() => notificationContext.markAsRead(notification.id)}>Mark read</button>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </PageShell>
  );
}

export function DigitalTwinPage() {
  const { organization } = useUserIdentity();
  const [twin, setTwin] = useState(() => buildDigitalTwinSnapshot());

  useEffect(() => {
    PlatformAssetsApi.getDigitalTwin(organization?.id)
      .then(setTwin)
      .catch(() => setTwin(buildDigitalTwinSnapshot()));
  }, [organization?.id]);
  const detailRoutes = [
    { label: 'Hospital Map', path: '/hospital-map', description: 'Floors, rooms, beds, and alerts.' },
    { label: 'Medical IoT', path: '/medical-iot', description: 'Telemetry, devices, stale signals, and warnings.' },
    { label: 'Device Fleet', path: '/devices', description: 'Inventory, maintenance, calibration, and assignment details.' },
    { label: 'Fleet Map', path: '/fleet/map', description: 'Vehicle positions, ETAs, route lines, and transport status.' },
    { label: 'Live Map', path: '/live-map', description: 'Unified live tracking across operational signals.' },
  ];
  return (
    <PageShell eyebrow="Operations Aggregate" title="Digital Twin" description="Aggregate operations dashboard for floors, rooms, beds, assets, devices, telemetry, occupancy, staffing, fleet, and alerts.">
      <section className="platform-kpi-grid">
        <article><span>Total beds</span><strong>{twin.occupancy.totalBeds}</strong></article>
        <article><span>Occupied</span><strong>{twin.occupancy.occupiedBeds}</strong></article>
        <article><span>Critical beds</span><strong>{twin.occupancy.criticalBeds}</strong></article>
        <article><span>Staffing</span><strong>{twin.occupancy.staffingRatio}</strong></article>
      </section>
      <p className="platform-source-label">{twin.sourceLabel}</p>
      <section className="platform-detail-links" aria-labelledby="operations-detail-routes-title">
        <div>
          <p className="platform-os-eyebrow">Detail Pages</p>
          <h2 id="operations-detail-routes-title">Open operational detail views</h2>
          <p>Digital Twin is the aggregate. These pages provide focused map, telemetry, device, and fleet detail.</p>
        </div>
        <div className="platform-detail-link-grid">
          {detailRoutes.map((route) => (
            <Link key={route.path} to={route.path} className="platform-detail-link">
              <strong>{route.label}</strong>
              <span>{route.description}</span>
              <small>{route.path}</small>
            </Link>
          ))}
        </div>
      </section>
      <section className="platform-twin-layout">
        <div className="platform-twin-map" aria-label="Occupancy heatmap">
          {twin.floors.map((floor) => (
            <article key={floor.id} style={{ '--heat': floor.occupancy }}>
              <strong>{floor.label}</strong>
              <span>{Math.round(floor.occupancy * 100)}% occupied</span>
              <small>{floor.alerts} alerts · {floor.devices} devices · staffing {floor.staffing}</small>
            </article>
          ))}
        </div>
        <div className="platform-twin-detail">
          {twin.rooms.map((room) => (
            <article key={room.id}>
              <strong>{room.label} · {room.bed}</strong>
              <span>{room.patientState}</span>
              <small>{room.telemetry} · {room.device} · {room.fleet}</small>
            </article>
          ))}
          {twin.fleet.map((vehicle) => (
            <article key={vehicle.id}>
              <strong>{vehicle.label}</strong>
              <span>{vehicle.status} · ETA {vehicle.eta}</span>
              <small>{vehicle.alert}</small>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

export function WorkflowBuilderPage() {
  const { profileNavigate } = useProfileNavigate();
  const [searchParams] = useSearchParams();
  const requestedWorkflowId = searchParams.get('workflow');
  const initialWorkflowId = PLATFORM_WORKFLOWS.some((item) => item.id === requestedWorkflowId)
    ? requestedWorkflowId
    : PLATFORM_WORKFLOWS[0].id;
  const [selectedId, setSelectedId] = useState(initialWorkflowId);
  const [draftName, setDraftName] = useState('');
  const [completionStatus, setCompletionStatus] = useState('');
  const [completionResult, setCompletionResult] = useState(null);
  const workflow = PLATFORM_WORKFLOWS.find((item) => item.id === selectedId) || PLATFORM_WORKFLOWS[0];
  useEffect(() => {
    setCompletionStatus('');
    setCompletionResult(null);
  }, [selectedId]);
  useEffect(() => {
    if (requestedWorkflowId && PLATFORM_WORKFLOWS.some((item) => item.id === requestedWorkflowId)) {
      setSelectedId(requestedWorkflowId);
    }
  }, [requestedWorkflowId]);
  const launchBlock = (block) => {
    if (block.path) profileNavigate(block.path);
    if (block.toolId) applyRegistryToolLaunch(block.toolId, { navigate: profileNavigate, replace: false });
  };
  const completeWorkflow = () => {
    recordWorkflowCompletion({
      workflowId: workflow.id,
      assetId: workflow.id,
      route: '/workflows',
      source: 'workflow-builder',
      blockCount: workflow.blocks.length,
    });
    setCompletionStatus(`${workflow.name} completion recorded.`);
    setCompletionResult({
      title: `${workflow.name} Result`,
      summary: workflow.resultSummary || `${workflow.name} completed. Review the result and choose the next action.`,
      actions: workflow.recommendedNextActions || [],
    });
  };

  return (
    <PageShell eyebrow="Workflow Builder" title="Workflows" description="Preview demo workflow chains using calculators, AI prompts, dashboards, tools, and maps as blocks. Save and AI-generation require a backend workflow service before they execute.">
      <DataSourceNotice
        label="Workflow demo preview"
        detail="Saved workflow examples are frontend fixtures. Save draft and AI-generate are disabled until a durable workflow API exists."
      />
      <section className="platform-workflow-layout">
        <div className="platform-panel">
          <label>
            <span>Saved workflow</span>
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {PLATFORM_WORKFLOWS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span>Create workflow</span>
            <input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="New workflow name" />
          </label>
          <button type="button" className="platform-secondary-button" disabled title="Requires durable workflow API">
            Save workflow draft (demo disabled)
          </button>
          <button type="button" className="platform-secondary-button" disabled title="Requires workflow generation API">
            AI-generate workflow (demo disabled)
          </button>
          <button type="button" className="platform-secondary-button" onClick={completeWorkflow}>
            Mark workflow complete
          </button>
          {completionStatus ? <p className="platform-muted">{completionStatus}</p> : null}
        </div>
        <div className="platform-workflow-chain">
          <h2>{draftName || workflow.name}</h2>
          <p>{workflow.description}</p>
          <p className="platform-muted">Execution mode: {workflow.executionMode}. Blocks can open existing tools, but this workflow is not saved, queued, or scheduled.</p>
          {workflow.blocks.map((block, index) => (
            <button key={block.id} type="button" onClick={() => launchBlock(block)}>
              <span>{index + 1}</span>
              <strong>{block.label}</strong>
              <small>{block.type}</small>
            </button>
          ))}
        </div>
      </section>
      {completionResult ? (
        <section className="platform-result-grid" aria-label="Workflow result and next actions">
          <article className="platform-result-card platform-result-card--static">
            <span className="platform-result-card__kind">workflow result</span>
            <strong>{completionResult.title}</strong>
            <span>{completionResult.summary}</span>
            <small>Result is connected to Timeline, Recommendations, and Assistant.</small>
          </article>
          {completionResult.actions.map((action) => (
            <Link
              key={action.path || action.label}
              className="platform-result-card"
              to={action.path}
              aria-label={action.label}
            >
              <span className="platform-result-card__kind">next action</span>
              <strong>{action.label}</strong>
              <span>Continue from this workflow result without losing context.</span>
            </Link>
          ))}
        </section>
      ) : null}
    </PageShell>
  );
}

export function DepartmentIntelligencePage() {
  const model = useMemo(() => buildDepartmentPerformanceIntelligence(), []);

  return (
    <PageShell
      eyebrow="Department Performance Intelligence"
      title="Department Intelligence"
      description="Department health scores and measurable platform outcomes for clinical, diagnostic, and operational leaders."
    >
      <DataSourceNotice
        label="Outcome intelligence model"
        detail="Scores are privacy-safe aggregate outcomes from workflow, calculator, simulation, turnaround, interpretation, uptime, and maintenance signals."
      />
      <section className="platform-kpi-grid" aria-label="Department intelligence summary">
        <article>
          <span>Departments</span>
          <strong>{model.summary.departmentCount}</strong>
        </article>
        <article>
          <span>Avg health score</span>
          <strong>{model.summary.averageHealthScore}</strong>
        </article>
        <article>
          <span>Measurable outcomes</span>
          <strong>{model.summary.measurableOutcomeCount}</strong>
        </article>
        <article>
          <span>Attention departments</span>
          <strong>{model.summary.attentionDepartmentCount}</strong>
        </article>
      </section>

      <section className="platform-result-grid" aria-label="Department health scores">
        {model.departments.map((department) => (
          <article key={department.id} className="platform-result-card platform-result-card--static">
            <span className="platform-result-card__kind">{department.healthBand.label}</span>
            <strong>{department.name}</strong>
            <span>{department.description}</span>
            <small>Department Health Score: {department.healthScore}</small>
            <small>{department.measurableOutcomeCount} measurable platform outcomes</small>
          </article>
        ))}
      </section>

      <section className="platform-workflow-layout" aria-label="Department outcome metrics">
        {model.departments.map((department) => (
          <article key={department.id} className="platform-panel">
            <p className="platform-os-eyebrow">{department.healthBand.label}</p>
            <h2>{department.name}</h2>
            <p className="platform-muted">Department Health Score: {department.healthScore}</p>
            <div className="platform-notification-list">
              {department.metrics.map((metric) => (
                <div key={metric.id} className="platform-notification">
                  <div>
                    <span>{metric.source}</span>
                    <strong>{metric.label}</strong>
                    <p>
                      {metric.value} against target {metric.target}
                    </p>
                  </div>
                  <div className="platform-notification__actions">
                    <small>{metric.trend}</small>
                    <strong>{metric.score}</strong>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </PageShell>
  );
}

export function WorkflowMiningEnginePage() {
  const report = useMemo(() => buildWorkflowMiningReport(), []);
  const signalLabels = {
    page_transition: 'Page transitions',
    ai_launch: 'AI launches',
    workflow_launch: 'Workflow launches',
    tool_usage: 'Tool usage',
    search_behavior: 'Search behavior',
  };

  return (
    <PageShell
      eyebrow="Workflow Mining Engine"
      title="Workflow Mining"
      description="Mined journey evidence for page transitions, AI launches, workflow launches, tool usage, and search behavior."
    >
      <DataSourceNotice
        label="Behavioral journey model"
        detail="Journeys are aggregate, privacy-safe behavioral patterns until the backend workflow-mining event stream is exposed."
      />
      <section className="platform-kpi-grid" aria-label="Workflow mining summary">
        <article>
          <span>Journeys</span>
          <strong>{report.summary.journeyCount}</strong>
        </article>
        <article>
          <span>Events analyzed</span>
          <strong>{report.summary.eventCount}</strong>
        </article>
        <article>
          <span>Friction signals</span>
          <strong>{report.summary.frictionCount}</strong>
        </article>
        <article>
          <span>Unnecessary clicks</span>
          <strong>{report.summary.unnecessaryClickCount}</strong>
        </article>
      </section>

      <section className="platform-result-grid" aria-label="Workflow mining signals">
        {report.signalTypes.map((type) => (
          <article key={type} className="platform-result-card platform-result-card--static">
            <span className="platform-result-card__kind">signal</span>
            <strong>{signalLabels[type]}</strong>
            <span>{report.signalCounts[type]} observed journey events</span>
            <small>{type}</small>
          </article>
        ))}
      </section>

      <section className="platform-workflow-layout" aria-label="Most common user journeys">
        <article className="platform-panel">
          <h2>Most Common User Journeys</h2>
          <div className="platform-notification-list">
            {report.mostCommonUserJourneys.map((journey, index) => (
              <div key={journey.id} className="platform-notification">
                <div>
                  <span>rank #{index + 1}</span>
                  <strong>{journey.title}</strong>
                  <p>{journey.steps.join(' -> ')}</p>
                  <small>{journey.frequency} journeys · {journey.completionRate}% completion</small>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="platform-panel">
          <h2>Evidence-based UX improvements</h2>
          <div className="platform-notification-list">
            {report.recommendations.map((item) => (
              <div key={`${item.journeyId}-${item.recommendation}`} className="platform-notification">
                <div>
                  <span>{item.journeyTitle}</span>
                  <strong>{item.recommendation}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="platform-workflow-layout" aria-label="Workflow mining findings">
        <article className="platform-panel">
          <h2>Friction and dead ends</h2>
          <div className="platform-notification-list">
            {[...report.friction, ...report.deadEnds].map((item) => (
              <div key={`${item.journeyId}-${item.signal}`} className="platform-notification">
                <div>
                  <span>{item.journeyTitle}</span>
                  <strong>{item.signal}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="platform-panel">
          <h2>Unnecessary clicks</h2>
          <div className="platform-notification-list">
            {report.unnecessaryClicks.map((item) => (
              <div key={`${item.journeyId}-${item.signal}`} className="platform-notification">
                <div>
                  <span>{item.journeyTitle}</span>
                  <strong>{item.signal}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PageShell>
  );
}

export function CareDroidBusinessBrainPage() {
  const brain = useMemo(() => buildCareDroidBusinessBrain(), []);

  return (
    <PageShell
      eyebrow="CareDroid Business Brain"
      title="Business Brain"
      description="Business intelligence across SaaS, organization, workspace, asset, AI, automation, and simulation analytics."
    >
      <DataSourceNotice
        label="Business intelligence layer"
        detail="Aggregates platform operations and business operations into advisory recommendations for product, customer-success, clinical education, and commercial teams."
      />

      <section className="platform-kpi-grid" aria-label="Business brain summary">
        <article>
          <span>Analytics domains</span>
          <strong>{brain.summary.analyticDomainCount}</strong>
        </article>
        <article>
          <span>Recommendations</span>
          <strong>{brain.summary.recommendationCount}</strong>
        </article>
        <article>
          <span>High priority</span>
          <strong>{brain.summary.highPriorityCount}</strong>
        </article>
        <article>
          <span>Business score</span>
          <strong>{brain.summary.averageBusinessScore}</strong>
        </article>
      </section>

      <section className="platform-result-grid" aria-label="Business analytics aggregates">
        {brain.analytics.map((domain) => (
          <article key={domain.id} className="platform-result-card platform-result-card--static">
            <span className="platform-result-card__kind">{domain.domain.replace(/_/g, ' ')}</span>
            <strong>{domain.label}</strong>
            <span>Score: {domain.score}</span>
            <small>{domain.metrics.join(' · ')}</small>
          </article>
        ))}
      </section>

      <section className="platform-workflow-layout" aria-label="Business brain recommendations">
        <article className="platform-panel">
          <h2>Recommendations</h2>
          <div className="platform-notification-list">
            {brain.recommendations.map((item) => (
              <div key={item.id} className="platform-notification">
                <div>
                  <span>{item.type.replace(/_/g, ' ')} · {item.priority}</span>
                  <strong>{item.title}</strong>
                  <p>{item.action}</p>
                  <small>{item.evidence.join(' · ')}</small>
                </div>
                <div className="platform-notification__actions">
                  <small>score</small>
                  <strong>{item.score}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="platform-panel">
          <h2>Owners</h2>
          <div className="platform-notification-list">
            {brain.recommendations.map((item) => (
              <div key={`${item.id}-owners`} className="platform-notification">
                <div>
                  <span>{item.title}</span>
                  <strong>{item.owners.join(', ')}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PageShell>
  );
}

export function WorkspaceDependencyGraphPage() {
  const graph = useMemo(() => buildWorkspaceDependencyGraph(), []);

  return (
    <PageShell
      eyebrow="Cross-Workspace Intelligence"
      title="Workspace Dependency Graph"
      description="Map handoffs, signal flows, and operational dependencies so workspaces stop operating as isolated silos."
    >
      <DataSourceNotice
        label="Workspace graph model"
        detail="Dependencies are generated from canonical workspace definitions and evidence-backed relationship rules."
      />
      <section className="platform-kpi-grid" aria-label="Workspace dependency summary">
        <article>
          <span>Workspaces</span>
          <strong>{graph.summary.workspaceCount}</strong>
        </article>
        <article>
          <span>Dependencies</span>
          <strong>{graph.summary.dependencyCount}</strong>
        </article>
        <article>
          <span>High strength</span>
          <strong>{graph.summary.highStrengthDependencyCount}</strong>
        </article>
        <article>
          <span>Chains</span>
          <strong>{graph.summary.chainCount}</strong>
        </article>
      </section>

      <section className="platform-result-grid" aria-label="Workspace nodes">
        {graph.nodes.map((node) => (
          <article key={node.id} className="platform-result-card platform-result-card--static">
            <span className="platform-result-card__kind">{node.type}</span>
            <strong>{node.label}</strong>
            <span>{node.description}</span>
            <small>Outcome focus: {node.outcomeFocus}</small>
            <small>{node.primarySignals.join(', ')}</small>
          </article>
        ))}
      </section>

      <section className="platform-workflow-layout" aria-label="Workspace dependency chains">
        <article className="platform-panel">
          <h2>Dependency chains</h2>
          <div className="platform-notification-list">
            {graph.chains.map((chain) => (
              <div key={chain.id} className="platform-notification">
                <div>
                  <span>chain</span>
                  <strong>{chain.label}</strong>
                  <p>{chain.edgeIds.length} dependency edge{chain.edgeIds.length === 1 ? '' : 's'}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="platform-panel">
          <h2>Relationship evidence</h2>
          <div className="platform-notification-list">
            {graph.edges.map((edge) => (
              <div key={edge.id} className="platform-notification">
                <div>
                  <span>{edge.type}</span>
                  <strong>
                    {`${edge.sourceLabel} -> ${edge.targetLabel}`}
                  </strong>
                  <p>{edge.outcome}</p>
                  <small>{edge.evidence.join(' · ')}</small>
                </div>
                <div className="platform-notification__actions">
                  <small>strength</small>
                  <strong>{edge.strength}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PageShell>
  );
}

export function AssetLibraryPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const assets = useMemo(() => {
    let items = buildAssetInventoryProjection();
    if (!items.length) items = buildAssetRegistry();
    if (type !== 'all') {
      items = items.filter(
        (asset) => asset.assetType === type || asset.type === type || asset.status === type
      );
    }
    return filterText(items, query);
  }, [query, type]);

  return (
    <PageShell eyebrow="Asset Registry" title="Asset Library" description="Platform assets projected from entitlements and tool inventory, with legacy artifact fallback.">
      <DataSourceNotice
        label="Platform asset projection"
        detail="Assets merge backend entitlements with canonical tool inventory. Legacy artifacts remain as fallback."
      />
      <FilterBar query={query} setQuery={setQuery} workspaceId="all" setWorkspaceId={() => {}} category={type} setCategory={setType} categories={['calculator', 'workflow', 'prompt', 'dashboard', 'template', 'protocol', 'telemetry_schema', 'map', 'ai_output', 'referenced', 'orphan-risk']} />
      <section className="platform-result-grid">
        {assets.map((asset) => (
          <article key={asset.id} className="platform-result-card platform-result-card--static">
            <span className="platform-result-card__kind">{asset.assetType || asset.type}</span>
            <strong>{asset.title}</strong>
            <span>{asset.description || asset.category}</span>
            <small>
              {asset.lifecycle || asset.status} · {asset.execution?.label || asset.demoStatus || 'Mounted'}
              {asset.entitled === false ? ' · not entitled' : ''}
            </small>
            <small>
              {(asset.productIds || []).slice(0, 2).join(', ') || 'core product'} ·{' '}
              {(asset.packIds || []).slice(0, 2).join(', ') || 'core-platform'}
            </small>
          </article>
        ))}
      </section>
    </PageShell>
  );
}

export function AdaptiveDashboardPanel() {
  const { user } = useUser();
  const { recentTools, favorites } = useToolPreferences();
  const workspace = getCareWorkspaceForUser(user);
  const model = buildCareWorkspaceModel(workspace.id);
  return (
    <section className="platform-adaptive-panel" aria-labelledby="adaptive-dashboard-title">
      <div>
        <p className="platform-os-eyebrow">Adaptive Dashboard</p>
        <h2 id="adaptive-dashboard-title">{workspace.label} command center</h2>
        <p>
          Personalized by role {user?.role || 'clinician'}, workspace, recent activity, favorites, and AI recommendations.
        </p>
      </div>
      <div className="platform-adaptive-grid">
        <Link to="/assistant">AI Assistant</Link>
        <Link to="/notifications">Notifications</Link>
        <Link to="/digital-twin">Hospital Status</Link>
        <Link to="/system-health">System Health</Link>
        {model.toolEntries.slice(0, 4).map((tool) => (
          <Link key={tool.id} to={tool.path || '/tools'}>{tool.name}</Link>
        ))}
      </div>
      <p className="platform-adaptive-meta">
        Recent: {recentTools.length} · Favorites: {favorites.length}
      </p>
    </section>
  );
}

function getCareWorkspaceForUser(user) {
  if (user?.role === 'admin') return CARE_WORKSPACES.find((workspace) => workspace.id === 'admin');
  if (/emergency|ed|critical/i.test(user?.specialty || user?.role || '')) {
    return CARE_WORKSPACES.find((workspace) => workspace.id === 'emergency');
  }
  return CARE_WORKSPACES[0];
}
