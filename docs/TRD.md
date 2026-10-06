# CareDroid — Technical Requirements Document (TRD)

**Document Version:** 2.2.0  
**Status:** Living Engineering Baseline / Technical Specification  
**Lead Authors:** Principal Enterprise Architect, DevSecOps Lead, Senior Backend Lead  

---

## 1. System Overview & Technology Stack

CareDroid is an enterprise-grade medical operations and intelligence platform engineered for zero-downtime, sub-second latency, and fault-tolerant clinical workflows.

| Subsystem | Primary Technology | Purpose & Architectural Justification |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18.3+ / TypeScript 5.5+ | Modern concurrent rendering, type-safe clinical domain models. |
| **Build & Bundling** | Vite 5.x | Instant HMR in development, tree-shaken ES modules in production. |
| **State Management** | Zustand 4.5+ | Lightweight, reactive, decoupled global state for active ED patients and beds. |
| **Design Language** | CareDroid Design Language (CDL v2.1) | Custom CSS token system for clinical ergonomics and WCAG 2.2 AA/AAA contrast. |
| **Backend Framework** | NestJS 10.x / TypeScript 5.5+ | Enterprise modular architecture with dependency injection and strong typing. |
| **Data Persistence** | TypeORM 0.3+ / PostgreSQL 16+ | ACID-compliant relational storage; SQLite with `synchronize` for rapid local dev. |
| **Real-time Engine** | `@nestjs/websockets` / Socket.IO | Bi-directional, low-latency push notifications (<500ms delivery across pods). |
| **Caching & Pub/Sub** | Redis 7.x | Cluster-wide session tokens, volatile alert pub/sub, rate-limiting counters. |
| **Testing Harness** | Vitest 1.6+ (Frontend) / Jest (Backend) | Fast in-memory unit, contract, and responsive viewport testing. |

---

## 2. Frontend Engineering Architecture

### 2.1 Package Boundary & Invariants
- **Zero Cross-Tree Imports:** `src/` must **NEVER** import from `backend/src/`. The frontend accesses clinical operations solely via authenticated HTTP endpoints and WebSocket events. This is enforced mechanically by `npm run architecture:check`.
- **Page Inventory Guardrails:** `src/data/pageDispositionFixture.ts` strictly tracks `PAGE_INVENTORY_EXPECTED_TOTAL`, `PAGE_SOURCE_EXPECTED_TOTAL`, and `PAGE_STYLE_EXPECTED_TOTAL` to detect uncatalogued or orphaned pages during PR CI runs.

### 2.2 Component Hierarchy & Shell Sizing
The layout engine enforces strict sizing contracts:
- Topbar Utility Height: `--cdl-header-height: 60px`
- Route Identity Height: `--cdl-route-tab-height: 72px`
- Chrome Stack Height: `--cdl-chrome-stack-height: calc(var(--cdl-header-height) + var(--cdl-route-tab-height))`
- Sidebar Navigation Rail: `--cdl-sidebar-width: 252px` (expanded) / `64px` (collapsed).
- Minimum Mobile Touch Target: `--cdl-touch-min: 44px`.

---

## 3. Backend Engineering Architecture

### 3.1 Modular Organization
```
backend/src/
├── app.module.ts              # Root composition module
├── common/                    # Shared filters, interceptors, decorators
├── database/                  # TypeORM connection configs and migration files
└── modules/
    ├── audit/                 # Cryptographic immutable audit logging
    ├── auth/                  # JWT token issuance, verification, session tracking
    ├── capacity/              # Surge levels, bed occupancy, boarding tracking
    ├── ems/                   # Pre-arrival ambulance telemetry ingestion
    ├── patient/               # Active patient registry and encounter models
    ├── surveillance/          # Facility operations, patient safety, IoT integration
    ├── triage/                # CTAS acuity algorithms, vital ranges, red flag logic
    └── user-profile/          # RBAC / ABAC clinical persona profiles
```

### 3.2 Authorization & Guard Stack
Every controller endpoint executes through a three-stage authorization filter pipeline:
1. `JwtAuthGuard`: Validates cryptographic signature and expiration of bearer tokens.
2. `RolesGuard`: Verifies that `user.role` holds the required permission for the canonical route or mutation.
3. `ProfileSegregationGuard`: Prevents cross-tenant data leakage by validating organization and facility tenant identifiers.

---

## 4. API & Real-Time WebSocket Specifications

### 4.1 Core REST API Endpoints
- `GET /api/health`: System health and dependency reachability check.
- `GET /api/profile/me`: Retrieves authenticated user persona and granted action permissions.
- `GET /api/emergency/whiteboard`: Returns active snapshot of patients, pods, and beds.
- `POST /api/emergency/triage`: Submits verified triage vitals and confirmed CTAS acuity.
- `POST /api/emergency/orders`: Submits signed diagnostic or medication order.
- `POST /api/emergency/ems/pre-arrival`: Ingests inbound paramedic telemetry.
- `POST /api/emergency/disposition`: Records final patient disposition (Admit/Discharge/Transfer).

### 4.2 WebSocket Operational Contracts
Clients connect to `/emergency-os` with bearer authentication:
- **Client Emits:** `subscribe_pod`, `ping`, `request_snapshot`.
- **Server Emits:**
  - `PATIENT_ARRIVED`: New patient entry at reception.
  - `VITALS_UPDATED`: Streaming vital signs update.
  - `ACUITY_ASSIGNED`: Finalized CTAS level assignment.
  - `SEPSIS_ALERT`: Early deterioration warning broadcast.
  - `BED_ALLOCATED`: Bed state transitioned to occupied.

---

## 5. Security, Cryptography & Compliance

1. **Encryption Standards:**
   - In Transit: TLS 1.3 mandatory with HSTS (`Strict-Transport-Security`).
   - At Rest: AES-256-GCM encryption for all database volumes and backups.
2. **Secrets Hygiene:** Secrets are injected via environment variables; `.env.example` contains variable names only. No credentials or API keys may be committed to version control.
3. **Audit Immutability:** Audit events record `timestamp`, `userId`, `roleId`, `actionType`, `patientId`, `priorState`, `newState`, and `clientIpHash` in an append-only table.

---

## 6. Measurable Technical Acceptance Criteria

| Metric | Target | Verification Tool |
| :--- | :--- | :--- |
| **TypeScript Compilation** | 0 errors across frontend and backend | `npm run typecheck:all` |
| **Linting & Code Formatting** | 0 ESLint errors; 100% Prettier compliance | `npm run lint` & `lefthook` |
| **Architecture Boundaries** | 0 cross-boundary package imports | `npm run architecture:check` |
| **Living Documentation Sync** | 12/12 files in `docs/generated/` synchronized | `npm run docs:check` |
| **Database Schema Drift** | 0 migration divergences against TypeORM entities | `npm run db:verify` |
| **UI Touch Targets** | ≥ 44px on mobile viewports (<640px) | `npx vitest run src/styles/responsiveUx.test.ts` |
| **WCAG 2.2 AA Contrast** | ≥ 4.5:1 normal text, ≥ 7:1 critical alarms | `npx vitest run src/styles/fjCriticalBannerCta.contrast.test.ts` |

---

