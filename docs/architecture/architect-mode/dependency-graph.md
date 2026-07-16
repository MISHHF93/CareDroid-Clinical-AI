# Dependency Graph — Architect Mode Stage A

High-level module edges. Arrows mean “depends on / calls”.

## Frontend application graph

```
main.tsx
  → theme CSS, observability, deferStartup
  → app/App.tsx
       → providers (UserIdentity, Tenant, Theme, Offline, …)
       → router.tsx
            → auth guards
            → AppShell
                 → Header, Sidebar
                 → emergencyStore
                 → engines (reassessment, capacity, flow, automation, OI, knowledge, living docs)
                 → emergencyRealtimeService, emergencyOsApi
                 → CopilotPanel, CommandPalette, drawers
            → pages/* (lazy)
                 → services/*
                 → components/*
                 → store/emergencyStore
                 → config/* (routes, permissions, screen models)
```

## Reception subgraph

```
ReceptionWorkspace
  → components/reception/*
  → receptionIntakeBridge / Orchestrator / Handoff / Escalation / QuickIntake
  → emergencyStore
  → queueAssignment
  → optional API (intake, emergency-os, ems)
  → AppShell chrome (minimal mode)
```

## Backend graph

```
main.ts
  → AppModule (Nest DI graph)
       → auth, users, audit, encryption
       → tenant-context, organizations, workspaces
       → rag (embedding → retrieval → rerank → citation)
       → ai, ai-gateway, moe-router, chat, tool-calling
       → emergency-os, clinical*, collaboration-hub
       → platform-*, subscriptions, notifications
  → optional mongoose + routes-registry (Express)
       → services/* (ems, ocr, intake, copilot, capacity, …)
       → runtime-auth
  → websockets (ems, edge, sentinel)
  → TypeORM DataSource / migrations
```

## Shared / monorepo edges

```
lib/ai/*  ← FE services & BE adapters (transportSafety, providers)
lib/rag, lib/emergency-os, engine/*  ← FE engines & possibly BE
types/*  ← dual import risk with src/types and contracts
data/medical-knowledge, knowledge-registry  ← RAG bootstrap
```

## Circular / risk edges

| Edge | Risk | Mitigation Stage |
|------|------|------------------|
| emergencyStore ↔ services importing store | Circular FE deps | F extract pure actions |
| AppShell → many engines at boot | Bundle + failure coupling | F gate experimental engines |
| RAG service → PineconeService typed as vectorDb | Naming implies single vendor | G interface injection |
| FE pages → heavy chart libs | Bundle bloat | Done: DashboardCharts split |
| Express services ↔ Nest modules | Dual authority | D/H Nest primary |

## Orphans (investigate; do not delete without importer proof)

Re-run:

```
npm run orphan-detection:write-docs
```

Treat output as candidate list only — Stage A requires zero-importer + replacement proof before removal.
