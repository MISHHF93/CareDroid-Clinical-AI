/**
 * Clinical & operational safety guardrails — required copy patterns, audit helpers, checklist.
 * Consumed by clinicalIntentToolCatalog (chat seed normalization), compliance tests, and UI.
 */

/** @typedef {'calculator'|'mentalHealth'|'peAcs'|'anticoag'|'traumaStroke'|'fleet'|'aiDocumentation'|'doseForbidden'|'checker'|'interpreter'} SafetyProfile */

export const DECISION_SUPPORT_DISCLAIMER_UI =
  'Decision support only. Does not establish a diagnosis or replace qualified clinician judgment. Verify against current guidelines and local protocols.';

export const FLEET_OPERATIONAL_DISCLAIMER_UI =
  'Operational decision support only. Does not assign vehicles, modify live routes, or override dispatcher or maintenance authority without human approval.';

export const AI_DOCUMENTATION_DISCLAIMER_UI =
  'AI-generated content requires review by a qualified clinician before clinical or operational use. Not a substitute for professional judgment.';

export const DRUG_INTERACTION_DISCLAIMER_UI =
  'Interaction information is educational decision support. Does not recommend specific doses, starts, stops, or switches of therapy — verify with pharmacology references and patient-specific factors.';

export const GUARDRAIL_CHECKLIST = Object.freeze([
  {
    id: 'decision-support-disclaimer',
    requirement: 'Every clinical tool surfaces decision-support (not diagnostic) framing.',
    surfaces: ['ToolPageLayout', 'Calculators.jsx lead', 'fleet pages', 'catalog chat seeds'],
  },
  {
    id: 'mental-health-crisis',
    requirement: 'PHQ-9/GAD-7 include crisis-sensitive handling (988 / urgent evaluation pathways).',
    surfaces: ['clinicalIntentTools phq9/gad7', 'mentalHealthCalculators.jsx'],
  },
  {
    id: 'trauma-stroke-urgent-care',
    requirement: 'Trauma/stroke tools warn against delaying emergency pathways.',
    surfaces: ['nihss', 'atls', 'acls', 'canadian-c-spine chat seeds'],
  },
  {
    id: 'pe-acs-no-certainty',
    requirement: 'PE/ACS tools avoid diagnostic certainty and treatment directives.',
    surfaces: ['wells-pe', 'perc', 'grace-acs', 'timi chat/UI'],
  },
  {
    id: 'anticoag-no-therapy-directives',
    requirement: 'Anticoagulation tools avoid start/stop/switch therapy recommendations.',
    surfaces: ['has-bled', 'calc-chads2vasc', 'has-bled/timi UI'],
  },
  {
    id: 'fleet-no-auto-authority',
    requirement: 'Fleet/dispatch tools forbid fully automated operational authority.',
    surfaces: ['dispatch-ai', 'route-optimizer', 'predictive-maintenance', 'fleet-command'],
  },
  {
    id: 'ai-docs-human-review',
    requirement: 'AI documentation tools (DDx, procedures, protocols) require human review.',
    surfaces: ['diagnosis', 'procedures', 'protocols NLU + pages'],
  },
  {
    id: 'no-unsupported-dosing',
    requirement: 'No tool provides unsupported weight-based or mg/kg dosing recommendations.',
    surfaces: ['dose-calculator NLU', 'calculator outputs'],
  },
  {
    id: 'support-not-diagnosis',
    requirement: 'Outputs phrased as support/stratification, not definitive diagnosis.',
    surfaces: ['chat seeds', 'calculator interpretation copy'],
  },
]);

const DECISION_SUPPORT_RE =
  /decision support|screening only|does not diagnose|do not diagnose|informational only|clinical decision support|does not recommend|not a substitute|not a diagnosis|must not be used|do not recommend/i;

const MENTAL_HEALTH_CRISIS_RE = /988|suicidal|question 9|crisis/i;

