import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { ROLE_LANDING_ROUTE_EXPECTATIONS } from './emergencyRoleNavigationModel';
import {
  SIMULATED_OPERATIONAL_ROLE_IDS,
  OPERATIONAL_WORKFLOW_SPINE,
  listOperationalRoleSimulations,
  simulateOperationalRole,
  validateAllOperationalRolesCoherent,
  validateOperationalRoleCoherence,
} from './operationalRoleSimulationModel';
import { getHomeRouteForRole, getNavItemIdsForRole } from './roleClusterNav.config';
import { getDefaultRouteForProfile } from './routes.config';
import { compileCareDroidAccessProfile, canAccessRoute, normalizeCareDroidProfile } from '../lib/users/canonicalAccess';
import { getPermissionsForRole } from '../lib/users/permissions';
import type { HospitalRole } from '../lib/users/userTypes';
import { WORKFLOW_AUTOMATION_TRIGGER_EVENTS } from './unifiedWorkflowAutomationModel';
import { EMERGENCY_OS_API_ENDPOINTS } from '../services/emergencyOsApi';

function buildSimProfile(roleId: string) {
  return normalizeCareDroidProfile({
    id: `sim-${roleId}`,
    employeeId: `SIM-${roleId}`,
    fullName: roleId,
    preferredName: roleId,
    email: `${roleId}@simulation.caredroid.local`,
    phone: '555-0199',
    avatarUrl: '',
    role: roleId as HospitalRole,
    title: roleId,
    department: 'Emergency Department',
    hospitalSite: 'Central City Hospital',
    cityZone: 'Central',
    shiftStatus: 'on_shift',
    shiftStart: '07:00',
    shiftEnd: '19:00',
    licenseNumber: '',
    specialties: [],
    availabilityStatus: 'available',
    escalationLevel: 'none',
    permissions: getPermissionsForRole(roleId),
    assignedPatients: [],
    currentLoad: 0,
    lastActiveAt: new Date().toISOString(),
  });
}

describe('operationalRoleSimulationModel', () => {
  it('covers every requested hospital persona', () => {
    expect(SIMULATED_OPERATIONAL_ROLE_IDS).toEqual([
      'registration_clerk',
      'dispatcher',
      'ems_coordinator',
      'triage_nurse',
      'charge_nurse',
      'emergency_physician',
      'specialist',
      'pharmacist',
      'radiology_technician',
      'lab_technician',
      'patient_flow_coordinator',
      'hospital_admin',
      'it_admin',
      'demo_observer',
    ]);
  });

  it('simulates a coherent profile for every role without validation issues', () => {
    const issuesByRole = validateAllOperationalRolesCoherent();
    const failures = Object.entries(issuesByRole).filter(([, issues]) => issues.length > 0);
    expect(failures, failures.map(([role, issues]) => `${role}: ${issues.join('; ')}`).join('\n')).toEqual([]);
  });

  it('aligns home, landing, and cluster navigation defaults', () => {
    for (const roleId of SIMULATED_OPERATIONAL_ROLE_IDS) {
      const simulation = simulateOperationalRole(roleId);
      expect(getHomeRouteForRole(roleId)).toBe(getDefaultRouteForProfile(roleId));
      expect(simulation.landingRoute).toBe(getDefaultRouteForProfile(roleId));
      expect(simulation.navItemIds).toEqual(getNavItemIdsForRole(roleId));
      expect(simulation.navItemIds.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('documents landing expectations for every simulated role', () => {
    for (const roleId of SIMULATED_OPERATIONAL_ROLE_IDS) {
      const expectation = ROLE_LANDING_ROUTE_EXPECTATIONS[roleId];
      expect(expectation, `${roleId} missing from ROLE_LANDING_ROUTE_EXPECTATIONS`).toBeDefined();
      expect(simulateOperationalRole(roleId).landingRoute).toContain(expectation.routeIncludes);
    }
  });

  it('grants home-route access and workflow spine connectivity per role', () => {
    for (const roleId of SIMULATED_OPERATIONAL_ROLE_IDS) {
      const simulation = simulateOperationalRole(roleId);
      const compiled = compileCareDroidAccessProfile(buildSimProfile(roleId));
      expect(canAccessRoute(compiled, simulation.homeRoute.split('?')[0])).toBe(true);
      expect(simulation.workflowSpinePhases.length).toBeGreaterThan(0);
      for (const phase of simulation.workflowSpinePhases) {
        expect(OPERATIONAL_WORKFLOW_SPINE).toContain(phase);
      }
    }
  });

  it('enforces read-only and AI visibility policies for observer and ancillary roles', () => {
    const observer = simulateOperationalRole('demo_observer');
    expect(observer.readOnly).toBe(true);
    expect(observer.commandBars.journey).toBe(false);
    expect(observer.commandBars.aiChief).toBe(false);
    expect(observer.aiChiefActions).toEqual(['view']);

    const charge = simulateOperationalRole('charge_nurse');
    expect(charge.commandBars.threeMinuteMission).toBe(true);
    expect(charge.commandBars.workflowAutomation).toBe(true);
    expect(charge.commandBars.aiChief).toBe(true);

    const dispatcher = simulateOperationalRole('dispatcher');
    expect(dispatcher.aiChiefActions).toEqual(['view']);
    expect(dispatcher.alertActions).toEqual(['view', 'escalate']);

    const itAdmin = simulateOperationalRole('it_admin');
    expect(itAdmin.aiChiefActions).toEqual(['view', 'configure']);
    expect(itAdmin.navItemIds).toContain('settings');
  });

  it('keeps ancillary clinical roles on diagnostics with alert acknowledgement', () => {
    for (const roleId of ['pharmacist', 'lab_technician', 'radiology_technician'] as const) {
      const simulation = simulateOperationalRole(roleId);
      expect(simulation.homeRoute).toBe(CANONICAL_ROUTES.emergencyDiagnostics);
      expect(simulation.navItemIds).toContain('diagnostics');
      expect(simulation.alertActions).toContain('view');
      expect(validateOperationalRoleCoherence(roleId)).toEqual([]);
    }
  });

  it('wires backend integration endpoints for workflow and AI orchestration roles', () => {
    const charge = simulateOperationalRole('charge_nurse');
    expect(charge.backendEndpoints).toContain(EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration);
    expect(charge.backendEndpoints).toContain(EMERGENCY_OS_API_ENDPOINTS.patientFlow);

    const flow = simulateOperationalRole('patient_flow_coordinator');
    expect(flow.backendEndpoints).toContain(EMERGENCY_OS_API_ENDPOINTS.patientFlow);
    expect(flow.backendEndpoints).toContain(EMERGENCY_OS_API_ENDPOINTS.queues);

    expect(WORKFLOW_AUTOMATION_TRIGGER_EVENTS.length).toBeGreaterThan(10);
    expect(listOperationalRoleSimulations()).toHaveLength(SIMULATED_OPERATIONAL_ROLE_IDS.length);
  });

  it('exposes accessibility landmarks for operational command surfaces', () => {
    for (const roleId of SIMULATED_OPERATIONAL_ROLE_IDS) {
      const simulation = simulateOperationalRole(roleId);
      expect(simulation.accessibilityLandmarks).toContain('Operational command bars');
      expect(simulation.accessibilityLandmarks).toContain('Primary navigation');
    }
  });
});