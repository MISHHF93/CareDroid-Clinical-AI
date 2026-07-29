# CareDroid Service Catalog

**Generated:** 2026-06-28  
**Source:** `src/services/`, `backend/src/modules/`, `src/store/emergencyStore.ts`

---

## Frontend Services

### Emergency OS Services

#### `emergencyStore` (Zustand)
- **File:** `src/store/emergencyStore.ts` (~5000 LOC)
- **Purpose:** Central state for all ED operations
- **Inputs:** Backend API payloads, WebSocket events, user actions
- **Outputs:** Reactive state for all whiteboard components
- **Key State:**
  - `patients[]` — active patient records
  - `rooms[]` — physical room/bed status
  - `staff[]` — on-shift staff
  - `capacity` — bed capacity score and band
  - `referrals[]` — open referrals
  - `emsArrivals[]` — inbound and arrived EMS units
  - `alerts[]` — clinical and system alerts
  - `emergencySettings` — ED configuration
  - `boardingMetrics` — boarding stats
  - `emergencyAnalytics` — analytics data
  - `backendAvailable: boolean` — backend health
- **Consumers:** All ED pages and components
- **Failure Mode:** Falls back to local demo data when `backendAvailable = false`
- **3-Minute Support:** Single source of truth for reassessment timers, EMS ETAs, critical alerts

#### `receptionHandoff` 
- **File:** `src/services/receptionHandoff.ts`
- **Purpose:** Bridge intake completion to triage queue
- **Key Functions:**
  - `completeIntakeHandoff(state, {patientId, source})` — marks patient ready for triage
  - `refreshIntakeHandoffSurfaces(state)` — triggers store refresh after handoff
- **Consumers:** `EmergencyWhiteboard`, `ReceptionWorkspace`
- **3-Minute Support:** Core of the arrival → pretriage transition

#### `receptionIntakeBridge`
- **File:** `src/services/receptionIntakeBridge.ts`
- **Purpose:** Convert EMS arrivals into reception patient records
- **Key Functions:**
  - `convertEmsArrivalForReception(arrivalId, options)` — creates patient from EMS unit
- **Consumers:** `EmergencyWhiteboard` (convert EMS button)
- **Outputs:** `{ok, patientId, receptionVerifyPath}`

#### `queueAssignment`
- **File:** `src/services/queueAssignment.ts`
- **Purpose:** Determine which queue filter applies to a patient
- **Key Functions:**
  - `matchesWhiteboardQueueFilter(patient, filter, pendingReferralIds)` — boolean
- **Consumers:** `EmergencyWhiteboard` visible patient calculation

#### `navigateToEmergencySurface`
- **File:** `src/services/navigateToEmergencySurface.ts`
- **Purpose:** Role-aware surface routing decisions
- **Key Functions:**
  - `shouldRedirectEmergencySurface(surfaceId, role)` — returns boolean
- **Consumers:** `EmergencyIntakeEntry`, `EmergencySurfaceRedirect`

#### `patientArrivalBackendSync`
- **File:** `src/services/patientArrivalBackendSync.ts`
- **Purpose:** Normalize patient records from backend payload to whiteboard model
- **Key Functions:**
  - `normalizeWhiteboardPatient(patient)` — ensures all fields present with defaults
- **Consumers:** `EmergencyWhiteboard` patient list derivation

#### `operationalCommandDashboardModel`
- **File:** `src/services/operationalCommandDashboardModel.ts`
- **Purpose:** Build the command center dashboard snapshot
- **Key Functions:**
  - `buildOperationalCommandDashboardSnapshot({patients, rooms, capacity, ...})` → snapshot
- **Consumers:** `EmergencyWhiteboard` command center mode

#### `commandCenterSurgeModel`
- **File:** `src/services/commandCenterSurgeModel.ts`
- **Purpose:** Build the surge status snapshot for command center
- **Key Functions:**
  - `buildCommandCenterSurgeSnapshot({patients, rooms, capacity, ...})` → surgeSnapshot

#### `analyticsService`
- **File:** `src/services/analyticsService.ts`
- **Purpose:** Usage event tracking
- **Key Functions:**
  - `trackEvent(name, properties)` — fire analytics event
  - `trackPageView(path)` — page view tracking
  - `trackError(error, context)` — error tracking
- **Consumers:** App-level providers, error boundaries

#### `crashReportingService`
- **File:** `src/services/crashReportingService.ts`
- **Purpose:** Error boundary integration for crash reporting

---

### Notification Services (`src/services/notifications/`)

- **Purpose:** Push notification management
- **Features:** Notification subscription, push delivery, alert escalation

