export const KNOWLEDGE_HUB_TYPES = Object.freeze([
  'protocol',
  'pathway',
  'calculator',
  'simulation',
  'ai_guidance',
  'documentation',
]);

export const KNOWLEDGE_HUB_ITEMS = Object.freeze([
  {
    id: 'protocol-sepsis',
    title: 'Sepsis escalation protocol',
    type: 'protocol',
    description:
      'Evidence-backed recognition, escalation, and treatment timing for sepsis workflows.',
    route: '/protocols',
    specialties: ['emergency', 'icu'],
    roles: ['clinician', 'nurse'],
    workspaces: ['emergency', 'icu'],
    departments: ['emergency', 'patient-safety'],
    evidence: ['Protocol library', 'Emergency workflow usage', 'AI triage guidance'],
  },
  {
    id: 'pathway-chest-pain',
    title: 'Chest pain care pathway',
    type: 'pathway',
    description: 'Stepwise emergency-to-cardiology pathway for chest pain evaluation and handoff.',
    route: '/care-pathways',
    specialties: ['emergency', 'cardiology'],
    roles: ['clinician', 'nurse'],
    workspaces: ['emergency', 'cardiology'],
    departments: ['emergency'],
    evidence: ['Care pathway catalog', 'Workflow builder chain', 'Cardiology handoff'],
  },
  {
    id: 'calculator-qsofa',
    title: 'qSOFA calculator',
    type: 'calculator',
    description: 'Rapid bedside risk scoring calculator for suspected sepsis deterioration.',
    route: '/tools/calculators/qsofa',
    specialties: ['emergency', 'icu'],
    roles: ['clinician', 'student'],
    workspaces: ['emergency', 'icu'],
    departments: ['emergency'],
    evidence: ['Calculator library', 'Search launch behavior', 'Emergency triage workflow'],
  },
  {
    id: 'simulation-code-blue',
    title: 'Code Blue simulation readiness',
    type: 'simulation',
    description: 'Simulation scenario for resuscitation team readiness and competency review.',
    route: '/simulation',
    specialties: ['emergency', 'education'],
    roles: ['educator', 'clinician', 'student'],
    workspaces: ['simulation', 'education', 'emergency'],
    departments: ['education', 'emergency'],
    evidence: ['Simulation suite', 'Competency module', 'Training dashboard'],
  },
  {
    id: 'ai-guidance-documentation',
    title: 'Clinical documentation AI guidance',
    type: 'ai_guidance',
    description:
      'AI guidance for structured notes, summaries, order sets, and explainable documentation.',
    route: '/documentation',
    specialties: ['emergency', 'cardiology', 'laboratory'],
    roles: ['clinician', 'nurse'],
    workspaces: ['emergency', 'cardiology', 'laboratory'],
    departments: ['emergency', 'laboratory'],
    evidence: ['Documentation assistant', 'Patient summary AI', 'Order set AI'],
  },
  {
    id: 'documentation-integration-readiness',
    title: 'Integration readiness documentation',
    type: 'documentation',
    description:
      'Operational documentation for FHIR, HL7, identity, lab, and enterprise integration readiness.',
    route: '/integration-readiness',
    specialties: ['operations', 'governance', 'laboratory'],
    roles: ['administrator', 'operations-leader', 'compliance-leader'],
    workspaces: ['operations', 'governance', 'laboratory'],
    departments: ['operations', 'governance', 'laboratory'],
    evidence: [
      'Integration readiness center',
      'Governance review',
      'Laboratory interface planning',
    ],
  },
]);

export const KNOWLEDGE_HUB_FACETS = Object.freeze({
  specialties: [
    'emergency',
    'icu',
    'cardiology',
    'laboratory',
    'operations',
    'education',
    'governance',
  ],
  roles: [
    'clinician',
    'nurse',
    'educator',
    'administrator',
    'operations-leader',
    'compliance-leader',
    'student',
  ],
  workspaces: [
    'emergency',
    'icu',
    'cardiology',
    'laboratory',
    'operations',
    'simulation',
    'education',
    'governance',
  ],
  departments: [
    'emergency',
    'laboratory',
    'operations',
    'education',
    'governance',
    'patient-safety',
  ],
});

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function itemMatchesText(item, query) {
  const needle = normalize(query);
  if (!needle) return true;
  return [
    item.title,
    item.description,
    item.type,
    ...item.specialties,
    ...item.roles,
    ...item.workspaces,
    ...item.departments,
    ...item.evidence,
  ].some((value) => normalize(value).includes(needle));
}

function itemMatchesFacet(item, facetName, value) {
  if (!value || value === 'all') return true;
  return (item[facetName] || []).includes(value);
}

export function filterHealthcareKnowledgeHubItems({
  query = '',
  specialty = 'all',
  role = 'all',
  workspace = 'all',
  department = 'all',
  items = KNOWLEDGE_HUB_ITEMS,
}: any = {}) {
  return items.filter(
    (item) =>
      itemMatchesText(item, query) &&
      itemMatchesFacet(item, 'specialties', specialty) &&
      itemMatchesFacet(item, 'roles', role) &&
      itemMatchesFacet(item, 'workspaces', workspace) &&
      itemMatchesFacet(item, 'departments', department),
  );
}

export function buildHealthcareKnowledgeHub(filters: any = {}) {
  const results = filterHealthcareKnowledgeHubItems(filters);
  const typeCounts = KNOWLEDGE_HUB_TYPES.reduce((counts, type) => {
    counts[type] = results.filter((item) => item.type === type).length;
    return counts;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    facets: KNOWLEDGE_HUB_FACETS,
    types: KNOWLEDGE_HUB_TYPES,
    results,
    typeCounts,
    summary: {
      totalItems: KNOWLEDGE_HUB_ITEMS.length,
      resultCount: results.length,
      representedTypeCount: KNOWLEDGE_HUB_TYPES.filter((type) => typeCounts[type] > 0).length,
      specialtyCount: KNOWLEDGE_HUB_FACETS.specialties.length,
      roleCount: KNOWLEDGE_HUB_FACETS.roles.length,
      workspaceCount: KNOWLEDGE_HUB_FACETS.workspaces.length,
      departmentCount: KNOWLEDGE_HUB_FACETS.departments.length,
    },
  };
}
