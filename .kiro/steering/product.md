# Product Overview

**CareDroid is an emergency department patient-flow simulator.** It models how patients move
through an ED — arrival, triage, resourcing, disposition — and lets the operator swap the
*clinical decision rules* driving that flow, then measure the **operational** consequences.

It is a *department* simulator, not a *patient* simulator.

> **Direction confirmed 2026-08-10.** The prior positioning — "Emergency Department Operating
> System," a deployable clinical platform with an embedded copilot — is **superseded**. `README.md`
> and `src/config/caredroidProduct.config.ts` still carry that older thesis; treat them as
> historical, not as product intent. See [Status](#status-de-risking-before-building).

## Status: de-risking before building

The direction is confirmed; the **technical feasibility is not.** Current work is a bounded
feasibility spike (`.kiro/specs/ed-flow-simulation-spike/`) that answers three questions and may
legitimately return **no-go**:

| Q | Question |
|---|---|
| Q1 | Can the existing ED state model be driven by a **virtual clock** instead of wall time? |
| Q2 | Are runs **reproducible** from a seed? |
| Q3 | Does **policy swapping** produce a measurable operational difference? |

A no-go is a **successful** spike outcome. Do not treat simulation features as committed product
scope until Q1–Q3 are answered with numbers.

## Core Capabilities

- **Discrete-event patient flow** — state advances on scheduled events on a virtual clock, so a
  12-hour shift runs in seconds. (Does not exist yet; this is the spike's central deliverable.)
- **Clinical decision policy as a simulation parameter** — the differentiator. Rather than modelling
  a physician as `disposition_time ~ N(25, 8)`, model the actual rule (`HEART >= 4 -> admit` vs
  `TIMI >= 2 -> admit`), run both against an identical cohort and seed, and compare downstream
  admission rate, boarding hours, LOS, LWBS.
- **Face validity through a real ED board** — results render on the existing whiteboard UI, so a
  clinician can watch the model behave and critique it *specifically*. Face validity is the
  documented #1 adoption barrier for healthcare DES; the inherited UI surface solves it.
- **Synthetic cohorts** — Synthea FHIR R4 Bundles as cohort source. No PHI, ever.

> **Verified 2026-08-10 (gap analysis).** The "40 clinical calculators" figure that appeared in
> earlier documents is not supported in scope: `CLINICAL_CALCULATOR_REGISTRY` holds **6**
> (`qsofa`, `heart`, `wells-pe`, `gcs`, `news2`, `nihss`). The 39-entry figure is
> `REGISTERED_EXECUTOR_TOOL_IDS` in the backend tool orchestrator — real, but a mix of calculators
> and non-calculators, and behind a boundary the current spec excludes. Enough for the spike;
> not yet enough to carry the product claim.
- **Interval estimates, not point estimates** — results are reported over replications with
  confidence intervals.

## Target Use Cases

One engine can serve training, certification, and management strategy comparison.
**Build one engine; sell one use case.** Go-to-market sequencing is deliberately undecided and is
the repo owner's call — "let the user decide what it's for" is precisely the instinct that produced
the three-way product chimera this project is recovering from.

## Value Proposition

Incumbents split into two camps and neither occupies this space:

| Category | Examples | What they model |
|---|---|---|
| Clinical simulators | Laerdal, CAE, Body Interact, i-Human | One clinician managing one patient's clinical problem |
| Operations simulators | Arena, Simul8, AnyLogic, FlexSim | Patients as tokens with service-time distributions; box-and-arrow abstractions; need a consultant to build |

CareDroid models the **department**, with real clinical decision rules as the swappable parameter,
rendered through a board a clinician already recognises.

## Why this framing fits this codebase

Every liability of the clinical framing inverts into an asset:

| Liability as a clinical platform | Under simulation |
|---|---|
| Health Canada SaMD licensing | Not a medical device — **removed** |
| PHIPA / data residency / PIA | Synthetic data only — **removed** |
| No EHR integration | A simulator must *not* touch a live EHR — **removed** |
| NACRS / CIHI reporting | Not a system of record — **removed** |
| 41 screens, 23 roles, feature sprawl | **Face validity** |
| Clinical calculators | **Swappable decision policies** — the core feature |

## Hard product boundary (non-negotiable)

The product may report **operational** outcomes with quantified uncertainty. It may **not** report
**clinical** outcomes (e.g. "missed injuries fall by X%") unless sensitivity and specificity are
propagated against the modelled population's disease prevalence, with uncertainty carried through.

This is not caution for its own sake. The repo has already committed this exact error: hazard
**H-1** (`docs/CLINICAL_HAZARD_LOG_v1.md`) records 7 of 8 native-AI registry entries declaring
trained-model algorithms with specific F1/accuracy/AUC figures, when every implementation was
keyword/regex scoring with zero training and **no cited metric was produced by any script or test in
the repo.** Repeating that pattern is fatal to a product that sells quantitative predictions.

**Corollary:** never state a metric that no script in this repo produces.

## What this product is not

- Not a medical device, not clinical decision support, not a system of record.
- Not an EHR integration surface. Not deployed against patient data — synthetic cohorts only.
- Not CTAS/CEDIS/NACRS-conformant. Those remain unimplemented and unlicensed; the codebase
  correctly declines to fabricate terminology codes, and **that refusal must be preserved**.

---
_Focus on patterns and purpose, not exhaustive feature lists_