### Realtime Services (`src/services/realtime/`)

- **Purpose:** WebSocket event handling
- **Features:** EMS socket connection, live patient updates

---

## Backend Modules (NestJS)

### Core ED Operations

#### `emergency-os`
- **Path:** `backend/src/modules/emergency-os/`
- **Purpose:** Core Emergency OS API — patient journey, whiteboard data, ED operations
- **Key Services:**
  - `emergency-os.orchestration.service.ts` — patient workflow orchestration
  - `emergency-os.operational-intelligence.service.ts` — real-time metrics
  - `emergency-realtime.service.ts` — WebSocket event emission
  - `clinical-decision-support.service.ts` — clinical scoring and alerts
  - `patient-arrival.sync.ts` — patient sync from external sources
- **Key Controllers:**
  - `emergency-os.controller.ts` — 60+ REST endpoints
  - `emergency-realtime.controller.ts` — WebSocket gateway
- **Consumers:** All frontend ED pages via `emergencyStore`
- **Failure Mode:** Frontend falls back to demo data (`backendAvailable = false`)
- **3-Minute Support:** Orchestrates the entire patient flow

#### `clinical-alerts`
- **Path:** `backend/src/modules/clinical-alerts/`
- **Purpose:** Generate and manage clinical alerts based on patient data
- **Key Functions:** Alert creation, severity assignment, escalation rules
- **Consumers:** Whiteboard `alerts` store state
- **3-Minute Support:** Critical alert generation for the 3-minute loop

#### `clinical-intelligence`
- **Path:** `backend/src/modules/clinical-intelligence/`
- **Purpose:** Specialized AI clinical analysis services
- **Services:**
  - Ambient scribe
  - Differential diagnosis AI
  - Patient summary AI
  - Patient timeline AI
  - Order set AI
  - Guideline RAG
  - Explainability audit

---

### AI Services

#### `ai-gateway`
- **Path:** `backend/src/modules/ai-gateway/`
- **Purpose:** Multi-model LLM routing and response composition
- **Services:**
  - `ai-gateway.service.ts` — routes queries to appropriate LLM
  - `context-builder.service.ts` — assembles patient + department context
  - `response-composer.service.ts` — formats AI response for clinical use
- **Inputs:** Clinical query, patient context, tool invocation
- **Outputs:** Structured clinical response with evidence attribution
- **Consumers:** Chat module, clinical intelligence, copilot

#### `medical-control-plane`
- **Path:** `backend/src/modules/medical-control-plane/`
- **Purpose:** Three-layer clinical AI orchestration
- **Sub-modules:**
  - `intent-classifier/` — classify query to tool category (219 profiles)
  - `tool-orchestrator/` — route to tool executor, safety checks
  - `emergency-escalation/` — detect critical patterns, generate alerts
- **Consumers:** AI gateway upstream

#### `rag`
- **Path:** `backend/src/modules/rag/`
- **Purpose:** Retrieval-Augmented Generation for clinical evidence
- **Services:**
  - `embeddings/` — generate query and document embeddings
  - `vector-db/` — vector similarity search
  - `reranking/` — cross-encoder reranking of results
  - `utils/` — chunking, format utilities
- **Inputs:** Clinical query
- **Outputs:** Ranked evidence chunks with citations

#### `chat`
- **Path:** `backend/src/modules/chat/`
- **Purpose:** Chat session management and streaming
- **Services:**
  - `chat.service.ts` — session lifecycle, message persistence
  - `calculator-recommender.service.ts` — suggest relevant calculators
- **Controller:** `chat.controller.ts` + `emergency-ai.controller.ts`

#### `llm-security`
- **Path:** `backend/src/modules/llm-security/`
- **Purpose:** Prompt injection detection, output safety validation
- **Consumers:** AI gateway (pre/post processing)

#### `cost-optimizer`
- **Path:** `backend/src/modules/cost-optimizer/`
- **Purpose:** AI query cost management
- **Services:**
  - `complexity-scorer.service.ts` — score query complexity
  - `routing-optimizer.service.ts` — route to cheapest capable model
  - `cost-prediction.service.ts` — estimate query cost
  - `cache.service.ts` — cache repeated queries

#### `moe-router`
- **Path:** `backend/src/modules/moe-router/`
- **Purpose:** Mixture-of-Experts model dispatch for specialized domains

#### `memory`
- **Path:** `backend/src/modules/memory/`
- **Purpose:** AI context memory persistence (patient session, conversation)
- **Entities:** Memory store, session context

#### `native-ai`
- **Path:** `backend/src/modules/native-ai/`
- **Purpose:** On-device / lightweight AI capabilities
- **Features:** IoMT alert processing, VVT scoring, BRAG crowding forecast

