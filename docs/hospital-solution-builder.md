# Hospital Solution Builder

The Hospital Solution Builder is an admin-facing composition workflow at `/solution-builder`. It turns a hospital profile into a recommended CareDroid deployment without requiring product, pack, workspace, agent, or integration changes in code for each customer.

## Inputs

Admins configure the profile through the builder UI:

- Hospital type, such as hospital, academic medical center, health system, government hospital, EMS, or research institute.
- Departments and service areas, including emergency, ICU, cardiology, laboratory, operations, medical IoT, fleet, simulation, research, and governance.
- Asset packs that must be pinned into the deployment.
- Workspace defaults that should be created for the tenant.
- AI agents that should be enabled or forced into the recommendation.
- Integration slugs requested for implementation planning.
- Target goals, such as reducing triage time or improving asset visibility.

The backend accepts the same shape through `POST /solution-builder/recommendations`.

## Recommendation Output

The recommendation engine maps the profile to:

- A commercial plan recommendation.
- Product lines that match the selected hospital type and departments.
- Asset packs derived from selected products and pinned pack inputs.
- Platform assets available through those packs.
- Workspace defaults with enabled tool IDs and default AI agents.
- AI agents selected directly or inferred from departments.
- Integration requests, including baseline clinical context, ADT, identity, and department-specific interfaces.
- A rationale list explaining why the major items were selected.

The response also includes `configurationPatch`, which is the no-code patch that can be applied to the organization configuration.

## Admin Apply Behavior

Applying a solution uses `POST /solution-builder/apply`. The controller requires organization admin access before delegating to the builder service.

The apply path reuses existing organization and entitlement machinery:

- `OrganizationsService.updateConfiguration()` persists enabled products, packs, agents, workspace defaults, navigation, dashboard layout, permissions overrides, and integration requests.
- `ProductCatalogService.reconcileOrganizationCommercialPlan()` reconciles organization entitlements from the selected commercial plan.

This keeps solution application aligned with the existing configuration studio and subscription entitlement model.

## No-Code Customization Model

The builder does not create new product code or route-specific branches for each hospital. Instead, it composes existing catalog primitives:

- Products define marketable solution lines.
- Packs define reusable asset bundles.
- Assets define launchable clinical, operational, AI, and integration surfaces.
- Workspace defaults define the tenant-specific starting experience.
- Agent and integration IDs define which existing capabilities are enabled.

Admins can generate a recommendation, inspect the patch preview, and apply it to the active organization. Future hospital-specific variants should be expressed as new catalog data, pack mappings, or recommendation rules rather than customer-specific code paths.
