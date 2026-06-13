import { Injectable } from '@nestjs/common';
import { EmergencyPatientService } from './emergency-os.services';
import type { CapacityBand, EmergencyModuleEnvelope } from './emergency-os.types';

type InterventionType =
  | 'increase_staff'
  | 'open_fast_track'
  | 'ambulance_diversion'
  | 'discharge_acceleration';

type FederatedModelMetric = 'auc' | 'calibration' | 'sensitivity' | 'specificity';
type TwinInterventionType = InterventionType | 'add_observation_beds' | 'split_flow_triage';

interface LiveEdStateInput {
  timestamp?: string;
  census?: number;
  waitingPatients?: number;
  boardingCount?: number;
  staffedBeds?: number;
  treatmentRooms?: number;
  physicians?: number;
  nurses?: number;
  arrivalsPerHour?: number;
  acuityMix?: Partial<Record<'P1' | 'P2' | 'P3' | 'P4' | 'P5', number>>;
  source?: string;
}

interface LiveEdState {
  timestamp: string;
  census: number;
  waitingPatients: number;
  boardingCount: number;
  staffedBeds: number;
  treatmentRooms: number;
  physicians: number;
  nurses: number;
  arrivalsPerHour: number;
  acuityMix: Record<'P1' | 'P2' | 'P3' | 'P4' | 'P5', number>;
  source: string;
}

interface InterventionInput {
  type: InterventionType;
  intensity?: number;
  durationMinutes?: number;
}

interface InterventionEvaluation {
  intervention: InterventionInput;
  expectedImprovement: {
    waitMinutes: number;
    censusReduction: number;
    utilizationReduction: number;
    boardingReduction: number;
  };
  recoveryTimeMinutes: number;
  timeToImplementMinutes: number;
  confidence: number;
  fourHourForecast: ForecastPoint[];
  actionRecommendations: string[];
}

interface ForecastPoint {
  minute: number;
  census: number;
  waitingPatients: number;
  averageWaitMinutes: number;
  resourceUtilization: number;
  capacityBand: CapacityBand;
}

interface FederatedHospital {
  hospitalId: string;
  name: string;
  region: string;
  sampleCapacity: number;
  privacyBudget: number;
  registeredAt: string;
  status: 'registered' | 'active';
}

interface LocalModelUpdate {
  hospitalId: string;
  round?: number;
  sampleCount: number;
  weights: Record<string, number>;
  metrics?: Partial<Record<FederatedModelMetric, number>>;
  differentialPrivacy?: boolean;
}

interface GlobalModel {
  modelId: string;
  round: number;
  weights: Record<string, number>;
  metrics: Record<FederatedModelMetric, number>;
  updatedAt: string;
  contributors: Array<{ hospitalId: string; sampleCount: number; contributionWeight: number }>;
}

interface DigitalTwinStateInput extends LiveEdStateInput {
  twinId?: string;
  includeTrace?: boolean;
}

interface DigitalTwinState {
  twinId: string;
  synchronizedAt: string;
  status: 'initialized' | 'simulated';
  state: LiveEdState;
  calibrationError: number;
  lastEventTrace: DigitalTwinEvent[];
}

interface DigitalTwinEvent {
  minute: number;
  type: 'arrival' | 'triage' | 'provider' | 'boarding' | 'discharge' | 'staff-fatigue';
  description: string;
  census: number;
  waitingPatients: number;
}

