import { Injectable } from '@nestjs/common';
import { performance } from 'node:perf_hooks';

export interface EMS112Call {
  callId: string;
  timestamp: Date;
  location: { lat: number; lng: number; accuracy: number };
  urgencyLevel: 'immediate' | 'emergency' | 'non_urgent';
  callerMetadata: {
    language: string;
    distressLevel: number;
    backgroundNoise: number;
  };
  wearableData?: {
    heartRate: number;
    oxygenSaturation: number;
    fallDetected: boolean;
  };
}

export interface FederatedEMSModel {
  hospitalId: string;
  localModel: Record<string, number>;
  globalModelVersion: string;
  lastSync: Date;
  dataQualityScore: number;
}

interface EMSFeatureVector {
  urgencyScore: number;
  distressScore: number;
  physiologyScore: number;
  locationConfidence: number;
  noisePenalty: number;
}

interface EMSInference {
  score: number;
  confidence: number;
}

interface EMSUnit {
  id: string;
  lat: number;
  lng: number;
  eta: number;
  level: 'basic_life_support' | 'advanced_life_support' | 'critical_care';
}

interface HospitalCapacity {
  id: string;
  lat: number;
  lng: number;
  availableBeds: number;
  resusBeds: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function round(value: number, precision = 3): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

@Injectable()
export class FederatedEMSService {
  private readonly localModels: Map<string, FederatedEMSModel> = new Map();
  private globalModelVersion = 'fed-ems-edge-v1';

  async processEmergencyCall(call: EMS112Call): Promise<{
    triageRecommendation: string;
    priorityCode: number;
    recommendedResources: string[];
    confidence: number;
    inferenceTimeMs: number;
  }> {
    const startTime = performance.now();
    const features = this.extractFeatures(call);
    const inference = await this.predictAtEdge(features);
    const triageResult = this.mapToTriage(inference, call);

    return {
      ...triageResult,
      inferenceTimeMs: round(performance.now() - startTime, 4),
      confidence: inference.confidence,
    };
  }

  async federatedTrainingRound(): Promise<void> {
    const hospitalUpdates = await this.collectLocalUpdates();
    const globalModel = this.aggregateUpdates(hospitalUpdates);
    await this.distributeGlobalModel(globalModel);
  }

  async coordinateDispatch(call: EMS112Call): Promise<{
    nearestAmbulance: string;
    etaMinutes: number;
    destinationHospital: string;
    hospitalCapacity: number;
  }> {
    const availableUnits = await this.findAvailableUnits(call.location);
    const optimalUnit = this.selectOptimalUnit(availableUnits, call);
    const hospitalWithCapacity = await this.findHospitalWithCapacity(call.location);

    return {
      nearestAmbulance: optimalUnit.id,
      etaMinutes: optimalUnit.eta,
      destinationHospital: hospitalWithCapacity.id,
      hospitalCapacity: hospitalWithCapacity.availableBeds,
    };
  }

  registerLocalModel(model: FederatedEMSModel): FederatedEMSModel {
    const normalized = {
      ...model,
      globalModelVersion: model.globalModelVersion || this.globalModelVersion,
      lastSync: model.lastSync || new Date(),
      dataQualityScore: clamp(model.dataQualityScore ?? 0.8, 0, 1),
    };
    this.localModels.set(normalized.hospitalId, normalized);
    return normalized;
  }

  private extractFeatures(call: EMS112Call): EMSFeatureVector {
    const urgencyScore = { immediate: 1, emergency: 0.72, non_urgent: 0.25 }[call.urgencyLevel];
    const wearable = call.wearableData;
    const physiologyScore = wearable
      ? Math.max(
          wearable.heartRate > 130 || wearable.heartRate < 45 ? 0.86 : 0.35,
          wearable.oxygenSaturation < 92 ? 0.9 : 0.3,
          wearable.fallDetected ? 0.78 : 0.2,
        )
      : 0.35;

    return {
      urgencyScore,
      distressScore: clamp(call.callerMetadata.distressLevel / 10, 0, 1),
      physiologyScore,
      locationConfidence: clamp(1 - call.location.accuracy / 5000, 0.2, 1),
      noisePenalty: clamp(call.callerMetadata.backgroundNoise / 100, 0, 1),
    };
  }

  private async predictAtEdge(features: EMSFeatureVector): Promise<EMSInference> {
    const score =
      features.urgencyScore * 0.34 +
      features.distressScore * 0.22 +
      features.physiologyScore * 0.3 +
      features.locationConfidence * 0.08 -
      features.noisePenalty * 0.06;
    const confidence = clamp(
      0.64 + Math.abs(score - 0.5) * 0.6 - features.noisePenalty * 0.1,
      0.5,
      0.97,
    );
    return { score: clamp(score, 0, 1), confidence: round(confidence) };
  }

