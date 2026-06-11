import { PATIENT_JOURNEY_STATE_IDS } from '../data/patientJourneyEngine';

export const INTAKE_WORKFLOW_STAGES = Object.freeze([
  'Patient Arrives',
  'Identity Capture',
  'Demographic Extraction',
  'Verification',
  'Patient Confirmation',
  'Create Intake Record',
]);

export const DOCUMENT_INTELLIGENCE_INPUTS = Object.freeze([
  "driver's license",
  'health card',
  'insurance card',
  'referral letters',
  'discharge papers',
]);

export const DOCUMENT_INTELLIGENCE_PIPELINE = Object.freeze([
  'Capture',
  'OCR',
  'Field Extraction',
  'Validation',
  'Review',
  'Structured Record',
]);

const SUPPORTED_EXTERNAL_DOCUMENTS = Object.freeze([
  'referral letters',
  'clinic notes',
  'discharge summaries',
  'EMS reports',
]);

const REQUIRED_INTAKE_FIELDS = Object.freeze([
  'name',
  'DOB',
  'address',
  'phone',
  'emergency contact',
  'identifiers',
  'insurance metadata',
]);

const GOVERNANCE_REQUIREMENTS = Object.freeze([
  'patient confirmation',
  'consent capture',
  'audit logging',
  'source attribution',
  'correction workflow',
]);

const IMPLEMENTATION_PLAN_LINKS = Object.freeze([
  Object.freeze({
    docPath: 'docs/smart-patient-intake-engine.md',
    capability: 'Smart Intake',
    implementedIn: Object.freeze(['EmergencyIntakeOperatingSystemService.intakeWorkflow', 'intakeRecord', '/workspace/emergency/intake']),
    acceptance: 'Patient intake becomes assisted rather than manual.',
  }),
  Object.freeze({
    docPath: 'docs/document-intelligence-pipeline.md',
    capability: 'Document Intelligence',
    implementedIn: Object.freeze(['DocumentIntelligenceService', 'documentIntelligence.records', '/workspace/emergency/intake']),
    acceptance: 'Documents become structured data.',
  }),
  Object.freeze({
    docPath: 'docs/instant-patient-context.md',
    capability: 'Instant Patient Context',
    implementedIn: Object.freeze(['patientSnapshot', '/workspace/emergency/patient-context']),
    acceptance: 'Clinicians see context in seconds.',
  }),
  Object.freeze({
    docPath: 'docs/medication-reconciliation-assistant.md',
    capability: 'Medication Capture',
    implementedIn: Object.freeze(['medicationSummary', '/workspace/emergency/patient-context']),
    acceptance: 'Medication history collection becomes faster.',
  }),
  Object.freeze({
    docPath: 'docs/allergy-risk-capture.md',
    capability: 'Allergy Capture',
    implementedIn: Object.freeze(['allergyRiskCapture', '/workspace/emergency/triage', '/workspace/emergency/patient-context']),
    acceptance: 'High-risk information surfaces immediately.',
  }),
  Object.freeze({
    docPath: 'docs/emergency-registration-accelerator.md',
    capability: 'Registration Accelerator',
    implementedIn: Object.freeze(['supportedIntakeModes', 'registrationCompletionScore', '/workspace/emergency/intake']),
    acceptance: 'Registration becomes faster and more consistent.',
  }),
  Object.freeze({
    docPath: 'docs/ai-patient-snapshot-generator.md',
    capability: 'AI Patient Snapshot Generator',
    implementedIn: Object.freeze(['patientSnapshot.sections.sourceRecords', '/workspace/emergency/patient-context']),
    acceptance: 'Clinicians understand context quickly.',
  }),
  Object.freeze({
    docPath: 'docs/pre-triage-queue-builder.md',
    capability: 'Pre-Triage Queue',
    implementedIn: Object.freeze(['preTriageQueue', '/workspace/emergency/intake']),
    acceptance: 'Triage staff start with organized information.',
  }),
  Object.freeze({
    docPath: 'docs/emergency-intake-command-center.md',
    capability: 'Emergency Intake Command Center',
    implementedIn: Object.freeze(['commandCenter', '/workspace/emergency/intake']),
    acceptance: 'Registration bottlenecks become visible.',
  }),
  Object.freeze({
    docPath: 'docs/patient-flow-door-to-triage.md',
    capability: 'Door-to-Triage Flow',
    implementedIn: Object.freeze(['doorToTriage', '/workspace/emergency/intake-analytics']),
    acceptance: 'Door-to-Triage becomes measurable and optimizable.',
  }),
  Object.freeze({
    docPath: 'docs/consent-and-verification-framework.md',
    capability: 'Consent and Verification',
    implementedIn: Object.freeze(['governance.artifacts', 'intakeRecord', '/workspace/emergency/intake']),
    acceptance: 'Automation remains governance-ready.',
  }),
  Object.freeze({
    docPath: 'docs/emergency-identity-resolution-layer.md',
    capability: 'Identity Resolution',
    implementedIn: Object.freeze(['identityResolution', '/workspace/emergency/patient-context']),
    acceptance: 'Duplicate record risk is reduced.',
  }),
  Object.freeze({
    docPath: 'docs/referral-document-ingestion.md',
    capability: 'Referral Document Ingestion',
    implementedIn: Object.freeze(['referralDocumentIngestion', 'DocumentIntelligenceService', '/workspace/emergency/intake']),
    acceptance: 'External information becomes searchable.',
  }),
  Object.freeze({
    docPath: 'docs/patient-intake-analytics.md',
    capability: 'Patient Intake Analytics',
    implementedIn: Object.freeze(['analytics', '/workspace/emergency/intake-analytics']),
    acceptance: 'Operational improvements become measurable.',
  }),
  Object.freeze({
    docPath: 'docs/voice-assisted-intake.md',
    capability: 'Voice Assisted Intake',
    implementedIn: Object.freeze(['voiceIntake', '/workspace/emergency/intake']),
    acceptance: 'Accessibility improves.',
  }),
  Object.freeze({
    docPath: 'docs/emergency-intake-automation-marketplace.md',
    capability: 'Intake Automation Marketplace',
    implementedIn: Object.freeze(['marketplace', 'patientJourneyFeed', '/workspace/emergency/intake']),
    acceptance: 'Intake becomes a sellable product category.',
  }),
  Object.freeze({
    docPath: 'docs/emergency-flow-intelligence-integration.md',
    capability: 'Emergency Flow Intelligence Integration',
    implementedIn: Object.freeze(['integrationFlow', 'patientJourneyFeed', 'EmergencyOperatingSystemService.intakeOperatingSystem']),
    acceptance: 'Intake is fully integrated into Emergency Department OS.',
  }),
  Object.freeze({
    docPath: 'docs/first-five-minute-experience.md',
    capability: 'First Five Minute Experience',
    implementedIn: Object.freeze(['firstFiveMinuteExperience', '/workspace/emergency/intake-analytics']),
    acceptance: 'CareDroid demonstrates measurable reduction in administrative delay.',
  }),
  Object.freeze({
    docPath: 'docs/emergency-intake-operating-system.md',
    capability: 'Emergency Intake Operating System',
    implementedIn: Object.freeze(['EmergencyIntakeOperatingSystemService', 'WorkspaceDataPipelineService.emergency.intakeOperatingSystem']),
    acceptance: 'Emergency Intake becomes a complete operational product that feeds the Emergency Department Operating System.',
  }),
]);

const BASE_REVIEW_CONTROLS = Object.freeze([
  'patient confirmation',
  'source attribution',
  'audit logging',
  'correction workflow',
]);