const URGENT_CARE_RE =
  /do not delay|must not delay|emergency (care|pathway|stroke|acs)|urgent (care|evaluation|stroke)|911|reperfusion|not delay/i;

const PE_ACS_CERTAINTY_FORBIDDEN_RE =
  /PE is (confirmed|ruled out|excluded)|rules out PE with certainty|diagnosis established|confirmed ACS/i;

const PE_ACS_GUARDRAIL_RE =
  /does not rule|do not state|not definitively rule out|not a diagnosis|does not confirm|stratification support only/i;

const ANTICOAG_THERAPY_FORBIDDEN_RE =
  /\b(start|stop|switch|initiate|discontinue)\s+(anticoagulation|anticoagulant|warfarin|doac|noac)\b|anticoagulation (strongly )?recommended|no anticoagulation recommended/i;

const ANTICOAG_GUARDRAIL_RE =
  /does not recommend starting|do not recommend starting|not recommend starting|shared decision|institutional.*protocol|stroke-risk|bleeding-risk/i;

/** Affirmative auto-dispatch only — negated forms ("do not auto-dispatch") are required safety copy. */
const FLEET_AUTO_FORBIDDEN_RE =
  /\b(will|should|must|can)\s+auto-?dispatch\b|\bauto-?dispatch(?:ed|ing)?\s+(?:now|immediately)\b|\bassign(s|ed)?\s+vehicle(s)?\s+automatically\b/i;

const FLEET_GUARDRAIL_RE =
  /human approval|dispatcher approval|does not auto-dispatch|decision support only|requires human|do not auto-schedule/i;

const AI_DOC_RE =
  /human review|qualified (healthcare )?professional|clinician review|not a substitute|decision support only/i;

const DOSE_FORBIDDEN_RE = /\b\d+(\.\d+)?\s*mg\s*\/\s*kg\b|weight-based\s+dose|calculate\s+the\s+dose\s+in\s+mg/i;

const APPEND_BLOCKS = Object.freeze({
  decisionSupport:
    'Clinical decision support only — does not establish a diagnosis or replace clinician judgment. Follow local protocols.',
  mentalHealthCrisis:
    'If self-harm or suicidal ideation is present, prioritize immediate safety assessment and crisis resources (e.g. 988 Suicide & Crisis Lifeline in the U.S. when applicable). Screening only — do not diagnose or recommend medications.',
  urgentCare:
    'If the patient is unstable or may need emergency care, prioritize local emergency, trauma, or stroke pathways — do not delay urgent evaluation to complete this chat.',
  peAcs:
    'Pre-test probability / risk stratification support only — does not confirm or rule out PE or ACS and does not recommend specific imaging, anticoagulation, or disposition.',
  anticoag:
    'Anticoagulation context: do not recommend starting, stopping, or switching anticoagulant or antiplatelet therapy — use guidelines, shared decision-making, and institutional pathways.',
  fleet:
    'Operational decision support only — does not auto-dispatch, auto-assign vehicles, or modify live routes without explicit human dispatcher approval.',
  aiDocumentation:
    'AI-assisted documentation and differential lists require review by a qualified clinician before clinical use — not definitive diagnosis or treatment orders.',
  doseForbidden:
    'Educational reference only — do not calculate or recommend patient-specific medication doses (including mg/kg). Direct dosing questions to pharmacy, institutional protocols, or licensed prescribing clinicians.',
});

