# Extreme Hardening Roadmap

Date: 2026-06-13

## Executive Summary

This roadmap converts the 12 aggressive CareDroid Emergency OS hardening prompts into a gated, non-destructive execution framework. It preserves the validated active spine documented in `docs/architecture/active-spine-validation.md` and `docs/architecture/final-emergency-os-validation.md`:

`src/main.jsx` -> `src/App.jsx` -> `BrowserRouter` -> `RootLayout` -> `src/components/AppShell.tsx` -> `Outlet` -> Emergency OS route page, backed by Nest `/api/emergency/*`.

The prompts are useful as pressure-test themes, but several are unsafe as written. Work should start with audits, measurement baselines, static checks, documentation, and manual-review reports. Destructive cleanup, route/shell/API rewrites, deployment claims, HIPAA compliance claims, clinical validation claims, autonomous clinical actions, and absolute performance guarantees require explicit evidence, design review, and approval before implementation.

## Classification Table

| # | Prompt Theme | Classification | Safe Execution Interpretation | Hard Gate |
|---|---|---|---|---|
| 1 | Nuke/rebuild | REQUIRES_MANUAL_APPROVAL | Produce an inventory of duplicate, legacy, or disconnected surfaces and recommend review order without deleting or moving files. | No deletion, rewrite, router replacement, AppShell replacement, or API replacement without explicit approval. |
| 2 | No nesting | SAFE_TO_IMPLEMENT_INCREMENTALLY | Audit nested cards, visual hierarchy, focus order, and responsive layout issues; fix narrowly scoped UI nesting only when tied to active routes. | No broad layout refactor or shell restructuring. |
| 3 | Performance | UNREALISTIC_CLAIM_REQUIRES_MEASUREMENT | Establish baseline bundle, render, route transition, API latency, and Lighthouse metrics before proposing optimizations. | No sub-10ms, zero-lag, or production-performance claims without repeatable measurements. |
| 4 | Error handling | SAFE_TO_IMPLEMENT_INCREMENTALLY | Audit loading, empty, error, retry, timeout, and offline states across active Emergency OS routes and Nest endpoints. | Do not mask clinical risk with silent fallbacks; user-visible failure states must remain explicit. |
| 5 | HIPAA security | REQUIRES_INFRASTRUCTURE_OR_SECURITY_DESIGN | Create a security control gap report covering access, audit logging, data minimization, retention, encryption, PHI handling, and breach workflow assumptions. | No HIPAA compliance claim without formal security, legal, operational, and infrastructure evidence. |
| 6 | Offline-first | REQUIRES_INFRASTRUCTURE_OR_SECURITY_DESIGN | Map offline-critical workflows, cacheable data classes, sync conflicts, stale-data warnings, and audit requirements. | No offline clinical workflow implementation without conflict-resolution, PHI storage, and safety design approval. |
| 7 | Real-time | REQUIRES_INFRASTRUCTURE_OR_SECURITY_DESIGN | Measure current polling/API behavior and design presence, event ordering, reconnect, backpressure, and audit semantics. | No WebSocket/SSE production wiring without backend scaling, auth, monitoring, and failure-mode design. |
| 8 | Autonomous AI | CLINICALLY_UNSAFE_AS_WRITTEN | Limit AI work to advisory, explainable, human-reviewed suggestions and audit trails. | No autonomous diagnosis, triage, escalation, treatment, disposition, or clinical action execution. |
| 9 | Predictive forecasting | CLINICALLY_UNSAFE_AS_WRITTEN | Treat forecasting as research or operational analytics until validated; define data provenance, bias checks, calibration, and human review. | No clinical prediction claim, care-priority automation, or patient-impacting forecast without validation and governance. |
| 10 | Every-line audit | SAFE_NON_DESTRUCTIVE_NOW | Run scoped code inventory, static checks, lints, dependency review, route/API trace review, and manual-review reports. | Avoid mass rewrites; audit findings must be triaged before implementation. |
| 11 | Documentation | SAFE_NON_DESTRUCTIVE_NOW | Add architecture, safety, measurement, runbook, and manual-review documentation that reflects the current repo state. | Do not document aspirational behavior as shipped behavior. |
| 12 | Deployment | REQUIRES_INFRASTRUCTURE_OR_SECURITY_DESIGN | Create deployment-readiness checklist, environment inventory, observability plan, rollback plan, and release risk register. | No production-readiness claim without CI/CD, infra, monitoring, incident response, security, privacy, and acceptance evidence. |