const DEMO_PATIENTS = Object.freeze([
  Object.freeze({
    patientId: 'INTAKE-001',
    displayName: 'Jordan Lee',
    age: 54,
    arrivalMode: 'Walk-in',
    intakeMode: 'QR code intake',
    complaint: 'Chest Pain',
    arrivalMinutesAgo: 4,
    registrationMinutes: 3,
    verificationMinutes: 2,
    triageReadyMinutes: 6,
    identityCaptured: true,
    demographicsCaptured: true,
    documentsProcessed: 2,
    contextGenerated: true,
    triageReady: true,
    pendingVerification: false,
    pendingIntakeReview: false,
    riskIndicators: ['Penicillin allergy', 'Warfarin reported'],
    missingFields: [],
    sourceState: 'confirmed intake record + insurance card OCR',
  }),
  Object.freeze({
    patientId: 'INTAKE-002',
    displayName: 'Maya Patel',
    age: 31,
    arrivalMode: 'Referral',
    intakeMode: 'Tablet intake',
    complaint: 'Shortness of Breath',
    arrivalMinutesAgo: 8,
    registrationMinutes: 6,
    verificationMinutes: 5,
    triageReadyMinutes: 11,
    identityCaptured: true,
    demographicsCaptured: true,
    documentsProcessed: 1,
    contextGenerated: true,
    triageReady: false,
    pendingVerification: true,
    pendingIntakeReview: true,
    riskIndicators: ['Pregnancy status pending', 'Asthma history'],
    missingFields: ['emergency contact', 'insurance group'],
    sourceState: 'tablet intake + referral letter',
  }),
  Object.freeze({
    patientId: 'INTAKE-003',
    displayName: 'Samuel Ortiz',
    age: 68,
    arrivalMode: 'EMS',
    intakeMode: 'Receptionist-assisted intake',
    complaint: 'Fall on anticoagulant',
    arrivalMinutesAgo: 12,
    registrationMinutes: 9,
    verificationMinutes: 7,
    triageReadyMinutes: 14,
    identityCaptured: true,
    demographicsCaptured: false,
    documentsProcessed: 3,
    contextGenerated: true,
    triageReady: true,
    pendingVerification: true,
    pendingIntakeReview: false,
    riskIndicators: ['Apixaban', 'Diabetes', 'Prior discharge summary available'],
    missingFields: ['phone'],
    sourceState: 'EMS report + health card + discharge summary',
  }),
  Object.freeze({
    patientId: 'INTAKE-004',
    displayName: 'Avery Chen',
    age: 42,
    arrivalMode: 'Walk-in',
    intakeMode: 'Self-service kiosk',
    complaint: 'Abdominal Pain',
    arrivalMinutesAgo: 3,
    registrationMinutes: 2,
    verificationMinutes: 1,
    triageReadyMinutes: 5,
    identityCaptured: true,
    demographicsCaptured: true,
    documentsProcessed: 1,
    contextGenerated: false,
    triageReady: false,
    pendingVerification: false,
    pendingIntakeReview: true,
    riskIndicators: ['Allergy review incomplete'],
    missingFields: ['allergy confirmation'],
    sourceState: 'kiosk intake + driver license capture',
  }),
]);

const INTAKE_AUTOMATION_MODULES = Object.freeze([
  Object.freeze({
    moduleId: 'smart-intake',
    title: 'Smart Intake',
    description: 'Assisted identity, demographic, contact, identifier, and insurance capture.',
    tierAvailability: Object.freeze({ core: 'Included', pro: 'Included', enterprise: 'Included' }),
    route: '/workspace/emergency/intake',
    journeyStages: Object.freeze(['arrival', 'registration']),
    reviewControls: BASE_REVIEW_CONTROLS,
    usageMetric: 'registration completion score',
  }),
  Object.freeze({
    moduleId: 'ocr-intake',
    title: 'OCR Intake',
    description: 'Document capture, OCR, extraction, validation, review, and structured records.',
    tierAvailability: Object.freeze({ core: 'Limited', pro: 'Included', enterprise: 'Included' }),
    route: '/workspace/emergency/intake',
    journeyStages: Object.freeze(['registration']),
    reviewControls: BASE_REVIEW_CONTROLS,
    usageMetric: 'document processing volume',
  }),
  Object.freeze({
    moduleId: 'identity-resolution',
    title: 'Identity Resolution',
    description: 'Candidate patient matching with Confidence Score and review for uncertain matches.',
    tierAvailability: Object.freeze({ core: 'Basic', pro: 'Included', enterprise: 'Advanced' }),
    route: '/workspace/emergency/intake',
    journeyStages: Object.freeze(['arrival', 'registration']),
    reviewControls: Object.freeze([...BASE_REVIEW_CONTROLS, 'uncertain match review']),
    usageMetric: 'duplicate risk reduction',
  }),
  Object.freeze({
    moduleId: 'patient-snapshot',
    title: 'Patient Snapshot',
    description: 'Concise, source-cited patient summary generated immediately after intake.',
    tierAvailability: Object.freeze({ core: 'Basic', pro: 'Included', enterprise: 'Advanced' }),
    route: '/workspace/emergency/patient-context',
    journeyStages: Object.freeze(['registration', 'triage', 'assessment']),
    reviewControls: Object.freeze([...BASE_REVIEW_CONTROLS, 'clinician review']),
    usageMetric: 'context generated in seconds',
  }),
  Object.freeze({
    moduleId: 'medication-capture',
    title: 'Medication Capture',
    description: 'Medication Summary from patient report, prior records, and pharmacy integrations when available.',
    tierAvailability: Object.freeze({ core: 'Limited', pro: 'Included', enterprise: 'Advanced' }),
    route: '/workspace/emergency/patient-context',
    journeyStages: Object.freeze(['registration', 'triage']),
    reviewControls: Object.freeze([...BASE_REVIEW_CONTROLS, 'medication verification']),
    usageMetric: 'medication history collection time',
  }),
  Object.freeze({
    moduleId: 'allergy-capture',
    title: 'Allergy Capture',
    description: 'Early allergies, adverse reactions, anticoagulants, pregnancy status, and chronic condition capture.',
    tierAvailability: Object.freeze({ core: 'Included', pro: 'Included', enterprise: 'Included' }),
    route: '/workspace/emergency/patient-context',
    journeyStages: Object.freeze(['registration', 'triage']),
    reviewControls: Object.freeze([...BASE_REVIEW_CONTROLS, 'risk confirmation']),
    usageMetric: 'critical risk information surfaced',
  }),
  Object.freeze({
    moduleId: 'voice-intake',
    title: 'Voice Intake',
    description: 'Conversational intake that converts speech into structured intake fields.',
    tierAvailability: Object.freeze({ core: 'Not included', pro: 'Add-on', enterprise: 'Included' }),
    route: '/workspace/emergency/intake',
    journeyStages: Object.freeze(['arrival', 'registration']),
    reviewControls: Object.freeze([...BASE_REVIEW_CONTROLS, 'transcript correction']),
    usageMetric: 'accessible intake sessions',
  }),
  Object.freeze({
    moduleId: 'multi-language-intake',
    title: 'Multi-Language Intake',
    description: 'Multi-language assisted intake paths for registration and verification.',
    tierAvailability: Object.freeze({ core: 'Not included', pro: 'Add-on', enterprise: 'Included' }),
    route: '/workspace/emergency/intake',
    journeyStages: Object.freeze(['arrival', 'registration']),
    reviewControls: BASE_REVIEW_CONTROLS,
    usageMetric: 'language-supported intake sessions',
  }),
]);

