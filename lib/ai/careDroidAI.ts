import { buildAIAuditEvent, logAIAuditEvent, previewAIText } from './auditLogger';
import {
  CARE_DROID_AI_SCHEMAS,
  getRequiredInputFields,
  isCareDroidAIIntent,
  isPlainObject,
  validateCareDroidAIRequest,
  validateCareDroidAIResponse,
} from './careDroidAISchemas';
import { getCareDroidAIPrompt } from './careDroidAIPrompts';
import {
  CLINICAL_DECISION_SUPPORT_DISCLAIMER,
  type CareDroidAIIntent,
  type CareDroidAIRequest,
  type CareDroidAIResponse,
  type CareDroidAIValidationIssue,
} from './careDroidAITypes';

export {
  CARE_DROID_AI_INTENTS,
  CLINICAL_DECISION_SUPPORT_DISCLAIMER,
  type CareDroidAIContext,
  type CareDroidAIIntent,
  type CareDroidAIRequest,
  type CareDroidAIResponse,
  type CareDroidAIStatus,
} from './careDroidAITypes';
export {
  CARE_DROID_AI_SCHEMAS,
  getRequiredInputFields,
  isCareDroidAIIntent,
  validateCareDroidAIRequest,
  validateCareDroidAIResponse,
} from './careDroidAISchemas';
export { CARE_DROID_AI_PROMPTS, CARE_DROID_AI_SYSTEM_PROMPT } from './careDroidAIPrompts';

type HandlerResult = {
  data: Record<string, unknown>;
  confidence: number;
  reasoning: string[];
  warnings?: string[];
  redFlags?: string[];
  nextActions: string[];
  priority?: CareDroidAIResponse['priority'];
  assignedRole?: string;
  recommendedDepartment?: string;
  visibleToRoles?: string[];
  escalationRole?: string;
  suggestedOwnerRole?: string;
};

const OPERATIONAL_REVIEW_WARNING =
  'AI output is workflow decision support only and must be reviewed by the accountable care team.';

const EMERGENCY_RED_FLAG_TERMS = [
  ['chest pain', 'Chest pain reported'],
  ['shortness of breath', 'Respiratory distress symptom reported'],
  ['dyspnea', 'Respiratory distress symptom reported'],
  ['stroke', 'Possible stroke symptom reported'],
  ['facial droop', 'Possible stroke symptom reported'],
  ['slurred speech', 'Possible stroke symptom reported'],
  ['one-sided weakness', 'Possible stroke symptom reported'],
  ['severe bleeding', 'Active bleeding reported'],
  ['hemorrhage', 'Active bleeding reported'],
  ['anaphylaxis', 'Possible severe allergic reaction reported'],
  ['allergic reaction', 'Possible severe allergic reaction reported'],
  ['seizure', 'Seizure activity reported'],
  ['suicidal', 'Behavioral health safety risk reported'],
  ['self harm', 'Behavioral health safety risk reported'],
  ['loss of consciousness', 'Loss of consciousness reported'],
  ['unconscious', 'Loss of consciousness reported'],
  ['trauma', 'Major trauma reported'],
  ['pregnant', 'High-risk pregnancy concern reported'],
  ['pregnancy', 'High-risk pregnancy concern reported'],
  ['fever', 'Possible sepsis indicator reported'],
  ['confusion', 'Possible sepsis or neurologic risk reported'],
] as const;

const DEPARTMENT_KEYWORDS = [
  { department: 'Resuscitation', terms: ['cardiac arrest', 'unresponsive', 'shock', 'severe bleeding'] },
  { department: 'Cardiology', terms: ['chest pain', 'palpitations', 'syncope'] },
  { department: 'Respiratory', terms: ['shortness of breath', 'dyspnea', 'asthma', 'wheeze'] },
  { department: 'Neurology', terms: ['stroke', 'seizure', 'weakness', 'slurred speech'] },
  { department: 'Pediatrics', terms: ['pediatric', 'infant', 'child'] },
  { department: 'Obstetrics', terms: ['pregnant', 'pregnancy', 'labor'] },
  { department: 'Behavioral Health', terms: ['suicidal', 'self harm', 'psychosis'] },
  { department: 'Fast Track', terms: ['suture', 'sprain', 'minor injury', 'medication refill'] },
] as const;

export async function runCareDroidAI(request: unknown): Promise<CareDroidAIResponse> {
  const validation = validateCareDroidAIRequest(request);

  if (!validation.valid || !validation.request) {
    const response = buildErrorResponse(
      isPlainObject(request) && isCareDroidAIIntent(request.intent) ? request.intent : 'unknown',
      validation.errors,
    );
    logCareDroidAIEvent(request, response);
    return response;
  }

  const safeRequest: CareDroidAIRequest = {
    ...validation.request,
    input: sanitizeRecord(validation.request.input),
    context: validation.request.context ? sanitizeRecord(validation.request.context) : undefined,
  };

  const handler = HANDLERS[safeRequest.intent];
  const result = handler(safeRequest.input, validation.warnings);
  const response = buildSuccessResponse(safeRequest.intent, result, validation.warnings);

  if (!validateCareDroidAIResponse(response)) {
    const fallback = buildErrorResponse(safeRequest.intent, [
      {
        field: 'response',
        message: 'CareDroid AI node generated an invalid response schema.',
        severity: 'error',
      },
    ]);
    logCareDroidAIEvent(safeRequest, fallback);
    return fallback;
  }

  logCareDroidAIEvent(safeRequest, response);
  return response;
}

const HANDLERS: Record<
  CareDroidAIIntent,
  (input: Record<string, unknown>, validationWarnings: CareDroidAIValidationIssue[]) => HandlerResult
> = {
  critical_alert_assessment: handleCriticalAlertAssessment,
  three_minute_response_plan: handleThreeMinuteResponsePlan,
  patient_intake_assist: handlePatientIntakeAssist,
  triage_recommendation: handleTriageRecommendation,
  patient_summary: handlePatientSummary,
  department_routing: handleDepartmentRouting,
  wait_time_prediction: handleWaitTimePrediction,
  staff_resource_insight: handleStaffResourceInsight,
  hospital_command_insight: handleHospitalCommandInsight,
  service_bottleneck_analysis: handleServiceBottleneckAnalysis,
  workflow_delay_analysis: handleWorkflowDelayAnalysis,
  fallback_recommendation: handleFallbackRecommendation,
  three_minute_risk_projection: handleThreeMinuteRiskProjection,
  operational_root_cause_summary: handleOperationalRootCauseSummary,
  escalation_recommendation: handleEscalationRecommendation,
  handoff_summary: handleHandoffSummary,
};