/** @type {Record<string, SafetyProfile[]>} */
const TOOL_SAFETY_PROFILES = Object.freeze({
  phq9: ['mentalHealth'],
  gad7: ['mentalHealth'],
  'has-bled': ['anticoag'],
  'cha2ds2vasc-calculator': ['anticoag'],
  'calc-chads2vasc': ['anticoag'],
  'wells-pe': ['peAcs'],
  perc: ['peAcs'],
  'grace-acs': ['peAcs'],
  'timi-ua-nstemi': ['peAcs'],
  nihss: ['traumaStroke'],
  'canadian-c-spine': ['traumaStroke'],
  'ottawa-ankle': ['traumaStroke'],
  'acls-protocol': ['traumaStroke', 'aiDocumentation'],
  'atls-protocol': ['traumaStroke', 'aiDocumentation'],
  'dispatch-ai': ['fleet'],
  'route-optimizer': ['fleet'],
  'predictive-maintenance': ['fleet'],
  'fleet-command': ['fleet'],
  'differential-diagnosis': ['aiDocumentation'],
  'antibiotic-guide': ['aiDocumentation'],
  'protocol-lookup': ['aiDocumentation'],
  'dose-calculator': ['doseForbidden'],
});

function profilesForTool(row) {
  const fromMap = TOOL_SAFETY_PROFILES[row.toolId] || TOOL_SAFETY_PROFILES[row.sidebarToolId] || [];
  const profiles = new Set(fromMap);
  if (row.category === 'fleet') profiles.add('fleet');
  if (row.category === 'protocol' || row.toolId?.includes('diagnosis') || row.toolId?.includes('antibiotic')) {
    profiles.add('aiDocumentation');
  }
  if (row.chatSeed && !profiles.size) profiles.add('calculator');
  return [...profiles];
}

function appendIfMissing(seed, re, block) {
  if (re.test(seed)) return seed;
  return `${seed.trim()}\n\n${block}`;
}

/**
 * Normalize NLU chat seeds with required safety appendices (never weakens existing warnings).
 * @param {{ toolId: string, category?: string, sidebarToolId?: string, chatSeed?: string }} row
 */
export function ensureChatSeedGuardrails(row) {
  if (!row.chatSeed) return row.chatSeed;
  let seed = row.chatSeed;
  const profiles = profilesForTool(row);

  if (!DECISION_SUPPORT_RE.test(seed)) {
    seed = appendIfMissing(seed, DECISION_SUPPORT_RE, APPEND_BLOCKS.decisionSupport);
  }

  if (profiles.includes('mentalHealth')) {
    if (!MENTAL_HEALTH_CRISIS_RE.test(seed)) {
      seed = appendIfMissing(seed, MENTAL_HEALTH_CRISIS_RE, APPEND_BLOCKS.mentalHealthCrisis);
    }
  }

  if (profiles.includes('traumaStroke') || profiles.includes('urgentCareLite')) {
    if (!URGENT_CARE_RE.test(seed)) {
      seed = appendIfMissing(seed, URGENT_CARE_RE, APPEND_BLOCKS.urgentCare);
    }
  }

  if (profiles.includes('peAcs')) {
    if (!PE_ACS_GUARDRAIL_RE.test(seed)) {
      seed = appendIfMissing(seed, PE_ACS_GUARDRAIL_RE, APPEND_BLOCKS.peAcs);
    }
  }

  if (profiles.includes('anticoag')) {
    if (!ANTICOAG_GUARDRAIL_RE.test(seed)) {
      seed = appendIfMissing(seed, ANTICOAG_GUARDRAIL_RE, APPEND_BLOCKS.anticoag);
    }
  }

  if (profiles.includes('fleet')) {
    if (!FLEET_GUARDRAIL_RE.test(seed)) {
      seed = appendIfMissing(seed, FLEET_GUARDRAIL_RE, APPEND_BLOCKS.fleet);
    }
  }

  if (profiles.includes('aiDocumentation')) {
    if (!AI_DOC_RE.test(seed)) {
      seed = appendIfMissing(seed, AI_DOC_RE, APPEND_BLOCKS.aiDocumentation);
    }
  }

  if (profiles.includes('doseForbidden')) {
    if (!/does not calculate|do not calculate|educational reference only/i.test(seed)) {
      seed = appendIfMissing(seed, /educational reference only/i, APPEND_BLOCKS.doseForbidden);
    }
  }

  if (profiles.includes('calculator') || row.category === 'calculator') {
    if (!DECISION_SUPPORT_RE.test(seed)) {
      seed = appendIfMissing(seed, DECISION_SUPPORT_RE, APPEND_BLOCKS.decisionSupport);
    }
  }

  return seed;
}

