# Usage Metering Framework

## Purpose

The Usage Metering Framework tracks tenant activity independently from billing. It gives CareDroid a neutral usage ledger for product analytics, customer success, entitlement planning, and future usage-based billing models without turning every usage event into a charge.

## Metered Signals

The framework tracks:

- Active users: unique users observed in tenant usage plus explicit active-user meter events.
- AI requests: AI calls and model-backed assistant requests.
- Simulation runs: simulation events and scenario run meters.
- Workflow executions: workflow-tagged events and workflow execution metadata.
- API calls: tenant-scoped backend requests recorded by the metering interceptor.
- Integrations: integration syncs, connector calls, and integration-tagged API events.

## Storage Model

Usage is stored in `usage_events`, separate from subscriptions, invoices, and Stripe records.

Each event preserves tenant and product dimensions:

- `organizationId`
- `workspaceId`
- `userId`
- `userRole`
- `assetId`
- `eventType`
- `quantity`
- `unit`
- `periodStart`
- `periodEnd`
- `occurredAt`
- `metadata`

This makes usage useful for analytics and future billing while keeping billing decisions outside the raw usage ledger.

## API

The framework is exposed through:

- `GET /api/subscriptions/usage/metering?period=month`

Supported periods:

- `day`
- `week`
- `month`

The endpoint returns billing-neutral meters, retained dimensions, usage breakdowns, recent events, and future billing candidates. The existing `GET /api/subscriptions/usage` endpoint remains the plan-limit-aware view used by billing and usage-limit UI.

## Billing Separation

Usage metrics are not billing records.

Current separation rules:

- Usage events are operational telemetry.
- Billing overview can read usage summaries, but usage events do not create invoices.
- Stripe subscription and invoice state remains in subscription and billing flows.
- The metering framework labels future billing candidates without applying charges.

## Future Billing Readiness

The framework prepares for pricing models such as:

- Per-active-user pricing.
- AI request tiers.
- Simulation run bundles.
- Workflow execution allowances.
- API request allowances.
- Integration connector or sync volume pricing.

Because meters preserve tenant, workspace, asset, role, user, and integration dimensions, future billing models can be introduced as pricing policies over historical usage rather than schema changes to the operational ledger.