function handleCriticalAlertAssessment(input: Record<string, unknown>): HandlerResult {
  const redFlags = detectRedFlags(input);
  const priority = inferPriority(input, redFlags);
  const acknowledgementRequired = priority === 'critical' || priority === 'high';
  const owner = priority === 'critical' ? 'Charge nurse and ED physician' : 'Triage nurse';
  const recommendedDepartment = inferDepartment(input);

  return {
    data: {
      severity: priority,
      redFlags,
      reason: redFlags.length
        ? `Red flag detected: ${redFlags.slice(0, 3).join('; ')}.`
        : 'No critical red flags detected in submitted alert data.',
      action: acknowledgementRequired
        ? 'Interrupt queue, acknowledge alert, and start clinician review.'
        : 'Keep visible in queue and reassess if new symptoms or vitals appear.',
      owner,
      acknowledgementRequired,
      acknowledged: Boolean(input.acknowledged),
    },
    confidence: redFlags.length ? 0.84 : 0.62,
    reasoning: [
      'Assessment used chief complaint, symptoms, age, pregnancy/pediatric context, and submitted vital signs.',
      acknowledgementRequired
        ? 'Severity requires visible acknowledgement and clinician review.'
        : 'Current information supports non-interruptive monitoring.',
    ],
    warnings: acknowledgementRequired ? ['Critical or high alert requires acknowledgement.'] : [],
    redFlags,
    nextActions: acknowledgementRequired
      ? ['Assign owner now.', 'Start 3-Minute Response Mode.', 'Document clinician acknowledgement.']
      : ['Continue standard workflow.', 'Repeat vitals if condition changes.'],
    priority,
    assignedRole: owner,
    recommendedDepartment,
    visibleToRoles: priority === 'critical'
      ? ['triage_nurse', 'charge_nurse', 'emergency_physician', 'attending_physician', 'registered_nurse']
      : ['triage_nurse', 'charge_nurse', 'emergency_physician'],
    escalationRole: priority === 'critical' ? 'attending_physician' : 'emergency_physician',
    suggestedOwnerRole: priority === 'critical' ? 'charge_nurse' : 'triage_nurse',
  };
}

function handleThreeMinuteResponsePlan(input: Record<string, unknown>): HandlerResult {
  const redFlags = detectRedFlags(input);
  const elapsedSeconds = Math.max(0, readNumber(input.elapsedSeconds) ?? 0);
  const phase =
    elapsedSeconds < 30 ? '0:00-0:30' : elapsedSeconds < 60 ? '0:30-1:00' : elapsedSeconds < 120 ? '1:00-2:00' : '2:00-3:00';
  const missingLifeCriticalData = [
    isMissing(input.chiefComplaint) ? 'Chief complaint' : '',
    isMissing(input.vitals) ? 'Current vitals' : '',
    !readArray(input.allergies).length ? 'Allergy status' : '',
    !readArray(input.medications).length ? 'Medication list' : '',
  ].filter(Boolean);
  const escalationState = !input.acknowledged && elapsedSeconds >= 120 ? 'Escalate now' : !input.acknowledged ? 'Awaiting acknowledgement' : 'Acknowledged';
  const priority = inferPriority(input, redFlags);
  const department = inferDepartment(input);

  return {
    data: {
      responseTimerSeconds: elapsedSeconds,
      currentPhase: phase,
      alertSeverity: priority,
      patientStatus: priority === 'critical' ? 'Critical review required' : 'Priority review required',
      responsibleRole: 'Charge nurse',
      acknowledgementState: input.acknowledged ? 'Acknowledged' : 'Not acknowledged',
      escalationState,
      nextSafestAction: buildThreeMinuteAction(phase, Boolean(input.acknowledged), redFlags),
      notifications: ['Charge nurse', 'ED physician', priority === 'critical' ? 'Resuscitation team' : 'Triage nurse'],
      missingLifeCriticalData,
      clinicianReview: 'Required before acting on AI output',
    },
    confidence: redFlags.length ? 0.82 : 0.68,
    reasoning: [
      `Current response phase is ${phase}.`,
      redFlags.length ? `Red flags detected: ${redFlags.join('; ')}.` : 'No red flags were detected in the submitted data.',
      escalationState === 'Escalate now' ? 'Alert is unacknowledged after two minutes.' : 'Escalation threshold has not been crossed.',
    ],
    warnings: ['3-Minute Response Mode is decision support and does not replace local emergency protocol.'],
    redFlags,
    nextActions: ['Keep timer visible.', 'Confirm clinician acknowledgement.', 'Update handoff summary before minute three.'],
    priority,
    assignedRole: 'Charge nurse',
    recommendedDepartment: department,
  };
}

function handlePatientIntakeAssist(input: Record<string, unknown>): HandlerResult {
  const missingFields = findMissingFields('patient_intake_assist', input);
  const symptoms = readArray(input.symptoms);
  const urgencyFlags = detectRedFlags(input);
  const completeness = calculateCompletenessScore('patient_intake_assist', input);
  const preferredLanguage = readString(input.preferredLanguage) || 'not recorded';
  const normalizedPatientData = {
    patientName: readString(input.patientName) || 'Unconfirmed patient',
    age: readNumber(input.age),
    sex: readString(input.sex) || 'not recorded',
    symptoms,
    duration: readString(input.duration) || 'not recorded',
    painLevel: readNumber(input.painLevel),
    allergies: readArray(input.allergies),
    medications: readArray(input.medications),
    existingConditions: readArray(input.existingConditions),
    insuranceStatus: readString(input.insuranceStatus) || 'not recorded',
    preferredLanguage,
    arrivalMode: readString(input.arrivalMode) || 'not recorded',
  };
  const suggestedQuestions = buildSuggestedQuestions(missingFields, urgencyFlags, preferredLanguage);

  return {
    data: {
      normalizedPatientData,
      missingFields,
      suggestedQuestions,
      intakeCompletenessScore: completeness,
      urgencyFlags,
      nextStep: urgencyFlags.length
        ? 'Notify triage nurse for immediate review while completing remaining intake fields.'
        : missingFields.length
          ? 'Complete missing intake fields before moving patient to waiting or triage.'
          : 'Move patient to waiting or triage based on local workflow.',
    },
    confidence: missingFields.length ? 0.68 : 0.82,
    reasoning: [
      `Intake completeness is ${completeness}%.`,
      urgencyFlags.length
        ? 'One or more urgent symptoms or vital signs require nurse review.'
        : 'No critical red-flag language was found in the provided intake data.',
    ],
    warnings: missingFields.length ? ['Intake data is incomplete.'] : [],
    redFlags: urgencyFlags,
    nextActions: suggestedQuestions.slice(0, 3),
    priority: inferPriority(input, urgencyFlags),
    assignedRole: urgencyFlags.length ? 'Triage nurse' : 'Registration nurse',
    recommendedDepartment: urgencyFlags.length ? inferDepartment(input) : 'Emergency Department',
  };
}

function handleTriageRecommendation(input: Record<string, unknown>): HandlerResult {
  const symptoms = readArray(input.symptoms);
  const redFlags = detectRedFlags(input);
  const painLevel = readNumber(input.painLevel) ?? 0;
  const age = readNumber(input.age);
  const currentWaitTime = readNumber(input.currentWaitTime) ?? 0;
  const recommendedTriageLevel = inferTriageLevel(input, redFlags);
  const suggestedDepartment = inferDepartment(input);
  const suggestedTests = suggestTests(symptoms, redFlags, suggestedDepartment);
  const reasoning = [
    redFlags.length
      ? `Red-flag signals detected: ${redFlags.slice(0, 3).join('; ')}.`
      : 'No critical red-flag signals were detected in the submitted data.',
    painLevel >= 8 ? 'Pain score is severe and should be reviewed promptly.' : `Pain score is ${painLevel}/10.`,
    currentWaitTime > 60 ? 'Current wait time is above one hour.' : 'Current wait time does not independently escalate acuity.',
  ];
  if (age !== undefined && (age < 1 || age >= 75)) {
    reasoning.push('Age may increase risk and should be considered during nurse assessment.');
  }

  return {
    data: {
      recommendedTriageLevel,
      confidence: triageConfidence(redFlags, input),
      reasoning,
      redFlags,
      suggestedDepartment,
      suggestedTests,
      estimatedWaitImpact:
        recommendedTriageLevel === 'P1' || recommendedTriageLevel === 'P2'
          ? 'Likely priority review ahead of lower-acuity queue.'
          : 'Likely managed within standard queue unless clinician assessment escalates.',
      clinicianOverrideRequired: true,
      disclaimer: CLINICAL_DECISION_SUPPORT_DISCLAIMER,
    },
    confidence: triageConfidence(redFlags, input),
    reasoning,
    warnings: redFlags.length ? ['Emergency red flags require immediate licensed clinician review.'] : [],
    redFlags,
    nextActions: [
      'Review recommendation with triage nurse.',
      'Confirm vitals and pain score before changing acuity.',
      'Document clinician override if local assessment differs.',
    ],
    priority: inferPriority(input, redFlags),
    assignedRole: recommendedTriageLevel === 'P1' ? 'ED physician and charge nurse' : 'Triage nurse',
    recommendedDepartment: suggestedDepartment,
    visibleToRoles: ['triage_nurse', 'charge_nurse', 'emergency_physician', 'attending_physician'],
    escalationRole: 'emergency_physician',
    suggestedOwnerRole: recommendedTriageLevel === 'P1' ? 'charge_nurse' : 'triage_nurse',
  };
}

