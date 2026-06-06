import { LOCAL_ARTIFACTS } from '../services/artifactsApi';
import { getUserFacingToolRegistryProjection } from './toolInventory';
import {
  CARE_WORKSPACES,
  buildCareWorkspaceModel,
  getCareWorkspaceById,
} from './workspaceArchitecture';

const now = new Date('2026-05-29T20:00:00.000Z');

function minutesAgo(minutes) {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

export const PLATFORM_DASHBOARDS = Object.freeze([
  { id: 'dashboard', label: 'Command Center', path: '/dashboard', category: 'dashboard', workspaceIds: ['emergency', 'icu', 'operations', 'governance'] },
  { id: 'assistant', label: 'AI Assistant', path: '/assistant', category: 'dashboard', workspaceIds: CARE_WORKSPACES.map((workspace) => workspace.id) },
  { id: 'hospital-map', label: 'Hospital Map', path: '/hospital-map', category: 'map', workspaceIds: ['emergency', 'operations', 'medical-iot'] },
  { id: 'medical-iot', label: 'Medical IoT', path: '/medical-iot', category: 'dashboard', workspaceIds: ['medical-iot', 'operations'] },
  { id: 'devices', label: 'Device Fleet', path: '/devices', category: 'dashboard', workspaceIds: ['medical-iot', 'operations'] },
  { id: 'fleet-map', label: 'Fleet Map', path: '/fleet/map', category: 'map', workspaceIds: ['fleet', 'operations'] },
  { id: 'digital-twin', label: 'Hospital Digital Twin', path: '/digital-twin', category: 'dashboard', workspaceIds: ['operations', 'medical-iot', 'fleet'] },
  { id: 'timeline', label: 'Clinical Timeline', path: '/timeline', category: 'dashboard', workspaceIds: ['emergency', 'icu', 'research'] },
  { id: 'workflows', label: 'Workflow Builder', path: '/workflows', category: 'workflow', workspaceIds: ['emergency', 'icu', 'research'] },
  { id: 'search', label: 'Global Search', path: '/search', category: 'search', workspaceIds: CARE_WORKSPACES.map((workspace) => workspace.id) },
  { id: 'assets', label: 'Asset Library', path: '/assets', category: 'library', workspaceIds: ['research', 'governance'] },
  { id: 'system-health', label: 'System Health', path: '/system-health', category: 'admin', workspaceIds: ['governance', 'operations'] },
]);

export const PLATFORM_NOTIFICATIONS = Object.freeze([
  { id: 'n-ai-1', title: 'AI recommendation needs review', body: 'Differential AI flagged sepsis and PE as competing hypotheses.', type: 'ai', priority: 'high', read: false, archived: false, createdAt: minutesAgo(8), workspaceIds: ['icu', 'emergency'] },
  { id: 'n-telemetry-1', title: 'Telemetry stale', body: 'ICU-12 monitor has not reported SpO2 for 14 minutes.', type: 'telemetry', priority: 'critical', read: false, archived: false, createdAt: minutesAgo(14), workspaceIds: ['medical-iot', 'operations', 'emergency'] },
  { id: 'n-fleet-1', title: 'Transport ETA changed', body: 'Ambulance A-12 route delayed by 6 minutes due to diversion.', type: 'fleet', priority: 'medium', read: true, archived: false, createdAt: minutesAgo(22), workspaceIds: ['fleet', 'operations'] },
  { id: 'n-maint-1', title: 'Maintenance reminder', body: 'Telemetry gateway GW-4 is due for calibration today.', type: 'maintenance', priority: 'medium', read: false, archived: false, createdAt: minutesAgo(46), workspaceIds: ['medical-iot', 'governance'] },
  { id: 'n-workflow-1', title: 'Chest pain workflow incomplete', body: 'HEART score completed; ECG Assistant and documentation are pending.', type: 'workflow', priority: 'high', read: false, archived: false, createdAt: minutesAgo(65), workspaceIds: ['cardiology', 'emergency'] },
  { id: 'n-gov-1', title: 'Governance review available', body: 'AI safety policy validation summary is ready for admin review.', type: 'governance', priority: 'low', read: true, archived: false, createdAt: minutesAgo(120), workspaceIds: ['governance', 'research'] },
]);

export const PLATFORM_TIMELINE_EVENTS = Object.freeze([
  { id: 'tl-calc-1', kind: 'calculator', title: 'qSOFA calculated', detail: 'qSOFA score 2; sepsis escalation suggested.', timestamp: minutesAgo(6), workspaceIds: ['emergency', 'icu'] },
  { id: 'tl-ai-1', kind: 'ai', title: 'AI differential updated', detail: 'Assistant generated PE vs sepsis differential with confidence limits.', timestamp: minutesAgo(9), workspaceIds: ['icu', 'research', 'emergency'] },
  { id: 'tl-device-1', kind: 'device', title: 'Bedside monitor signal dropped', detail: 'ICU-12 device reported weak signal and stale SpO2.', timestamp: minutesAgo(14), workspaceIds: ['medical-iot', 'operations'] },
  { id: 'tl-telemetry-1', kind: 'telemetry', title: 'Telemetry alert opened', detail: 'HR 128, SpO2 90%, RR 28; alert priority high.', timestamp: minutesAgo(18), workspaceIds: ['medical-iot', 'emergency'] },
  { id: 'tl-fleet-1', kind: 'fleet', title: 'Fleet route updated', detail: 'Ambulance A-12 reassigned to east bay handoff.', timestamp: minutesAgo(22), workspaceIds: ['fleet', 'operations'] },
  { id: 'tl-workflow-1', kind: 'workflow', title: 'Chest Pain Workflow launched', detail: 'HEART score block completed; ECG assistant pending.', timestamp: minutesAgo(34), workspaceIds: ['cardiology', 'emergency'] },
  { id: 'tl-audit-1', kind: 'audit', title: 'Explainability trace viewed', detail: 'Reasoning summary and cited sources reviewed.', timestamp: minutesAgo(44), workspaceIds: ['research', 'governance'] },
  { id: 'tl-alert-1', kind: 'alert', title: 'Rapid response alert acknowledged', detail: 'Alert marked read by Demo Clinician.', timestamp: minutesAgo(53), workspaceIds: ['emergency', 'operations'] },
]);

export const PLATFORM_WORKFLOWS = Object.freeze([
  {
    id: 'chest-pain',
    name: 'Chest Pain Workflow',
    executionMode: 'demo-preview',
    description: 'HEART, ECG Assistant, ACS Assistant, and documentation in sequence.',
    workspaceIds: ['cardiology', 'emergency'],
    blocks: [
      { id: 'heart', type: 'calculator', label: 'HEART', toolId: 'heart-score' },
      { id: 'ecg', type: 'ai-prompt', label: 'ECG Assistant', toolId: 'ecg-interpretation-assistant' },
      { id: 'acs', type: 'tool', label: 'ACS Assistant', toolId: 'acs-workflow-assistant' },
      { id: 'doc', type: 'tool', label: 'Documentation', toolId: 'ambient-scribe' },
    ],
  },
  {
    id: 'sepsis-escalation',
    name: 'Sepsis Escalation Workflow',
    executionMode: 'demo-preview',
    description: 'qSOFA, NEWS2, SOFA, antibiotics, fluids, reassessment, and handoff.',
    workspaceIds: ['emergency', 'icu'],
    blocks: [
      { id: 'qsofa', type: 'calculator', label: 'qSOFA', toolId: 'qsofa' },
      { id: 'news2', type: 'calculator', label: 'NEWS2', toolId: 'news2' },
      { id: 'sofa', type: 'calculator', label: 'SOFA', toolId: 'sofa-score' },
      { id: 'handoff', type: 'ai-prompt', label: 'Handoff summary', toolId: 'patient-summary-ai' },
    ],
  },
  {
    id: 'device-maintenance',
    name: 'Device Maintenance Workflow',
    executionMode: 'demo-preview',
    description: 'Telemetry alert, device detail, maintenance note, and assignment review.',
    workspaceIds: ['medical-iot', 'operations', 'governance'],
    blocks: [
      { id: 'telemetry', type: 'dashboard', label: 'Telemetry', path: '/medical-iot' },
      { id: 'device', type: 'dashboard', label: 'Device Fleet', path: '/devices' },
      { id: 'maintenance', type: 'tool', label: 'Maintenance', toolId: 'device-maintenance' },
    ],
  },
]);

export function filterByWorkspace(items, workspaceId) {
  if (!workspaceId || workspaceId === 'all') return items;
  return items.filter((item) => (item.workspaceIds || []).includes(workspaceId));
}

export function filterText(items, query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) =>
    [
      item.id,
      item.name,
      item.label,
      item.title,
      item.description,
      item.body,
      item.detail,
      item.type,
      item.kind,
      item.category,
      item.priority,
      item.path,
      ...(item.tags || []),
      ...(item.blocks || []).map((block) => block.label || block.toolId || block.path),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalized)
  );
}

