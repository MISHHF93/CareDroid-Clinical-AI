export const KNOWLEDGE_GRAPH_NODE_TYPES = Object.freeze([
  'calculator',
  'protocol',
  'simulation',
  'laboratory',
  'device',
  'ai-workflow',
]);

export const CLINICAL_KNOWLEDGE_GRAPH_NODES = Object.freeze([
  {
    id: 'qsofa',
    type: 'calculator',
    label: 'qSOFA',
    path: '/tools/calculators/qsofa',
    summary:
      'Bedside sepsis risk context using respiratory rate, systolic blood pressure, and mentation.',
    tags: ['sepsis', 'risk stratification', 'deterioration'],
  },
  {
    id: 'news2',
    type: 'calculator',
    label: 'NEWS2',
    path: '/tools/calculators/news2',
    summary: 'Early warning score for acute deterioration and escalation context.',
    tags: ['deterioration', 'sepsis', 'respiratory failure'],
  },
  {
    id: 'nihss',
    type: 'calculator',
    label: 'NIHSS',
    path: '/tools/calculators/nihss',
    summary: 'Stroke deficit severity documentation and communication score.',
    tags: ['stroke', 'neurology', 'severity'],
  },
  {
    id: 'protocol-sepsis',
    type: 'protocol',
    label: 'Sepsis pathway',
    path: '/protocols',
    summary:
      'Protocol pathway for suspected infection, lactate review, cultures, antimicrobials, fluids, and escalation.',
    tags: ['sepsis', 'lactate', 'qsofa'],
  },
  {
    id: 'protocol-stroke',
    type: 'protocol',
    label: 'Stroke alert pathway',
    path: '/protocols',
    summary:
      'Stroke alert pathway for last-known-well, NIHSS, imaging readiness, and neurology escalation.',
    tags: ['stroke', 'nihss', 'imaging'],
  },
  {
    id: 'simulation-sepsis',
    type: 'simulation',
    label: 'Sepsis deterioration simulation',
    path: '/simulation/sepsis-deterioration',
    summary:
      'Virtual patient scenario connecting vitals, lactate, antibiotics, escalation, and debrief.',
    tags: ['sepsis', 'simulation', 'debrief'],
  },
  {
    id: 'simulation-stroke',
    type: 'simulation',
    label: 'Stroke alert simulation',
    path: '/simulation/stroke-alert',
    summary:
      'Simulation scenario for stroke alert coordination, NIHSS documentation, and imaging workflow.',
    tags: ['stroke', 'simulation', 'team communication'],
  },
  {
    id: 'lab-lactate',
    type: 'laboratory',
    label: 'Lactate',
    path: '/laboratory',
    summary:
      'Critical perfusion and sepsis-trending laboratory value used in escalation workflows.',
    tags: ['sepsis', 'perfusion', 'critical lab'],
  },
  {
    id: 'lab-troponin',
    type: 'laboratory',
    label: 'Troponin',
    path: '/laboratory',
    summary: 'ACS biomarker linked to chest pain pathways and serial reassessment.',
    tags: ['ACS', 'cardiology', 'biomarker'],
  },
  {
    id: 'device-infusion-pump',
    type: 'device',
    label: 'Infusion pump',
    path: '/medical-iot',
    summary:
      'Medication and fluid delivery device connected to safety, alarm, and escalation workflows.',
    tags: ['device', 'medication safety', 'alarm'],
  },
  {
    id: 'device-monitor',
    type: 'device',
    label: 'Bedside monitor',
    path: '/medical-iot',
    summary:
      'Vital-sign telemetry source for deterioration, respiratory failure, and simulation workflows.',
    tags: ['device', 'vitals', 'telemetry'],
  },
  {
    id: 'ai-cds',
    type: 'ai-workflow',
    label: 'Clinical Decision Support Engine',
    path: '/clinical-decision-support',
    summary:
      'AI-assisted recommendation workflow using symptoms, calculators, protocols, labs, imaging, and escalation.',
    tags: ['AI workflow', 'recommendations', 'explainability'],
  },
  {
    id: 'ai-documentation',
    type: 'ai-workflow',
    label: 'Clinical Documentation Assistant',
    path: '/documentation',
    summary:
      'AI documentation workflow for note drafts, encounter summaries, patient instructions, and export.',
    tags: ['AI workflow', 'documentation', 'export'],
  },
]);