function handlePatientSummary(input: Record<string, unknown>): HandlerResult {
  const demographics = readObject(input.demographics);
  const intakeData = readObject(input.intakeData);
  const vitals = readObject(input.vitals);
  const symptoms = readArray(intakeData.symptoms ?? input.symptoms);
  const age = readNumber(demographics.age ?? input.age);
  const sex = readString(demographics.sex ?? demographics.gender ?? input.sex) || 'patient';
  const redFlags = detectRedFlags({ ...input, symptoms, vitals });
  const missingInformation = [
    !Object.keys(vitals).length ? 'Current vitals' : '',
    !readArray(input.allergies).length ? 'Allergy status' : '',
    !readArray(input.medications).length ? 'Medication reconciliation' : '',
    !readArray(input.triageNotes).length ? 'Triage notes' : '',
  ].filter(Boolean);
  const activeProblems = [
    symptoms.length ? `Presenting symptoms: ${symptoms.join(', ')}` : 'Presenting symptoms not documented',
    ...redFlags,
  ];
  const oneLineSummary = `${age !== undefined ? `${age}-year-old ` : ''}${sex} with ${symptoms.length ? symptoms.join(', ') : 'incomplete presenting complaint documentation'}.`;

  return {
    data: {
      oneLineSummary,
      clinicalSummary: [
        oneLineSummary,
        redFlags.length
          ? `Potential risk signals include ${redFlags.join('; ')}.`
          : 'No red-flag signals were identified in the provided summary data.',
        missingInformation.length
          ? `Missing information: ${missingInformation.join(', ')}.`
          : 'Core handoff information appears complete.',
      ].join(' '),
      keyRisks: redFlags.length ? redFlags : ['Incomplete data may hide risk.'],
      missingInformation,
      activeProblems,
      suggestedNextActions: [
        'Review summary with responsible clinician.',
        missingInformation.length ? 'Complete missing handoff fields.' : 'Confirm plan and disposition owner.',
      ],
      handoffSummary: `Situation: ${oneLineSummary} Background: review history, allergies, medications, labs, and imaging. Assessment: ${redFlags.length ? redFlags.join('; ') : 'requires clinician assessment'}. Recommendation: confirm next care step with clinician.`,
    },
    confidence: missingInformation.length ? 0.66 : 0.8,
    reasoning: [
      'Summary was assembled from provided demographics, intake data, vitals, notes, labs, imaging, and visit history.',
      missingInformation.length
        ? 'Missing information reduces confidence.'
        : 'Core handoff fields were present.',
    ],
    warnings: missingInformation.length ? ['Patient summary has incomplete source data.'] : [],
    redFlags,
    nextActions: [
      'Ask clinician to verify summary before handoff.',
      missingInformation.length ? 'Collect missing fields before finalizing documentation.' : 'Use as draft handoff only.',
    ],
    priority: inferPriority(input, redFlags),
    assignedRole: 'Responsible clinician',
    recommendedDepartment: inferDepartment({ ...input, symptoms }),
  };
}

function handleWaitTimePrediction(input: Record<string, unknown>): HandlerResult {
  const queueLength = readNumber(input.queueLength) ?? 0;
  const doctorsOnDuty = Math.max(1, readNumber(input.doctorsOnDuty) ?? 1);
  const nursesAvailable = Math.max(0, readNumber(input.nursesAvailable) ?? 0);
  const bedsAvailable = Math.max(0, readNumber(input.bedsAvailable) ?? 0);
  const averageTreatmentTime = readNumber(input.averageTreatmentTime) ?? 38;
  const criticalCases = readNumber(input.criticalCases) ?? 0;
  const currentCapacity = readNumber(input.currentCapacity) ?? 75;
  const triageLevel = readString(input.triageLevel) || 'P3';
  const minutes = estimateWaitMinutes({
    queueLength,
    doctorsOnDuty,
    nursesAvailable,
    bedsAvailable,
    averageTreatmentTime,
    criticalCases,
    currentCapacity,
    triageLevel,
  });
  const bottleneck = inferBottleneck({ doctorsOnDuty, nursesAvailable, bedsAvailable, currentCapacity, criticalCases });
  const operationalRisk = currentCapacity >= 95 || criticalCases >= 4 ? 'critical' : currentCapacity >= 85 ? 'high' : currentCapacity >= 70 ? 'moderate' : 'low';

  return {
    data: {
      estimatedWaitTime: formatWaitRange(minutes),
      confidence: queueLength > 0 ? 0.74 : 0.58,
      bottleneck,
      recommendedAction:
        operationalRisk === 'critical' || operationalRisk === 'high'
          ? 'Open surge review, rebalance staffing, and prioritize discharge-ready bed turnover.'
          : 'Continue monitoring queue velocity and reassessment timers.',
      operationalRisk,
    },
    confidence: queueLength > 0 ? 0.74 : 0.58,
    reasoning: [
      `Queue length ${queueLength}, ${doctorsOnDuty} doctors, ${nursesAvailable} nurses, and ${bedsAvailable} beds were used.`,
      `Capacity is ${currentCapacity}% with ${criticalCases} active critical cases.`,
    ],
    warnings: queueLength === 0 ? ['Queue length was missing or zero, reducing prediction confidence.'] : [],
    nextActions: [
      'Review wait estimate against live whiteboard before communicating to patients.',
      'Recalculate after major staffing, bed, or critical-case changes.',
    ],
    priority: operationalRisk === 'critical' ? 'critical' : operationalRisk === 'high' ? 'high' : operationalRisk === 'moderate' ? 'medium' : 'low',
    assignedRole: operationalRisk === 'critical' || operationalRisk === 'high' ? 'Charge nurse' : 'Flow coordinator',
    recommendedDepartment: readString(input.department) || 'Emergency Department',
  };
}

