import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { EMERGENCY_ROLE_IDS } from '../config/emergencyRolePermissions';
import {
  buildReceptionCalculatorEmbedPath,
  isCalculatorArtifact,
  listReceptionDeskCalculatorIds,
  remapRegistryNavigationForRole,
  resolveClinicalToolLaunchTarget,
  resolveReceptionDeskCalculatorIds,
  shouldEmbedToolsOnReception,
  getUnifiedClinicalToolsProfile,
} from './unifiedClinicalToolsBridge';

describe('unifiedClinicalToolsBridge', () => {
  it('embeds calculator launches on reception for registration clerk', () => {
    const target = resolveClinicalToolLaunchTarget({
      emergencyRoleId: EMERGENCY_ROLE_IDS.registrationClerk,
      canAccessToolsRoute: false,
      kind: 'calculator',
      calculatorId: 'qsofa',
      patientId: 'patient-1',
      source: 'orchestration',
    });

    expect(target.pathname).toBe(CANONICAL_ROUTES.emergencyReception);
    expect(target.search).toContain('calc=qsofa');
    expect(target.search).toContain('patientId=patient-1');
    expect(target.mode).toBe('reception-embed');
  });

  it('routes clinical roles to the emergency tools hub', () => {
    const target = resolveClinicalToolLaunchTarget({
      emergencyRoleId: EMERGENCY_ROLE_IDS.physician,
      canAccessToolsRoute: true,
      kind: 'calculator',
      calculatorId: 'heart-score',
      source: 'registry',
    });

    expect(target.pathname).toBe(CANONICAL_ROUTES.emergencyTools);
    expect(target.search).toContain('filter=calculator');
    expect(target.search).toContain('open=heart-score');
  });

  it('remaps registry calculator navigation for front-desk roles', () => {
    const remapped = remapRegistryNavigationForRole(
      {
        pathname: CANONICAL_ROUTES.emergencyTools,
        search: '?source=calculators&filter=calculator&open=news2',
      },
      {
        emergencyRoleId: EMERGENCY_ROLE_IDS.registrationClerk,
        canAccessToolsRoute: false,
      },
    );

    expect(remapped.pathname).toBe(CANONICAL_ROUTES.emergencyReception);
    expect(remapped.search).toContain('calc=news2');
  });

  it('detects calculator artifacts from registry ids', () => {
    expect(isCalculatorArtifact('qsofa')).toBe(true);
    expect(isCalculatorArtifact('fleet-command')).toBe(false);
  });

  it('builds reception calculator embed paths', () => {
    expect(buildReceptionCalculatorEmbedPath({ calculatorId: 'nihss' })).toContain(
      '/emergency/reception?calc=nihss',
    );
  });

  it('flags reception embed for clerks without tools route access', () => {
    expect(
      shouldEmbedToolsOnReception({
        emergencyRoleId: EMERGENCY_ROLE_IDS.registrationClerk,
        canAccessToolsRoute: false,
        kind: 'tools-hub',
      }),
    ).toBe(true);
  });

  it('remaps copilot launches to reception for front-desk roles', () => {
    const remapped = remapRegistryNavigationForRole(
      { pathname: CANONICAL_ROUTES.emergencyCopilot, search: '' },
      {
        emergencyRoleId: EMERGENCY_ROLE_IDS.registrationClerk,
        canAccessToolsRoute: false,
        toolId: 'wells-pe',
        launchMode: 'chat-assisted',
      },
    );

    expect(remapped.pathname).toBe(CANONICAL_ROUTES.emergencyReception);
    expect(remapped.search).toContain('tools=calculators');
  });

  it('routes chat-assisted copilot requests to reception when clerk lacks copilot access', () => {
    const target = resolveClinicalToolLaunchTarget({
      emergencyRoleId: EMERGENCY_ROLE_IDS.registrationClerk,
      canAccessToolsRoute: false,
      kind: 'copilot',
      toolId: 'wells-pe',
    });

    expect(target.pathname).toBe(CANONICAL_ROUTES.emergencyReception);
    expect(target.mode).toBe('reception-embed');
  });

  it('lists reception-desk calculator ids from the unified tools profile', () => {
    const profile = getUnifiedClinicalToolsProfile({ saasRole: 'student' });
    const ids = listReceptionDeskCalculatorIds(profile);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toContain('qsofa');
    expect(resolveReceptionDeskCalculatorIds({
      emergencyRoleId: EMERGENCY_ROLE_IDS.registrationClerk,
    }).length).toBeGreaterThan(0);
  });
});