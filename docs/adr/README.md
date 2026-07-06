# Architecture Decision Records

These are **retroactive ADRs** — they document the rationale behind significant architectural decisions that were already made and found evident in the codebase/reports during the research pass behind this Documentation Center, written in standard ADR form so the reasoning isn't lost. Write new ADRs going forward for any comparably significant decision (a new persistence layer, a new LLM provider integration, a breaking change to the RBAC model, etc.) — use [`0000-template.md`](0000-template.md) as the starting shape.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-nlu-migration-off-python.md) | Migrate NLU/anomaly-detection off a separate Python service | Accepted (implemented) |
| [0002](0002-dual-persistence-sqlite-postgres-mongoose.md) | Dual persistence: TypeORM (relational) + optional Mongoose (clinical) | Accepted (implemented) |
| [0003](0003-unified-ai-node.md) | Combine NLU and artifact-router into a single Unified AI Node | Accepted (implemented) |
| [0004](0004-in-house-design-system.md) | No third-party UI component library — in-house primitives | Accepted (implemented) |