function handleDepartmentRouting(input: Record<string, unknown>): HandlerResult {
  const symptoms = readArray(input.symptoms);
  const availableDepartments = readArray(input.availableDepartments);
  const recommendedDepartment = chooseAvailableDepartment(inferDepartment(input), availableDepartments);
  const alternateDepartment = availableDepartments.find((department) => department !== recommendedDepartment) || 'Emergency Department';
  const redFlags = detectRedFlags(input);
  const urgency = redFlags.length ? 'critical' : readString(input.triageLevel)?.match(/P1|P2/i) ? 'urgent' : 'routine';

  return {
    data: {
      recommendedDepartment,
      alternateDepartment,
      routingReason: symptoms.length
        ? `Symptoms suggest ${recommendedDepartment} review while capacity and clinician judgment remain decisive.`
        : `Insufficient symptom detail; ${recommendedDepartment} is a conservative default route.`,
      urgency,
      requiredResources: inferRequiredResources(recommendedDepartment, redFlags),
    },
    confidence: symptoms.length ? 0.72 : 0.54,
    reasoning: [
      symptoms.length
        ? `Routing matched symptom keywords: ${symptoms.slice(0, 4).join(', ')}.`
        : 'Routing confidence is limited because symptoms were not provided.',
      availableDepartments.length
        ? 'Available departments were considered.'
        : 'No available department list was provided, so emergency department defaults were used.',
    ],
    warnings: redFlags.length ? ['Route suggestion includes emergency red flags.'] : [],
    redFlags,
    nextActions: [
      'Confirm route with charge nurse or responsible clinician.',
      'Check department capacity before moving the patient.',
    ],
    priority: inferPriority(input, redFlags),
    assignedRole: redFlags.length ? 'Charge nurse' : 'Triage nurse',
    recommendedDepartment,
  };
}

function handleStaffResourceInsight(input: Record<string, unknown>): HandlerResult {
  const patientsWaiting = readNumber(input.patientsWaiting) ?? 0;
  const criticalPatients = readNumber(input.criticalPatients) ?? 0;
  const doctorsOnDuty = readNumber(input.doctorsOnDuty) ?? 0;
  const nursesAvailable = readNumber(input.nursesAvailable) ?? 0;
  const bedsAvailable = readNumber(input.bedsAvailable) ?? 0;
  const departmentLoads = readObject(input.departmentLoads);
  const overloadedDepartments = Object.entries(departmentLoads)
    .filter(([, value]) => Number(value) >= 85)
    .map(([department]) => department);
  const patientPerClinician = patientsWaiting / Math.max(1, doctorsOnDuty + nursesAvailable);
  const staffingRisk = criticalPatients >= 3 || patientPerClinician >= 5 || bedsAvailable <= 1 ? 'high' : patientPerClinician >= 3 ? 'moderate' : 'low';

  return {
    data: {
      staffingRisk,
      overloadedDepartments,
      recommendedStaffReallocation:
        staffingRisk === 'high'
          ? [
              'Move float nurse coverage toward triage or resuscitation.',
              'Ask charge physician to review fast-track and discharge-ready patients.',
            ]
          : ['Maintain current allocation and monitor queue thresholds.'],
      expectedImpact:
        staffingRisk === 'high'
          ? 'May reduce triage delay and improve bed turnover if paired with discharge coordination.'
          : 'Current staffing appears adequate for near-term demand.',
      priorityActions:
        staffingRisk === 'high'
          ? ['Escalate staffing huddle.', 'Review bed turnover blockers.', 'Reassess critical-patient coverage.']
          : ['Continue 30-minute operational checks.'],
    },
    confidence: patientsWaiting || criticalPatients ? 0.76 : 0.6,
    reasoning: [
      `${patientsWaiting} waiting patients, ${criticalPatients} critical patients, ${doctorsOnDuty} doctors, and ${nursesAvailable} nurses were considered.`,
      overloadedDepartments.length
        ? `Overloaded departments: ${overloadedDepartments.join(', ')}.`
        : 'No department load exceeded the overload threshold.',
    ],
    warnings: bedsAvailable <= 1 ? ['Low bed availability may constrain staffing improvements.'] : [],
    nextActions: [
      'Review staffing action with charge nurse and administrator.',
      'Re-run insight after staffing or bed status changes.',
    ],
    priority: staffingRisk === 'high' ? 'high' : staffingRisk === 'moderate' ? 'medium' : 'low',
    assignedRole: staffingRisk === 'high' ? 'Charge nurse' : 'Operations lead',
    recommendedDepartment: 'Emergency Department',
  };
}

function handleHospitalCommandInsight(input: Record<string, unknown>): HandlerResult {
  const averageWaitTime = readNumber(input.averageWaitTime) ?? 0;
  const patientsWaiting = readNumber(input.patientsWaiting) ?? 0;
  const erOccupancy = readNumber(input.erOccupancy) ?? 0;
  const bedOccupancy = readNumber(input.bedOccupancy) ?? 0;
  const staffUtilization = readNumber(input.staffUtilization) ?? 0;
  const triageTime = readNumber(input.triageTime) ?? 0;
  const severity = erOccupancy >= 95 || averageWaitTime >= 120 ? 'red' : erOccupancy >= 85 || averageWaitTime >= 60 ? 'amber' : 'green';
  const bottlenecks = [
    erOccupancy >= 85 ? 'ER occupancy' : '',
    bedOccupancy >= 90 ? 'Inpatient bed occupancy' : '',
    staffUtilization >= 90 ? 'Staff utilization' : '',
    triageTime >= 20 ? 'Triage processing time' : '',
  ].filter(Boolean);

  return {
    data: {
      topInsights: [
        `${patientsWaiting} patients waiting with average wait of ${averageWaitTime} minutes.`,
        `ER occupancy is ${erOccupancy}% and staff utilization is ${staffUtilization || 'not recorded'}%.`,
      ],
      risks:
        severity === 'red'
          ? ['Flow pressure is critical and may delay care without immediate intervention.']
          : severity === 'amber'
            ? ['Flow pressure is elevated and should be monitored closely.']
            : ['Current operational telemetry is within expected range.'],
      bottlenecks,
      recommendedActions:
        severity === 'red'
          ? ['Open command huddle.', 'Expedite bed turnover.', 'Review staffing surge options.']
          : severity === 'amber'
            ? ['Review discharge-ready patients.', 'Monitor triage and reassessment timers.']
            : ['Continue routine command-center monitoring.'],
      severity,
      confidence: averageWaitTime || erOccupancy ? 0.78 : 0.56,
    },
    confidence: averageWaitTime || erOccupancy ? 0.78 : 0.56,
    reasoning: [
      `Severity is ${severity} based on wait time, ER occupancy, bed occupancy, staff utilization, and triage time.`,
      bottlenecks.length ? `Bottlenecks detected: ${bottlenecks.join(', ')}.` : 'No major bottleneck thresholds were crossed.',
    ],
    warnings: severity === 'red' ? ['Command-center conditions may affect patient safety if not reviewed.'] : [],
    nextActions:
      severity === 'red'
        ? ['Escalate to command huddle.', 'Confirm action owners for bed, staffing, and triage workstreams.']
        : ['Continue monitoring and refresh with live operational data.'],
    priority: severity === 'red' ? 'critical' : severity === 'amber' ? 'high' : 'low',
    assignedRole: severity === 'red' ? 'Hospital command lead' : 'Charge nurse',
    recommendedDepartment: 'Emergency Department',
  };
}

function readObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isPlainObject) : [];
}

