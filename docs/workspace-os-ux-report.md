# Workspace OS UX Report

Date: 2026-06-08

## Goal

Users should feel they entered a new operating environment when they change workspaces, while CareDroid still uses one app shell, one navigation model, and one route system.

## Principle

The shell stays constant. The workspace changes:

- visual tone
- hero language
- key metrics
- recommended next actions
- assistant prompt context
- dashboard/recommendation emphasis
- workspace detail panels

## Target Workspace Environments

| Workspace | User Should Feel | Canonical Dashboard Focus | Recommendations Focus | Assistant Context |
| --- | --- | --- | --- | --- |
| Emergency | A rapid-response clinical command room | Triage, active alerts, deterioration scores, emergency calculators | Time-sensitive triage, escalation, red flags, emergency pathways | Red flags, sepsis/stroke/chest pain, escalation next steps |
| Medical IoT | A telemetry and biomedical operations console | Device health, stale telemetry, offline devices, battery/maintenance risk | Offline devices, telemetry freshness, biomedical engineering priorities | Device alerts, telemetry trends, maintenance, battery risk |
| Fleet | A transport logistics and dispatch board | Fleet map, dispatch readiness, route risk, maintenance | Dispatch, route sequencing, vehicle readiness, predictive maintenance | ETAs, dispatch support, route risk, vehicle maintenance |

## Current State

The existing code already supports workspace-aware content through `getWorkspaceExperienceProfile()` and uses it in the command dashboard, tools page, recommendations page, and workspace page. Emergency and Medical IoT have stronger copy than Fleet. Visual differentiation is still light: pages mostly reuse the same surfaces with different text.

## Gaps

1. Workspaces do not expose a visual theme or tone token.
2. Dashboard hero panels do not show environment-specific operational metrics.
3. Workspace detail pages do not show a workspace-specific "operating brief".
4. Fleet lacks a complete dashboard subtitle and recommendation subtitle.
5. Assistant context is textually different, but not presented as a distinct operating mode.
6. Emergency, IoT, and Fleet route/tool emphasis is present, but not visually obvious.

## Implementation Plan

1. Extend the shared workspace experience model with `tone`, `theme`, `environment`, `focusMetrics`, `operatingBrief`, and `primaryActionIds`.
2. Add CSS classes driven by workspace id and tone to the existing `CommandDashboard` and `WorkspaceHome` containers.
3. Render a compact operating brief on the command dashboard hero.
4. Render a workspace-specific operating brief on `WorkspaceHome`.
5. Strengthen Fleet copy and ensure Fleet routes emphasize map, dispatch, and maintenance.
6. Keep one shell and one set of routes. Do not create separate apps or route trees.

## Expected Result

When a user enters:

- Emergency Workspace: the UI highlights rapid triage, critical alerts, and emergency assistant context.
- Medical IoT Workspace: the UI highlights device alerts, telemetry freshness, and maintenance signals.
- Fleet Workspace: the UI highlights fleet map, dispatch, route risk, and maintenance readiness.

The app still uses the same shell, navigation, providers, and route configuration.