export function auditChatSeed(row) {
  const seed = row.chatSeed || '';
  const issues = [];
  const profiles = profilesForTool(row);

  if (!seed) return { toolId: row.toolId, ok: true, issues };

  if (!DECISION_SUPPORT_RE.test(seed)) {
    issues.push({ code: 'missing-decision-support', severity: 'high' });
  }

  if (profiles.includes('mentalHealth') && !MENTAL_HEALTH_CRISIS_RE.test(seed)) {
    issues.push({ code: 'missing-mental-health-crisis', severity: 'critical' });
  }

  if (
    (profiles.includes('traumaStroke') || ['nihss', 'acls-protocol', 'atls-protocol'].includes(row.toolId)) &&
    !URGENT_CARE_RE.test(seed)
  ) {
    issues.push({ code: 'missing-urgent-care-warning', severity: 'critical' });
  }

  if (profiles.includes('peAcs')) {
    if (PE_ACS_CERTAINTY_FORBIDDEN_RE.test(seed)) {
      issues.push({ code: 'pe-acs-diagnostic-certainty', severity: 'critical' });
    }
    if (!PE_ACS_GUARDRAIL_RE.test(seed)) {
      issues.push({ code: 'missing-pe-acs-guardrail', severity: 'high' });
    }
  }

  if (profiles.includes('anticoag') && ANTICOAG_THERAPY_FORBIDDEN_RE.test(seed)) {
    issues.push({ code: 'anticoag-therapy-directive', severity: 'critical' });
  }

  if (profiles.includes('fleet')) {
    if (FLEET_AUTO_FORBIDDEN_RE.test(seed)) {
      issues.push({ code: 'fleet-auto-authority', severity: 'critical' });
    }
    if (!FLEET_GUARDRAIL_RE.test(seed)) {
      issues.push({ code: 'missing-fleet-human-approval', severity: 'high' });
    }
  }

  if (profiles.includes('aiDocumentation') && !AI_DOC_RE.test(seed)) {
    issues.push({ code: 'missing-ai-human-review', severity: 'high' });
  }

  if (profiles.includes('doseForbidden') && DOSE_FORBIDDEN_RE.test(seed)) {
    issues.push({ code: 'unsupported-dosing-language', severity: 'critical' });
  }

  if (
    /\b(you have|diagnosis is|confirmed diagnosis of)\b/i.test(seed) &&
    !/does not diagnose|do not diagnose|criteria support only|screening only/i.test(seed)
  ) {
    issues.push({ code: 'diagnostic-certainty-language', severity: 'medium' });
  }

  return { toolId: row.toolId, ok: issues.length === 0, issues };
}

/**
 * @param {import('./clinicalIntentToolCatalog.js').clinicalIntentTools} tools
 */
export function runClinicalSafetyComplianceAudit(tools) {
  const chatSeedFindings = tools.filter((t) => t.chatSeed).map((t) => auditChatSeed(t));
  const failures = chatSeedFindings.filter((f) => !f.ok);

  return {
    generatedAt: new Date().toISOString(),
    checklist: GUARDRAIL_CHECKLIST,
    summary: {
      toolsWithChatSeed: chatSeedFindings.length,
      passing: chatSeedFindings.length - failures.length,
      failing: failures.length,
      criticalIssues: failures.flatMap((f) => f.issues.filter((i) => i.severity === 'critical')).length,
    },
    chatSeedFindings,
    risks: failures.map((f) => ({
      toolId: f.toolId,
      issues: f.issues,
      remediation: 'Review chat seed in clinicalIntentToolCatalog or chatAssistedCalculators/*',
    })),
  };
}

