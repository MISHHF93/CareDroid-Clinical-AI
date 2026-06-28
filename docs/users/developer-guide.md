# Developer Guide

## Purpose

Help engineers safely change the current CareDroid codebase.

## Responsibilities

Preserve route contracts, role permissions, service boundaries, tests, and documentation traceability.

## Daily Workflow

Read the relevant source and docs, make scoped changes, run targeted tests, then run lint/typecheck/build where feasible.

## Screens Used

All emergency routes, Help Hub, Tools, Settings, Admin, System Health.

## Permissions

Use app roles through the demo role switcher or configured identity.

## AI Features

AI code paths include Copilot, native AI panels, AI gateway, medical control plane, RAG, tool orchestration, and safety guardrails.

## Alerts

Route drift, permission drift, stale docs, failing validation, inaccessible mounted routes.

## Reports

Architecture docs, service catalog, AI docs, gap analysis, validation logs.

## Troubleshooting

Start with `rg`, inspect route and permission config together, and verify any UI promise has a mounted route and permission path.

## Best Practices

Prefer existing helpers and canonical route constants over literals.

## Known Limitations

The repo is broad; run targeted tests before expensive full validation.