const INTAKE_JOURNEY_AUTOMATIONS = Object.freeze([
  ...INTAKE_AUTOMATION_MODULES,
  Object.freeze({
    moduleId: 'consent-verification',
    title: 'Consent and Verification',
    description: 'Patient confirmation, consent capture, audit logging, source attribution, and correction workflow.',
    tierAvailability: Object.freeze({ core: 'Included', pro: 'Included', enterprise: 'Included' }),
    route: '/workspace/emergency/intake',
    journeyStages: Object.freeze(['registration']),
    reviewControls: Object.freeze([...BASE_REVIEW_CONTROLS, 'consent capture']),
    usageMetric: 'verified intake fields',
  }),
  Object.freeze({
    moduleId: 'pre-triage-queue',
    title: 'Pre-Triage Queue',
    description: 'Structured queue from intake, demographics, complaint, and risk indicators with no autonomous triage decisions.',
    tierAvailability: Object.freeze({ core: 'Included', pro: 'Included', enterprise: 'Included' }),
    route: '/workspace/emergency/triage',
    journeyStages: Object.freeze(['triage']),
    reviewControls: Object.freeze([...BASE_REVIEW_CONTROLS, 'triage staff review']),
    usageMetric: 'triage-ready queue entries',
  }),
  Object.freeze({
    moduleId: 'intake-analytics',
    title: 'Intake Analytics',
    description: 'Operational analytics for registration time, verification time, completion rate, document volume, and triage readiness.',
    tierAvailability: Object.freeze({ core: 'Included', pro: 'Included', enterprise: 'Included' }),
    route: '/workspace/emergency/intake-analytics',
    journeyStages: Object.freeze(['arrival', 'registration', 'triage']),
    reviewControls: BASE_REVIEW_CONTROLS,
    usageMetric: 'intake operational improvement metrics',
  }),
]);

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function ensureValidJourneyStages(module) {
  return module.journeyStages.every((stateId) => PATIENT_JOURNEY_STATE_IDS.includes(stateId));
}

function buildDocumentFields(documentType) {
  const normalized = String(documentType || '').toLowerCase();
  if (normalized.includes('insurance')) {
    return [
      { field: 'payerName', value: 'CarePlus Health', confidence: 0.94, validationStatus: 'valid', reviewStatus: 'accepted' },
      { field: 'memberId', value: 'CP-442190', confidence: 0.91, validationStatus: 'valid', reviewStatus: 'accepted' },
      { field: 'groupId', value: 'GRP-88A', confidence: 0.79, validationStatus: 'needs review', reviewStatus: 'pending review' },
    ];
  }
  if (normalized.includes('referral') || normalized.includes('clinic') || normalized.includes('ems')) {
    return [
      { field: 'diagnoses', value: 'Chest pain under evaluation', confidence: 0.86, validationStatus: 'review required', reviewStatus: 'pending review' },
      { field: 'medications', value: 'Aspirin reported', confidence: 0.82, validationStatus: 'review required', reviewStatus: 'pending review' },
      { field: 'allergies', value: 'Penicillin allergy mentioned', confidence: 0.8, validationStatus: 'review required', reviewStatus: 'pending review' },
      { field: 'recommendations', value: 'ED assessment recommended', confidence: 0.88, validationStatus: 'review required', reviewStatus: 'pending review' },
    ];
  }
  if (normalized.includes('discharge')) {
    return [
      { field: 'diagnoses', value: 'Hypertension and chest pain follow-up', confidence: 0.85, validationStatus: 'review required', reviewStatus: 'pending review' },
      { field: 'medications', value: 'Warfarin listed on discharge medication section', confidence: 0.81, validationStatus: 'review required', reviewStatus: 'pending review' },
      { field: 'allergies', value: 'Penicillin allergy listed', confidence: 0.84, validationStatus: 'review required', reviewStatus: 'pending review' },
      { field: 'recommendations', value: 'Follow up with primary care', confidence: 0.86, validationStatus: 'review required', reviewStatus: 'pending review' },
      { field: 'recentEncounter', value: 'Discharged from medical unit 14 days ago', confidence: 0.9, validationStatus: 'valid', reviewStatus: 'accepted' },
      { field: 'followUpInstructions', value: 'Follow up with primary care', confidence: 0.84, validationStatus: 'review required', reviewStatus: 'pending review' },
    ];
  }
  return [
    { field: 'name', value: 'Jordan Lee', confidence: 0.96, validationStatus: 'valid', reviewStatus: 'accepted' },
    { field: 'DOB', value: '1971-04-12', confidence: 0.93, validationStatus: 'valid', reviewStatus: 'accepted' },
    { field: 'identifier', value: 'DL-REVIEW-4432', confidence: 0.81, validationStatus: 'needs review', reviewStatus: 'pending review' },
  ];
}

function normalizeDocumentType(input = {}) {
  const rawType = String(input.documentType || input.type || input.name || "driver's license").toLowerCase();
  if (rawType.includes('health')) return 'health card';
  if (rawType.includes('insurance')) return 'insurance card';
  if (rawType.includes('referral')) return 'referral letters';
  if (rawType.includes('clinic')) return 'clinic notes';
  if (rawType.includes('ems')) return 'EMS reports';
  if (rawType.includes('discharge summar')) return 'discharge summaries';
  if (rawType.includes('discharge')) return 'discharge papers';
  return "driver's license";
}

function buildRegistrationScore() {
  const fieldCompletionWeights = [
    { field: 'requiredDemographics', complete: true, weight: 20 },
    { field: 'identityConfirmed', complete: true, weight: 20 },
    { field: 'contactInformation', complete: true, weight: 15 },
    { field: 'emergencyContact', complete: false, weight: 10 },
    { field: 'insuranceMetadata', complete: true, weight: 15 },
    { field: 'administrativeForms', complete: true, weight: 10 },
    { field: 'unresolvedConflicts', complete: false, weight: -5 },
  ];
  const score = Math.max(
    0,
    fieldCompletionWeights.reduce((sum, item) => sum + (item.complete ? item.weight : 0), 0)
  );

  return Object.freeze({
    label: 'Registration Completion Score',
    score,
    status: score >= 85 ? 'near complete' : 'needs follow-up',
    fieldCompletion: Object.freeze(fieldCompletionWeights),
    missingFields: Object.freeze(['emergency contact']),
    conflictingFields: Object.freeze(['insurance group ID requires review']),
    sourceState: 'Field-level confirmation and source metadata preserved.',
  });
}

function buildIntakeRecord() {
  return Object.freeze({
    title: 'Create Intake Record',
    promotionRule: 'Only confirmed values are promoted into the intake record.',
    confirmationStatus: 'patient or staff confirmed',
    fieldProposals: Object.freeze([
      { field: 'name', proposedValue: 'Jordan Lee', source: "driver's license OCR", editable: true, confirmationState: 'confirmed', conflict: false, missing: false },
      { field: 'DOB', proposedValue: '1971-04-12', source: "driver's license OCR", editable: true, confirmationState: 'confirmed', conflict: false, missing: false },
      { field: 'address', proposedValue: 'confirmed address on file', source: 'QR code intake', editable: true, confirmationState: 'confirmed', conflict: false, missing: false },
      { field: 'phone', proposedValue: 'confirmed phone on file', source: 'patient-entered intake', editable: true, confirmationState: 'confirmed', conflict: false, missing: false },
      { field: 'emergency contact', proposedValue: '', source: 'tablet intake', editable: true, confirmationState: 'missing', conflict: false, missing: true },
      { field: 'identifiers', proposedValue: 'MRN and document reference retained', source: 'identity resolution review', editable: true, confirmationState: 'confirmed', conflict: false, missing: false },
      { field: 'insurance metadata', proposedValue: 'payer and member ID accepted; group ID pending', source: 'insurance card OCR', editable: true, confirmationState: 'partial review', conflict: true, missing: false },
    ]),
    confirmedFields: Object.freeze([
      { field: 'name', value: 'Jordan Lee', source: 'confirmed intake record', confirmedBy: 'patient', confirmedAt: 'frontend-runtime' },
      { field: 'DOB', value: '1971-04-12', source: "driver's license OCR", confirmedBy: 'registration staff', confirmedAt: 'frontend-runtime' },
      { field: 'address', value: 'confirmed address on file', source: 'QR code intake', confirmedBy: 'patient', confirmedAt: 'frontend-runtime' },
      { field: 'phone', value: 'confirmed phone on file', source: 'patient-entered intake', confirmedBy: 'patient', confirmedAt: 'frontend-runtime' },
      { field: 'identifiers', value: 'MRN and document reference retained', source: 'identity resolution review', confirmedBy: 'registration staff', confirmedAt: 'frontend-runtime' },
      { field: 'insurance metadata', value: 'payer and member ID accepted', source: 'insurance card OCR', confirmedBy: 'registration staff', confirmedAt: 'frontend-runtime' },
    ]),
    draftSuggestions: Object.freeze([
      { field: 'emergency contact', value: 'pending for some patients', source: 'tablet intake', reason: 'missing required value; not promoted until confirmed' },
      { field: 'insurance group ID', value: 'GRP-88A', source: 'insurance card OCR', reason: 'needs review before promotion' },
      { field: 'allergy confirmation', value: 'review incomplete', source: 'kiosk intake', reason: 'requires patient or staff confirmation' },
    ]),
    attribution: 'field-level source, reviewer, and confirmation timestamp retained',
  });
}

