import { Injectable } from '@nestjs/common';
import { PrimaryIntent } from '../medical-control-plane/intent-classifier/dto/intent-classification.dto';
import { COST_FLOOR, MOE_EXPERT_DESCRIPTORS } from './expert-registry';
import {
  ExpertCandidate,
  ExpertSelectionInput,
  MoEExpertDescriptor,
  MoEExpertId,
  RouteEvidence,
} from './moe-router.types';

@Injectable()
export class ExpertSelectorService {
  scoreCandidates(input: ExpertSelectionInput): ExpertCandidate[] {
    return MOE_EXPERT_DESCRIPTORS.map((descriptor) => this.scoreCandidate(descriptor, input)).sort(
      (a, b) => b.score - a.score,
    );
  }

  private scoreCandidate(
    descriptor: MoEExpertDescriptor,
    { envelope, classification, primaryIntent }: ExpertSelectionInput,
  ): ExpertCandidate {
    const text = this.normalize(
      [
        envelope.input.message,
        envelope.input.toolHint,
        envelope.input.featureHint,
        envelope.capabilityId,
        classification?.toolId,
        ...(classification?.matchedPatterns || []),
      ]
        .filter(Boolean)
        .join(' '),
    );
    const sourceSurface = this.normalize(envelope.trace.sourceSurface);
    const toolHint = this.normalize(classification?.toolId || envelope.input.toolHint || '');
    const featureHint = this.normalize(envelope.input.featureHint || envelope.capabilityId || '');
    const evidence: RouteEvidence[] = [];
    const isClinicalIntent = this.isClinicalIntent(primaryIntent);
    let confidence = isClinicalIntent && !descriptor.clinical ? 0.04 : 0.12;
    let relevance = descriptor.defaultRelevance;

    if (descriptor.intents.includes(primaryIntent)) {
      const weight = 0.35 * (classification?.confidence ?? 0.5);
      confidence += weight;
      evidence.push({
        expertId: descriptor.id,
        kind: 'intent',
        value: primaryIntent,
        weight: this.roundScore(weight),
      });
    }

    const keywordMatches = descriptor.keywords.filter((keyword) =>
      text.includes(this.normalize(keyword)),
    );
    if (keywordMatches.length) {
      const weight = Math.min(0.36, keywordMatches.length * 0.09);
      confidence += weight;
      relevance += Math.min(0.09, keywordMatches.length * 0.015);
      keywordMatches.slice(0, 4).forEach((keyword) => {
        evidence.push({
          expertId: descriptor.id,
          kind: 'keyword',
          value: keyword,
          weight: this.roundScore(weight / Math.min(keywordMatches.length, 4)),
        });
      });
    }

    if (toolHint && descriptor.toolHints.some((hint) => toolHint.includes(this.normalize(hint)))) {
      confidence += 0.34;
      relevance += 0.05;
      evidence.push({
        expertId: descriptor.id,
        kind: 'tool_id',
        value: toolHint,
        weight: 0.34,
      });
    }

    if (
      featureHint &&
      descriptor.featureHints.some((hint) => featureHint.includes(this.normalize(hint)))
    ) {
      confidence += 0.3;
      relevance += 0.04;
      evidence.push({
        expertId: descriptor.id,
        kind: 'feature',
        value: featureHint,
        weight: 0.3,
      });
    }

    if (
      sourceSurface &&
      descriptor.sourceSurfaces.some((surface) => sourceSurface.includes(this.normalize(surface)))
    ) {
      const weight = sourceSurface === 'assistant-chat' ? 0.03 : 0.16;
      confidence += weight;
      evidence.push({
        expertId: descriptor.id,
        kind: 'source_surface',
        value: sourceSurface,
        weight,
      });
    }

    if (descriptor.id === 'emergency' && classification?.isEmergency) {
      confidence = Math.max(confidence, 0.95);
      relevance = Math.max(relevance, 0.98);
      evidence.push({
        expertId: descriptor.id,
        kind: 'policy',
        value: 'emergency_preemption',
        weight: 0.95,
      });
    }

    // CareDroid unified AI node — artifact-router head as first-class routing signal
    const artifactType = this.normalize(classification?.artifactType || '');
    const artifactConf = classification?.artifactRouteConfidence ?? 0;
    if (artifactType && artifactConf >= 0.55) {
      const artifactBoost = this.artifactTypeExpertBoost(descriptor.id, artifactType);
      if (artifactBoost > 0) {
        const weight = Math.min(0.32, artifactBoost * Math.max(artifactConf, 0.55));
        confidence += weight;
        relevance += weight * 0.15;
        evidence.push({
          expertId: descriptor.id,
          kind: 'artifact_type',
          value: artifactType,
          weight: this.roundScore(weight),
        });
      }
    }

    if (descriptor.id === 'psychiatry' && this.hasCrisisSignal(text, classification?.isEmergency)) {
      confidence = Math.max(confidence, 0.82);
      relevance = Math.max(relevance, 0.94);
      evidence.push({
        expertId: descriptor.id,
        kind: 'policy',
        value: 'crisis_signal',
        weight: 0.82,
      });
    }

    confidence = this.roundScore(this.clamp(confidence));
    relevance = this.roundScore(this.clamp(relevance));
    const estimatedCost = Math.max(COST_FLOOR, descriptor.estimatedCost);
    const score = this.roundScore((confidence * relevance) / estimatedCost);

    return {
      expertId: descriptor.id,
      role: 'primary',
      confidence,
      relevance,
      estimatedCost,
      score,
      reason: descriptor.reason,
      evidence,
      descriptor,
    };
  }

  fallbackExpert(primaryIntent: string): MoEExpertId {
    if (primaryIntent === PrimaryIntent.ADMINISTRATIVE) return 'operations';
    return 'documentation';
  }

  private isClinicalIntent(primaryIntent: string): boolean {
    return [
      PrimaryIntent.CLINICAL_TOOL,
      PrimaryIntent.EMERGENCY,
      PrimaryIntent.MEDICAL_REFERENCE,
    ].includes(primaryIntent as PrimaryIntent);
  }

  /**
   * Map unified-node artifact-router labels onto MoE experts.
   * Returns a relative boost (0–1); 0 means no affinity.
   */
  private artifactTypeExpertBoost(expertId: MoEExpertId, artifactType: string): number {
    const map: Partial<Record<string, Partial<Record<MoEExpertId, number>>>> = {
      calculator: { operations: 0.55, cardiology: 0.35, pulmonology: 0.3, nephrology: 0.25 },
      tool: { operations: 0.45, documentation: 0.25 },
      document: { documentation: 0.55, operations: 0.2 },
      prompt: { documentation: 0.4, operations: 0.25 },
      route: { operations: 0.4, 'hospital-map': 0.35 },
      page: { operations: 0.35, 'hospital-map': 0.3 },
      registry: { operations: 0.3, documentation: 0.25 },
      'api-endpoint': { operations: 0.35 },
      platform: { operations: 0.4 },
    };
    return map[artifactType]?.[expertId] ?? 0;
  }

  private hasCrisisSignal(text: string, isEmergency?: boolean): boolean {
    return (
      Boolean(isEmergency) &&
      ['suicide', 'self harm', 'self-harm', 'harm myself', 'kill myself'].some((term) =>
        text.includes(term),
      )
    );
  }

  private normalize(value?: string): string {
    return (value || '').toLowerCase().replace(/_/g, '-').trim();
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private roundScore(value: number): number {
    return Math.round(value * 1000) / 1000;
  }
}
