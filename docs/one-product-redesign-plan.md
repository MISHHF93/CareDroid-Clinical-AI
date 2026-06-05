# CareDroid One Product Redesign Plan

**Status:** Planning baseline  
**Date:** 2026-06-05  
**Scope:** Visual design language, navigation, dashboard, AI assistant, tools, operations, simulation, laboratory, profile, settings, mobile layout, and theme system.  
**Goal:** Make CareDroid feel like one coherent product instead of many modules.  
**Non-goal:** This document does not implement UI changes, route changes, design tokens, or component refactors.

## Executive Summary

CareDroid should feel like one clinical operating system with configurable workspaces and sellable solution packs, not a collection of unrelated demos. The target product has one shell, one navigation model, one route registry, one asset catalog, one assistant entry point, one workspace context, and one design language.

This redesign synthesizes the companion plans:

- [SaaS Bottleneck Architecture Plan](./saas-bottleneck-architecture-plan.md)
- [Navigation Reduction Plan](./navigation-reduction-plan.md)
- [Asset-Pack Productization Plan](./asset-pack-productization-plan.md)
- [Route Layout Simplification Plan](./route-layout-simplification-plan.md)
- [AI Commercialization Layer Plan](./ai-commercialization-layer-plan.md)
- [Hospital Digital Twin Roadmap](./hospital-digital-twin-roadmap.md)
- [Simulation Business Line Plan](./simulation-business-line-plan.md)
- [Compliance Governance Roadmap](./compliance-governance-roadmap.md)
- [Platform Analytics and Product Metrics Plan](./platform-analytics-product-metrics-plan.md)

## Product Thesis

CareDroid is a configurable healthcare AI operating system:

```text
Organization
  -> solution packs
  -> workspaces
  -> assets
  -> assistant, tools, operations, simulation, lab, governance
```

The user should not need to understand the internal module map. They should see:

- What matters in their current workspace.
- What they can launch.
- What is locked or requires access.
- What is recommended for their role.
- What needs review.
- Where to search when they do not know the route.

## Target Information Architecture

Primary navigation should stay at four product concepts:

1. Command Center.
2. Assistant.
3. Tools.
4. Operations.

Secondary contexts:

- Workspace: selected in the header and used to shape recommendations, filters, AI context, and dashboard cards.
- Account: profile, settings, notifications, security, preferences.
- Advanced: governance, security, audit, regulatory, system health, feature flags, plugins, data lineage, diagnostics, assets, organization admin.
- Commercial: products, packs, plans, specialties, pathways, agents, maturity, outcomes, integrations, configuration studio.

The IA should be simple enough for daily users and deep enough for admins:

```text
Command Center
Assistant
Tools
Operations
  Digital Twin
  Hospital Map
  Medical IoT
  Devices
  Fleet
  Live Map
Account
  Profile
  Settings
  Notifications
Advanced
  Governance
  Security
  Audit
  Regulatory
  System
Commercial/Admin
  Products
  Packs
  Organization
```

## Page Hierarchy

### Command Center

Purpose: daily home and workspace-aware operating summary.

Should include:

- Current workspace status.
- Recommended assets.
- Recent assets.
- Alerts and review tasks.
- AI entry prompt.
- Pack or workspace quick cards.
- Operational summaries when workspace is Operations, Digital Twin, Fleet, or Medical IoT.

Should not include:

- A duplicate full route tree.
- Every product module.
- Long developer/admin panels for normal users.

### Assistant

Purpose: one conversational interface for CareDroid AI.

Should include:

- Agent selection shaped by workspace and entitlement.
- Context-aware suggestions.
- Tool and workflow launch.
- RAG/citations where needed.
- Safety state, model/routing metadata where appropriate.
- Human review handoff for high-risk outputs.

Should not include:

- Separate assistant pages for every AI workflow unless they are deep-linked assets.
- Ungoverned model switching.

### Tools

Purpose: the canonical searchable library of clinical tools, calculators, protocols, workflows, simulations, lab, research, and governed assets.

Should include:

- Search.
- Filters by specialty, workspace, role, pack, asset type, risk, recent, favorites, locked, and all.
- Calculator hub.
- Tool detail pages.
- Locked/request-access states.
- Asset metadata: readiness, risk, pack, source, review state.

Should not include:

- Operational maps as primary peers unless surfaced as assets in search.
- Developer catalog as a normal user surface.

### Operations

Purpose: command hub for hospital operations, Digital Twin, maps, Medical IoT, devices, fleet, alerts, and workflow automation.

Should include:

- Digital Twin overview.
- Map and layer access.
- Device/fleet/alert cards.
- Workflow queues.
- Demo/live data status.
- Operational AI entry.

Should not include:

- Clinical specialty tool browsing.
- Advanced governance/admin routes except as linked review tasks.

### Simulation

Purpose: sellable training product and asset family, reachable through Tools, workspace recommendations, Command Center, and product pages.

Should include:

- Scenario library.
- Scenario player.
- Debrief.
- Outcomes.
- Competency dashboard.
- OSCE support.
- AI tutor.