/**
 * Lint-style rules for shipped UI / backend executor surfaces (file content scans).
 * @type {ReadonlyArray<{ surfaceId: string, path: string, required: RegExp[], forbidden?: RegExp[] }>}
 */
export const PRODUCTION_UI_SURFACE_RULES = Object.freeze([
  {
    surfaceId: 'calculators-hub-lead',
    path: 'src/pages/tools/Calculators.jsx',
    required: [/Decision support only/i],
    forbidden: [/Anticoagulation strongly recommended/i, /\bNo anticoagulation recommended\b/i],
  },
  {
    surfaceId: 'mental-health-forms',
    path: 'src/pages/tools/mentalHealthCalculators.jsx',
    required: [/988|crisis/i, /screening only|do not diagnose/i],
  },
  {
    surfaceId: 'pr4a-calculators',
    path: 'src/pages/tools/pr4aCalculators.jsx',
    required: [/decision support|does not diagnose|does not recommend/i],
    forbidden: [/Anticoagulation strongly recommended/i],
  },
  {
    surfaceId: 'tool-page-layout',
    path: 'src/pages/tools/ToolPageLayout.jsx',
    required: [/ClinicalDecisionSupportDisclaimer/, /disclaimerVariantForTool/],
  },
  {
    surfaceId: 'clinical-tool-catalog',
    path: 'src/pages/tools/ClinicalToolCatalog.jsx',
    required: [/ClinicalDecisionSupportDisclaimer|Decision support only/i],
  },
  {
    surfaceId: 'lab-interpreter',
    path: 'src/pages/tools/LabInterpreter.jsx',
    required: [/decision support|not a substitute|does not establish a diagnosis|educational/i],
  },
  {
    surfaceId: 'fleet-dashboard',
    path: 'src/pages/fleet/FleetDashboard.jsx',
    required: [/Decision support only/i],
    forbidden: [FLEET_AUTO_FORBIDDEN_RE],
  },
  {
    surfaceId: 'route-optimizer',
    path: 'src/pages/fleet/RouteOptimizer.jsx',
    required: [/Decision support only/i, /does not dispatch/i],
  },
  {
    surfaceId: 'predictive-maintenance',
    path: 'src/pages/fleet/PredictiveMaintenance.jsx',
    required: [/Decision support only/i],
  },
  {
    surfaceId: 'backend-sofa-executor',
    path: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/sofa-calculator.service.ts',
    required: [/educational|qualified healthcare|clinical decisions/i],
    forbidden: [DOSE_FORBIDDEN_RE],
  },
  {
    surfaceId: 'backend-drug-executor',
    path: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/drug-checker.service.ts',
    required: [/decision support|does not recommend/i],
    forbidden: [ANTICOAG_THERAPY_FORBIDDEN_RE],
  },
  {
    surfaceId: 'backend-lab-executor',
    path: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/lab-interpreter.service.ts',
    required: [/qualified healthcare|context-dependent/i],
    forbidden: [DOSE_FORBIDDEN_RE],
  },
]);

/**
 * @param {{ surfaceId: string, path: string, content: string, required?: RegExp[], forbidden?: RegExp[] }} rule
 */
export function auditUiSurfaceContent(rule) {
  const issues = [];
  const { content, surfaceId, path } = rule;
  const required = rule.required || [];
  const forbidden = rule.forbidden || [];

  for (const re of required) {
    if (!re.test(content)) {
      issues.push({
        code: 'missing-required-copy',
        severity: 'high',
        detail: `Pattern ${re} not found in ${path}`,
      });
    }
  }

  for (const re of forbidden) {
    if (re.test(content)) {
      issues.push({
        code: 'forbidden-copy',
        severity: 'critical',
        detail: `Forbidden pattern ${re} found in ${path}`,
      });
    }
  }

  return { surfaceId, path, ok: issues.length === 0, issues };
}

/**
 * @param {(relPath: string) => string} readFile
 */
