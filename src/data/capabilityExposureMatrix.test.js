import { describe, expect, it } from 'vitest';
import { BACKEND_API_CAPABILITIES } from '../config/backendApiCapabilities';
import { BACKEND_HTTP_ROUTES } from './backendHttpRouteInventory';
import { FRONTEND_API_CALLS } from './frontendApiCallsInventory';
import {
  CAPABILITY_EXPOSURE_STATUSES,
  CAPABILITY_RISK_LEVELS,
  CAPABILITY_ROUTE_PROTECTION_STATUSES,
  CAPABILITY_SURFACE_TYPES,
  capabilityExposureMatrix,
  listCapabilityEndpointRows,
  recommendedCapabilityBuildOrder,
  unsupportedWorkflowDecisions,
} from './capabilityExposureMatrix';

const REQUIRED_COLUMNS = [
  'capability',
  'backendSourceFile',
  'commandOrApiRoute',
  'currentFrontendSurface',
  'frontendRouteStatus',
  'surfaceType',
  'exposureStatus',
  'userFacingProblem',
  'recommendedFrontendMechanism',
  'riskLevel',
];

const FAKE_WORKFLOW_GUARDS = [
  {
    workflow: 'Pipeline updates',
    capability: 'Pipeline updates',
    blockedApiPattern: /\/api\/pipelines?(?:\/|$)/i,
    allowedFrontendIds: [],
  },
  {
    workflow: 'Publishing/content scheduling',
    capability: 'Publishing and content scheduling',
    blockedApiPattern: /\/api\/(?:publish|publishing|content\/schedule|reports\/schedule)(?:\/|$)/i,
    allowedFrontendIds: ['reports-schedule-create', 'reports-schedule-cancel'],
  },
  {
    workflow: 'Connector management',
    capability: 'Integrations and connectors',
    blockedApiPattern: /\/api\/(?:connectors?|integrations?)(?:\/|$)/i,
    allowedFrontendIds: [],
  },
  {
    workflow: 'Reminder creation',
    capability: 'Reminders and scheduler',
    blockedApiPattern: /\/api\/(?:reminders?|notifications\/reminders?)(?:\/|$)/i,
    allowedFrontendIds: [],
  },
];