function buildGovernanceArtifacts() {
  return Object.freeze({
    patientConfirmation: Object.freeze({
      required: true,
      records: Object.freeze([
        {
          field: 'name',
          confirmedBy: 'patient',
          confirmationActorType: 'patient',
          confirmationChannel: 'QR code intake',
          confirmedAt: 'frontend-runtime',
          disputed: false,
          corrected: false,
          declinedToAnswer: false,
        },
        {
          field: 'insurance group ID',
          confirmedBy: 'registration staff',
          confirmationActorType: 'staff',
          confirmationChannel: 'document review',
          confirmedAt: null,
          disputed: true,
          corrected: true,
          declinedToAnswer: false,
        },
      ]),
    }),
    consentCapture: Object.freeze({
      required: true,
      records: Object.freeze([
        {
          consentType: 'document processing',
          status: 'captured',
          consentTextVersion: 'intake-document-processing-v1',
          policyVersion: 'intake-governance-v1',
          capturedBy: 'tablet intake',
          channel: 'tablet intake',
          timestamp: 'frontend-runtime',
          revocationOrCorrectionState: 'active',
        },
        {
          consentType: 'administrative communications',
          status: 'captured',
          consentTextVersion: 'administrative-communications-v1',
          policyVersion: 'intake-governance-v1',
          capturedBy: 'QR code intake',
          channel: 'QR code intake',
          timestamp: 'frontend-runtime',
          revocationOrCorrectionState: 'active',
        },
      ]),
    }),
    auditLog: Object.freeze([
      {
        event: 'field extracted',
        field: 'DOB',
        source: "driver's license OCR",
        suggestedValue: '1971-04-12',
        validationResult: 'valid',
        reviewerAction: 'accepted',
        confirmedValue: '1971-04-12',
        correctionAction: null,
        actor: 'DocumentIntelligenceService',
        timestamp: 'frontend-runtime',
      },
      {
        event: 'review action',
        field: 'insurance group ID',
        source: 'insurance card OCR',
        suggestedValue: 'GRP-88A',
        validationResult: 'needs review',
        reviewerAction: 'held for follow-up',
        confirmedValue: null,
        correctionAction: 'preserve as draft suggestion',
        actor: 'registration staff',
        timestamp: 'frontend-runtime',
      },
      {
        event: 'correction action',
        field: 'emergency contact',
        source: 'patient correction',
        suggestedValue: '',
        validationResult: 'missing required value',
        reviewerAction: 'requested patient correction',
        confirmedValue: null,
        correctionAction: 'record patient-requested correction and reconfirm',
        actor: 'registration staff',
        timestamp: 'frontend-runtime',
      },
    ]),
    sourceAttribution: Object.freeze([
      'patient-entered forms',
      'scanned documents',
      'OCR output',
      'prior records',
      'integration payloads',
      'kiosk entry',
      'tablet intake',
      'QR code intake',
      'staff correction',
    ]),
    correctionWorkflow: Object.freeze([
      'edit inaccurate extracted values',
      'mark values as rejected',
      'resolve conflicting source values',
      'record patient-requested corrections',
      'reconfirm corrected fields',
      'preserve original source and correction history',
    ]),
  });
}

function buildCommandCenter() {
  const arrivals = DEMO_PATIENTS.length;
  const registrationsStarted = DEMO_PATIENTS.filter((patient) => patient.identityCaptured).length;
  const registrationsCompleted = DEMO_PATIENTS.filter((patient) => !patient.pendingVerification && !patient.pendingIntakeReview).length;
  const pendingVerification = DEMO_PATIENTS.filter((patient) => patient.pendingVerification).length;
  const pendingIntakeReview = DEMO_PATIENTS.filter((patient) => patient.pendingIntakeReview).length;
  const triageReadyPatients = DEMO_PATIENTS.filter((patient) => patient.triageReady).length;

  return Object.freeze({
    route: '/workspace/emergency/intake',
    title: 'Emergency Intake Command Center',
    operationalView: Object.freeze({
      totalArrivals: arrivals,
      registrationsStarted,
      registrationsCompleted,
      pendingIdentityOrDemographicVerification: pendingVerification,
      pendingIntakeReview,
      triageReadyPatients,
      intakeModes: Object.freeze([...new Set(DEMO_PATIENTS.map((patient) => patient.intakeMode))]),
    }),
    trackedStates: Object.freeze([
      { id: 'arrivals', label: 'Arrivals', value: arrivals },
      { id: 'registrations', label: 'Registrations', value: registrationsStarted },
      { id: 'pending-verification', label: 'Pending verification', value: pendingVerification },
      { id: 'pending-intake-review', label: 'Pending intake review', value: pendingIntakeReview },
      { id: 'triage-ready-patients', label: 'Triage-ready patients', value: triageReadyPatients },
    ]),
    intakeModes: Object.freeze([...new Set(DEMO_PATIENTS.map((patient) => patient.intakeMode))]),
    staleItems: Object.freeze(
      DEMO_PATIENTS.filter((patient) => patient.arrivalMinutesAgo >= 8 || patient.pendingVerification).map((patient) =>
        Object.freeze({
          patientId: patient.patientId,
          label: patient.displayName,
          delayedState: patient.pendingVerification ? 'pending verification' : 'pending intake review',
          ageMinutes: patient.arrivalMinutesAgo,
          intakeMode: patient.intakeMode,
        })
      )
    ),
    bottleneckSignals: Object.freeze([
      { id: 'verification-aging', label: 'Verification aging', value: `${pendingVerification} patients`, severity: pendingVerification ? 'medium' : 'low' },
      { id: 'intake-review-aging', label: 'Pending intake review', value: `${pendingIntakeReview} patients`, severity: pendingIntakeReview ? 'medium' : 'low' },
      { id: 'completion-rate', label: 'Intake completion rate', value: `${percent(registrationsCompleted, arrivals)}%`, severity: 'medium' },
      { id: 'missing-fields', label: 'Missing or unconfirmed fields', value: `${DEMO_PATIENTS.flatMap((patient) => patient.missingFields).length} fields`, severity: 'medium' },
    ]),
  });
}