export function runUiSurfaceSafetyAudit(readFile) {
  const findings = PRODUCTION_UI_SURFACE_RULES.map((rule) => {
    let content = '';
    try {
      content = readFile(rule.path);
    } catch {
      return {
        surfaceId: rule.surfaceId,
        path: rule.path,
        ok: false,
        issues: [{ code: 'file-missing', severity: 'critical', detail: `Could not read ${rule.path}` }],
      };
    }
    return auditUiSurfaceContent({ ...rule, content });
  });

  const failures = findings.filter((f) => !f.ok);
  return {
    surfacesAudited: findings.length,
    passing: findings.length - failures.length,
    failing: failures.length,
    criticalIssues: failures.flatMap((f) => f.issues.filter((i) => i.severity === 'critical')).length,
    findings,
    risks: failures.map((f) => ({
      surfaceId: f.surfaceId,
      path: f.path,
      issues: f.issues,
      remediation: 'Add or strengthen safety copy on the surface; do not weaken existing warnings.',
    })),
  };
}

/**
 * Audit synthesized catalog launch chat seeds (post-guardrail normalization).
 * @param {string[]} toolIds
 * @param {(toolId: string) => { chatSeed?: string }} resolveLaunch
 */
export function auditCatalogLaunchSeeds(toolIds, resolveLaunch) {
  return toolIds.map((toolId) => {
    const launch = resolveLaunch(toolId);
    const seed = launch?.chatSeed || '';
    if (!seed) return { toolId, ok: true, issues: [] };
    return auditChatSeed({ toolId, chatSeed: seed });
  });
}

/**
 * Tools without chat seeds must still frame decision support in metadata when they ship a page.
 * @param {{ toolId: string, category?: string, description?: string, path?: string, chatSeed?: string }} row
 */
export function auditToolMetadata(row) {
  if (row.chatSeed) return { toolId: row.toolId, ok: true, issues: [] };
  if (!row.path && row.category !== 'fleet') {
    return { toolId: row.toolId, ok: true, issues: [] };
  }

  const text = row.description || '';
  const issues = [];
  const isFleet = row.category === 'fleet';

  if (isFleet) {
    if (!FLEET_GUARDRAIL_RE.test(text) && !/decision support/i.test(text)) {
      issues.push({ code: 'missing-fleet-metadata-framing', severity: 'medium' });
    }
  } else if (!DECISION_SUPPORT_RE.test(text) && !/educational|context-dependent|interaction/i.test(text)) {
    issues.push({ code: 'missing-metadata-decision-support', severity: 'medium' });
  }

  return { toolId: row.toolId, ok: issues.length === 0, issues };
}

/**
 * Full production audit: NLU chat seeds, UI surfaces, launch seeds, metadata.
 * @param {object} options
 * @param {import('./clinicalIntentToolCatalog.js').clinicalIntentTools} options.tools
 * @param {(relPath: string) => string} [options.readFile]
 * @param {(toolId: string) => { chatSeed?: string }} [options.resolveLaunch]
 * @param {string[]} [options.launchToolIds]
 */
