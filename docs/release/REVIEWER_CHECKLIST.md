# Reviewer checklist — Production hardening PR

Use this alongside the PR body (`PRODUCTION_HARDENING_PR.md`). Check items that you verified or that CI enforces.

## Identity & contract

- [ ] `ALL_REGISTRY_TOOL_IDS` matches `toolRegistry.js` count (35) — `clinicalToolIdContract.test.js`
- [ ] `NLU_PROFILE_TOOL_IDS` matches `clinicalIntentTools.length` (41)
- [ ] No new id added to `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS` without backend `registerTool()` and docs
- [ ] `dispatch-ai` is **not** in POST executor maps

## Routing

- [ ] `App.jsx` uses `CALCULATOR_ROUTE_DEFS.map` (not hand-maintained duplicate paths)
- [ ] `/tools/*` and `/fleet/*` unknown paths hit `ToolsAreaFallback` (spot-check or read `App.jsx`)
- [ ] `expectedLaunchPath(registryId)` matches `resolveCatalogLaunch(registryId).path` for sample Tier A/B/C ids

## Catalog & launch

- [ ] `ensureChatSeedGuardrails` only **appends** copy (grep for removals of “do not” / “988” / “human approval”)
- [ ] Unknown tool launch does not return empty `chatSeed` + silent failure
- [ ] Catalog search tests pass (`catalogSearch.test.js`)

## NLU / patterns

- [ ] `npm run test:alias-sync` green (or review alias-sync report output)
- [ ] No duplicate conflicting aliases for same registry target without comment

## Backend orchestrator

- [ ] Only 3 tools in `REGISTERED_EXECUTOR_TOOL_IDS`
- [ ] Unsupported tool returns `UNSUPPORTED_TOOL` with docs reference, not 500
- [ ] `GET /tools/catalog/executors` response shape reviewed (no secrets)
- [ ] Drug/lab disclaimers in service results still present

## Safety (clinical)

- [ ] `npm run test:safety-compliance` green
- [ ] PHQ-9/GAD-7 seeds still mention crisis resources
- [ ] PE/ACS seeds lack diagnostic certainty phrases
- [ ] CHA₂DS₂-VASc / HAS-BLED lack “start/stop anticoagulation” mandates
- [ ] No `mg/kg` dosing recommendations added in catalog seeds

## Safety (operational / fleet)

- [ ] Fleet pages/seeds include human-approval / no auto-dispatch framing
- [ ] Route optimizer / predictive maintenance disclaimers intact

## Tests & docs

- [ ] `npm run test:e2e-matrix` green
- [ ] `npm run build` green
- [ ] New docs under `docs/` are accurate (executor count = 3)
- [ ] No secrets or env files in diff

## Scope discipline

- [ ] No unrelated refactors or feature creep outside wiring/safety
- [ ] No new patient-specific dosing algorithms

## Sign-off

| Role | Name | Date | OK |
|------|------|------|-----|
| Engineering | | | |
| Clinical advisor (if required) | | | |
| Ops / release (if required) | | | |
