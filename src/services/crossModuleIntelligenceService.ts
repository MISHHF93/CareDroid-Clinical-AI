import { getHubChatAssistedTools } from '../data/calculatorHubManifest';
import { SIMULATION_SCENARIOS } from '../data/medicalSimulationCatalog';
import { PROTOCOL_PATHWAYS } from '../data/protocolPathwayLibrary';

const MODULE_LIST = Object.freeze([
  {
    id: 'simulation',
    label: 'Simulation',
    route: '/simulation',
    group: 'simulation-lab-viewer',
    summary: 'Scenario training and debriefing',
  },
  {
    id: 'laboratory',
    label: 'Laboratory',
    route: '/laboratory',
    group: 'simulation-lab-viewer',
    summary: 'Lab interpretation, specimen queues, and abnormal result context',
  },
  {
    id: 'medical-3d-viewer',
    label: '3D Viewer',
    route: '/3d-viewer',
    group: 'simulation-lab-viewer',
    summary: 'Anatomy and model review surface',
  },
  {
    id: 'hospital-map',
    label: 'Hospital Map',
    route: '/hospital-map',
    group: 'operations',
    summary: 'Room, bed, unit, and device location context',
  },
  {
    id: 'fleet',
    label: 'Fleet',
    route: '/fleet/map',
    group: 'operations',
    summary: 'Vehicle movement, routes, dispatch, and maintenance context',
  },
  {
    id: 'medical-iot',
    label: 'Medical IoT',
    route: '/medical-iot',
    group: 'operations',
    summary: 'Device telemetry, alerts, freshness, and vitals',
  },
  {
    id: 'protocols',
    label: 'Protocols',
    route: '/protocols',
    group: 'decision-support',
    summary: 'Clinical pathway and guideline support',
  },
  {
    id: 'calculators',
    label: 'Calculators',
    route: '/emergency/tools?filter=calculator',
    group: 'decision-support',
    summary: 'Risk scores, severity scores, and clinical calculations',
  },
  {
    id: 'ai-agents',
    label: 'AI Agents',
    route: '/assistant',
    group: 'decision-support',
    summary: 'AI explanation, tutoring, routing, and next-action assistance',
  },
]);

const MODULES = Object.freeze(Object.fromEntries(MODULE_LIST.map((module) => [module.id, module])));

const PATHWAYS = Object.freeze([
  {
    id: 'simulation-lab-viewer',
    label: 'Simulation -> Laboratory -> 3D Viewer',
    moduleIds: ['simulation', 'laboratory', 'medical-3d-viewer'],
  },
  {
    id: 'operations',
    label: 'Hospital Map -> Fleet -> IoT',
    moduleIds: ['hospital-map', 'fleet', 'medical-iot'],
  },
  {
    id: 'decision-support',
    label: 'Protocols -> Calculators -> AI Agents',
    moduleIds: ['protocols', 'calculators', 'ai-agents'],
  },
]);

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function unique(values) {
  return [...new Set(list(values).flatMap(list).filter(Boolean).map(String))];
}

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function moduleRecord(id) {
  return MODULES[id] || null;
}

function link({ source, target, relationship, rationale, evidence = [] as any[], score = 70 }) {
  const sourceModule = moduleRecord(source);
  const targetModule = moduleRecord(target);
  return {
    id: `${source}-to-${target}`,
    source,
    target,
    sourceLabel: sourceModule?.label || source,
    targetLabel: targetModule?.label || target,
    targetRoute: targetModule?.route || '/',
    relationship,
    rationale,
    evidence: unique(evidence).slice(0, 8),
    evidenceCount: unique(evidence).length,
    score: Math.min(100, Math.max(0, Math.round(score))),
  };
}

function scenarioEvidence(pattern) {
  return SIMULATION_SCENARIOS.filter((scenario) => {
    const text = [
      scenario.title,
      scenario.category,
      scenario.specialty,
      ...(scenario.requiredTools || []),
      ...(scenario.integrations || []).map((integration) => `${integration.label} ${integration.path} ${integration.toolId}`),
    ]
      .join(' ')
      .toLowerCase();
    return pattern.test(text);
  }).map((scenario) => scenario.title);
}

function protocolEvidence() {
  return PROTOCOL_PATHWAYS.filter((protocol) => list(protocol.linkedCalculators).length > 0).map(
    (protocol) => protocol.title,
  );
}

function calculatorEvidence() {
  return getHubChatAssistedTools()
    .slice(0, 8)
    .map((tool) => tool.name || tool.toolName || tool.toolId);
}