describe('capabilityExposureMatrix', () => {
  it('keeps every matrix row complete and classified', () => {
    expect(capabilityExposureMatrix.length).toBeGreaterThan(15);

    for (const row of capabilityExposureMatrix) {
      for (const column of REQUIRED_COLUMNS) {
        expect(row[column], `${row.capability} missing ${column}`).toBeTruthy();
      }
      expect(CAPABILITY_EXPOSURE_STATUSES).toContain(row.exposureStatus);
      expect(CAPABILITY_RISK_LEVELS).toContain(row.riskLevel);
      expect(CAPABILITY_ROUTE_PROTECTION_STATUSES).toContain(row.frontendRouteStatus);
      expect(CAPABILITY_SURFACE_TYPES).toContain(row.surfaceType);
    }
  });

  it('keeps the full backend endpoint list available through the matrix deliverable', () => {
    const endpointRows = listCapabilityEndpointRows();

    expect(endpointRows).toHaveLength(BACKEND_HTTP_ROUTES.length);
    expect(endpointRows.map((row) => row.commandOrApiRoute)).toContain('POST /api/chat/message');
    expect(endpointRows.map((row) => row.commandOrApiRoute)).toContain('POST /api/tools/:id/execute');
  });

  it('prioritizes corrected exposure fixes instead of already-shipped outreach', () => {
    const outreach = capabilityExposureMatrix.find(
      (row) => row.capability === 'Guided outreach and follow-up planning'
    );
    expect(outreach).toMatchObject({
      commandOrApiRoute: 'POST /api/chat/message',
      exposureStatus: 'exposed',
      frontendRouteStatus: 'protected',
      surfaceType: 'visible-ui',
      riskLevel: 'medium',
    });
    expect(outreach.currentFrontendSurface).toMatch(/outreach drawer/i);
    expect(outreach.recommendedFrontendMechanism).toMatch(/keep current/i);

    expect(recommendedCapabilityBuildOrder[0]).toMatchObject({
      rank: 1,
      capability: 'Classify and contain public/unsupported visible surfaces',
    });
    expect(recommendedCapabilityBuildOrder.map((row) => row.capability)).not.toContain(
      'Guided outreach and follow-up planning'
    );
    expect(recommendedCapabilityBuildOrder.map((row) => row.capability)).toEqual([
      'Classify and contain public/unsupported visible surfaces',
      'Profile read and update',
      'Notification preferences and inbox actions',
      'Tool metadata and validation preview',
      'Compliance export and account deletion',
      'Audit my-logs and role-aware PHI access',
      'Billing portal and checkout',
      'Clinical content reference expansion',
      'Native Android API contract alignment',
    ]);
  });

  it('uses exact registered executor route patterns instead of concrete shorthand only', () => {
    const executors = capabilityExposureMatrix.find(
      (row) => row.capability === 'Registered clinical tool executors'
    );

    expect(executors).toMatchObject({
      frontendRouteStatus: 'protected',
      surfaceType: 'visible-ui',
      exposureStatus: 'exposed',
    });
    expect(executors.commandOrApiRoute).toContain('POST /api/tools/:id/execute');
    expect(executors.commandOrApiRoute).toContain('sofa-calculator');
    expect(executors.commandOrApiRoute).toContain('drug-interactions');
    expect(executors.commandOrApiRoute).toContain('lab-interpreter');
  });

  it('tracks verified visible surfaces that are public, frontend-only, mock-only, or unsupported', () => {
    const rowsByCapability = new Map(capabilityExposureMatrix.map((row) => [row.capability, row]));

    expect(rowsByCapability.get('Shared tool session and result surfaces')).toMatchObject({
      frontendRouteStatus: 'public',
      surfaceType: 'public-share',
      exposureStatus: 'unsafe/unclear',
      riskLevel: 'high',
    });
    expect(rowsByCapability.get('Fleet operations command, maintenance, and route planning')).toMatchObject({
      frontendRouteStatus: 'protected',
      surfaceType: 'frontend-only',
      exposureStatus: 'frontend-only',
    });
    expect(rowsByCapability.get('Clinical alerts management')).toMatchObject({
      frontendRouteStatus: 'protected',
      surfaceType: 'mock-only',
      exposureStatus: 'mock-only',
    });
    expect(rowsByCapability.get('Team management')).toMatchObject({
      frontendRouteStatus: 'protected + permission',
      surfaceType: 'unsupported-visible',
      exposureStatus: 'unsafe/unclear',
    });
    expect(rowsByCapability.get('Cost analytics and live cost tracking')).toMatchObject({
      frontendRouteStatus: 'protected + permission',
      surfaceType: 'frontend-only',
      exposureStatus: 'frontend-only',
    });
  });

  it('does not recommend fake UI for unsupported BrandOps-style workflows', () => {
    expect(unsupportedWorkflowDecisions.map((item) => item.workflow)).toEqual(
      expect.arrayContaining([
        'Pipeline updates',
        'Publishing/content scheduling',
        'Connector management',
        'Reminder creation',
        'Clinical alerts backend actions',
        'Team invite/edit/delete',
        'Fleet dispatch mutation',
        'Backend cost authority',
      ])
    );

    for (const item of unsupportedWorkflowDecisions) {
      expect(item.reason).toMatch(/No backend|not API-backed|no general connector|no .*route|no .*controller|mock or client-only|no durable Nest cost API/i);
    }
  });

  it('blocks fake frontend workflows unless backend routes and capability gates exist', () => {
    const rowsByCapability = new Map(capabilityExposureMatrix.map((row) => [row.capability, row]));

    for (const guard of FAKE_WORKFLOW_GUARDS) {
      const row = rowsByCapability.get(guard.capability);
      expect(row, `missing capability row for ${guard.workflow}`).toBeTruthy();
      expect(row.exposureStatus, `${guard.workflow} must not be fully exposed`).not.toBe('exposed');
      expect(row.recommendedFrontendMechanism).toMatch(/intentionally unavailable|coming later|do not build|defer|preferences only|auth integrations only/i);

      const matchingBackendRoutes = BACKEND_HTTP_ROUTES.filter((route) =>
        guard.blockedApiPattern.test(route.path)
      );
      expect(
        matchingBackendRoutes,
        `${guard.workflow} gained backend routes; update the guard with real model/execution validation before exposing UI.`
      ).toEqual([]);

      const matchingFrontendCalls = FRONTEND_API_CALLS.filter((call) =>
        guard.blockedApiPattern.test(call.path)
      );
      const unexpectedCalls = matchingFrontendCalls.filter(
        (call) => !guard.allowedFrontendIds.includes(call.id)
      );
      expect(
        unexpectedCalls,
        `${guard.workflow} added frontend API calls without a real backend workflow.`
      ).toEqual([]);

      for (const allowed of matchingFrontendCalls.filter((call) =>
        guard.allowedFrontendIds.includes(call.id)
      )) {
        expect(allowed.capability, `${allowed.id} must be capability-gated`).toBeTruthy();
        expect(BACKEND_API_CAPABILITIES[allowed.capability], `${allowed.id} gate must stay disabled`).toBe(false);
        expect(allowed.notes || '').toMatch(/No route|gated off/i);
      }
    }
  });

  it('documents unavailable workflows as unavailable, coming later, or preference-only rather than functional', () => {
    const decisionsByWorkflow = new Map(unsupportedWorkflowDecisions.map((item) => [item.workflow, item]));

    expect(decisionsByWorkflow.get('Pipeline updates')).toMatchObject({
      decision: 'Do not expose',
    });
    expect(decisionsByWorkflow.get('Publishing/content scheduling')).toMatchObject({
      decision: 'Do not expose',
    });
    expect(decisionsByWorkflow.get('Connector management')?.decision).toMatch(/supported auth integrations/i);
    expect(decisionsByWorkflow.get('Reminder creation')?.decision).toMatch(/preferences only/i);

    const matrixCopy = capabilityExposureMatrix
      .filter((row) => FAKE_WORKFLOW_GUARDS.some((guard) => guard.capability === row.capability))
      .map((row) => [
        row.currentFrontendSurface,
        row.userFacingProblem,
        row.recommendedFrontendMechanism,
      ].join(' '));

    expect(matrixCopy.join(' ')).toMatch(/intentionally unavailable|coming later|preferences only|auth integrations only/i);
    expect(matrixCopy.join(' ')).not.toMatch(/ready to use|fully functional|create scheduled reminder|publish now|connect any/i);
  });

  it('tracks native Android API drift as a stale exposure risk', () => {
    const android = capabilityExposureMatrix.find(
      (row) => row.capability === 'Native Android API contract'
    );

    expect(android).toMatchObject({
      exposureStatus: 'stale',
      frontendRouteStatus: 'native client',
      surfaceType: 'native-client',
      riskLevel: 'high',
    });
    expect(android.commandOrApiRoute).toMatch(/POST \/api\/chat/);
    expect(android.commandOrApiRoute).toMatch(/auth refresh\/logout\/password/i);
    expect(android.commandOrApiRoute).toMatch(/bare POST \/api\/tools\/\{id\}/i);
    expect(android.recommendedFrontendMechanism).toMatch(/canonical React\/Nest route inventory/i);
  });
});
