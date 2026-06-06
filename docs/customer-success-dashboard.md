# Customer Success Dashboard

## Purpose

The Customer Success Dashboard measures tenant health and retention risk for each CareDroid organization. It gives customer success, implementation, and executive stakeholders one place to review whether a hospital is adopting its subscribed products, using entitled assets, completing workflows, and getting value from AI and simulation capabilities.

## Route

- Frontend route: `/customer-success`
- Backend API: `GET /api/platform/organizations/:organizationId/customer-success?period=month`
- Supported periods: `day`, `week`, `month`

The endpoint is tenant-scoped and requires organization membership plus analytics permission.

## Tracked Metrics

The dashboard tracks the requested customer success signals:

- Adoption: enabled asset coverage from subscribed packs compared with the total platform asset catalog.
- Active users: unique users observed in usage events and audit logs, including active-user meter events.
- Asset usage: total asset usage volume for the period, plus the top assets by engagement.
- AI usage: AI call usage events plus assistant/chat audit activity.
- Simulations completed: completed simulation usage events and simulation completion audit activity.
- Workflows completed: workflow completion usage events and workflow completion audit activity.
- Underused products: enabled products whose entitled packs have low or zero asset usage.

## Health And Retention Model

The dashboard calculates a customer health score from adoption and engagement:

- Adoption contributes 40% of the score.
- Engagement contributes 60% of the score across active users, asset usage, AI usage, simulations, and workflows.
- Zero-usage enabled products apply a small underuse penalty so customer success teams can identify expansion or enablement opportunities.

Health status is derived from the final score:

- `healthy`: score is 75 or higher, retention risk is low.
- `watch`: score is 50 to 74, retention risk is medium.
- `at-risk`: score is below 50, retention risk is high.

## Data Sources

The dashboard combines existing platform data instead of requiring customer-specific code:

- `organization_entitlements` for enabled asset packs.
- `asset_packs` and `platform_assets` for entitled asset coverage.
- `products` for product-to-pack ownership and underused product mapping.
- `usage_events` for usage, AI calls, simulations, workflows, and active users.
- `audit_logs` for user activity and completion signals where direct usage telemetry is unavailable.

## No-Code Customer Success Workflow

Customer success teams use the dashboard to:

- Identify accounts with low adoption or engagement before renewal.
- Review underused products and map them to enablement actions.
- Confirm AI, simulation, and workflow usage after rollout.
- Link retention conversations back to product usage and expected outcomes.

The dashboard is tenant-scoped, so each organization can be reviewed independently without code changes.
