# Intended use boundary (v1)

Built 2026-08-04 for release gate P0.3 ("Clinical release evidence" —
signed clinician review, platform hazard log/safety case, calculator
source/version register, **approved intended-use boundary**). This is
the boundary-statement piece. It consolidates language that already
exists, scattered, across this codebase's own config/disclaimer files
into one reviewable document — it does not invent new claims. **It is
a draft for a CMIO/clinical-safety reviewer to approve or revise, not
an approved boundary yet** — the gate stays open until someone with
that authority signs it.

## What CareDroid is

Per `src/config/caredroidProduct.config.ts` (`safetyLine`, the single
line surfaced across the product):

> "Decision support only. Human review is required for clinical actions."

CareDroid Copilot specifically (`copilotIntro`):

> "CareDroid Copilot supports routing, context, evidence, and workflow
> prompts without making autonomous clinical decisions."

## What CareDroid explicitly is not positioned as

Verbatim from `CAREDROID_PRODUCT.notPositionedAs` (`caredroidProduct.config.ts`) —
this array is already enforced as product copy today, not new language:

- Autonomous diagnosis
- Prescribing
- Order entry
- Autonomous discharge or admission authority
- Authoritative acuity assignment
- Unsupervised EHR writeback

## Per-surface disclaimer commitments already in code

These are the exact strings this build already ships, by surface
category (`src/data/clinicalSafetyGuardrails.ts`,
`ClinicalDecisionSupportDisclaimer.tsx`):

| Surface category | Disclaimer shown today |
|---|---|
| Clinical calculators/tools | "Decision support only. Does not establish a diagnosis or replace qualified clinician judgment. Verify against current guidelines and local protocols." |
| AI-documentation tools (ambient scribe, differential-AI, etc.) | "AI-generated content requires review by a qualified clinician before clinical or operational use. Not a substitute for professional judgment." |
| Drug-interaction checker | "Interaction information is educational decision support. Does not recommend specific doses, starts, stops, or switches of therapy — verify with pharmacology references and patient-specific factors." |
| Fleet/EMS operational tools | "Operational decision support only. Does not assign vehicles, modify live routes, or override dispatcher or maintenance authority without human approval." |
| CareDroid Copilot (chat) | "Staff review required — [safetyLine]." |
| Sentinel (EMS AI recommendations) | "AI output is decision support only. A licensed clinician must review every recommendation before acting. Not for autonomous clinical decision-making." |

## Boundary by capability class (this pass's own findings folded in)

Built from today's P0.4 truth-labeling audit and the calculator source
register — this is the most concrete, evidence-backed part of this
document, since it reflects what was actually verified against source
today rather than restated product copy:

1. **The ~40 clinical calculators are deterministic formulas, never AI.**
   Every one carries a published citation (see
   `docs/CLINICAL_CALCULATOR_SOURCE_REGISTER.md`). They compute a
   published score from clinician-entered inputs; they do not infer,
   predict, or recommend beyond the formula itself. Now labeled "Manual"
   via `AiTruthLabel` wherever they render, replacing ambient "AI Chief"
   branding that previously blurred this distinction.
2. **The native-ai "predictive" surfaces (triage suggestion, admission
   probability, journey/LOS risk, post-ED orientation, specialist
   routing) are rule-based heuristics, not trained models**, despite
   internal naming and a registry that (until today) claimed specific
   ML algorithms and benchmarked performance for them — see
   `docs/CLINICAL_HAZARD_LOG_v1.md` H-1. They all require human review by
   construction (`requiresHumanReview: true` in their own return types)
   and are now labeled "Manual" rather than implying live AI.
3. **The Copilot chat and administrative AI-decision panel do call a
   real LLM gateway** (`invokeUnifiedAiConversational` /
   `invokeUnifiedAiStructuredByIntent`) when a provider is configured.
   Per `AI_CONFIGURATION_MAP.md`, **no LLM provider is configured in
   this environment today** — live replies fail safe to an explicit
   "Copilot is unavailable" message rather than a fabricated answer.
   `AiTruthLabel` reflects this dynamically per reply (Live when the
   gateway actually responds, Stale when it doesn't), not a static claim.
4. **No component in this codebase should be presented to a hospital
   pilot as a diagnostic device, a triage authority, or a replacement
   for clinical judgment**, consistent with `notPositionedAs` above —
   this is a boundary this pass's findings reinforce rather than
   contradict.

## What this document does not settle

- **Target patient population, care setting, and user-role
  restrictions** (e.g. pediatric exclusions, specific ED acuity levels)
  — this draft does not define those; a clinical reviewer needs to.
- **Regulatory classification** (e.g. whether any component constitutes
  Software as a Medical Device under applicable jurisdiction rules) —
  out of scope for a code audit, needs legal + regulatory input (P0.1).
- **Sign-off itself.** This document, `CLINICAL_HAZARD_LOG_v1.md`, and
  `CLINICAL_CALCULATOR_SOURCE_REGISTER.md` are the three prep artifacts
  P0.3 named; none of them are the clinician review itself.
