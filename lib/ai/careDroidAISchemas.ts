import {
  CARE_DROID_AI_INTENTS,
  type CareDroidAIIntent,
  type CareDroidAIRequest,
  type CareDroidAIResponse,
  type CareDroidAIValidationIssue,
  type CareDroidAIValidationResult,
} from './careDroidAITypes';

type FieldType = 'string' | 'number' | 'object' | 'array' | 'boolean' | 'unknown';

export interface CareDroidAIFieldSchema {
  type: FieldType;
  required?: boolean;
  description: string;
}

export interface CareDroidAIIntentSchema {
  intent: CareDroidAIIntent;
  purpose: string;
  clinical: boolean;
  inputFields: Record<string, CareDroidAIFieldSchema>;
  outputFields: Record<string, CareDroidAIFieldSchema>;
}

const field = (
  type: FieldType,
  description: string,
  required = false,
): CareDroidAIFieldSchema => ({ type, description, required });

export const CARE_DROID_AI_SCHEMAS: Record<CareDroidAIIntent, CareDroidAIIntentSchema> = {
  critical_alert_assessment: {
    intent: 'critical_alert_assessment',
    purpose: 'Assess whether an alert or arrival contains critical red flags requiring acknowledgement.',
    clinical: true,
    inputFields: {
      chiefComplaint: field('string', 'Chief complaint or alert text', true),
      symptoms: field('array', 'Reported symptoms'),
      vitals: field('object', 'Current vital signs'),
      age: field('number', 'Patient age in years'),
      pregnancyStatus: field('string', 'Pregnancy status when relevant'),
      pediatric: field('boolean', 'Whether this is a pediatric patient'),
      acknowledged: field('boolean', 'Whether a clinician has acknowledged the alert'),
    },
    outputFields: {
      severity: field('string', 'Critical, high, medium, or low severity', true),
      redFlags: field('array', 'Detected red flags', true),
      reason: field('string', 'Reason for alert level', true),
      action: field('string', 'Recommended immediate workflow action', true),
      owner: field('string', 'Role responsible for acknowledgement', true),
      acknowledgementRequired: field('boolean', 'Whether acknowledgement is required', true),
    },
  },
  three_minute_response_plan: {
    intent: 'three_minute_response_plan',
    purpose: 'Create a first-three-minutes response plan for a critical arrival or alert.',
    clinical: true,
    inputFields: {
      chiefComplaint: field('string', 'Chief complaint or alert text', true),
      symptoms: field('array', 'Reported symptoms'),
      vitals: field('object', 'Current vital signs'),
      triageLevel: field('string', 'Current or suggested acuity'),
      acknowledged: field('boolean', 'Whether the alert is acknowledged'),
      elapsedSeconds: field('number', 'Elapsed seconds since alert or arrival'),
    },
    outputFields: {
      responseTimerSeconds: field('number', 'Elapsed response timer seconds', true),
      currentPhase: field('string', '0:00-0:30, 0:30-1:00, 1:00-2:00, or 2:00-3:00', true),
      nextSafestAction: field('string', 'Next safest action for staff review', true),
      notifications: field('array', 'Roles to notify', true),
      missingLifeCriticalData: field('array', 'Missing life-critical fields', true),
      escalationState: field('string', 'Current escalation state', true),
    },
  },
  patient_intake_assist: {
    intent: 'patient_intake_assist',
    purpose: 'Collect and normalize intake data while identifying missing information.',
    clinical: true,
    inputFields: {
      patientName: field('string', 'Patient display name'),
      age: field('number', 'Patient age in years'),
      sex: field('string', 'Recorded sex or gender marker'),
      symptoms: field('array', 'Presenting symptoms', true),
      duration: field('string', 'Symptom duration'),
      painLevel: field('number', 'Pain score from 0 to 10'),
      allergies: field('array', 'Known allergies'),
      medications: field('array', 'Current medications'),
      existingConditions: field('array', 'Existing clinical conditions'),
      insuranceStatus: field('string', 'Insurance or coverage status'),
      preferredLanguage: field('string', 'Preferred language for communication'),
      arrivalMode: field('string', 'Walk-in, EMS, transfer, or other arrival mode', true),
    },
    outputFields: {
      normalizedPatientData: field('object', 'Normalized intake fields', true),
      missingFields: field('array', 'Missing or incomplete fields', true),
      suggestedQuestions: field('array', 'Follow-up intake questions', true),
      intakeCompletenessScore: field('number', 'Completeness score from 0 to 100', true),
      urgencyFlags: field('array', 'Potential urgency signals', true),
      nextStep: field('string', 'Recommended intake workflow step', true),
    },
  },
  triage_recommendation: {
    intent: 'triage_recommendation',
    purpose: 'Support nurse triage prioritization with explainable acuity signals.',
    clinical: true,
    inputFields: {
      symptoms: field('array', 'Presenting symptoms', true),
      vitals: field('object', 'Most recent vital signs'),
      painLevel: field('number', 'Pain score from 0 to 10'),
      age: field('number', 'Patient age in years'),
      medicalHistory: field('array', 'Relevant history'),
      allergies: field('array', 'Known allergies'),
      medications: field('array', 'Current medications'),
      arrivalMode: field('string', 'Walk-in, EMS, transfer, or other arrival mode'),
      currentWaitTime: field('number', 'Current wait time in minutes'),
      departmentCapacity: field('object', 'Current capacity snapshot'),
    },
    outputFields: {
      recommendedTriageLevel: field('string', 'Suggested P1-P5 acuity band', true),
      confidence: field('number', 'Confidence from 0 to 1', true),
      reasoning: field('array', 'Clinical and operational rationale', true),
      redFlags: field('array', 'Potential red-flag findings', true),
      suggestedDepartment: field('string', 'Suggested care destination', true),
      suggestedTests: field('array', 'Potential tests for clinician consideration'),
      estimatedWaitImpact: field('string', 'Operational wait-time impact'),
      clinicianOverrideRequired: field('boolean', 'Clinician override remains available', true),
      disclaimer: field('string', 'Decision-support disclaimer', true),
    },
  },
  patient_summary: {
    intent: 'patient_summary',
    purpose: 'Summarize patient information for care team handoff.',
    clinical: true,
    inputFields: {
      demographics: field('object', 'Patient demographics'),
      intakeData: field('object', 'Intake information'),
      vitals: field('object', 'Current or recent vitals'),
      triageNotes: field('array', 'Triage notes'),
      medicalHistory: field('array', 'Relevant history'),
      medications: field('array', 'Current medications'),
      allergies: field('array', 'Known allergies'),
      labResults: field('array', 'Lab results'),
      imagingResults: field('array', 'Imaging results'),
      previousVisits: field('array', 'Previous encounter notes'),
    },
    outputFields: {
      oneLineSummary: field('string', 'Brief summary for handoff', true),
      clinicalSummary: field('string', 'Longer clinical context', true),
      keyRisks: field('array', 'Risks requiring attention', true),
      missingInformation: field('array', 'Missing handoff details', true),
      activeProblems: field('array', 'Active problems or concerns', true),
      suggestedNextActions: field('array', 'Suggested next clinical workflow steps', true),
      handoffSummary: field('string', 'SBAR-style handoff summary', true),
    },
  },
  wait_time_prediction: {
    intent: 'wait_time_prediction',
    purpose: 'Estimate wait time from queue, staffing, and capacity signals.',
    clinical: false,
    inputFields: {
      queueLength: field('number', 'Patients waiting', true),
      triageLevel: field('string', 'Patient acuity band'),
      doctorsOnDuty: field('number', 'Doctors currently on duty'),
      nursesAvailable: field('number', 'Nurses currently available'),
      bedsAvailable: field('number', 'Open beds'),
      department: field('string', 'Department or zone'),
      averageTreatmentTime: field('number', 'Average treatment time in minutes'),
      currentCapacity: field('number', 'Capacity percentage'),
      criticalCases: field('number', 'Active critical cases'),
    },
    outputFields: {
      estimatedWaitTime: field('string', 'Estimated wait time range', true),
      confidence: field('number', 'Confidence from 0 to 1', true),
      bottleneck: field('string', 'Most likely operational bottleneck', true),
      recommendedAction: field('string', 'Flow action for staff consideration', true),
      operationalRisk: field('string', 'Low, moderate, high, or critical risk', true),
    },
  },
  department_routing: {
    intent: 'department_routing',
    purpose: 'Suggest department or care path based on symptoms and capacity.',
    clinical: true,
    inputFields: {
      symptoms: field('array', 'Presenting symptoms', true),
      triageLevel: field('string', 'Patient acuity band'),
      availableDepartments: field('array', 'Open departments or pathways'),
      departmentCapacity: field('object', 'Department capacity snapshot'),
      specialistAvailability: field('object', 'Available specialties'),
      patientRiskFactors: field('array', 'Patient-specific risk factors'),
    },
    outputFields: {
      recommendedDepartment: field('string', 'Suggested destination', true),
      alternateDepartment: field('string', 'Backup destination'),
      routingReason: field('string', 'Reason for route suggestion', true),
      urgency: field('string', 'Routine, urgent, or critical urgency', true),
      requiredResources: field('array', 'Resources likely required', true),
    },
  },
  staff_resource_insight: {
    intent: 'staff_resource_insight',
    purpose: 'Support staffing and capacity decisions for administrators.',
    clinical: false,
    inputFields: {
      patientsWaiting: field('number', 'Patients currently waiting', true),
      criticalPatients: field('number', 'Critical patients currently active'),
      doctorsOnDuty: field('number', 'Doctors on duty', true),
      nursesAvailable: field('number', 'Available nurses', true),
      bedsAvailable: field('number', 'Available beds'),
      departmentLoads: field('object', 'Department load percentages'),
      averageWaitTime: field('number', 'Average wait in minutes'),
      predictedAdmissions: field('number', 'Predicted admissions'),
    },
    outputFields: {
      staffingRisk: field('string', 'Low, moderate, high, or critical staffing risk', true),
      overloadedDepartments: field('array', 'Departments over load threshold', true),
      recommendedStaffReallocation: field('array', 'Suggested staffing moves', true),
      expectedImpact: field('string', 'Expected operational impact', true),
      priorityActions: field('array', 'Priority administrator actions', true),
    },
  },
  hospital_command_insight: {
    intent: 'hospital_command_insight',
    purpose: 'Generate executive-level command center insight from operational telemetry.',
    clinical: false,
    inputFields: {
      averageWaitTime: field('number', 'Average wait in minutes', true),
      patientsWaiting: field('number', 'Patients currently waiting', true),
      admissionsToday: field('number', 'Admissions today'),
      dischargesToday: field('number', 'Discharges today'),
      erOccupancy: field('number', 'ER occupancy percentage', true),
      bedOccupancy: field('number', 'Hospital bed occupancy percentage'),
      staffUtilization: field('number', 'Staff utilization percentage'),
      triageTime: field('number', 'Average triage time in minutes'),
      departmentStatus: field('object', 'Department status map'),
    },
    outputFields: {
      topInsights: field('array', 'Top operational insights', true),
      risks: field('array', 'Current command center risks', true),
      bottlenecks: field('array', 'Current flow bottlenecks', true),
      recommendedActions: field('array', 'Recommended operational actions', true),
      severity: field('string', 'Green, amber, or red severity', true),
      confidence: field('number', 'Confidence from 0 to 1', true),
    },
  },
  escalation_recommendation: {
    intent: 'escalation_recommendation',
    purpose: 'Recommend whether and how to escalate a clinical or operational delay.',
    clinical: true,
    inputFields: {
      severity: field('string', 'Current severity'),
      redFlags: field('array', 'Known red flags'),
      acknowledged: field('boolean', 'Whether the issue has been acknowledged'),
      elapsedSeconds: field('number', 'Elapsed seconds since alert or arrival'),
      owner: field('string', 'Current responsible owner'),
      bottleneck: field('string', 'Operational bottleneck'),
    },
    outputFields: {
      escalationRequired: field('boolean', 'Whether escalation is recommended', true),
      escalationReason: field('string', 'Reason for escalation recommendation', true),
      escalationOwner: field('string', 'Role to notify', true),
      escalationAction: field('string', 'Recommended escalation action', true),
    },
  },
  handoff_summary: {
    intent: 'handoff_summary',
    purpose: 'Generate an SBAR-style handoff summary for clinician review.',
    clinical: true,
    inputFields: {
      demographics: field('object', 'Patient demographics'),
      chiefComplaint: field('string', 'Chief complaint'),
      symptoms: field('array', 'Reported symptoms'),
      vitals: field('object', 'Current vital signs'),
      triageLevel: field('string', 'Current acuity'),
      redFlags: field('array', 'Known red flags'),
      allergies: field('array', 'Allergies'),
      medications: field('array', 'Medications'),
      medicalHistory: field('array', 'Medical history'),
      nextAction: field('string', 'Planned next action'),
    },
    outputFields: {
      oneLineSummary: field('string', 'Brief summary for handoff', true),
      handoffSummary: field('string', 'SBAR-style handoff summary', true),
      missingInformation: field('array', 'Missing handoff details', true),
      suggestedNextActions: field('array', 'Suggested next workflow steps', true),
    },
  },
};

