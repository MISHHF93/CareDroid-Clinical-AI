import { describe, expect, it } from 'vitest';
import { CANONICAL_APP_ROUTE_TREE, CANONICAL_ROUTES } from '../config/routes.config';
import {
  FULL_EMERGENCY_CARE_JOURNEY,
  SAAS_SERVICE_JOURNEY_MODULES,
  buildFullEmergencyCareJourneySnapshot,
} from './fullEmergencyCareJourneyService';

const REQUIRED_SERVICE_IDS = [
  'EmergencySignalService',
  'DispatchIntakeService',
  'CADIntegrationService',
  'EMSUnitService',
  'PrehospitalAssessmentService',
  'PreArrivalNotificationService',
  'EDReadinessService',
  'PatientIntakeService',
  'TriageService',
  'AIChiefService',
  'CriticalAlertService',
  'ThreeMinuteResponseService',
  'StaffRoutingService',
  'DepartmentCapacityService',
  'DiagnosticsCoordinationService',
  'HandoffService',
  'BottleneckRegistryService',
  'AnalyticsService',
  'ReportingService',
  'HelpManualService',
] as const;

const PLAY_THE_SYSTEM_SCENARIOS = [
  {
    id: 'chest-pain-911-to-physician',
    routes: [
      CANONICAL_ROUTES.emergencyDispatch,
      CANONICAL_ROUTES.emergencyEms,
      CANONICAL_ROUTES.emergencyEdReadiness,
      CANONICAL_ROUTES.emergencyAlerts,
    ],
    services: ['DispatchIntakeService', 'CADIntegrationService', 'PreArrivalNotificationService', 'ThreeMinuteResponseService', 'StaffRoutingService'],
  },
  {
    id: 'walk-in-shortness-of-breath-escalation',
    routes: [CANONICAL_ROUTES.emergencyReception, CANONICAL_ROUTES.emergencyIntake, CANONICAL_ROUTES.emergencyCopilot, CANONICAL_ROUTES.emergencyAlerts],
    services: ['PatientIntakeService', 'TriageService', 'AIChiefService', 'CriticalAlertService'],
  },
  {
    id: 'ambulance-trauma-charge-routing',
    routes: [CANONICAL_ROUTES.emergencyEms, CANONICAL_ROUTES.emergencyEdReadiness, CANONICAL_ROUTES.emergencyCommandCenter],
    services: ['PrehospitalAssessmentService', 'PreArrivalNotificationService', 'EDReadinessService', 'StaffRoutingService'],
  },
  {
    id: 'ai-service-unavailable-safe-fallback',
    routes: [CANONICAL_ROUTES.emergencyCopilot, CANONICAL_ROUTES.emergencyHelp],
    services: ['AIChiefService', 'HelpManualService'],
  },
  {
    id: 'notification-service-fails-in-app-alert',
    routes: [CANONICAL_ROUTES.emergencyAlerts, CANONICAL_ROUTES.emergencyWhiteboard],
    services: ['CriticalAlertService', 'ThreeMinuteResponseService'],
  },
  {
    id: 'lab-radiology-bottleneck-analytics',
    routes: [CANONICAL_ROUTES.emergencyDiagnostics, CANONICAL_ROUTES.emergencyCopilot, CANONICAL_ROUTES.emergencyAnalytics],
    services: ['DiagnosticsCoordinationService', 'BottleneckRegistryService', 'AIChiefService', 'AnalyticsService'],
  },
  {
    id: 'demo-observer-read-only',
    routes: [CANONICAL_ROUTES.emergencyWhiteboard, CANONICAL_ROUTES.emergencyAnalytics, CANONICAL_ROUTES.emergencyHelp],
    services: ['AnalyticsService', 'HelpManualService'],
  },
  {
    id: 'registration-clerk-clinical-override-blocked',
    routes: [CANONICAL_ROUTES.emergencyReception, CANONICAL_ROUTES.emergencyIntake],
    services: ['PatientIntakeService', 'TriageService'],
  },
] as const;

describe('fullEmergencyCareJourneyService', () => {
  it('defines the complete emergency-care journey and service map', () => {
    expect(FULL_EMERGENCY_CARE_JOURNEY).toHaveLength(20);
    expect(FULL_EMERGENCY_CARE_JOURNEY.map((stage) => stage.order)).toEqual(
      Array.from({ length: 20 }, (_value, index) => index + 1),
    );
    expect(SAAS_SERVICE_JOURNEY_MODULES.map((service) => service.id)).toEqual(REQUIRED_SERVICE_IDS);
    for (const service of SAAS_SERVICE_JOURNEY_MODULES) {
      expect(service.connectedRoutes.length, service.id).toBeGreaterThan(0);
      expect(service.implementation, service.id).not.toMatch(/mock\/stub|until dedicated api/i);
    }
  });

  it('builds an operational snapshot wired to live service summaries', () => {
    const snapshot = buildFullEmergencyCareJourneySnapshot();

    expect(snapshot.principle).toBe("It takes 3 minutes to save someone's life.");
    expect(snapshot.safety).toMatch(/Decision support only/i);
    expect(snapshot.liveServiceSummaries).toEqual(
      expect.objectContaining({
        dispatch: expect.any(Object),
        cad: expect.any(Object),
        prehospital: expect.any(Object),
        preArrival: expect.any(Object),
        readiness: expect.any(Object),
        journeyMetrics: expect.any(Object),
        staffRouting: expect.any(Object),
        diagnostics: expect.any(Object),
        bottlenecks: expect.any(Object),
      }),
    );
  });

  it('covers the requested play-the-system scenarios with connected routes and services', () => {
    const routes = new Set([
      ...FULL_EMERGENCY_CARE_JOURNEY.map((stage) => stage.route.split('?')[0]),
      ...CANONICAL_APP_ROUTE_TREE.map((route) => route.path),
    ]);
    const serviceIds = new Set(SAAS_SERVICE_JOURNEY_MODULES.map((service) => service.id));

    for (const scenario of PLAY_THE_SYSTEM_SCENARIOS) {
      for (const route of scenario.routes) {
        expect(routes.has(route), `${scenario.id} missing route ${route}`).toBe(true);
      }
      for (const service of scenario.services) {
        expect(serviceIds.has(service), `${scenario.id} missing service ${service}`).toBe(true);
      }
    }
  });
});