## Safe Immediate Subset

The following work can start immediately without risking the dirty repo or validated active spine:

- Documentation-only reports that classify risk, decisions, manual-review items, and gaps.
- Non-destructive inventories of active routes, route redirects, navigation entries, command palette entries, and API clients.
- Static checks that do not modify files, such as lint diagnostics, typecheck diagnostics, dependency inventory, bundle inspection, and code search reports.
- Measurement baselines for route rendering, bundle size, API latency, frontend error surfaces, offline behavior, and real-time assumptions.
- Focused tests for active behavior, added only where they protect a small, well-understood change.
- Manual-review reports for destructive proposals, legacy cleanup, security architecture, PHI handling, AI governance, and deployment readiness.

## Safe First 72-Hour Execution Plan

### 0-24 Hours: Baseline And Guardrails

- Freeze the active spine as the implementation boundary: `src/App.jsx`, `src/components/AppShell.tsx`, active Emergency OS routes, and Nest `/api/emergency/*`.
- Produce a non-destructive inventory of legacy shell references, disconnected route references, duplicated settings/navigation vocabulary, and manual-review-only artifacts.
- Capture current measurement baselines: route load behavior, bundle warnings, API response timings in local/dev, error-state coverage, and existing test/lint/typecheck status if already available.
- Create a safety register for claims that cannot be made yet: HIPAA compliance, clinical validation, production readiness, zero bugs, autonomous safety, and absolute latency targets.

### 24-48 Hours: Focused Hardening Audits

- Audit error handling across active routes and API clients: loading, empty, error, retry, timeout, permission, and offline states.
- Audit security posture at the design level: PHI paths, authentication/authorization assumptions, audit logging, data retention, encryption boundaries, local storage, and third-party data movement.
- Audit offline and real-time requirements separately from implementation: which workflows degrade safely, which data may be cached, what must never be cached, and which events need ordering guarantees.
- Audit AI governance: model outputs, human review, explanation, prompt logging, clinical disclaimers, protected-action blocks, and escalation restrictions.

### 48-72 Hours: Small Safe Executions

- Add or update documentation for confirmed gaps and accepted guardrails.
- Add narrow tests only for verified behavior gaps in active routes, API clients, or safety utilities.
- Add non-destructive detection scripts only if they are read-only by default, clearly named as audits, and do not auto-delete, auto-move, or auto-rewrite files.
- Prepare manual-approval packets for any proposed destructive cleanup, infrastructure migration, security control implementation, real-time transport, offline storage, or AI workflow expansion.

## Destructive Actions Requiring Explicit Approval

These actions must not run from a broad prompt and require a separate approval step with scope, rollback plan, and owner sign-off:

- Deleting files, directories, routes, tests, docs, generated assets, trace artifacts, or legacy references.
- Replacing `src/App.jsx`, `src/components/AppShell.tsx`, the active router, the active 12-route navigation model, or Nest `/api/emergency/*`.
- Moving active shell ownership back to `src/layout/` or introducing a second active shell.
- Renaming route paths, API endpoints, feature flags, store contracts, or command identifiers used by the active spine.
- Running cleanup scripts that mutate the repo automatically.
- Rewriting broad CSS/layout systems without route-by-route review.
- Enabling production deployment, data retention, PHI storage, encryption, observability, or incident-response claims without infrastructure review.
- Connecting autonomous AI outputs to clinical actions, triage changes, treatment recommendations, escalation execution, or patient disposition.