function handleServiceBottleneckAnalysis(input: Record<string, unknown>): HandlerResult {
  const bottlenecks = readObjectArray(input.activeBottlenecks);
  const serviceHealth = readObjectArray(input.serviceHealth);
  const failedServices = serviceHealth
    .filter((service) => ['down', 'degraded'].includes(readString(service.status).toLowerCase()))
    .map((service) => readString(service.serviceName))
    .filter(Boolean);
  const criticalEvents = bottlenecks.filter((event) => readString(event.severity) === 'critical');
  const primary = criticalEvents[0] || bottlenecks[0] || {};

  return {
    data: {
      slowingCareNow: bottlenecks.map((event) => readString(event.title)).filter(Boolean).slice(0, 5),
      affectedPatients: bottlenecks.map((event) => readString(event.affectedPatientId)).filter(Boolean),
      failedServices,
      fallbackActions: bottlenecks.map((event) => readString(event.fallbackAction)).filter(Boolean).slice(0, 4),
      ownerRole: readString(primary.ownerRole) || 'charge_nurse',
      threeMinuteTargetRisk: criticalEvents.length ? 'breach_likely' : bottlenecks.length ? 'at_risk' : 'on_track',
    },
    confidence: bottlenecks.length || serviceHealth.length ? 0.78 : 0.55,
    reasoning: [
      `${bottlenecks.length} active bottleneck events and ${serviceHealth.length} service health rows were reviewed.`,
      failedServices.length ? `Degraded services: ${failedServices.join(', ')}.` : 'No degraded services were reported.',
    ],
    warnings: criticalEvents.length ? ['Critical service/workflow bottleneck may affect the three-minute target.'] : [],
    redFlags: criticalEvents.map((event) => readString(event.title)).filter(Boolean),
    nextActions: [
      readString(primary.fallbackAction) || 'Continue standard clinical workflow and monitor service health.',
      `Assign owner: ${readString(primary.ownerRole) || 'charge_nurse'}.`,
    ],
    priority: criticalEvents.length ? 'critical' : bottlenecks.length ? 'high' : 'low',
    assignedRole: readString(primary.ownerRole) || 'Charge nurse',
    recommendedDepartment: readString(primary.affectedDepartment) || 'Emergency Department',
  };
}

function handleWorkflowDelayAnalysis(input: Record<string, unknown>): HandlerResult {
  const bottlenecks = readObjectArray(input.activeBottlenecks);
  const delayed = bottlenecks
    .map((event) => readString(event.affectedWorkflow) || readString(event.title))
    .filter(Boolean);
  const ownerRoles = uniqueStrings(
    bottlenecks.map((event) => readString(event.ownerRole)).filter(Boolean),
  );
  const critical = bottlenecks.some((event) => readString(event.severity) === 'critical');

  return {
    data: {
      delayedWorkflows: delayed,
      ownerRoles,
      recommendedActions: bottlenecks
        .map((event) => readString(event.recommendedFix) || readString(event.fallbackAction))
        .filter(Boolean)
        .slice(0, 5),
    },
    confidence: bottlenecks.length ? 0.76 : 0.54,
    reasoning: [
      delayed.length
        ? `Delayed workflows: ${delayed.slice(0, 4).join(', ')}.`
        : 'No delayed workflows were supplied.',
    ],
    warnings: critical ? ['At least one workflow delay is critical.'] : [],
    redFlags: critical ? delayed.slice(0, 3) : [],
    nextActions: ownerRoles.length
      ? [`Confirm accountable owner: ${ownerRoles[0]}.`, 'Document acknowledgement and mitigation.']
      : ['Continue monitoring queue and service health.'],
    priority: critical ? 'critical' : bottlenecks.length ? 'high' : 'low',
    assignedRole: ownerRoles[0] || 'Charge nurse',
    recommendedDepartment: 'Emergency Department',
  };
}

function handleFallbackRecommendation(input: Record<string, unknown>): HandlerResult {
  const serviceName = readString(input.serviceName) || 'service';
  const service = serviceName.toLowerCase();
  const fallbackAction =
    service.includes('ai')
      ? 'Continue standard clinical workflow and manual triage.'
      : service.includes('notification')
        ? 'Show persistent in-app critical banner and require manual call/page.'
        : service.includes('ehr') || service.includes('fhir')
          ? 'Use local intake snapshot and mark external data unavailable.'
          : service.includes('lab')
            ? 'Show pending lab status and notify lab owner.'
            : service.includes('auth')
              ? 'Fail closed for admin actions while preserving emergency read-only workflow.'
              : service.includes('analytics')
                ? 'Do not block clinical workflow; continue local command-center monitoring.'
                : 'Continue emergency workflow locally and assign a human owner while service health is checked.';

  return {
    data: {
      fallbackAction,
      ownerRole: service.includes('auth') || service.includes('api') ? 'platform_admin' : 'charge_nurse',
      blockingClinicalWorkflow: !service.includes('analytics'),
    },
    confidence: 0.74,
    reasoning: [`Fallback selected for ${serviceName} failure mode: ${readString(input.failureMode) || 'unavailable'}.`],
    warnings: ['Never allow SaaS failure to crash the app or block emergency response.'],
    redFlags: [],
    nextActions: [fallbackAction, 'Document fallback use and retry service health check.'],
    priority: service.includes('notification') || service.includes('ehr') || service.includes('auth') ? 'high' : 'medium',
    assignedRole: service.includes('auth') || service.includes('api') ? 'Platform admin' : 'Charge nurse',
    recommendedDepartment: 'Emergency Department',
  };
}

function handleThreeMinuteRiskProjection(input: Record<string, unknown>): HandlerResult {
  const projection = readObject(input.projection);
  const status = readString(projection.status) || 'unknown';
  const isBreachLikely = status === 'breach_likely';
  const isAtRisk = status === 'at_risk' || isBreachLikely;

  return {
    data: {
      riskStatus: status,
      nextOwnerRole: readString(projection.nextOwnerRole) || 'charge_nurse',
      fallbackAction: readString(projection.fallbackAction) || 'Continue standard clinical workflow.',
      breachReason: readString(projection.summary) || 'No three-minute projection summary supplied.',
    },
    confidence: status === 'unknown' ? 0.52 : 0.8,
    reasoning: [readString(projection.summary) || 'Projection used active bottleneck registry state.'],
    warnings: isAtRisk ? ['Three-minute response target is at risk from active bottlenecks.'] : [],
    redFlags: isBreachLikely ? ['Three-minute breach likely'] : [],
    nextActions: [
      readString(projection.fallbackAction) || 'Continue standard clinical workflow.',
      `Assign owner: ${readString(projection.nextOwnerRole) || 'charge_nurse'}.`,
    ],
    priority: isBreachLikely ? 'critical' : isAtRisk ? 'high' : 'low',
    assignedRole: readString(projection.nextOwnerRole) || 'Charge nurse',
    recommendedDepartment: 'Emergency Department',
  };
}

function handleOperationalRootCauseSummary(input: Record<string, unknown>): HandlerResult {
  const bottlenecks = readObjectArray(input.activeBottlenecks);
  const departments = uniqueStrings(
    bottlenecks.map((event) => readString(event.affectedDepartment)).filter(Boolean),
  );
  const rootCauses = bottlenecks
    .map((event) => `${readString(event.serviceName) || 'Service'}: ${readString(event.title)}`)
    .filter((item) => !item.endsWith(': '))
    .slice(0, 5);
  const critical = bottlenecks.some((event) => readString(event.severity) === 'critical');

  return {
    data: {
      rootCauses: rootCauses.length ? rootCauses : [readString(input.rootCauseSummary) || 'No active root cause detected.'],
      affectedDepartments: departments,
      recommendedActions: bottlenecks
        .map((event) => readString(event.recommendedFix) || readString(event.fallbackAction))
        .filter(Boolean)
        .slice(0, 5),
    },
    confidence: bottlenecks.length ? 0.78 : 0.56,
    reasoning: [readString(input.rootCauseSummary) || `${bottlenecks.length} bottlenecks reviewed.`],
    warnings: critical ? ['Critical bottleneck root cause requires command-center acknowledgement.'] : [],
    redFlags: critical ? rootCauses.slice(0, 3) : [],
    nextActions: ['Review root cause with the accountable owner.', 'Track acknowledgement and mitigation status.'],
    priority: critical ? 'critical' : bottlenecks.length ? 'high' : 'low',
    assignedRole: 'Charge nurse',
    recommendedDepartment: departments[0] || 'Emergency Department',
  };
}

