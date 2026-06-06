# Automation Audit Trail Report

Generated: 2026-06-06

## Current Audit Gaps

CareDroid has several automation-like systems, but their audit trail is fragmented across UI state, local demo data, backend audit logs, notification state, and service-specific telemetry. The main gap is not that events are impossible to inspect; it is that there is no single user-facing automation audit route that shows the full chain from trigger to outcome.

## Findings

| Gap | Current state | Risk | Required fix |
|---|---|---|---|
| Trigger visibility | Workflow, alert, sync, recommendation, and tool-call triggers are represented in separate modules. | Users cannot see why an automation started. | Record `trigger fired` for every automation event. |
| Condition trace | Conditions are often local UI logic or service branching. | A selected action may look arbitrary. | Store evaluated conditions with pass/fail state. |
| Action selection | Some actions are preview/demo-only and some call backend endpoints. | Demo paths can look live, and live failures can be hidden. | Store selected action, backend endpoint, tool called, and demo/live context. |
| Identity scope | User, tenant, and workspace are not consistently shown together. | Cross-tenant review is unsafe and hard to audit. | Make entries tenant-scoped and include user/workspace metadata. |
| AI involvement | AI routing, recommendations, and tool calls are visible in some dashboards but not tied to automation events. | Reviewers cannot tell which automation was AI-assisted. | Record AI involvement and the model/tool surface when present. |
| Failure logging | Some UI fallbacks show errors locally; not every automation event has a durable-looking failure row. | Failed automation can be invisible after dismissal. | Failed entries must include error text and timestamp. |
| Blocked logging | Governance/entitlement/feature-flag blocks are not centralized in automation review. | Blocked automations can look like nothing happened. | Blocked entries must include block reason and reviewer requirement. |
| Reviewer tracking | Human-review states exist in separate governance/review pages. | Reviewer-required automation is hard to triage. | Include reviewer or reviewer-required status per event. |

## Implementation Plan

1. Add a canonical frontend automation audit model with required fields:
   - trigger fired
   - conditions evaluated
   - action selected
   - user
   - tenant
   - workspace
   - AI involvement
   - tool called
   - backend endpoint
   - success/failure
   - timestamp
   - reviewer if required
2. Add `/automation-audit` as a protected route.
3. Render tenant-scoped audit entries with status summaries and a tenant filter.
4. Ensure event helpers normalize successful, blocked, and failed events:
   - failed events require an error message
   - blocked events require a reason
   - entries always include tenant scope
5. Add tests for route rendering, event logging, blocked logging, failed logging, and tenant filtering.

## Acceptance Notes

This pass implements a frontend audit trail surface and deterministic audit model. It does not replace backend audit persistence. Future production hardening should persist these events through a tenant-enforced backend audit endpoint and join them with governance/human-review records.

## Executed Implementation

| Requirement | Status | Evidence |
|---|---|---|
| Create route `/automation-audit` | Done | Added protected React route and canonical route config entry. |
| Track full automation chain | Done | Audit entries include trigger, conditions, action, user, tenant, workspace, AI involvement, tool, backend endpoint, outcome, timestamp, reviewer, blocked reason, and failure error. |
| No invisible automation | Done | Page policy note states all failed/blocked automation must be visible, and seeded entries show success, blocked, and failed outcomes. |
| Failed automation logs error | Done | Failed entries require `error`; helper throws if missing. |
| Blocked automation logs reason | Done | Blocked entries require `reason`; helper throws if missing. |
| Tenant-scoped entries | Done | Audit helpers and UI filter entries by tenant. |

## Verification

| Command | Result |
|---|---|
| `npm run test:run -- src/data/automationAuditTrail.test.js src/pages/AutomationAuditTrail.test.jsx` | Passed: 2 files, 9 tests. |
| `npm run build` | Passed. |
