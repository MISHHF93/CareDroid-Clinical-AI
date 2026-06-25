import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
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
    expect(steps.some((step) => step.emergencyRoleId === EMERGENCY_ROLE_IDS.registrationClerk)).toBe(
      true,
    );
    expect(steps.some((step) => step.emergencyRoleId === EMERGENCY_ROLE_IDS.edManager)).toBe(true);
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
    expect(context.landingRoute).toContain(CANONICAL_ROUTES.emergencyReception);
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
