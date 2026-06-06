import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  buildGlobalSearchResults,
  filterByWorkspace,
  filterText,
  workspaceFilterSummary,
} from '../data/platformOperatingSystem';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import { PlatformAssetsApi } from '../services/platformAssetsApi';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { buildAssetInventoryProjection } from '../data/assetInventory';
import { NavIcon } from '../navigation/NavIcon';
import { getWorkspaceIcon } from '../navigation/iconRegistry';
import './PlatformOSPages.css';

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function PageShell({ eyebrow, title, description, children, actions = null }) {
  return (
    <main className="platform-os-page">
      <header className="platform-os-hero">
        <div>
          <p className="platform-os-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions ? <div className="platform-os-actions">{actions}</div> : null}
      </header>
      {children}
    </main>
  );
}

function DataSourceNotice({ label, detail }) {
  return (
    <aside className="platform-source-notice" role="note">
      <strong>{label}</strong>
      <span>{detail}</span>
    </aside>
  );
}

function FilterBar({ query, setQuery, workspaceId, setWorkspaceId, category, setCategory, categories }) {
  return (
    <section className="platform-filter-bar" aria-label="Filters">
      <label>
        <span>Search</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search everything..." />
      </label>
      <label>
        <span>Workspace</span>
        <select value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}>
          <option value="all">All workspaces</option>
          {CARE_WORKSPACES.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.label}
            </option>
          ))}
        </select>
      </label>
      {categories ? (
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </section>
  );
}

function ResultCard({ item, onOpen }) {
  return (
    <button type="button" className="platform-result-card" onClick={() => onOpen(item)} aria-label={`Open ${item.title || item.label || item.name}`}>
      <span className="platform-result-card__kind">{item.category || item.type || item.kind}</span>
      <strong>{item.title || item.label || item.name}</strong>
      <span>{item.description || item.body || item.detail}</span>
      {item.path ? <small>{item.path}</small> : null}
    </button>
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
  const navigate = useNavigate();
  return (
    <PageShell
      eyebrow="Workspace Architecture"
      title="Workspaces"
      description="Clinical operating-system workspaces filter tools, calculators, dashboards, AI suggestions, maps, notifications, and workflows."
      actions={<Link className="platform-primary-link" to="/workspace/clinical">Open Clinical Workspace</Link>}
    >
      <section className="platform-workspace-grid">
        {CARE_WORKSPACES.map((workspace) => {
          const Icon = getWorkspaceIcon(workspace.icon);
          const summary = workspaceFilterSummary(workspace.id);
          return (
            <button key={workspace.id} type="button" className="platform-workspace-card" onClick={() => navigate(workspace.path)}>
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
  const navigate = useNavigate();
  const { recordToolAccess } = useToolPreferences();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [workspaceId, setWorkspaceId] = useState('all');
  const [category, setCategory] = useState('all');
  const results = useMemo(
    () => buildGlobalSearchResults({ query, workspaceId, category }),
    [query, workspaceId, category]
  );
  const launchTool = (tool) =>
    applyRegistryToolLaunch(tool.id, { navigate, recordToolAccess, replace: false });

  return (
    <PageShell eyebrow="Search Everything" title="Global Search" description="Search routes, tools, calculators, dashboards, maps, workflows, settings, profile pages, notifications, documents, devices, rooms, and fleet assets.">
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
        categories={['workspace', 'dashboard', 'tool', 'calculator', 'map', 'workflow', 'notification', 'document', 'admin', 'library']}
      />
      <section className="platform-result-grid" aria-label="Search results">
        {results.map((item) => (
          <ResultCard key={item.id} item={item} onOpen={(result) => openSearchResult(result, navigate, launchTool)} />
        ))}
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
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(PLATFORM_WORKFLOWS[0].id);
  const [draftName, setDraftName] = useState('');
  const workflow = PLATFORM_WORKFLOWS.find((item) => item.id === selectedId) || PLATFORM_WORKFLOWS[0];
  const launchBlock = (block) => {
    if (block.path) navigate(block.path);
    if (block.toolId) applyRegistryToolLaunch(block.toolId, { navigate, replace: false });
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
              {asset.lifecycle || asset.status}
              {asset.entitled === false ? ' · not entitled' : ''}
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
