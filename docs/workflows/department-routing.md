# Department Routing Workflow

Purpose: get each patient and staff member to the correct operational surface.

## Current Implementation

Routing is centralized in `src/config/routes.config.ts`, with emergency role access in `src/config/emergencyRolePermissions.ts`. Reception-first patient creation uses helper functions such as `getReceptionPrimaryCreatePath`.

## Workflow

1. User role resolves from profile or demo role.
2. Navigation renders only routes available to that role.
3. Patient creation routes to Reception when configured.
4. Queue filters and patient query parameters carry context between Whiteboard, Patients, Queues, Reassessment, and Referrals.
5. Unauthorized route attempts land on a permitted fallback.