  private mapToTriage(inference: EMSInference, call: EMS112Call) {
    if (inference.score >= 0.78 || call.urgencyLevel === 'immediate') {
      return {
        triageRecommendation: 'Immediate ALS response with hospital pre-alert',
        priorityCode: 1,
        recommendedResources: ['advanced_life_support', 'cardiac_monitor', 'resus_bay_prealert'],
      };
    }
    if (inference.score >= 0.55) {
      return {
        triageRecommendation: 'Emergency response with paramedic assessment priority',
        priorityCode: 2,
        recommendedResources: ['ambulance', 'paramedic_unit', 'ed_arrival_notice'],
      };
    }
    return {
      triageRecommendation: 'Non-urgent pathway with remote clinician review',
      priorityCode: 4,
      recommendedResources: ['basic_life_support', 'tele-triage_review'],
    };
  }

  private async collectLocalUpdates(): Promise<
    Array<{ hospitalId: string; weights: Record<string, number> }>
  > {
    if (!this.localModels.size) {
      this.registerLocalModel({
        hospitalId: 'demo-ed',
        localModel: { urgency: 0.34, distress: 0.22, physiology: 0.3 },
        globalModelVersion: this.globalModelVersion,
        lastSync: new Date(),
        dataQualityScore: 0.82,
      });
    }
    return Array.from(this.localModels.values()).map((model) => ({
      hospitalId: model.hospitalId,
      weights: model.localModel,
    }));
  }

  private aggregateUpdates(
    updates: Array<{ hospitalId: string; weights: Record<string, number> }>,
  ) {
    const keys = Array.from(new Set(updates.flatMap((update) => Object.keys(update.weights))));
    return {
      version: `fed-ems-edge-v${Number(this.globalModelVersion.replace(/\D/g, '') || 1) + 1}`,
      weights: Object.fromEntries(
        keys.map((key) => [
          key,
          round(
            updates.reduce((sum, update) => sum + (update.weights[key] || 0), 0) / updates.length,
          ),
        ]),
      ),
      contributors: updates.map((update) => update.hospitalId),
    };
  }

  private async distributeGlobalModel(globalModel: {
    version: string;
    weights: Record<string, number>;
    contributors: string[];
  }): Promise<void> {
    this.globalModelVersion = globalModel.version;
    for (const model of this.localModels.values()) {
      this.localModels.set(model.hospitalId, {
        ...model,
        globalModelVersion: globalModel.version,
        localModel: { ...model.localModel, ...globalModel.weights },
        lastSync: new Date(),
      });
    }
  }

  private async findAvailableUnits(location: EMS112Call['location']): Promise<EMSUnit[]> {
    return [
      {
        id: 'amb-112-a',
        lat: location.lat + 0.012,
        lng: location.lng - 0.006,
        eta: 6,
        level: 'advanced_life_support',
      },
      {
        id: 'amb-112-b',
        lat: location.lat - 0.018,
        lng: location.lng + 0.01,
        eta: 9,
        level: 'basic_life_support',
      },
      {
        id: 'cc-112-c',
        lat: location.lat + 0.028,
        lng: location.lng + 0.016,
        eta: 12,
        level: 'critical_care',
      },
    ];
  }

  private selectOptimalUnit(units: EMSUnit[], call: EMS112Call): EMSUnit {
    const needsAls =
      call.urgencyLevel === 'immediate' ||
      Boolean(call.wearableData?.oxygenSaturation && call.wearableData.oxygenSaturation < 90);
    return [...units].sort((a, b) => {
      const aPenalty = needsAls && a.level === 'basic_life_support' ? 8 : 0;
      const bPenalty = needsAls && b.level === 'basic_life_support' ? 8 : 0;
      return a.eta + aPenalty - (b.eta + bPenalty);
    })[0];
  }

  private async findHospitalWithCapacity(
    location: EMS112Call['location'],
  ): Promise<HospitalCapacity> {
    const hospitals: HospitalCapacity[] = [
      {
        id: 'ksvgh-demo',
        lat: location.lat + 0.02,
        lng: location.lng,
        availableBeds: 8,
        resusBeds: 2,
      },
      {
        id: 'regional-ed-demo',
        lat: location.lat - 0.03,
        lng: location.lng + 0.02,
        availableBeds: 4,
        resusBeds: 1,
      },
    ];
    return hospitals.sort(
      (a, b) => b.resusBeds - a.resusBeds || b.availableBeds - a.availableBeds,
    )[0];
  }
}

export const federatedEMSService = new FederatedEMSService();
