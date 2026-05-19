# Operational safety checklist — fleet & dispatch release gate

Applies to fleet logistics tools and dispatch AI. Pair with clinical safety checklist for full release.

Reference: fleet seeds in `chatAssistedFleet/dispatchAi.js`, fleet pages under `src/pages/fleet/`, e2e matrix tier `fleet-A` / `fleet-B`.

## Authority & automation boundaries

- [ ] **No fully automated operational authority** — tools do not auto-dispatch, auto-assign vehicles, or modify live routes without human approval
- [ ] `dispatch-ai` is **NLU/chat only** — not registered as POST `/api/tools/:id/execute`
- [ ] Chat seeds for dispatch-ai, route optimizer, predictive maintenance include human-approval language
- [ ] Forbidden phrases absent from production copy: “will auto-dispatch”, “assign vehicles automatically”, etc. (see `FLEET_AUTO_FORBIDDEN_RE` in guardrails)

## UI disclaimers (fleet pages)

- [ ] Fleet Command (`/fleet/command`) — “Decision support only” visible
- [ ] Route Optimizer — disclaimer states suggestions do not dispatch drivers
- [ ] Predictive Maintenance — disclaimer states scores do not auto-schedule shop work

## Launch & routing

- [ ] `resolveCatalogLaunch('dispatch-ai')` → calculators hub + chat seed (no orchestrator tool)
- [ ] Fleet Tier A registry paths resolve to dedicated `/fleet/*` pages
- [ ] Unknown `/fleet/foo` → `ToolsAreaFallback` (not silent redirect)

## Catalog & discovery

- [ ] Fleet tools appear in medical catalog with correct tier labeling
- [ ] Catalog launch for dispatch-ai does not imply backend executor badge for POST execute

## NLU / chat behavior

- [ ] Dispatch chat seed reviewed for operational support-only framing
- [ ] No language implying autonomous fleet control or binding maintenance orders

## Automated verification

```bash
npm run test:e2e-matrix          # fleet rows in matrix validation
npm run test:safety-compliance   # fleet guardrail regex on seeds
npm run test:pr6-fleet           # if fleet PR suite still in package.json
```

## Manual spot-check (recommended)

- [ ] Open Fleet Command → read header disclaimer
- [ ] Launch dispatch-ai from catalog → confirm seed mentions human dispatcher approval
- [ ] Route Optimizer → run sample optimization UI → confirm no “dispatch now” CTA

## Sign-off

| Checker | Date | Pass |
|---------|------|------|
| | | |

**Fleet features must remain decision-support only through release.**
