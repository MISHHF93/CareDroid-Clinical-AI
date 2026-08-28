/**
 * Chief Investigation Service — deterministic "investigate this patient" runner.
 *
 * Executes a FIXED plan (no LLM planning in v1):
 *   1. verify patient within tenant scope
 *   2. retrieve vitals + freshness
 *   3. run NEWS2 via the tool orchestrator (deterministic executor)
 *   4. assess short-horizon trend
 *   5. synthesize findings with truthful states
 *   6. PREPARE suggested actions as approval-required AiActionProposals
 *
 * Autonomy boundary: LEVEL_0 (observe/calculate) + LEVEL_2 (prepare only).
 * Nothing here mutates clinical state; proposals execute only after explicit
 * human approval through the existing AiActionProposal flow.
 */

import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EmergencyPatientService } from '../emergency-os/emergency-os.services';
import type { EmergencyPatient } from '../emergency-os/emergency-os.types';
import { ToolOrchestratorService } from '../medical-control-plane/tool-orchestrator/tool-orchestrator.service';
import {
  AiActionProposalService,
  type ServerAiActionProposal,
} from '../ai/ai-action-proposal.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import {
  INVESTIGATION_DISCLAIMER,
  INVESTIGATION_PLAN_VERSION,
  deriveInvestigationSynthesis,
  deriveTrendNotes,
  deriveVitalsFreshness,
  mapLatestVitalsToNews2Parameters,
} from './investigation-plan.lib';
import type {
  InvestigationAutonomyLevel,
  InvestigationRunResult,
  InvestigationStepTrace,
} from './chief-investigation.types';

const MAX_RETAINED_RUNS = 200;

