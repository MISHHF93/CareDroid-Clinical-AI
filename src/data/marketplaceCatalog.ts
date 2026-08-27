export const MARKETPLACE_CATEGORIES = Object.freeze([
  'asset-packs',
  'workflows',
  'simulations',
  'protocols',
  'ai-agents',
  'integrations',
]);

export const MARKETPLACE_CATEGORY_LABELS = Object.freeze({
  'asset-packs': 'Asset Packs',
  workflows: 'Workflows',
  simulations: 'Simulations',
  protocols: 'Protocols',
  'ai-agents': 'AI Agents',
  integrations: 'Integrations',
});

export const MARKETPLACE_ITEMS = Object.freeze([
  {
    id: 'pack-emergency-command',
    category: 'asset-packs',
    title: 'Emergency Command Asset Pack',
    summary: 'Adds ED triage, escalation, rapid response, and emergency workflow assets.',
    owner: 'CareDroid',
    route: '/asset-packs',
    entitlement: 'clinical-tools-core',
    tags: ['emergency', 'triage', 'asset pack'],
  },
  {
    id: 'pack-icu-operations',
    category: 'asset-packs',
    title: 'ICU Operations Asset Pack',
    summary: 'Enables ICU dashboards, rounding workflows, device views, and high-acuity protocols.',
    owner: 'CareDroid',
    route: '/asset-packs',
    entitlement: 'operations-core',
    tags: ['icu', 'rounding', 'monitoring'],
  },
  {
    id: 'workflow-chest-pain',
    category: 'workflows',
    title: 'Chest Pain Workflow',
    summary: 'Combines HEART score, ECG interpretation, ACS guidance, and handoff documentation.',
    owner: 'CareDroid Workflow Studio',
    route: '/workflows',
    entitlement: 'workflow-executions',
    tags: ['cardiology', 'heart score', 'acs'],
  },
  {
    id: 'workflow-discharge-readiness',
    category: 'workflows',
    title: 'Discharge Readiness Workflow',
    summary: 'Coordinates documentation, patient education, medication review, and follow-up tasks.',
    owner: 'CareDroid Workflow Studio',
    route: '/workflows',
    entitlement: 'workflow-executions',
    tags: ['discharge', 'documentation', 'follow-up'],
  },
  {
    id: 'simulation-sepsis-response',
    category: 'simulations',
    title: 'Sepsis Response Simulation',
    summary: 'Scenario training for sepsis recognition, bundle timing, escalation, and debrief.',
    owner: 'CareDroid Simulation Lab',
    route: '/simulation',
    entitlement: 'simulation-runs',
    tags: ['sepsis', 'training', 'debrief'],
  },
  {
    id: 'simulation-code-blue',
    category: 'simulations',
    title: 'Code Blue Team Simulation',
    summary: 'Team-based resuscitation practice with timed actions and outcome review.',
    owner: 'CareDroid Simulation Lab',
    route: '/simulation',
    entitlement: 'simulation-runs',
    tags: ['resuscitation', 'team training', 'competency'],
  },
  {
    id: 'protocol-sepsis-bundle',
    category: 'protocols',
    title: 'Sepsis Bundle Protocols',
    summary: 'Protocol content for early recognition, lactate review, antibiotics, and escalation.',
    owner: 'CareDroid Protocol Library',
    route: '/protocols',
    entitlement: 'protocol-library',
    tags: ['sepsis', 'protocol', 'bundle'],
  },
  {
    id: 'protocol-stroke-pathway',
    category: 'protocols',
    title: 'Stroke Pathway Protocols',
    summary: 'Guided stroke protocol content for recognition, imaging, thrombolysis, and transfer.',
    owner: 'CareDroid Protocol Library',
    route: '/protocols',
    entitlement: 'protocol-library',
    tags: ['stroke', 'pathway', 'neurology'],
  },
  {
    id: 'agent-clinical-copilot',
    category: 'ai-agents',
    title: 'Clinical Copilot Agent',
    summary: 'General clinical assistant for explainable reasoning, documentation, and tool routing.',
    owner: 'CareDroid AI Agents',
    route: '/assistant',
    entitlement: 'ai-requests',
    tags: ['assistant', 'clinical ai', 'documentation'],
  },
  {
    id: 'agent-operations-copilot',
    category: 'ai-agents',
    title: 'Operations Copilot Agent',
    summary: 'AI support for throughput, incident review, device operations, and command center tasks.',
    owner: 'CareDroid AI Agents',
    route: '/assistant',
    entitlement: 'ai-requests',
    tags: ['operations', 'command center', 'ai agent'],
  },
  {
    id: 'integration-fhir',
    category: 'integrations',
    title: 'FHIR Integration Connector',
    // Roadmap item, not a live connector -- matches the honest 'roadmap'
    // status the equivalent, actually-reachable /integrations-marketplace
    // offering already carries (backend/src/modules/product-catalog/data/
    // product-catalog-seed.data.ts). This entry is itself currently
    // unreachable by any live UI (its 'integrations' category is filtered
    // out everywhere marketplaceCatalog.ts is consumed), but the summary
    // text should never overclaim even while inert, in case a future
    // change makes it reachable.
    summary: 'Planned connector for FHIR-capable EHR and clinical data sources -- not yet a live integration.',
    owner: 'CareDroid Integration Hub',
    route: '/integrations-marketplace',
    entitlement: 'integrations',
    tags: ['fhir', 'ehr', 'api'],
  },
  {
    id: 'integration-sso',
    category: 'integrations',
    title: 'SSO Identity Connector',
    summary: 'Adds SAML or OIDC identity integration for enterprise sign-in and role mapping.',
    owner: 'CareDroid Integration Hub',
    route: '/integrations-marketplace',
    entitlement: 'integrations',
    tags: ['sso', 'oidc', 'saml'],
  },
]);

export function getMarketplaceCategoryLabel(category) {
  return MARKETPLACE_CATEGORY_LABELS[category] || category;
}

export function filterMarketplaceItems({ query = '', category = 'all' }: any = {}) {
  const normalizedQuery = query.trim().toLowerCase();
  return MARKETPLACE_ITEMS.filter((item) => {
    if (category !== 'all' && item.category !== category) return false;
    if (!normalizedQuery) return true;
    const haystack = [
      item.title,
      item.summary,
      item.owner,
      item.category,
      item.entitlement,
      ...(item.tags || []),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}
