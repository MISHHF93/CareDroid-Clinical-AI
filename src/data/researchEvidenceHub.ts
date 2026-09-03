import { PROTOCOL_PATHWAYS } from './protocolPathwayLibrary';
import { SIMULATION_SCENARIOS } from './medicalSimulationCatalog';

export const RESEARCH_HUB_SECTIONS = Object.freeze([
  'literature-library',
  'guideline-library',
  'evidence-summaries',
  'study-tracker',
  'citation-explorer',
]);

export const LITERATURE_LIBRARY = Object.freeze([
  {
    id: 'early-sepsis-bundle-review',
    title: 'Early Sepsis Bundle Timing Review',
    source: 'Demo Evidence Digest',
    year: 2026,
    studyType: 'Systematic review',
    population: 'Adults with suspected sepsis or septic shock',
    evidenceLevel: 'Moderate certainty',
    summary:
      'Earlier recognition, lactate review, cultures, antibiotics, fluids, and reassessment are associated with safer escalation workflows.',
    linkedProtocolIds: ['sepsis'],
    linkedSimulationIds: ['sepsis-deterioration', 'abnormal-lab-escalation'],
    citations: ['demo-sepsis-review-2026', 'demo-surviving-sepsis-2025'],
  },
  {
    id: 'acs-risk-stratification-cohort',
    title: 'Chest Pain Risk Stratification Cohort',
    source: 'Demo Cardiology Registry',
    year: 2025,
    studyType: 'Prospective cohort',
    population: 'Emergency department adults with possible ACS',
    evidenceLevel: 'Moderate certainty',
    summary:
      'Serial ECG/troponin review with structured risk tools improves documentation and helps identify patients needing cardiology escalation.',
    linkedProtocolIds: ['acs'],
    linkedSimulationIds: ['chest-pain-acs'],
    citations: ['demo-acs-cohort-2025'],
  },
  {
    id: 'stroke-alert-door-to-imaging',
    title: 'Stroke Alert Door-to-Imaging Workflow',
    source: 'Demo Neuro Quality Collaborative',
    year: 2025,
    studyType: 'Quality improvement study',
    population: 'Patients activated through stroke alert pathways',
    evidenceLevel: 'Low to moderate certainty',
    summary:
      'Clear last-known-well capture, glucose checks, and imaging coordination reduce avoidable delays in time-sensitive stroke workflows.',
    linkedProtocolIds: ['stroke'],
    linkedSimulationIds: ['stroke-alert'],
    citations: ['demo-stroke-workflow-2025'],
  },
  {
    id: 'respiratory-failure-escalation',
    title: 'Respiratory Failure Escalation Signals',
    source: 'Demo Critical Care Library',
    year: 2026,
    studyType: 'Narrative review',
    population: 'Adults with hypoxemic or hypercapnic respiratory failure',
    evidenceLevel: 'Consensus-informed',
    summary:
      'Work of breathing, mentation, ABG/VBG trend, and oxygen delivery changes should be reviewed together rather than by oxygen saturation alone.',
    linkedProtocolIds: ['respiratory-failure'],
    linkedSimulationIds: ['respiratory-failure'],
    citations: ['demo-respiratory-review-2026'],
  },
]);

export const GUIDELINE_LIBRARY = Object.freeze([
  {
    id: 'sepsis-guideline',
    title: 'Sepsis Recognition and Escalation Guideline',
    publisher: 'Demo Critical Care Council',
    version: 'v2026.05',
    status: 'demo-guideline-summary',
    domain: 'Emergency / Critical Care',
    keyRecommendations: [
      'Use structured screening as decision support, not as a standalone diagnosis.',
      'Trend lactate and perfusion markers when shock physiology is possible.',
      'Escalate persistent hypotension, elevated lactate, or organ dysfunction.',
    ],
    linkedProtocolIds: ['sepsis'],
    linkedSimulationIds: ['sepsis-deterioration'],
  },
  {
    id: 'acs-guideline',
    title: 'Acute Chest Pain and ACS Guideline',
    publisher: 'Demo Cardiology Council',
    version: 'v2026.04',
    status: 'demo-guideline-summary',
    domain: 'Cardiology',
    keyRecommendations: [
      'Obtain immediate ECG and repeat if symptoms persist or the first ECG is nondiagnostic.',
      'Use serial biomarkers and risk calculators as context for clinician review.',
      'Escalate STEMI, instability, refractory symptoms, or malignant arrhythmia.',
    ],
    linkedProtocolIds: ['acs'],
    linkedSimulationIds: ['chest-pain-acs'],
  },
  {
    id: 'stroke-guideline',
    title: 'Stroke Alert Coordination Guideline',
    publisher: 'Demo Neurology Network',
    version: 'v2026.03',
    status: 'demo-guideline-summary',
    domain: 'Neurology',
    keyRecommendations: [
      'Capture last-known-well, anticoagulant exposure, glucose, and baseline function.',
      'Coordinate imaging and neurology escalation without delaying local pathway activation.',
      'Use NIHSS to structure deficit documentation and handoff.',
    ],
    linkedProtocolIds: ['stroke'],
    linkedSimulationIds: ['stroke-alert'],
  },
  {
    id: 'respiratory-guideline',
    title: 'Respiratory Failure Escalation Guideline',
    publisher: 'Demo Pulmonary Critical Care Group',
    version: 'v2026.05',
    status: 'demo-guideline-summary',
    domain: 'Respiratory / ICU',
    keyRecommendations: [
      'Assess oxygenation, ventilation, work of breathing, perfusion, and mental status together.',
      'Review ABG/VBG context with oxygen delivery and suspected physiology.',
      'Escalate exhaustion, altered mentation, refractory hypoxemia, or severe acidosis.',
    ],
    linkedProtocolIds: ['respiratory-failure'],
    linkedSimulationIds: ['respiratory-failure'],
  },
]);

