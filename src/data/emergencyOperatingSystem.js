import { REGISTRY } from './clinicalToolIdContract';

export const EMERGENCY_WORKSPACE_ID = 'emergency';

export const EMERGENCY_PATIENT_JOURNEY = Object.freeze([
  Object.freeze({
    id: 'patient',
    label: 'Patient',
    description: 'Person or EMS case entering the ED operating model.',
  }),
  Object.freeze({
    id: 'arrival',
    label: 'Arrival',
    description: 'Door, EMS handoff, walk-in, virtual ED, or transfer entry event.',
  }),
  Object.freeze({
    id: 'registration',
    label: 'Registration',
    description: 'Identity, encounter, source, payer, consent, and intake capture.',
  }),
  Object.freeze({
    id: 'triage',
    label: 'Triage',
    description: 'Vitals, chief complaint, acuity, red flags, and calculator routing.',
  }),
  Object.freeze({
    id: 'clinical-assessment',
    label: 'Clinical Assessment',
    description: 'Clinician assessment, differential support, protocols, and evidence review.',
  }),
  Object.freeze({
    id: 'orders',
    label: 'Orders',
    description: 'Orders, diagnostics, medications, and protocol-linked order context.',
  }),
  Object.freeze({
    id: 'results',
    label: 'Results',
    description: 'Lab, imaging, device, and external result review.',
  }),
  Object.freeze({
    id: 'disposition',
    label: 'Disposition',
    description: 'Referral, consult, observation, transfer, discharge, or admission routing.',
  }),
  Object.freeze({
    id: 'discharge-admission',
    label: 'Discharge/Admission',
    description: 'Drafted summaries, prior authorization support, handoff, and closure.',
  }),
]);

export const EMERGENCY_JOURNEY_BY_ID = Object.freeze(
  Object.fromEntries(EMERGENCY_PATIENT_JOURNEY.map((stage) => [stage.id, stage]))
);

export const EMERGENCY_DASHBOARD_WIDGETS = Object.freeze([
  Object.freeze({
    id: 'waiting-room',
    label: 'Waiting Room',
    value: 18,
    helper: '7 untriaged, 3 EMS inbound',
    severity: 'high',
    journeyStages: ['arrival', 'registration', 'triage'],
  }),
  Object.freeze({
    id: 'active-patients',
    label: 'Active Patients',
    value: 42,
    helper: '11 in assessment, 8 pending results',
    severity: 'medium',
    journeyStages: ['clinical-assessment', 'orders', 'results'],
  }),
  Object.freeze({
    id: 'high-risk-patients',
    label: 'High-Risk Patients',
    value: 6,
    helper: 'NEWS2/qSOFA/Shock Index review',
    severity: 'critical',
    journeyStages: ['triage', 'clinical-assessment'],
  }),
  Object.freeze({
    id: 'critical-alerts',
    label: 'Critical Alerts',
    value: 4,
    helper: 'Stroke window, sepsis concern, trauma bay',
    severity: 'critical',
    journeyStages: ['triage', 'clinical-assessment', 'results'],
  }),
  Object.freeze({
    id: 'device-alerts',
    label: 'Device Alerts',
    value: 5,
    helper: 'Telemetry stale or monitor disconnected',
    severity: 'high',
    journeyStages: ['triage', 'clinical-assessment', 'results'],
  }),
  Object.freeze({
    id: 'staffing-status',
    label: 'Staffing Status',
    value: 'Surge watch',
    helper: '2 triage nurses, 1 attending gap',
    severity: 'high',
    journeyStages: ['arrival', 'triage', 'disposition'],
  }),
  Object.freeze({
    id: 'referral-queue',
    label: 'Referral Queue',
    value: 9,
    helper: '4 consult drafts need review',
    severity: 'medium',
    journeyStages: ['clinical-assessment', 'results', 'disposition'],
  }),
  Object.freeze({
    id: 'documentation-queue',
    label: 'Documentation Queue',
    value: 14,
    helper: '7 discharge drafts, 3 integrity gaps',
    severity: 'medium',
    journeyStages: ['clinical-assessment', 'results', 'discharge-admission'],
  }),
]);

export const EMERGENCY_COMMAND_CENTER_WIDGETS = Object.freeze([
  Object.freeze({
    id: 'waiting-patients',
    label: 'Waiting Patients',
    value: 18,
    helper: '7 untriaged, 3 EMS inbound, 2 waiting over target',
    severity: 'high',
    targetSurface: 'triage',
    primaryAction: Object.freeze({
      label: 'Start triage review',
      actionType: 'route',
      target: '/workspace/emergency/triage',
    }),
    secondaryAction: Object.freeze({
      label: 'Ask assistant for queue priorities',
      actionType: 'assistant',
      prompt: 'Prioritize waiting ED patients by triage risk, wait time, EMS inbound status, and clinician review needs.',
    }),
    supportingDetail: 'Use this queue to pull the next patient into triage without leaving the dashboard.',
  }),
  Object.freeze({
    id: 'high-risk-queue',
    label: 'High Risk Queue',
    value: 6,
    helper: 'NEWS2, qSOFA, HEART, Wells, and Shock Index flags',
    severity: 'critical',
    targetSurface: 'triage',
    primaryAction: Object.freeze({
      label: 'Open risk calculators',
      actionType: 'route',
      target: '/workspace/emergency/triage',
    }),
    secondaryAction: Object.freeze({
      label: 'Review high-risk summary',
      actionType: 'assistant',
      prompt: 'Summarize high-risk ED queue items and recommend clinician-review next steps without making autonomous decisions.',
    }),
    supportingDetail: 'Centralizes calculator-triggered risk review for clinician confirmation.',
  }),
  Object.freeze({
    id: 'critical-alerts',
    label: 'Critical Alerts',
    value: 4,
    helper: 'Stroke window, sepsis concern, trauma bay, device disconnect',
    severity: 'critical',
    targetSurface: 'alerts',
    primaryAction: Object.freeze({
      label: 'Review critical alerts',
      actionType: 'route',
      target: '/workspace/emergency/alerts',
    }),
    secondaryAction: Object.freeze({
      label: 'Open escalation guidance',
      actionType: 'assistant',
      prompt: 'Review ED critical alerts and provide escalation guidance for human confirmation.',
    }),
    supportingDetail: 'Combines clinical, operational, and device alerts into one escalation view.',
  }),
  Object.freeze({
    id: 'recent-assessments',
    label: 'Recent Assessments',
    value: 12,
    helper: 'New triage profiles, recent reassessments, and pending review notes',
    severity: 'medium',
    targetSurface: 'patients',
    primaryAction: Object.freeze({
      label: 'Open patient worklist',
      actionType: 'route',
      target: '/workspace/emergency/patients',
    }),
    secondaryAction: Object.freeze({
      label: 'Draft assessment follow-up',
      actionType: 'assistant',
      prompt: 'Identify ED recent assessments that need reassessment, documentation, or clinician follow-up.',
    }),
    supportingDetail: 'Keeps reassessment and follow-up work visible from the dashboard.',
  }),
  Object.freeze({
    id: 'recommended-actions',
    label: 'Recommended Actions',
    value: 9,
    helper: 'Review-required next steps across triage, documentation, referrals, and discharge',
    severity: 'medium',
    targetSurface: 'automations',
    primaryAction: Object.freeze({
      label: 'Review action queue',
      actionType: 'route',
      target: '/workspace/emergency/automations',
    }),
    secondaryAction: Object.freeze({
      label: 'Ask for next best actions',
      actionType: 'assistant',
      prompt: 'Recommend ED next actions across triage, documentation, referrals, and disposition. Keep all actions review-required.',
    }),
    supportingDetail: 'Routes the user to human-reviewed operational next steps instead of separate tool hunting.',
  }),
  Object.freeze({
    id: 'protocol-guidance',
    label: 'Protocol Guidance',
    value: 5,
    helper: 'Chest pain, stroke, sepsis, trauma, and respiratory pathways ready',
    severity: 'medium',
    targetSurface: 'evidence',
    primaryAction: Object.freeze({
      label: 'Open protocol guidance',
      actionType: 'route',
      target: '/workspace/emergency/evidence',
    }),
    secondaryAction: Object.freeze({
      label: 'Retrieve complaint protocol',
      actionType: 'assistant',
      prompt: 'Retrieve complaint-specific ED protocol guidance and evidence for clinician review.',
    }),
    supportingDetail: 'Surfaces protocol retrieval and evidence review from the dashboard.',
  }),
]);

