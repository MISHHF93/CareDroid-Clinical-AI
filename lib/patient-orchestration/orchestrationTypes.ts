import type { Patient, PatientFlag, PatientState, Priority, Referral } from '../../src/types/emergency';

export type OrchestrationSourceState = 'live' | 'demo' | 'backend-unavailable' | 'local-only';

export type EdOperationalStage =
  | 'arrival'
  | 'waiting_intake'
  | 'triage_handoff'
  | 'physician_assessment'
  | 'observation_reassessment'
  | 'results_review'
  | 'deterioration_concern'
  | 'referral_boarding_transfer'
  | 'discharge_workflow';

export type OrchestrationToolCategory =
  | 'risk_score'
  | 'medication_safety'
  | 'lab_interpretation'
  | 'differential_support'
  | 'summary_handoff'
  | 'reassessment_deterioration'
  | 'referral_transfer'
  | 'operational_escalation'
  | 'checklist_protocol'
  | 'intake_verification';

export type OrchestrationLaunchKind =
  | 'calculator'
  | 'tool'
  | 'protocol'
  | 'copilot'
  | 'workflow'
  | 'checklist';

export type OrchestrationToolMaturity = 'live' | 'demo' | 'preview' | 'planned';

export type EmergencyRoleId =
  | 'registration_clerk'
  | 'triage_nurse'
  | 'physician'
  | 'charge_nurse'
  | 'ed_manager'
  | 'ems_user'
  | 'admin'
  | 'read_only_viewer'
  | 'public_display';

export interface ComplaintRouteSnapshot {
  routeId: string;
  complaint: string;
  scoreIds: string[];
  calculatorLabels: string[];
  guidance?: string;
  safetyStatement?: string;
}

export interface ToolRecommendation {
  id: string;
  toolId: string;
  label: string;
  category: OrchestrationToolCategory;
  launchKind: OrchestrationLaunchKind;
  registryId?: string;
  score?: number;
  reason: string;
  reasonCodes: string[];
  rationale?: string;
  maturity: OrchestrationToolMaturity;
  advisoryOnly: true;
  requiresHumanReview: true;
  completed?: boolean;
  primary?: boolean;
}

export interface WorkflowActionRecommendation {
  id: string;
  actionId: string;
  label: string;
  reason: string;
  route?: string;
  eventName?: string;
  advisoryOnly: true;
}

export interface PatientCardOrchestrationContext {
  patientId: string;
  generatedAt: string;
  sourceState: OrchestrationSourceState;
  role: EmergencyRoleId;
  operationalStage: EdOperationalStage;
  stageOverlays: EdOperationalStage[];
  patientState: PatientState;
  priority: Priority;
  complaintText: string;
  complaintRoute: ComplaintRouteSnapshot | null;
  scoresCompleted: string[];
  scoresMissing: string[];
  flags: PatientFlag[];
  waitMinutes: number;
  hasActiveReferral: boolean;
  reassessmentDue: boolean;
  deteriorationConcern: boolean;
  identityPending: boolean;
  vitalsAvailable: boolean;
  whatHappensNextLabel: string | null;
  allowedToolIds: string[];
  blockedReasons: Record<string, string>;
  prioritizedRecommendations: ToolRecommendation[];
  secondaryRecommendations: ToolRecommendation[];
  workflowActions: WorkflowActionRecommendation[];
  promptContext: string;
}

export interface BuildPatientCardContextInput {
  patient: Patient;
  role: EmergencyRoleId;
  referrals?: Referral[];
  sourceState?: OrchestrationSourceState;
  generatedAt?: string;
  maxPrimary?: number;
  maxSecondary?: number;
}

export interface OrchestrationToolDefinition {
  id: string;
  toolId: string;
  label: string;
  category: OrchestrationToolCategory;
  launchKind: OrchestrationLaunchKind;
  registryId?: string;
  maturity: OrchestrationToolMaturity;
  stages: EdOperationalStage[];
  overlayStages?: EdOperationalStage[];
  roles: EmergencyRoleId[];
  complaintScoreIds?: string[];
  flagTriggers?: PatientFlag[];
  minAge?: number;
  maxAge?: number;
  requiresVitals?: boolean;
  requiresIdentity?: boolean;
  baseScore?: number;
}