export interface RunInvestigationInput {
  patientId: string;
  requestedByUserId: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ChiefInvestigationService {
  private readonly logger = new Logger(ChiefInvestigationService.name);
  private readonly runs = new Map<string, InvestigationRunResult>();

  constructor(
    private readonly patientService: EmergencyPatientService,
    private readonly toolOrchestrator: ToolOrchestratorService,
    private readonly actionProposals: AiActionProposalService,
    private readonly auditService: AuditService,
  ) {}

  // Same object-level-authorization gap as HEAL-325 (AiActionProposalService.get):
  // runId is a random UUID with no other access control in front of it, so a
  // lookup keyed only by runId would let any authenticated user across any
  // tenant read another organization's patient investigation (PHI). Mirrors
  // assertProposalOrganization's permissive-when-unset semantics.
  getRun(runId: string, organizationId?: string): InvestigationRunResult | undefined {
    const run = this.runs.get(runId);
    if (!run) return undefined;
    if (organizationId && run.organizationId && run.organizationId !== organizationId) {
      return undefined;
    }
    return run;
  }

  async runDeteriorationInvestigation(
    input: RunInvestigationInput,
  ): Promise<InvestigationRunResult> {
    const runId = randomUUID();
    const steps: InvestigationStepTrace[] = [];

    // Step 1 — verify patient within scope (object-level authorization).
    let patient: EmergencyPatient | undefined;
    try {
      patient = this.patientService.getPatient(input.patientId, input.organizationId);
    } catch (error) {
      patient = undefined;
      this.logger.warn(`Patient lookup threw during investigation ${runId}: ${String(error)}`);
    }

    if (!patient) {
      steps.push({
        stepId: 'verify_patient',
        label: 'Verify patient context',
        status: 'failed',
        detail: 'No in-scope patient record resolved for the requested id.',
      });
      const synthesis = deriveInvestigationSynthesis({
        patientVerified: false,
        hasVitals: false,
        vitalsAgeMinutes: null,
        news2Executed: false,
        trendNotes: [],
        assumptions: [],
      });
      return this.finalizeRun(
        runId,
        input,
        steps,
        synthesis.findings,
        synthesis.preparedActionSpecs,
        [],
        'LEVEL_0_OBSERVE',
      );
    }

    steps.push({
      stepId: 'verify_patient',
      label: 'Verify patient context',
      status: 'completed',
      detail: `In-scope patient resolved (${patient.mrn ?? patient.id}).`,
    });

    this.auditAsync(
      this.auditService.log({
        userId: input.requestedByUserId,
        organizationId: input.organizationId,
        action: AuditAction.CLINICAL_DATA_ACCESS,
        resource: `emergency_patient:${patient.id}`,
        ipAddress: input.ipAddress ?? 'unknown',
        userAgent: input.userAgent ?? 'unknown',
        phiAccessed: true,
        metadata: { runId, goal: 'deterioration_investigation' },
      }),
      'clinical data access',
      runId,
    );

    // Step 2 — retrieve vitals + freshness.
    const freshness = deriveVitalsFreshness(patient.vitals);
    steps.push({
      stepId: 'retrieve_vitals',
      label: 'Retrieve vital signs',
      status: freshness.hasVitals ? (freshness.stale ? 'warning' : 'completed') : 'warning',
      detail: !freshness.hasVitals
        ? 'No vital signs recorded.'
        : `${patient.vitals?.length ?? 0} recording(s); latest ${freshness.ageMinutes === null ? 'at unknown time' : `${freshness.ageMinutes} min ago`}${freshness.stale ? ' — STALE' : ''}.`,
    });

    // Step 3 — deterministic NEWS2 via the tool orchestrator.
    let news2Executed = false;
    let news2Total: number | undefined;
    let news2RiskBand: string | undefined;
    let news2HasRed: boolean | undefined;
    let news2FailedReason: string | undefined;
    const assumptions: string[] = [];
    const latest = freshness.latest;

    if (!latest) {
      steps.push({
        stepId: 'calculate_news2',
        label: 'Calculate NEWS2',
        status: 'skipped',
        detail: 'Skipped — no vitals available to score.',
      });
    } else {
      const mapping = mapLatestVitalsToNews2Parameters(latest);
      if (!mapping.ok) {
        steps.push({
          stepId: 'calculate_news2',
          label: 'Calculate NEWS2',
          status: 'skipped',
          detail: `Skipped — latest vitals missing required fields: ${mapping.missing.join(', ')}.`,
        });
      } else {
        assumptions.push(...mapping.assumptions);
        try {
          const response = await this.toolOrchestrator.executeTool({
            toolId: 'news2',
            parameters: mapping.parameters,
            userId: input.requestedByUserId,
            conversationId: runId,
          });
          if (response.success && response.result.success) {
            news2Executed = true;
            news2Total =
              typeof response.result.data.total === 'number'
                ? response.result.data.total
                : undefined;
            news2RiskBand =
              typeof response.result.data.riskBand === 'string'
                ? response.result.data.riskBand
                : undefined;
            news2HasRed =
              typeof response.result.data.hasRed === 'boolean'
                ? response.result.data.hasRed
                : undefined;
            steps.push({
              stepId: 'calculate_news2',
              label: 'Calculate NEWS2',
              status: 'completed',
              detail: `NEWS2 ${news2Total ?? '?'} (band: ${news2RiskBand ?? 'unknown'}) via deterministic executor.`,
            });
          } else {
            news2FailedReason = (response.result.errors ?? ['NEWS2 execution failed']).join('; ');
            steps.push({
              stepId: 'calculate_news2',
              label: 'Calculate NEWS2',
              status: 'failed',
              detail: news2FailedReason,
            });
          }
        } catch (error) {
          news2FailedReason = String(error);
          steps.push({
            stepId: 'calculate_news2',
            label: 'Calculate NEWS2',
            status: 'failed',
            detail: news2FailedReason,
          });
        }
      }
    }

    // Step 4 — short-horizon trend.
    const vitalsList = patient.vitals ?? [];
    const trendNotes = deriveTrendNotes(vitalsList);
    steps.push({
      stepId: 'assess_trend',
      label: 'Assess recent trend',
      status: trendNotes.length > 0 ? 'completed' : 'warning',
      detail:
        trendNotes.length > 0
          ? trendNotes.join('; ')
          : 'Fewer than two recordings — no trend assessable.',
    });

    // Step 5 — synthesize with truthful states.
    const synthesis = deriveInvestigationSynthesis({
      patientVerified: true,
      hasVitals: freshness.hasVitals,
      vitalsAgeMinutes: freshness.ageMinutes,
      news2Executed,
      news2Total,
      news2RiskBand,
      news2HasRed,
      news2FailedReason,
      trendNotes,
      assumptions,
    });

    steps.push({
      stepId: 'synthesize_findings',
      label: 'Synthesize findings',
      status: 'completed',
      detail: `Overall state: ${synthesis.overallState}.`,
    });

    // Step 6 — PREPARE actions as approval-required proposals (never executed).
    const autonomyLevelUsed: InvestigationAutonomyLevel =
      synthesis.preparedActionSpecs.length > 0 ? 'LEVEL_2_PREPARE' : 'LEVEL_0_OBSERVE';
    const createdProposals: ServerAiActionProposal[] = [];
    for (const spec of synthesis.preparedActionSpecs) {
      try {
        createdProposals.push(
          this.actionProposals.create({
            organizationId: input.organizationId,
            originatingRequestId: runId,
            correlationId: runId,
            sessionId: runId,
            patientId: patient.id,
            toolName: spec.actionType,
            expectedEffect: spec.expectedEffect,
            riskLevel: 'moderate',
            requiresApproval: true,
            previewSummary: `${spec.description} — ${spec.rationale}`,
            model: `plan-runner:${INVESTIGATION_PLAN_VERSION}`,
            promptVersion: 'deterministic@1',
            ownerUserId: input.requestedByUserId,
          }),
        );
      } catch (error) {
        this.logger.warn(
          `Failed to create proposal for ${spec.actionType} in run ${runId}: ${String(error)}`,
        );
      }
    }

    steps.push({
      stepId: 'prepare_actions',
      label: 'Prepare suggested actions',
      status: synthesis.preparedActionSpecs.length > 0 ? 'completed' : 'skipped',
      detail:
        synthesis.preparedActionSpecs.length > 0
          ? `${createdProposals.length} of ${synthesis.preparedActionSpecs.length} action(s) prepared as approval-required proposals.`
          : 'No actions met preparation criteria.',
    });

    return this.finalizeRun(
      runId,
      input,
      steps,
      synthesis.findings,
      synthesis.preparedActionSpecs,
      createdProposals,
      autonomyLevelUsed,
      patient,
    );
  }

  private finalizeRun(
    runId: string,
    input: RunInvestigationInput,
    steps: InvestigationStepTrace[],
    findings: ReturnType<typeof deriveInvestigationSynthesis>['findings'],
    specs: ReturnType<typeof deriveInvestigationSynthesis>['preparedActionSpecs'],
    proposals: ServerAiActionProposal[],
    autonomyLevelUsed: InvestigationAutonomyLevel,
    patient?: EmergencyPatient,
  ): InvestigationRunResult {
    const overallState = deriveInvestigationSynthesis({
      patientVerified: Boolean(patient),
      hasVitals: false,
      vitalsAgeMinutes: null,
      news2Executed: false,
      trendNotes: [],
      assumptions: [],
    }).overallState;

    void overallState;

    const result: InvestigationRunResult = {
      runId,
      goal: 'deterioration_investigation',
      createdAt: new Date().toISOString(),
      requestedByUserId: input.requestedByUserId,
      organizationId: input.organizationId,
      patient: {
        patientId: patient?.id ?? input.patientId,
        mrn: patient?.mrn,
        name: patient ? `${patient.firstName} ${patient.lastName}` : undefined,
        age: patient?.age,
        sex: patient?.sex,
        priority: patient?.priority,
        edState: patient?.state,
        chiefComplaint: patient?.chiefComplaint,
      },
      planVersion: INVESTIGATION_PLAN_VERSION,
      autonomyLevelUsed,
      steps,
      findings,
      preparedActions: specs.map((spec, index) => ({
        actionType: spec.actionType,
        description: spec.description,
        rationale: spec.rationale,
        requiresApproval: true as const,
        proposalId: proposals[index]?.proposalId,
      })),
      overallState: computeOverallState(findings),
      noClinicalActionTaken: true,
      disclaimer: INVESTIGATION_DISCLAIMER,
    };

    this.retainRun(result);

    this.auditAsync(
      this.auditService.log({
        userId: input.requestedByUserId,
        organizationId: input.organizationId,
        action: AuditAction.AI_QUERY,
        resource: `chief_investigation:${runId}`,
        ipAddress: input.ipAddress ?? 'unknown',
        userAgent: input.userAgent ?? 'unknown',
        phiAccessed: Boolean(patient),
        metadata: {
          runId,
          goal: result.goal,
          planVersion: result.planVersion,
          overallState: result.overallState,
          autonomyLevelUsed,
          preparedActions: result.preparedActions.map((a) => a.actionType),
          proposalIds: proposals.map((p) => p.proposalId),
          stepsCompleted: steps.filter((s) => s.status !== 'failed').length,
        },
      }),
      'investigation run audit',
      runId,
    );

    return result;
  }

  private retainRun(result: InvestigationRunResult): void {
    this.runs.set(result.runId, result);
    while (this.runs.size > MAX_RETAINED_RUNS) {
      const oldest = this.runs.keys().next().value;
      if (oldest === undefined) break;
      this.runs.delete(oldest);
    }
  }

  /** Audit failures must never break the synchronous investigation workflow. */
  private auditAsync(promise: Promise<unknown>, what: string, runId: string): void {
    promise.catch((error) =>
      this.logger.warn(`Audit write failed (${what}) for run ${runId}: ${String(error)}`),
    );
  }
}

function computeOverallState(findings: InvestigationRunResult['findings']) {
  const states = new Set(findings.map((f) => f.state));
  if (states.has('OUTSIDE_SCOPE')) return 'OUTSIDE_SCOPE' as const;
  if (states.has('TOOL_FAILURE')) return 'TOOL_FAILURE' as const;
  if (states.has('REQUIRES_HUMAN_REVIEW')) return 'REQUIRES_HUMAN_REVIEW' as const;
  if (states.has('STALE_DATA')) return 'STALE_DATA' as const;
  if (states.has('INSUFFICIENT_DATA')) return 'INSUFFICIENT_DATA' as const;
  if (states.has('PARTIALLY_SUPPORTED')) return 'PARTIALLY_SUPPORTED' as const;
  return 'SUPPORTED' as const;
}
