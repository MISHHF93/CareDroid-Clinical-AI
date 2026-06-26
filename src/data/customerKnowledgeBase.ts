export const KNOWLEDGE_BASE_CATEGORIES = Object.freeze([
  'onboarding',
  'workflows',
  'calculators',
  'simulations',
  'integrations',
  'ai-agents',
  'troubleshooting',
]);

export const CUSTOMER_KNOWLEDGE_BASE_ARTICLES = Object.freeze([
  {
    id: 'onboarding-tenant-setup',
    category: 'onboarding',
    title: 'Set Up Your CareDroid Tenant',
    summary:
      'Create the organization, confirm tenant context, review default workspaces, and invite the first admins.',
    content:
      'Start in Customer Portal. Confirm organization profile, tenant id, compliance mode, enabled products, and default workspaces. Add owner or admin users before inviting clinical staff. Use Tenant Admin to verify workspaces, roles, integrations, and enabled asset packs.',
    steps: [
      'Open Customer Portal.',
      'Review organization profile and subscription.',
      'Confirm default workspaces and assigned asset packs.',
      'Invite admins and assign role profiles.',
      'Open Success Center to verify onboarding progress.',
    ],
    tags: ['tenant', 'organization', 'setup', 'customer portal', 'users'],
    route: '/customer-portal',
  },
  {
    id: 'onboarding-success-center',
    category: 'onboarding',
    title: 'Track Onboarding Progress',
    summary: 'Use Success Center to monitor adoption, health score, training progress, and value.',
    content:
      'Success Center summarizes adoption score, workspace adoption, asset usage, AI usage, simulation completion, workflow completion, and onboarding progress. Healthy organizations should show a rising health score and active workspace usage.',
    steps: [
      'Open Success Center.',
      'Review health score and status.',
      'Check workspace adoption and AI usage.',
      'Assign training tasks where adoption is low.',
    ],
    tags: ['success center', 'adoption', 'health score', 'onboarding'],
    route: '/success-center',
  },
  {
    id: 'workflows-launch-and-complete',
    category: 'workflows',
    title: 'Launch And Complete Clinical Workflows',
    summary: 'Run workflow blocks from workspace dashboards and track completion in usage metrics.',
    content:
      'Workflows combine tools, calculators, AI prompts, protocols, and handoff steps. Launch workflows from workspace dashboards or the workflow builder, complete each block, and use audit trails for operational review.',
    steps: [
      'Choose a workspace.',
      'Open the relevant workflow or workflow builder.',
      'Complete calculator, AI, and documentation blocks.',
      'Review completion status and follow-up actions.',
    ],
    tags: ['workflow', 'workflow builder', 'completion', 'automation'],
    route: '/workflows',
  },
  {
    id: 'calculators-use-safely',
    category: 'calculators',
    title: 'Use Clinical Calculators',
    summary: 'Find calculators, enter required values, and verify results before clinical use.',
    content:
      'Open Tools or Calculators, select the calculator, enter required clinical values, and review the score, interpretation, and safety notes. Calculator outputs support clinical judgment and should not replace clinician review.',
    steps: [
      'Open Tools > Calculators.',
      'Select the desired calculator.',
      'Enter required values and units.',
      'Review score, interpretation, and safety notes.',
    ],
    tags: ['calculator', 'score', 'qsofa', 'sofa', 'heart', 'tools'],
    route: '/tools/calculators',
  },
  {
    id: 'simulations-run-training',
    category: 'simulations',
    title: 'Run Simulation Training',
    summary: 'Launch scenarios, complete decision steps, and review outcomes for learner progress.',
    content:
      'Simulation Suite supports scenario-based learning, hints, competency tracking, and debrief review. Use simulation outcomes to understand completion, missed actions, and training gaps.',
    steps: [
      'Open Simulation.',
      'Choose a scenario.',
      'Run through scenario actions.',
      'Review outcomes and debrief.',
    ],
    tags: ['simulation', 'scenario', 'training', 'debrief', 'competency'],
    route: '/simulation',
  },
  {
    id: 'integrations-request-connectors',
    category: 'integrations',
    title: 'Request And Track Integrations',
    summary: 'Use tenant administration to request EHR, SSO, lab, imaging, and device integrations.',
    content:
      'Integrations are organization-scoped. Request connectors from Tenant Admin or Customer Portal, then track readiness and status. Common connectors include FHIR, HL7, SSO, PACS, labs, LMS, and device telemetry.',
    steps: [
      'Open Customer Portal or Tenant Admin.',
      'Review requested and enabled integrations.',
      'Request needed connectors.',
      'Track readiness with your implementation team.',
    ],
    tags: ['integration', 'fhir', 'hl7', 'sso', 'pacs', 'device', 'tenant admin'],
    route: '/customer-portal',
  },
  {
    id: 'ai-agents-choose-agent',
    category: 'ai-agents',
    title: 'Choose The Right AI Agent',
    summary: 'Match AI agents to clinical, operations, lab, fleet, education, or research tasks.',
    content:
      'CareDroid agents are scoped by entitlement, role profile, and workspace. The CareDroid Copilot supports reasoning and documentation. Operations agents support throughput and incidents. Laboratory agents help with labs. Fleet agents support EMS and routing. Education agents support simulation. Research agents support evidence review.',
    steps: [
      'Open Assistant.',
      'Use the active workspace context.',
      'Ask for the task type or select an agent-specific workflow.',
      'Verify outputs and citations before action.',
    ],
    tags: ['ai agent', 'assistant', 'clinical ai', 'operations ai', 'lab ai', 'fleet ai'],
    route: '/assistant',
  },
  {
    id: 'troubleshooting-tenant-context',
    category: 'troubleshooting',
    title: 'Fix Tenant Context Issues',
    summary: 'Resolve missing organization, workspace, or role context before loading gated features.',
    content:
      'If a page says tenant context is required, refresh the tenant context, confirm you are a member of the organization, and verify your active workspace. Tenant isolation blocks access without an organization and workspace context.',
    steps: [
      'Use the Retry button on the tenant context screen.',
      'Confirm organization membership.',
      'Switch to a valid workspace.',
      'Ask an admin to review role permissions if access is still blocked.',
    ],
    tags: ['tenant context', 'workspace', 'role', 'access denied', 'troubleshooting'],
    route: '/customer-portal',
  },
  {
    id: 'troubleshooting-feature-access',
    category: 'troubleshooting',
    title: 'Understand Locked Or Hidden Features',
    summary: 'Features can be hidden by flags, subscriptions, asset packs, role profile, or workspace entitlements.',
    content:
      'If a feature is unavailable, check feature flags, subscription plan, asset pack entitlement, workspace tools, and role profile permissions. Admins can adjust rollout in Feature Flags and product access in Tenant Admin.',
    steps: [
      'Open Feature Flags to verify rollout state.',
      'Check Customer Portal subscription and enabled products.',
      'Review Tenant Admin asset packs and workspace defaults.',
      'Ask an admin to update role or workspace access.',
    ],
    tags: ['feature flags', 'locked', 'hidden', 'subscription', 'asset packs', 'role'],
    route: '/feature-flags',
  },
]);