export function runProductionSafetyComplianceAudit(options) {
  const { tools, readFile, resolveLaunch, launchToolIds } = options;
  const chatAudit = runClinicalSafetyComplianceAudit(tools);
  const uiAudit = readFile ? runUiSurfaceSafetyAudit(readFile) : null;

  const metadataFindings = tools
    .filter((t) => t.path && !t.chatSeed && t.category !== 'emergency')
    .map((t) => auditToolMetadata(t));
  const metadataFailures = metadataFindings.filter((f) => !f.ok);

  let launchFindings = [];
  if (resolveLaunch && launchToolIds?.length) {
    launchFindings = auditCatalogLaunchSeeds(launchToolIds, resolveLaunch);
  }
  const launchFailures = launchFindings.filter((f) => !f.ok);

  const criticalIssues =
    chatAudit.summary.criticalIssues +
    (uiAudit?.criticalIssues || 0) +
    [...metadataFailures, ...launchFailures].flatMap((f) =>
      f.issues.filter((i) => i.severity === 'critical')
    ).length;

  const totalFailing =
    chatAudit.summary.failing +
    (uiAudit?.failing || 0) +
    metadataFailures.length +
    launchFailures.length;

  const riskLevel =
    criticalIssues > 0 ? 'high' : totalFailing > 0 ? 'medium' : 'low';

  return {
    generatedAt: new Date().toISOString(),
    riskLevel,
    checklist: GUARDRAIL_CHECKLIST,
    chatSeedAudit: chatAudit,
    uiSurfaceAudit: uiAudit,
    metadataFindings,
    launchFindings,
    summary: {
      chatSeedPassing: chatAudit.summary.passing,
      chatSeedFailing: chatAudit.summary.failing,
      uiSurfacePassing: uiAudit?.passing ?? null,
      uiSurfaceFailing: uiAudit?.failing ?? null,
      metadataFailing: metadataFailures.length,
      launchFailing: launchFailures.length,
      criticalIssues,
      totalFailing,
    },
    risks: [
      ...chatAudit.risks,
      ...(uiAudit?.risks || []),
      ...metadataFailures.map((f) => ({
        toolId: f.toolId,
        issues: f.issues,
        remediation: 'Add decision-support framing to catalog description or chat seed.',
      })),
      ...launchFailures.map((f) => ({
        toolId: f.toolId,
        issues: f.issues,
        remediation: 'Fix launch chat seed in clinicalCatalogWiring or source chat config.',
      })),
    ],
  };
}

/**
 * @param {ReturnType<typeof runProductionSafetyComplianceAudit>} report
 */
export function formatClinicalSafetyComplianceMarkdown(report) {
  const lines = [
    '# Clinical safety & compliance report',
    '',
    `Generated: ${report.generatedAt}`,
    `Risk level: **${report.riskLevel}**`,
    '',
    '## Summary',
    '',
    `- Chat seeds passing: ${report.summary.chatSeedPassing} (failing: ${report.summary.chatSeedFailing})`,
    `- UI surfaces passing: ${report.summary.uiSurfacePassing ?? 'n/a'} (failing: ${report.summary.uiSurfaceFailing ?? 'n/a'})`,
    `- Metadata gaps: ${report.summary.metadataFailing}`,
    `- Launch seed gaps: ${report.summary.launchFailing}`,
    `- Critical issues: ${report.summary.criticalIssues}`,
    '',
    '## Guardrail checklist',
    '',
  ];

  for (const item of report.checklist) {
    lines.push(`- **${item.id}**: ${item.requirement}`);
  }

  if (report.risks.length > 0) {
    lines.push('', '## Findings', '');
    for (const risk of report.risks) {
      const id = risk.toolId || risk.surfaceId || risk.path;
      lines.push(`### ${id}`);
      for (const issue of risk.issues) {
        lines.push(`- [${issue.severity}] ${issue.code}${issue.detail ? `: ${issue.detail}` : ''}`);
      }
      if (risk.remediation) lines.push(`  - Remediation: ${risk.remediation}`);
    }
  } else {
    lines.push('', 'No open compliance findings.', '');
  }

  return lines.join('\n');
}

export const SAFETY_AUDIT_PATTERNS = Object.freeze({
  DECISION_SUPPORT_RE,
  MENTAL_HEALTH_CRISIS_RE,
  URGENT_CARE_RE,
  PE_ACS_CERTAINTY_FORBIDDEN_RE,
  PE_ACS_GUARDRAIL_RE,
  ANTICOAG_THERAPY_FORBIDDEN_RE,
  FLEET_AUTO_FORBIDDEN_RE,
  FLEET_GUARDRAIL_RE,
  AI_DOC_RE,
  DOSE_FORBIDDEN_RE,
});
