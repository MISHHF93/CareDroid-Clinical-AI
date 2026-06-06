# SaaS Billing Readiness Report

## Goal

Prepare CareDroid for future SaaS billing by adding a durable metering layer for billable platform usage. This work does not implement payment processing, invoices, checkout, or payment provider integration.

## Metered Dimensions

- User seats
- AI requests
- Simulation runs
- Workflow executions
- API usage
- Storage usage

## Implementation Scope

The metering layer should provide a single backend service for recording and summarizing usage by organization, user, source, and billing period. Product features can emit usage events now, while future billing can attach pricing, invoices, and payment collection without changing feature code.

## Data Contract

Each usage record should include:

- Organization scope.
- Optional user scope.
- Meter type.
- Quantity.
- Source feature or API surface.
- Optional idempotency key for retry-safe writes.
- Metadata for audit and future invoice explanation.
- Usage timestamp and billing period.

## Safety Rules

- Metering must be organization scoped.
- Usage writes should be idempotent when an idempotency key is provided.
- Payment processing must remain out of scope.
- The summary API should expose totals only for authorized organization members.
- Meter names should be stable so billing can map them to prices later.

## Acceptance Mapping

Future billing can be attached without architecture changes when all billable dimensions write through a shared metering service and expose period summaries that can later be converted into invoice line items.
