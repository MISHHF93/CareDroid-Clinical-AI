export type AdministrativeAutomationCategory =
  | 'patient_routing'
  | 'documentation_handoff'
  | 'ai_patient_summary'
  | 'triage_preparation'
  | 'department_notification'
  | 'staff_assignment'
  | 'queue_prioritization'
  | 'escalation_workflow';

export type AdministrativeAutomationStatus =
  | 'pending_review'
  | 'approved'
  | 'modified'
  | 'overridden'
  | 'executed'
  | 'dismissed'
  | 'expired';

export type AdministrativeAutomationPriority = 'critical' | 'high' | 'medium' | 'low';

export type AdministrativeAutomationTask = Readonly<{
  id: string;
  category: AdministrativeAutomationCategory;
  status: AdministrativeAutomationStatus;
  patientId?: string;
  patientName?: string;
  title: string;
  summary: string;
  proposedAction: string;
  proposedPayload: Readonly<Record<string, unknown>>;
  ownerRole: string;
  priority: AdministrativeAutomationPriority;
  automationId?: string;
  aiGenerated: boolean;
  humanReviewRequired: true;
  createdAt: string;
  updatedAt: string;
  reviewedByStaffId?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  overrideReason?: string;
  modifiedAction?: string;
  auditTrailId?: string;
  route?: string;
}>;

export type AdministrativeAutomationReviewDecision = 'approve' | 'modify' | 'override' | 'dismiss';

export type AdministrativeAutomationSnapshot = Readonly<{
  engineId: 'unified-clinical-workflow-orchestrator';
  generatedAt: string;
  tasks: readonly AdministrativeAutomationTask[];
  metrics: Readonly<{
    pendingReview: number;
    executedToday: number;
    overridden: number;
    byCategory: Readonly<Record<AdministrativeAutomationCategory, number>>;
  }>;
  safetyStatement: string;
}>;

export type ReviewAdministrativeAutomationInput = Readonly<{
  taskId: string;
  decision: AdministrativeAutomationReviewDecision;
  actorStaffId: string;
  actorName?: string;
  modifiedAction?: string;
  overrideReason?: string;
  executeOnApprove?: boolean;
}>;
