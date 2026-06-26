import { PatientFlag, type Patient, type Referral } from '../../src/types/emergency';
import { SCORE_ALIASES } from '../../src/utils/clinicalScoreCompletion';
import { HUMAN_REVIEW_DISCLAIMER } from '../ai/safetyPolicy';
import {
  mergeComplaintRouteCalculatorTools,
  resolvePrimaryRecommendationCount,
} from './complaintRouteTools';
import { ORCHESTRATION_TOOL_CATALOG } from './toolCatalog';
import { listCompletedScoreIds, listMissingScoreIds } from './scoreCompletion';
import { resolveOperationalStage } from './resolveOperationalStage';
import type {
  BuildPatientCardContextInput,
  ComplaintRouteSnapshot,
  EdOperationalStage,
  EmergencyRoleId,
  OrchestrationToolDefinition,
  PatientCardOrchestrationContext,
  ToolRecommendation,
  WorkflowActionRecommendation,
} from './orchestrationTypes';

import { ClinicalIntentRouter } from './clinicalIntentRouterBackend';
import { formatScoresForCopilot } from './clinicalScoreEventsBackend';

function waitMinutes(arrivalTime: string): number {
  const arrivedAt = new Date(arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((Date.now() - arrivedAt) / 60000));
}

function complaintText(patient: Patient): string {
  return (patient.chiefComplaint || patient.complaint || '').trim();
}