function buildPatientSnapshot() {
  return Object.freeze({
    route: '/workspace/emergency/patient-context',
    title: 'Patient Snapshot',
    generatedAt: 'frontend-runtime',
    generatedWithinSeconds: 8,
    clinicianReviewStatus: 'review required',
    identityAnchor: 'confirmed intake record',
    sections: Object.freeze([
      {
        id: 'who',
        question: 'Who is this patient?',
        answer: 'Jordan Lee, 54, confirmed intake identity with QR intake and insurance card OCR.',
        sourceRecords: Object.freeze(['confirmed-intake-record', 'insurance-card-ocr']),
      },
      {
        id: 'why',
        question: 'Why are they here?',
        answer: 'Chief complaint captured as Chest Pain during assisted intake.',
        sourceRecords: Object.freeze(['patient-reported-intake']),
      },
      {
        id: 'history',
        question: 'Key history?',
        answer: 'Prior ED visit for chest discomfort and active hypertension are available for clinician review.',
        sourceRecords: Object.freeze(['prior-encounter-summary', 'problem-list']),
      },
      {
        id: 'medications',
        question: 'Key medications?',
        answer: 'Warfarin is patient-reported and requires medication verification.',
        sourceRecords: Object.freeze(['patient-report', 'prior-medication-record']),
      },
      {
        id: 'allergies',
        question: 'Key allergies?',
        answer: 'Penicillin allergy is confirmed; adverse reaction noted as rash.',
        sourceRecords: Object.freeze(['confirmed-allergy-record']),
      },
      {
        id: 'recent-encounters',
        question: 'Recent encounters?',
        answer: 'Discharge summary from 14 days ago is searchable with source reference.',
        sourceRecords: Object.freeze(['discharge-summary-doc-142']),
      },
    ]),
    context: Object.freeze({
      demographics: 'Confirmed name, DOB, phone, and address available.',
      allergies: Object.freeze(['Penicillin - rash - confirmed']),
      medications: Object.freeze(['Warfarin - patient reported - verification required']),
      priorVisits: Object.freeze(['ED visit 2026-05-30 for chest discomfort']),
      activeConditions: Object.freeze(['Hypertension', 'Anticoagulant use']),
      recentEncounters: Object.freeze(['Discharge summary 2026-05-27']),
    }),
    freshnessIndicators: Object.freeze([
      { context: 'demographics', freshness: 'confirmed during current intake', source: 'confirmed intake record' },
      { context: 'allergies', freshness: 'current record', source: 'confirmed-allergy-record' },
      { context: 'medications', freshness: 'stale until pharmacy connection or bedside verification', source: 'patient report + prior medication record' },
      { context: 'recent encounters', freshness: '14 days old', source: 'discharge-summary-doc-142' },
    ]),
    missingContext: Object.freeze(['pharmacy integration not connected', 'emergency contact pending for one queued patient']),
    safetyStatement:
      'Patient Snapshot summarizes source-cited context for clinician review and does not diagnose, triage, reconcile medications, or change records autonomously.',
  });
}

function buildMedicationSummary() {
  return Object.freeze({
    title: 'Medication Summary',
    inputs: Object.freeze(['patient report', 'prior records', 'pharmacy integrations if available']),
    entries: Object.freeze([
      { name: 'Warfarin', dose: '5 mg', route: 'oral', frequency: 'daily', lastTaken: 'unknown', source: 'patient report', confidence: 0.76, verificationStatus: 'requires verification', uncertainty: 'reported anticoagulant' },
      { name: 'Aspirin', dose: '81 mg', route: 'oral', frequency: 'daily', lastTaken: 'yesterday per prior record', source: 'prior records', confidence: 0.72, verificationStatus: 'requires verification', uncertainty: 'possible duplicate therapy review' },
      { name: 'Atorvastatin', dose: '', route: 'oral', frequency: 'unknown', lastTaken: 'unknown', source: 'prior records', confidence: 0.55, verificationStatus: 'incomplete', uncertainty: 'missing dose' },
    ]),
    flags: Object.freeze({
      duplicates: Object.freeze(['possible duplicate anticoagulant/antiplatelet risk review']),
      missingInformation: Object.freeze(['Atorvastatin dose', 'last taken time']),
      uncertainEntries: Object.freeze(['Warfarin patient-reported without pharmacy integration']),
    }),
    verificationRequired: true,
    reviewWorkflow: Object.freeze([
      'compare patient report against prior records',
      'highlight pharmacy-sourced entries when available',
      'merge confirmed duplicates',
      'correct incomplete medication details',
      'mark uncertain entries for follow-up',
      'confirm reviewed medications into the Medication Summary',
    ]),
  });
}

function buildAllergyRiskCapture() {
  return Object.freeze({
    title: 'Allergy and Risk Capture',
    triageDisplay: 'prominent',
    captureSources: Object.freeze(['patient or caregiver report', 'intake forms', 'prior records', 'medication history review', 'clinical staff review']),
    collected: Object.freeze([
      { type: 'allergy', label: 'Penicillin', status: 'confirmed', source: 'allergy record' },
      { type: 'adverse reaction', label: 'Rash', status: 'confirmed', source: 'patient confirmation' },
      { type: 'anticoagulant', label: 'Warfarin reported', status: 'pending medication verification', source: 'patient report' },
      { type: 'pregnancy status', label: 'Not applicable or pending by policy', status: 'review required', source: 'intake question' },
      { type: 'major chronic condition', label: 'Hypertension', status: 'confirmed', source: 'problem list' },
    ]),
    unresolvedItems: Object.freeze(['pregnancy status requires policy-appropriate confirmation', 'allergy confirmation incomplete for INTAKE-004']),
    confirmationRequired: true,
  });
}

function buildIdentityResolution() {
  return Object.freeze({
    title: 'Emergency Identity Resolution Layer',
    matchInputs: Object.freeze(['identifiers', 'demographics', 'verified documents']),
    candidateMatches: Object.freeze([
      {
        candidateRecordId: 'MRN-204421',
        displayName: 'Jordan Lee',
        confidenceScore: 82,
        matchedFields: Object.freeze(['date of birth', 'phone', 'insurance member identifier']),
        conflictingFields: Object.freeze(['address differs from prior visit']),
        sourceSignals: Object.freeze(['verified driver license', 'insurance card OCR', 'prior encounter demographics']),
        reviewStatus: 'uncertain match requires review',
      },
      {
        candidateRecordId: 'MRN-104219',
        displayName: 'J. Lee',
        confidenceScore: 61,
        matchedFields: Object.freeze(['similar name', 'partial phone']),
        conflictingFields: Object.freeze(['date of birth mismatch']),
        sourceSignals: Object.freeze(['prior visit demographics']),
        reviewStatus: 'reject or merge review pending',
      },
    ]),
    confidenceScore: Object.freeze({
      label: 'Confidence Score',
      value: 82,
      status: 'uncertain match requires review',
      factors: Object.freeze(['partial identifier match', 'demographic similarity', 'verified document agreement']),
    }),
    uncertainMatchesRequireReview: true,
    resolutionWorkflow: Object.freeze([
      'search existing patient records during intake',
      'compare candidate records side by side',
      'show matched and conflicting fields',
      'display source documents and confirmation status',
      'explain the Confidence Score in plain language',
      'record staff resolution decisions',
      'preserve audit trail of match suggestions and outcomes',
    ]),
    duplicateRiskSignals: Object.freeze(['multiple candidate records with similar demographics', 'insurance member ID conflict']),
    auditTrail: Object.freeze([
      { event: 'match suggested', candidateRecordId: 'MRN-204421', actor: 'Emergency Identity Resolution Layer', timestamp: 'frontend-runtime' },
      { event: 'staff review required', candidateRecordId: 'MRN-204421', actor: 'registration staff', timestamp: null },
    ]),
    auditState: 'match suggestions and staff resolution decisions are auditable',
  });
}