export const CLINICAL_KNOWLEDGE_GRAPH_EDGES = Object.freeze([
  {
    source: 'protocol-sepsis',
    target: 'qsofa',
    relation: 'uses calculator',
    rationale: 'Sepsis pathway uses qSOFA for bedside risk context.',
  },
  {
    source: 'protocol-sepsis',
    target: 'news2',
    relation: 'uses calculator',
    rationale: 'Sepsis pathway can use NEWS2 for deterioration escalation.',
  },
  {
    source: 'protocol-sepsis',
    target: 'lab-lactate',
    relation: 'requires lab',
    rationale: 'Lactate trends support perfusion and shock reassessment.',
  },
  {
    source: 'protocol-sepsis',
    target: 'simulation-sepsis',
    relation: 'trained by simulation',
    rationale: 'Simulation rehearses recognition, treatment timing, and escalation.',
  },
  {
    source: 'simulation-sepsis',
    target: 'device-monitor',
    relation: 'uses device signal',
    rationale: 'Simulation vitals are driven by bedside monitoring changes.',
  },
  {
    source: 'simulation-sepsis',
    target: 'device-infusion-pump',
    relation: 'uses device workflow',
    rationale: 'Fluids and medications depend on device safety checks.',
  },
  {
    source: 'protocol-stroke',
    target: 'nihss',
    relation: 'uses calculator',
    rationale: 'NIHSS structures stroke deficit documentation.',
  },
  {
    source: 'protocol-stroke',
    target: 'simulation-stroke',
    relation: 'trained by simulation',
    rationale: 'Simulation rehearses team coordination and imaging readiness.',
  },
  {
    source: 'ai-cds',
    target: 'protocol-sepsis',
    relation: 'recommends protocol',
    rationale: 'CDS can recommend the sepsis pathway when infection signals are present.',
  },
  {
    source: 'ai-cds',
    target: 'protocol-stroke',
    relation: 'recommends protocol',
    rationale: 'CDS can recommend stroke alert workflows when neurologic deficits are present.',
  },
  {
    source: 'ai-cds',
    target: 'lab-lactate',
    relation: 'recommends lab',
    rationale: 'CDS can suggest lactate for suspected infection with deterioration.',
  },
  {
    source: 'ai-cds',
    target: 'lab-troponin',
    relation: 'recommends lab',
    rationale: 'CDS can suggest troponin for ACS-compatible presentations.',
  },
  {
    source: 'ai-documentation',
    target: 'protocol-sepsis',
    relation: 'documents pathway',
    rationale: 'Documentation assistant can summarize pathway-driven encounter decisions.',
  },
  {
    source: 'ai-documentation',
    target: 'simulation-sepsis',
    relation: 'documents debrief',
    rationale: 'Documentation assistant can produce reviewed-required simulation summaries.',
  },
]);

export function getKnowledgeGraphNode(nodeId) {
  return CLINICAL_KNOWLEDGE_GRAPH_NODES.find((node) => node.id === nodeId);
}

export function getKnowledgeGraphNeighbors(nodeId) {
  return CLINICAL_KNOWLEDGE_GRAPH_EDGES.filter(
    (edge) => edge.source === nodeId || edge.target === nodeId,
  )
    .map((edge) => {
      const neighborId = edge.source === nodeId ? edge.target : edge.source;
      return { edge, node: getKnowledgeGraphNode(neighborId) };
    })
    .filter((item) => item.node);
}

export function searchKnowledgeGraph(query = '', type = 'all') {
  const normalizedQuery = String(query).trim().toLowerCase();
  return CLINICAL_KNOWLEDGE_GRAPH_NODES.filter((node) => {
    const typeMatches = type === 'all' || node.type === type;
    const textMatches =
      !normalizedQuery ||
      [node.label, node.type, node.summary, ...node.tags]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    return typeMatches && textMatches;
  });
}

export function buildKnowledgeGraphSnapshot({
  query = '',
  type = 'all',
  selectedNodeId,
}: any = {}) {
  const nodes = searchKnowledgeGraph(query, type);
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const edges = CLINICAL_KNOWLEDGE_GRAPH_EDGES.filter(
    (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
  );
  const selectedNode =
    getKnowledgeGraphNode(selectedNodeId) || nodes[0] || CLINICAL_KNOWLEDGE_GRAPH_NODES[0];

  return {
    nodes,
    edges,
    selectedNode,
    neighbors: selectedNode ? getKnowledgeGraphNeighbors(selectedNode.id) : [],
    counts: KNOWLEDGE_GRAPH_NODE_TYPES.reduce(
      (counts, nodeType) => ({
        ...counts,
        [nodeType]: CLINICAL_KNOWLEDGE_GRAPH_NODES.filter((node) => node.type === nodeType).length,
      }),
      {},
    ),
  };
}

export function buildKnowledgeGraphAiPrompt(node) {
  const selectedNode = node || CLINICAL_KNOWLEDGE_GRAPH_NODES[0];
  const neighbors = getKnowledgeGraphNeighbors(selectedNode.id);
  return [
    `Open the Clinical Knowledge Graph and explain the selected node: ${selectedNode.label}.`,
    `Type: ${selectedNode.type}.`,
    `Summary: ${selectedNode.summary}`,
    `Relationships: ${neighbors.map(({ edge, node: relatedNode }) => `${edge.relation} ${relatedNode!.label}`).join('; ') || 'No direct relationships'}.`,
    'Explain how calculators, protocols, simulations, labs, devices, and AI workflows connect. Keep this as clinical decision support only.',
  ].join('\n');
}
