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

  // HEAL-308: had zero organizationId filtering despite the entity already carrying the
  // (indexed) column -- see sentinel-tracking.service.ts's HEAL-308 comment for the full
  // rationale. Inbound pre-arrival patients are real PHI (chief complaint, vitals, name).
  async listInbound(organizationId?: string): Promise<SentinelInboundPatientEntity[]> {
    return this.inboundRepo.find({
      where: organizationId ? { organizationId } : {},
      order: { updatedAt: 'DESC' },
      take: 100,
    });
  }

  // HEAL-339: same gap as the already-fixed listInbound/HEAL-308 above --
  // this single-record read had zero organizationId filtering, letting any
  // authenticated user with sentinel access read another hospital's
  // pre-arrival PHI (chief complaint, vitals, name) by id.
  async getInbound(
    id: string,
    organizationId?: string,
  ): Promise<SentinelInboundPatientEntity | null> {
    const row = await this.inboundRepo.findOne({ where: { id } });
    if (!row || (organizationId && row.organizationId && row.organizationId !== organizationId)) {
      return null;
    }
    return row;
  }

  private async applyInboundUpdate(
    row: SentinelInboundPatientEntity,
    mapped: ReturnType<typeof mapNemsisLikePayload>,
    input: UpsertInboundInput,
    vitals: SentinelInboundPatientEntity['vitals'],
    missingFields: readonly string[],
  ): Promise<SentinelInboundPatientEntity> {
    row.chiefComplaint = mapped.chiefComplaint;
    row.patientAge = mapped.patientAge;
    row.patientSex = mapped.patientSex;
    row.priority = mapped.priority;
    row.vitals = vitals;
    row.times = { ...mapped.times };
    row.narrative = mapped.narrative;
    row.etaPointMin = input.etaPointMin ?? row.etaPointMin;
    row.etaLowMin = input.etaLowMin ?? row.etaLowMin;
    row.etaHighMin = input.etaHighMin ?? row.etaHighMin;
    row.nemsisMappedFields = [...mapped.nemsisMappedFields];
    row.missingFields = [...missingFields];
    return this.inboundRepo.save(row);
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
      inbound = await this.applyInboundUpdate(existing, mapped, input, vitals, missingFields);
    } else {
      // HEAL-311: a concurrent request for the same unit (duplicate/retried CAD or NEMSIS
      // webhook delivery, or a genuine double-submit) can reach this branch in the gap
      // between our findOne() above and this insert -- both would previously read "no
      // existing row" and both insert, leaving two PHI rows for one real patient. `orIgnore`
      // relies on the unique index on unitId (see the entity's HEAL-311 comment) to make the
      // losing insert a silent no-op at the database level rather than a raised exception,
      // which sidesteps having to depend on exactly how/when a given driver surfaces a
      // constraint-violation rejection. Either way we then read back whichever row is
      // actually in the database and apply THIS request's data on top of it, so the loser's
      // data is folded in as an update instead of silently dropped.
      const candidate = this.inboundRepo.create({
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
      });

      await this.inboundRepo
        .createQueryBuilder()
        .insert()
        .into(SentinelInboundPatientEntity)
        .values(candidate as any)
        .orIgnore()
        .execute();

      const row = await this.inboundRepo.findOne({ where: { unitId } });
      if (!row) {
        throw new Error(`Failed to create or find inbound patient row for unit ${unitId}`);
      }
      inbound =
        row.id === candidate.id
          ? row
          : await this.applyInboundUpdate(row, mapped, input, vitals, missingFields);
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
    organizationId?: string,
  ): Promise<SentinelAiRecommendationEntity> {
    const inbound = await this.getInbound(inboundId, organizationId);
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

  // HEAL-339: was unscoped -- REVIEW_SENTINEL_AI is org-scoped, so any
  // reviewer could accept/reject/modify another hospital's AI prep
  // recommendation by id. Same join-through-linked-inbound-patient scoping
  // as listRecommendations above, since this entity has no organizationId
  // column of its own.
  async reviewRecommendation(
    id: string,
    status: 'accepted' | 'rejected' | 'modified',
    reviewerId: string,
    organizationId?: string,
  ): Promise<SentinelAiRecommendationEntity> {
    const row = await this.aiRepo.findOne({ where: { id } });
    if (!row) throw new Error(`Recommendation ${id} not found`);
    if (organizationId && row.linkedEntityType === 'inbound_patient' && row.linkedEntityId) {
      const linkedInbound = await this.inboundRepo.findOne({
        where: { id: row.linkedEntityId },
      });
      if (
        linkedInbound &&
        linkedInbound.organizationId &&
        linkedInbound.organizationId !== organizationId
      ) {
        throw new Error(`Recommendation ${id} not found`);
      }
    }
    row.humanReviewStatus = status;
    row.reviewedBy = reviewerId;
    row.reviewedAt = new Date().toISOString();
    return this.aiRepo.save(row);
  }

  // SentinelAiRecommendationEntity has no organizationId column of its own -- it links to
  // an inbound patient (or other entity) via linkedEntityId. Scope by joining through the
  // caller's own org-filtered inbound patients rather than trusting an unscoped find().
  async listRecommendations(organizationId?: string): Promise<SentinelAiRecommendationEntity[]> {
    if (!organizationId) {
      return this.aiRepo.find({ order: { generatedAt: 'DESC' }, take: 100 });
    }
    const ownInbound = await this.inboundRepo.find({
      where: { organizationId },
      select: ['id'],
    });
    const ownInboundIds = new Set(ownInbound.map((row) => row.id));
    const rows = await this.aiRepo.find({ order: { generatedAt: 'DESC' }, take: 200 });
    return rows
      .filter(
        (row) =>
          row.linkedEntityType !== 'inbound_patient' ||
          (row.linkedEntityId != null && ownInboundIds.has(row.linkedEntityId)),
      )
      .slice(0, 100);
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
