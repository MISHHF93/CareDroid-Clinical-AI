/**
 * Hospital Operations, Medical IoT, and Fleet Tools Pack contracts.
 *
 * These interfaces document the backend payload shape expected by the frontend pack.
 * Current map/telemetry endpoints may serve demo data, but every demo payload must be
 * source-labeled and must not imply autonomous dispatch or clinical decision authority.
 */

export type DemoTelemetryLabel =
  | 'backend-demo-hospital-map'
  | 'backend-demo-fleet-tracking'
  | 'backend-demo-medical-iot';

export interface DemoTelemetryEnvelope<TPayload> {
  source: DemoTelemetryLabel;
  sourceLabel: string;
  generatedAt: string;
  demoContractOnly: true;
  payload: TPayload;
}

export interface HospitalOperationsCalculatorContract {
  toolId:
    | 'bed-occupancy-calculator'
    | 'staffing-ratio-calculator'
    | 'turnaround-time-calculator'
    | 'resource-utilization-index';
  execution: 'frontend-deterministic';
  autonomousActionAllowed: false;
  requiredHumanReview: true;
}

export interface HospitalOperationsAssistantContract {
  toolId:
    | 'dispatch-ai'
    | 'hospital-command-assistant'
    | 'resource-allocation-assistant'
    | 'device-recommendation-assistant';
  route: '/api/chat/message';
  postExecuteSupported: false;
  autonomousActionAllowed: false;
  requiredHumanApproval: true;
}

export interface HospitalOperationsMapContract {
  toolId:
    | 'hospital-map'
    | 'fleet-live-map'
    | 'medical-iot-dashboard'
    | 'device-fleet-management'
    | 'asset-tracking-dashboard'
    | 'telemetry-monitoring'
    | 'incident-command-center'
    | 'hospital-operations-cockpit'
    | 'device-battery-intelligence'
    | 'capacity-prediction-engine';
  launchPath: '/hospital-map' | '/medical-iot' | '/fleet/map' | '/fleet/predictive-maintenance' | '/fleet/route-optimizer';
  telemetrySourceMustBeLabeled: true;
  fallbackStateRequired: true;
  responsiveMapRequired: true;
  autonomousActionAllowed: false;
}

export const HOSPITAL_OPERATIONS_ASSISTANT_CONTRACTS: readonly HospitalOperationsAssistantContract[] = [
  {
    toolId: 'dispatch-ai',
    route: '/api/chat/message',
    postExecuteSupported: false,
    autonomousActionAllowed: false,
    requiredHumanApproval: true,
  },
  {
    toolId: 'hospital-command-assistant',
    route: '/api/chat/message',
    postExecuteSupported: false,
    autonomousActionAllowed: false,
    requiredHumanApproval: true,
  },
  {
    toolId: 'resource-allocation-assistant',
    route: '/api/chat/message',
    postExecuteSupported: false,
    autonomousActionAllowed: false,
    requiredHumanApproval: true,
  },
  {
    toolId: 'device-recommendation-assistant',
    route: '/api/chat/message',
    postExecuteSupported: false,
    autonomousActionAllowed: false,
    requiredHumanApproval: true,
  },
] as const;
