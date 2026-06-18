import { describe, expect, it } from 'vitest';
import {
  PatientsRoute,
  QueueRoute,
  ReassessmentRoute,
  BoardingRoute,
  CapacityRoute,
  CopilotRoute,
} from './emergencyRoutePages';
import {
  EmergencyRoutePage,
  MetricGrid,
  PatientGrid,
  isHighRisk,
  QUEUE_MOVEMENT_STAGES,
} from './emergencyRouteShared';
import { shouldRedirectEmergencySurface } from '../../services/navigateToEmergencySurface';
import { EMERGENCY_ROLE_IDS } from '../../config/emergencyRolePermissions';

describe('emergency page modules smoke', () => {
  it('exports route page components', () => {
    expect(typeof PatientsRoute).toBe('function');
    expect(typeof QueueRoute).toBe('function');
    expect(typeof ReassessmentRoute).toBe('function');
    expect(typeof BoardingRoute).toBe('function');
    expect(typeof CapacityRoute).toBe('function');
    expect(typeof CopilotRoute).toBe('function');
  });

  it('exports shared emergency route helpers', () => {
    expect(typeof EmergencyRoutePage).toBe('function');
    expect(typeof MetricGrid).toBe('function');
    expect(typeof PatientGrid).toBe('function');
    expect(typeof isHighRisk).toBe('function');
    expect(QUEUE_MOVEMENT_STAGES.Triage).toEqual(['Triage']);
  });

  it('redirects clerk patients route through reception when reception-first', () => {
    expect(shouldRedirectEmergencySurface('patients', EMERGENCY_ROLE_IDS.registrationClerk)).toBe(
      true,
    );
    expect(shouldRedirectEmergencySurface('patients', EMERGENCY_ROLE_IDS.physician)).toBe(false);
  });
});
