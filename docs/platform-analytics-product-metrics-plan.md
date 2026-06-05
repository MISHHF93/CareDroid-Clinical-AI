# CareDroid Platform Analytics and Product Metrics Plan

**Status:** Planning baseline  
**Date:** 2026-06-05  
**Scope:** Tool usage, calculator usage, search queries, failed searches, AI launches, asset pack adoption, workspace usage, navigation clicks, simulation completion, IoT/fleet dashboard usage, and user retention.  
**Goal:** Define analytics that help CareDroid know what is used, what is confusing, and what should be packaged, promoted, hidden, or redesigned.  
**Non-goal:** This document does not implement event collection, product dashboards, billing metering, clinical quality measures, or PHI retention.

## Executive Summary

CareDroid needs product analytics that are privacy-safe, asset-aware, and organization-aware. The goal is not to collect clinical content. The goal is to understand product adoption, navigation confusion, pack value, workspace fit, AI usage, and workflow completion so the platform can become a smaller, clearer, sellable SaaS product.

Existing foundations:

- Backend analytics events in [`backend/src/modules/analytics`](../backend/src/modules/analytics).
- Metrics services in [`backend/src/modules/metrics`](../backend/src/modules/metrics).
- User activity services in [`backend/src/modules/user-activity`](../backend/src/modules/user-activity).
- Personalization services in [`backend/src/modules/personalization`](../backend/src/modules/personalization).
- Frontend analytics service in [`src/services/analyticsService.ts`](../src/services/analyticsService.ts).
- Analytics dashboards in [`src/pages/AnalyticsDashboard.jsx`](../src/pages/AnalyticsDashboard.jsx), [`src/pages/CostAnalyticsDashboard.jsx`](../src/pages/CostAnalyticsDashboard.jsx), and [`src/pages/PredictiveAnalyticsDashboard.jsx`](../src/pages/PredictiveAnalyticsDashboard.jsx).

The roadmap should converge analytics around `PlatformAsset.id`, organization, workspace, role profile, route, and event family.

## Analytics Principles

- Track product behavior, not raw clinical content.
- Use asset IDs and route IDs rather than free-text labels where possible.
- Store search query text only under a privacy-safe policy; otherwise store normalized query class, result count, and failure reason.
- Separate product analytics from clinical audit.
- Include organization/workspace context for SaaS packaging decisions.
- Include role/profile context for segmentation without exposing sensitive user details.
- Respect demo/live data labels.
- Make analytics useful for hiding, bundling, promoting, and improving product surfaces.

## Metrics Taxonomy

### Adoption Metrics

Measure whether the product or pack is used.

- Active organizations.
- Active workspaces.
- Active users by role profile.
- Asset launches.
- Pack launches.
- AI agent launches.
- Simulation starts and completions.
- Digital Twin, IoT, and fleet dashboard visits.
- Repeat usage by week/month.

### Activation Metrics

Measure whether a user reaches first value.

- First dashboard visit.
- First workspace selection.
- First tool launch.
- First calculator completion.
- First AI launch.
- First search with clicked result.
- First simulation completion.
- First pack asset used after install.

### Discoverability Metrics

Measure whether users can find what they need.

- Navigation clicks by group.
- Quick Command opens.
- Search queries.
- Failed searches.
- Search result click-through.
- Tool library filters used.
- Locked asset views.
- Deep-link access denied or locked states.

### Packaging Metrics

Measure whether packs match buyer/user needs.

- Asset usage by pack.
- Pack install to first-use time.
- Pack assets never used.
- Cross-pack asset usage.
- Workspace mismatch: assets used outside intended workspace.
- Role mismatch: assets used by unexpected role profile.
- Upgrade/request-access clicks.

### AI Metrics

Measure AI usage, safety, cost, and commercial value.

- AI launches by agent and asset.
- Standard versus premium routing.
- RAG retrieval count.
- Tool-call attempts and completions.
- Human review submissions and outcomes.
- Safety gate triggers.
- Estimated cost by organization, workspace, agent, and model class.
- User feedback: helpful, not helpful, unsafe, missing context.

### Simulation Metrics

Measure training adoption and competency progress.

- Scenario starts.
- Scenario completions.
- Completion time.
- Debrief completion.
- Faculty review completion.
- Competency evidence created.
- OSCE station completion.
- Remediation assigned and completed.

### Operations Metrics

Measure Digital Twin, IoT, fleet, and operational dashboard value.

- Digital Twin visits.
- Map layer toggles.
- Device dashboard visits.
- Fleet map visits.
- Alert acknowledgement and resolution.
- Route optimizer usage.
- Predictive maintenance views.
- Workflow automation starts and completions.

### Retention Metrics