function buildDefaultLinks() {
  const labScenarios = scenarioEvidence(/laboratory|lab|lactate|troponin|creatinine/);
  const viewerScenarios = scenarioEvidence(/3d viewer|anatomy|viewer|stroke|trauma/);
  const iotScenarios = scenarioEvidence(/iot|device|telemetry|alarm|hospital map/);
  const labEvidence = labScenarios.length ? labScenarios : ['Sepsis Deterioration', 'Abnormal lab escalation'];
  const viewerEvidence = viewerScenarios.length ? viewerScenarios : ['Stroke Alert', 'Trauma Triage'];
  const iotEvidence = iotScenarios.length ? iotScenarios : ['Device alarm failure', 'Respiratory failure'];
  const protocolRows = protocolEvidence();
  const calculatorRows = calculatorEvidence();

  return [
    link({
      source: 'simulation',
      target: 'laboratory',
      relationship: 'scenario-data',
      rationale: 'Simulation scenarios include lab panels, abnormal values, and lab dashboard launch points.',
      evidence: labEvidence,
      score: 82 + Math.min(labEvidence.length, 8),
    }),
    link({
      source: 'laboratory',
      target: 'medical-3d-viewer',
      relationship: 'diagnostic-context',
      rationale: 'Lab interpretation often benefits from anatomy, organ, or radiology-volume review before debrief.',
      evidence: ['Lactate escalation', 'Troponin trend', 'Stroke anatomy review', ...viewerEvidence],
      score: 78,
    }),
    link({
      source: 'simulation',
      target: 'medical-3d-viewer',
      relationship: 'training-context',
      rationale: 'Scenario objectives can jump directly into anatomy review for stroke, trauma, and procedural learning.',
      evidence: viewerEvidence,
      score: 76 + Math.min(viewerEvidence.length, 8),
    }),
    link({
      source: 'hospital-map',
      target: 'fleet',
      relationship: 'location-to-movement',
      rationale: 'Operational location context should connect to fleet routing, dispatch, and movement surfaces.',
      evidence: ['Hospital Map', 'Fleet Map', 'Live Tracking Map'],
      score: 86,
    }),
    link({
      source: 'fleet',
      target: 'medical-iot',
      relationship: 'movement-to-telemetry',
      rationale: 'Fleet operations and device telemetry share status, freshness, alert, and maintenance context.',
      evidence: ['Fleet routes', 'Device status', 'Medical IoT alerts', ...iotEvidence],
      score: 84,
    }),
    link({
      source: 'hospital-map',
      target: 'medical-iot',
      relationship: 'location-to-telemetry',
      rationale: 'Hospital rooms and beds should expose associated devices, vitals, freshness, and alerts.',
      evidence: ['Room devices', 'Bed telemetry', 'Device alerts', ...iotEvidence],
      score: 88,
    }),
    link({
      source: 'protocols',
      target: 'calculators',
      relationship: 'pathway-to-risk-score',
      rationale: 'Clinical pathways already reference calculators for risk framing and severity scoring.',
      evidence: protocolRows,
      score: 86 + Math.min(protocolRows.length, 8),
    }),
    link({
      source: 'calculators',
      target: 'ai-agents',
      relationship: 'score-to-ai-support',
      rationale: 'Calculator output can move into AI-assisted explanation, tutoring, documentation, and next-action support.',
      evidence: calculatorRows,
      score: 82 + Math.min(calculatorRows.length, 8),
    }),
    link({
      source: 'protocols',
      target: 'ai-agents',
      relationship: 'pathway-explanation',
      rationale: 'Protocols can request AI explanation while keeping clinical decision support limits visible.',
      evidence: PROTOCOL_PATHWAYS.map((protocol) => protocol.title).slice(0, 8),
      score: 83,
    }),
  ];
}

export class CrossModuleIntelligenceService {
  modules: any = null;
  pathways: any = null;
  links: any[] = [];

  constructor({ modules = MODULES, pathways = PATHWAYS, links = buildDefaultLinks() }: any = {}) {
    this.modules = modules;
    this.pathways = pathways;
    this.links = links;
  }

  getModules() {
    return Object.values(this.modules).map((module: any) => ({ ...module }));
  }

  getRelatedModules(moduleId, { limit = 4 }: any = {}) {
    const id = slug(moduleId);
    return this.links
      .filter((relationship) => relationship.source === id || relationship.target === id)
      .map((relationship) => {
        const direction = relationship.source === id ? 'outbound' : 'inbound';
        const relatedId = direction === 'outbound' ? relationship.target : relationship.source;
        const relatedModule = this.modules[relatedId];
        return {
          ...relationship,
          direction,
          moduleId: relatedId,
          label: relatedModule?.label || relationship.targetLabel,
          route: relatedModule?.route || relationship.targetRoute,
          summary: relatedModule?.summary || '',
        };
      })
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, limit);
  }

  getModulePathway(moduleId) {
    const id = slug(moduleId);
    const pathway = this.pathways.find((candidate) => candidate.moduleIds.includes(id));
    if (!pathway) return null;
    return {
      ...pathway,
      modules: pathway.moduleIds.map((candidateId) => this.modules[candidateId]).filter(Boolean),
      links: this.links.filter(
        (relationship) => pathway.moduleIds.includes(relationship.source) && pathway.moduleIds.includes(relationship.target),
      ),
    };
  }

  getNextActions(moduleId, options: any = {}) {
    return this.getRelatedModules(moduleId, options).map((item) => ({
      id: `next-${item.id}`,
      label: `Open ${item.label}`,
      route: item.route,
      rationale: item.rationale,
      score: item.score,
    }));
  }

  buildCrossModuleHubSnapshot() {
    const modules = this.getModules();
    const connectedModuleIds = new Set(this.links.flatMap((relationship) => [relationship.source, relationship.target]));
    const pathwayRows = this.pathways.map((pathway) => this.getModulePathway(pathway.moduleIds[0]));
    return {
      generatedAt: new Date().toISOString(),
      modules,
      links: this.links.map((relationship) => ({ ...relationship })),
      pathways: pathwayRows.filter(Boolean),
      coverage: {
        moduleCount: modules.length,
        linkedModuleCount: connectedModuleIds.size,
        linkCount: this.links.length,
        allModulesLinked: modules.every((module) => connectedModuleIds.has(module.id)),
      },
    };
  }
}

export function createCrossModuleIntelligenceService(options = undefined) {
  return new CrossModuleIntelligenceService(options);
}

export function buildCrossModuleHubSnapshot(options) {
  return createCrossModuleIntelligenceService(options).buildCrossModuleHubSnapshot();
}