function buildPreTriageQueue() {
  return Object.freeze({
    title: 'Pre-Triage Queue',
    decisionBoundary: 'No autonomous triage decisions.',
    inputs: Object.freeze(['intake', 'demographics', 'complaint', 'risk indicators']),
    patients: Object.freeze(
      DEMO_PATIENTS.map((patient) =>
        Object.freeze({
          patientId: patient.patientId,
          displayName: patient.displayName,
          demographicSummary: `${patient.age} · ${patient.arrivalMode}`,
          queuePosition: DEMO_PATIENTS.indexOf(patient) + 1,
          arrivalOrIntakeTimestamp: `${patient.arrivalMinutesAgo} min ago`,
          complaint: patient.complaint,
          intakeMode: patient.intakeMode,
          riskIndicators: Object.freeze(patient.riskIndicators),
          missingOrUnconfirmedFields: Object.freeze(patient.missingFields),
          confirmationStatus: patient.pendingVerification ? 'verification pending' : 'confirmed or reviewed',
          sourceState: patient.sourceState,
          reviewable: true,
        })
      )
    ),
  });
}

function buildAnalytics() {
  const total = DEMO_PATIENTS.length;
  return Object.freeze({
    route: '/workspace/emergency/intake-analytics',
    title: 'Patient Intake Analytics',
    metrics: Object.freeze([
      { id: 'average-registration-time', label: 'Average registration time', value: average(DEMO_PATIENTS.map((patient) => patient.registrationMinutes)), unit: 'min' },
      { id: 'average-verification-time', label: 'Average verification time', value: average(DEMO_PATIENTS.map((patient) => patient.verificationMinutes)), unit: 'min' },
      { id: 'intake-completion-rate', label: 'Intake completion rate', value: percent(DEMO_PATIENTS.filter((patient) => !patient.pendingIntakeReview).length, total), unit: '%' },
      { id: 'document-processing-volume', label: 'Document processing volume', value: DEMO_PATIENTS.reduce((sum, patient) => sum + patient.documentsProcessed, 0), unit: 'docs' },
      { id: 'triage-readiness-time', label: 'Triage readiness time', value: average(DEMO_PATIENTS.map((patient) => patient.triageReadyMinutes)), unit: 'min' },
    ]),
    metricDefinitions: Object.freeze({
      averageRegistrationTime: 'Time from registration start to registration completion.',
      averageVerificationTime: 'Time from verification start to verification completion for identity, demographic, document, or intake field review.',
      intakeCompletionRate: 'Started intake workflows that reach completion with required fields resolved or marked for follow-up.',
      documentProcessingVolume: 'Patient-provided or external documents captured, OCR-processed, extracted, validated, or reviewed.',
      triageReadinessTime: 'Time from patient arrival or intake start to triage queue readiness.',
    }),
    operationalViews: Object.freeze(['current day performance', 'active shift performance', 'trend views', 'intake mode comparison', 'bottlenecks', 'document throughput', 'triage readiness delays', 'completion rate by workflow stage']),
    trends: Object.freeze([
      { metricId: 'average-registration-time', direction: 'improving', comparison: '2 min faster than prior demo shift' },
      { metricId: 'document-processing-volume', direction: 'increasing', comparison: '7 documents processed in active window' },
    ]),
    intakeModeComparison: Object.freeze(
      ['QR code intake', 'Tablet intake', 'Receptionist-assisted intake', 'Self-service kiosk'].map((mode) =>
        Object.freeze({
          mode,
          patients: DEMO_PATIENTS.filter((patient) => patient.intakeMode === mode).length,
          completionRate: percent(DEMO_PATIENTS.filter((patient) => patient.intakeMode === mode && !patient.pendingIntakeReview).length, Math.max(1, DEMO_PATIENTS.filter((patient) => patient.intakeMode === mode).length)),
        })
      )
    ),
  });
}

function buildDoorToTriageFlow() {
  const stages = ['Arrival', 'Identity Capture', 'Document Processing', 'Verification', 'Patient Context', 'Risk Capture', 'Triage Queue'];

  return Object.freeze({
    title: 'Patient Flow Door To Triage',
    targetWindowMinutes: 15,
    stages: Object.freeze(
      stages.map((stage, index) =>
        Object.freeze({
          id: stage.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          label: stage,
          status: index < 5 ? 'measured' : 'review pending',
          startTimestamp: `T+${index}m`,
          completionTimestamp: index < 5 ? `T+${index + 1}m` : null,
          processingMinutes: index + 1,
          completionRate: Math.max(60, 96 - index * 5),
          bottleneck: index === 3 ? 'verification queue aging' : null,
          responsibleRole: index <= 1 ? 'registration staff' : index <= 3 ? 'intake reviewer' : 'triage staff',
          blockers: Object.freeze(index === 3 ? ['identity or demographic verification pending'] : []),
          sourceSystemOrIntakeMode: index <= 1 ? 'QR code intake, kiosk, tablet, receptionist-assisted intake' : 'DocumentIntelligenceService and Intake OS',
        })
      )
    ),
    tracked: Object.freeze(['processing time', 'bottlenecks', 'completion rates']),
    operationalSignals: Object.freeze([
      'patients delayed before identity capture',
      'patients stalled in document processing',
      'patients waiting on verification',
      'patients missing patient context',
      'patients missing critical risk capture',
      'patients ready for the triage queue',
      'average and median time from arrival to triage-ready state',
    ]),
  });
}

function buildFirstFiveMinuteExperience() {
  const total = DEMO_PATIENTS.length;
  return Object.freeze({
    title: 'First Five Minute Experience',
    windowMinutes: 5,
    measures: Object.freeze([
      { id: 'identity-captured', label: 'Identity captured', value: percent(DEMO_PATIENTS.filter((patient) => patient.identityCaptured && patient.arrivalMinutesAgo <= 5).length, total), unit: '%', completionStatus: 'measured', completionTimestamp: 'T+1m', sourceOrMode: 'QR code intake, kiosk, receptionist-assisted intake', missingOrUnresolvedFields: Object.freeze([]), verificationStatus: 'confirmed or review pending', responsibleRole: 'registration staff' },
      { id: 'demographics-captured', label: 'Demographics captured', value: percent(DEMO_PATIENTS.filter((patient) => patient.demographicsCaptured && patient.arrivalMinutesAgo <= 5).length, total), unit: '%', completionStatus: 'measured', completionTimestamp: 'T+2m', sourceOrMode: 'patient-entered forms and prior context', missingOrUnresolvedFields: Object.freeze(['phone for INTAKE-003']), verificationStatus: 'verification required', responsibleRole: 'intake reviewer' },
      { id: 'documents-processed', label: 'Documents processed', value: DEMO_PATIENTS.filter((patient) => patient.arrivalMinutesAgo <= 5).reduce((sum, patient) => sum + patient.documentsProcessed, 0), unit: 'docs', completionStatus: 'measured', completionTimestamp: 'T+3m', sourceOrMode: 'DocumentIntelligenceService', missingOrUnresolvedFields: Object.freeze(['insurance group ID review']), verificationStatus: 'document review required', responsibleRole: 'document reviewer' },
      { id: 'context-generated', label: 'Context generated', value: percent(DEMO_PATIENTS.filter((patient) => patient.contextGenerated && patient.arrivalMinutesAgo <= 5).length, total), unit: '%', completionStatus: 'measured', completionTimestamp: 'T+4m', sourceOrMode: 'Patient Snapshot', missingOrUnresolvedFields: Object.freeze(['pharmacy integration not connected']), verificationStatus: 'clinician review required', responsibleRole: 'clinician reviewer' },
      { id: 'triage-ready-status', label: 'Triage-ready status', value: percent(DEMO_PATIENTS.filter((patient) => patient.triageReady && patient.triageReadyMinutes <= 5).length, total), unit: '%', completionStatus: 'measured', completionTimestamp: 'T+5m', sourceOrMode: 'Pre-Triage Queue', missingOrUnresolvedFields: Object.freeze(['allergy confirmation incomplete']), verificationStatus: 'no autonomous triage decision', responsibleRole: 'triage staff' },
    ]),
    blockers: Object.freeze(['verification review aging', 'allergy confirmation incomplete']),
    improvementStatement: 'CareDroid demonstrates measurable reduction in administrative delay by tracking first-five-minute completion.',
  });
}