Measure product stickiness.

- Daily, weekly, monthly active users.
- Returning organizations.
- Returning workspace users.
- Repeat tool use.
- Repeat AI use.
- Pack-level retention.
- Workspace-level retention.
- User churn signals: inactive after onboarding, abandoned search, no second launch.

## Frontend Event Map

Recommended frontend events:

| Event | When | Required properties |
| --- | --- | --- |
| `navigation.clicked` | user clicks sidebar/header/account/advanced item | `routeId`, `navGroup`, `fromRoute`, `workspaceId` |
| `command.opened` | Quick Command opens | `fromRoute`, `workspaceId` |
| `command.result_clicked` | command result selected | `resultType`, `assetId`, `routeId`, `rank` |
| `search.submitted` | search executed | `queryClass`, `queryLength`, `resultCount`, `workspaceId` |
| `search.failed` | zero results or error | `queryClass`, `queryLength`, `failureReason` |
| `tool.viewed` | tool detail or tool card viewed | `assetId`, `toolId`, `routeId`, `source` |
| `tool.launched` | launch intent succeeds | `assetId`, `toolId`, `routeId`, `source` |
| `tool.locked_viewed` | locked tool rendered | `assetId`, `packId`, `reason` |
| `calculator.started` | calculator form begins | `assetId`, `calculatorId`, `source` |
| `calculator.completed` | calculator result generated | `assetId`, `calculatorId`, `completionState` |
| `ai.launched` | AI flow opens | `assetId`, `agentId`, `source` |
| `workspace.switched` | active workspace changes | `fromWorkspaceId`, `toWorkspaceId` |
| `pack.viewed` | product/pack page viewed | `productSlug`, `packId` |
| `pack.request_access_clicked` | upgrade or request access clicked | `productSlug`, `packId`, `assetId` |
| `simulation.started` | scenario begins | `scenarioId`, `assetId`, `mode` |
| `simulation.completed` | scenario completes | `scenarioId`, `assetId`, `mode`, `completionState` |
| `digital_twin.layer_toggled` | map layer changed | `layerId`, `enabled`, `routeId` |
| `operations.alert_actioned` | alert acknowledged/resolved | `alertClass`, `action`, `routeId` |

Frontend events should be enriched server-side or by the analytics service with organization, user role, role profile, subscription tier, and environment where available.

## Backend Event Schema

Canonical analytics event fields:

- `eventId`
- `eventName`
- `eventVersion`
- `occurredAt`
- `receivedAt`
- `organizationId`
- `workspaceId`
- `userIdHash`
- `sessionIdHash`
- `role`
- `roleProfileId`
- `routeId`
- `routePath`
- `assetId`
- `toolId`
- `packId`
- `productSlug`
- `source`
- `environment`
- `demoMode`
- `properties`

Privacy-sensitive fields:

- `queryText`: avoid by default.
- `promptText`: do not store in product analytics.
- `patientId`: do not store in product analytics.
- `clinicalInput`: do not store in product analytics.
- `resultValue`: avoid unless clinically safe and explicitly needed for audit, not product analytics.

Recommended backend event families:

- `navigation.*`
- `command.*`
- `search.*`
- `tool.*`
- `calculator.*`
- `ai.*`
- `pack.*`
- `workspace.*`
- `simulation.*`
- `digital_twin.*`
- `iot.*`
- `fleet.*`
- `governance.*`
- `retention.*`

## Dashboard Requirements

### Executive Product Dashboard

Audience: founders, product, GTM.

Needs:

- Active organizations, active users, active workspaces.
- Pack adoption and first-use time.
- Top used assets.
- Unused assets by pack.
- Search failure rate.
- Navigation click concentration.
- Request-access activity.
- Retention by organization type.

### SaaS Packaging Dashboard

Audience: product and sales.

Needs:

- Asset usage by pack.
- Pack overlap and cross-pack usage.
- Assets frequently used together.
- Assets never used in installed packs.
- Role/profile mismatch.
- Workspace mismatch.
- Upgrade signals and locked views.

### Navigation And UX Dashboard

Audience: product/design.

Needs:

- Primary nav usage.
- Advanced nav usage.
- Command palette usage.
- Search result click-through.
- Failed search terms by class.
- Dashboard card clicks.
- Deep-link failures.
- Mobile versus desktop usage.

### AI Commercial Dashboard

Audience: product, finance, governance.

Needs:

- AI launches by agent and asset.
- Standard versus premium routing.
- Estimated cost by organization and suite.
- Safety gate triggers.
- Human review volume.
- RAG retrieval and citation quality.
- Feedback trends.

### Simulation Dashboard

Audience: education product and customers.

Needs:

- Scenario starts/completions.
- Completion rate by category.
- Debrief completion.
- Faculty review backlog.
- Competency evidence created.
- Remediation completion.
- OSCE station completion.

### Operations Product Dashboard

Audience: product, operations buyers.

Needs:

- Digital Twin visits.
- Map layer usage.
- IoT dashboard usage.
- Device alert action rates.
- Fleet map and route optimizer usage.
- Predictive maintenance views.
- Workflow automation starts/completions.

### Privacy And Governance Dashboard

Audience: compliance, security, admins.

Needs:

- Event ingestion status.
- Audit versus analytics event counts.
- PHI-safe event validation failures.
- Consent/privacy state metrics.
- Security event trends.
- Data retention compliance.

## Privacy-Safe Analytics Strategy

Default collection should follow minimization:

- Store IDs, categories, counts, durations, and states.
- Avoid raw clinical text, prompts, patient identifiers, and calculator inputs.
- Hash user and session IDs when the dashboard does not require direct identity.
- Keep clinical audit logs separate from product analytics.
- Aggregate by organization, workspace, pack, asset, route, and role profile.
- Provide organization-level opt-out or reduced analytics mode where contractually required.
- Retain product analytics for a shorter default period than audit records.

Search handling:

- Store `queryLength`, `queryClass`, `resultCount`, and clicked result by default.
- Store raw query only if privacy policy, organization settings, and PHI guardrails allow it.
- Redact obvious identifiers before storage if raw query capture is enabled.

AI handling:

- Store prompt class, agent, asset, routing, token/cost, safety, and review metadata.
- Do not store raw prompt/response in product analytics.
- Store raw traces only under governed AI audit/debug policy.

## Metrics For Packaging Decisions

Hide or demote an asset when:

- It has low usage across all entitled organizations.
- It is mostly accessed through search and rarely through navigation.
- It has repeated failed launches or access errors.
- It creates navigation clutter without strong adoption.

Promote an asset when:

- It has high repeat use by a role profile or workspace.
- It is frequently searched or favorited.
- It is commonly launched after a specific workflow.
- It contributes to pack activation or retention.

Repackage an asset when:

- It is used heavily by organizations outside its intended pack.
- It appears in frequent request-access events.
- It is strongly correlated with another pack's adoption.
- It is unused because the buyer segment is wrong.

Improve an asset when:

- It has high views but low completions.
- It has high search intent but low click-through.
- It has high error or abandonment.
- It produces repeated user feedback issues.

## Implementation Phases

### Phase 1: Event Contract

- Define canonical event names, versions, and payload schema.
- Map current frontend surfaces to event families.
- Add privacy classification to each event.
- Align event fields with asset, pack, organization, workspace, and role model.

### Phase 2: Core Product Events

- Track navigation, command, search, tool launch, calculator start/complete, workspace switch, and pack views.
- Add event validation and redaction.
- Add dashboard for adoption and discoverability.

### Phase 3: Commercial And AI Metrics

- Track pack request-access, locked views, AI launch/routing/cost/safety/review, and RAG/tool-call metadata.
- Add AI commercial dashboard.
- Add pack adoption dashboard.

### Phase 4: Simulation And Operations Metrics

- Track simulation starts/completions/debriefs/outcomes.
- Track Digital Twin, IoT, fleet, alerts, layers, workflows, and route optimizer usage.
- Add simulation and operations product dashboards.

### Phase 5: Retention And Packaging Intelligence

- Add retention cohorts by organization, workspace, role, pack, and asset.
- Add packaging recommendations.
- Add unused/overexposed asset reports.
- Add renewal and expansion signal dashboards.

## Risks

- Product analytics accidentally stores PHI or raw prompts.
- Clinical audit and product analytics are conflated.
- Navigation decisions optimize for clicks instead of user outcomes.
- Pack adoption metrics ignore role/workspace context.
- Demo traffic pollutes commercial adoption metrics.
- Events are added inconsistently and cannot support dashboard joins.
- Users lose trust if analytics are not transparent and minimization-first.

## Acceptance Criteria

- Analytics taxonomy covers tool usage, calculators, search, AI, asset packs, workspaces, navigation, simulation, IoT/fleet, and retention.
- Frontend event map identifies what to track and required properties.
- Backend event schema includes organization, workspace, asset, pack, route, role/profile, and privacy-safe metadata.
- Dashboard requirements are defined for executive/product, SaaS packaging, navigation, AI, simulation, operations, and governance users.
- Privacy-safe strategy explicitly avoids raw PHI, raw prompts, patient IDs, and clinical inputs in product analytics by default.
- Metrics can inform what stays visible, what moves under Operations/Advanced, what becomes searchable, and what should be packaged differently.