export const EMERGENCY_TRIAGE_ORCHESTRATOR = Object.freeze({
  id: 'emergency-triage-orchestrator',
  label: 'Triage Orchestrator',
  inputs: Object.freeze(['Vitals', 'Chief Complaint', 'Intake Data']),
  calculatorSequence: Object.freeze([
    Object.freeze({
      id: REGISTRY.qsofa,
      label: 'qSOFA',
      trigger: 'Sepsis concern, infection, hypotension, tachypnea, altered mentation.',
    }),
    Object.freeze({
      id: REGISTRY.news2,
      label: 'NEWS2',
      trigger: 'Any abnormal vital signs or deterioration watch.',
    }),
    Object.freeze({
      id: REGISTRY.heartScore,
      label: 'HEART',
      trigger: 'Chest pain or ACS concern.',
    }),
    Object.freeze({
      id: REGISTRY.wellsPe,
      label: 'Wells PE',
      trigger: 'Shortness of breath, pleuritic pain, PE concern, tachycardia, hemoptysis.',
    }),
    Object.freeze({
      id: REGISTRY.wellsDvtCalculator,
      label: 'Wells DVT',
      trigger: 'Unilateral leg swelling, DVT concern, VTE pathway context.',
    }),
    Object.freeze({
      id: REGISTRY.shockIndex,
      label: 'Shock Index',
      trigger: 'Trauma, bleeding concern, hypotension, tachycardia, hemodynamic instability.',
    }),
  ]),
  outputs: Object.freeze([
    'risk profile',
    'recommended calculator list',
    'red flag summary',
    'clinician review queue item',
  ]),
  safetyStatement:
    'The triage orchestrator generates risk profiles and review prompts only. It does not make autonomous diagnoses, disposition decisions, or treatment decisions.',
});

export const EMERGENCY_RAG_COMPLAINT_CONTEXT = Object.freeze([
  Object.freeze({
    complaint: 'Chest Pain',
    protocols: ['ACS/chest pain pathway', 'ECG and troponin review', 'cardiology consult criteria'],
    evidence: ['ACS risk stratification', 'troponin timing evidence', 'ECG red flag evidence'],
    recommendedCalculators: [REGISTRY.heartScore, REGISTRY.graceAcs],
    workflows: ['chest pain pathway', 'documentation integrity', 'referral routing'],
    simulations: ['ACS chest pain simulation', 'handoff documentation drill'],
  }),
  Object.freeze({
    complaint: 'Stroke Symptoms',
    protocols: ['stroke window workflow', 'imaging escalation pathway', 'neurology referral criteria'],
    evidence: ['stroke time-window evidence', 'NIHSS interpretation support', 'thrombolysis safety context'],
    recommendedCalculators: [REGISTRY.nihss, REGISTRY.news2],
    workflows: ['stroke pathway', 'referral routing', 'documentation integrity'],
    simulations: ['stroke escalation simulation', 'time-critical handoff drill'],
  }),
  Object.freeze({
    complaint: 'Sepsis Concern',
    protocols: ['sepsis pathway', 'lactate/culture workflow', 'antibiotic review workflow'],
    evidence: ['sepsis screening evidence', 'early warning score context', 'source control workflow context'],
    recommendedCalculators: [REGISTRY.qsofa, REGISTRY.news2, REGISTRY.sofaScore],
    workflows: ['automated triage matrix', 'RAG evidence retrieval', 'surge staffing'],
    simulations: ['sepsis deterioration simulation', 'shock escalation drill'],
  }),
  Object.freeze({
    complaint: 'Trauma',
    protocols: ['trauma primary survey', 'ATLS workflow context', 'massive transfusion review'],
    evidence: ['trauma acuity evidence', 'hemodynamic risk context', 'imaging decision support context'],
    recommendedCalculators: [REGISTRY.shockIndex, REGISTRY.revisedTraumaScore],
    workflows: ['automated triage matrix', 'surge staffing', 'medical IoT monitoring'],
    simulations: ['trauma bay team simulation', 'shock index drill'],
  }),
  Object.freeze({
    complaint: 'Shortness of Breath',
    protocols: ['respiratory distress pathway', 'PE evaluation pathway', 'oxygen escalation workflow'],
    evidence: ['PE risk evidence', 'oxygen escalation context', 'NEWS2 respiratory risk context'],
    recommendedCalculators: [REGISTRY.news2, REGISTRY.wellsPe, REGISTRY.perc],
    workflows: ['RAG evidence retrieval', 'medical IoT monitoring', 'referral routing'],
    simulations: ['respiratory distress simulation', 'PE risk workflow simulation'],
  }),
]);

