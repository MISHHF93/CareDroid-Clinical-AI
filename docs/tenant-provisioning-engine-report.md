# Tenant Provisioning Engine Report

## Goal

New CareDroid organizations should be provisioned automatically so customer onboarding does not require manual setup after an organization is created.

## Required Workflow

1. Organization created
2. Tenant created
3. Default workspaces created
4. Default roles created
5. Asset packs assigned
6. AI agents assigned
7. Dashboard configured

## Implementation Scope

The provisioning engine should run as part of organization creation and onboarding. It should reuse existing organization settings, workspace, role profile, asset pack, and platform context services instead of creating a separate tenant model.

## Provisioning Outputs

- Tenant settings with tenant id, compliance mode, onboarding status, and provisioning metadata.
- Default workspace definitions based on organization type.
- Default role/profile assignments suitable for the organization.
- Default asset pack entitlements for the organization type.
- Default AI agent ids derived from role/profile and pack context.
- Dashboard layout and navigation defaults for the customer portal and operating dashboards.

## Safety And Isolation Rules

- Provisioning must be organization scoped.
- Provisioning must be idempotent enough to avoid duplicating workspaces, roles, packs, agents, or dashboard config on retries.
- Existing customer configuration should be preserved unless provisioning is explicitly asked to fill a missing default.
- Tenant ids must be stable and derived from the organization record.
- Provisioning should record status and timestamps for supportability.

## Acceptance Mapping

New customer onboarding becomes automatic when organization creation triggers tenant creation, workspace defaults, role defaults, asset pack assignment, AI agent assignment, and dashboard configuration in a single backend workflow.
