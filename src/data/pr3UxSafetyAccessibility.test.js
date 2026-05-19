/**
 * PR3 clinical safety, hub UX, and accessibility contracts.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import {
  CHAT_ASSISTED_HUB_GROUPS,
  chatAssistedLaunchAriaLabel,
  chatAssistedLaunchAriaLabelForTool,
} from './chatAssistedHubGroups';
import {
  PR3_CALCULATOR_REGISTRY_IDS,
  PR3_TIER_B_CHAT_CALCULATOR_IDS,
  resolveCatalogLaunch,
} from './clinicalCatalogWiring';
import {
  auditChatSeed,
  SAFETY_AUDIT_PATTERNS,
} from './clinicalSafetyGuardrails';
import { graceAcsChatConfig } from './chatAssistedCalculators/graceAcs';
import { nihssChatConfig } from './chatAssistedCalculators/nihss';
import { canadianCSpineChatConfig } from './chatAssistedCalculators/canadianCSpine';
import { ottawaAnkleChatConfig } from './chatAssistedCalculators/ottawaAnkle';

const __dirname = dirname(fileURLToPath(import.meta.url));
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.jsx'), 'utf8');
const calculatorsCss = readFileSync(join(__dirname, '../pages/tools/Calculators.css'), 'utf8');

const ABSOLUTE_DIAGNOSIS_PATTERN =
  /\b(definitively ruled out|rules out fracture completely|cleared the cervical spine|confirms acute coronary syndrome|diagnosis established|PE is confirmed|ACS is confirmed)\b/i;

const TREATMENT_PATTERN =
  /\b(give aspirin|start heparin|iv tpa dose|mg\/kg|recommend pci now|prescribe|administer tpa)\b/i;

const PR3_CONFIGS = [
  graceAcsChatConfig,
  nihssChatConfig,
  canadianCSpineChatConfig,
  ottawaAnkleChatConfig,
];

const PR3_CONFIG_BY_ID = Object.fromEntries(PR3_CONFIGS.map((c) => [c.toolId, c]));

describe('PR3 hub groups — catalog clarity', () => {
  it('groups every PR3 Tier-B tool under a clinical heading', () => {
    const grouped = new Set(CHAT_ASSISTED_HUB_GROUPS.flatMap((g) => g.toolIds));
    for (const id of PR3_TIER_B_CHAT_CALCULATOR_IDS) {
      expect(grouped.has(id)).toBe(true);
    }
  });

  it('group leads warn against delaying emergency pathways', () => {
    const cardiac = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'cardiac');
    const neuro = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'neurology');
    const trauma = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'trauma');
    expect(cardiac.lead).toMatch(/decision support only/i);
    expect(cardiac.lead).toMatch(/do not diagnose|does not diagnose|rule out ACS/i);
    expect(cardiac.lead).toMatch(/do not delay/i);
    expect(neuro.lead).toMatch(/do not defer urgent care/i);
    expect(neuro.lead).toMatch(/emergency stroke pathways/i);
    expect(trauma.lead).toMatch(/without delay/i);
    expect(trauma.lead).toMatch(/do not clear|prove absence of fracture/i);
  });
});

describe('PR3 accessibility — launch labels and hub UI', () => {
  it('generic chat-assisted launch aria labels name decision-support scope', () => {
    const label = chatAssistedLaunchAriaLabel('NIH Stroke Scale (NIHSS)');
    expect(label).toMatch(/Start guided chat/i);
    expect(label).toMatch(/decision support only/i);
    expect(label).toMatch(/does not diagnose/i);
  });

  it.each(PR3_CALCULATOR_REGISTRY_IDS)(
    '%s uses context-aware aria label with urgent-care reminder',
    (toolId) => {
      const name = PR3_CONFIG_BY_ID[toolId]?.name || toolId;
      const label = chatAssistedLaunchAriaLabelForTool(toolId, name);
      expect(label).toMatch(/Start guided chat/i);
      expect(label).toMatch(/decision support only/i);
      expect(label).toMatch(/priority over/i);
    }
  );

  it('Calculators hub exposes keyboard-accessible chat-assisted cards', () => {
    expect(calculatorsSource).toContain('chatAssistedLaunchAriaLabelForTool');
    expect(calculatorsSource).toContain('calc-chat-assisted-card');
    expect(calculatorsSource).toContain('type="button"');
    expect(calculatorsSource).toContain('aria-describedby={`calc-chat-assisted-desc-${tool.toolId}`}');
    expect(calculatorsSource).toContain('calc-chat-assisted-lead');
    expect(calculatorsSource).toContain('Use Tab and Enter to launch');
    expect(calculatorsSource).toContain('role="group"');
    expect(calculatorsSource).toContain('aria-labelledby={groupHeadingId}');
  });

  it('styles chat-assisted cards for focus visibility and mobile tap targets', () => {
    expect(calculatorsCss).toContain('.calc-chat-assisted-card:focus-visible');
    expect(calculatorsCss).toContain('min-height: 44px');
    expect(calculatorsCss).toContain('touch-action: manipulation');
    expect(calculatorsCss).toMatch(/@media \(max-width: 480px\)[\s\S]*calc-chat-assisted-grid[\s\S]*1fr/);
    expect(calculatorsCss).toMatch(/@media \(max-width: 480px\)[\s\S]*min-height: 48px/);
    expect(calculatorsCss).toContain('overflow-wrap: anywhere');
    expect(calculatorsCss).toContain('prefers-reduced-motion');
    expect(calculatorsCss).toContain('safe-area-inset');
    expect(calculatorsSource).toContain('aria-hidden="true"');
  });
});

describe('PR3 clinical safety — registry and catalog labels', () => {
  it.each(PR3_CALCULATOR_REGISTRY_IDS)('%s registry description states clinical decision support', (id) => {
    const desc = toolRegistryById[id]?.description || '';
    expect(desc).toMatch(/clinical decision support|decision support|not .* clearance|not .* diagnosis|not fracture/i);
    expect(desc.length).toBeGreaterThan(24);
  });

  it('uses clear sidebar names for PR3 tools', () => {
    expect(toolRegistryById['grace-acs']?.name).toMatch(/GRACE ACS/i);
    expect(toolRegistryById.nihss?.name).toMatch(/NIH Stroke Scale/i);
    expect(toolRegistryById['canadian-c-spine']?.name).toMatch(/Canadian C-Spine/i);
    expect(toolRegistryById['ottawa-ankle']?.name).toMatch(/Ottawa Ankle/i);
  });

  it.each(PR3_CALCULATOR_REGISTRY_IDS)(
    'NLU description matches chat config for %s',
    (id) => {
      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu?.description).toBe(PR3_CONFIG_BY_ID[id].description);
    }
  );
});

describe('PR3 clinical safety — chat seeds and descriptions', () => {
  it.each(PR3_CONFIGS)('$toolId description states decision support scope', (config) => {
    expect(config.description).toMatch(
      /clinical decision support|decision support|does not replace|not a diagnosis|not clearance|not fracture clearance/i
    );
  });

  it.each(PR3_CONFIGS)('$toolId chat seed avoids absolute diagnosis and treatment dosing', (config) => {
    expect(config.chatSeed).not.toMatch(ABSOLUTE_DIAGNOSIS_PATTERN);
    expect(config.chatSeed).not.toMatch(TREATMENT_PATTERN);
  });

  it.each(PR3_CALCULATOR_REGISTRY_IDS)('%s normalized NLU chat seed passes safety audit', (id) => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    const report = auditChatSeed(nlu);
    expect(report.ok, JSON.stringify(report.issues)).toBe(true);
    expect(report.issues.filter((i) => i.severity === 'critical')).toHaveLength(0);
  });

  it('stroke and trauma seeds include STEP 0 emergency gates', () => {
    expect(nihssChatConfig.chatSeed).toMatch(/STEP 0 — Time-critical stroke presentation/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/STEP 0 — Applicability and emergencies/i);
    expect(ottawaAnkleChatConfig.chatSeed).toMatch(/STEP 0 — Applicability and immediate safety/i);
    expect(graceAcsChatConfig.chatSeed).toMatch(/STEP 0 — Unstable ACS and emergencies/i);
  });

  it('NIHSS seed warns against delaying stroke pathways and treatment directives', () => {
    expect(nihssChatConfig.chatSeed).toMatch(/Do not delay or defer emergency stroke pathways/i);
    expect(nihssChatConfig.chatSeed).toMatch(/does not diagnose stroke/i);
    expect(nihssChatConfig.chatSeed).toMatch(/Do not recommend IV tPA/i);
    expect(nihssChatConfig.chatSeed).toMatch(/low or incomplete NIHSS does not exclude/i);
  });

  it('trauma seeds warn unstable patients and avoid clearance language', () => {
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/unstable patients/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/does not "clear" the cervical spine/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/Do not override clinician judgment/i);
    expect(ottawaAnkleChatConfig.chatSeed).toMatch(/acute ankle/i);
    expect(ottawaAnkleChatConfig.chatSeed).toMatch(/neurovascular compromise/i);
    expect(ottawaAnkleChatConfig.chatSeed).toMatch(/does not prove absence of fracture/i);
  });

  it('GRACE seed avoids diagnostic certainty and treatment recommendations', () => {
    expect(graceAcsChatConfig.chatSeed).toMatch(/risk stratification support only/i);
    expect(graceAcsChatConfig.chatSeed).toMatch(/does not confirm or exclude ACS/i);
    expect(graceAcsChatConfig.chatSeed).toMatch(/Do not recommend specific treatments/i);
    expect(graceAcsChatConfig.chatSeed).toMatch(/Do not delay emergency ACS care/i);
  });

  it.each(PR3_CALCULATOR_REGISTRY_IDS)('%s launch chat seed includes guardrail patterns', (id) => {
    const seed = resolveCatalogLaunch(id).chatSeed || '';
    expect(SAFETY_AUDIT_PATTERNS.DECISION_SUPPORT_RE.test(seed)).toBe(true);
    expect(SAFETY_AUDIT_PATTERNS.URGENT_CARE_RE.test(seed)).toBe(true);
    expect(seed).not.toMatch(SAFETY_AUDIT_PATTERNS.PE_ACS_CERTAINTY_FORBIDDEN_RE);
    expect(seed).not.toMatch(SAFETY_AUDIT_PATTERNS.DOSE_FORBIDDEN_RE);
  });
});

describe('PR3 launch flow — hub path without dashboard fallback for PR3', () => {
  it.each(PR3_CALCULATOR_REGISTRY_IDS)('resolveCatalogLaunch(%s) stays on calculators hub', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe('/tools/calculators');
    expect(launch.openLabel).toBe('Start guided chat');
    expect(launch.chatSeed?.length).toBeGreaterThan(80);
  });

  it('hub launch handler routes chat-assisted tools to dashboard for visible conversation', () => {
    expect(calculatorsSource).toContain('resolveNavigationPathForLaunch(launch)');
    expect(calculatorsSource).toContain('resolveCatalogLaunch(toolId)');
    expect(calculatorsSource).not.toMatch(/navigate\(launch\.path \|\| '\/dashboard'\)/);
  });

  it('catalog launch uses resolveNavigationPathForLaunch for hub chat tools', () => {
    const catalogSource = readFileSync(
      join(__dirname, '../pages/tools/ClinicalToolCatalog.jsx'),
      'utf8'
    );
    expect(catalogSource).toContain('resolveNavigationPathForLaunch(launch)');
  });
});

describe('PR3 clinical safety — hub group leads', () => {
  it('cardiac group lead avoids diagnostic certainty and treatment directives', () => {
    const cardiac = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'cardiac');
    expect(cardiac.lead).toMatch(/clinical decision support only/i);
    expect(cardiac.lead).toMatch(/does not confirm or exclude/i);
    expect(cardiac.lead).not.toMatch(TREATMENT_PATTERN);
  });

  it('neurology group lead prioritizes stroke pathways over chat', () => {
    const neuro = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'neurology');
    expect(neuro.lead).toMatch(/does not diagnose stroke/i);
    expect(neuro.lead).toMatch(/do not defer urgent care/i);
  });

  it('trauma group lead covers hard stops and does not claim clearance', () => {
    const trauma = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'trauma');
    expect(trauma.lead).toMatch(/neurovascular compromise/i);
    expect(trauma.lead).toMatch(/open fracture/i);
    expect(trauma.lead).toMatch(/do not defer urgent care/i);
    expect(trauma.lead).toMatch(/rule out injury with certainty/i);
  });
});