export const EMERGENCY_CHIEF_COMPLAINT_ROUTES = Object.freeze([
  Object.freeze({
    routeId: 'chief-complaint-chest-pain',
    complaint: 'Chest Pain',
    aliases: ['chest pain', 'chest pressure', 'acs concern', 'possible acs', 'cardiac chest pain'],
    calculators: Object.freeze([
      Object.freeze({ id: REGISTRY.heartScore, label: 'HEART' }),
    ]),
    workflows: Object.freeze(['ACS Workflow']),
    protocols: Object.freeze(['ACS/chest pain pathway']),
    referrals: Object.freeze(['Cardiology Referral']),
    guidance:
      'Route chest pain to HEART review, ACS workflow guidance, and cardiology referral criteria for clinician review.',
    safetyStatement:
      'This route supports workflow guidance only. It does not diagnose ACS or make autonomous referral decisions.',
  }),
  Object.freeze({
    routeId: 'chief-complaint-stroke-symptoms',
    complaint: 'Stroke Symptoms',
    aliases: ['stroke symptoms', 'stroke concern', 'weakness', 'facial droop', 'slurred speech', 'neuro deficit'],
    calculators: Object.freeze([
      Object.freeze({ id: REGISTRY.nihss, label: 'NIHSS' }),
    ]),
    workflows: Object.freeze(['Stroke Workflow']),
    protocols: Object.freeze(['stroke window workflow']),
    referrals: Object.freeze(['Neurology referral criteria']),
    guidance:
      'Route stroke symptoms to NIHSS review and stroke workflow guidance for time-sensitive clinician review.',
    safetyStatement:
      'This route supports stroke workflow guidance only. It does not diagnose stroke or determine treatment eligibility.',
  }),
  Object.freeze({
    routeId: 'chief-complaint-sepsis-concern',
    complaint: 'Sepsis Concern',
    aliases: ['sepsis concern', 'possible sepsis', 'infection', 'fever hypotension', 'tachypnea infection'],
    calculators: Object.freeze([
      Object.freeze({ id: REGISTRY.qsofa, label: 'qSOFA' }),
      Object.freeze({ id: REGISTRY.news2, label: 'NEWS2' }),
    ]),
    workflows: Object.freeze(['Sepsis Workflow']),
    protocols: Object.freeze(['sepsis pathway']),
    referrals: Object.freeze(['Clinician escalation review']),
    guidance:
      'Route sepsis concern to qSOFA, NEWS2, and sepsis workflow guidance for clinician escalation review.',
    safetyStatement:
      'This route supports sepsis workflow guidance only. It does not diagnose sepsis or order treatment.',
  }),
  Object.freeze({
    routeId: 'chief-complaint-shortness-of-breath',
    complaint: 'Shortness of Breath',
    aliases: ['shortness of breath', 'sob', 'dyspnea', 'respiratory distress', 'pe concern'],
    calculators: Object.freeze([
      Object.freeze({ id: REGISTRY.wellsPe, label: 'Wells PE' }),
    ]),
    workflows: Object.freeze(['Respiratory Workflow']),
    protocols: Object.freeze(['Respiratory Protocol']),
    referrals: Object.freeze(['Respiratory escalation review']),
    guidance:
      'Route shortness of breath to Wells PE review and respiratory protocol guidance for clinician review.',
    safetyStatement:
      'This route supports respiratory workflow guidance only. It does not diagnose PE or determine disposition.',
  }),
]);

export const EMERGENCY_AI_COPILOT = Object.freeze({
  copilotId: 'emergency-ai-copilot',
  title: 'ED AI Copilot',
  role:
    'Converts complaint, vitals, workspace context, and selected calculators into explainable ED workflow guidance.',
  inputSchema: Object.freeze(['complaint', 'vitals', 'workspaceContext', 'selectedCalculators']),
  outputSchema: Object.freeze([
    'recommendedTools',
    'protocols',
    'nextWorkflowStep',
    'simulations',
    'escalationSuggestions',
    'reasoning',
  ]),
  safetyBoundary:
    'Workflow guidance only. No autonomous diagnosis, disposition, treatment, orders, or escalation decisions.',
  reasoningRequirement:
    'Always explain which complaint route, vitals context, workspace context, and selected calculators informed each recommendation.',
  reviewRequirement: 'Clinician review is required for every Copilot output.',
});

export const EMERGENCY_ANALYTICS_EVENTS = Object.freeze([
  'triage_volume',
  'calculator_utilization',
  'referral_volume',
  'documentation_drafts',
  'ai_recommendation_acceptance',
  'automation_execution',
  'simulation_completion',
]);

export const ED_READINESS_CLASSIFICATIONS = Object.freeze({
  READY_TO_SELL: 'Ready to sell',
  NEEDS_WIRING: 'Needs wiring',
  NEEDS_INTEGRATION: 'Needs integration',
  FUTURE_ROADMAP: 'Future roadmap',
});

export const ED_BUYER_PERSONAS = Object.freeze({
  ED_DIRECTOR: 'ED Director',
  CHIEF_NURSING_OFFICER: 'Chief Nursing Officer',
  COO: 'COO',
  CLINICAL_INFORMATICS_LEAD: 'Clinical Informatics Lead',
});