#### `evaluation`
- **Path:** `backend/src/modules/evaluation/`
- **Purpose:** AI model quality evaluation and benchmarking

---

### Identity & Access

#### `auth`
- **Path:** `backend/src/modules/auth/`
- **Purpose:** Authentication, session management
- **Services:**
  - `auth.service.ts` — login, token issuance
  - `biometric.service.ts` — biometric auth
  - `emergency-access.service.ts` — 2FA backup-code account recovery (when authenticator device unavailable); **not** clinical break-glass / emergency PHI-scope override
  - `device-fingerprint.service.ts` — device tracking
- **Strategies:** JWT, Google OAuth, LinkedIn OAuth
- **Guards:** `authorization.guard.ts`, `two-factor-enforcement.guard.ts`
- **Entities:** `refresh-token.entity.ts`, `biometric-config.entity.ts`

#### `users`
- **Path:** `backend/src/modules/users/`
- **Purpose:** User account CRUD

#### `permissions`
- **Path:** `backend/src/modules/permissions/`
- **Purpose:** RBAC permission enforcement
- **Enum:** `permission.enum.ts` — all permission strings

#### `two-factor`
- **Path:** `backend/src/modules/two-factor/`
- **Purpose:** TOTP 2FA setup and validation

---

### Data & Compliance

#### `audit`
- **Path:** `backend/src/modules/audit/`
- **Purpose:** Tamper-evident audit log with HMAC hashing
- **Entity:** `audit-log.entity.ts`
- **Features:** Hash-chained entries, PHI access logging, AI decision logging

#### `encryption`
- **Path:** `backend/src/modules/encryption/`
- **Purpose:** PHI column encryption and key rotation
- **Services:**
  - `encryption.service.ts` — encrypt/decrypt PHI fields
  - `key-rotation.service.ts` — scheduled key rotation

#### `compliance`
- **Path:** `backend/src/modules/compliance/`
- **Purpose:** HIPAA/GDPR compliance checks and reporting

#### `analytics`
- **Path:** `backend/src/modules/analytics/`
- **Purpose:** Usage event tracking and reporting
- **Entity:** `analytics-event.entity.ts`

#### `artifacts`
- **Path:** `backend/src/modules/artifacts/`
- **Purpose:** Clinical document and knowledge artifact management
- **Entities:** `artifact.entity.ts`, `artifact-version.entity.ts`

---

### Infrastructure

#### `cache`
- **Path:** `backend/src/modules/cache/`
- **Purpose:** Redis/in-memory cache
- **Used by:** AI gateway, RAG, analytics

#### `email`
- **Path:** `backend/src/modules/email/`
- **Purpose:** Transactional email delivery
- **Used for:** Invitations, 2FA codes, alerts

#### `notifications`
- **Path:** `backend/src/modules/notifications/`
- **Purpose:** Push notification dispatch
- **Features:** Alert delivery, real-time notification queue

#### `observability`
- **Path:** `backend/src/modules/observability/`
- **Purpose:** Distributed tracing, APM integration (Datadog/Sentry)

#### `metrics`
- **Path:** `backend/src/modules/metrics/`
- **Purpose:** Prometheus metrics export

---

### Organization & Tenant

#### `organizations`
- **Path:** `backend/src/modules/organizations/`
- **Purpose:** Multi-tenant organization management
- **Entities:** Organization, membership, settings

#### `tenant-context`
- **Path:** `backend/src/modules/tenant-context/`
- **Purpose:** Inject tenant ID into all requests for data isolation

#### `subscriptions`
- **Path:** `backend/src/modules/subscriptions/`
- **Purpose:** SaaS subscription tier management
- **Integration:** Stripe (via `stripe.config.ts`)

#### `workspaces`
- **Path:** `backend/src/modules/workspaces/`
- **Purpose:** Multi-workspace management within an organization

---

## Service Dependency Map

```
EmergencyWhiteboard
  └── emergencyStore (Zustand)
        ├── emergency-os (NestJS backend)
        │     ├── clinical-alerts → alerts[]
        │     ├── emergency-realtime → WebSocket
        │     └── clinical-intelligence → analytics
        ├── ai-gateway
        │     ├── medical-control-plane
        │     │     ├── intent-classifier
        │     │     ├── tool-orchestrator
        │     │     └── emergency-escalation
        │     ├── rag
        │     └── llm-security
        └── auth → JWT validation

CopilotPanel (persistent)
  └── chat (NestJS)
        ├── ai-gateway
        ├── memory
        └── calculator-recommender
```
