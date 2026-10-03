/**
 * CareDroid Extensible Digital Twin Architecture Types
 * Models digital twins for hospital departments, rooms, medical equipment,
 * clinical workflows, and patient flow dynamics for simulation and predictive operations.
 */

export type DigitalTwinType =
  | 'hospital_facility'
  | 'emergency_department'
  | 'resuscitation_bay'
  | 'patient_room'
  | 'ct_scanner'
  | 'ambulance_unit'
  | 'infusion_fleet'
  | 'clinical_workflow';

export interface PhysicalEntityRef {
  entityId: string;
  entityType: string;
  sourceSystem: string;
}

export interface TwinTelemetryState {
  currentOccupancy: number;
  maxCapacity: number;
  activeQueueDepth: number;
  temperatureCelsius?: number;
  airChangesPerHour?: number;
  powerStatus: 'normal' | 'emergency_generator' | 'battery';
  telemetryTimestampIso: string;
}

export interface SimulationParameters {
  arrivalRatePatientsPerHour: number;
  averageLengthOfStayMinutes: number;
  nurseToPatientRatio: number;
  physicianCount: number;
  equipmentAvailabilityRatio: number;
}

export interface PredictiveTwinMetrics {
  surgeRiskScore: number; // 0 - 100
  bottleneckProbabilityPercent: number;
  projectedWaitTimeMinutes: number;
  predictedBedShortageInMinutes: number;
  equipmentFailureRiskPercent: number;
  recommendedMitigations: string[];
}

export interface DigitalTwinNode {
  id: string;
  name: string;
  type: DigitalTwinType;
  physicalEntityRef: PhysicalEntityRef;
  parentTwinId?: string;
  childTwinIds: string[];
  state: TwinTelemetryState;
  simulationParams: SimulationParameters;
  predictions: PredictiveTwinMetrics;
  lastSimulatedIso: string;
}

export interface WhatIfScenarioInput {
  targetTwinId: string;
  additionalArrivalsPerHour: number;
  staffAbsenceCount: number;
  offlineEquipmentCount: number;
  simulationDurationMinutes: number;
}

export interface WhatIfSimulationResult {
  scenarioId: string;
  targetTwinId: string;
  baselineMetrics: PredictiveTwinMetrics;
  projectedMetrics: PredictiveTwinMetrics;
  projectedPeakOccupancy: number;
  projectedMaxWaitMinutes: number;
  breachThreeMinuteResponseTarget: boolean;
  recommendedActionPlan: string[];
  simulationTimestampIso: string;
}
