import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  detectMissingPreArrivalFields,
  buildRulesOnlyPrepChecklist,
  buildSentinelAiRecommendation,
} from '../../../../lib/sentinel/aiEnvelope';
import { mapNemsisLikePayload, validateNemsisCore } from '../../../../lib/sentinel/nemsisMap';
import { mapInboundToFhirBundle } from '../../../../lib/sentinel/fhirMap';
import { SENTINEL_ORCHESTRATOR_VERSION } from '../../../../lib/sentinel/types';
import { SentinelInboundPatientEntity } from './entities/sentinel-inbound-patient.entity';
import { SentinelAiRecommendationEntity } from './entities/sentinel-ai-recommendation.entity';
import { SentinelOutboxService } from './sentinel-outbox.service';
import { createId } from './sentinel.config';

export type UpsertInboundInput = Readonly<{
  payload: Record<string, unknown>;
  unitId?: string;
  organizationId?: string | null;
  etaPointMin?: number | null;
  etaLowMin?: number | null;
  etaHighMin?: number | null;
}>;

@Injectable()
export class SentinelInboundService {
  constructor(
    @InjectRepository(SentinelInboundPatientEntity)
    private readonly inboundRepo: Repository<SentinelInboundPatientEntity>,
    @InjectRepository(SentinelAiRecommendationEntity)
    private readonly aiRepo: Repository<SentinelAiRecommendationEntity>,
    private readonly outbox: SentinelOutboxService,
  ) {}

  async listInbound(): Promise<SentinelInboundPatientEntity[]> {
    return this.inboundRepo.find({
      order: { updatedAt: 'DESC' },
      take: 100,
    });
  }

  async getInbound(id: string): Promise<SentinelInboundPatientEntity | null> {
    return this.inboundRepo.findOne({ where: { id } });
  }

  async upsertFromCadOrNemsis(input: UpsertInboundInput): Promise<{
    inbound: SentinelInboundPatientEntity;
    validation: ReturnType<typeof validateNemsisCore>;
    fhirBundle: ReturnType<typeof mapInboundToFhirBundle>;
    missingFields: readonly string[];
  }> {
    const mapped = mapNemsisLikePayload(input.payload);
    const validation = validateNemsisCore(mapped);
    const unitId = input.unitId || mapped.unitId;

    const missingFields = detectMissingPreArrivalFields({
      unitId,
      chiefComplaint: mapped.chiefComplaint,
      etaMinutes: input.etaPointMin ?? null,
      priorityOrTriage: mapped.priority,
      vitalsOrNarrative:
        mapped.narrative ||
        (mapped.vitals.heartRate != null ? `HR ${mapped.vitals.heartRate}` : null),
    });

    const existing = await this.inboundRepo.findOne({
      where: { unitId, status: 'en_route' },
    });

    const vitals = {
      heartRate: mapped.vitals.heartRate,
      bloodPressure: mapped.vitals.bloodPressure,
      oxygenSaturation: mapped.vitals.oxygenSaturation,
      respiratoryRate: mapped.vitals.respiratoryRate,
    };

    let inbound: SentinelInboundPatientEntity;
    if (existing) {
      existing.chiefComplaint = mapped.chiefComplaint;
      existing.patientAge = mapped.patientAge;
      existing.patientSex = mapped.patientSex;
      existing.priority = mapped.priority;
      existing.vitals = vitals;
      existing.times = { ...mapped.times };
      existing.narrative = mapped.narrative;
      existing.etaPointMin = input.etaPointMin ?? existing.etaPointMin;
      existing.etaLowMin = input.etaLowMin ?? existing.etaLowMin;
      existing.etaHighMin = input.etaHighMin ?? existing.etaHighMin;
      existing.nemsisMappedFields = [...mapped.nemsisMappedFields];
      existing.missingFields = [...missingFields];
      inbound = await this.inboundRepo.save(existing);
    } else {
      inbound = await this.inboundRepo.save(
        this.inboundRepo.create({
          id: createId('sinb'),
          unitId,
          status: 'en_route',
          patientLabel: `Inbound ${mapped.unitLabel}`,
          patientAge: mapped.patientAge,
          patientSex: mapped.patientSex,
          chiefComplaint: mapped.chiefComplaint,
          priority: mapped.priority,
          vitals,
          times: { ...mapped.times },
          narrative: mapped.narrative,
          etaPointMin: input.etaPointMin ?? null,
          etaLowMin: input.etaLowMin ?? null,
          etaHighMin: input.etaHighMin ?? null,
          edPatientId: null,
          nemsisMappedFields: [...mapped.nemsisMappedFields],
          missingFields: [...missingFields],
          organizationId: input.organizationId ?? null,
          metadata: { unmappedKeys: mapped.unmappedKeys },
        }),
      );
    }

    const fhirBundle = mapInboundToFhirBundle(mapped, {
      patientId: inbound.id,
      encounterId: `enc-${inbound.id}`,
    });

    await this.outbox.enqueue({
      aggregateType: 'inbound_patient',
      aggregateId: inbound.id,
      eventType: 'InboundPatientUpserted',
      payload: {
        inboundId: inbound.id,
        unitId: inbound.unitId,
        chiefComplaint: inbound.chiefComplaint,
        missingFields: inbound.missingFields,
        validation,
      },
    });

    return { inbound, validation, fhirBundle, missingFields };
  }

