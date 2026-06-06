# Customer Success Center Report

## Goal

Create a tenant-scoped customer success center at `/success-center` so organizations can measure CareDroid platform value from one place.

## Scope

The success center should track:

- Adoption score
- Workspace adoption
- Asset usage
- AI usage
- Simulation completion
- Workflow completion
- Onboarding progress

It should generate:

- Health Score: `0-100`
- Status: `Healthy`, `At Risk`, or `Needs Attention`

## Data Sources

- Current tenant and organization context comes from `TenantContextProvider` and `UserIdentityContext`.
- Organization-scoped customer success metrics come from the existing `PlatformAssetsApi.getCustomerSuccessDashboard(organizationId, period)` API.
- Workspace and entitlement context comes from the current platform context and active user identity.
- Onboarding progress is derived from tenant readiness signals: organization profile, workspaces, enabled packs/products, integrations, users, and subscription.

## Scoring Model

The page should prefer the backend customer success adoption score when available, then normalize it into a health score from `0-100`. If the backend score is unavailable, the page should derive a conservative fallback score from available tenant context:

- Workspace adoption
- Entitled asset availability
- AI usage
- Simulation completion
- Workflow completion
- Onboarding progress

Status mapping:

- `Healthy`: score is `80-100`
- `At Risk`: score is `50-79`
- `Needs Attention`: score is below `50`

## Security And Isolation Rules

- `/success-center` must be authenticated and rendered inside `TenantRequired`.
- The page must request customer success data only for the current tenant organization id.
- If tenant context and organization context disagree, the page must not request organization-scoped data.
- Backend organization scoping remains authoritative through the existing organization-scoped customer success endpoint.
- The page is organization aware and role aware: all authenticated tenant users can view value metrics, while administrative follow-up links stay within tenant administration and portal routes.

## Acceptance Mapping

Organizations can measure platform value because `/success-center` consolidates adoption score, health status, workspace adoption, asset usage, AI usage, simulation completion, workflow completion, and onboarding progress in a single tenant-scoped dashboard.