interface TwinMetrics {
  throughput: number;
  averageWaitMinutes: number;
  lengthOfStayMinutes: number;
  lwbsRate: number;
  burnoutIndex: number;
  bedUtilization: number;
  physicianUtilization: number;
  nurseUtilization: number;
  calibrationError: number;
  confidenceIntervals: {
    averageWaitMinutes: [number, number];
    throughput: [number, number];
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function envelope<T>(
  module: string,
  data: T,
  remainingGaps: string[] = [],
): EmergencyModuleEnvelope<T> {
  return {
    module,
    generatedAt: new Date().toISOString(),
    source: 'backend-fixture',
    status: remainingGaps.length ? 'placeholder' : 'active',
    data,
    remainingGaps,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function round(value: number, precision = 0): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function capacityBand(score: number): CapacityBand {
  if (score >= 85) return 'Red';
  if (score >= 70) return 'Orange';
  if (score >= 50) return 'Yellow';
  return 'Green';
}

function weightedAverage(live: number, historical: number): number {
  return round(live * 0.7 + historical * 0.3, 2);
}

function normalizeAcuity(input?: Partial<LiveEdState['acuityMix']>): LiveEdState['acuityMix'] {
  const fallback = { P1: 0.08, P2: 0.22, P3: 0.42, P4: 0.2, P5: 0.08 };
  const merged = { ...fallback, ...(input || {}) };
  const total = Object.values(merged).reduce((sum, value) => sum + value, 0) || 1;
  return {
    P1: round(merged.P1 / total, 3),
    P2: round(merged.P2 / total, 3),
    P3: round(merged.P3 / total, 3),
    P4: round(merged.P4 / total, 3),
    P5: round(merged.P5 / total, 3),
  };
}

@Injectable()
export class RealTimeSimulationService {
  private readonly historicalDistribution = {
    census: 42,
    waitingPatients: 12,
    boardingCount: 5,
    staffedBeds: 36,
    treatmentRooms: 28,
    physicians: 5,
    nurses: 14,
    arrivalsPerHour: 7,
    averageWaitMinutes: 58,
  };

  private liveState: LiveEdState | null = null;

  constructor(private readonly patientService: EmergencyPatientService) {}

  updateLiveState(input: LiveEdStateInput = {}) {
    const state = this.fuseLiveState(input);
    this.liveState = state;
    return envelope(
      'Real-Time Simulation',
      {
        liveState: state,
        currentStatus: this.buildCurrentStatus(state),
        fourHourForecast: this.generateForecast(state),
      },
      [
        'Live ADT/EHR/device feeds are not connected; fixture and request payload values drive the simulation.',
      ],
    );
  }

  evaluateIntervention(input: InterventionInput) {
    const state = this.getLiveState();
    const evaluation = this.evaluate(state, {
      type: input?.type || 'increase_staff',
      intensity: clamp(input?.intensity ?? 1, 0.5, 3),
      durationMinutes: clamp(input?.durationMinutes ?? 240, 30, 480),
    });
    return envelope(
      'Real-Time Simulation',
      {
        currentStatus: this.buildCurrentStatus(state),
        evaluation,
      },
      ['Recommendations require clinical operations review before use in production workflows.'],
    );
  }

  compareInterventions(input: { interventions?: InterventionInput[] } = {}) {
    const state = this.getLiveState();
    const interventions = input.interventions?.length
      ? input.interventions
      : [
          { type: 'increase_staff', intensity: 1 },
          { type: 'open_fast_track', intensity: 1 },
          { type: 'ambulance_diversion', intensity: 1 },
          { type: 'discharge_acceleration', intensity: 1 },
        ];
    const ranked = interventions
      .map((intervention) => this.evaluate(state, intervention))
      .sort((a, b) => a.recoveryTimeMinutes - b.recoveryTimeMinutes);
    return envelope(
      'Real-Time Simulation',
      {
        currentStatus: this.buildCurrentStatus(state),
        rankedInterventions: ranked,
        bestIntervention: ranked[0],
      },
      ['Financial, staffing, and ambulance-region constraints are placeholder contracts only.'],
    );
  }

  getRecommendations() {
    const state = this.getLiveState();
    const ranked = this.compareInterventions().data.rankedInterventions;
    const baselineForecast = this.generateForecast(state);
    const projectedDeteriorationTime = baselineForecast.find(
      (point) => point.capacityBand === 'Red',
    )?.minute;
    return envelope(
      'Real-Time Simulation',
      {
        currentStatus: this.buildCurrentStatus(state),
        projectedDeteriorationTimeMinutes: projectedDeteriorationTime ?? null,
        recommendations: ranked.slice(0, 3).map((evaluation) => ({
          intervention: evaluation.intervention.type,
          expectedImprovement: evaluation.expectedImprovement,
          confidence: evaluation.confidence,
          timeToImplementMinutes: evaluation.timeToImplementMinutes,
          recoveryTimeMinutes: evaluation.recoveryTimeMinutes,
          projectedDeteriorationTimeMinutes: projectedDeteriorationTime ?? null,
          actionRecommendations: evaluation.actionRecommendations,
        })),
        fourHourForecast: baselineForecast,
      },
      [
        'Projected deterioration is deterministic fixture-backed decision support, not a monitored live forecast.',
      ],
    );
  }

  private getLiveState(): LiveEdState {
    if (!this.liveState) {
      this.liveState = this.fuseLiveState();
    }
    return clone(this.liveState);
  }

  private fuseLiveState(input: LiveEdStateInput = {}): LiveEdState {
    const capacity = this.patientService.computeCapacity();
    const patients = this.patientService.listPatients();
    const rooms = this.patientService.listRooms();
    const staff = this.patientService.listStaff();
    const waitingPatients = patients.filter((patient) => patient.state === 'Waiting').length;
    const boardingCount = capacity.boardingCount;
    const live = {
      census: input.census ?? capacity.totalPatients,
      waitingPatients: input.waitingPatients ?? waitingPatients,
      boardingCount: input.boardingCount ?? boardingCount,
      staffedBeds:
        input.staffedBeds ?? rooms.filter((room) => room.status !== 'Blocked').length * 4,
      treatmentRooms: input.treatmentRooms ?? rooms.length,
      physicians:
        input.physicians ?? Math.max(1, staff.filter((member) => member.role === 'MD').length),
      nurses:
        input.nurses ?? Math.max(1, staff.filter((member) => member.role === 'RN').length * 4),
      arrivalsPerHour: input.arrivalsPerHour ?? Math.max(4, Math.round(capacity.totalPatients / 2)),
    };
    return {
      timestamp: input.timestamp || new Date().toISOString(),
      census: round(weightedAverage(live.census, this.historicalDistribution.census)),
      waitingPatients: round(
        weightedAverage(live.waitingPatients, this.historicalDistribution.waitingPatients),
      ),
      boardingCount: round(
        weightedAverage(live.boardingCount, this.historicalDistribution.boardingCount),
      ),
      staffedBeds: round(
        weightedAverage(live.staffedBeds, this.historicalDistribution.staffedBeds),
      ),
      treatmentRooms: round(
        weightedAverage(live.treatmentRooms, this.historicalDistribution.treatmentRooms),
      ),
      physicians: round(weightedAverage(live.physicians, this.historicalDistribution.physicians)),
      nurses: round(weightedAverage(live.nurses, this.historicalDistribution.nurses)),
      arrivalsPerHour: round(
        weightedAverage(live.arrivalsPerHour, this.historicalDistribution.arrivalsPerHour),
        1,
      ),
      acuityMix: normalizeAcuity(input.acuityMix),
      source: input.source || 'fixture-live-fusion',
    };
  }

  private buildCurrentStatus(state: LiveEdState) {
    const utilization = this.resourceUtilization(state);
    const waitMinutes = this.estimateWaitMinutes(state, utilization);
    return {
      capacityBand: capacityBand(utilization),
      resourceUtilization: utilization,
      averageWaitMinutes: waitMinutes,
      census: state.census,
      waitingPatients: state.waitingPatients,
      boardingCount: state.boardingCount,
      deteriorationRisk:
        utilization >= 85 || waitMinutes >= 90 ? 'high' : utilization >= 70 ? 'moderate' : 'low',
    };
  }

  private evaluate(state: LiveEdState, intervention: InterventionInput): InterventionEvaluation {
    const effect = this.interventionEffect(intervention.type, intervention.intensity ?? 1);
    const timeToImplementMinutes = effect.timeToImplementMinutes;
    const adjustedState: LiveEdState = {
      ...state,
      census: clamp(state.census - effect.censusReduction, 0, 200),
      waitingPatients: clamp(state.waitingPatients - effect.waitingReduction, 0, 200),
      boardingCount: clamp(state.boardingCount - effect.boardingReduction, 0, 100),
      staffedBeds: state.staffedBeds + effect.staffedBedIncrease,
      physicians: state.physicians + effect.physicianIncrease,
      nurses: state.nurses + effect.nurseIncrease,
      arrivalsPerHour: clamp(state.arrivalsPerHour - effect.arrivalReduction, 0, 50),
    };
    const baselineWait = this.estimateWaitMinutes(state, this.resourceUtilization(state));
    const adjustedUtilization = this.resourceUtilization(adjustedState);
    const adjustedWait = this.estimateWaitMinutes(adjustedState, adjustedUtilization);
    const fourHourForecast = this.generateForecast(adjustedState);
    const recoveryPoint = fourHourForecast.find(
      (point) => point.resourceUtilization < 70 && point.averageWaitMinutes < 45,
    );
    return {
      intervention,
      expectedImprovement: {
        waitMinutes: Math.max(0, baselineWait - adjustedWait),
        censusReduction: round(state.census - adjustedState.census, 1),
        utilizationReduction: Math.max(
          0,
          round(this.resourceUtilization(state) - adjustedUtilization, 1),
        ),
        boardingReduction: round(state.boardingCount - adjustedState.boardingCount, 1),
      },
      recoveryTimeMinutes: recoveryPoint?.minute ?? 240,
      timeToImplementMinutes,
      confidence: effect.confidence,
      fourHourForecast,
      actionRecommendations: effect.actions,
    };
  }

  private interventionEffect(type: InterventionType, intensity: number) {
    const scaled = clamp(intensity, 0.5, 3);
    const effects = {
      increase_staff: {
        staffedBedIncrease: 3 * scaled,
        physicianIncrease: 1 * scaled,
        nurseIncrease: 3 * scaled,
        waitingReduction: 4 * scaled,
        censusReduction: 1 * scaled,
        boardingReduction: 0.5 * scaled,
        arrivalReduction: 0,
        timeToImplementMinutes: 45,
        confidence: 0.78,
        actions: [
          'Call in flex RN/MD pool',
          'Rebalance high-acuity assignments',
          'Open rapid provider-in-triage lane',
        ],
      },
      open_fast_track: {
        staffedBedIncrease: 4 * scaled,
        physicianIncrease: 0.5 * scaled,
        nurseIncrease: 2 * scaled,
        waitingReduction: 6 * scaled,
        censusReduction: 3 * scaled,
        boardingReduction: 0,
        arrivalReduction: 0,
        timeToImplementMinutes: 30,
        confidence: 0.82,
        actions: [
          'Segment P4/P5 patients',
          'Assign fast-track nurse',
          'Protect provider from high-acuity interruptions',
        ],
      },
      ambulance_diversion: {
        staffedBedIncrease: 0,
        physicianIncrease: 0,
        nurseIncrease: 0,
        waitingReduction: 2 * scaled,
        censusReduction: 2 * scaled,
        boardingReduction: 0,
        arrivalReduction: 2.5 * scaled,
        timeToImplementMinutes: 20,
        confidence: 0.66,
        actions: [
          'Confirm regional diversion policy',
          'Notify EMS dispatch',
          'Reassess every 30 minutes',
        ],
      },
      discharge_acceleration: {
        staffedBedIncrease: 2 * scaled,
        physicianIncrease: 0,
        nurseIncrease: 1 * scaled,
        waitingReduction: 3 * scaled,
        censusReduction: 5 * scaled,
        boardingReduction: 2.5 * scaled,
        arrivalReduction: 0,
        timeToImplementMinutes: 60,
        confidence: 0.74,
        actions: [
          'Run disposition huddle',
          'Expedite transport and prescriptions',
          'Escalate accepted boarders to bed desk',
        ],
      },
    };
    return effects[type];
  }

  private generateForecast(state: LiveEdState): ForecastPoint[] {
    return [0, 60, 120, 180, 240].map((minute) => {
      const inflow = (state.arrivalsPerHour * minute) / 60;
      const throughput = ((state.physicians * 2.4 + state.nurses * 0.55) * minute) / 60;
      const boardingDrag = state.boardingCount * (minute / 240) * 0.6;
      const census = clamp(state.census + inflow - throughput + boardingDrag, 0, 200);
      const waitingPatients = clamp(
        state.waitingPatients + inflow * 0.45 - throughput * 0.35,
        0,
        200,
      );
      const forecastState = { ...state, census, waitingPatients };
      const resourceUtilization = this.resourceUtilization(forecastState);
      return {
        minute,
        census: round(census, 1),
        waitingPatients: round(waitingPatients, 1),
        averageWaitMinutes: this.estimateWaitMinutes(forecastState, resourceUtilization),
        resourceUtilization,
        capacityBand: capacityBand(resourceUtilization),
      };
    });
  }

  private resourceUtilization(state: LiveEdState): number {
    const bedPressure = (state.census / Math.max(state.staffedBeds, 1)) * 62;
    const providerPressure = (state.waitingPatients / Math.max(state.physicians * 4, 1)) * 22;
    const boardingPressure = (state.boardingCount / Math.max(state.treatmentRooms, 1)) * 28;
    return clamp(round(bedPressure + providerPressure + boardingPressure), 0, 100);
  }

  private estimateWaitMinutes(state: LiveEdState, utilization: number): number {
    const acuityMultiplier = 1 + state.acuityMix.P1 * 0.7 + state.acuityMix.P2 * 0.35;
    const wait =
      this.historicalDistribution.averageWaitMinutes * (utilization / 70) * acuityMultiplier;
    return Math.max(5, Math.round(wait));
  }
}

@Injectable()
export class FederatedLearningService {
  private readonly hospitals = new Map<string, FederatedHospital>();
  private readonly pendingUpdates: LocalModelUpdate[] = [];
  private globalModel: GlobalModel = {
    modelId: 'ed-flow-risk-federated-v1',
    round: 0,
    weights: {
      intercept: -0.18,
      waitingPatients: 0.24,
      boardingCount: 0.31,
      acuityP1P2: 0.28,
      nurseCoverage: -0.16,
    },
    metrics: {
      auc: 0.74,
      calibration: 0.91,
      sensitivity: 0.72,
      specificity: 0.69,
    },
    updatedAt: new Date(0).toISOString(),
    contributors: [],
  };

  registerHospital(input: Partial<FederatedHospital>) {
    const hospitalId = input.hospitalId || `hospital-${this.hospitals.size + 1}`;
    const hospital: FederatedHospital = {
      hospitalId,
      name: input.name || `Emergency Hospital ${this.hospitals.size + 1}`,
      region: input.region || 'demo-region',
      sampleCapacity: Math.max(1, input.sampleCapacity || 1000),
      privacyBudget: input.privacyBudget ?? 1,
      registeredAt: input.registeredAt || new Date().toISOString(),
      status: 'registered',
    };
    this.hospitals.set(hospitalId, hospital);
    return envelope('Federated Learning', { hospital }, this.productionGaps());
  }

  receiveLocalUpdate(input: LocalModelUpdate) {
    const hospital =
      this.hospitals.get(input.hospitalId) ||
      this.registerHospital({ hospitalId: input.hospitalId, name: input.hospitalId }).data.hospital;
    const update: LocalModelUpdate = {
      hospitalId: hospital.hospitalId,
      round: input.round ?? this.globalModel.round + 1,
      sampleCount: Math.max(1, input.sampleCount || hospital.sampleCapacity),
      weights: this.applyDeterministicPrivacy(
        input.weights || {},
        Boolean(input.differentialPrivacy),
      ),
      metrics: input.metrics || {},
      differentialPrivacy: Boolean(input.differentialPrivacy),
    };
    this.pendingUpdates.push(update);
    this.hospitals.set(hospital.hospitalId, { ...hospital, status: 'active' });
    return envelope(
      'Federated Learning',
      {
        accepted: true,
        pendingUpdates: this.pendingUpdates.length,
        update,
        secureAggregationContract: 'placeholder-secure-aggregation-required-before-production',
      },
      this.productionGaps(),
    );
  }

  aggregateRound() {
    if (!this.pendingUpdates.length) {
      return envelope(
        'Federated Learning',
        { globalModel: this.globalModel, aggregated: false },
        this.productionGaps(),
      );
    }
    const totalSamples = this.pendingUpdates.reduce((sum, update) => sum + update.sampleCount, 0);
    const weightNames = Array.from(
      new Set(this.pendingUpdates.flatMap((update) => Object.keys(update.weights))),
    );
    const weights = Object.fromEntries(
      weightNames.map((name) => [
        name,
        round(
          this.pendingUpdates.reduce(
            (sum, update) =>
              sum +
              (update.weights[name] ?? this.globalModel.weights[name] ?? 0) * update.sampleCount,
            0,
          ) / totalSamples,
          5,
        ),
      ]),
    );
    const metricNames: FederatedModelMetric[] = [
      'auc',
      'calibration',
      'sensitivity',
      'specificity',
    ];
    const metrics = Object.fromEntries(
      metricNames.map((metric) => [
        metric,
        round(
          this.pendingUpdates.reduce(
            (sum, update) =>
              sum +
              (update.metrics?.[metric] ?? this.globalModel.metrics[metric]) * update.sampleCount,
            0,
          ) / totalSamples,
          4,
        ),
      ]),
    ) as Record<FederatedModelMetric, number>;
    const contributors = this.pendingUpdates.map((update) => ({
      hospitalId: update.hospitalId,
      sampleCount: update.sampleCount,
      contributionWeight: round(update.sampleCount / totalSamples, 4),
    }));
    this.globalModel = {
      modelId: this.globalModel.modelId,
      round: this.globalModel.round + 1,
      weights,
      metrics,
      updatedAt: new Date().toISOString(),
      contributors,
    };
    this.pendingUpdates.length = 0;
    return envelope(
      'Federated Learning',
      {
        aggregated: true,
        globalModel: this.globalModel,
        broadcastContract: 'placeholder-hospital-broadcast-webhook',
      },
      this.productionGaps(),
    );
  }

  getGlobalModel(hospitalId: string) {
    const hospital = this.hospitals.get(hospitalId);
    return envelope(
      'Federated Learning',
      {
        hospitalId,
        authorized: Boolean(hospital),
        globalModel: this.globalModel,
        secureAggregationContract: 'placeholder-homomorphic-encryption-or-secure-enclave-required',
      },
      hospital
        ? this.productionGaps()
        : ['Hospital must be registered before production model access.'],
    );
  }

  getDashboard() {
    const hospitals = Array.from(this.hospitals.values());
    return envelope(
      'Federated Learning',
      {
        activeHospitals: hospitals.filter((hospital) => hospital.status === 'active').length,
        registeredHospitals: hospitals.length,
        currentRound: this.globalModel.round,
        lastAggregation: this.globalModel.updatedAt,
        modelPerformance: this.globalModel.metrics,
        pendingUpdates: this.pendingUpdates.length,
        hospitalContributions: this.globalModel.contributors,
        hospitals,
      },
      this.productionGaps(),
    );
  }

  private applyDeterministicPrivacy(
    weights: Record<string, number>,
    enabled: boolean,
  ): Record<string, number> {
    if (!enabled) return { ...weights };
    return Object.fromEntries(
      Object.entries(weights).map(([key, value], index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        return [key, round(value + direction * 0.0005 * (index + 1), 5)];
      }),
    );
  }

  private productionGaps(): string[] {
    return [
      'Secure aggregation and homomorphic encryption are placeholder contracts.',
      'Durable model registry and hospital broadcast delivery are not connected.',
      'No PHI leaves the fixture contract; production deployment requires privacy/legal review.',
    ];
  }
}

@Injectable()
export class HybridDigitalTwinService {
  private twin: DigitalTwinState | null = null;

  constructor(private readonly simulationService: RealTimeSimulationService) {}

  initialize(input: DigitalTwinStateInput = {}) {
    const state = this.extractState(this.simulationService.updateLiveState(input).data.liveState);
    this.twin = {
      twinId: input.twinId || 'ed-hybrid-des-abm-twin-demo',
      synchronizedAt: new Date().toISOString(),
      status: 'initialized',
      state,
      calibrationError: this.calibrationError(state),
      lastEventTrace: [],
    };
    return envelope('Hybrid DES-ABM Digital Twin', { twin: this.twin }, this.productionGaps());
  }

  simulate(input: { horizonMinutes?: number; includeTrace?: boolean } = {}) {
    const twin = this.ensureTwin();
    const result = this.runSimulation(
      twin.state,
      input.horizonMinutes ?? 240,
      [],
      Boolean(input.includeTrace),
    );
    this.twin = {
      ...twin,
      status: 'simulated',
      synchronizedAt: new Date().toISOString(),
      calibrationError: result.metrics.calibrationError,
      lastEventTrace: result.eventTrace,
    };
    return envelope(
      'Hybrid DES-ABM Digital Twin',
      {
        twin: this.twin,
        metrics: result.metrics,
        eventTrace: input.includeTrace ? result.eventTrace : [],
      },
      this.productionGaps(),
    );
  }

  getState() {
    const twin = this.ensureTwin();
    return envelope(
      'Hybrid DES-ABM Digital Twin',
      {
        twin,
        currentMetrics: this.metricsFromState(twin.state, twin.calibrationError),
      },
      this.productionGaps(),
    );
  }

  evaluateScenario(input: {
    interventions?: Array<{ type: TwinInterventionType; intensity?: number }>;
    horizonMinutes?: number;
    includeTrace?: boolean;
  }) {
    const twin = this.ensureTwin();
    const interventions: Array<{ type: TwinInterventionType; intensity?: number }> = input
      .interventions?.length
      ? input.interventions
      : [{ type: 'split_flow_triage', intensity: 1 }];
    const result = this.runSimulation(
      twin.state,
      input.horizonMinutes ?? 240,
      interventions,
      Boolean(input.includeTrace),
    );
    return envelope(
      'Hybrid DES-ABM Digital Twin',
      {
        baseline: this.metricsFromState(twin.state, twin.calibrationError),
        scenario: {
          interventions,
          metrics: result.metrics,
          eventTrace: input.includeTrace ? result.eventTrace : [],
        },
      },
      this.productionGaps(),
    );
  }

  private ensureTwin(): DigitalTwinState {
    if (!this.twin) {
      return this.initialize().data.twin;
    }
    return clone(this.twin);
  }

  private extractState(state: LiveEdState): LiveEdState {
    return clone(state);
  }

  private runSimulation(
    state: LiveEdState,
    horizonMinutes: number,
    interventions: Array<{ type: TwinInterventionType; intensity?: number }>,
    includeTrace: boolean,
  ) {
    const interventionEffect = this.twinInterventionEffect(interventions);
    let census = clamp(state.census - interventionEffect.initialCensusReduction, 0, 200);
    let waitingPatients = clamp(
      state.waitingPatients - interventionEffect.initialWaitReduction,
      0,
      200,
    );
    let burnoutIndex = clamp(
      52 + this.utilization(state) * 0.35 - interventionEffect.staffRelief,
      0,
      100,
    );
    const eventTrace: DigitalTwinEvent[] = [];
    const stepMinutes = 30;
    let throughput = 0;

    for (let minute = stepMinutes; minute <= horizonMinutes; minute += stepMinutes) {
      const arrivals = (state.arrivalsPerHour * stepMinutes) / 60;
      const providerThroughput =
        ((state.physicians + interventionEffect.providerBoost) * 2.1 +
          (state.nurses + interventionEffect.nurseBoost) * 0.45) *
        (stepMinutes / 60);
      const boardingDrag = state.boardingCount * 0.04;
      census = clamp(census + arrivals - providerThroughput + boardingDrag, 0, 220);
      waitingPatients = clamp(
        waitingPatients + arrivals * 0.42 - providerThroughput * 0.32,
        0,
        220,
      );
      throughput += Math.max(0, providerThroughput - boardingDrag);
      burnoutIndex = clamp(
        burnoutIndex + (this.utilization({ ...state, census, waitingPatients }) - 70) * 0.02,
        0,
        100,
      );

      if (includeTrace) {
        eventTrace.push({
          minute,
          type: minute % 120 === 0 ? 'boarding' : minute % 90 === 0 ? 'staff-fatigue' : 'provider',
          description: `DES event processed with ABM staff fatigue ${round(burnoutIndex, 1)} and census ${round(census, 1)}.`,
          census: round(census, 1),
          waitingPatients: round(waitingPatients, 1),
        });
      }
    }

    const simulatedState = { ...state, census, waitingPatients };
    return {
      metrics: {
        ...this.metricsFromState(simulatedState, this.calibrationError(simulatedState)),
        throughput: round(throughput, 1),
        burnoutIndex: round(burnoutIndex, 1),
      },
      eventTrace,
    };
  }

  private twinInterventionEffect(
    interventions: Array<{ type: TwinInterventionType; intensity?: number }>,
  ) {
    return interventions.reduce(
      (effect, intervention) => {
        const intensity = clamp(intervention.intensity ?? 1, 0.5, 3);
        if (intervention.type === 'increase_staff') {
          effect.providerBoost += 1 * intensity;
          effect.nurseBoost += 3 * intensity;
          effect.staffRelief += 8 * intensity;
        }
        if (intervention.type === 'open_fast_track' || intervention.type === 'split_flow_triage') {
          effect.initialWaitReduction += 5 * intensity;
          effect.providerBoost += 0.5 * intensity;
        }
        if (
          intervention.type === 'discharge_acceleration' ||
          intervention.type === 'add_observation_beds'
        ) {
          effect.initialCensusReduction += 4 * intensity;
          effect.initialWaitReduction += 2 * intensity;
        }
        if (intervention.type === 'ambulance_diversion') {
          effect.initialCensusReduction += 2 * intensity;
          effect.initialWaitReduction += 1 * intensity;
        }
        return effect;
      },
      {
        providerBoost: 0,
        nurseBoost: 0,
        initialCensusReduction: 0,
        initialWaitReduction: 0,
        staffRelief: 0,
      },
    );
  }

  private metricsFromState(state: LiveEdState, calibrationError: number): TwinMetrics {
    const utilization = this.utilization(state);
    const averageWaitMinutes = Math.max(
      5,
      Math.round(35 + state.waitingPatients * 3.8 + utilization * 0.45),
    );
    const throughput = Math.max(1, round(state.physicians * 2.1 + state.nurses * 0.45, 1));
    return {
      throughput,
      averageWaitMinutes,
      lengthOfStayMinutes: Math.round(160 + state.boardingCount * 18 + utilization * 1.4),
      lwbsRate: round(clamp((averageWaitMinutes - 35) / 500, 0.01, 0.18), 3),
      burnoutIndex: round(clamp(42 + utilization * 0.42 + state.boardingCount * 1.8, 0, 100), 1),
      bedUtilization: utilization,
      physicianUtilization: clamp(
        round((state.waitingPatients / Math.max(state.physicians * 4, 1)) * 100),
        0,
        100,
      ),
      nurseUtilization: clamp(round((state.census / Math.max(state.nurses * 3, 1)) * 100), 0, 100),
      calibrationError,
      confidenceIntervals: {
        averageWaitMinutes: [Math.max(0, averageWaitMinutes - 9), averageWaitMinutes + 11],
        throughput: [Math.max(0, round(throughput - 1.4, 1)), round(throughput + 1.6, 1)],
      },
    };
  }

  private utilization(state: LiveEdState): number {
    return clamp(
      round((state.census / Math.max(state.staffedBeds, 1)) * 72 + state.boardingCount * 3),
      0,
      100,
    );
  }

  private calibrationError(state: LiveEdState): number {
    return round(Math.abs(state.census - 42) / 100 + Math.abs(state.waitingPatients - 12) / 120, 3);
  }

  private productionGaps(): string[] {
    return [
      'DES engine calibration is deterministic fixture logic until validated against local ED timestamps.',
      'ABM patient/staff behavior parameters require hospital-specific calibration.',
      'Live ADT/EHR/device synchronization and database persistence are not connected.',
    ];
  }
}
