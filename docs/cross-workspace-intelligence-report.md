# Cross-Workspace Intelligence Report

## Goal

Cross-workspace intelligence explains how clinical, diagnostic, operational, device, fleet, and administrative workspaces depend on each other. The goal is to stop workspaces from operating as isolated silos by making handoffs, upstream signals, downstream actions, and shared assets visible.

## Route

Workspace dependency intelligence is available at `/workspace-dependency-graph`.

## Required Relationships

The first workspace dependency graph includes these critical chains:

- Emergency -> ICU
- Laboratory -> Cardiology
- Medical IoT -> Fleet -> Operations

Additional relationships can be added when a workspace produces data, tasks, alerts, workflows, or decisions that another workspace consumes.

## Graph Model

The graph uses two plain data structures:

- Nodes: workspace ID, label, type, description, outcome focus, and primary signals.
- Edges: source workspace, target workspace, relationship type, strength score, evidence, and operational outcome.

Relationship types:

- Handoff: one workspace transfers responsibility or escalation to another.
- Signal: one workspace produces telemetry, diagnostics, or alerts used by another.
- Workflow: one workspace starts or completes workflow steps used downstream.
- Operational dependency: one workspace depends on another for availability, staffing, fleet, devices, or maintenance.

## Generated View

The `/workspace-dependency-graph` page should generate:

- Workspace count, dependency count, and high-strength dependency count.
- A workspace node overview.
- A dependency chain list.
- Evidence for why each workspace relationship matters.
- A clear Workspace Dependency Graph heading.

## Acceptance

Workspaces stop operating as isolated silos because the platform can show which workspaces depend on each other, what signal flows between them, and which outcomes are affected by those relationships.

## Verification

Verification should cover:

- Emergency to ICU appears as a dependency.
- Laboratory to Cardiology appears as a dependency.
- Medical IoT to Fleet to Operations appears as a multi-hop dependency chain.
- `/workspace-dependency-graph` renders the dependency graph and key evidence.
- Route, navigation, and smoke tests include the page.