export function buildGlobalSearchResults({ query = '', workspaceId = 'all', category = 'all' } = {}) {
  const workspaceItems = CARE_WORKSPACES.map((workspace) => ({
    id: `workspace:${workspace.id}`,
    sourceId: workspace.id,
    title: `${workspace.label} Workspace`,
    description: workspace.description,
    category: 'workspace',
    path: workspace.path,
    workspaceIds: [workspace.id],
  }));
  const toolItems = getUserFacingToolRegistryProjection().map((tool) => ({
    id: `tool:${tool.id}`,
    sourceId: tool.id,
    title: tool.name,
    description: tool.description,
    category: tool.category === 'Calculator' ? 'calculator' : 'tool',
    path: tool.path,
    tool,
    workspaceIds: CARE_WORKSPACES.filter((workspace) =>
      buildCareWorkspaceModel(workspace.id).toolEntries.some((entry) => entry.id === tool.id)
    ).map((workspace) => workspace.id),
  }));
  const dashboardItems = PLATFORM_DASHBOARDS.map((dashboard) => ({
    ...dashboard,
    title: dashboard.label,
  }));
  const notificationItems = PLATFORM_NOTIFICATIONS.map((notification) => ({
    ...notification,
    title: notification.title,
    category: 'notification',
  }));
  const workflowItems = PLATFORM_WORKFLOWS.map((workflow) => ({
    ...workflow,
    title: workflow.name,
    category: 'workflow',
    path: `/workflows?workflow=${workflow.id}`,
  }));
  const assetItems = LOCAL_ARTIFACTS.map((asset) => ({
    id: `asset:${asset.id}`,
    sourceId: asset.id,
    title: asset.title,
    description: asset.description,
    category: 'document',
    type: asset.type,
    tags: asset.tags,
    path: `/assets?asset=${asset.id}`,
    workspaceIds: asset.tags?.includes('medical-iot')
      ? ['medical-iot', 'operations']
      : asset.tags?.includes('emergency')
        ? ['emergency', 'icu']
        : ['research', 'governance'],
  }));

  let results = [
    ...workspaceItems,
    ...dashboardItems,
    ...toolItems,
    ...notificationItems,
    ...workflowItems,
    ...assetItems,
  ];
  results = filterByWorkspace(results, workspaceId);
  if (category !== 'all') results = results.filter((item) => item.category === category || item.type === category);
  return filterText(results, query).sort((a, b) => String(a.title).localeCompare(String(b.title)));
}

