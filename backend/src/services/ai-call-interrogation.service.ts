import { Injectable } from '@nestjs/common';

export interface EmergencyCall {
  callId: string;
  audioStream: Buffer;
  callerLanguage: string;
  backgroundNoise: number;
  timestamp: Date;
  transcriptHint?: string;
}

export interface OHCADetectionResult {
  ohcaDetected: boolean;
  detectionTimeSeconds: number;
  confidence: number;
  keyPhrases: string[];
  transcription: string;
}

type ECGDiagnosis = 'normal' | 'STEMI' | 'arrhythmia' | 'other';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function round(value: number, precision = 3): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/**
 * Research prototype (backendRouteExposurePolicy.ts: "not exposed in active
 * ED shell", zero real frontend callers as of 2026-08-08). Despite the class
 * name, this contains no trained model, no real audio transcription, and no
 * real ECG signal-morphology analysis -- predictOHCA()/predictECG() are
 * hand-coded keyword/threshold heuristics, and every branch's `confidence`
 * value is a hardcoded literal (0.91/0.86/0.82/0.51 for ECG; a weighted-sum
 * formula for OHCA), not a model-reported uncertainty estimate. Kept as a
 * deterministic, understandable heuristic deliberately -- the fix here was
 * removing a fabricated hardcoded fallback transcript (see
 * transcribeWithNoiseFiltering), not building real ML infrastructure this
 * research surface doesn't need yet.
 */
@Injectable()
export class AICallInterrogationService {
  private readonly criticalKeywords = [
    'not breathing',
    'unconscious',
    'collapsed',
    'no pulse',
    'turning blue',
    'cardiac arrest',
    'not responding',
  ];

  async detectOHCA(call: EmergencyCall): Promise<OHCADetectionResult> {
    const startTime = Date.now();
    const transcription = await this.transcribeWithNoiseFiltering(
      call.audioStream,
      call.transcriptHint,
    );
    const normalized = transcription.toLowerCase();
    const detectedKeywords = this.criticalKeywords.filter((keyword) =>
      normalized.includes(keyword),
    );
    const prediction = await this.predictOHCA({
      transcription,
      keywordsPresent: detectedKeywords,
      backgroundNoise: call.backgroundNoise,
      callerDistress: this.estimateDistress(transcription),
    });

    return {
      ohcaDetected: prediction.probability > 0.7,
      detectionTimeSeconds: round((Date.now() - startTime) / 1000, 3),
      confidence: prediction.probability,
      keyPhrases: detectedKeywords,
      transcription,
    };
  }

  async interpretECG(ecgData: number[]): Promise<{
    diagnosis: ECGDiagnosis;
    confidence: number;
    reportingTimeSeconds: number;
    keyFindings: string[];
  }> {
    const startTime = Date.now();
    const interpretation = await this.predictECG(ecgData);

    return {
      diagnosis: interpretation.classification,
      confidence: interpretation.confidence,
      reportingTimeSeconds: round((Date.now() - startTime) / 1000, 3),
      keyFindings: interpretation.findings,
    };
  }

  async recommendDispatch(ohcaResult: OHCADetectionResult): Promise<{
    priority: 1 | 2 | 3 | 4 | 5;
    recommendedResources: string[];
    estimatedResponseTarget: number;
  }> {
    if (ohcaResult.ohcaDetected && ohcaResult.confidence > 0.8) {
      return {
        priority: 1,
        recommendedResources: ['advanced_life_support', 'defibrillator', 'cardiac_medications'],
        estimatedResponseTarget: 480,
      };
    }
    if (ohcaResult.ohcaDetected || ohcaResult.confidence > 0.55) {
      return {
        priority: 2,
        recommendedResources: ['paramedic_unit', 'defibrillator_ready', 'dispatcher_cpr_coaching'],
        estimatedResponseTarget: 600,
      };
    }
    return {
      priority: 4,
      recommendedResources: ['standard_ambulance', 'call_taker_reassessment'],
      estimatedResponseTarget: 1800,
    };
  }