  /**
   * Produce grounded prep checklist. Uses rules-only path by default (AI gateway optional).
   * Always requiresHumanReview=true.
   */
  async producePrepRecommendation(
    inboundId: string,
    options: { preferAi?: boolean } = {},
  ): Promise<SentinelAiRecommendationEntity> {
    const inbound = await this.getInbound(inboundId);
    if (!inbound) {
      throw new Error(`Inbound patient ${inboundId} not found`);
    }

    const riskFlags: string[] = [];
    const complaint = inbound.chiefComplaint || '';
    if (/stroke|cva|facial|speech/i.test(complaint)) riskFlags.push('stroke window');
    if (/chest|stemi|acs|cardiac/i.test(complaint)) riskFlags.push('cardiac');
    if (/trauma|mva|fall|penetrat/i.test(complaint)) riskFlags.push('trauma');

    let envelope;
    try {
      if (options.preferAi) {
        // Grounded structured recommendation without external model call in v1.
        // When AI gateway is wired, replace body while keeping envelope validation.
        envelope = buildSentinelAiRecommendation({
          id: createId('sai'),
          kind: 'prep_checklist',
          summary: `Preparation guidance for ${inbound.patientLabel || inbound.unitId}`,
          recommendations: [
            'Assign receiving bay and primary nurse before arrival',
            'Confirm pathway activation ownership with charge clinician',
            ...(inbound.missingFields?.length
              ? [`Request missing EMS fields: ${inbound.missingFields.join(', ')}`]
              : []),
          ],
          evidence: [
            {
              claim: `Chief complaint: ${complaint}`,
              sourceRef: `inbound.${inbound.id}.chiefComplaint`,
            },
            ...(inbound.vitals
              ? [
                  {
                    claim: `Vitals snapshot: ${JSON.stringify(inbound.vitals)}`,
                    sourceRef: `inbound.${inbound.id}.vitals`,
                  },
                ]
              : []),
            ...riskFlags.map((flag, i) => ({
              claim: `Risk flag: ${flag}`,
              sourceRef: `inbound.${inbound.id}.risk[${i}]`,
            })),
          ],
          confidence: 0.72,
          modelId: 'sentinel-grounded-rules',
          modelVersion: '1.0.0',
          sourceState: 'live',
          linkedEntityType: 'inbound_patient',
          linkedEntityId: inbound.id,
        });
      } else {
        envelope = buildRulesOnlyPrepChecklist({
          id: createId('sai'),
          complaint,
          riskFlags,
          missingFields: inbound.missingFields || [],
        });
      }
    } catch {
      envelope = buildRulesOnlyPrepChecklist({
        id: createId('sai'),
        complaint,
        riskFlags,
        missingFields: inbound.missingFields || [],
      });
    }

    if (envelope.requiresHumanReview !== true) {
      throw new Error('Autonomous clinical recommendations are forbidden');
    }

    const row = await this.aiRepo.save(
      this.aiRepo.create({
        id: envelope.id,
        kind: envelope.kind,
        summary: envelope.summary,
        recommendations: [...envelope.recommendations],
        evidence: envelope.evidence.map((e) => ({ ...e })),
        confidence: envelope.confidence,
        modelId: envelope.modelId,
        modelVersion: envelope.modelVersion,
        orchestratorVersion: envelope.orchestratorVersion || SENTINEL_ORCHESTRATOR_VERSION,
        requiresHumanReview: true,
        humanReviewStatus: envelope.humanReviewStatus,
        disclaimer: envelope.disclaimer,
        sourceState: envelope.sourceState,
        generatedAt: envelope.generatedAt,
        linkedEntityType: envelope.linkedEntityType || 'inbound_patient',
        linkedEntityId: envelope.linkedEntityId || inbound.id,
        reviewedBy: null,
        reviewedAt: null,
      }),
    );

    await this.outbox.enqueue({
      aggregateType: 'ai_recommendation',
      aggregateId: row.id,
      eventType: 'AiRecommendationProduced',
      payload: {
        recommendationId: row.id,
        kind: row.kind,
        confidence: row.confidence,
        requiresHumanReview: true,
        linkedEntityId: row.linkedEntityId,
      },
    });

    return row;
  }

  async reviewRecommendation(
    id: string,
    status: 'accepted' | 'rejected' | 'modified',
    reviewerId: string,
  ): Promise<SentinelAiRecommendationEntity> {
    const row = await this.aiRepo.findOne({ where: { id } });
    if (!row) throw new Error(`Recommendation ${id} not found`);
    row.humanReviewStatus = status;
    row.reviewedBy = reviewerId;
    row.reviewedAt = new Date().toISOString();
    return this.aiRepo.save(row);
  }

  async listRecommendations(): Promise<SentinelAiRecommendationEntity[]> {
    return this.aiRepo.find({ order: { generatedAt: 'DESC' }, take: 100 });
  }

  async analyticsSnapshot(): Promise<{
    inboundCount: number;
    missingDataRate: number;
    aiAcceptanceRate: number | null;
    pendingReviews: number;
  }> {
    const inbound = await this.inboundRepo.find({ take: 200 });
    const withMissing = inbound.filter((i) => (i.missingFields?.length || 0) > 0).length;
    const recs = await this.aiRepo.find({ take: 200 });
    const decided = recs.filter((r) => r.humanReviewStatus !== 'pending');
    const accepted = recs.filter((r) => r.humanReviewStatus === 'accepted').length;
    return {
      inboundCount: inbound.length,
      missingDataRate: inbound.length === 0 ? 0 : withMissing / inbound.length,
      aiAcceptanceRate: decided.length === 0 ? null : accepted / decided.length,
      pendingReviews: recs.filter((r) => r.humanReviewStatus === 'pending').length,
    };
  }
}
