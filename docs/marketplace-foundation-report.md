# Marketplace Foundation Report

## Goal

CareDroid should expose an extensible customer marketplace where organizations can discover, install, enable, and disable modular platform capabilities without requiring deployments.

## Route

- `/marketplace`

## Marketplace Categories

- Asset packs
- Workflows
- Simulations
- Protocols
- AI agents
- Integrations

## Supported Actions

- Install marketplace items into an organization or tenant context.
- Enable installed items for active use.
- Disable installed items without deleting their configuration history.

## Implementation Scope

The marketplace foundation should provide a customer-facing route with searchable category cards, install state, enablement controls, and stable item identifiers. The implementation should be organization-aware and compatible with existing platform asset, workflow, simulation, protocol, AI agent, and integration surfaces.

## Safety Rules

- Marketplace state must be tenant scoped and must not expose cross-tenant installations.
- Disabling an item should preserve its installed record so it can be re-enabled.
- Items should declare category, route, owner, and entitlement metadata so future billing, feature flags, and provisioning can attach cleanly.
- Install, enable, and disable actions should be deterministic and reversible where possible.

## Acceptance Mapping

The platform becomes extensible when customers can browse marketplace categories at `/marketplace`, install new capabilities, and toggle installed capabilities on or off from a unified surface.
