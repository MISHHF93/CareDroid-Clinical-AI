import { Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { RAGService } from '../rag/rag.service';
import { RetrievedChunk } from '../rag/dto/rag-context.dto';
import {
  AmbientScribeDraft,
  AmbientScribeGenerateDto,
  AmbientScribeNoteType,
  AmbientScribeResponseDto,
} from './dto/ambient-scribe.dto';
import {
  GuidelineRagCitation,
  GuidelineRagQueryDto,
  GuidelineRagResponseDto,
  GuidelineRagSourceAttribution,
} from './dto/guideline-rag.dto';
import { DifferentialAiRequestDto, DifferentialAiResponseDto } from './dto/differential-ai.dto';
import {
  TimelineAiEncounterDto,
  TimelineAiRequestDto,
  TimelineAiResponseDto,
} from './dto/timeline-ai.dto';
import {
  PatientSummaryAiRequestDto,
  PatientSummaryAiResponseDto,
} from './dto/patient-summary-ai.dto';
import { OrderSetAiRequestDto, OrderSetAiResponseDto } from './dto/order-set-ai.dto';
import {
  AiExplainabilityQueryDto,
  AiExplainabilityResponseDto,
  ClinicalAuditQueryDto,
  ClinicalAuditResponseDto,
  SanitizedExecutionLogDto,
} from './dto/explainability-audit.dto';
import { PlatformGovernanceService } from '../platform-governance';

const CONTRACT_VERSION = 'ambient-scribe.v1';
const GUIDELINE_RAG_CONTRACT_VERSION = 'guideline-rag.v1';
const DIFFERENTIAL_AI_CONTRACT_VERSION = 'differential-ai.v1';
const TIMELINE_AI_CONTRACT_VERSION = 'timeline-ai.v1';
const PATIENT_SUMMARY_AI_CONTRACT_VERSION = 'patient-summary-ai.v1';
const ORDER_SET_AI_CONTRACT_VERSION = 'order-set-ai.v1';
const AI_EXPLAINABILITY_CONTRACT_VERSION = 'ai-explainability.v1';
const CLINICAL_AUDIT_CONTRACT_VERSION = 'clinical-audit.v1';

const SAFETY_WARNINGS = [
  'Human clinician review is required before this draft is used in the medical record.',
  'This workflow does not auto-sign notes.',
  'This workflow does not autonomously modify the chart or place documentation into the EHR.',
];

const BLOCKED_ACTIONS = ['auto_sign_note', 'ehr_write_back', 'autonomous_chart_modification'];

@Injectable()
export class ClinicalIntelligenceService {
  constructor(
    private readonly auditService: AuditService,
    private readonly ragService: RAGService,
    @Optional() private readonly platformGovernance?: PlatformGovernanceService,
  ) {}

  async generateAmbientScribeDraft(
    userId: string,
    dto: AmbientScribeGenerateDto,
    requestMeta: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<AmbientScribeResponseDto> {
    const runId = randomUUID();
    const governanceDecision = await this.platformGovernance?.evaluateGate({
      runId,
      capabilityId: 'ambient-scribe',
      patientId: (dto.patientContext as any)?.patientId,
      phiAccessed: true,
      prompt: dto.transcriptText,
      action: 'clinical-intelligence/ambient-scribe',
    });
    if (
      governanceDecision &&
      (!governanceDecision.allowed || governanceDecision.requiresHumanReview)
    ) {
      await this.platformGovernance?.createReviewItem({
        runId,
        patientId: (dto.patientContext as any)?.patientId,
        capabilityId: 'ambient-scribe',
        reviewType: 'documentation',
        severity: governanceDecision.allowed ? 'medium' : 'high',
        payload: {
          reasons: governanceDecision.reasons,
          noteType: dto.noteType,
          contractVersion: CONTRACT_VERSION,
        },
      });
    }
    const draft = this.buildDraft(dto);

    await this.auditService.log({
      userId,
      action: AuditAction.AI_QUERY,
      resource: 'clinical-intelligence/ambient-scribe',
      phiAccessed: true,
      ipAddress: requestMeta.ipAddress || '0.0.0.0',
      userAgent: requestMeta.userAgent || 'clinical-intelligence',
      metadata: {
        runId,
        capabilityId: 'ambient-scribe',
        noteType: dto.noteType,
        contractVersion: CONTRACT_VERSION,
        transcriptCharacters: dto.transcriptText.length,
        status: 'review_required',
        blockedActions: BLOCKED_ACTIONS,
        platformGovernance: governanceDecision,
      },
    });

    return {
      runId,
      capabilityId: 'ambient-scribe',
      contractVersion: CONTRACT_VERSION,
      status: 'review_required',
      noteType: dto.noteType,
      draft,
      reviewRequired: true,
      safety: {
        warnings: SAFETY_WARNINGS,
        blockedActions: BLOCKED_ACTIONS,
        requiresHumanReview: true,
      },
      audit: {
        phiAccessed: true,
      },
    };
  }

  async queryGuidelineEvidence(
    userId: string,
    dto: GuidelineRagQueryDto,
    requestMeta: { ipAddress?: string; userAgent?: string } = {},
    organizationId?: string,
  ): Promise<GuidelineRagResponseDto> {
    const runId = randomUUID();
    const ragContext = await this.ragService.retrieve(dto.query, {
      topK: dto.topK || 5,
      minScore: dto.minScore ?? 0.6,
      documentType: 'guideline',
      specialty: dto.specialty,
      organizationId,
    });

    const citations = buildCitations(ragContext.chunks);
    const sources = buildSourceAttribution(ragContext.chunks, citations);
    const recommendations = buildCitationBoundRecommendations(ragContext.chunks, citations);
    const status = recommendations.length ? 'evidence_found' : 'insufficient_evidence';

    await this.auditService.log({
      userId,
      action: AuditAction.AI_QUERY,
      resource: 'clinical-intelligence/guideline-rag',
      phiAccessed: false,
      ipAddress: requestMeta.ipAddress || '0.0.0.0',
      userAgent: requestMeta.userAgent || 'clinical-intelligence',
      metadata: {
        runId,
        capabilityId: 'guideline-rag',
        contractVersion: GUIDELINE_RAG_CONTRACT_VERSION,
        queryCharacters: dto.query.length,
        status,
        chunksRetrieved: ragContext.chunks.length,
        sourceCount: citations.length,
      },
    });

    return {
      runId,
      capabilityId: 'guideline-rag',
      contractVersion: GUIDELINE_RAG_CONTRACT_VERSION,
      status,
      query: dto.query,
      confidence: ragContext.confidence,
      summary: {
        recommendations,
        unsupportedClaimNotice:
          status === 'evidence_found'
            ? 'Summary statements are limited to retrieved guideline passages and cited source chunks.'
            : 'Insufficient retrieved guideline evidence to summarize recommendations without unsupported medical claims.',
      },
      citations,
      sources,
      explainability: {
        retrievalMethod:
          'Vector retrieval over guideline documents with optional specialty filtering; summary uses extractive cited passages only.',
        chunksRetrieved: ragContext.chunks.length,
        sourceCount: citations.length,
        limitations: [
          'Does not generate recommendations beyond retrieved source text.',
          'Absence of retrieved evidence is not evidence that no guideline exists.',
          'Clinicians must verify source freshness, local policy, and patient-specific applicability.',
        ],
      },
      safety: {
        warnings: [
          'Citation-bound evidence support only; not a diagnosis or treatment order.',
          'Unsupported medical claims are intentionally withheld when retrieval is insufficient.',
        ],
      },
    };
  }

  async generateDifferentialAi(
    userId: string,
    dto: DifferentialAiRequestDto,
    requestMeta: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<DifferentialAiResponseDto> {
    const runId = randomUUID();
    const inputText = normalizeClinicalText([
      dto.symptoms,
      dto.labs,
      dto.history,
      demographicsToText(dto.demographics),
    ]);
    const rankedDifferentials = buildRankedDifferentials(inputText);
    const suggestedCalculators = buildDifferentialCalculatorSuggestions(inputText);
    const status = rankedDifferentials.length
      ? 'ranked_differential_generated'
      : 'needs_more_context';

    await this.auditService.log({
      userId,
      action: AuditAction.AI_QUERY,
      resource: 'clinical-intelligence/differential-ai',
      phiAccessed: true,
      ipAddress: requestMeta.ipAddress || '0.0.0.0',
      userAgent: requestMeta.userAgent || 'clinical-intelligence',
      metadata: {
        runId,
        capabilityId: 'differential-ai',
        contractVersion: DIFFERENTIAL_AI_CONTRACT_VERSION,
        status,
        symptomsCharacters: dto.symptoms.length,
        labsProvided: Boolean(dto.labs),
        historyProvided: Boolean(dto.history),
        demographicsProvided: Boolean(dto.demographics),
      },
    });

    return {
      runId,
      capabilityId: 'differential-ai',
      contractVersion: DIFFERENTIAL_AI_CONTRACT_VERSION,
      status,
      rankedDifferentials,
      suggestedCalculators,
      explainability: {
        reasoningTrace: [
          'Matched symptoms, labs, history, and demographics against curated clinical presentation patterns.',
          'Ranked differentials by matched presentation features and urgency signals.',
          'Suggested calculators only when they map to shipped CareDroid tools relevant to the presentation.',
        ],
        evidenceInputsUsed: [
          dto.symptoms ? 'symptoms' : null,
          dto.labs ? 'labs' : null,
          dto.history ? 'history' : null,
          dto.demographics ? 'demographics' : null,
        ].filter(Boolean) as string[],
        limitations: [
          'Decision support only; this is not a diagnosis.',
          'Does not rule in or rule out any condition.',
          'Requires clinician review, exam, source data verification, and local protocols.',
        ],
      },
      safety: {
        decisionSupportOnly: true,
        notDiagnosis: true,
        warnings: [
          'Decision support only. Not a diagnosis.',
          'Do not use this ranked list as the sole basis for treatment, disposition, or orders.',
        ],
      },
    };
  }

  async generateTimelineAi(
    userId: string,
    dto: TimelineAiRequestDto,
    requestMeta: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<TimelineAiResponseDto> {
    const runId = randomUUID();
    const normalizedEncounters = buildNormalizedTimelineEncounters(dto.encounters);
    const timeline = buildTimelineEvents(normalizedEncounters);
    const trends = buildTimelineTrends(normalizedEncounters);
    const abnormalProgression = buildAbnormalProgression(timeline, trends);
    const status = timeline.length ? 'timeline_generated' : 'needs_more_context';

    await this.auditService.log({
      userId,
      action: AuditAction.AI_QUERY,
      resource: 'clinical-intelligence/timeline-ai',
      phiAccessed: true,
      ipAddress: requestMeta.ipAddress || '0.0.0.0',
      userAgent: requestMeta.userAgent || 'clinical-intelligence',
      metadata: {
        runId,
        capabilityId: 'timeline-ai',
        contractVersion: TIMELINE_AI_CONTRACT_VERSION,
        status,
        encounterCount: dto.encounters.length,
        focusProvided: Boolean(dto.focus),
        patientContextProvided: Boolean(dto.patientContext),
        abnormalProgressionCount: abnormalProgression.length,
      },
    });

    return {
      runId,
      capabilityId: 'timeline-ai',
      contractVersion: TIMELINE_AI_CONTRACT_VERSION,
      status,
      timeline,
      trends,
      abnormalProgression,
      explainability: {
        inputsUsed: [
          dto.patientContext ? 'patientContext' : null,
          dto.focus ? 'focus' : null,
          'encounters',
          dto.encounters.some((encounter) => encounter.labs) ? 'labs' : null,
          dto.encounters.some((encounter) => encounter.vitals) ? 'vitals' : null,
        ].filter(Boolean) as string[],
        method:
          'Chronological encounter normalization with keyword-based trend and abnormal progression signal detection.',
        limitations: [
          'Decision support only; not a diagnosis, triage decision, or order.',
          'Requires clinician review against source notes, labs, vitals, and imaging.',
          'May miss trends that require structured EHR data, medication timing, or exact lab units.',
        ],
      },
      safety: {
        decisionSupportOnly: true,
        warnings: [
          'Timeline summaries are clinical decision support only.',
          'Abnormal progression flags require clinician verification and source record review.',
        ],
      },
      audit: {
        phiAccessed: true,
      },
    };
  }

  async generatePatientSummaryAi(
    userId: string,
    dto: PatientSummaryAiRequestDto,
    requestMeta: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<PatientSummaryAiResponseDto> {
    const runId = randomUUID();
    const inputText = normalizeClinicalText([
      dto.patientContext,
      dto.problems,
      dto.medications,
      dto.labs,
      dto.alerts,
      dto.riskFactors,
      dto.notes,
    ]);
    const activeProblems = buildActiveProblems(dto, inputText);
    const medications = buildMedicationSummary(dto.medications);
    const recentLabs = buildRecentLabs(dto.labs);
    const alerts = buildSummaryAlerts(dto, inputText);
    const riskFactors = buildRiskFactors(dto, inputText);
    const status =
      activeProblems.length ||
      medications.length ||
      recentLabs.length ||
      alerts.length ||
      riskFactors.length
        ? 'summary_generated'
        : 'needs_more_context';

    await this.auditService.log({
      userId,
      action: AuditAction.AI_QUERY,
      resource: 'clinical-intelligence/patient-summary-ai',
      phiAccessed: true,
      ipAddress: requestMeta.ipAddress || '0.0.0.0',
      userAgent: requestMeta.userAgent || 'clinical-intelligence',
      metadata: {
        runId,
        capabilityId: 'patient-summary-ai',
        contractVersion: PATIENT_SUMMARY_AI_CONTRACT_VERSION,
        status,
        sectionsProvided: [
          dto.patientContext ? 'patientContext' : null,
          dto.problems ? 'problems' : null,
          dto.medications ? 'medications' : null,
          dto.labs ? 'labs' : null,
          dto.alerts ? 'alerts' : null,
          dto.riskFactors ? 'riskFactors' : null,
          dto.notes ? 'notes' : null,
        ].filter(Boolean),
        activeProblemCount: activeProblems.length,
        medicationCount: medications.length,
        labCount: recentLabs.length,
        alertCount: alerts.length,
        riskFactorCount: riskFactors.length,
      },
    });

    return {
      runId,
      capabilityId: 'patient-summary-ai',
      contractVersion: PATIENT_SUMMARY_AI_CONTRACT_VERSION,
      status,
      activeProblems,
      medications,
      recentLabs,
      alerts,
      riskFactors,
      explainability: {
        inputsUsed: [
          dto.patientContext ? 'patientContext' : null,
          dto.problems ? 'problems' : null,
          dto.medications ? 'medications' : null,
          dto.labs ? 'labs' : null,
          dto.alerts ? 'alerts' : null,
          dto.riskFactors ? 'riskFactors' : null,
          dto.notes ? 'notes' : null,
        ].filter(Boolean) as string[],
        method:
          'Structured extraction from submitted chart text using section-specific normalization and safety flag rules.',
        limitations: [
          'Decision support only; requires clinician review against the source chart.',
          'Does not reconcile medication dose accuracy, allergy conflicts, or complete problem list provenance.',
          'Missing source text may produce incomplete summaries.',
        ],
      },
      safety: {
        decisionSupportOnly: true,
        warnings: [
          'Patient summary is decision support only and must be verified against source records.',
          'Do not use this output as the sole basis for orders, medication changes, or diagnosis.',
        ],
      },
      audit: {
        phiAccessed: true,
      },
    };
  }

  async generateOrderSetAi(
    userId: string,
    dto: OrderSetAiRequestDto,
    requestMeta: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<OrderSetAiResponseDto> {
    const runId = randomUUID();
    const inputText = normalizeClinicalText([
      dto.clinicalScenario,
      dto.diagnosis,
      dto.patientContext,
      dto.constraints,
    ]);
    const matchedSignals = matchOrderSetSignals(inputText);
    const orderBundles = buildOrderSetBundles(inputText);
    const protocolPathways = buildProtocolPathways(inputText);
    const status =
      orderBundles.length || protocolPathways.length
        ? 'suggestions_generated'
        : 'needs_more_context';
    const blockedActions = [
      'place_orders',
      'sign_orders',
      'modify_ehr',
      'activate_protocol_without_review',
    ];

    await this.auditService.log({
      userId,
      action: AuditAction.AI_QUERY,
      resource: 'clinical-intelligence/order-set-ai',
      phiAccessed: true,
      ipAddress: requestMeta.ipAddress || '0.0.0.0',
      userAgent: requestMeta.userAgent || 'clinical-intelligence',
      metadata: {
        runId,
        capabilityId: 'order-set-ai',
        contractVersion: ORDER_SET_AI_CONTRACT_VERSION,
        status,
        scenarioCharacters: dto.clinicalScenario.length,
        diagnosisProvided: Boolean(dto.diagnosis),
        patientContextProvided: Boolean(dto.patientContext),
        constraintsProvided: Boolean(dto.constraints),
        bundleCount: orderBundles.length,
        pathwayCount: protocolPathways.length,
        blockedActions,
      },
    });

    return {
      runId,
      capabilityId: 'order-set-ai',
      contractVersion: ORDER_SET_AI_CONTRACT_VERSION,
      status,
      orderBundles,
      protocolPathways,
      explainability: {
        matchedSignals,
        method:
          'Matched submitted clinical scenario against curated protocol bundle patterns; returned review-required suggestions only.',
        limitations: [
          'Does not place, sign, route, or activate orders.',
          'Order labels are bundle suggestions and must be reconciled with local policy, allergies, renal function, pregnancy status, and clinician judgment.',
          'Evidence links describe common protocol rationale but are not a substitute for local guideline verification.',
        ],
      },
      safety: {
        reviewRequired: true,
        autonomousOrderPlacement: false,
        blockedActions,
        warnings: [
          'No autonomous order placement. Clinician review is required before any order is entered or signed.',
          'Verify patient-specific contraindications, allergies, renal dosing, local formularies, and institutional pathways.',
        ],
      },
      audit: {
        phiAccessed: true,
      },
    };
  }

  async getAiExplainabilityTrace(
    userId: string,
    dto: AiExplainabilityQueryDto,
    requestMeta: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<AiExplainabilityResponseDto> {
    const runId = randomUUID();
    const limit = clampLogLimit(dto.limit, 25);
    const userLogs = await this.auditService.findByUser(userId, limit);
    const clinicalLogs = filterClinicalAiLogs(userLogs, dto.toolId).slice(0, limit);
    const executionLogs = clinicalLogs.map(sanitizeExecutionLog);
    const confidence = inferExplainabilityConfidence(executionLogs, dto.clinicalQuestion);

    await this.auditService.log({
      userId,
      action: AuditAction.AI_QUERY,
      resource: 'clinical-intelligence/ai-explainability',
      phiAccessed: true,
      ipAddress: requestMeta.ipAddress || '0.0.0.0',
      userAgent: requestMeta.userAgent || 'clinical-intelligence',
      metadata: {
        runId,
        capabilityId: 'ai-explainability',
        contractVersion: AI_EXPLAINABILITY_CONTRACT_VERSION,
        requestedToolId: dto.toolId || null,
        clinicalQuestionProvided: Boolean(dto.clinicalQuestion),
        executionLogCount: executionLogs.length,
        confidenceLabel: confidence.label,
      },
    });

    return {
      runId,
      capabilityId: 'ai-explainability',
      contractVersion: AI_EXPLAINABILITY_CONTRACT_VERSION,
      confidence,
      source: buildExplainabilitySources(executionLogs),
      reasoning: buildExplainabilityReasoning(executionLogs, dto.clinicalQuestion),
      toolChain: buildToolChain(executionLogs),
      executionLogs,
      safety: {
        warnings: [
          'Explainability summarizes audit metadata only and does not expose raw PHI prompts or transcripts.',
          'Confidence reflects trace completeness and source attribution, not clinical truth or diagnostic certainty.',
        ],
      },
    };
  }

  async getClinicalAuditExecutionLogs(
    userId: string,
    dto: ClinicalAuditQueryDto,
    requestMeta: { ipAddress?: string; userAgent?: string; organizationId?: string } = {},
  ): Promise<ClinicalAuditResponseDto> {
    const runId = randomUUID();
    const limit = clampLogLimit(dto.limit, 50);
    const action =
      dto.action === AuditAction.PHI_ACCESS ? AuditAction.PHI_ACCESS : AuditAction.AI_QUERY;
    // HEAL-310: this call previously omitted organizationId entirely (unlike its sibling
    // getAiExplainabilityTrace, which scopes by userId, and unlike AuditController.getLogs,
    // which passes req.tenantContext?.organizationId into this exact same findByAction call).
    // Any authenticated caller with VIEW_AUDIT_LOGS -- a permission granted to the PHYSICIAN
    // role for "own patients only" -- got every organization's PHI-access/AI-query audit
    // trail on the platform, not just their own.
    const auditLogs = await this.auditService.findByAction(
      action,
      limit,
      requestMeta.organizationId,
    );
    const executionLogs = auditLogs
      .filter((log) => !log.resource || log.resource.startsWith('clinical-intelligence/'))
      .slice(0, limit)
      .map(sanitizeExecutionLog);

    await this.auditService.log({
      userId,
      action: AuditAction.AI_QUERY,
      resource: 'clinical-intelligence/clinical-audit',
      phiAccessed: false,
      ipAddress: requestMeta.ipAddress || '0.0.0.0',
      userAgent: requestMeta.userAgent || 'clinical-intelligence',
      metadata: {
        runId,
        capabilityId: 'clinical-audit',
        contractVersion: CLINICAL_AUDIT_CONTRACT_VERSION,
        action,
        executionLogCount: executionLogs.length,
        phiAccessCount: executionLogs.filter((log) => log.phiAccessed).length,
      },
    });

    return {
      runId,
      capabilityId: 'clinical-audit',
      contractVersion: CLINICAL_AUDIT_CONTRACT_VERSION,
      status: executionLogs.length ? 'logs_available' : 'no_logs',
      summary: {
        logCount: executionLogs.length,
        phiAccessCount: executionLogs.filter((log) => log.phiAccessed).length,
        integrityVerifiedCount: executionLogs.filter((log) => log.integrityVerified).length,
        uniqueCapabilities: uniqueStrings(executionLogs.map((log) => log.capabilityId)),
      },
      toolChain: buildToolChain(executionLogs),
      executionLogs,
      safety: {
        warnings: [
          'Clinical audit view shows sanitized execution metadata, hash previews, and integrity flags only.',
          'Use the role-gated audit module for formal compliance export and full chain verification.',
        ],
      },
    };
  }

  private buildDraft(dto: AmbientScribeGenerateDto): AmbientScribeDraft {
    const transcript = normalizeTranscript(dto.transcriptText);
    const patientContext = dto.patientContext || {};
    const contextLine = buildContextLine(patientContext);
    const instructionLine =
      typeof patientContext.clinicianInstructions === 'string' &&
      patientContext.clinicianInstructions.trim()
        ? `Clinician instructions to consider during review: ${patientContext.clinicianInstructions.trim()}`
        : 'No additional clinician instructions were provided.';

    if (dto.noteType === AmbientScribeNoteType.DISCHARGE_SUMMARY) {
      return {
        title: 'Discharge Summary Draft',
        sections: {
          'Reason for Encounter': contextLine,
          'Hospital Course': transcript,
          'Discharge Condition': 'Review required. Confirm condition at discharge before use.',
          'Follow-up and Instructions': instructionLine,
        },
        limitations: SAFETY_WARNINGS,
      };
    }

    if (dto.noteType === AmbientScribeNoteType.REFERRAL) {
      return {
        title: 'Referral Draft',
        sections: {
          'Referral Context': contextLine,
          'Clinical Summary': transcript,
          'Reason for Referral': instructionLine,
          'Requested Review':
            'Review required. Confirm specialty, urgency, and attached records before sending.',
        },
        limitations: SAFETY_WARNINGS,
      };
    }

    return {
      title: 'SOAP Note Draft',
      sections: {
        Subjective: transcript,
        Objective:
          'Review required. Add verified exam, vitals, labs, and imaging from source records.',
        Assessment:
          'Draft assessment requires clinician review and should not be treated as a diagnosis.',
        Plan: instructionLine,
      },
      limitations: SAFETY_WARNINGS,
    };
  }
}

function normalizeClinicalText(values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function demographicsToText(demographics?: Record<string, unknown>): string {
  if (!demographics) return '';
  return Object.entries(demographics)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' ');
}

function buildRankedDifferentials(text: string): DifferentialAiResponseDto['rankedDifferentials'] {
  const rules = [
    {
      condition: 'Acute coronary syndrome',
      triggers: [
        'chest pain',
        'chest pressure',
        'diaphoresis',
        'troponin',
        'st depression',
        'nstemi',
        'acs',
      ],
      supportingEvidence: [
        'Chest pain or pressure pattern',
        'Cardiac biomarker or ECG concern when present',
      ],
      missingEvidence: ['Serial troponins', 'ECG interpretation', 'Hemodynamic stability'],
      urgencyFlags: ['Treat ongoing ischemic symptoms or instability as time-sensitive.'],
      calculators: ['heart-score', 'timi-ua-nstemi', 'grace-acs'],
    },
    {
      condition: 'Pulmonary embolism',
      triggers: [
        'dyspnea',
        'shortness of breath',
        'pleuritic',
        'hemoptysis',
        'dvt',
        'tachycardia',
        'pe',
      ],
      supportingEvidence: ['Dyspnea/pleuritic symptoms or DVT features when present'],
      missingEvidence: [
        'Oxygen saturation',
        'DVT signs',
        'Recent surgery/immobility',
        'Hemoptysis',
      ],
      urgencyFlags: ['Escalate immediately for hypoxia, syncope, shock, or high-risk PE concern.'],
      calculators: ['wells-pe', 'perc'],
    },
    {
      condition: 'Sepsis or serious infection',
      triggers: [
        'fever',
        'infection',
        'sepsis',
        'hypotension',
        'tachypnea',
        'lactate',
        'altered mental status',
      ],
      supportingEvidence: ['Infectious symptoms or physiologic derangement when present'],
      missingEvidence: [
        'Vital signs',
        'lactate',
        'source evaluation',
        'cultures and organ dysfunction markers',
      ],
      urgencyFlags: [
        'Hypotension, altered mentation, or high lactate require urgent clinical escalation.',
      ],
      calculators: ['qsofa', 'news2', 'sofa-score'],
    },
    {
      condition: 'Stroke or transient ischemic attack',
      triggers: [
        'weakness',
        'facial droop',
        'aphasia',
        'slurred speech',
        'stroke',
        'tia',
        'neurologic deficit',
      ],
      supportingEvidence: ['Focal neurologic symptoms when present'],
      missingEvidence: ['Last known well', 'NIHSS elements', 'glucose', 'neuroimaging status'],
      urgencyFlags: ['Acute focal deficits require emergency stroke pathway activation.'],
      calculators: ['nihss', 'abcd2', 'gcs-calculator'],
    },
  ];

  return rules
    .map((rule) => {
      const matches = rule.triggers.filter((trigger) => text.includes(trigger));
      return { rule, matches };
    })
    .filter(({ matches }) => matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length)
    .slice(0, 5)
    .map(({ rule, matches }, index) => ({
      rank: index + 1,
      condition: rule.condition,
      likelihood: index === 0 && matches.length >= 2 ? 'higher' : index <= 2 ? 'moderate' : 'lower',
      supportingEvidence: rule.supportingEvidence.concat(
        matches.map((match) => `Matched input keyword: ${match}`),
      ),
      missingEvidence: rule.missingEvidence,
      urgencyFlags: rule.urgencyFlags,
    }));
}

function buildDifferentialCalculatorSuggestions(
  text: string,
): DifferentialAiResponseDto['suggestedCalculators'] {
  const suggestions = [
    {
      id: 'heart-score',
      label: 'HEART score',
      route: '/tools/calculators/heart-score',
      keywords: ['chest pain', 'chest pressure', 'troponin', 'acs'],
      rationale: 'Chest pain risk stratification support.',
    },
    {
      id: 'timi-ua-nstemi',
      label: 'TIMI (UA/NSTEMI)',
      route: '/tools/calculators/timi-ua-nstemi',
      keywords: ['chest pain', 'nstemi', 'troponin', 'acs'],
      rationale: 'UA/NSTEMI risk context when ACS is considered.',
    },
    {
      id: 'wells-pe',
      label: 'Wells PE',
      route: '/tools/calculators',
      keywords: ['dyspnea', 'shortness of breath', 'pleuritic', 'pe', 'dvt'],
      rationale: 'PE pre-test probability support.',
    },
    {
      id: 'qsofa',
      label: 'qSOFA',
      route: '/tools/calculators/qsofa',
      keywords: ['sepsis', 'infection', 'hypotension', 'tachypnea'],
      rationale: 'Suspected infection bedside risk screen.',
    },
    {
      id: 'nihss',
      label: 'NIHSS',
      route: '/tools/calculators',
      keywords: ['stroke', 'weakness', 'aphasia', 'facial droop'],
      rationale: 'Stroke severity documentation support.',
    },
  ];

  return suggestions
    .filter((item) => item.keywords.some((keyword) => text.includes(keyword)))
    .map(({ keywords: _keywords, ...item }) => item);
}

interface NormalizedTimelineEncounter {
  encounter: TimelineAiEncounterDto;
  combinedText: string;
}

function buildNormalizedTimelineEncounters(
  encounters: TimelineAiEncounterDto[],
): NormalizedTimelineEncounter[] {
  return encounters.map((encounter) => ({
    encounter,
    combinedText: normalizeClinicalText([encounter.details, encounter.labs, encounter.vitals]),
  }));
}

function buildTimelineEvents(
  normalizedEncounters: NormalizedTimelineEncounter[],
): TimelineAiResponseDto['timeline'] {
  return normalizedEncounters.map(({ encounter, combinedText }, index) => {
    return {
      id: `encounter-${index + 1}`,
      dateLabel: encounter.date?.trim() || `Encounter ${index + 1}`,
      encounterType: encounter.encounterType?.trim() || 'Clinical encounter',
      title: encounter.title?.trim() || summarizeText(encounter.details, 80),
      summary: summarizeText(encounter.details, 220),
      keyFindings: buildEncounterFindings(encounter),
      abnormalSignals: detectAbnormalSignals(combinedText),
    };
  });
}

function buildEncounterFindings(encounter: TimelineAiEncounterDto): string[] {
  return [
    encounter.details ? `Encounter: ${summarizeText(encounter.details, 140)}` : null,
    encounter.labs ? `Labs/studies: ${summarizeText(encounter.labs, 140)}` : null,
    encounter.vitals ? `Vitals: ${summarizeText(encounter.vitals, 140)}` : null,
  ].filter(Boolean) as string[];
}

function detectAbnormalSignals(text: string): string[] {
  const rules = [
    {
      label: 'Possible hypoxia or respiratory decline',
      keywords: ['hypoxia', 'spo2', 'oxygen', 'dyspnea'],
    },
    {
      label: 'Possible hemodynamic instability',
      keywords: ['hypotension', 'shock', 'syncope', 'tachycardia'],
    },
    {
      label: 'Possible renal function worsening',
      keywords: ['creatinine', 'aki', 'renal', 'egfr'],
    },
    {
      label: 'Possible infectious progression',
      keywords: ['fever', 'sepsis', 'lactate', 'leukocytosis'],
    },
    {
      label: 'Possible worsening symptoms',
      keywords: ['worsening', 'progressive', 'increasing', 'recurrent'],
    },
  ];

  return rules
    .filter((rule) => rule.keywords.some((keyword) => text.includes(keyword)))
    .map((rule) => rule.label);
}

function buildTimelineTrends(
  normalizedEncounters: NormalizedTimelineEncounter[],
): TimelineAiResponseDto['trends'] {
  const trendRules = [
    {
      id: 'respiratory',
      label: 'Respiratory status',
      keywords: ['dyspnea', 'shortness of breath', 'spo2', 'oxygen', 'hypoxia'],
    },
    {
      id: 'renal',
      label: 'Renal/lab trajectory',
      keywords: ['creatinine', 'aki', 'egfr', 'bun', 'renal'],
    },
    {
      id: 'infection',
      label: 'Infection/inflammation markers',
      keywords: ['fever', 'sepsis', 'lactate', 'wbc', 'leukocytosis'],
    },
    {
      id: 'hemodynamics',
      label: 'Hemodynamic stability',
      keywords: ['hypotension', 'tachycardia', 'bp', 'shock', 'syncope'],
    },
  ];

  const normalizedEncounterTexts = normalizedEncounters.map((entry) => entry.combinedText);
  const trendDirection = inferTrendDirection(normalizedEncounterTexts);

  return trendRules
    .map((rule) => {
      const matchedEvidence = normalizedEncounterTexts
        .map((text, index) => {
          const matched = rule.keywords.filter((keyword) => text.includes(keyword));
          return matched.length ? `Encounter ${index + 1}: ${matched.join(', ')}` : null;
        })
        .filter(Boolean) as string[];

      if (!matchedEvidence.length) return null;

      return {
        id: rule.id,
        label: rule.label,
        direction: trendDirection,
        evidence: matchedEvidence,
      };
    })
    .filter(Boolean) as TimelineAiResponseDto['trends'];
}

function inferTrendDirection(
  texts: string[],
): TimelineAiResponseDto['trends'][number]['direction'] {
  const combined = texts.join(' ');
  if (/\b(improved|improving|resolved|decreased|downtrending)\b/.test(combined)) return 'improving';
  if (/\b(worsening|progressive|increasing|elevated|rising|recurrent|decline)\b/.test(combined)) {
    return 'worsening';
  }
  if (/\b(stable|unchanged|baseline)\b/.test(combined)) return 'stable';
  return 'unclear';
}

function buildAbnormalProgression(
  timeline: TimelineAiResponseDto['timeline'],
  trends: TimelineAiResponseDto['trends'],
): TimelineAiResponseDto['abnormalProgression'] {
  const flags = timeline
    .filter((event) => event.abnormalSignals.length > 0)
    .map((event, index) => ({
      id: `progression-${index + 1}`,
      severity: event.abnormalSignals.some((signal) =>
        /hemodynamic|hypoxia|infectious/i.test(signal),
      )
        ? ('urgent_review' as const)
        : ('watch' as const),
      signal: event.abnormalSignals.join('; '),
      rationale: `Abnormal signal detected in ${event.dateLabel}: ${event.summary}`,
      relatedEncounterIds: [event.id],
    }));

  const worseningTrends = trends.filter((trend) => trend.direction === 'worsening');
  const timelineEventIds = timeline.map((event) => event.id);
  return flags.concat(
    worseningTrends.map((trend, index) => ({
      id: `trend-progression-${index + 1}`,
      severity: 'watch' as const,
      signal: `${trend.label} worsening trend`,
      rationale: trend.evidence.join('; '),
      relatedEncounterIds: timelineEventIds,
    })),
  );
}

function summarizeText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'No details provided.';
  const sentence =
    normalized.split(/(?<=[.!?])\s+/).find((part) => part.length >= 12) || normalized;
  return sentence.length > maxLength ? `${sentence.slice(0, maxLength - 3)}...` : sentence;
}

function splitClinicalList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/\n|;|,(?=\s*[A-Za-z])/)
    .map((item) => item.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 12);
}

function buildActiveProblems(
  dto: PatientSummaryAiRequestDto,
  inputText: string,
): PatientSummaryAiResponseDto['activeProblems'] {
  const explicitProblems = splitClinicalList(dto.problems);
  const inferred = [
    { label: 'Congestive heart failure', keywords: ['chf', 'heart failure', 'volume overload'] },
    {
      label: 'Chronic kidney disease / renal impairment',
      keywords: ['ckd', 'creatinine', 'renal', 'egfr'],
    },
    { label: 'Diabetes mellitus', keywords: ['diabetes', 'dm2', 'a1c', 'insulin', 'metformin'] },
    { label: 'Hypertension', keywords: ['hypertension', 'htn', 'lisinopril', 'amlodipine'] },
    { label: 'Possible acute infection', keywords: ['fever', 'sepsis', 'leukocytosis', 'lactate'] },
  ]
    .filter((rule) => rule.keywords.some((keyword) => inputText.includes(keyword)))
    .map((rule) => rule.label);

  return uniqueStrings(explicitProblems.concat(inferred))
    .slice(0, 10)
    .map((label) => ({
      label,
      evidence: buildProblemEvidence(label, dto),
      priority: inferProblemPriority(label, inputText),
    }));
}

function buildProblemEvidence(label: string, dto: PatientSummaryAiRequestDto): string[] {
  return [
    dto.problems && dto.problems.toLowerCase().includes(label.toLowerCase().split(' ')[0])
      ? 'Listed in submitted active problems.'
      : null,
    dto.patientContext ? `Context: ${summarizeText(dto.patientContext, 140)}` : null,
    dto.notes ? `Notes: ${summarizeText(dto.notes, 140)}` : null,
  ].filter(Boolean) as string[];
}

function inferProblemPriority(
  label: string,
  inputText: string,
): PatientSummaryAiResponseDto['activeProblems'][number]['priority'] {
  if (/\b(sepsis|hypotension|critical|acute|worsening|urgent)\b/.test(inputText)) return 'high';
  if (/\b(chf|heart failure|ckd|renal|diabetes|insulin)\b/.test(label.toLowerCase()))
    return 'medium';
  return 'routine';
}

function buildMedicationSummary(value?: string): PatientSummaryAiResponseDto['medications'] {
  return splitClinicalList(value).map((item) => {
    const lower = item.toLowerCase();
    return {
      name: item,
      context: inferMedicationContext(lower),
      reviewFlags: inferMedicationReviewFlags(lower),
    };
  });
}

function inferMedicationContext(value: string): string {
  if (/\b(insulin|metformin|glipizide)\b/.test(value)) return 'Diabetes therapy context.';
  if (/\b(furosemide|bumetanide|torsemide)\b/.test(value))
    return 'Volume status / diuretic therapy context.';
  if (/\b(lisinopril|losartan|spironolactone)\b/.test(value))
    return 'Renal function and potassium monitoring context.';
  if (/\b(warfarin|apixaban|rivaroxaban|heparin)\b/.test(value))
    return 'Anticoagulation review context.';
  return 'Medication listed for clinician reconciliation.';
}

function inferMedicationReviewFlags(value: string): string[] {
  return [
    /\b(lisinopril|losartan|spironolactone|potassium)\b/.test(value)
      ? 'Review potassium and renal function.'
      : null,
    /\b(metformin)\b/.test(value) ? 'Review renal function and contrast exposure context.' : null,
    /\b(warfarin|apixaban|rivaroxaban|heparin)\b/.test(value)
      ? 'Review bleeding risk and indication.'
      : null,
  ].filter(Boolean) as string[];
}

function buildRecentLabs(value?: string): PatientSummaryAiResponseDto['recentLabs'] {
  return splitClinicalList(value).map((item) => {
    const [label, ...rest] = item.split(/\s+/);
    return {
      label: label || 'Lab',
      value: rest.join(' ') || item,
      interpretation: inferLabInterpretation(item.toLowerCase()),
    };
  });
}

function inferLabInterpretation(
  value: string,
): PatientSummaryAiResponseDto['recentLabs'][number]['interpretation'] {
  if (/\b(critical|panic|k\s*6|potassium\s*6|lactate\s*[4-9]|troponin)\b/.test(value)) {
    return 'critical_review';
  }
  if (/\b(elevated|high|low|rising|worsening|abnormal|creatinine|a1c|k\s*5\.[5-9])\b/.test(value)) {
    return 'abnormal';
  }
  if (/\b(stable|baseline|monitor)\b/.test(value)) return 'monitor';
  return 'unknown';
}

function buildSummaryAlerts(
  dto: PatientSummaryAiRequestDto,
  inputText: string,
): PatientSummaryAiResponseDto['alerts'] {
  const explicitAlerts = splitClinicalList(dto.alerts).map((message) => ({
    severity: inferAlertSeverity(message.toLowerCase()),
    message,
    rationale: 'Submitted alert context.',
  }));

  const inferredAlerts = [
    inputText.includes('hyperkalemia') || /\bk\s*(5\.[5-9]|6)/.test(inputText)
      ? {
          severity: 'urgent_review' as const,
          message: 'Possible hyperkalemia risk',
          rationale: 'Potassium or hyperkalemia signal detected in submitted labs/alerts.',
        }
      : null,
    inputText.includes('fall risk')
      ? {
          severity: 'watch' as const,
          message: 'Fall risk',
          rationale: 'Fall risk signal detected in submitted alerts or notes.',
        }
      : null,
    /\b(allergy|anaphylaxis)\b/.test(inputText)
      ? {
          severity: 'urgent_review' as const,
          message: 'Allergy safety review',
          rationale: 'Allergy or anaphylaxis signal detected in submitted context.',
        }
      : null,
  ].filter(Boolean) as PatientSummaryAiResponseDto['alerts'];

  return explicitAlerts.concat(inferredAlerts).slice(0, 12);
}

function inferAlertSeverity(
  value: string,
): PatientSummaryAiResponseDto['alerts'][number]['severity'] {
  if (/\b(critical|urgent|hyperkalemia|anaphylaxis|sepsis)\b/.test(value)) return 'urgent_review';
  if (/\b(risk|watch|monitor|fall)\b/.test(value)) return 'watch';
  return 'info';
}

function buildRiskFactors(
  dto: PatientSummaryAiRequestDto,
  inputText: string,
): PatientSummaryAiResponseDto['riskFactors'] {
  const explicitRiskFactors = splitClinicalList(dto.riskFactors).map((label) => ({
    label,
    rationale: 'Submitted risk factor.',
  }));
  const inferred = [
    {
      label: 'Chronic kidney disease',
      keywords: ['ckd', 'renal', 'creatinine'],
      rationale: 'Renal risk signal.',
    },
    {
      label: 'Diabetes',
      keywords: ['diabetes', 'a1c', 'insulin'],
      rationale: 'Metabolic risk signal.',
    },
    {
      label: 'Cardiovascular disease risk',
      keywords: ['mi', 'cad', 'chf', 'hypertension'],
      rationale: 'Cardiovascular risk signal.',
    },
    {
      label: 'Tobacco exposure',
      keywords: ['smoking', 'smoker', 'tobacco'],
      rationale: 'Tobacco exposure signal.',
    },
  ]
    .filter((rule) => rule.keywords.some((keyword) => inputText.includes(keyword)))
    .map(({ label, rationale }) => ({ label, rationale }));

  return uniqueSummaryItems(explicitRiskFactors.concat(inferred)).slice(0, 12);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function uniqueSummaryItems<T extends { label: string }>(values: T[]): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function clampLogLimit(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), 100);
}

function filterClinicalAiLogs(logs: any[], toolId?: string): any[] {
  return logs.filter((log) => {
    const resource = String(log.resource || '');
    if (!resource.startsWith('clinical-intelligence/')) return false;
    if (!toolId) return true;
    return resource.endsWith(`/${toolId}`) || log.metadata?.capabilityId === toolId;
  });
}

function sanitizeExecutionLog(log: any): SanitizedExecutionLogDto {
  const metadata = (log.metadata || {}) as Record<string, unknown>;
  const capabilityId = String(metadata.capabilityId || log.resource?.split('/').pop() || 'unknown');
  return {
    id: String(log.id || metadata.runId || 'log'),
    timestamp: log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString(),
    action: String(log.action || 'unknown'),
    resource: String(log.resource || 'unknown'),
    capabilityId,
    status: String(metadata.status || 'logged'),
    phiAccessed: Boolean(log.phiAccessed),
    integrityVerified: Boolean(log.integrityVerified),
    hashPreview: typeof log.hash === 'string' ? `${log.hash.slice(0, 10)}...` : 'unavailable',
    metadataSummary: summarizeAuditMetadata(metadata),
  };
}

function summarizeAuditMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const allowedKeys = [
    'runId',
    'capabilityId',
    'contractVersion',
    'status',
    'sourceCount',
    'chunksRetrieved',
    'bundleCount',
    'pathwayCount',
    'activeProblemCount',
    'medicationCount',
    'labCount',
    'alertCount',
    'riskFactorCount',
    'timelineEventCount',
    'abnormalProgressionCount',
    'confidenceLabel',
    'executionLogCount',
  ];

  return Object.fromEntries(
    allowedKeys.filter((key) => metadata[key] !== undefined).map((key) => [key, metadata[key]]),
  );
}

function inferExplainabilityConfidence(
  logs: SanitizedExecutionLogDto[],
  clinicalQuestion?: string,
): AiExplainabilityResponseDto['confidence'] {
  const hasSources = logs.some((log) =>
    ['sourceCount', 'chunksRetrieved'].some((key) => Number(log.metadataSummary[key] || 0) > 0),
  );
  const hasRecentLogs = logs.length > 0;
  const score = hasSources ? 0.86 : hasRecentLogs ? 0.68 : 0.34;
  const label = score >= 0.8 ? 'high' : score >= 0.5 ? 'medium' : 'low';
  const questionContext = clinicalQuestion ? ' for the submitted question' : '';

  return {
    score,
    label,
    rationale: hasRecentLogs
      ? `Confidence is based on available execution trace completeness${questionContext}, source metadata, and audit integrity flags.`
      : 'Low confidence because no matching clinical AI execution logs were available for this trace.',
  };
}

function buildExplainabilitySources(
  logs: SanitizedExecutionLogDto[],
): AiExplainabilityResponseDto['source'] {
  if (!logs.length) {
    return [
      {
        label: 'No matching execution source',
        detail: 'Run a clinical AI workflow to populate source traces.',
      },
    ];
  }

  return logs.slice(0, 5).map((log) => ({
    label: log.capabilityId,
    detail: `${log.resource}; status=${log.status}; hash=${log.hashPreview}`,
  }));
}

function buildExplainabilityReasoning(
  logs: SanitizedExecutionLogDto[],
  clinicalQuestion?: string,
): string[] {
  return [
    clinicalQuestion
      ? 'Used the submitted clinical question to scope the trace review.'
      : 'No specific clinical question was supplied; summarized the latest available AI workflow traces.',
    logs.length
      ? `Reviewed ${logs.length} sanitized execution log(s) for confidence, source, reasoning, and tool-chain metadata.`
      : 'No matching clinical AI logs were available, so reasoning is limited to system capability metadata.',
    'Excluded raw prompts, transcripts, chart text, and patient-specific free text from the explainability payload.',
  ];
}

function buildToolChain(logs: SanitizedExecutionLogDto[]): string[] {
  return uniqueStrings(logs.map((log) => `${log.capabilityId} -> ${log.status} -> ${log.action}`));
}

function matchOrderSetSignals(text: string): string[] {
  const signals = [
    {
      label: 'Sepsis / infection pathway signal',
      keywords: ['sepsis', 'lactate', 'hypotension', 'fever', 'infection'],
    },
    {
      label: 'Acute coronary syndrome pathway signal',
      keywords: ['chest pain', 'acs', 'troponin', 'stemi', 'nstemi'],
    },
    {
      label: 'Stroke pathway signal',
      keywords: ['stroke', 'aphasia', 'weakness', 'facial droop', 'last known well'],
    },
    {
      label: 'COPD / respiratory pathway signal',
      keywords: ['copd', 'wheezing', 'hypoxia', 'oxygen', 'dyspnea'],
    },
    {
      label: 'Renal/allergy constraint signal',
      keywords: ['ckd', 'renal', 'creatinine', 'allergy', 'dose'],
    },
  ];

  return signals
    .filter((signal) => signal.keywords.some((keyword) => text.includes(keyword)))
    .map((signal) => signal.label);
}

function buildOrderSetBundles(text: string): OrderSetAiResponseDto['orderBundles'] {
  const rules: Array<{
    id: string;
    title: string;
    intent: string;
    keywords: string[];
    suggestedOrders: OrderSetAiResponseDto['orderBundles'][number]['suggestedOrders'];
    evidenceLinks: OrderSetAiResponseDto['orderBundles'][number]['evidenceLinks'];
    reviewChecklist: string[];
  }> = [
    {
      id: 'sepsis-initial-review',
      title: 'Sepsis Initial Evaluation Bundle',
      intent:
        'Support early recognition, source evaluation, perfusion assessment, and antimicrobial review.',
      keywords: ['sepsis', 'infection', 'lactate', 'hypotension', 'fever'],
      suggestedOrders: [
        {
          category: 'labs',
          label: 'CBC, CMP, lactate, blood cultures before antimicrobials when feasible',
          rationale:
            'Common sepsis pathways assess organ dysfunction, perfusion, and microbiology source data.',
          reviewRequired: true,
        },
        {
          category: 'medications',
          label: 'Empiric antimicrobial selection per local source-specific pathway',
          rationale:
            'Antimicrobial choice must account for source, allergy, renal function, resistance, and stewardship policy.',
          reviewRequired: true,
        },
        {
          category: 'monitoring',
          label: 'Repeat lactate and hemodynamic reassessment if initially abnormal',
          rationale: 'Serial reassessment helps track perfusion response and deterioration risk.',
          reviewRequired: true,
        },
      ],
      evidenceLinks: [
        {
          label: 'Sepsis bundle principles',
          basis:
            'Common institutional sepsis pathways emphasize lactate, cultures, early antimicrobials, and reassessment.',
        },
      ],
      reviewChecklist: [
        'Confirm infection source and severity.',
        'Check allergies, renal function, prior cultures, and local antibiogram.',
        'Escalate for shock, altered mental status, hypoxia, or persistent hypotension.',
      ],
    },
    {
      id: 'acs-evaluation-review',
      title: 'ACS Evaluation Bundle',
      intent: 'Support suspected ACS evaluation while prioritizing emergency pathways.',
      keywords: ['chest pain', 'acs', 'troponin', 'stemi', 'nstemi'],
      suggestedOrders: [
        {
          category: 'labs',
          label: 'Serial troponins and basic labs per local chest pain pathway',
          rationale:
            'Serial biomarkers are commonly used with ECG and clinical assessment for ACS evaluation.',
          reviewRequired: true,
        },
        {
          category: 'monitoring',
          label: 'Telemetry and repeat ECG timing per protocol',
          rationale:
            'Dynamic ECG changes and rhythm monitoring may affect urgency and pathway selection.',
          reviewRequired: true,
        },
        {
          category: 'consults',
          label: 'Cardiology or cath lab pathway review for STEMI/unstable features',
          rationale: 'Unstable ACS or STEMI requires immediate local escalation pathways.',
          reviewRequired: true,
        },
      ],
      evidenceLinks: [
        {
          label: 'ACS pathway principles',
          basis:
            'Chest pain pathways commonly combine ECG, serial biomarkers, monitoring, and escalation criteria.',
        },
      ],
      reviewChecklist: [
        'Do not delay STEMI or unstable ACS activation.',
        'Review bleeding risk, allergies, anticoagulation, and contraindications before medication orders.',
      ],
    },
    {
      id: 'stroke-pathway-review',
      title: 'Acute Stroke Pathway Bundle',
      intent: 'Support rapid stroke pathway evaluation and team activation review.',
      keywords: ['stroke', 'aphasia', 'weakness', 'facial droop', 'last known well'],
      suggestedOrders: [
        {
          category: 'imaging',
          label: 'Neuroimaging pathway per institutional stroke protocol',
          rationale:
            'Acute focal neurologic deficits require urgent imaging and eligibility assessment.',
          reviewRequired: true,
        },
        {
          category: 'labs',
          label: 'Point-of-care glucose and stroke protocol labs',
          rationale:
            'Glucose and protocol labs support immediate evaluation and treatment eligibility review.',
          reviewRequired: true,
        },
        {
          category: 'consults',
          label: 'Stroke team / neurology activation review',
          rationale: 'Time-sensitive deficits require local stroke pathway escalation.',
          reviewRequired: true,
        },
      ],
      evidenceLinks: [
        {
          label: 'Stroke pathway principles',
          basis:
            'Institutional stroke protocols prioritize last-known-well, glucose, imaging, and specialist activation.',
        },
      ],
      reviewChecklist: [
        'Confirm last known well and anticoagulant history.',
        'Do not delay emergency stroke pathway activation to complete AI review.',
      ],
    },
  ];

  const matched = rules.filter((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
  const fallback =
    matched.length > 0
      ? []
      : [
          {
            id: 'general-admission-review',
            title: 'General Admission Review Bundle',
            intent: 'Organize common review categories for clinician-selected admission orders.',
            keywords: [],
            suggestedOrders: [
              {
                category: 'labs' as const,
                label: 'Basic admission labs as clinically indicated',
                rationale:
                  'General admission workflows commonly verify baseline organ function and safety labs.',
                reviewRequired: true as const,
              },
              {
                category: 'nursing' as const,
                label: 'Vitals, intake/output, mobility/fall precautions as appropriate',
                rationale:
                  'Nursing safety orders depend on acuity, mobility, and monitoring needs.',
                reviewRequired: true as const,
              },
            ],
            evidenceLinks: [
              {
                label: 'General admission workflow',
                basis:
                  'Common inpatient pathways organize labs, monitoring, nursing safety, and consult review.',
              },
            ],
            reviewChecklist: [
              'Select orders only after clinician review of diagnosis, acuity, allergies, and goals of care.',
            ],
          },
        ];

  return matched
    .concat(fallback)
    .slice(0, 3)
    .map(({ keywords: _keywords, ...bundle }) => bundle);
}

function buildProtocolPathways(text: string): OrderSetAiResponseDto['protocolPathways'] {
  const pathways = [
    {
      id: 'sepsis-pathway',
      name: 'Sepsis Recognition and Reassessment Pathway',
      trigger:
        'Suspected infection with hypotension, elevated lactate, organ dysfunction, or concerning vitals.',
      keywords: ['sepsis', 'infection', 'lactate', 'hypotension', 'fever'],
      steps: [
        'Confirm suspected source and severity using source chart data.',
        'Review lactate, cultures, antimicrobial timing, fluids, and reassessment needs.',
        'Escalate to local sepsis/shock pathway if instability persists.',
      ],
      escalationCriteria: [
        'Persistent hypotension',
        'Rising lactate',
        'Altered mental status',
        'Hypoxia or shock',
      ],
    },
    {
      id: 'acs-pathway',
      name: 'Chest Pain / ACS Pathway',
      trigger: 'Chest pain, ischemic symptoms, elevated troponin, or ECG concern.',
      keywords: ['chest pain', 'acs', 'troponin', 'stemi', 'nstemi'],
      steps: [
        'Prioritize ECG review and local STEMI/unstable ACS criteria.',
        'Review serial biomarkers, monitoring, and cardiology escalation criteria.',
        'Verify contraindications before any antithrombotic or procedural order.',
      ],
      escalationCriteria: [
        'STEMI criteria',
        'Hemodynamic instability',
        'Refractory ischemic symptoms',
        'Malignant arrhythmia',
      ],
    },
    {
      id: 'stroke-pathway',
      name: 'Acute Stroke Pathway',
      trigger: 'New focal neurologic deficit or suspected acute stroke/TIA.',
      keywords: ['stroke', 'aphasia', 'weakness', 'facial droop', 'last known well'],
      steps: [
        'Confirm last-known-well and immediate safety status.',
        'Review glucose, neuroimaging pathway, and stroke team activation.',
        'Document contraindication review through local protocol.',
      ],
      escalationCriteria: [
        'Acute focal deficit',
        'Airway compromise',
        'Thrombolysis/thrombectomy eligibility question',
      ],
    },
  ];

  return pathways
    .filter((pathway) => pathway.keywords.some((keyword) => text.includes(keyword)))
    .map(({ keywords: _keywords, ...pathway }) => pathway);
}

function buildCitations(chunks: RetrievedChunk[]): GuidelineRagCitation[] {
  const bySource = new Map<string, GuidelineRagCitation>();
  for (const chunk of chunks) {
    const sourceId = chunk.metadata?.sourceId || chunk.id;
    if (!bySource.has(sourceId)) {
      bySource.set(sourceId, {
        id: bySource.size + 1,
        sourceId,
        title: chunk.metadata?.title || 'Untitled guideline source',
        type: chunk.metadata?.type || 'guideline',
        organization: chunk.metadata?.organization,
        date: chunk.metadata?.date,
        url: chunk.metadata?.url,
      });
    }
  }
  return [...bySource.values()];
}

function buildSourceAttribution(
  chunks: RetrievedChunk[],
  citations: GuidelineRagCitation[],
): GuidelineRagSourceAttribution[] {
  const citationBySource = new Map(citations.map((citation) => [citation.sourceId, citation.id]));
  return chunks.map((chunk) => {
    const sourceId = chunk.metadata?.sourceId || chunk.id;
    return {
      chunkId: chunk.id,
      sourceId,
      title: chunk.metadata?.title || 'Untitled guideline source',
      score: chunk.score,
      chunkIndex: chunk.metadata?.chunkIndex,
      citationId: citationBySource.get(sourceId) || 0,
    };
  });
}

function buildCitationBoundRecommendations(
  chunks: RetrievedChunk[],
  citations: GuidelineRagCitation[],
): Array<{ id: string; text: string; citationIds: number[] }> {
  const citationBySource = new Map(citations.map((citation) => [citation.sourceId, citation.id]));
  return chunks.slice(0, 5).map((chunk, index) => {
    const sourceId = chunk.metadata?.sourceId || chunk.id;
    return {
      id: `rec-${index + 1}`,
      text: extractSupportedSentence(chunk.text),
      citationIds: [citationBySource.get(sourceId) || 0].filter(Boolean),
    };
  });
}

function extractSupportedSentence(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Retrieved source passage is empty.';
  const sentence =
    normalized.split(/(?<=[.!?])\s+/).find((part) => part.length >= 20) || normalized;
  return sentence.length > 280 ? `${sentence.slice(0, 277)}...` : sentence;
}

function normalizeTranscript(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function buildContextLine(patientContext: Record<string, unknown>): string {
  const parts = [
    typeof patientContext.patientLabel === 'string' && patientContext.patientLabel.trim()
      ? `Patient/encounter: ${patientContext.patientLabel.trim()}`
      : null,
    typeof patientContext.encounterType === 'string' && patientContext.encounterType.trim()
      ? `Encounter type: ${patientContext.encounterType.trim()}`
      : null,
  ].filter(Boolean);

  return parts.length ? parts.join('. ') : 'Encounter context not specified.';
}