export function buildDigitalTwinSnapshot() {
  return {
    sourceLabel: 'Demo digital twin assembled from hospital map, IoT, fleet, and alert contracts',
    occupancy: { totalBeds: 96, occupiedBeds: 71, criticalBeds: 9, staffingRatio: '1:4.2' },
    floors: [
      { id: 'icu', label: 'ICU', occupancy: 0.88, alerts: 4, devices: 38, staffing: 'tight' },
      { id: 'ed', label: 'Emergency', occupancy: 0.74, alerts: 3, devices: 29, staffing: 'stable' },
      { id: 'med-surg', label: 'Med/Surg', occupancy: 0.62, alerts: 1, devices: 44, staffing: 'stable' },
    ],
    rooms: [
      { id: 'icu-12', label: 'ICU 12', bed: 'Bed A', patientState: 'high acuity', telemetry: 'stale SpO2', device: 'Monitor M-184', fleet: 'No transfer' },
      { id: 'ed-04', label: 'ED 04', bed: 'Trauma bay', patientState: 'chest pain', telemetry: 'active', device: 'ECG cart E-9', fleet: 'Inbound ETA 8m' },
      { id: 'ms-21', label: 'MS 21', bed: 'Bed B', patientState: 'stable', telemetry: 'normal', device: 'Infusion P-22', fleet: 'Discharge transport pending' },
    ],
    fleet: [
      { id: 'amb-a12', label: 'Ambulance A-12', status: 'delayed', eta: '14 min', alert: 'Route diversion' },
      { id: 'van-03', label: 'Transport Van 03', status: 'available', eta: '5 min', alert: 'None' },
    ],
  };
}

export function buildAssetRegistry() {
  return LOCAL_ARTIFACTS.map((asset) => ({
    ...asset,
    usageCount: asset.relationships?.length || 0,
    status: asset.relationships?.length ? 'referenced' : 'orphan-risk',
    missing: false,
  }));
}

export function workspaceFilterSummary(workspaceId) {
  const workspace = getCareWorkspaceById(workspaceId);
  const model = buildCareWorkspaceModel(workspace.id);
  return {
    workspace,
    tools: model.toolEntries,
    calculators: model.toolEntries.filter((tool) => tool.category === 'Calculator'),
    dashboards: filterByWorkspace(PLATFORM_DASHBOARDS, workspace.id),
    maps: filterByWorkspace(PLATFORM_DASHBOARDS, workspace.id).filter((item) => item.category === 'map'),
    notifications: filterByWorkspace(PLATFORM_NOTIFICATIONS, workspace.id),
    workflows: filterByWorkspace(PLATFORM_WORKFLOWS, workspace.id),
  };
}
