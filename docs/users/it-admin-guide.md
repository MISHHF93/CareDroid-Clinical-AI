# IT Administrator Guide

## Purpose

Maintain CareDroid availability, configuration, identity, integrations, and deployment health.

## Responsibilities

Manage settings, environment variables, backend reachability, build validation, audit access, and incident response.

## Daily Workflow

Check System Health, verify backend connectivity, confirm demo/local mode expectations, review logs, and support role/permission issues.

## Screens Used

Settings, System Health, Admin Operations, Audit, Help, Emergency pages for smoke testing.

## Permissions

Maps to Admin in the current emergency role model.

## AI Features

AI governance and Copilot availability checks; AI outputs remain human-reviewed.

## Alerts

Backend offline, WebSocket reconnecting, stale data, asset validation failure, build/test failure.

## Reports

System health, audit log, build logs, validation output.

## Troubleshooting

Use `npm run typecheck:frontend`, `npm run lint`, `npm run test:run:frontend`, and `npm run build` for frontend verification. Backend validation lives under `backend`.

## Best Practices

Keep `.env.example` synchronized and avoid committing local secrets.

## Known Limitations

Some enterprise integrations are represented by fallback or demo data in local mode.

