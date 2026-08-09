import { Injectable } from '@nestjs/common';

export interface HospitalClient {
  id: string;
  dataDistribution: 'similar' | 'dissimilar';
  localModelPerformance: {
    accuracy: number;
    loss: number;
    lastEvaluation: Date;
  };
  selectionPriority: number;
}

interface SeverityPredictionInput {
  age?: number;
  triageCode?: string;
  chiefComplaint?: string;
  vitals?: {
    hr?: number;
    sbp?: number;
    systolicBp?: number;
    spo2?: number;
    oxygenSaturation?: number;
    rr?: number;
    gcs?: number;
  };
  riskFlags?: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function round(value: number, precision = 3): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/**
 * Research prototype (backendRouteExposurePolicy.ts: "no SPA client is
 * wired", zero real frontend callers as of 2026-08-08). Despite the name
 * ("federated learning"), getLocalModel() loads no per-hospital trained
 * model -- it always runs the same deterministic weighted-sum formula
 * (scoreSeverity()), with a single-character-derived `hospitalCalibration`
 * offset (hospitalId.charCodeAt(0) % 5) standing in for real per-hospital
 * model differentiation. explainSeverity()'s output used to be exposed as
 * `shapValues` -- a specific, real explainability technique (SHapley
 * Additive exPlanations) this code does not compute; it's a plain list of
 * which hand-coded thresholds were crossed. Renamed to avoid the false
 * claim. Kept as a deterministic heuristic deliberately -- the fix here was
 * correcting the label, not building real SHAP/federated-learning
 * infrastructure this research surface doesn't need yet.
 */
@Injectable()
export class LMECSService {
  async selectOptimalClients(clients: HospitalClient[]): Promise<HospitalClient[]> {
    const evaluated = await Promise.all(
      clients.map(async (client) => ({
        ...client,
        selectionPriority: await this.calculateLMECSScore(client),
      })),
    );

    return evaluated
      .sort((a, b) => b.selectionPriority - a.selectionPriority)
      .slice(0, Math.max(1, Math.ceil(clients.length * 0.3)));
  }

  async predictSeverity(
    patientData: SeverityPredictionInput,
    hospitalId: string,
  ): Promise<{
    severityLevel: 'high' | 'medium' | 'low';
    confidence: number;
    contributingFactors: string[];
  }> {
    const localModel = await this.getLocalModel(hospitalId);
    const prediction = await localModel.predict(patientData);

    return {
      severityLevel: this.mapToSeverity(prediction.score),
      confidence: prediction.confidence,
      contributingFactors: prediction.explanationFactors,
    };
  }

  async calculateLMECSScore(client: HospitalClient): Promise<number> {
    const accuracySignal = clamp(client.localModelPerformance.accuracy, 0, 1) * 0.5;
    const lossSignal = (1 - clamp(client.localModelPerformance.loss, 0, 1)) * 0.25;
    const freshnessHours = Math.max(
      0,
      (Date.now() - new Date(client.localModelPerformance.lastEvaluation).getTime()) / 3600000,
    );
    const freshnessSignal = clamp(1 - freshnessHours / 168, 0.1, 1) * 0.15;
    const nonIidBonus = client.dataDistribution === 'dissimilar' ? 0.1 : 0.04;

    return round(accuracySignal + lossSignal + freshnessSignal + nonIidBonus);
  }

  private async getLocalModel(hospitalId: string): Promise<{
    predict: (data: SeverityPredictionInput) => Promise<{
      score: number;
      confidence: number;
      explanationFactors: string[];
    }>;
  }> {
    return {
      predict: async (data: SeverityPredictionInput) => {
        const score = this.scoreSeverity(data, hospitalId);
        return {
          score,
          confidence: round(clamp(0.62 + Math.abs(score - 0.5) * 0.55, 0.58, 0.96)),
          explanationFactors: this.explainSeverity(data, score),
        };
      },
    };
  }

  private scoreSeverity(data: SeverityPredictionInput, hospitalId: string): number {
    const triageScore =
      { CTAS1: 0.95, CTAS2: 0.78, CTAS3: 0.52, CTAS4: 0.3, CTAS5: 0.14 }[data.triageCode || ''] ??
      0.42;
    const vitals = data.vitals || {};
    const spo2 = vitals.spo2 ?? vitals.oxygenSaturation;
    const sbp = vitals.sbp ?? vitals.systolicBp;
    const vitalScore = Math.max(
      spo2 !== undefined && spo2 < 92 ? 0.82 : 0.25,
      sbp !== undefined && sbp < 90 ? 0.9 : 0.25,
      vitals.hr !== undefined && (vitals.hr > 130 || vitals.hr < 45) ? 0.75 : 0.25,
      vitals.gcs !== undefined && vitals.gcs < 14 ? 0.86 : 0.25,
    );
    const complaint = (data.chiefComplaint || '').toLowerCase();
    const complaintScore = /chest|stroke|sepsis|trauma|overdose|shortness/.test(complaint)
      ? 0.72
      : 0.34;
    const ageScore = (data.age || 0) >= 75 ? 0.62 : 0.32;
    const flagScore = (data.riskFlags || []).some((flag) => /high|sepsis|shock|fall/i.test(flag))
      ? 0.78
      : 0.3;
    const hospitalCalibration = (hospitalId.charCodeAt(0) % 5) / 100;

    return round(
      clamp(
        triageScore * 0.35 +
          vitalScore * 0.28 +
          complaintScore * 0.16 +
          ageScore * 0.1 +
          flagScore * 0.11 +
          hospitalCalibration,
        0,
        1,
      ),
    );
  }

  private mapToSeverity(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.7) return 'high';
    if (score >= 0.42) return 'medium';
    return 'low';
  }

  private explainSeverity(data: SeverityPredictionInput, score: number): string[] {
    const factors = [`Local model score ${score}`];
    const spo2 = data.vitals?.spo2 ?? data.vitals?.oxygenSaturation;
    const sbp = data.vitals?.sbp ?? data.vitals?.systolicBp;
    if (data.triageCode) factors.push(`Initial triage ${data.triageCode}`);
    if ((spo2 ?? 100) < 92) factors.push('Low oxygen saturation');
    if ((sbp ?? 120) < 90) factors.push('Hypotension');
    if ((data.vitals?.gcs ?? 15) < 14) factors.push('Altered mental status');
    if ((data.riskFlags || []).length)
      factors.push(`Risk flags: ${(data.riskFlags || []).join(', ')}`);
    return factors;
  }
}

export const lmecsService = new LMECSService();
