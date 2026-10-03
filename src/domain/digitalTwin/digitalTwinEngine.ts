/**
 * CareDroid Digital Twin Engine
 * Simulates hospital physical assets, clinical flows, queue pressure,
 * and what-if operational scenarios to predict bottlenecks before they impact patient care.
 */

import {
  DigitalTwinNode,
  DigitalTwinType,
  PredictiveTwinMetrics,
  TwinTelemetryState,
  WhatIfScenarioInput,
  WhatIfSimulationResult,
} from './digitalTwinTypes';

export class DigitalTwinEngine {
  private static instance: DigitalTwinEngine;
  private twins: Map<string, DigitalTwinNode> = new Map();

  constructor() {
    this.seedDefaultTwins();
  }

  public static getInstance(): DigitalTwinEngine {
    if (!DigitalTwinEngine.instance) {
      DigitalTwinEngine.instance = new DigitalTwinEngine();
    }
    return DigitalTwinEngine.instance;
  }

  public registerTwin(node: DigitalTwinNode): void {
    this.twins.set(node.id, { ...node });
  }

  public getTwin(id: string): DigitalTwinNode | undefined {
    return this.twins.get(id);
  }

  public listTwins(typeFilter?: DigitalTwinType): DigitalTwinNode[] {
    const list = Array.from(this.twins.values());
    if (typeFilter) {
      return list.filter((t) => t.type === typeFilter);
    }
    return list;
  }

  public syncPhysicalTelemetry(twinId: string, state: Partial<TwinTelemetryState>): boolean {
    const twin = this.twins.get(twinId);
    if (!twin) return false;

    twin.state = {
      ...twin.state,
      ...state,
      telemetryTimestampIso: new Date().toISOString(),
    };

    twin.predictions = this.computePredictions(twin);
    twin.lastSimulatedIso = new Date().toISOString();
    return true;
  }

  public simulateWhatIfScenario(scenario: WhatIfScenarioInput): WhatIfSimulationResult {
    const twin = this.twins.get(scenario.targetTwinId);
    if (!twin) {
      throw new Error(`Target digital twin '${scenario.targetTwinId}' not found.`);
    }

    const baseline = { ...twin.predictions };

    const effectiveArrivalRate =
      twin.simulationParams.arrivalRatePatientsPerHour + scenario.additionalArrivalsPerHour;

    const projectedPeakOccupancy = Math.min(
      twin.state.maxCapacity * 1.5,
      twin.state.currentOccupancy +
        Math.round((effectiveArrivalRate * scenario.simulationDurationMinutes) / 60),
    );

    const occupancyRate = projectedPeakOccupancy / twin.state.maxCapacity;

    const projectedMaxWaitMinutes = Math.round(
      twin.predictions.projectedWaitTimeMinutes * (1 + occupancyRate * 0.8) +
        scenario.staffAbsenceCount * 18 +
        scenario.offlineEquipmentCount * 12,
    );

    const surgeRiskScore = Math.min(
      100,
      Math.round(
        occupancyRate * 60 +
          (scenario.staffAbsenceCount / 3) * 25 +
          (effectiveArrivalRate / 10) * 15,
      ),
    );

    const bottleneckProb = Math.min(99, Math.round(surgeRiskScore * 0.95));
    const breachTarget = surgeRiskScore > 75 || projectedMaxWaitMinutes > 45;

    const recommendedActionPlan: string[] = [];
    if (occupancyRate > 0.9) {
      recommendedActionPlan.push(
        'Trigger Level 2 ED Surge Protocol: Divert non-critical walk-ins to Urgent Care Clinic.',
      );
    }
    if (scenario.staffAbsenceCount > 0) {
      recommendedActionPlan.push('Deploy On-Call Nurse float pool to Acute Treatment Bays.');
    }
    if (scenario.offlineEquipmentCount > 0) {
      recommendedActionPlan.push(
        'Dispatch Robotics Pharmacy/Lab Tug to restock backup diagnostic carts.',
      );
    }
    if (breachTarget) {
      recommendedActionPlan.push(
        'HIGH RISK OF BREACHING 3-MINUTE RESPONSE TARGET: Designate secondary resuscitation team immediately.',
      );
    }

    const projectedMetrics: PredictiveTwinMetrics = {
      surgeRiskScore,
      bottleneckProbabilityPercent: bottleneckProb,
      projectedWaitTimeMinutes: projectedMaxWaitMinutes,
      predictedBedShortageInMinutes: occupancyRate > 0.9 ? 30 : 180,
      equipmentFailureRiskPercent: Math.min(
        80,
        twin.predictions.equipmentFailureRiskPercent + scenario.offlineEquipmentCount * 15,
      ),
      recommendedMitigations: recommendedActionPlan,
    };

    return {
      scenarioId: `sim-${Date.now()}`,
      targetTwinId: twin.id,
      baselineMetrics: baseline,
      projectedMetrics,
      projectedPeakOccupancy,
      projectedMaxWaitMinutes,
      breachThreeMinuteResponseTarget: breachTarget,
      recommendedActionPlan,
      simulationTimestampIso: new Date().toISOString(),
    };
  }

