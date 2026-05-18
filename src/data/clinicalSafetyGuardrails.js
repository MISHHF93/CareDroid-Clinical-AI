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
