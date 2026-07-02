/**
 * Production safety & compliance lint-style checks for clinical and operational tools.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import toolRegistry from './toolRegistry';
import {
  runUiSurfaceSafetyAudit,
  PRODUCTION_UI_SURFACE_RULES,
  GUARDRAIL_CHECKLIST,
  SAFETY_AUDIT_PATTERNS,
  DECISION_SUPPORT_DISCLAIMER_UI,
} from './clinicalSafetyGuardrails';
import { buildClinicalSafetyComplianceReport } from './clinicalSafetyComplianceReport';
import { NLU_PROFILE_TOOL_IDS } from './clinicalToolIdContract';
import { TIER_B_CHAT_CALCULATOR_REGISTRY_IDS } from './clinicalToolIdContract';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');

function readSrc(relPath) {
  return readFileSync(join(repoRoot, relPath), 'utf8');
}

describe('clinicalSafetyGuardrails — compliance report', () => {
  it('production audit passes (chat seeds, UI surfaces, launches)', () => {
    const report = buildClinicalSafetyComplianceReport();
    expect(report.summary.chatSeedFailing, JSON.stringify(report.risks, null, 2)).toBe(0);
    expect(report.summary.uiSurfaceFailing, JSON.stringify(report.risks, null, 2)).toBe(0);
    expect(report.summary.criticalIssues).toBe(0);
    expect(report.summary.totalFailing).toBe(0);
    expect(report.riskLevel).toBe('low');
  });

  it('UI surface lint rules cover fleet, calculators, catalog, and backend executors', () => {
    const ids = PRODUCTION_UI_SURFACE_RULES.map((r) => r.surfaceId);
    expect(ids).toContain('fleet-dashboard');
    expect(ids).toContain('clinical-tool-catalog');
    expect(ids).toContain('backend-drug-executor');
  });

  it('runUiSurfaceSafetyAudit passes for all production surfaces', () => {
    const ui = runUiSurfaceSafetyAudit(readSrc);
    expect(ui.failing, JSON.stringify(ui.risks, null, 2)).toBe(0);
  });

  it('exports guardrail checklist with required domains', () => {
    const ids = GUARDRAIL_CHECKLIST.map((c) => c.id);
    expect(ids).toContain('decision-support-disclaimer');
    expect(ids).toContain('mental-health-crisis');
    expect(ids).toContain('fleet-no-auto-authority');
    expect(ids).toContain('no-unsupported-dosing');
  });
});

function chatSeedFor(toolId) {
  return clinicalIntentTools.find((t) => t.toolId === toolId)?.chatSeed || '';
}

describe('clinicalSafetyGuardrails — mental health', () => {
  it.each(['phq9', 'gad7'])('%s chat seed includes crisis-sensitive language', (id) => {
    const seed = chatSeedFor(id);
    expect(seed).toMatch(SAFETY_AUDIT_PATTERNS.MENTAL_HEALTH_CRISIS_RE);
    expect(seed).toMatch(/screening only|do not diagnose/i);
  });
});

describe('clinicalSafetyGuardrails — PE / ACS', () => {
  it.each(['wells-pe', 'perc', 'grace-acs', 'heart-score', 'timi-ua-nstemi'])(
    '%s avoids diagnostic certainty in chat seed',
    (id) => {
      const seed = resolveCatalogLaunch(id).chatSeed || '';
      expect(seed).not.toMatch(SAFETY_AUDIT_PATTERNS.PE_ACS_CERTAINTY_FORBIDDEN_RE);
      expect(seed).toMatch(SAFETY_AUDIT_PATTERNS.PE_ACS_GUARDRAIL_RE);
    }
  );
});

describe('clinicalSafetyGuardrails — anticoagulation', () => {
  it('HAS-BLED chat seed avoids therapy start/stop directives', () => {
    const seed = clinicalIntentTools.find((t) => t.toolId === 'has-bled')?.chatSeed || '';
    expect(seed).not.toMatch(SAFETY_AUDIT_PATTERNS.ANTICOAG_THERAPY_FORBIDDEN_RE);
    expect(seed).toMatch(SAFETY_AUDIT_PATTERNS.ANTICOAG_GUARDRAIL_RE);
  });

  it('Calculators.jsx CHA2DS2-VASc avoids anticoagulation mandate language', () => {
    const src = readSrc('src/pages/tools/Calculators.tsx');
    const block = src.slice(src.indexOf('CHA2DS2-VASc Calculator'));
    expect(block).not.toMatch(/Anticoagulation strongly recommended/);
    expect(block).not.toMatch(/No anticoagulation recommended/);
    expect(block).toMatch(/does not recommend for or against|does not direct anticoagulant|not a directive to start/i);
  });
});

describe('clinicalSafetyGuardrails — fleet / dispatch', () => {
  it.each(['dispatch-ai', 'route-optimizer', 'predictive-maintenance', 'fleet-command'])(
    '%s requires human operational authority',
    (id) => {
      const row = clinicalIntentTools.find((t) => t.toolId === id || t.sidebarToolId === id);
      const seed = row?.chatSeed || '';
      if (seed) {
        expect(seed).not.toMatch(SAFETY_AUDIT_PATTERNS.FLEET_AUTO_FORBIDDEN_RE);
        expect(seed).toMatch(SAFETY_AUDIT_PATTERNS.FLEET_GUARDRAIL_RE);
      }
    }
  );

  it('fleet dashboard surfaces operational decision-support disclaimer', () => {
    expect(readSrc('src/pages/fleet/FleetDashboard.tsx')).toMatch(/Decision support only/i);
  });
});

describe('clinicalSafetyGuardrails — AI documentation', () => {
  it.each([
    'differential-diagnosis',
    'antibiotic-guide',
    'protocol-lookup',
  ])('%s chat seed requires human review framing', (toolId) => {
    const seed = clinicalIntentTools.find((t) => t.toolId === toolId)?.chatSeed || '';
    expect(seed).toMatch(SAFETY_AUDIT_PATTERNS.AI_DOC_RE);
  });

  it('ToolPageLayout includes decision-support disclaimer component', () => {
    const src = readSrc('src/pages/tools/ToolPageLayout.tsx');
    expect(src).toMatch(/ClinicalDecisionSupportDisclaimer/);
    expect(src).toMatch(/disclaimerVariantForTool/);
  });
});

describe('clinicalSafetyGuardrails — dosing', () => {
  it('dose-calculator forbids mg/kg recommendations in chat seed', () => {
    const seed = clinicalIntentTools.find((t) => t.toolId === 'dose-calculator')?.chatSeed || '';
    expect(seed).not.toMatch(SAFETY_AUDIT_PATTERNS.DOSE_FORBIDDEN_RE);
    expect(seed).toMatch(/do not calculate|educational reference only/i);
  });
});

describe('clinicalSafetyGuardrails — Tier B hub tools', () => {
  it.each(TIER_B_CHAT_CALCULATOR_REGISTRY_IDS)(
    '%s launch chat seed includes decision-support guardrails',
    (registryId) => {
      const seed = resolveCatalogLaunch(registryId).chatSeed || '';
      expect(SAFETY_AUDIT_PATTERNS.DECISION_SUPPORT_RE.test(seed)).toBe(true);
    }
  );
});

describe('clinicalSafetyGuardrails — PR3 stroke and trauma', () => {
  it.each(['nihss', 'canadian-c-spine', 'nexus-cspine', 'ottawa-ankle', 'pecarn-head'])(
    '%s chat seed includes urgent-care warning',
    (id) => {
      const seed = resolveCatalogLaunch(id).chatSeed || '';
      expect(SAFETY_AUDIT_PATTERNS.URGENT_CARE_RE.test(seed)).toBe(true);
    }
  );

  it.each(['grace-acs', 'nihss'])('%s avoids diagnostic certainty phrasing', (id) => {
    const seed = resolveCatalogLaunch(id).chatSeed || '';
    expect(seed).not.toMatch(SAFETY_AUDIT_PATTERNS.PE_ACS_CERTAINTY_FORBIDDEN_RE);
  });

  it('Canadian C-Spine seed does not claim cervical spine clearance', () => {
    const seed = resolveCatalogLaunch('canadian-c-spine').chatSeed || '';
    expect(seed).toMatch(/does not "clear" the cervical spine/i);
    expect(seed).not.toMatch(/\bcleared the cervical spine\b/i);
  });

  it('Ottawa Ankle seed is scoped to acute injury with hard-stop warnings', () => {
    const seed = resolveCatalogLaunch('ottawa-ankle').chatSeed || '';
    expect(seed).toMatch(/acute ankle/i);
    expect(seed).toMatch(/neurovascular compromise/i);
    expect(seed).toMatch(/open fracture/i);
    expect(seed).toMatch(/gross deformity/i);
  });

  it('NEXUS C-Spine seed does not claim cervical spine clearance', () => {
    const seed = resolveCatalogLaunch('nexus-cspine').chatSeed || '';
    expect(seed).toMatch(/does not "clear" the cervical spine/i);
    expect(seed).toMatch(/Trauma imaging decision support/i);
    expect(seed).not.toMatch(/\bcleared the cervical spine\b/i);
  });

  it('ABCD² seed includes stroke urgent-care warning', () => {
    const seed = resolveCatalogLaunch('abcd2').chatSeed || '';
    expect(seed).toMatch(/do not delay urgent/i);
    expect(seed).toMatch(/emergency stroke pathways/i);
    expect(seed).not.toMatch(/\bprescribe anticoagul/i);
  });

  it('PECARN Head seed does not mandate or defer CT', () => {
    const seed = resolveCatalogLaunch('pecarn-head').chatSeed || '';
    expect(seed).toMatch(/does not recommend for or against head CT/i);
    expect(seed).toMatch(/Do not override clinician judgment/i);
    expect(seed).not.toMatch(/\bct is not needed\b/i);
    expect(seed).not.toMatch(/\bno ct required\b/i);
  });
});

describe('clinicalSafetyGuardrails — tool registry coverage', () => {
  it('every shipped clinical tool registry row has description', () => {
    for (const tool of toolRegistry) {
      if (tool.category === 'Clinical Tools' || tool.path?.startsWith('/tools')) {
        expect(tool.description?.length, tool.id).toBeGreaterThan(10);
      }
    }
  });
});

describe('clinicalSafetyGuardrails — UI disclaimer constant', () => {
  it('shared disclaimer copy mentions decision support', () => {
    expect(DECISION_SUPPORT_DISCLAIMER_UI).toMatch(/Decision support only/i);
    expect(DECISION_SUPPORT_DISCLAIMER_UI).toMatch(/does not establish a diagnosis/i);
  });
});

describe('clinicalSafetyGuardrails — catalog launch seeds', () => {
  it.each(
    NLU_PROFILE_TOOL_IDS.filter((id) => {
      const seed = resolveCatalogLaunch(id).chatSeed;
      return Boolean(seed);
    })
  )('%s launch seed passes audit', (toolId) => {
    const seed = resolveCatalogLaunch(toolId).chatSeed || '';
    expect(SAFETY_AUDIT_PATTERNS.DECISION_SUPPORT_RE.test(seed)).toBe(true);
    expect(seed).not.toMatch(SAFETY_AUDIT_PATTERNS.PE_ACS_CERTAINTY_FORBIDDEN_RE);
    expect(seed).not.toMatch(SAFETY_AUDIT_PATTERNS.FLEET_AUTO_FORBIDDEN_RE);
  });
});

describe('clinicalSafetyGuardrails — page-only tools metadata', () => {
  it('drug-interactions and lab-interpreter descriptions frame decision support', () => {
    const drug = clinicalIntentTools.find((t) => t.toolId === 'drug-interactions');
    const lab = clinicalIntentTools.find((t) => t.toolId === 'lab-interpreter');
    expect(drug?.description).toMatch(/decision support/i);
    expect(lab?.description).toMatch(/decision support/i);
  });
});

describe('clinicalSafetyGuardrails — SOFA calculator UI', () => {
  it('SOFA form includes decision-support disclaimer block', () => {
    const src = readSrc('src/pages/tools/Calculators.tsx');
    const block = src.slice(src.indexOf('const SOFACalculator'));
    expect(block).toMatch(/Clinical decision support only/i);
    expect(block).not.toMatch(/diagnos(e|is) sepsis with certainty/i);
  });
});