export function isCareDroidAIIntent(value: unknown): value is CareDroidAIIntent {
  return typeof value === 'string' && CARE_DROID_AI_INTENTS.includes(value as CareDroidAIIntent);
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function validateCareDroidAIRequest(request: unknown): CareDroidAIValidationResult {
  const errors: CareDroidAIValidationIssue[] = [];
  const warnings: CareDroidAIValidationIssue[] = [];

  if (!isPlainObject(request)) {
    return {
      valid: false,
      errors: [{ field: 'request', message: 'AI request must be a JSON object.', severity: 'error' }],
      warnings,
    };
  }

  const intent = request.intent;
  if (!isCareDroidAIIntent(intent)) {
    errors.push({
      field: 'intent',
      message: `Intent must be one of ${CARE_DROID_AI_INTENTS.join(', ')}.`,
      severity: 'error',
    });
  }

  if (!isPlainObject(request.input)) {
    errors.push({ field: 'input', message: 'Input must be a JSON object.', severity: 'error' });
  }

  if (!isPlainObject(request.context) && request.context !== undefined) {
    errors.push({ field: 'context', message: 'Context must be a JSON object when provided.', severity: 'error' });
  }

  if (isCareDroidAIIntent(intent) && isPlainObject(request.input)) {
    const input = request.input;
    const schema = CARE_DROID_AI_SCHEMAS[intent];
    Object.entries(schema.inputFields)
      .filter(([, schemaField]) => schemaField.required)
      .forEach(([key, schemaField]) => {
        const value = input[key];
        if (isMissing(value)) {
          warnings.push({
            field: `input.${key}`,
            message: `Recommended field "${key}" is missing for ${schema.intent}.`,
            severity: 'warning',
          });
          return;
        }
        if (!matchesFieldType(value, schemaField.type)) {
          warnings.push({
            field: `input.${key}`,
            message: `Field "${key}" should be ${schemaField.type}.`,
            severity: 'warning',
          });
        }
      });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    request: errors.length
      ? undefined
      : {
          intent: request.intent as CareDroidAIIntent,
          input: request.input as Record<string, unknown>,
          context: isPlainObject(request.context) ? request.context : undefined,
        },
  };
}

export function validateCareDroidAIResponse(value: unknown): value is CareDroidAIResponse {
  if (!isPlainObject(value)) return false;
  const status = value.status;
  return (
    (isCareDroidAIIntent(value.intent) || value.intent === 'unknown') &&
    (status === 'success' || status === 'error') &&
    isPlainObject(value.data) &&
    typeof value.confidence === 'number' &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    Array.isArray(value.reasoning) &&
    Array.isArray(value.warnings) &&
    Array.isArray(value.redFlags) &&
    Array.isArray(value.nextActions) &&
    ['critical', 'high', 'medium', 'low'].includes(String(value.priority)) &&
    typeof value.assignedRole === 'string' &&
    typeof value.recommendedDepartment === 'string' &&
    typeof value.requiresClinicianReview === 'boolean' &&
    typeof value.clinicianOverrideAvailable === 'boolean' &&
    typeof value.generatedAt === 'string' &&
    typeof value.safetyDisclaimer === 'string'
  );
}

export function getRequiredInputFields(intent: CareDroidAIIntent): string[] {
  return Object.entries(CARE_DROID_AI_SCHEMAS[intent].inputFields)
    .filter(([, schemaField]) => schemaField.required)
    .map(([key]) => key);
}

function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

function matchesFieldType(value: unknown, type: FieldType): boolean {
  if (type === 'unknown') return true;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return isPlainObject(value);
  return typeof value === type;
}