function handleEscalationRecommendation(input: Record<string, unknown>): HandlerResult {
  const redFlags = uniqueStrings([...readArray(input.redFlags), ...detectRedFlags(input)]);
  const elapsedSeconds = readNumber(input.elapsedSeconds) ?? 0;
  const acknowledged = Boolean(input.acknowledged);
  const severity = readString(input.severity).toLowerCase();
  const escalationRequired =
    (!acknowledged && elapsedSeconds >= 120) ||
    severity === 'critical' ||
    redFlags.length >= 2 ||
    Boolean(readString(input.bottleneck));
  const owner = readString(input.owner) || (severity === 'critical' ? 'ED physician' : 'Charge nurse');

  return {
    data: {
      escalationRequired,
      escalationReason: escalationRequired
        ? 'Unacknowledged critical/high risk or operational bottleneck may delay safe care.'
        : 'No escalation threshold crossed with submitted data.',
      escalationOwner: owner,
      escalationAction: escalationRequired
        ? 'Page accountable owner, document acknowledgement, and update command center.'
        : 'Monitor acknowledgement and repeat assessment if status changes.',
    },
    confidence: escalationRequired ? 0.78 : 0.62,
    reasoning: [
      `Acknowledgement is ${acknowledged ? 'present' : 'not documented'} after ${elapsedSeconds} seconds.`,
      redFlags.length ? `Known red flags: ${redFlags.join('; ')}.` : 'No red flags were submitted.',
    ],
    warnings: escalationRequired ? ['Escalation recommendation requires human confirmation.'] : [],
    redFlags,
    nextActions: escalationRequired
      ? ['Notify escalation owner.', 'Record acknowledgement state.', 'Generate handoff summary.']
      : ['Continue monitoring response timer.'],
    priority: escalationRequired ? 'critical' : 'medium',
    assignedRole: owner,
    recommendedDepartment: 'Emergency Department',
    visibleToRoles: escalationRequired
      ? ['triage_nurse', 'charge_nurse', 'emergency_physician', 'attending_physician', 'ed_director']
      : ['charge_nurse', 'emergency_physician'],
    escalationRole: 'ed_director',
    suggestedOwnerRole: severity === 'critical' ? 'emergency_physician' : 'charge_nurse',
  };
}

function handleHandoffSummary(input: Record<string, unknown>): HandlerResult {
  return handlePatientSummary({
    demographics: input.demographics,
    intakeData: {
      symptoms: readArray(input.symptoms).length ? input.symptoms : [input.chiefComplaint].filter(Boolean),
    },
    vitals: input.vitals,
    triageNotes: [input.nextAction].filter(Boolean),
    medicalHistory: input.medicalHistory,
    medications: input.medications,
    allergies: input.allergies,
    redFlags: input.redFlags,
    triageLevel: input.triageLevel,
  });
}

function buildSuccessResponse(
  intent: CareDroidAIIntent,
  result: HandlerResult,
  validationWarnings: CareDroidAIValidationIssue[] = [],
): CareDroidAIResponse {
  const schema = CARE_DROID_AI_SCHEMAS[intent];
  const warnings = uniqueStrings([
    ...validationWarnings.map((warning) => warning.message),
    ...(result.warnings || []),
    schema.clinical ? CLINICAL_DECISION_SUPPORT_DISCLAIMER : OPERATIONAL_REVIEW_WARNING,
  ]);

  return {
    intent,
    status: 'success',
    priority: result.priority || priorityFromResult(result),
    data: result.data,
    confidence: clampConfidence(result.confidence),
    reasoning: result.reasoning.filter(Boolean),
    warnings,
    redFlags: uniqueStrings([...(result.redFlags || []), ...readArray(result.data.redFlags)]),
    nextActions: result.nextActions.filter(Boolean),
    assignedRole: result.assignedRole || readString(result.data.owner) || 'Responsible clinician',
    recommendedDepartment: result.recommendedDepartment || readString(result.data.recommendedDepartment) || 'Emergency Department',
    requiresClinicianReview: true,
    clinicianOverrideAvailable: true,
    generatedAt: new Date().toISOString(),
    safetyDisclaimer: CLINICAL_DECISION_SUPPORT_DISCLAIMER,
    ...(result.visibleToRoles ? { visibleToRoles: result.visibleToRoles } : {}),
    ...(result.escalationRole ? { escalationRole: result.escalationRole } : {}),
    ...(result.suggestedOwnerRole ? { suggestedOwnerRole: result.suggestedOwnerRole } : {}),
  };
}

function buildErrorResponse(
  intent: CareDroidAIIntent | 'unknown',
  issues: CareDroidAIValidationIssue[],
): CareDroidAIResponse {
  return {
    intent,
    status: 'error',
    priority: 'low',
    data: {
      error: 'CareDroid AI request could not be processed safely.',
      issues: issues.map((issue) => ({ field: issue.field, message: issue.message })),
    },
    confidence: 0,
    reasoning: ['The AI node rejected the request before generating a recommendation.'],
    warnings: [
      ...issues.map((issue) => issue.message),
      'No AI recommendation was generated.',
      CLINICAL_DECISION_SUPPORT_DISCLAIMER,
    ],
    redFlags: [],
    nextActions: ['Review request payload and retry with a supported intent and JSON input object.'],
    assignedRole: 'Responsible clinician',
    recommendedDepartment: 'Emergency Department',
    requiresClinicianReview: true,
    clinicianOverrideAvailable: true,
    generatedAt: new Date().toISOString(),
    safetyDisclaimer: CLINICAL_DECISION_SUPPORT_DISCLAIMER,
  };
}

function logCareDroidAIEvent(request: unknown, response: CareDroidAIResponse): void {
  try {
    const safeRequest = isPlainObject(request) ? request : {};
    const input = isPlainObject(safeRequest.input) ? safeRequest.input : {};
    const context = isPlainObject(safeRequest.context) ? safeRequest.context : {};
    const tenant = isPlainObject(context.tenant) ? context.tenant : {};
    const intent = typeof safeRequest.intent === 'string' ? safeRequest.intent : response.intent;
    const purpose = isCareDroidAIIntent(intent) ? getCareDroidAIPrompt(intent) : 'Reject unsafe or invalid AI request.';

    logAIAuditEvent(
      buildAIAuditEvent({
        userId: String(tenant.userId || context.userId || 'unknown'),
        tenantId: String(tenant.organizationId || context.organizationId || 'unknown'),
        module: 'careDroidAI',
        action: 'route_intent',
        purpose,
        result: response.status,
        requestType: String(intent),
        inputPreview: previewAIText(
          JSON.stringify({
            intent,
            inputFields: Object.keys(input).sort(),
            sourceScreen: context.sourceScreen,
            userRole: context.userRole || tenant.role,
          }),
        ),
        outputPreview: previewAIText(
          JSON.stringify({
            status: response.status,
            confidence: response.confidence,
            warningCount: response.warnings.length,
            nextActionCount: response.nextActions.length,
          }),
        ),
        safety: {
          requiresHumanReview: response.requiresClinicianReview,
          blocked: response.status === 'error',
          reasons: response.warnings.slice(0, 4),
        },
      }),
    );
  } catch {
    // Audit logging should never break clinical workflow rendering.
  }
}

