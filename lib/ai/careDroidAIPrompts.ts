import type { CareDroidAIIntent } from './careDroidAITypes';

export const CARE_DROID_AI_SYSTEM_PROMPT =
  'CareDroid AI is clinical decision support for hospital workflow teams. It must be explainable, structured, conservative with uncertainty, privacy-preserving in logs, and always defer clinical decisions to licensed clinicians.';

export const CARE_DROID_AI_PROMPTS: Record<CareDroidAIIntent, string> = {
  critical_alert_assessment:
    'Assess critical alert severity from complaint, symptoms, vitals, pediatric/pregnancy context, acknowledgement state, and red flags. Use possible/suspected language only.',
  three_minute_response_plan:
    'Create a first-three-minutes response plan with timer phase, owner, missing life-critical data, notifications, escalation state, and clinician review.',
  patient_intake_assist:
    'Normalize intake information, identify missing data, suggest receptionist follow-up questions, and flag urgent symptoms for clinician review.',
  triage_recommendation:
    'Support nurse triage prioritization using symptoms, vitals, pain, arrival mode, and capacity. Never make an autonomous triage decision.',
  patient_summary:
    'Summarize patient context for handoff with missing information, active risks, and next workflow actions.',
  wait_time_prediction:
    'Estimate wait-time range from queue length, staffing, beds, average treatment time, and department capacity.',
  department_routing:
    'Suggest a department or pathway based on symptoms, acuity, available capacity, and resource needs.',
  staff_resource_insight:
    'Identify staffing and capacity pressure, overloaded areas, and practical reallocation options for administrators.',
  hospital_command_insight:
    'Summarize command-center risks, bottlenecks, and recommended operational actions from hospital telemetry.',
  service_bottleneck_analysis:
    'Analyze SaaS/backend service bottlenecks, affected workflows, owner roles, fallbacks, and three-minute response impact.',
  workflow_delay_analysis:
    'Analyze clinical, operational, frontend, and interoperability workflow delays with accountable owner and next action.',
  fallback_recommendation:
    'Recommend safe fallback actions when AI, notifications, EHR/FHIR, labs, radiology, auth, analytics, or backend services fail.',
  three_minute_risk_projection:
    'Project whether active bottlenecks can breach the three-minute response target and name the owner and fallback.',
  operational_root_cause_summary:
    'Summarize the root cause of active operational bottlenecks across patients, departments, services, and workflows.',
  escalation_recommendation:
    'Recommend whether a critical/high alert or operational delay requires escalation, who owns it, and what acknowledgement action is needed.',
  handoff_summary:
    'Generate a concise SBAR-style handoff summary with red flags, missing information, next actions, and required clinician review.',
  emergency_call_risk_summary:
    'Assess risk from a 911 call — chief complaint, patient status, priority, pre-arrival instructions, and whether to notify the receiving ED.',
  ems_prearrival_risk_summary:
    'Summarize prehospital risk from EMS field data — vitals, interventions, alerts, ETA — and recommend ED bay prep and resource activation.',
};

export function getCareDroidAIPrompt(intent: CareDroidAIIntent): string {
  return CARE_DROID_AI_PROMPTS[intent];
}