function buildVoiceIntake() {
  return Object.freeze({
    title: 'Voice Assisted Intake',
    conversionFlow: Object.freeze(['speech', 'transcription', 'structured intake']),
    structuredFields: Object.freeze(['name', 'date of birth', 'address', 'phone', 'emergency contact', 'complaint', 'administrative acknowledgements']),
    sampleTranscript: 'My name is Jordan Lee, born April 12 1971. I am here for chest pain.',
    mappedFields: Object.freeze([
      { field: 'name', value: 'Jordan Lee', confidence: 0.95, correctionState: 'reviewed' },
      { field: 'date of birth', value: '1971-04-12', confidence: 0.9, correctionState: 'reviewed' },
      { field: 'complaint', value: 'chest pain', confidence: 0.88, correctionState: 'requires staff confirmation' },
    ]),
    uncertainResponses: Object.freeze(['emergency contact not captured verbally']),
    correctionWorkflow: Object.freeze(['review transcript', 'review mapped structured fields', 'correct transcription errors', 'correct field mapping errors', 'mark uncertain responses for follow-up', 'confirm reviewed fields']),
    reviewAndCorrectionRequired: true,
    voiceCaptureState: 'inactive until patient or staff starts capture',
    alternateIntakePaths: Object.freeze(['kiosk', 'tablet', 'QR code', 'receptionist-assisted intake']),
    accessibilityStatement: 'Patients or staff can answer intake questions verbally; speech-derived fields remain proposed until reviewed.',
  });
}

function buildReferralDocumentIngestion() {
  return Object.freeze({
    title: 'Referral Document Ingestion',
    supportedDocuments: SUPPORTED_EXTERNAL_DOCUMENTS,
    extractedConcepts: Object.freeze(['diagnoses', 'medications', 'allergies', 'recommendations']),
    sourceReferenceRequirements: Object.freeze(['source document type', 'source document identifier or file reference', 'page or section location', 'extracted text span', 'extraction confidence', 'review status', 'ingestion timestamp']),
    records: Object.freeze(
      SUPPORTED_EXTERNAL_DOCUMENTS.map((documentType) =>
        DocumentIntelligenceService.processDocument({
          documentType,
          sourceDocumentReference: `external-${documentType.replace(/[^a-z0-9]+/g, '-')}`,
        })
      )
    ),
    searchableRecordFields: Object.freeze(['patient', 'document type', 'extracted concept', 'source', 'review state']),
    searchModes: Object.freeze(['patient', 'document type', 'extracted concept', 'source', 'review state']),
    sourceReferencesStored: true,
    reviewRequired: true,
  });
}

function buildImplementationTraceability() {
  return Object.freeze({
    totalPlans: IMPLEMENTATION_PLAN_LINKS.length,
    implementedPlans: IMPLEMENTATION_PLAN_LINKS.length,
    status: 'all intake markdown plans linked to service, route, pipeline, or test coverage',
    docs: IMPLEMENTATION_PLAN_LINKS,
    routes: Object.freeze(['/workspace/emergency/intake', '/workspace/emergency/patient-context', '/workspace/emergency/intake-analytics', '/workspace/emergency/triage']),
    services: Object.freeze([
      'EmergencyIntakeOperatingSystemService',
      'DocumentIntelligenceService',
      'WorkspaceDataPipelineService',
      'EmergencyOperatingSystemService',
    ]),
    tests: Object.freeze([
      'src/services/emergencyIntakeOperatingSystemService.test.js',
      'src/services/emergencyOperatingSystemService.test.js',
      'src/services/workspaceDataPipelineService.test.js',
      'src/pages/WorkspaceHome.test.jsx',
    ]),
  });
}

function buildMarketplace() {
  return Object.freeze({
    title: 'Emergency Intake Automation Marketplace',
    category: 'Emergency Intake',
    modules: INTAKE_AUTOMATION_MODULES,
    tiers: Object.freeze(['Core', 'Pro', 'Enterprise']),
    metrics: Object.freeze({
      totalModules: INTAKE_AUTOMATION_MODULES.length,
      includedInCore: INTAKE_AUTOMATION_MODULES.filter((module) => module.tierAvailability.core === 'Included').length,
      addOnModules: INTAKE_AUTOMATION_MODULES.filter((module) => Object.values(module.tierAvailability).includes('Add-on')).length,
      reviewControlledModules: INTAKE_AUTOMATION_MODULES.filter((module) => module.reviewControls.length > 0).length,
    }),
    upgradePaths: Object.freeze([
      { from: 'Core', to: 'Pro', unlocks: Object.freeze(['full OCR Intake', 'Patient Snapshot', 'Medication Capture']) },
      { from: 'Pro', to: 'Enterprise', unlocks: Object.freeze(['advanced Identity Resolution', 'Voice Intake', 'Multi-Language Intake']) },
    ]),
    configurationRules: Object.freeze(['role-based enablement', 'governance policy controls', 'review controls cannot be disabled for extracted clinical or identity data']),
    packagingStatement: 'Intake is packaged as a sellable Emergency Workspace product category.',
  });
}

function buildEmergencyOsIntegration() {
  return Object.freeze({
    flow: Object.freeze(['Arrival', 'Intake', 'Verification', 'Patient Context', 'Triage', 'Assessment', 'Disposition']),
    requirements: Object.freeze([
      'arrival events create or update journey context',
      'intake progress is visible as part of the patient journey',
      'verification status controls whether extracted intake fields become confirmed context',
      'patient context is generated after verified intake data becomes available',
      'triage receives organized pre-triage information without autonomous triage decisions',
      'assessment can reference intake-derived context with source and review status',
      'disposition can retain relevant intake and document context for downstream workflows',
    ]),
    surfaces: Object.freeze([
      'Emergency command center views',
      'Patient Journey Engine metrics',
      'Door-to-triage analytics',
      'Intake operations dashboard',
      'Patient context workspace',
      'Pre-triage queue',
      'Automation marketplace usage signals',
    ]),
    patientJourneyFeed: buildPatientJourneyFeed(),
  });
}

function buildPatientJourneyFeed() {
  return Object.freeze(
    INTAKE_JOURNEY_AUTOMATIONS.map((module) =>
      Object.freeze({
        moduleId: module.moduleId,
        title: module.title,
        patientJourneyStates: module.journeyStages,
        validJourneyStages: ensureValidJourneyStages(module),
        route: module.route,
      })
    )
  );
}

