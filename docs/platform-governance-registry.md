# Platform Governance Registry

## Purpose

The Platform Governance Registry tracks accountable governance metadata for every CareDroid platform asset. It gives clinical, operational, compliance, and platform teams a single view of who owns each asset, who stewards it, who approves changes, and how the asset is audited and reviewed.

## Routes and API

- Frontend route: `/governance-registry`
- Backend API: `GET /api/platform/governance-registry`
- Permission: `VIEW_GOVERNANCE`
- Source of truth: `platform_assets` rows plus `asset.governance` metadata and asset pack metadata

## Required Fields

Every registry row includes:

- `owner`: business or platform owner accountable for the asset
- `steward`: operational steward responsible for upkeep
- `approver`: person, role, or board that approves changes
- `riskLevel`: canonical asset risk level
- `evidenceSource`: source used to justify validation or governance state
- `version`: asset catalog or governance version
- `auditRequirement`: audit posture, such as `required` or `standard`
- `reviewSchedule`: review cadence, such as `quarterly`, `semiannual`, or `annual`

## Derivation Rules

The registry first reads explicit values from `asset.governance`. If an older asset does not yet carry all fields, the service derives safe defaults from asset pack buyer metadata, asset type, route, risk level, and catalog version.

Examples:

- Clinical decision support assets default to `Clinical Governance Lead` approval and `semiannual` review.
- High-risk or governance-required assets default to board-level approval and `quarterly` review.
- Operational integrations default to interoperability stewardship and required audit posture.
- Informational assets default to standard audit posture and annual review.

## Completeness

Rows are marked `complete` only when all required fields resolve. The registry summary reports total assets, complete rows, incomplete rows, audit-required assets, human-review assets, and counts by risk level.

## Seed Coverage

Seeded platform assets now include governance defaults for owner, steward, approver, evidence source, version, audit requirement, and review schedule. The registry route itself is also registered as a governance asset, so the governance registry governs its own lifecycle and review requirements.

## Operational Use

Use `/governance-registry` before releasing or changing a platform asset. It answers:

- Who owns this asset?
- Who stewards operational upkeep?
- Who approves changes?
- What risk level applies?
- What evidence supports the asset?
- What version is active?
- Is audit required?
- When is the next scheduled review cadence?
