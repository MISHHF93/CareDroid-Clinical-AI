# Data Model Spec

Core models:

- `CareDroidUserProfile`: canonical staff identity and scope.
- `CompiledCareDroidAccessProfile`: runtime role, permission, route, nav, AI, alert, staff, and data access contract.
- Patient record: demographics, arrival source, complaint, acuity, status, owner, department, alerts, timers, handoffs.
- Alert record: source, severity, owner role, owner user, timer, acknowledgement, escalation, resolution.
- AI Chief recommendation: intent, context, rationale, recommendation, reviewer, override, audit.
- Bottleneck record: service, severity, impact, fallback action, recovery, analytics outcome.

Canonical identity fields:

- organizationId
- networkId
- hospitalSiteId
- departmentId
- unitId
- careTeamIds
- role
- emergencyRoleId
- saasRole
- backendRole
- permissions
- assignedPatients
- alertOwnershipScope
- aiReviewScope
- patientAccessScope