export const DocumentIntelligenceService = Object.freeze({
  getSupportedInputs() {
    return DOCUMENT_INTELLIGENCE_INPUTS;
  },

  getAcceptedInputChannels() {
    return Object.freeze(['uploaded', 'scanned', 'photographed', 'integration-supplied']);
  },

  processDocument(input = {}) {
    const documentType = normalizeDocumentType(input);
    const sourceDocumentReference = input.sourceDocumentReference || `demo-${documentType.replace(/[^a-z0-9]+/g, '-')}`;
    const extractedFields = Object.freeze(buildDocumentFields(documentType));

    return Object.freeze({
      serviceId: 'DocumentIntelligenceService',
      documentType,
      classification: Object.freeze({
        detectedDocumentType: documentType,
        classified: true,
        classificationSource: input.documentType ? 'provided document metadata' : 'document type classifier',
      }),
      sourceDocumentReference,
      pipeline: DOCUMENT_INTELLIGENCE_PIPELINE,
      ocrTextReference: `${sourceDocumentReference}:ocr-text`,
      extractedFields,
      sourceReferences: Object.freeze(
        extractedFields.map((field) =>
          Object.freeze({
            field: field.field,
            documentType,
            sourceDocumentReference,
            location: input.location || 'page 1',
            extractedTextSpan: `${field.field}: ${field.value}`,
            confidence: field.confidence,
            reviewStatus: field.reviewStatus,
            ingestionTimestamp: input.ingestionTimestamp || 'frontend-runtime',
          })
        )
      ),
      structuredRecord: Object.freeze({
        documentType,
        sourceDocumentReference,
        extractedFields,
        validationStatus: extractedFields.some((field) => field.validationStatus !== 'valid') ? 'review required' : 'valid',
        reviewState: extractedFields.some((field) => field.reviewStatus !== 'accepted') ? 'pending review' : 'accepted',
        reviewerAttribution: extractedFields.some((field) => field.reviewStatus !== 'accepted')
          ? 'intake reviewer pending'
          : 'registration staff',
        reviewTimestamp: extractedFields.some((field) => field.reviewStatus !== 'accepted')
          ? null
          : 'frontend-runtime',
        unresolvedFields: Object.freeze(
          extractedFields
            .filter((field) => field.reviewStatus !== 'accepted')
            .map((field) => field.field)
        ),
        reviewActions: Object.freeze([
          'view original document beside extracted fields',
          'correct OCR or extraction errors',
          'confirm usable fields',
          'reject unreliable fields',
          'preserve unresolved fields for follow-up',
        ]),
      }),
      safetyStatement: 'Extracted document fields remain proposed values until reviewed.',
    });
  },
});

export const EmergencyIntakeOperatingSystemService = Object.freeze({
  getOperatingSystem() {
    const documentRecords = Object.freeze([
      DocumentIntelligenceService.processDocument({ documentType: "driver's license", sourceDocumentReference: 'doc-driver-license-001' }),
      DocumentIntelligenceService.processDocument({ documentType: 'health card', sourceDocumentReference: 'doc-health-card-001' }),
      DocumentIntelligenceService.processDocument({ documentType: 'insurance card', sourceDocumentReference: 'doc-insurance-card-001' }),
      DocumentIntelligenceService.processDocument({ documentType: 'referral letters', sourceDocumentReference: 'doc-referral-letter-001' }),
      DocumentIntelligenceService.processDocument({ documentType: 'discharge papers', sourceDocumentReference: 'doc-discharge-papers-001' }),
    ]);

    return Object.freeze({
      serviceId: 'emergency-intake-operating-system',
      title: 'Emergency Intake Operating System',
      route: '/workspace/emergency/intake',
      status: 'demo/local structured implementation',
      intakeWorkflow: INTAKE_WORKFLOW_STAGES,
      unifiedCapabilities: Object.freeze([
        'Smart Intake',
        'Document Intelligence',
        'Identity Resolution',
        'Patient Snapshot',
        'Medication Capture',
        'Allergy Capture',
        'Verification',
        'Intake Analytics',
      ]),
      supportedIntakeModes: Object.freeze(['self-service kiosk', 'tablet intake', 'QR code intake', 'receptionist-assisted intake']),
      captureFields: REQUIRED_INTAKE_FIELDS,
      governance: Object.freeze({
        requirements: GOVERNANCE_REQUIREMENTS,
        verificationRule: 'No demographic extraction should bypass verification.',
        allExtractedFieldsRequireConfirmation: true,
        correctionWorkflowRequired: true,
        auditLoggingRequired: true,
        sourceAttributionRequired: true,
        artifacts: buildGovernanceArtifacts(),
      }),
      intakeRecord: buildIntakeRecord(),
      commandCenter: buildCommandCenter(),
      registrationCompletionScore: buildRegistrationScore(),
      documentIntelligence: Object.freeze({
        serviceId: 'DocumentIntelligenceService',
        supportedInputs: DOCUMENT_INTELLIGENCE_INPUTS,
        acceptedInputChannels: DocumentIntelligenceService.getAcceptedInputChannels(),
        supportedExternalDocuments: SUPPORTED_EXTERNAL_DOCUMENTS,
        pipeline: DOCUMENT_INTELLIGENCE_PIPELINE,
        records: documentRecords,
        searchable: true,
      }),
      identityResolution: buildIdentityResolution(),
      patientSnapshot: buildPatientSnapshot(),
      medicationSummary: buildMedicationSummary(),
      allergyRiskCapture: buildAllergyRiskCapture(),
      voiceIntake: buildVoiceIntake(),
      referralDocumentIngestion: buildReferralDocumentIngestion(),
      preTriageQueue: buildPreTriageQueue(),
      analytics: buildAnalytics(),
      doorToTriage: buildDoorToTriageFlow(),
      firstFiveMinuteExperience: buildFirstFiveMinuteExperience(),
      marketplace: buildMarketplace(),
      patientJourneyFeed: buildPatientJourneyFeed(),
      implementationTraceability: buildImplementationTraceability(),
      emergencyOsIntegration: buildEmergencyOsIntegration(),
      integrationFlow: Object.freeze(['Arrival', 'Intake', 'Verification', 'Patient Context', 'Triage', 'Assessment', 'Disposition']),
      productSurfaces: Object.freeze([
        { surface: 'Intake dashboard', route: '/workspace/emergency/intake', artifact: 'commandCenter' },
        { surface: 'Intake analytics dashboard', route: '/workspace/emergency/intake-analytics', artifact: 'analytics' },
        { surface: 'Patient context workspace', route: '/workspace/emergency/patient-context', artifact: 'patientSnapshot' },
        { surface: 'Pre-triage queue', route: '/workspace/emergency/triage', artifact: 'preTriageQueue' },
        { surface: 'Registration completion views', route: '/workspace/emergency/intake', artifact: 'registrationCompletionScore' },
        { surface: 'Document review workspace', route: '/workspace/emergency/intake', artifact: 'documentIntelligence' },
        { surface: 'Identity resolution review', route: '/workspace/emergency/patient-context', artifact: 'identityResolution' },
        { surface: 'Medication and allergy capture review', route: '/workspace/emergency/patient-context', artifact: 'medicationSummary + allergyRiskCapture' },
        { surface: 'Emergency command center and Patient Journey Engine views', route: '/workspace/emergency', artifact: 'emergencyOsIntegration' },
      ]),
      safetyStatement:
        'Emergency Intake OS reduces administrative burden and feeds ED OS context while preserving confirmation, review, audit, source attribution, correction workflows, and no autonomous triage decisions.',
    });
  },
});

export function getEmergencyIntakeAutomationFeed() {
  return Object.freeze(
    INTAKE_JOURNEY_AUTOMATIONS.map((module) =>
      Object.freeze({
        automationId: `emergency-intake-${module.moduleId}`,
        title: module.title,
        description: module.description,
        riskLevel: module.reviewControls.some((control) => /clinician|medication|risk|match/i.test(control))
          ? 'high'
          : 'medium',
        humanReviewRequired: true,
        patientJourneyStates: module.journeyStages,
        journeyStages: module.journeyStages,
        requiredWorkflows: module.journeyStages,
        workspaceVisibility: Object.freeze(['intake', 'patient-context', 'intake-analytics']),
        subscriptionTier: module.tierAvailability.enterprise === 'Included' ? 'enterprise' : 'professional',
        status: 'demo-preview',
        source: 'EmergencyIntakeOperatingSystemService',
      })
    )
  );
}

export const getEmergencyIntakeOperatingSystem =
  EmergencyIntakeOperatingSystemService.getOperatingSystem.bind(EmergencyIntakeOperatingSystemService);

export default EmergencyIntakeOperatingSystemService;
