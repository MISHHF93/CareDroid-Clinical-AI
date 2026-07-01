export const COMPETENCY_DOMAINS = Object.freeze([
  'Simulation completion',
  'Skill completion',
  'Certifications',
  'CME progress',
  'Training status',
  'Competency gaps',
]);

export const DEMO_COMPETENCY_RECORDS = Object.freeze([
  {
    id: 'sepsis-simulation-completion',
    title: 'Sepsis Deterioration Simulation',
    type: 'simulation',
    domain: 'Emergency stabilization',
    status: 'completed',
    progress: 100,
    completedAt: '2026-05-29',
    evidence: 'Simulation debrief completed with qSOFA and escalation checklist.',
  },
  {
    id: 'stroke-alert-simulation',
    title: 'Stroke Alert Simulation',
    type: 'simulation',
    domain: 'Neurologic emergency',
    status: 'in-progress',
    progress: 68,
    completedAt: null,
    evidence: 'NIHSS workflow started; final debrief pending.',
  },
  {
    id: 'medication-reconciliation',
    title: 'Medication Reconciliation Skill',
    type: 'skill',
    domain: 'Medication safety',
    status: 'completed',
    progress: 100,
    completedAt: '2026-05-27',
    evidence: 'Duplicate anticoagulant safety event completed.',
  },
  {
    id: 'closed-loop-handoff',
    title: 'Closed-loop Team Handoff',
    type: 'skill',
    domain: 'Team communication',
    status: 'needs-practice',
    progress: 54,
    completedAt: null,
    evidence: 'Missed role assignment in surge simulation.',
  },
  {
    id: 'critical-lab-escalation',
    title: 'Critical Lab Escalation',
    type: 'skill',
    domain: 'Laboratory escalation',
    status: 'needs-practice',
    progress: 61,
    completedAt: null,
    evidence: 'Needs faster potassium/lactate closed-loop notification.',
  },
]);

export const DEMO_CREDENTIAL_RECORDS = Object.freeze([
  {
    id: 'acls',
    title: 'ACLS Certification',
    status: 'active',
    expiresAt: '2027-04-18',
    issuer: 'Demo Credentialing Board',
    credits: 8,
  },
  {
    id: 'bls',
    title: 'BLS Certification',
    status: 'active',
    expiresAt: '2027-01-12',
    issuer: 'Demo Credentialing Board',
    credits: 4,
  },
  {
    id: 'stroke-ready',
    title: 'Stroke Ready Training',
    status: 'renewal-due',
    expiresAt: '2026-07-30',
    issuer: 'CareDroid Training Program',
    credits: 3,
  },
  {
    id: 'sepsis-quality-cme',
    title: 'Sepsis Quality CME',
    status: 'in-progress',
    expiresAt: null,
    issuer: 'CareDroid CME Library',
    credits: 2,
  },
]);

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function percent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildCompetencyCredentialingSnapshot({ role = 'medical student', specialty = 'medical education' }: any = {}) {
  const normalizedRole = normalize(role);
  const isOperations = normalizedRole.includes('operations') || normalizedRole.includes('fleet');
  const isBiomedical = normalizedRole.includes('biomedical');
  const roleSpecificGaps = isOperations
    ? ['Mass casualty command role assignment', 'Bed surge documentation']
    : isBiomedical
      ? ['Device alarm failure handoff', 'Telemetry reliability documentation']
      : ['Critical lab escalation speed', 'Closed-loop communication under time pressure'];

  const simulationRecords = DEMO_COMPETENCY_RECORDS.filter((record) => record.type === 'simulation');
  const skillRecords = DEMO_COMPETENCY_RECORDS.filter((record) => record.type === 'skill');
  const completedCompetencies = DEMO_COMPETENCY_RECORDS.filter((record) => record.status === 'completed').length;
  const activeCredentials = DEMO_CREDENTIAL_RECORDS.filter((record) => record.status === 'active').length;
  const cmeCreditsEarned = DEMO_CREDENTIAL_RECORDS.reduce((total, record) => total + record.credits, 0);
  const averageProgress =
    DEMO_COMPETENCY_RECORDS.reduce((total, record) => total + record.progress, 0) / DEMO_COMPETENCY_RECORDS.length;

  return {
    sourceStatus: 'demo-local-state',
    safetyLabel: 'Credentialing support only - verify official records with your institution',
    profileContext: {
      role,
      specialty,
    },
    summary: {
      simulationCompletion: percent(
        (simulationRecords.filter((record) => record.status === 'completed').length / simulationRecords.length) * 100
      ),
      skillCompletion: percent(
        (skillRecords.filter((record) => record.status === 'completed').length / skillRecords.length) * 100
      ),
      completedCompetencies,
      totalCompetencies: DEMO_COMPETENCY_RECORDS.length,
      activeCredentials,
      totalCredentials: DEMO_CREDENTIAL_RECORDS.length,
      cmeCreditsEarned,
      cmeCreditsTarget: 20,
      trainingStatus: averageProgress >= 80 ? 'on-track' : 'needs-practice',
      overallReadiness: percent(averageProgress),
    },
    competencyRecords: DEMO_COMPETENCY_RECORDS,
    credentialRecords: DEMO_CREDENTIAL_RECORDS,
    competencyGaps: roleSpecificGaps,
    recommendedActions: [
      'Complete pending stroke alert debrief',
      'Repeat critical lab escalation scenario',
      'Upload external CME certificates when credential storage is available',
    ],
  };
}