const CATEGORY_LABELS = Object.freeze({
  onboarding: 'Onboarding',
  workflows: 'Workflows',
  calculators: 'Calculators',
  simulations: 'Simulations',
  integrations: 'Integrations',
  'ai-agents': 'AI Agents',
  troubleshooting: 'Troubleshooting',
});

export function getKnowledgeBaseCategoryLabel(category) {
  return CATEGORY_LABELS[category] || category;
}

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 2);
}

function articleText(article) {
  return [
    article.title,
    article.summary,
    article.content,
    article.category,
    ...(article.tags || []),
    ...(article.steps || []),
  ].join(' ');
}

export function searchCustomerKnowledgeBase(query, options: any = {}) {
  const tokens = tokenize(query);
  const category = options.category && options.category !== 'all' ? options.category : null;
  const limit = options.limit || 5;

  const scored = CUSTOMER_KNOWLEDGE_BASE_ARTICLES.filter(
    (article) => !category || article.category === category,
  )
    .map((article) => {
      const haystack = articleText(article).toLowerCase();
      const score = tokens.reduce((total, token) => {
        if (article.title.toLowerCase().includes(token)) return total + 5;
        if ((article.tags || []).some((tag) => tag.toLowerCase().includes(token))) {
          return total + 4;
        }
        if (article.summary.toLowerCase().includes(token)) return total + 3;
        if (haystack.includes(token)) return total + 1;
        return total;
      }, 0);
      return { ...article, score };
    })
    .filter((article) => !tokens.length || article.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  return scored.slice(0, limit);
}

export function buildKnowledgeBaseAssistantContext(message, limit = 3) {
  const matches = searchCustomerKnowledgeBase(message, { limit });
  return {
    searchedFirst: true,
    query: message,
    matches: matches.map((article) => ({
      id: article.id,
      title: article.title,
      category: article.category,
      summary: article.summary,
      route: article.route,
      score: article.score,
      content: article.content,
      steps: article.steps,
    })),
  };
}