export const EMERGENCY_AUTOMATION_MODULES = Object.freeze([
  Object.freeze({
    automationId: 'emergency-automated-triage-matrix',
    title: 'Automated Triage Matrix',
    description:
      'Turns arrival, vitals, chief complaint, and intake facts into a clinician-review triage risk profile.',
    type: 'Clinical',
    trigger: 'New ED arrival, EMS pre-arrival, or virtual ED intake with vitals and chief complaint.',
    inputs: ['patient identity', 'arrival source', 'vitals', 'chief complaint', 'intake data', 'red flags'],
    outputs: ['risk profile', 'calculator recommendations', 'triage queue item', 'clinician review prompt'],
    requiredAssets: [
      REGISTRY.qsofa,
      REGISTRY.news2,
      REGISTRY.heartScore,
      REGISTRY.wellsPe,
      REGISTRY.wellsDvtCalculator,
      REGISTRY.shockIndex,
    ],
    requiredAI: ['emergency-copilot', 'risk-profile-summarizer'],
    requiredIntegrations: ['EHR encounter feed', 'ADT', 'vitals monitor', 'triage queue'],
    humanReviewRequirement: 'Required before acuity, diagnosis, orders, or disposition are finalized.',
    workspaceVisibility: ['dashboard', 'triage', 'patients', 'automations', 'analytics'],
    journeyStages: ['arrival', 'registration', 'triage', 'clinical-assessment'],
    subscriptionTier: 'starter',
    riskLevel: 'high',
    status: 'active',
    actions: ['generate triage risk profile', 'recommend calculators', 'route to clinician review'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
      standaloneViability: 'yes',
      requiresEhrAccess: false,
      requiresIntegration: false,
      buyerPersonas: [
        ED_BUYER_PERSONAS.ED_DIRECTOR,
        ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER,
        ED_BUYER_PERSONAS.CLINICAL_INFORMATICS_LEAD,
      ],
      firstCustomerNote:
        'Sell as a manual-intake triage calculator and risk-profile pilot with clinician review.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-referral-routing',
    title: 'Referral Routing',
    description:
      'Routes consult, transfer, specialty, and follow-up needs from assessment and results into a reviewable referral queue.',
    type: 'Administrative',
    trigger: 'Disposition, consult need, transfer need, or result-driven specialty follow-up identified.',
    inputs: ['assessment summary', 'results', 'diagnostic impression', 'service line', 'capacity constraints'],
    outputs: ['referral queue item', 'consult draft', 'missing data checklist', 'handoff summary'],
    requiredAssets: ['referral-ai', REGISTRY.patientSummaryAi, REGISTRY.timelineAi],
    requiredAI: ['referral-drafting-agent', 'missing-data-checker'],
    requiredIntegrations: ['EHR referrals', 'provider directory', 'transfer center', 'secure messaging'],
    humanReviewRequirement: 'Required before referral, transfer, or consult is sent.',
    workspaceVisibility: ['dashboard', 'referrals', 'patients', 'automations', 'analytics'],
    journeyStages: ['clinical-assessment', 'results', 'disposition'],
    subscriptionTier: 'professional',
    riskLevel: 'medium',
    status: 'active',
    actions: ['create referral queue item', 'draft referral summary', 'flag missing referral data'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.NEEDS_INTEGRATION,
      standaloneViability: 'partial',
      requiresEhrAccess: true,
      requiresIntegration: true,
      buyerPersonas: [ED_BUYER_PERSONAS.ED_DIRECTOR, ED_BUYER_PERSONAS.COO],
      firstCustomerNote:
        'Demo as a review queue and referral draft workflow; production needs provider directory, referral, transfer, and secure messaging integrations.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-surge-staffing',
    title: 'Surge Staffing',
    description:
      'Combines waiting room, acuity, active patients, disposition backlog, and staffing signals into surge watch recommendations.',
    type: 'Operational',
    trigger: 'Waiting room, triage backlog, high-risk count, or disposition queue crosses surge threshold.',
    inputs: ['waiting room count', 'triage volume', 'active patients', 'high-risk patients', 'staff schedule'],
    outputs: ['staffing status', 'surge watch alert', 'coverage gap summary', 'operations review prompt'],
    requiredAssets: [REGISTRY.staffingRatioCalculator, REGISTRY.capacityPredictionEngine],
    requiredAI: ['surge-forecasting-agent'],
    requiredIntegrations: ['staff scheduling', 'bed board', 'ADT', 'operations command'],
    humanReviewRequirement: 'Required for staffing changes, diversion posture, and operational escalation.',
    workspaceVisibility: ['dashboard', 'triage', 'analytics', 'automations'],
    journeyStages: ['arrival', 'triage', 'clinical-assessment', 'disposition'],
    subscriptionTier: 'professional',
    riskLevel: 'medium',
    status: 'active',
    actions: ['update staffing status', 'create surge watch alert', 'recommend operations review'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.NEEDS_INTEGRATION,
      standaloneViability: 'partial',
      requiresEhrAccess: false,
      requiresIntegration: true,
      buyerPersonas: [ED_BUYER_PERSONAS.COO, ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER],
      firstCustomerNote:
        'Use demo/local queue and staffing data for discovery; production staffing recommendations require scheduling, bed board, and ADT feeds.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-simulation-academy',
    title: 'Simulation Academy',
    description:
      'Maps live ED patterns and gaps into emergency simulations for sepsis, stroke, trauma, chest pain, and respiratory distress.',
    type: 'Simulation',
    trigger: 'Simulation gap, protocol drift, missed calculator, or high-risk presentation pattern detected.',
    inputs: ['case pattern', 'protocol gap', 'calculator utilization', 'role', 'competency objective'],
    outputs: ['recommended simulation', 'practice assignment', 'debrief prompt', 'completion metric'],
    requiredAssets: [REGISTRY.simulationSuite, REGISTRY.scenarioPlayer, REGISTRY.simulationOutcomes],
    requiredAI: ['simulation-coach', 'debrief-summarizer'],
    requiredIntegrations: ['learning management system', 'competency records'],
    humanReviewRequirement: 'Required for credentialing credit and competency sign-off.',
    workspaceVisibility: ['dashboard', 'simulations', 'automations', 'analytics'],
    journeyStages: ['triage', 'clinical-assessment', 'disposition'],
    subscriptionTier: 'professional',
    riskLevel: 'low',
    status: 'active',
    actions: ['recommend simulation', 'create practice assignment', 'prepare debrief prompt'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
      standaloneViability: 'yes',
      requiresEhrAccess: false,
      requiresIntegration: false,
      buyerPersonas: [ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER, ED_BUYER_PERSONAS.ED_DIRECTOR],
      firstCustomerNote:
        'Sell as a standalone ED simulation and debrief starter for sepsis, stroke, trauma, chest pain, and dyspnea.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-medical-iot-monitoring',
    title: 'Medical IoT Monitoring',
    description:
      'Brings ED device telemetry, monitor freshness, battery, and disconnection signals into the patient journey.',
    type: 'Medical IoT',
    trigger: 'Device alert, telemetry gap, monitor disconnect, stale vitals, or battery warning.',
    inputs: ['device assignment', 'telemetry stream', 'last-seen time', 'battery state', 'patient location'],
    outputs: ['device alert', 'telemetry freshness summary', 'biomedical review task', 'patient risk context'],
    requiredAssets: [REGISTRY.medicalIotDashboard, REGISTRY.telemetryMonitoring, REGISTRY.deviceFleetManagement],
    requiredAI: ['device-telemetry-agent'],
    requiredIntegrations: ['medical device feed', 'biomedical ticketing', 'patient monitor integration'],
    humanReviewRequirement: 'Required when device state may affect patient monitoring or care escalation.',
    workspaceVisibility: ['dashboard', 'iot', 'patients', 'automations', 'analytics'],
    journeyStages: ['triage', 'clinical-assessment', 'results'],
    subscriptionTier: 'professional',
    riskLevel: 'high',
    status: 'active',
    actions: ['create device alert', 'summarize telemetry gap', 'route biomedical review'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.NEEDS_INTEGRATION,
      standaloneViability: 'no',
      requiresEhrAccess: false,
      requiresIntegration: true,
      buyerPersonas: [
        ED_BUYER_PERSONAS.COO,
        ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER,
        ED_BUYER_PERSONAS.CLINICAL_INFORMATICS_LEAD,
      ],
      firstCustomerNote:
        'Keep in discovery unless device telemetry, monitor assignment, and biomedical workflow feeds are available.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-documentation-integrity',
    title: 'Documentation Integrity',
    description:
      'Checks ED documentation completeness across intake, assessment, orders, results, disposition, and discharge/admission.',
    type: 'Governance',
    trigger: 'Missing triage facts, unsigned draft, inconsistent result reference, or disposition documentation gap.',
    inputs: ['encounter data', 'triage facts', 'orders', 'results', 'notes', 'disposition plan'],
    outputs: ['documentation queue item', 'integrity gap list', 'review-required draft', 'audit trace'],
    requiredAssets: [REGISTRY.clinicalDocumentationAssistant, REGISTRY.ambientScribe, REGISTRY.clinicalAudit],
    requiredAI: ['documentation-integrity-agent', 'source-fact-checker'],
    requiredIntegrations: ['EHR notes', 'orders/results feed', 'audit logs'],
    humanReviewRequirement: 'Required before documentation is signed, exported, billed, or sent.',
    workspaceVisibility: ['dashboard', 'documentation', 'patients', 'automations', 'analytics'],
    journeyStages: ['registration', 'clinical-assessment', 'orders', 'results', 'disposition', 'discharge-admission'],
    subscriptionTier: 'starter',
    riskLevel: 'high',
    status: 'active',
    actions: ['create documentation queue item', 'flag integrity gaps', 'prepare review draft'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.NEEDS_WIRING,
      standaloneViability: 'partial',
      requiresEhrAccess: true,
      requiresIntegration: true,
      buyerPersonas: [
        ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER,
        ED_BUYER_PERSONAS.CLINICAL_INFORMATICS_LEAD,
      ],
      firstCustomerNote:
        'Demo with pasted or manually verified encounter facts; production needs notes, orders/results, and audit feeds.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-rag-evidence-retrieval',
    title: 'RAG Evidence Retrieval',
    description:
      'Surfaces ED protocols, evidence, calculators, workflows, and simulations from complaint-specific context.',
    type: 'Research',
    trigger: 'Chief complaint entered for chest pain, stroke symptoms, sepsis concern, trauma, or shortness of breath.',
    inputs: ['chief complaint', 'risk profile', 'journey stage', 'local protocol context', 'clinician question'],
    outputs: ['protocols', 'evidence cards', 'calculator recommendations', 'workflow recommendations', 'simulation links'],
    requiredAssets: [REGISTRY.guidelineRag, REGISTRY.calculatorRecommenderAi, REGISTRY.aiExplainability],
    requiredAI: ['emergency-rag-router', 'citation-grounded-answerer'],
    requiredIntegrations: ['guideline store', 'local protocol library', 'clinical intelligence API'],
    humanReviewRequirement: 'Required before protocol selection, orders, diagnosis, or disposition action.',
    workspaceVisibility: ['dashboard', 'triage', 'evidence', 'patients', 'automations', 'analytics'],
    journeyStages: ['triage', 'clinical-assessment', 'orders', 'results', 'disposition'],
    subscriptionTier: 'starter',
    riskLevel: 'medium',
    status: 'active',
    actions: ['surface protocols', 'recommend calculators', 'link relevant workflows and simulations'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
      standaloneViability: 'yes',
      requiresEhrAccess: false,
      requiresIntegration: false,
      buyerPersonas: [
        ED_BUYER_PERSONAS.ED_DIRECTOR,
        ED_BUYER_PERSONAS.CLINICAL_INFORMATICS_LEAD,
      ],
      firstCustomerNote:
        'Sell as a complaint-specific ED evidence companion using configured protocols and clinician review.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-virtual-ed',
    title: 'Virtual ED',
    description:
      'Connects remote intake and virtual ED presentations to the same arrival, registration, triage, and review workflow.',
    type: 'Clinical',
    trigger: 'Virtual ED visit, telehealth intake, remote EMS consult, or pre-arrival patient submission.',
    inputs: ['virtual intake', 'reported symptoms', 'available vitals', 'location', 'callback/contact state'],
    outputs: ['virtual triage packet', 'risk review prompt', 'routing recommendation', 'arrival handoff'],
    requiredAssets: [REGISTRY.patientSummaryAi, REGISTRY.guidelineRag, REGISTRY.news2],
    requiredAI: ['virtual-ed-intake-agent', 'risk-summary-agent'],
    requiredIntegrations: ['telehealth platform', 'patient portal', 'EMS handoff', 'EHR encounter feed'],
    humanReviewRequirement: 'Required before escalation, disposition, referral, or ED arrival routing.',
    workspaceVisibility: ['dashboard', 'triage', 'patients', 'automations', 'analytics'],
    journeyStages: ['arrival', 'registration', 'triage', 'clinical-assessment', 'disposition'],
    subscriptionTier: 'professional',
    riskLevel: 'high',
    status: 'active',
    actions: ['create virtual triage packet', 'summarize risk context', 'route clinician review'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.FUTURE_ROADMAP,
      standaloneViability: 'partial',
      requiresEhrAccess: true,
      requiresIntegration: true,
      buyerPersonas: [ED_BUYER_PERSONAS.ED_DIRECTOR, ED_BUYER_PERSONAS.COO],
      firstCustomerNote:
        'Roadmap until telehealth, patient portal, EMS handoff, identity, and encounter creation paths are selected.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-discharge-summary-drafting',
    title: 'Discharge Summary Drafting',
    description:
      'Drafts ED discharge/admission summaries from verified events, results, treatments, medication context, and follow-up plans.',
    type: 'Administrative',
    trigger: 'Disposition selected, discharge/admission ready, or documentation draft requested.',
    inputs: ['verified ED timeline', 'results', 'orders', 'treatments', 'medications', 'follow-up plan'],
    outputs: ['discharge summary draft', 'admission handoff draft', 'missing data checklist', 'review task'],
    requiredAssets: ['discharge-summary-ai', REGISTRY.patientSummaryAi, REGISTRY.timelineAi],
    requiredAI: ['discharge-drafting-agent', 'source-fact-checker'],
    requiredIntegrations: ['EHR documentation', 'medication reconciliation', 'orders/results feed'],
    humanReviewRequirement: 'Required before signature, patient release, admission handoff, or export.',
    workspaceVisibility: ['dashboard', 'documentation', 'patients', 'automations', 'analytics'],
    journeyStages: ['results', 'disposition', 'discharge-admission'],
    subscriptionTier: 'starter',
    riskLevel: 'medium',
    status: 'active',
    actions: ['draft discharge summary', 'flag missing discharge data', 'route documentation review'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.NEEDS_WIRING,
      standaloneViability: 'partial',
      requiresEhrAccess: true,
      requiresIntegration: true,
      buyerPersonas: [
        ED_BUYER_PERSONAS.ED_DIRECTOR,
        ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER,
        ED_BUYER_PERSONAS.CLINICAL_INFORMATICS_LEAD,
      ],
      firstCustomerNote:
        'Demo with verified timeline and result facts; production needs EHR documentation and medication reconciliation sources.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-prior-authorization',
    title: 'Prior Authorization',
    description:
      'Prepares payer authorization packets for ED-linked admission, imaging, transfer, durable equipment, or follow-up services.',
    type: 'Administrative',
    trigger: 'Payer-sensitive disposition, admission, transfer, advanced imaging, or follow-up service identified.',
    inputs: ['payer', 'policy criteria', 'diagnosis context', 'orders/results', 'disposition plan'],
    outputs: ['prior authorization packet draft', 'evidence checklist', 'policy citation summary', 'review task'],
    requiredAssets: ['prior-auth-ai', REGISTRY.guidelineRag, REGISTRY.aiExplainability],
    requiredAI: ['prior-auth-drafting-agent', 'policy-evidence-matcher'],
    requiredIntegrations: ['payer policy API', 'EHR orders', 'document export queue'],
    humanReviewRequirement: 'Required before payer submission or external transmission.',
    workspaceVisibility: ['dashboard', 'documentation', 'referrals', 'automations', 'analytics'],
    journeyStages: ['disposition', 'discharge-admission'],
    subscriptionTier: 'enterprise',
    riskLevel: 'medium',
    status: 'active',
    actions: ['draft prior authorization packet', 'compile policy evidence', 'route review before submission'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.FUTURE_ROADMAP,
      standaloneViability: 'partial',
      requiresEhrAccess: true,
      requiresIntegration: true,
      buyerPersonas: [ED_BUYER_PERSONAS.COO, ED_BUYER_PERSONAS.CLINICAL_INFORMATICS_LEAD],
      firstCustomerNote:
        'Keep as enterprise roadmap unless payer policy, order, documentation, and export integrations are in scope.',
    }),
  }),
]);

export const EMERGENCY_AUTOMATION_MODULES_BY_ID = Object.freeze(
  Object.fromEntries(EMERGENCY_AUTOMATION_MODULES.map((automation) => [automation.automationId, automation]))
);

export const EMERGENCY_CORE_MVP_PACKAGE = Object.freeze({
  packageId: 'emergency-core-mvp',
  productId: 'emergency-core',
  title: 'Emergency Core',
  product: 'Emergency Department Solution',
  buyerPersonas: [
    ED_BUYER_PERSONAS.ED_DIRECTOR,
    ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER,
    ED_BUYER_PERSONAS.COO,
    ED_BUYER_PERSONAS.CLINICAL_INFORMATICS_LEAD,
  ],
  positioning:
    'Standalone ED triage, evidence, workflow guidance, and dashboard pilot.',
  implementationDependency: 'Low',
  ehrDependency: 'Not required for MVP pilot',
  integrationDependency: 'Not required for MVP pilot',
  billingMetric: 'Per ED site per month; optional clinician-seat expansion',
  trialPosture: '30-60 day pilot with manual/local data and no EHR writeback',
  humanReviewRequirement: 'Required for every clinical output',
  packageRule:
    'If a capability requires patient-specific EHR data, external workflow submission, device telemetry, payer policy access, telehealth intake, or staffing system integration, it is an add-on.',
  recommendation:
    'Lead first customer conversations with Emergency Core as a low-integration ED operating pilot.',
  upgradePath:
    'Add documentation, referrals, staffing, simulation, medical IoT, virtual ED, and prior authorization modules.',
  includedCapabilities: Object.freeze([
    Object.freeze({
      id: REGISTRY.qsofa,
      label: 'qSOFA',
      type: 'calculator',
      reason: 'High-value sepsis screening calculator for triage standardization.',
      dependencyPosture: 'Standalone/manual input',
    }),
    Object.freeze({
      id: REGISTRY.news2,
      label: 'NEWS2',
      type: 'calculator',
      reason: 'Broad deterioration screening score for abnormal vitals.',
      dependencyPosture: 'Standalone/manual input',
    }),
    Object.freeze({
      id: REGISTRY.heartScore,
      label: 'HEART',
      type: 'calculator',
      reason: 'Chest pain triage and risk workflow support.',
      dependencyPosture: 'Standalone/manual input',
    }),
    Object.freeze({
      id: REGISTRY.wellsPe,
      label: 'Wells PE',
      type: 'calculator',
      reason: 'Pulmonary embolism risk workflow support.',
      dependencyPosture: 'Standalone/manual input',
    }),
    Object.freeze({
      id: REGISTRY.wellsDvtCalculator,
      label: 'Wells DVT',
      type: 'calculator',
      reason: 'DVT risk workflow support and VTE context.',
      dependencyPosture: 'Standalone/manual input',
    }),
    Object.freeze({
      id: REGISTRY.shockIndex,
      label: 'Shock Index',
      type: 'calculator',
      reason: 'Simple hemodynamic risk signal for trauma, bleeding, and instability.',
      dependencyPosture: 'Standalone/manual input',
    }),
    Object.freeze({
      id: 'ai-assistant',
      label: 'AI Assistant',
      type: 'assistant',
      reason: 'Workspace-aware guidance and routing surface.',
      dependencyPosture: 'Available with current assistant flow',
    }),
    Object.freeze({
      id: 'protocol-retrieval',
      label: 'Protocol Retrieval',
      type: 'guidance',
      reason: 'Complaint-specific protocol and evidence surfacing.',
      dependencyPosture: 'Can start with configured/demo protocol content',
    }),
    Object.freeze({
      id: 'workflow-guidance',
      label: 'Workflow Guidance',
      type: 'guidance',
      reason: 'Routes clinicians to calculators, protocols, review steps, and next workflows.',
      dependencyPosture: 'Standalone guidance, no autonomous action',
    }),
    Object.freeze({
      id: 'workspace-dashboard',
      label: 'Workspace Dashboard',
      type: 'dashboard',
      reason: 'ED-specific command surface for the MVP story.',
      dependencyPosture: 'Can run with local/demo or manually loaded data',
    }),
  ]),
  includedAutomationIds: Object.freeze(['emergency-automated-triage-matrix']),
  includedAssetIds: Object.freeze([
    REGISTRY.qsofa,
    REGISTRY.news2,
    REGISTRY.heartScore,
    REGISTRY.wellsPe,
    REGISTRY.wellsDvtCalculator,
    REGISTRY.shockIndex,
    REGISTRY.guidelineRag,
  ]),
  includedWorkflowIds: Object.freeze(['protocol-retrieval', 'workflow-guidance']),
});

export const EMERGENCY_OPTIONAL_ADD_ONS = Object.freeze([
  Object.freeze({
    addOnId: 'documentation-integrity',
    title: 'Documentation Integrity',
    automationIds: ['emergency-documentation-integrity'],
    dependencyLevel: 'EHR notes, orders/results, and audit feeds',
    implementationDependency: 'Medium',
    billingMetric: 'Module add-on per ED site per month',
    trialPosture: 'Expansion pilot after Emergency Core acceptance',
    upgradeTier: 'professional',
  }),
  Object.freeze({
    addOnId: 'discharge-summary-drafting',
    title: 'Discharge Summary Drafting',
    automationIds: ['emergency-discharge-summary-drafting'],
    dependencyLevel: 'EHR documentation and medication reconciliation',
    implementationDependency: 'Medium',
    billingMetric: 'Module add-on per ED site per month',
    trialPosture: 'Expansion pilot after Emergency Core acceptance',
    upgradeTier: 'professional',
  }),
  Object.freeze({
    addOnId: 'referral-routing',
    title: 'Referral Routing',
    automationIds: ['emergency-referral-routing'],
    dependencyLevel: 'Provider directory, transfer center, referral workflow, secure messaging',
    implementationDependency: 'Medium',
    billingMetric: 'Module add-on per ED site per month',
    trialPosture: 'Workflow expansion after Emergency Core acceptance',
    upgradeTier: 'professional',
  }),
  Object.freeze({
    addOnId: 'surge-staffing',
    title: 'Surge Staffing',
    automationIds: ['emergency-surge-staffing'],
    dependencyLevel: 'Staff scheduling, bed board, ADT/census',
    implementationDependency: 'Medium',
    billingMetric: 'Module add-on per ED site per month',
    trialPosture: 'Operational expansion after Emergency Core acceptance',
    upgradeTier: 'professional',
  }),
  Object.freeze({
    addOnId: 'simulation-academy',
    title: 'Simulation Academy',
    automationIds: ['emergency-simulation-academy'],
    dependencyLevel: 'Standalone first, optional LMS integration',
    implementationDependency: 'Low',
    billingMetric: 'Module add-on per ED site per month',
    trialPosture: 'Standalone training pilot after Emergency Core acceptance',
    upgradeTier: 'professional',
  }),
  Object.freeze({
    addOnId: 'medical-iot-monitoring',
    title: 'Medical IoT Monitoring',
    automationIds: ['emergency-medical-iot-monitoring'],
    dependencyLevel: 'Device telemetry, monitor assignment, biomedical ticketing',
    implementationDependency: 'High',
    billingMetric: 'Module add-on per ED site per month',
    trialPosture: 'Device integration pilot after Emergency Core acceptance',
    upgradeTier: 'professional',
  }),
  Object.freeze({
    addOnId: 'virtual-ed',
    title: 'Virtual ED',
    automationIds: ['emergency-virtual-ed'],
    dependencyLevel: 'Telehealth, patient portal, EMS handoff, identity, EHR encounter feed',
    implementationDependency: 'High',
    billingMetric: 'Enterprise module add-on per ED site per month',
    trialPosture: 'Enterprise expansion after telehealth and identity scope are approved',
    upgradeTier: 'enterprise',
  }),
  Object.freeze({
    addOnId: 'prior-authorization',
    title: 'Prior Authorization',
    automationIds: ['emergency-prior-authorization'],
    dependencyLevel: 'Payer policy API, EHR orders, documentation export',
    implementationDependency: 'High',
    billingMetric: 'Enterprise module add-on per ED site per month',
    trialPosture: 'Enterprise roadmap expansion after payer and documentation integrations',
    upgradeTier: 'enterprise',
  }),
]);

export const EMERGENCY_SOLUTION_PACKAGES = Object.freeze([
  Object.freeze({
    productId: 'emergency-core',
    title: 'Emergency Core',
    tier: 'starter',
    mvpPackageId: EMERGENCY_CORE_MVP_PACKAGE.packageId,
    includedCapabilityIds: EMERGENCY_CORE_MVP_PACKAGE.includedCapabilities.map(
      (capability) => capability.id
    ),
    automationIds: [...EMERGENCY_CORE_MVP_PACKAGE.includedAutomationIds],
    optionalAddOnIds: EMERGENCY_OPTIONAL_ADD_ONS.map((addOn) => addOn.addOnId),
  }),
  Object.freeze({
    productId: 'emergency-professional',
    title: 'Emergency Professional',
    tier: 'professional',
    extendsProductId: 'emergency-core',
    automationIds: [
      'emergency-automated-triage-matrix',
      'emergency-referral-routing',
      'emergency-surge-staffing',
      'emergency-simulation-academy',
      'emergency-medical-iot-monitoring',
      'emergency-documentation-integrity',
      'emergency-rag-evidence-retrieval',
      'emergency-virtual-ed',
      'emergency-discharge-summary-drafting',
    ],
  }),
  Object.freeze({
    productId: 'emergency-enterprise',
    title: 'Emergency Enterprise',
    tier: 'enterprise',
    extendsProductId: 'emergency-professional',
    automationIds: EMERGENCY_AUTOMATION_MODULES.map((automation) => automation.automationId),
  }),
]);

export const EMERGENCY_FASTEST_TO_MARKET_OFFERINGS = Object.freeze([
  Object.freeze({
    id: 'ed-triage-calculator-pack',
    title: 'ED Triage Calculator Pack',
    classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
    capabilityIds: ['emergency-automated-triage-matrix'],
    sellableNow: 'Manual vitals, chief complaint, intake data, calculators, and clinician-review risk profile.',
  }),
  Object.freeze({
    id: 'ed-evidence-companion',
    title: 'ED Evidence Companion',
    classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
    capabilityIds: ['emergency-rag-evidence-retrieval'],
    sellableNow: 'Complaint-specific protocols, evidence, calculators, workflows, and simulations.',
  }),
  Object.freeze({
    id: 'simulation-academy-starter',
    title: 'Simulation Academy Starter',
    classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
    capabilityIds: ['emergency-simulation-academy'],
    sellableNow: 'Standalone emergency scenarios, practice assignments, and debrief prompts.',
  }),
  Object.freeze({
    id: 'ed-command-dashboard-pilot',
    title: 'ED Command Dashboard Pilot',
    classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
    capabilityIds: ['waiting-room', 'active-patients', 'high-risk-patients', 'critical-alerts'],
    sellableNow: 'ED operating queues using demo/local or manually loaded data before live ADT/EHR feeds.',
  }),
  Object.freeze({
    id: 'documentation-readiness-demo',
    title: 'Documentation Readiness Demo',
    classification: ED_READINESS_CLASSIFICATIONS.NEEDS_WIRING,
    capabilityIds: ['emergency-documentation-integrity', 'emergency-discharge-summary-drafting'],
    sellableNow: 'Review-required documentation gap and discharge draft workflow using verified pasted facts.',
  }),
]);

export const EMERGENCY_CUSTOMER_READINESS_CAPABILITIES = Object.freeze([
  Object.freeze({
    capabilityId: 'emergency-command-dashboard',
    title: 'ED Command Dashboard',
    classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
    standaloneViability: 'yes',
    requiresEhrAccess: false,
    requiresIntegration: false,
    buyerPersonas: [
      ED_BUYER_PERSONAS.COO,
      ED_BUYER_PERSONAS.ED_DIRECTOR,
      ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER,
    ],
    firstCustomerNote:
      'Sell as a command-center pilot with local/demo or manually loaded ED queue data before live census integration.',
  }),
  ...EMERGENCY_AUTOMATION_MODULES.map((automation) =>
    Object.freeze({
      capabilityId: automation.automationId,
      title: automation.title,
      ...automation.readiness,
    })
  ),
]);

export function getEmergencyJourneyStage(stageId) {
  return EMERGENCY_JOURNEY_BY_ID[stageId] || null;
}

export function getEmergencyAutomationModules() {
  return EMERGENCY_AUTOMATION_MODULES;
}

export function summarizeEmergencyCustomerReadiness(
  capabilities = EMERGENCY_CUSTOMER_READINESS_CAPABILITIES
) {
  return Object.freeze({
    total: capabilities.length,
    readyToSell: capabilities.filter(
      (capability) => capability.classification === ED_READINESS_CLASSIFICATIONS.READY_TO_SELL
    ).length,
    needsWiring: capabilities.filter(
      (capability) => capability.classification === ED_READINESS_CLASSIFICATIONS.NEEDS_WIRING
    ).length,
    needsIntegration: capabilities.filter(
      (capability) => capability.classification === ED_READINESS_CLASSIFICATIONS.NEEDS_INTEGRATION
    ).length,
    futureRoadmap: capabilities.filter(
      (capability) => capability.classification === ED_READINESS_CLASSIFICATIONS.FUTURE_ROADMAP
    ).length,
    standalone: capabilities.filter((capability) => capability.standaloneViability === 'yes').length,
    ehrRequired: capabilities.filter((capability) => capability.requiresEhrAccess).length,
    integrationRequired: capabilities.filter((capability) => capability.requiresIntegration).length,
  });
}

export function getEmergencyRagContextForComplaint(complaint = '') {
  const normalized = String(complaint).trim().toLowerCase();
  return (
    EMERGENCY_RAG_COMPLAINT_CONTEXT.find((context) =>
      context.complaint.toLowerCase().includes(normalized)
    ) ||
    EMERGENCY_RAG_COMPLAINT_CONTEXT.find((context) =>
      normalized.includes(context.complaint.toLowerCase())
    ) ||
    null
  );
}

function normalizeComplaintText(complaint = '') {
  return String(complaint).trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

export function routeEmergencyChiefComplaint(complaint = '') {
  const normalized = normalizeComplaintText(complaint);
  if (!normalized) {
    return null;
  }

  const route =
    EMERGENCY_CHIEF_COMPLAINT_ROUTES.find((candidate) =>
      candidate.aliases.some((alias) => {
        const normalizedAlias = normalizeComplaintText(alias);
        return normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized);
      })
    ) || null;

  if (!route) {
    return null;
  }

  return Object.freeze({
    ...route,
    matchedComplaint: complaint,
    ragContext: getEmergencyRagContextForComplaint(route.complaint),
    routingMode: 'workflow-guidance',
  });
}

function normalizeSelectedCalculator(calculator) {
  if (!calculator) return null;
  if (typeof calculator === 'string') {
    return Object.freeze({
      id: normalizeComplaintText(calculator).replace(/\s+/g, '-'),
      label: calculator,
    });
  }
  const label = calculator.label || calculator.name || calculator.id;
  if (!label) return null;
  return Object.freeze({
    id: calculator.id || normalizeComplaintText(label).replace(/\s+/g, '-'),
    label,
  });
}

function uniqueCalculators(calculators = []) {
  const seen = new Set();
  return Object.freeze(
    calculators
      .map(normalizeSelectedCalculator)
      .filter(Boolean)
      .filter((calculator) => {
        const key = calculator.id || calculator.label;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
  );
}

export function buildEmergencyCopilotGuidance(input = {}) {
  const complaint = String(input.complaint || '').trim();
  const vitals = String(input.vitals || input.vitalsSummary || '').trim();
  const workspaceContext = String(input.workspaceContext || 'Emergency Workspace').trim();
  const selectedCalculators = uniqueCalculators(input.selectedCalculators || []);
  const routedComplaint = routeEmergencyChiefComplaint(complaint);
  const recommendedTools = uniqueCalculators([
    ...(routedComplaint?.calculators || []),
    ...selectedCalculators,
  ]);
  const protocols = Object.freeze([...(routedComplaint?.protocols || [])]);
  const simulations = Object.freeze([...(routedComplaint?.ragContext?.simulations || [])]);
  const escalationSuggestions = Object.freeze([
    routedComplaint
      ? `Review ${routedComplaint.complaint} escalation criteria with a clinician before any action.`
      : 'Use manual clinician review because no complaint route matched.',
    vitals
      ? 'Vitals were provided; verify whether any local escalation threshold applies before acting.'
      : 'Capture vitals before using calculator or escalation guidance.',
    'Do not diagnose, order treatment, determine disposition, or autonomously escalate from Copilot output.',
  ]);
  const nextWorkflowStep = routedComplaint
    ? `${routedComplaint.workflows[0]}: open recommended tools, review protocols, and confirm next step with a clinician.`
    : 'Manual clinician review: select a supported complaint route or continue standard ED assessment.';

  return Object.freeze({
    copilotId: EMERGENCY_AI_COPILOT.copilotId,
    inputs: Object.freeze({
      complaint,
      vitals,
      workspaceContext,
      selectedCalculators,
    }),
    matchedRouteId: routedComplaint?.routeId || null,
    recommendedTools,
    protocols,
    nextWorkflowStep,
    simulations,
    escalationSuggestions,
    safetyBoundary: EMERGENCY_AI_COPILOT.safetyBoundary,
    reviewRequirement: EMERGENCY_AI_COPILOT.reviewRequirement,
    reasoning: Object.freeze([
      Object.freeze({
        output: 'recommendedTools',
        explanation: routedComplaint
          ? `${routedComplaint.complaint} matched a supported ED route, so route calculators and selected calculators are recommended for review.`
          : 'No complaint route matched, so no route-specific tools were added.',
      }),
      Object.freeze({
        output: 'protocols',
        explanation: routedComplaint
          ? `Protocols come from the matched ${routedComplaint.complaint} workflow route.`
          : 'Protocols require a supported complaint route or manual clinician selection.',
      }),
      Object.freeze({
        output: 'nextWorkflowStep',
        explanation: `Workspace context (${workspaceContext}) keeps the recommendation focused on ED workflow guidance.`,
      }),
      Object.freeze({
        output: 'simulations',
        explanation: routedComplaint?.ragContext?.simulations?.length
          ? 'Simulations come from complaint-specific ED context for training or practice support.'
          : 'No simulation was attached because the complaint route has no simulation context.',
      }),
      Object.freeze({
        output: 'escalationSuggestions',
        explanation: vitals
          ? 'Vitals context was provided, so escalation suggestions remind the user to verify local thresholds with a clinician.'
          : 'Vitals were not provided, so escalation suggestions ask the user to capture vitals first.',
      }),
    ]),
  });
}