function findMissingFields(intent: CareDroidAIIntent, input: Record<string, unknown>): string[] {
  return Object.keys(CARE_DROID_AI_SCHEMAS[intent].inputFields).filter((key) => isMissing(input[key]));
}

function calculateCompletenessScore(intent: CareDroidAIIntent, input: Record<string, unknown>): number {
  const fields = Object.keys(CARE_DROID_AI_SCHEMAS[intent].inputFields);
  if (!fields.length) return 100;
  const present = fields.filter((key) => !isMissing(input[key])).length;
  return Math.round((present / fields.length) * 100);
}

function buildSuggestedQuestions(
  missingFields: string[],
  urgencyFlags: string[],
  preferredLanguage: string,
): string[] {
  const labels: Record<string, string> = {
    patientName: 'Can you confirm the patient name?',
    age: 'Can you confirm the patient age or date of birth?',
    sex: 'Can you confirm the recorded sex or gender marker?',
    symptoms: 'What symptoms brought the patient in today?',
    duration: 'When did the symptoms start?',
    painLevel: 'What is the pain level from 0 to 10?',
    allergies: 'Does the patient have any allergies?',
    medications: 'What medications is the patient currently taking?',
    existingConditions: 'Does the patient have existing medical conditions?',
    insuranceStatus: 'Can you confirm insurance or coverage status?',
    preferredLanguage: 'What language does the patient prefer for care communication?',
    arrivalMode: 'Did the patient arrive by walk-in, EMS, transfer, or another mode?',
  };
  const questions = missingFields.map((fieldName) => labels[fieldName] || `Can you confirm ${fieldName}?`);
  if (urgencyFlags.length) {
    questions.unshift('Can the triage nurse review this patient now based on reported urgency signals?');
  }
  if (preferredLanguage && preferredLanguage !== 'not recorded') {
    questions.push(`Confirm whether an interpreter is needed for ${preferredLanguage}.`);
  }
  return questions.slice(0, 6);
}

function inferTriageLevel(input: Record<string, unknown>, redFlags: string[]): 'P1' | 'P2' | 'P3' | 'P4' | 'P5' {
  const painLevel = readNumber(input.painLevel) ?? 0;
  const age = readNumber(input.age) ?? 30;
  const arrivalMode = readString(input.arrivalMode).toLowerCase();
  const vitals = readObject(input.vitals);
  const systolic = readBloodPressureSystolic(vitals);
  const spo2 = readNumber(vitals.spo2 ?? vitals.oxygenSaturation);
  const heartRate = readNumber(vitals.heartRate ?? vitals.hr);

  if (redFlags.some((flag) => /loss of consciousness|active bleeding|respiratory|stroke|severe allergic/i.test(flag))) {
    return 'P1';
  }
  if ((systolic !== undefined && systolic < 90) || (spo2 !== undefined && spo2 < 92) || (heartRate !== undefined && heartRate > 130)) {
    return 'P1';
  }
  if (painLevel >= 8 || arrivalMode.includes('ems') || age < 1 || age >= 75 || redFlags.length) {
    return 'P2';
  }
  if (painLevel >= 5 || readNumber(input.currentWaitTime) && Number(input.currentWaitTime) > 60) {
    return 'P3';
  }
  if (readArray(input.symptoms).length === 0 && painLevel <= 1) {
    return 'P5';
  }
  return 'P4';
}

function inferPriority(input: Record<string, unknown>, redFlags: string[]): CareDroidAIResponse['priority'] {
  const triageLevel = readString(input.triageLevel);
  const vitals = readObject(input.vitals);
  const systolic = readBloodPressureSystolic(vitals);
  const spo2 = readNumber(vitals.spo2 ?? vitals.oxygenSaturation);
  const heartRate = readNumber(vitals.heartRate ?? vitals.hr);
  const explicitSeverity = readString(input.severity).toLowerCase();

  if (
    explicitSeverity === 'critical' ||
    triageLevel === 'P1' ||
    redFlags.some((flag) => /loss of consciousness|active bleeding|respiratory|stroke|allergic|trauma|self/i.test(flag)) ||
    (systolic !== undefined && systolic < 90) ||
    (spo2 !== undefined && spo2 < 92) ||
    (heartRate !== undefined && (heartRate > 130 || heartRate < 40))
  ) {
    return 'critical';
  }
  if (explicitSeverity === 'high' || triageLevel === 'P2' || redFlags.length || (systolic !== undefined && systolic > 180)) {
    return 'high';
  }
  if (explicitSeverity === 'medium' || triageLevel === 'P3') return 'medium';
  return 'low';
}

function priorityFromResult(result: HandlerResult): CareDroidAIResponse['priority'] {
  const dataPriority = readString(result.data.priority ?? result.data.severity ?? result.data.operationalRisk ?? result.data.staffingRisk).toLowerCase();
  if (dataPriority === 'critical' || dataPriority === 'red') return 'critical';
  if (dataPriority === 'high' || dataPriority === 'urgent' || dataPriority === 'amber') return 'high';
  if (dataPriority === 'medium' || dataPriority === 'moderate') return 'medium';
  return 'low';
}

function buildThreeMinuteAction(phase: string, acknowledged: boolean, redFlags: string[]): string {
  if (phase === '0:00-0:30') {
    return redFlags.length
      ? 'Capture chief complaint, confirm airway/breathing/circulation risk, and mark critical pending clinician review.'
      : 'Capture chief complaint, vitals, and missing life-critical fields.';
  }
  if (phase === '0:30-1:00') {
    return 'Suggest ESI-style acuity, identify missing life-critical data, and notify nurse/doctor/team lead.';
  }
  if (phase === '1:00-2:00') {
    return 'Confirm routing, allergies, medications, history, vital risks, and next safest protocol step with clinician.';
  }
  return acknowledged
    ? 'Generate handoff summary, update command center, and keep clinician review visible.'
    : 'Escalate unacknowledged critical alert and document responsible owner.';
}

function triageConfidence(redFlags: string[], input: Record<string, unknown>): number {
  const completeness = calculateTriageCompleteness(input);
  const redFlagBoost = redFlags.length ? 0.08 : 0;
  return clampConfidence(0.5 + completeness * 0.32 + redFlagBoost);
}

function calculateTriageCompleteness(input: Record<string, unknown>): number {
  const fields = ['symptoms', 'vitals', 'painLevel', 'age', 'arrivalMode', 'currentWaitTime'];
  const present = fields.filter((fieldName) => !isMissing(input[fieldName])).length;
  return present / fields.length;
}

function inferDepartment(input: Record<string, unknown>): string {
  const haystack = [
    ...readArray(input.symptoms),
    ...readArray(input.medicalHistory),
    ...readArray(input.patientRiskFactors),
    readString(input.triageLevel),
  ]
    .join(' ')
    .toLowerCase();

  const age = readNumber(input.age);
  if (age !== undefined && age < 16) return 'Pediatrics';

  const matched = DEPARTMENT_KEYWORDS.find((entry) =>
    entry.terms.some((term) => haystack.includes(term)),
  );
  return matched?.department || 'Emergency Department';
}