  private computePredictions(twin: DigitalTwinNode): PredictiveTwinMetrics {
    const occupancyRatio = twin.state.currentOccupancy / twin.state.maxCapacity;
    const surgeRiskScore = Math.min(
      100,
      Math.round(occupancyRatio * 70 + (twin.state.activeQueueDepth / 10) * 30),
    );
    const waitMinutes = Math.round(15 + occupancyRatio * 45 + twin.state.activeQueueDepth * 4);

    const mitigations: string[] = [];
    if (surgeRiskScore > 80) {
      mitigations.push('Activate surge staffing protocol');
      mitigations.push('Expedite inpatient bed board turnaround');
    } else if (surgeRiskScore > 60) {
      mitigations.push('Monitor acute queue for deteriorating patients');
    }

    return {
      surgeRiskScore,
      bottleneckProbabilityPercent: Math.min(95, Math.round(surgeRiskScore * 0.9)),
      projectedWaitTimeMinutes: waitMinutes,
      predictedBedShortageInMinutes: occupancyRatio > 0.85 ? 45 : 240,
      equipmentFailureRiskPercent: 4.5,
      recommendedMitigations: mitigations,
    };
  }

  private seedDefaultTwins(): void {
    const edTwin: DigitalTwinNode = {
      id: 'twin-ed-metro',
      name: 'Metro Hospital Emergency Department',
      type: 'emergency_department',
      physicalEntityRef: {
        entityId: 'dept-ed-main',
        entityType: 'department',
        sourceSystem: 'CareDroid Hospital Graph',
      },
      childTwinIds: ['twin-trauma-bay-1', 'twin-ct-scanner-01'],
      state: {
        currentOccupancy: 28,
        maxCapacity: 34,
        activeQueueDepth: 9,
        temperatureCelsius: 21.5,
        powerStatus: 'normal',
        telemetryTimestampIso: new Date().toISOString(),
      },
      simulationParams: {
        arrivalRatePatientsPerHour: 8.5,
        averageLengthOfStayMinutes: 185,
        nurseToPatientRatio: 0.25,
        physicianCount: 4,
        equipmentAvailabilityRatio: 0.98,
      },
      predictions: {
        surgeRiskScore: 68,
        bottleneckProbabilityPercent: 62,
        projectedWaitTimeMinutes: 42,
        predictedBedShortageInMinutes: 75,
        equipmentFailureRiskPercent: 3.2,
        recommendedMitigations: ['Prepare overflow flex beds in Observation Unit'],
      },
      lastSimulatedIso: new Date().toISOString(),
    };

    const traumaBayTwin: DigitalTwinNode = {
      id: 'twin-trauma-bay-1',
      name: 'Resuscitation Room 1 (Trauma Bay 1)',
      type: 'resuscitation_bay',
      physicalEntityRef: {
        entityId: 'room-ed-resus-1',
        entityType: 'room',
        sourceSystem: 'CareDroid Space Directory',
      },
      parentTwinId: 'twin-ed-metro',
      childTwinIds: [],
      state: {
        currentOccupancy: 1,
        maxCapacity: 1,
        activeQueueDepth: 0,
        temperatureCelsius: 22.0,
        airChangesPerHour: 20,
        powerStatus: 'normal',
        telemetryTimestampIso: new Date().toISOString(),
      },
      simulationParams: {
        arrivalRatePatientsPerHour: 0.8,
        averageLengthOfStayMinutes: 65,
        nurseToPatientRatio: 2.0,
        physicianCount: 2,
        equipmentAvailabilityRatio: 1.0,
      },
      predictions: {
        surgeRiskScore: 30,
        bottleneckProbabilityPercent: 20,
        projectedWaitTimeMinutes: 0,
        predictedBedShortageInMinutes: 180,
        equipmentFailureRiskPercent: 1.5,
        recommendedMitigations: ['Bay ready for immediate trauma activation'],
      },
      lastSimulatedIso: new Date().toISOString(),
    };

    this.registerTwin(edTwin);
    this.registerTwin(traumaBayTwin);
  }
}

export const digitalTwinEngine = DigitalTwinEngine.getInstance();