Navigation stance:

- Not a primary nav item for every user.
- Promoted for education, research, ED, ICU, EMS, and training workspaces.

### Laboratory

Purpose: lab intelligence product area and asset family.

Should include:

- Lab dashboard.
- Lab interpreter.
- ABG workflows.
- Critical value review.
- Calculator recommendation.
- Lab AI.

Navigation stance:

- Searchable and workspace-promoted.
- Included in Tools and relevant packs.
- Can appear on Command Center for lab/ICU/ED workspaces.

### Profile And Settings

Purpose: account, preferences, security, notifications, workspace membership, organization setup, and admin settings.

Should include:

- Profile summary.
- Tool preferences.
- Workspace preferences.
- Security and MFA.
- Notification preferences.
- Organization settings for admins.
- Pack management for organization admins.

Should not include:

- Daily product navigation.
- Duplicated commercial catalog unless admin is configuring packs.

## Component Hierarchy

Use existing ownership:

- [`src/layout/AppShell.jsx`](../src/layout/AppShell.jsx): authenticated shell, sidebar/drawer, header, workspace switcher, Quick Command, main scrollport.
- [`src/layout/AuthShell.jsx`](../src/layout/AuthShell.jsx): auth-only surfaces.
- [`src/layout/PublicShell.jsx`](../src/layout/PublicShell.jsx): public/legal/help surfaces.
- [`src/layout/PageContainer.jsx`](../src/layout/PageContainer.jsx): consistent page spacing and content width.
- [`src/components/ui/PageHeader.jsx`](../src/components/ui/PageHeader.jsx): page title, subtitle, actions.
- [`src/components/Sidebar.jsx`](../src/components/Sidebar.jsx): only sidebar/drawer presentation.
- [`src/components/QuickCommandLauncher.jsx`](../src/components/QuickCommandLauncher.jsx): search and command entry.
- [`src/components/WorkspaceSwitcher.jsx`](../src/components/WorkspaceSwitcher.jsx): workspace context.

Target hierarchy:

```text
AppShell
  Header
    WorkspaceSwitcher
    QuickCommand
    Notifications
    Account utilities
  Sidebar
    Primary nav
    Secondary/Advanced groups
  Main scrollport
    PageContainer
      PageHeader
      Product/page sections
        Cards
        Filters
        Tables
        Maps
        Drawers
```

Rules:

- Pages do not create duplicate app shells.
- Pages do not create duplicate global headers.
- Pages use PageContainer/PageHeader unless a special map/chat/table layout is required.
- Local scroll is allowed for chat, tables, maps, and drawers as declared in [`src/config/layout.config.js`](../src/config/layout.config.js).
- Global scroll belongs to AppShell.

## Visual Design Language

Design principles:

- Clinical clarity over decoration.
- Dense enough for professionals, calm enough for high-stress workflows.
- One typography scale across clinical, operational, commercial, and admin surfaces.
- One card language for dashboard, packs, tools, alerts, and workflows.
- One badge language for state: active, locked, demo, beta, review required, high risk, stale, live.
- One empty/error/loading language.
- Clear separation between clinical decision support, operations, training, and admin states.

Visual primitives:

- Cards for launchable assets and dashboard summaries.
- Badges for lifecycle, risk, tier, readiness, and data freshness.
- Banners for safety, API degradation, demo mode, and high-risk context.
- Tables for audit/admin/reporting.
- Maps for Digital Twin, facility, fleet, and live tracking.
- Drawers/modals for focused details and quick actions.
- Command palette for intent-based navigation.

## Theme System

The theme system should continue to use existing theme context and token files:

- [`src/contexts/ThemeContext.jsx`](../src/contexts/ThemeContext.jsx)
- [`src/styles/theme-tokens.css`](../src/styles/theme-tokens.css)
- [`src/styles/design-tokens.css`](../src/styles/design-tokens.css)
- [`src/styles/theme-surfaces.css`](../src/styles/theme-surfaces.css)
- [`src/styles/theme-legacy-bridge.css`](../src/styles/theme-legacy-bridge.css)

Target rules:

- New product surfaces use tokens rather than hard-coded colors.
- Demo/live/locked/high-risk states have semantic tokens.
- Dark mode must preserve map, chart, alert, and card readability.
- Clinical risk colors should be used sparingly and consistently.
- Commercial pages should share the same product card language instead of looking like a separate site.

## Mobile Layout

Mobile should be a compact version of the same product, not a separate bottom-nav product.

Rules:

- Keep header menu button, workspace switcher, and Quick Command.
- Use the same sidebar/drawer navigation model.
- Do not reintroduce bottom nav as a second IA.
- Prioritize search, recent assets, workspace recommendations, and primary actions.
- Use compact cards and single-column stacks.
- Maps, tables, chat, and drawers can own local scroll where necessary.
- Keep safe-area and compact layout behavior in the existing responsive CSS system.

## Workspace Context

Workspace should shape the product without becoming a competing navigation taxonomy.

Workspace affects:

- Command Center cards.
- Assistant default agent and prompt suggestions.
- Tools filters and recommendations.
- Operations layer defaults.
- Search ranking.
- Simulation recommendations.
- Pack upgrade prompts.
- Analytics segmentation.

Workspace should not:

- Grant assets outside organization entitlement.
- Replace route authorization.
- Duplicate product navigation.

## Asset And Pack Experience

All launchable surfaces should eventually be asset-backed.

Asset card states:

- Available.
- Recommended.
- Recent.
- Favorite.
- Locked.
- Requires admin.
- Demo-backed.
- Beta.
- Deprecated.
- Review required.

Pack experience:

- Product pages explain buyer outcomes.
- Pack pages show included assets, readiness, integrations, AI workflows, dashboards, and pricing placeholder.
- Installed packs shape workspace defaults.
- Locked assets show request-access, not dead ends.

## AI Assistant Experience

Assistant should be one entry point with many governed modes.

User-facing model:

- Choose or infer agent from workspace.
- Show suggested workflows.
- Launch tools and workflows.
- Cite sources when using RAG.
- Explain safety limits.
- Show review-required state.
- Send high-risk outputs to human review.

Commercial model:

- Standard versus premium routing is invisible by default but auditable.
- Enterprise admins can see usage, safety, review, and cost dashboards.
- Locked agents/workflows show pack upgrade paths.

## Operations Experience

Operations should own operational complexity.

Operations groups:

- Digital Twin.
- Hospital Map.
- Medical IoT.
- Devices.
- Fleet.
- Live Map.
- Alerts.
- Workflows.
- Operational analytics.

Operations pages should share:

- Data freshness indicators.
- Demo/live labels.
- Layer toggles.
- Alert severity badges.
- Human-confirmed workflow actions.
- Operational AI entry.

## Advanced Experience

Advanced should be permissioned and visually secondary.

Advanced includes:

- Governance.
- Security.
- Audit.
- Regulatory.
- Human review.
- Assets.
- Feature flags.
- System health.
- Plugins.
- Data lineage.
- Dependency map.
- Self diagnostics.
- Organization admin tools.

Advanced should not be part of the main product story for clinicians, students, EMS operators, or lab users unless their role requires it.

## Migration Phases

### Phase 1: Alignment

- Ensure docs, routes, navigation, packs, and assets use the same terminology.
- Keep primary navigation to Command Center, Assistant, Tools, and Operations.
- Add missing cross-links and product-state language.
- Confirm AppShell remains the only authenticated shell.

### Phase 2: Asset-Backed Experience

- Backfill user-facing tools into `platform_assets`.
- Route launch, search, command, dashboard cards, and product pages through asset access decisions.
- Add consistent locked/request-access/demo/beta/review states.
- Align pack and workspace recommendations.

### Phase 3: Page And Component Cleanup

- Replace page-specific chrome with PageContainer/PageHeader patterns.
- Remove duplicate main landmarks, skip links, scroll shells, and global headers.
- Consolidate duplicated dashboards and route aliases.
- Normalize cards, badges, empty states, and error states.

### Phase 4: Product Surface Consolidation

- Make Operations the home for Digital Twin, IoT, devices, fleet, maps, alerts, and workflows.
- Keep Simulation and Laboratory as Tools/workspace/product surfaces rather than global nav peers.
- Move developer/governance/admin surfaces under Advanced.
- Make product/commercial pages configuration and sales surfaces, not daily navigation.

### Phase 5: Analytics-Led Refinement

- Use product metrics to identify overexposed routes, unused assets, confusing search terms, and high-value packs.
- Promote frequently used workspace assets.
- Hide, repackage, or improve low-value surfaces.
- Validate mobile behavior and command/search adoption.

## Risks

- The product keeps adding routes faster than it consolidates IA.
- Commercial pages create a second product hierarchy separate from day-to-day work.
- Workspaces become another navigation tree instead of context.
- Advanced/admin pages remain too visible for normal users.
- AI feels like an ungoverned chat bot instead of a governed product layer.
- Digital Twin, Simulation, and Laboratory remain isolated demos.
- Mobile introduces a separate bottom navigation model.
- Design token drift causes inconsistent visual states.

## Acceptance Criteria

- The product can be explained with four primary destinations: Command Center, Assistant, Tools, and Operations.
- Routes, navigation, command/search, dashboard cards, and product pages use the same asset and pack vocabulary.
- AppShell owns authenticated chrome, header utilities, sidebar/drawer, workspace switcher, Quick Command, and main scroll.
- Digital Twin, Medical IoT, devices, fleet, maps, alerts, and workflows are clearly Operations surfaces.
- Simulation and Laboratory are productized asset families, searchable and workspace-promoted without bloating primary nav.
- Governance, security, audit, regulatory, system, and admin pages are Advanced or account/admin surfaces.
- Mobile uses the same IA through compact shell/drawer/search behavior.
- Theme and UI states are token-driven and consistent across clinical, operations, commercial, simulation, lab, profile, settings, and admin surfaces.
- Analytics can measure whether the redesign reduces confusion and preserves feature access.

