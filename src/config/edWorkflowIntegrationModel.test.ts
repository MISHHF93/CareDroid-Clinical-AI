import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES, TRIAGE_PRETRIAGE_ROUTE } from './routes.config';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import {
  ED_WORKFLOW_AZ_STEPS,
  listEdWorkflowAzSteps,
  resolveNormalizedEdUserContext,
  summarizeBackendFrontendSync,
} from './edWorkflowIntegrationModel';

describe('edWorkflowIntegrationModel', () => {
  it('documents the full ED workflow from entry through persistence', () => {
    const steps = listEdWorkflowAzSteps();
    expect(steps.length).toBeGreaterThanOrEqual(10);
    expect(steps[0]?.route).toBe(CANONICAL_ROUTES.platformStart);
    expect(steps.find((step) => step.id === 'clinical-startup')?.route).toBe(
      CANONICAL_ROUTES.emergencyReception,
    );
    expect(
      steps.some((step) => step.emergencyRoleId === EMERGENCY_ROLE_IDS.registrationClerk),
    ).toBe(true);
    expect(steps.some((step) => step.emergencyRoleId === EMERGENCY_ROLE_IDS.edManager)).toBe(true);
    expect(steps.find((step) => step.id === 'triage-acuity')?.route).toBe(
      `${CANONICAL_ROUTES.emergencyQueues}?queue=pretriage`,
    );
    expect(steps.find((step) => step.id === 'command-ops')?.route).toBe(
      CANONICAL_ROUTES.emergencyCommandCenter,
    );
  });

  it('normalizes profile catalog roles into emergency landing context', () => {
    const context = resolveNormalizedEdUserContext({
      user: { role: 'nurse', profile: { roleProfileId: 'nurse' } },
      operationalProfile: {
        accessSummary: {
          saasRole: 'nurse',
          emergencyRole: EMERGENCY_ROLE_IDS.triageNurse,
          trackMindRole: null,
          navigationRoutes: [],
          allowedWorkspaces: [],
          navigationGroups: [],
          permissionPresets: [],
          defaultScreenMode: null,
          toolPolicy: { allowedPacks: [], restrictedToolIds: [] },
          profileBenefits: '',
        },
      },
    });
    expect(context.emergencyRoleId).toBe(EMERGENCY_ROLE_IDS.triageNurse);
    expect(context.landingRoute).toBe(TRIAGE_PRETRIAGE_ROUTE);
  });

  it('summarizes backend vs frontend sync expectations', () => {
    const sync = summarizeBackendFrontendSync();
    expect(sync.profileWired).toBe(true);
    expect(sync.emergencyReadWired).toBe(true);
    expect(ED_WORKFLOW_AZ_STEPS.every((step) => step.laneId)).toBe(true);
  });

  it('reflects live store backend availability when provided', () => {
    const offline = summarizeBackendFrontendSync({
      backendAvailable: false,
      persistenceMode: 'local',
    });
    expect(offline.profileWired).toBe(false);
    expect(offline.persistenceMode).toBe('local-first');

    const online = summarizeBackendFrontendSync({
      backendAvailable: true,
      persistenceMode: 'backend',
    });
    expect(online.emergencyReadWired).toBe(true);
    expect(online.persistenceMode).toBe('hybrid');
  });
});
