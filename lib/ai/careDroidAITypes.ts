export const CARE_DROID_AI_INTENTS = [
  'critical_alert_assessment',
  'three_minute_response_plan',
  'patient_intake_assist',
  'triage_recommendation',
  'patient_summary',
  'department_routing',
  'wait_time_prediction',
  'staff_resource_insight',
  'hospital_command_insight',
  'service_bottleneck_analysis',
  'workflow_delay_analysis',
  'fallback_recommendation',
  'three_minute_risk_projection',
  'operational_root_cause_summary',
  'escalation_recommendation',
  'handoff_summary',
  'emergency_call_risk_summary',
  'ems_prearrival_risk_summary',
] as const;

export type CareDroidAIIntent = (typeof CARE_DROID_AI_INTENTS)[number];

export type CareDroidAIStatus = 'success' | 'error';
export type CareDroidAIPriority = 'critical' | 'high' | 'medium' | 'low';

export const CLINICAL_DECISION_SUPPORT_DISCLAIMER =
  'This AI output is decision support only and must be reviewed by a licensed clinician.';

export interface CareDroidAIContext {
  requestId?: string;
  sourceScreen?: string;
  userRole?: string;
  organizationId?: string;
  workspaceId?: string;
  tenant?: {
    organizationId?: string;
    workspaceId?: string;
    userId?: string;
    role?: string;
    subscriptionPlan?: string;
    source?: string;
  };
  [key: string]: unknown;
}

export interface CareDroidAIRequest<TInput extends Record<string, unknown> = Record<string, unknown>> {
  intent: CareDroidAIIntent;
  input: TInput;
  context?: CareDroidAIContext;
}

export interface CareDroidAIResponse<
  TData extends Record<string, unknown> = Record<string, unknown>,
> {
  intent: CareDroidAIIntent | 'unknown';
  status: CareDroidAIStatus;
  priority: CareDroidAIPriority;
  data: TData;
  confidence: number;
  reasoning: string[];
  warnings: string[];
  redFlags: string[];
  nextActions: string[];
  assignedRole: string;
  recommendedDepartment: string;
  requiresClinicianReview: boolean;
  clinicianOverrideAvailable: boolean;
  generatedAt: string;
  safetyDisclaimer: string;
  /** Roles that should receive and act on this recommendation. */
  visibleToRoles?: string[];
  /** Role to escalate to if this recommendation is not acknowledged. */
  escalationRole?: string;
  /** Suggested owner role for this recommendation. */
  suggestedOwnerRole?: string;
}

export interface CareDroidAIValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface CareDroidAIValidationResult {
  valid: boolean;
  errors: CareDroidAIValidationIssue[];
  warnings: CareDroidAIValidationIssue[];
  request?: CareDroidAIRequest;
}