export const EVIDENCE_SUMMARIES = Object.freeze([
  {
    id: 'sepsis-escalation-summary',
    topic: 'Sepsis escalation',
    certainty: 'Moderate',
    bottomLine:
      'Early recognition plus repeat reassessment is the safest operational pattern; single scores should never replace bedside review.',
    findings: [
      'qSOFA/NEWS2/SOFA can structure risk context when interpreted alongside infection concern.',
      'Lactate, hypotension, mental status, renal function, and oxygen needs are high-value trend signals.',
      'Simulation practice should emphasize repeat reassessment and escalation communication.',
    ],
    linkedProtocolIds: ['sepsis'],
    linkedSimulationIds: ['sepsis-deterioration', 'abnormal-lab-escalation'],
    citationIds: ['demo-sepsis-review-2026', 'demo-surviving-sepsis-2025'],
  },
  {
    id: 'acs-evidence-summary',
    topic: 'ACS chest pain triage',
    certainty: 'Moderate',
    bottomLine:
      'Serial ECG/troponin workflow and structured calculator context support safer escalation, but disposition remains clinician-led.',
    findings: [
      'Repeat ECG and biomarkers are central when symptoms persist or evolve.',
      'HEART, TIMI, and GRACE support communication and documentation.',
      'Simulation should practice evolving symptoms and handoff under uncertainty.',
    ],
    linkedProtocolIds: ['acs'],
    linkedSimulationIds: ['chest-pain-acs'],
    citationIds: ['demo-acs-cohort-2025'],
  },
  {
    id: 'stroke-evidence-summary',
    topic: 'Stroke alert workflow',
    certainty: 'Low to moderate',
    bottomLine:
      'Time-critical stroke workflows depend on reliable last-known-well capture, glucose check, imaging coordination, and neurology escalation.',
    findings: [
      'Workflow clarity reduces avoidable delay more reliably than isolated reminders.',
      'NIHSS helps structure communication, not treatment eligibility by itself.',
      'Team simulations should include role clarity and imaging readiness.',
    ],
    linkedProtocolIds: ['stroke'],
    linkedSimulationIds: ['stroke-alert'],
    citationIds: ['demo-stroke-workflow-2025'],
  },
]);

export const STUDY_TRACKER = Object.freeze([
  {
    id: 'study-sepsis-escalation',
    title: 'Sepsis Escalation Simulation Outcomes',
    owner: 'Simulation program',
    status: 'In review',
    nextMilestone: 'Compare pre/post debrief action completion',
    linkedProtocolIds: ['sepsis'],
    linkedSimulationIds: ['sepsis-deterioration'],
  },
  {
    id: 'study-acs-pathway-adoption',
    title: 'ACS Pathway Adoption Audit',
    owner: 'Cardiology quality team',
    status: 'Collecting data',
    nextMilestone: 'Review serial ECG documentation completeness',
    linkedProtocolIds: ['acs'],
    linkedSimulationIds: ['chest-pain-acs'],
  },
  {
    id: 'study-stroke-handoff',
    title: 'Stroke Alert Handoff Reliability',
    owner: 'Neurology operations',
    status: 'Protocol mapping',
    nextMilestone: 'Map handoff fields to simulation checklist',
    linkedProtocolIds: ['stroke'],
    linkedSimulationIds: ['stroke-alert'],
  },
]);