function chooseAvailableDepartment(recommendedDepartment: string, availableDepartments: string[]): string {
  if (!availableDepartments.length) return recommendedDepartment;
  const exact = availableDepartments.find((department) => department.toLowerCase() === recommendedDepartment.toLowerCase());
  if (exact) return exact;
  const emergency = availableDepartments.find((department) => /emergency|ed/i.test(department));
  return emergency || availableDepartments[0];
}

function suggestTests(symptoms: string[], redFlags: string[], department: string): string[] {
  const haystack = `${symptoms.join(' ')} ${redFlags.join(' ')} ${department}`.toLowerCase();
  const tests = new Set<string>();
  if (/chest pain|cardiology|palpitations/.test(haystack)) {
    tests.add('ECG per protocol');
    tests.add('Troponin per clinician order set');
  }
  if (/shortness|dyspnea|respiratory|spo2/.test(haystack)) {
    tests.add('Pulse oximetry reassessment');
    tests.add('Chest imaging if ordered by clinician');
  }
  if (/stroke|slurred|weakness|neurology/.test(haystack)) {
    tests.add('Stroke screen');
    tests.add('Blood glucose check');
  }
  if (/sepsis|fever|hypotension/.test(haystack)) {
    tests.add('Sepsis screening labs per protocol');
  }
  if (!tests.size) tests.add('Review local triage protocol before ordering tests.');
  return [...tests];
}

function inferRequiredResources(department: string, redFlags: string[]): string[] {
  const resources = new Set<string>();
  if (/resuscitation/i.test(department) || redFlags.length) resources.add('Immediate clinician review');
  if (/cardiology/i.test(department)) resources.add('ECG capability');
  if (/respiratory/i.test(department)) resources.add('Oxygen and respiratory support readiness');
  if (/neurology/i.test(department)) resources.add('Stroke pathway readiness');
  if (/pediatrics/i.test(department)) resources.add('Pediatric-trained staff');
  if (!resources.size) resources.add('Standard ED assessment bay');
  return [...resources];
}

function estimateWaitMinutes(input: {
  queueLength: number;
  doctorsOnDuty: number;
  nursesAvailable: number;
  bedsAvailable: number;
  averageTreatmentTime: number;
  criticalCases: number;
  currentCapacity: number;
  triageLevel: string;
}): number {
  const staffFactor = Math.max(1, input.doctorsOnDuty * 1.3 + input.nursesAvailable * 0.45);
  const base = (input.queueLength * input.averageTreatmentTime) / staffFactor;
  const bedPenalty = input.bedsAvailable <= 0 ? 35 : input.bedsAvailable <= 2 ? 15 : 0;
  const capacityPenalty = input.currentCapacity >= 95 ? 35 : input.currentCapacity >= 85 ? 20 : 0;
  const criticalPenalty = input.criticalCases * 8;
  const priorityMultiplier = input.triageLevel === 'P1' ? 0.08 : input.triageLevel === 'P2' ? 0.35 : input.triageLevel === 'P3' ? 0.75 : input.triageLevel === 'P5' ? 1.25 : 1;
  return Math.max(0, Math.round(((base + bedPenalty + capacityPenalty + criticalPenalty) * priorityMultiplier) / 5) * 5);
}

function formatWaitRange(minutes: number): string {
  if (minutes <= 5) return '0-5 minutes';
  const lower = Math.max(0, minutes - 10);
  const upper = minutes + 10;
  return `${lower}-${upper} minutes`;
}

function inferBottleneck(input: {
  doctorsOnDuty: number;
  nursesAvailable: number;
  bedsAvailable: number;
  currentCapacity: number;
  criticalCases: number;
}): string {
  if (input.bedsAvailable <= 0) return 'No available treatment beds';
  if (input.currentCapacity >= 90) return 'High ED occupancy';
  if (input.doctorsOnDuty <= 1) return 'Physician coverage';
  if (input.nursesAvailable <= 1) return 'Nursing coverage';
  if (input.criticalCases >= 3) return 'Critical-case demand';
  return 'No dominant bottleneck detected';
}

function detectRedFlags(input: Record<string, unknown>): string[] {
  const vitals = readObject(input.vitals);
  const text = [
    readString(input.chiefComplaint),
    readString(input.alertText),
    ...readArray(input.symptoms),
    ...readArray(input.medicalHistory),
    ...readArray(input.existingConditions),
    ...readArray(input.triageNotes),
    ...readArray(input.redFlags),
    readString(input.pregnancyStatus),
    readString(input.arrivalMode),
  ]
    .join(' ')
    .toLowerCase();
  const flags: string[] = EMERGENCY_RED_FLAG_TERMS
    .filter(([term]) => text.includes(term))
    .map(([, label]) => label);
  const painLevel = readNumber(input.painLevel);
  if (painLevel !== undefined && painLevel >= 8) flags.push('Severe pain score reported');
  const systolic = readBloodPressureSystolic(vitals);
  const spo2 = readNumber(vitals.spo2 ?? vitals.oxygenSaturation);
  const heartRate = readNumber(vitals.heartRate ?? vitals.hr);
  const respiratoryRate = readNumber(vitals.respiratoryRate ?? vitals.rr);
  const temperature = readNumber(vitals.temperature ?? vitals.temp);
  const diastolic = readNumber(vitals.diastolic ?? vitals.dbp);
  const age = readNumber(input.age);
  const pediatric = Boolean(input.pediatric) || (age !== undefined && age < 16);
  if (systolic !== undefined && systolic < 90) flags.push('Hypotension in submitted vitals');
  if (systolic !== undefined && systolic > 180) flags.push('Extremely high blood pressure in submitted vitals');
  if (diastolic !== undefined && diastolic > 120) flags.push('Extremely high blood pressure in submitted vitals');
  if (spo2 !== undefined && spo2 < 92) flags.push('Low oxygen saturation in submitted vitals');
  if (heartRate !== undefined && heartRate > 130) flags.push('Marked tachycardia in submitted vitals');
  if (heartRate !== undefined && heartRate < 40) flags.push('Marked bradycardia in submitted vitals');
  if (respiratoryRate !== undefined && respiratoryRate > 30) flags.push('High respiratory rate in submitted vitals');
  if (temperature !== undefined && (temperature >= 39 || temperature < 35)) flags.push('Abnormal temperature in submitted vitals');
  if (temperature !== undefined && temperature >= 38 && (heartRate ?? 0) > 100 && (systolic ?? 120) < 100) {
    flags.push('Possible sepsis indicator pattern in submitted vitals');
  }
  if (pediatric && flags.length) flags.push('Pediatric emergency risk context');
  if (/pregnan|labor|vaginal bleeding/.test(text) && (painLevel === undefined || painLevel >= 5 || flags.length)) {
    flags.push('High-risk pregnancy emergency concern');
  }
  return uniqueStrings(flags);
}

function readBloodPressureSystolic(vitals: Record<string, unknown>): number | undefined {
  const direct = readNumber(vitals.systolic ?? vitals.sbp ?? vitals.bloodPressureSystolic);
  if (direct !== undefined) return direct;
  const bloodPressure = readString(vitals.bloodPressure ?? vitals.bp);
  const match = bloodPressure.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  return match ? Number(match[1]) : undefined;
}

function readObject(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

function readArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => readString(item))
      .filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function readString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function sanitizeRecord(input: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth > 3) return {};
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, sanitizeValue(value, depth + 1)]),
  );
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.trim().slice(0, 1000);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitizeValue(item, depth + 1));
  if (isPlainObject(value)) return sanitizeRecord(value, depth);
  return String(value).slice(0, 200);
}

function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}
