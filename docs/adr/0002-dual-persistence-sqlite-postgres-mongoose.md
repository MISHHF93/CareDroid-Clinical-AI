# ADR-0002: Dual persistence — TypeORM (relational) + optional Mongoose (clinical)

- **Status:** Accepted (implemented)
- **Date:** undated in source; inferred from current `app.module.ts` / `main.ts` structure

## Context

CareDroid has two distinct kinds of data with different shapes and access patterns: (1) platform/SaaS data — users, organizations, workspaces, subscriptions, audit logs, governance records — which is naturally relational and benefits from TypeORM migrations and referential integrity; and (2) the live clinical patient record (`UnifiedPatient`), which is deeply nested, evolves quickly (vitals, wearable streams, AI recommendations, safety alerts, protocol triggers), and originated in an earlier "Emergency OS" codebase built on MongoDB/Mongoose.

## Decision

Keep both persistence layers rather than forcing the patient domain into the relational schema:

- **TypeORM** (PostgreSQL in production, SQLite in local dev via `DATABASE_CLIENT`) for the ~55 platform entities.
- **Mongoose/MongoDB** for `UnifiedPatient` and `SmartIntake`, connected only when `ENABLE_MONGOOSE_EMERGENCY_OS=true` (`registerEmergencyMongooseRuntime()` in `backend/src/main.ts`). This also gates the `reassessment.scheduler.ts` cron job and the legacy Express routes that operate on Mongo patient documents.

## Consequences

- **Two query languages, two migration systems** to maintain (TypeORM migrations under `backend/src/database/migrations/`, legacy JS Mongo migrations under `backend/migrations/`) — real ongoing cost, but avoids forcing a fast-evolving clinical schema into rigid relational tables.
- **A load-bearing feature flag:** whether the "real" patient model is live in a given environment depends entirely on `ENABLE_MONGOOSE_EMERGENCY_OS`. The default app-only Docker profile (`docker-compose.app.yml`) ships with this **off**, which is easy to miss when debugging "why are patient endpoints returning nothing" in a fresh environment.
- **No foreign-key integrity between the two stores** — e.g. a `User` (Postgres/SQLite) and a `UnifiedPatient` they're assigned to (Mongo) can't be joined at the database level; any cross-store consistency has to be enforced in application code.
- Enables patient-domain schema evolution (new vitals fields, new AI recommendation shapes) without a relational migration for every change.

## Alternatives considered

- Modeling the patient domain relationally in Postgres alongside everything else — would have required either a rigid normalized schema (poor fit for the patient record's nested, frequently-changing shape) or heavy use of JSONB columns (loses much of the benefit of being relational in the first place). Not pursued; the existing Mongoose model was kept instead of a rewrite.
- Making Mongoose always-on rather than feature-flagged — would simplify "is the patient domain live" reasoning, but the flag exists (as of this ADR) presumably to let lightweight/demo deployments run without standing up MongoDB at all.