  /**
   * No real speech-to-text integration exists here -- this is a research
   * prototype (see backendRouteExposurePolicy.ts: "not exposed in active ED
   * shell", zero real frontend callers). Decoding an audio Buffer as raw
   * UTF-8 text only ever produces intelligible output for a caller-supplied
   * transcriptHint (used for local/test input); real audio bytes are not
   * valid UTF-8 text, so this path is expected to fail for genuine audio.
   *
   * Previously, a failed decode silently fell back to a HARDCODED fake
   * transcript ("Caller reports patient collapsed and is not breathing
   * after becoming unconscious.") -- a fixed, maximally-alarming clinical
   * narrative that would fire for essentially every real (non-hint) call,
   * since real audio buffers almost never decode to non-empty text this
   * way. Every downstream consumer (detectOHCA's keyword match, the
   * probability formula, recommendDispatch's priority-1 escalation) would
   * then act on fabricated, worst-case-by-construction input rather than
   * an honest "transcription unavailable" signal. Fails to an explicit
   * empty transcript instead -- callers must treat that as "no signal",
   * not as evidence of anything.
   */
  private async transcribeWithNoiseFiltering(
    audioStream: Buffer,
    transcriptHint?: string,
  ): Promise<string> {
    if (transcriptHint?.trim()) return transcriptHint.trim();
    return audioStream
      .toString('utf8')
      .replace(/[^\w\s.,!?-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async predictOHCA(input: {
    transcription: string;
    keywordsPresent: string[];
    backgroundNoise: number;
    callerDistress: number;
  }): Promise<{ probability: number }> {
    const keywordSignal = clamp(input.keywordsPresent.length / 3, 0, 1) * 0.58;
    const distressSignal = input.callerDistress * 0.27;
    const noisePenalty = clamp(input.backgroundNoise / 100, 0, 1) * 0.1;
    const respiratorySignal = /breath|breathing|blue|pulse|cpr/i.test(input.transcription)
      ? 0.22
      : 0;
    return {
      probability: round(
        clamp(keywordSignal + distressSignal + respiratorySignal - noisePenalty, 0.03, 0.99),
      ),
    };
  }

  private estimateDistress(transcription: string): number {
    const distressTerms = ['help', 'please', 'hurry', 'screaming', 'panic', 'dying', 'blue'];
    const matches = distressTerms.filter((term) =>
      transcription.toLowerCase().includes(term),
    ).length;
    return clamp(0.35 + matches * 0.12 + (transcription.includes('!') ? 0.08 : 0), 0, 1);
  }

  private async predictECG(ecgData: number[]): Promise<{
    classification: ECGDiagnosis;
    confidence: number;
    findings: string[];
  }> {
    if (!ecgData.length) {
      return { classification: 'other', confidence: 0.51, findings: ['No ECG samples supplied'] };
    }

    const mean = ecgData.reduce((sum, value) => sum + value, 0) / ecgData.length;
    const variance = ecgData.reduce((sum, value) => sum + (value - mean) ** 2, 0) / ecgData.length;
    const max = Math.max(...ecgData);
    const min = Math.min(...ecgData);
    const amplitude = max - min;

    if (mean > 0.18 && amplitude > 1.2) {
      return {
        classification: 'STEMI',
        confidence: 0.91,
        findings: ['ST elevation pattern detected', `Mean ST deviation ${round(mean, 2)}`],
      };
    }
    if (variance > 0.9) {
      return {
        classification: 'arrhythmia',
        confidence: 0.86,
        findings: [
          'Irregular high-variance rhythm pattern',
          `Signal variance ${round(variance, 2)}`,
        ],
      };
    }
    return {
      classification: 'normal',
      confidence: 0.82,
      findings: ['No STEMI or high-risk arrhythmia pattern detected in sample window'],
    };
  }
}

export const aiCallInterrogationService = new AICallInterrogationService();