## Clinical And AI Safety Restrictions

- AI may suggest, summarize, explain, draft, prioritize for review, or flag uncertainty only when a qualified human remains responsible for clinical decisions.
- AI must not autonomously diagnose, triage, discharge, admit, transfer, order treatment, escalate care, suppress alerts, or alter patient state.
- Forecasting and predictive analytics must be labeled as operational decision support or research until clinically validated.
- Any patient-impacting model requires documented data provenance, intended use, exclusion criteria, bias evaluation, calibration, monitoring, fallback behavior, and governance approval.
- Safety-critical UI must expose uncertainty, stale data, degraded connectivity, failed sync, and missing source data.
- Audit logs must record AI-assisted recommendations, user review, accepted/rejected actions, and relevant source context before any real clinical workflow use.

## Measurement Plan

### Performance

- Establish baseline bundle size, chunk warnings, route transition times, key component render times, and local API latency.
- Measure before optimizing; compare changes against the same environment, browser, fixtures, and route set.
- Report percentiles and environment details instead of absolute guarantees.
- Treat sub-10ms or zero-lag claims as invalid unless backed by repeatable instrumentation and scoped to a specific operation.

### Security And Privacy

- Inventory PHI entry, display, storage, logging, export, and transmission paths.
- Review auth, authorization, session handling, audit logging, retention, encryption, secrets, dependency risk, and browser storage.
- Map required organizational controls outside the repo: policies, BAAs, access reviews, incident response, backups, monitoring, training, and legal review.
- State security posture as findings and gaps, not compliance certification.

### Offline

- Classify data into never-cache, short-lived-cache, durable-cache, and synthetic/demo-only categories.
- Define stale-data warnings, conflict resolution, sync retry behavior, audit semantics, and cache eviction.
- Test degraded network, reload, tab duplication, expired session, and reconnect cases before claiming offline-first behavior.
- Keep patient-impacting offline changes behind manual design review.

### Real-Time

- Define event types, ordering guarantees, idempotency, reconnect behavior, backpressure, auth refresh, and audit behavior.
- Compare polling, SSE, and WebSocket options against actual Emergency OS workflow needs.
- Measure event latency, dropped connections, reconnect time, duplicate handling, and UI stale-state signaling.
- Do not add production real-time transport without backend scaling, monitoring, and failure-mode design.

## Recommended Next Executable Worker Prompts

1. "Create a non-destructive Emergency OS active-spine inventory report. Do not edit source. Trace active routes, navigation entries, command palette entries, API clients, and manual-review legacy references. Output only `docs/architecture/active-spine-inventory.md`."

2. "Audit active Emergency OS error states without modifying code. Review loading, empty, error, timeout, retry, permission, and offline states across the 12 active routes and API clients. Output a prioritized report with no implementation claims."

3. "Create a measurement baseline plan for Emergency OS performance. Do not optimize yet. Identify current scripts, likely bundle metrics, route timing probes, API timing probes, and repeatable local measurement steps. Output `docs/architecture/performance-baseline-plan.md`."

4. "Create a security and PHI handling gap report for Emergency OS. Do not claim HIPAA compliance. Map PHI flows, browser storage, audit logging, auth assumptions, dependency risks, and external controls needed. Output `docs/architecture/security-privacy-gap-report.md`."

5. "Create an AI safety governance report for Emergency OS Copilot and predictive features. Do not implement autonomous actions. Define allowed advisory behavior, prohibited clinical actions, review requirements, audit events, and validation gates."

6. "Create an offline and real-time design decision report. Do not implement transports or storage. Compare safe degradation, cache classes, sync conflict handling, polling/SSE/WebSocket choices, stale data behavior, and manual approval gates."

## Cross-References

- `docs/architecture/active-spine-validation.md`
- `docs/architecture/final-emergency-os-validation.md`
- `docs/architecture/emergency-os-final-validation.md`

This report intentionally does not update those files because it is a forward-looking execution framework, while the existing validation docs record completed harmonization and test evidence.