export const CITATION_EXPLORER = Object.freeze([
  {
    id: 'demo-sepsis-review-2026',
    title: 'Demo review: sepsis bundle timing and reassessment',
    source: 'CareDroid demo evidence source',
    year: 2026,
    citationType: 'Systematic review',
    linkedSummaryId: 'sepsis-escalation-summary',
  },
  {
    id: 'demo-surviving-sepsis-2025',
    title: 'Demo guideline digest: surviving sepsis updates',
    source: 'CareDroid demo guideline digest',
    year: 2025,
    citationType: 'Guideline digest',
    linkedSummaryId: 'sepsis-escalation-summary',
  },
  {
    id: 'demo-acs-cohort-2025',
    title: 'Demo cohort: serial ECG/troponin chest pain pathways',
    source: 'CareDroid demo cardiology registry',
    year: 2025,
    citationType: 'Prospective cohort',
    linkedSummaryId: 'acs-evidence-summary',
  },
  {
    id: 'demo-stroke-workflow-2025',
    title: 'Demo QI study: stroke alert door-to-imaging workflow',
    source: 'CareDroid demo neuro collaborative',
    year: 2025,
    citationType: 'Quality improvement',
    linkedSummaryId: 'stroke-evidence-summary',
  },
  {
    id: 'demo-respiratory-review-2026',
    title: 'Demo review: respiratory failure escalation signals',
    source: 'CareDroid demo critical care library',
    year: 2026,
    citationType: 'Narrative review',
    linkedSummaryId: null,
  },
]);

const protocolById = new Map(PROTOCOL_PATHWAYS.map((protocol) => [protocol.id, protocol]));
const simulationById = new Map(SIMULATION_SCENARIOS.map((scenario) => [scenario.id, scenario]));

export function resolveResearchWorkflowLinks(item) {
  return {
    protocols: (item.linkedProtocolIds || []).map((id) => {
      const protocol = protocolById.get(id);
      return {
        id,
        label: protocol?.title || id,
        path: '/protocols',
      };
    }),
    simulations: (item.linkedSimulationIds || []).map((id) => {
      const simulation = simulationById.get(id);
      return {
        id,
        label: simulation?.title || id,
        path: `/simulation/${id}`,
      };
    }),
  };
}

export function getResearchHubSnapshot() {
  return {
    sourceStatus: 'demo-evidence-library',
    safetyLabel: 'Demo evidence summaries - verify against local policy and source literature',
    literatureCount: LITERATURE_LIBRARY.length,
    guidelineCount: GUIDELINE_LIBRARY.length,
    evidenceSummaryCount: EVIDENCE_SUMMARIES.length,
    trackedStudyCount: STUDY_TRACKER.length,
    citationCount: CITATION_EXPLORER.length,
  };
}

function matchesQuery(item, query) {
  const haystack = Object.values(item)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export function searchResearchHub(query = '') {
  const normalizedQuery = String(query).trim().toLowerCase();
  if (!normalizedQuery) {
    return {
      literature: LITERATURE_LIBRARY,
      guidelines: GUIDELINE_LIBRARY,
      summaries: EVIDENCE_SUMMARIES,
      studies: STUDY_TRACKER,
      citations: CITATION_EXPLORER,
    };
  }

  return {
    literature: LITERATURE_LIBRARY.filter((item) => matchesQuery(item, normalizedQuery)),
    guidelines: GUIDELINE_LIBRARY.filter((item) => matchesQuery(item, normalizedQuery)),
    summaries: EVIDENCE_SUMMARIES.filter((item) => matchesQuery(item, normalizedQuery)),
    studies: STUDY_TRACKER.filter((item) => matchesQuery(item, normalizedQuery)),
    citations: CITATION_EXPLORER.filter((item) => matchesQuery(item, normalizedQuery)),
  };
}

export function buildEvidenceSummaryPrompt(summary = EVIDENCE_SUMMARIES[0]) {
  return [
    `Summarize the evidence for: ${summary.topic}.`,
    `Bottom line: ${summary.bottomLine}`,
    `Findings: ${summary.findings.join('; ')}`,
    `Citations: ${summary.citationIds.join(', ')}`,
    'Keep the output as clinical decision support, cite uncertainty, and mention linked protocol/simulation use.',
  ].join('\n');
}

export function buildGuidelineComparisonPrompt(guidelines = GUIDELINE_LIBRARY.slice(0, 2)) {
  return [
    'Compare these guideline summaries and identify agreement, differences, and implementation notes.',
    ...guidelines.map(
      (guideline) =>
        `${guideline.title} (${guideline.version}): ${guideline.keyRecommendations.join('; ')}`,
    ),
    'Return concise bullets and state that source verification is required.',
  ].join('\n');
}

export function buildEvidenceBriefPrompt(topic = 'sepsis escalation') {
  const results = searchResearchHub(topic);
  const summary = results.summaries[0] || EVIDENCE_SUMMARIES[0];
  const links = resolveResearchWorkflowLinks(summary);

  return [
    `Generate an evidence brief for: ${summary.topic}.`,
    `Bottom line: ${summary.bottomLine}`,
    `Findings: ${summary.findings.join('; ')}`,
    `Linked protocols: ${links.protocols.map((link) => link.label).join(', ') || 'None'}.`,
    `Linked simulations: ${links.simulations.map((link) => link.label).join(', ') || 'None'}.`,
    'Include clinical caveats, implementation steps, and citation placeholders.',
  ].join('\n');
}