function normalizeScoreId(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function scoreIdsEquivalent(left: string, right: string): boolean {
  const leftAliases = [left, ...(SCORE_ALIASES[left] || [])].map(normalizeScoreId);
  const rightAliases = [right, ...(SCORE_ALIASES[right] || [])].map(normalizeScoreId);
  return leftAliases.some((alias) => rightAliases.includes(alias));
}

function toolRegistryIds(tool: OrchestrationToolDefinition): string[] {
  return [tool.id, tool.toolId, tool.registryId, ...(tool.complaintScoreIds || [])].filter(Boolean) as string[];
}

function toolMatchesComplaintRouteScore(
  tool: OrchestrationToolDefinition,
  routeScoreId: string,
): boolean {
  return toolRegistryIds(tool).some((toolId) => scoreIdsEquivalent(toolId, routeScoreId));
}

function toolMatchesComplaintRoute(
  tool: OrchestrationToolDefinition,
  complaintRoute: ComplaintRouteSnapshot | null,
): boolean {
  if (!complaintRoute?.scoreIds?.length) return false;
  return complaintRoute.scoreIds.some((scoreId) => toolMatchesComplaintRouteScore(tool, scoreId));
}

function stageMatches(
  tool: OrchestrationToolDefinition,
  primary: EdOperationalStage,
  overlays: EdOperationalStage[],
): boolean {
  if (tool.stages.includes(primary)) return true;
  return (tool.overlayStages || []).some((stage) => overlays.includes(stage));
}

function roleAllowed(tool: OrchestrationToolDefinition, role: EmergencyRoleId): boolean {
  return tool.roles.includes(role);
}

function scoreTool(
  tool: OrchestrationToolDefinition,
  context: {
    primary: EdOperationalStage;
    overlays: EdOperationalStage[];
    role: EmergencyRoleId;
    patient: Patient;
    complaintRoute: ComplaintRouteSnapshot | null;
    completedScores: string[];
    missingScores: string[];
    waitMinutes: number;
  },
): { score: number; reasonCodes: string[]; reason: string; completed: boolean } {
  let score = tool.baseScore ?? 50;
  const reasonCodes: string[] = [];
  const flags = context.patient.flags || [];

  if (!stageMatches(tool, context.primary, context.overlays)) {
    return { score: -1, reasonCodes: ['stage_blocked'], reason: 'Not relevant for current stage', completed: false };
  }

  if (!roleAllowed(tool, context.role)) {
    return { score: -1, reasonCodes: ['role_blocked'], reason: 'Not available for this role', completed: false };
  }

  if (tool.requiresIdentity && flags.includes(PatientFlag.IdentityPending)) {
    return { score: -1, reasonCodes: ['identity_pending'], reason: 'Complete identity verification first', completed: false };
  }

  if (tool.requiresVitals && !(context.patient.vitals?.length || context.patient.currentVitals)) {
    score -= 25;
    reasonCodes.push('vitals_missing');
  }

  if (typeof tool.minAge === 'number' && context.patient.age < tool.minAge) {
    return { score: -1, reasonCodes: ['age_blocked'], reason: 'Not applicable for this age group', completed: false };
  }

  if (typeof tool.maxAge === 'number' && context.patient.age > tool.maxAge) {
    return { score: -1, reasonCodes: ['age_blocked'], reason: 'Not applicable for this age group', completed: false };
  }

  if (typeof tool.maxAge === 'number' && context.patient.age <= tool.maxAge) {
    score += 22;
    reasonCodes.push('pediatric_patient');
  }

  if (tool.flagTriggers?.some((flag) => flags.includes(flag))) {
    score += 30;
    reasonCodes.push('flag_trigger');
  }

  if (toolMatchesComplaintRoute(tool, context.complaintRoute)) {
    score += 35;
    reasonCodes.push('complaint_route');
  }

  const registryId = tool.registryId || tool.toolId;
  const completed = context.completedScores.some((scoreId) =>
    toolRegistryIds(tool).some((toolId) => scoreIdsEquivalent(toolId, scoreId)),
  );
  if (completed) {
    score -= 40;
    reasonCodes.push('already_completed');
  } else if (
    context.missingScores.some((missingId) => toolMatchesComplaintRouteScore(tool, missingId))
  ) {
    score += 25;
    reasonCodes.push('score_gap');
  }

  if (
    context.patient.flags?.includes(PatientFlag.ScoreReassessmentRecommended) &&
    context.missingScores.some((missingId) => toolMatchesComplaintRouteScore(tool, missingId))
  ) {
    score += 20;
    reasonCodes.push('score_reassessment_due');
  }

  if (context.overlays.includes('deterioration_concern') && tool.category === 'reassessment_deterioration') {
    score += 20;
    reasonCodes.push('deterioration_overlay');
  }

  if (context.waitMinutes > 60 && tool.id === 'escalate-patient') {
    score += 15;
    reasonCodes.push('long_wait');
  }

  if (context.primary === 'arrival' && tool.category === 'intake_verification') {
    score += 20;
    reasonCodes.push('arrival_stage');
  }

  const reason =
    reasonCodes.includes('complaint_route') && context.complaintRoute
      ? `${context.complaintRoute.complaint} pathway`
      : reasonCodes.includes('flag_trigger')
        ? 'Active patient flag'
        : reasonCodes.includes('score_gap')
          ? 'Recommended score not yet documented'
          : reasonCodes.includes('deterioration_overlay')
            ? 'Deterioration concern'
            : 'Workflow match';

  return { score, reasonCodes, reason, completed };
}

function toRecommendation(
  tool: OrchestrationToolDefinition,
  scored: ReturnType<typeof scoreTool>,
  complaintRoute: ComplaintRouteSnapshot | null,
  primary = false,
): ToolRecommendation {
  return {
    id: `rec-${tool.id}`,
    toolId: tool.toolId,
    label: tool.label,
    category: tool.category,
    launchKind: tool.launchKind,
    registryId: tool.registryId,
    score: scored.score,
    reason: scored.reason,
    reasonCodes: scored.reasonCodes,
    rationale: complaintRoute?.guidance,
    maturity: tool.maturity,
    advisoryOnly: true,
    requiresHumanReview: true,
    completed: scored.completed,
    primary,
  };
}

function buildWorkflowActions(
  patient: Patient,
  role: EmergencyRoleId,
  stage: EdOperationalStage,
): WorkflowActionRecommendation[] {
  const actions: WorkflowActionRecommendation[] = [];
  if (stage === 'referral_boarding_transfer' && ['physician', 'charge_nurse', 'ed_manager', 'admin'].includes(role)) {
    actions.push({
      id: 'wf-referral',
      actionId: 'open-referrals',
      label: 'Open referral workflow',
      reason: 'Active referral or boarding coordination',
      route: '/emergency/referrals',
      advisoryOnly: true,
    });
  }
  if (patient.flags?.includes(PatientFlag.EMSArrival) && ['ems_user', 'triage_nurse', 'registration_clerk'].includes(role)) {
    actions.push({
      id: 'wf-ems',
      actionId: 'open-ems',
      label: 'EMS pipeline',
      reason: 'EMS arrival in progress',
      route: '/emergency/ems',
      advisoryOnly: true,
    });
  }
  return actions;
}

function buildPromptContext(
  patient: Patient,
  context: Omit<PatientCardOrchestrationContext, 'promptContext'>,
): string {
  return [
    'CareDroid patient-card orchestration context (advisory only):',
    `Patient: ${patient.firstName} ${patient.lastName} (${patient.mrn})`,
    `Stage: ${context.operationalStage}${context.stageOverlays.length ? `; overlays: ${context.stageOverlays.join(', ')}` : ''}`,
    `Priority: ${context.priority}; State: ${context.patientState}`,
    `Complaint: ${context.complaintText || 'Not documented'}`,
    context.complaintRoute ? `Complaint route: ${context.complaintRoute.complaint}` : null,
    formatScoresForCopilot(patient) ? `Saved scores: ${formatScoresForCopilot(patient)}` : null,
    context.scoresMissing.length ? `Missing scores: ${context.scoresMissing.join(', ')}` : null,
    context.scoresCompleted.length ? `Completed score ids: ${context.scoresCompleted.join(', ')}` : null,
    context.whatHappensNextLabel ? `Next step: ${context.whatHappensNextLabel}` : null,
    context.reassessmentDue ? 'Reassessment is due.' : null,
    context.deteriorationConcern ? 'Deterioration concern is active.' : null,
    '',
    'Prioritized tool recommendations (staff must confirm before use):',
    context.prioritizedRecommendations.length
      ? context.prioritizedRecommendations
          .map((rec) => `- ${rec.label}: ${rec.reason} (${rec.reasonCodes.join(', ')})`)
          .join('\n')
      : '- None',
    '',
    HUMAN_REVIEW_DISCLAIMER,
  ]
    .filter(Boolean)
    .join('\n');
}

export function recommendToolsForPatient(input: {
  patient: Patient;
  role: EmergencyRoleId;
  referral?: Referral | null;
  complaintRoute?: ComplaintRouteSnapshot | null;
  maxPrimary?: number;
  maxSecondary?: number;
}): {
  recommendations: ToolRecommendation[];
  secondary: ToolRecommendation[];
  allowedToolIds: string[];
  blockedReasons: Record<string, string>;
} {
  const { patient, role, referral = null } = input;
  const { primary, overlays } = resolveOperationalStage(patient, referral);
  const complaintRoute =
    input.complaintRoute ||
    (() => {
      const route = ClinicalIntentRouter.routeComplaint(complaintText(patient));
      if (!route) return null;
      return {
        routeId: route.routeId,
        complaint: route.complaint,
        scoreIds: (route.calculators || []).map((calculator: { id: string }) => calculator.id),
        calculatorLabels: (route.calculators || []).map(
          (calculator: { id: string; label?: string }) => calculator.label || calculator.id,
        ),
        guidance: route.guidance,
        safetyStatement: route.safetyStatement,
      };
    })();

  const completedScores = listCompletedScoreIds(patient);
  const missingScores = listMissingScoreIds(complaintRoute, completedScores);
  const effectiveCatalog = mergeComplaintRouteCalculatorTools(complaintRoute);
  const blockedReasons: Record<string, string> = {};
  const scored: ToolRecommendation[] = [];

  for (const tool of effectiveCatalog) {
    const result = scoreTool(tool, {
      primary,
      overlays,
      role,
      patient,
      complaintRoute,
      completedScores,
      missingScores,
      waitMinutes: waitMinutes(patient.arrivalTime),
    });
    if (result.score < 0) {
      blockedReasons[tool.id] = result.reason;
      continue;
    }
    scored.push(toRecommendation(tool, result, complaintRoute));
  }

  scored.sort((left, right) => (right.score ?? 0) - (left.score ?? 0));

  const incomplete = scored.filter((rec) => !rec.completed);
  const maxPrimary = resolvePrimaryRecommendationCount(complaintRoute, missingScores, input.maxPrimary);
  const maxSecondary = input.maxSecondary ?? 8;
  let primaryRecs = incomplete.slice(0, maxPrimary).map((rec, index) => ({
    ...rec,
    primary: index === 0,
  }));

  for (const missingId of missingScores) {
    if (primaryRecs.some((rec) => scoreIdsEquivalent(rec.registryId || rec.toolId, missingId))) continue;
    const candidate = incomplete.find((rec) => scoreIdsEquivalent(rec.registryId || rec.toolId, missingId));
    if (!candidate) continue;
    primaryRecs.push({ ...candidate, primary: primaryRecs.length === 0 });
  }
  primaryRecs = primaryRecs
    .filter((rec, index, list) => list.findIndex((item) => item.toolId === rec.toolId) === index)
    .slice(0, maxPrimary)
    .map((rec, index) => ({ ...rec, primary: index === 0 }));

  const primaryIds = new Set(primaryRecs.map((rec) => rec.toolId));
  const secondary = incomplete
    .filter((rec) => !primaryIds.has(rec.toolId))
    .slice(0, maxSecondary);

  return {
    recommendations: primaryRecs,
    secondary,
    allowedToolIds: scored.map((rec) => rec.toolId),
    blockedReasons,
  };
}

export function buildPatientCardOrchestrationContext(
  input: BuildPatientCardContextInput & { referral?: Referral | null; whatHappensNextLabel?: string | null },
): PatientCardOrchestrationContext {
  const { patient, role, referrals = [], sourceState = 'demo', generatedAt } = input;
  const referral =
    input.referral ||
    referrals.find((candidate) => candidate.patientId === patient.id) ||
    patient.referral ||
    null;

  const complaint = complaintText(patient);
  const route = ClinicalIntentRouter.routeComplaint(complaint);
  const complaintRoute = route
    ? {
        routeId: route.routeId,
        complaint: route.complaint,
        scoreIds: (route.calculators || []).map((calculator: { id: string }) => calculator.id),
        calculatorLabels: (route.calculators || []).map(
          (calculator: { id: string; label?: string }) => calculator.label || calculator.id,
        ),
        guidance: route.guidance,
        safetyStatement: route.safetyStatement,
      }
    : null;

  const completedScores = listCompletedScoreIds(patient);
  const missingScores = listMissingScoreIds(complaintRoute, completedScores);
  const { primary, overlays } = resolveOperationalStage(patient, referral);
  const missingScoresPreview = listMissingScoreIds(complaintRoute, completedScores);
  const ranked = recommendToolsForPatient({
    patient,
    role,
    referral,
    complaintRoute,
    maxPrimary: resolvePrimaryRecommendationCount(
      complaintRoute,
      missingScoresPreview,
      input.maxPrimary,
    ),
    maxSecondary: input.maxSecondary,
  });

  const flags = patient.flags || [];
  const partial: Omit<PatientCardOrchestrationContext, 'promptContext'> = {
    patientId: patient.id,
    generatedAt: generatedAt || new Date().toISOString(),
    sourceState,
    role,
    operationalStage: primary,
    stageOverlays: overlays,
    patientState: patient.state,
    priority: patient.priority,
    complaintText: complaint,
    complaintRoute,
    scoresCompleted: completedScores,
    scoresMissing: missingScores,
    flags,
    waitMinutes: waitMinutes(patient.arrivalTime),
    hasActiveReferral: Boolean(referral && !['Closed', 'Completed', 'Declined', 'PatientDeparted'].includes(String(referral.status))),
    reassessmentDue: flags.includes(PatientFlag.ReassessmentDue),
    deteriorationConcern: overlays.includes('deterioration_concern'),
    identityPending: flags.includes(PatientFlag.IdentityPending),
    vitalsAvailable: Boolean(patient.vitals?.length || patient.currentVitals),
    whatHappensNextLabel: input.whatHappensNextLabel ?? null,
    allowedToolIds: ranked.allowedToolIds,
    blockedReasons: ranked.blockedReasons,
    prioritizedRecommendations: ranked.recommendations,
    secondaryRecommendations: ranked.secondary,
    workflowActions: buildWorkflowActions(patient, role, primary),
  };

  return {
    ...partial,
    promptContext: buildPromptContext(patient, partial),
  };
}