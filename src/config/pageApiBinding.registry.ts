/**
 * Page ↔ backend API binding contract.
 * Surfaces without a Nest route are explicitly `local-only` so UI does not call missing endpoints.
 */
import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_OS_API_ENDPOINTS } from '../services/emergencyOsApi';
import { BACKEND_CAPABILITY_STATUS, getBackendCapabilityStatus } from './backendApiCapabilities';

export type PageApiBindingMode = 'wired' | 'partial' | 'local-only' | 'redirect';

export type PageApiBinding = Readonly<{
  pageId: string;
  path: string;
  mode: PageApiBindingMode;
  /** Primary emergency-os endpoints (proxied at /api/emergency/* in dev). */
  endpoints: readonly string[];
  /** backendApiCapabilities keys consulted by this page */
  capabilities: readonly string[];
  notes?: string;
}>;

const E = EMERGENCY_OS_API_ENDPOINTS;

export const PAGE_API_BINDINGS: readonly PageApiBinding[] = Object.freeze([
  Object.freeze({
    pageId: 'reception',
    path: CANONICAL_ROUTES.emergencyReception,
    mode: 'wired',
    endpoints: [E.receptionSnapshot, E.receptionHandoff],
    capabilities: ['emergencyReceptionSnapshot', 'emergencyReceptionHandoff'],
  }),
  Object.freeze({
    pageId: 'dispatch',
    path: CANONICAL_ROUTES.emergencyDispatch,
    mode: 'wired',
    endpoints: [`${EMERGENCY_OS_API_ENDPOINTS.operatingSurface}/dispatch`],
    capabilities: ['emergencyDispatch', 'emergencyOperatingSurfaces'],
  }),
  Object.freeze({
    pageId: 'ems',
    path: CANONICAL_ROUTES.emergencyEms,
    mode: 'wired',
    endpoints: [E.ems],
    capabilities: ['emergencyEmsRuntime'],
  }),
  Object.freeze({
    pageId: 'command-center',
    path: CANONICAL_ROUTES.emergencyCommandCenter,
    mode: 'wired',
    endpoints: [
      `${E.operatingSurface}/command-center`,
      E.operationalIntelligenceSnapshot,
      E.operationalIntelligenceAlerts,
      E.centralNodeSnapshot,
    ],
    capabilities: ['emergencyCentralNode', 'emergencyOperationalAnalytics', 'emergencyOperatingSurfaces'],
  }),
  Object.freeze({
    pageId: 'whiteboard',
    path: CANONICAL_ROUTES.emergencyWhiteboard,
    mode: 'wired',
    endpoints: [`${E.operatingSurface}/whiteboard`, E.whiteboard, E.centralNodeSnapshot],
    capabilities: ['emergencyWhiteboard', 'emergencyCentralNode', 'emergencyOperatingSurfaces'],
  }),
  Object.freeze({
    pageId: 'triage',
    path: `${CANONICAL_ROUTES.emergencyQueues}?queue=pretriage`,
    mode: 'wired',
    endpoints: [E.queues, E.triageAssist],
    capabilities: ['emergencyQueues', 'emergencyTriageAssist'],
  }),
  Object.freeze({
    pageId: 'diagnostics',
    path: CANONICAL_ROUTES.emergencyDiagnostics,
    mode: 'wired',
    endpoints: [`${EMERGENCY_OS_API_ENDPOINTS.operatingSurface}/diagnostics`],
    capabilities: ['emergencyDiagnosticsView', 'emergencyOperatingSurfaces'],
  }),
  Object.freeze({
    pageId: 'handoffs',
    path: CANONICAL_ROUTES.emergencyHandoffs,
    mode: 'wired',
    endpoints: [`${EMERGENCY_OS_API_ENDPOINTS.operatingSurface}/handoffs`],
    capabilities: ['emergencyHandoffsView', 'emergencyOperatingSurfaces', 'workflowOrchestration'],
  }),
  Object.freeze({
    pageId: 'reports',
    path: CANONICAL_ROUTES.emergencyReports,
    mode: 'wired',
    endpoints: [`${EMERGENCY_OS_API_ENDPOINTS.operatingSurface}/reports`],
    capabilities: ['emergencyReportsView', 'emergencyOperatingSurfaces'],
    notes: 'reportsGenerate export remains on-device; snapshot is server-backed.',
  }),
  Object.freeze({
    pageId: 'pulse',
    path: CANONICAL_ROUTES.emergencyPulse,
    mode: 'wired',
    endpoints: [`${EMERGENCY_OS_API_ENDPOINTS.operatingSurface}/department-pulse`],
    capabilities: ['emergencyPulseView', 'emergencyOperatingSurfaces'],
  }),
  Object.freeze({
    pageId: 'shift',
    path: CANONICAL_ROUTES.emergencyShift,
    mode: 'wired',
    endpoints: [`${EMERGENCY_OS_API_ENDPOINTS.operatingSurface}/shift-summary`],
    capabilities: ['emergencyShiftView', 'emergencyOperatingSurfaces'],
    notes: 'Shift export capability remains disabled; summary snapshot is server-backed.',
  }),
  Object.freeze({
    pageId: 'ed-readiness',
    path: CANONICAL_ROUTES.emergencyEdReadiness,
    mode: 'wired',
    endpoints: [`${EMERGENCY_OS_API_ENDPOINTS.operatingSurface}/ed-readiness`],
    capabilities: ['emergencyEdReadinessView', 'emergencyOperatingSurfaces'],
  }),
  Object.freeze({
    pageId: 'executive',
    path: CANONICAL_ROUTES.executive,
    mode: 'redirect',
    endpoints: [`${E.operatingSurface}/command-center`, E.analytics, E.operationalIntelligenceSnapshot],
    capabilities: ['emergencyOperationalAnalytics', 'emergencyOperatingSurfaces'],
    notes: 'Redirects to Hospital Command Center (?view=executive) with progressive disclosure lens.',
  }),
  Object.freeze({
    pageId: 'alerts',
    path: CANONICAL_ROUTES.emergencyAlerts,
    mode: 'wired',
    endpoints: [`${E.operatingSurface}/alerts`, E.operationalIntelligenceAlerts],
    capabilities: ['emergencyOperationalAnalytics', 'emergencyOperatingSurfaces'],
  }),
]);

const bindingByPageId = Object.freeze(
  Object.fromEntries(PAGE_API_BINDINGS.map((entry) => [entry.pageId, entry])),
);

export function getPageApiBinding(pageId: string): PageApiBinding | undefined {
  return bindingByPageId[pageId];
}

export function listLocalOnlyPageBindings(): readonly PageApiBinding[] {
  return PAGE_API_BINDINGS.filter((entry) => entry.mode === 'local-only');
}

export function isPageApiCapabilityLive(capability: string): boolean {
  const status = getBackendCapabilityStatus(capability);
  return status === BACKEND_CAPABILITY_STATUS.REAL || status === BACKEND_CAPABILITY_STATUS.DEMO;
}