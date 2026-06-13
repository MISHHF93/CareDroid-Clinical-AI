export interface DeteriorationPredictionInput {
  age?: number;
  triageCode?: string;
  vitals?: {
    hr?: number;
    sbp?: number;
    spo2?: number;
    rr?: number;
    temp?: number;
    gcs?: number;
  };
  riskFlags?: string[];
}

export interface DeteriorationPrediction {
  modelVersion: 'deterioration-v3-deterministic';
  riskScore: number;
  riskBand: 'low' | 'moderate' | 'high' | 'critical';
  contributingSignals: string[];
  generatedAt: string;
  humanReviewRequired: true;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export class DeteriorationPredictionV3Service {
  predict(input: DeteriorationPredictionInput): DeteriorationPrediction {
    const vitals = input.vitals || {};
    const flags = input.riskFlags || [];
    const contributingSignals: string[] = [];

    let score = 0.18;
    const triageSignal =
      { CTAS1: 0.42, CTAS2: 0.28, CTAS3: 0.14, CTAS4: 0.05, CTAS5: 0.02 }[input.triageCode || ''] ||
      0.08;
    score += triageSignal;
    if (input.triageCode) contributingSignals.push(`triage:${input.triageCode}`);

    if ((input.age || 0) >= 75) {
      score += 0.08;
      contributingSignals.push('age>=75');
    }
    if (vitals.hr !== undefined && (vitals.hr > 120 || vitals.hr < 45)) {
      score += 0.14;
      contributingSignals.push('abnormal-heart-rate');
    }
    if (vitals.sbp !== undefined && vitals.sbp < 90) {
      score += 0.18;
      contributingSignals.push('hypotension');
    }
    if (vitals.spo2 !== undefined && vitals.spo2 < 92) {
      score += 0.16;
      contributingSignals.push('hypoxia');
    }
    if (vitals.rr !== undefined && vitals.rr > 24) {
      score += 0.08;
      contributingSignals.push('tachypnea');
    }
    if (vitals.temp !== undefined && vitals.temp >= 38.5) {
      score += 0.07;
      contributingSignals.push('fever');
    }
    if (vitals.gcs !== undefined && vitals.gcs < 14) {
      score += 0.16;
      contributingSignals.push('altered-mental-status');
    }
    if (flags.some((flag) => /sepsis|shock|deterioration|high/i.test(flag))) {
      score += 0.12;
      contributingSignals.push('high-risk-flag');
    }

    const riskScore = round(clamp(score, 0, 1));
    return {
      modelVersion: 'deterioration-v3-deterministic',
      riskScore,
      riskBand:
        riskScore >= 0.8
          ? 'critical'
          : riskScore >= 0.62
            ? 'high'
            : riskScore >= 0.38
              ? 'moderate'
              : 'low',
      contributingSignals,
      generatedAt: new Date().toISOString(),
      humanReviewRequired: true,
    };
  }

  checkHealth() {
    return {
      status: 'ready',
      modelVersion: 'deterioration-v3-deterministic',
    };
  }
}

export const deteriorationPredictionV3Service = new DeteriorationPredictionV3Service();
