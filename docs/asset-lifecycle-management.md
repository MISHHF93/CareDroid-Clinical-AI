# Asset Lifecycle Management

## Goal

CareDroid assets move through a canonical lifecycle so tools, calculators, simulations, workflows, AI agents, and integrations can be governed without code changes.

## Canonical States

| State | Meaning | Launch Behavior |
| --- | --- | --- |
| `draft` | Asset is being authored, configured, or validated. | Not launchable. Managed by admins only through lifecycle controls. |
| `beta` | Asset is available for controlled rollout and feedback. | Launchable when entitlement, plan, role, and workspace checks pass; labeled as beta. |
| `active` | Asset is generally available in entitled packs. | Launchable when entitlement, plan, role, and workspace checks pass. |
| `deprecated` | Asset remains visible for migration but should not be preferred for new deployments. | Restricted in access projections and visible for migration planning. |
| `archived` | Asset is retired from active use. | Hidden and not launchable, even if an older pack still references it. |

`admin-only` is no longer a lifecycle state. Admin-only behavior is controlled through feature flags, entitlement rules, permission policy, or asset governance metadata.

## Applies To

Lifecycle is stored on `PlatformAsset.lifecycle` and applies to:

- Tools and clinical tools
- Calculators
- Simulations
- Workflows
- AI agents
- Integrations

Other catalog records can also carry lifecycle metadata, but these asset families are the governed lifecycle scope.

## Runtime Controls

- `GET /api/platform/assets?lifecycle=<state>` lists assets by lifecycle state.
- `PATCH /api/platform/assets/:assetId/lifecycle` updates lifecycle state for admin users.
- Unsupported lifecycle values are rejected by the asset registry.
- Legacy aliases are normalized only when they map cleanly into the canonical model:
  - `preview` / `experimental` → `beta`
  - `live` / `production` → `active`
  - `retired` / `hidden` → `archived`

## Access Rules

- `draft` and `archived` fail closed and are not launchable.
- `beta` assets are launchable only after normal entitlement, plan, role, workspace, and permission checks.
- `deprecated` assets remain visible as restricted so customers can migrate off them.
- `active` assets use the normal entitlement and workspace access flow.

## Admin UI

The lifecycle admin surface is available at `/settings/organization/assets`.

It displays lifecycle counts, managed asset scope, current state, and actions for all five lifecycle states.

## Seed Coverage

Seeded platform assets now include examples of all five lifecycle states:

- Plugins start as `draft`.
- Integrations default to `beta`.
- Most production catalog assets default to `active`.
- Selected workflow/template assets demonstrate `deprecated` and `archived` states.

Automated tests verify that tools, calculators, simulations, workflows, AI agents, and integrations all exist in the lifecycle-managed asset registry.
