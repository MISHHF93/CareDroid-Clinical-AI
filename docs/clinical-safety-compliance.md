# Clinical safety & compliance

CareDroid clinical and operational tools are guarded by copy patterns, catalog seed normalization, and automated audits. This document summarizes the guardrail checklist, how to run checks, and how risk levels are assigned.

## Guardrail checklist (9 requirements)

| ID | Requirement | Primary surfaces |
|----|-------------|------------------|
| `decision-support-disclaimer` | Every clinical tool surfaces decision-support (not diagnostic) framing | `ToolPageLayout`, `Calculators.jsx`, catalog, fleet pages, chat seeds |
| `mental-health-crisis` | PHQ-9/GAD-7 include crisis-sensitive handling (988 / urgent evaluation) | NLU seeds, `mentalHealthCalculators.jsx` |
| `trauma-stroke-urgent-care` | Trauma/stroke tools warn against delaying emergency pathways | NIHSS, ATLS, ACLS, Canadian C-spine, Ottawa ankle |
| `pe-acs-no-certainty` | PE/ACS tools avoid diagnostic certainty and treatment directives | Wells PE, PERC, GRACE ACS, TIMI |
| `anticoag-no-therapy-directives` | Anticoagulation tools avoid start/stop/switch recommendations | HAS-BLED, CHA₂DS₂-VASc UI |
| `fleet-no-auto-authority` | Fleet/dispatch tools forbid fully automated operational authority | Dispatch AI, route optimizer, predictive maintenance, fleet command |
| `ai-docs-human-review` | AI documentation tools require human review | DDx, antibiotic guide, protocol lookup |
| `no-unsupported-dosing` | No unsupported mg/kg or weight-based dosing recommendations | Dose calculator NLU, calculator outputs |
| `support-not-diagnosis` | Outputs phrased as support/stratification, not definitive diagnosis | Chat seeds, calculator interpretation copy |

Canonical definitions live in `src/data/clinicalSafetyGuardrails.js` (`GUARDRAIL_CHECKLIST`, regex patterns, `ensureChatSeedGuardrails`).

## Automated audits

### Chat seeds (NLU catalog)

All `clinicalIntentTools` rows with `chatSeed` are normalized via `ensureChatSeedGuardrails` at catalog build time and audited with `auditChatSeed`.

### UI surfaces (lint-style)

`PRODUCTION_UI_SURFACE_RULES` scans shipped files for required and forbidden copy, including:

- Calculator hub and mental health forms
- Tool page layout disclaimers
- Clinical tool catalog banner
- Fleet dashboard, route optimizer, predictive maintenance
- Backend orchestrator executors (SOFA, drug checker, lab interpreter)

### Launch seeds

`resolveCatalogLaunch` outputs are re-audited for Tier B and profile tools to ensure guardrails survive launch synthesis.

## Commands

```bash
# Full safety test suite (chat seeds + UI surfaces + domain checks)
npm run test:safety-compliance

# Human-readable report (stdout; exits 1 on findings)
npm run safety-compliance:report
```

## Risk levels

| Level | Condition |
|-------|-----------|
| **low** | No failing chat seeds, UI surfaces, metadata, or launch audits; zero critical issues |
| **medium** | Non-critical gaps (e.g. missing metadata framing) |
| **high** | Critical issues: forbidden fleet auto-dispatch copy, diagnostic certainty, anticoag therapy directives, unsupported dosing |

## Constraints (do not violate in remediation)

- Do not weaken clinical warnings.
- Do not add treatment claims or patient-specific dosing logic without explicit governance.
- Prefer appending guardrail blocks via `ensureChatSeedGuardrails` rather than deleting safety language.

## Related files

- `src/data/clinicalSafetyGuardrails.js` — patterns, normalization, audits
- `src/data/clinicalSafetyComplianceReport.js` — production report builder
- `src/data/clinicalSafetyGuardrails.test.js` — domain-specific tests
- `src/components/clinical/ClinicalDecisionSupportDisclaimer.jsx` — shared UI copy
