# CareDroid Product Discovery Report

**Generated:** 2026-06-28  
**Method:** Full source-code reverse engineering  
**Codebase:** `c:/Users/borah/CareDroid-Clinical-AI`

---

## Executive Summary

CareDroid is a hospital Emergency Department (ED) operating platform with embedded AI. Its primary mission is to reduce the time between patient arrival and clinician action — with the north-star principle: **"It takes 3 minutes to save someone's life."**

The product is delivered as a full-stack web application:
- **Frontend:** React 18 SPA (TypeScript/TSX, Zustand state, React Router v6, Vite)
- **Backend:** NestJS 10 API (TypeScript, TypeORM, SQLite/PostgreSQL, Express)
- **AI layer:** Multi-model router with RAG, NLU intent classification, and tool orchestration
- **Primary surface:** `/emergency/*` route tree, all within a single AppShell layout

The platform supports **19 hospital roles**, **13 core ED pages**, **242 registered tools**, **219 AI intent profiles**, **92 calculator forms**, and a **50+ backend module** architecture.

---

## 1. Architecture Overview

### 1.1 Frontend

| Layer | Technology | Location |
|-------|-----------|----------|
| Entry | `src/main.tsx` | Root |
| App | `src/app/App.tsx` | Providers → BrowserRouter → AppRoutes |
| Router | `src/app/router.tsx` | React Router v6 route tree |
| Layout | `src/components/AppShell.tsx` | Nav rail + header + content + copilot panel |
| State | Zustand stores, `src/store/` | Emergency state, user identity, UI |
| Contexts | `src/contexts/` | HelpHub, UserIdentity, PractitionerVisibility |
| Config | `src/config/` | 200+ config files covering roles, routes, KPIs, UX |

### 1.2 Backend

| Layer | Technology | Location |
|-------|-----------|----------|
| Framework | NestJS 10 | `backend/src/` |
| Entry | `backend/src/main.ts` | HTTP + WebSocket server |
| Database | SQLite (dev) / PostgreSQL (prod) | TypeORM entities |
| Optional Mongoose | `backend/src/api/*.routes.ts` | Emergency OS when `ENABLE_MONGOOSE_EMERGENCY_OS=true` |
| AI Gateway | `backend/src/modules/ai-gateway/` | Multi-model routing |
| Medical Control Plane | `backend/src/modules/medical-control-plane/` | Intent classification + tool orchestration |

### 1.3 Route Architecture

All core ED pages live under `/emergency/*`:

| Route | Page | Primary Role |
|-------|------|--------------|
| `/emergency/whiteboard` | Department Whiteboard | Charge Nurse, Physician |
| `/emergency/reception` | Reception Workspace | Registration Clerk |
| `/emergency/ems` | EMS Pipeline | EMS Coordinator |
| `/emergency/intake` | Smart Intake | Registration Clerk, Triage Nurse |
| `/emergency/queues` | Triage Queues | Triage Nurse |
| `/emergency/reassessment` | Reassessment | Triage Nurse, Charge Nurse |
| `/emergency/capacity` | Capacity & Boarding | Charge Nurse, ED Director |
| `/emergency/boarding` | Boarding Management | Charge Nurse |
| `/emergency/referrals` | Referral Panel | Charge Nurse, Physician |
| `/emergency/copilot` | AI Chief (Copilot) | All Clinical Roles |
| `/emergency/analytics` | Analytics | ED Director, Manager |
| `/emergency/pulse` | Department Pulse | Charge Nurse, Manager |
| `/emergency/shift` | Shift Summary | Charge Nurse |
| `/emergency/help` | Help Hub | All roles |
| `/emergency/documentation` | Clinical Documentation | Physician |
| `/emergency/tools` | Medical Tools Hub | All Clinical Roles |
| `/admin/*` | Admin Console | Hospital Admin, Super Admin |

### 1.4 Permission Model

Roles are defined in `src/lib/users/userTypes.ts` (19 roles) and route-guarded via `EmergencyRouteGuard` in the router. Permission checks use `useEmergencyRolePermissions()` hook backed by `src/config/emergencyRolePermissions.ts`.

Role matrix (summary):

| Role | Whiteboard | Reception | EMS | Queues | Copilot | Analytics | Admin |
|------|-----------|-----------|-----|--------|---------|-----------|-------|
| super_admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| hospital_admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ed_director | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| charge_nurse | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| triage_nurse | ✓ | ✓ | — | ✓ | ✓ | — | — |
| emergency_physician | ✓ | — | — | — | ✓ | ✓ | — |
| registration_clerk | — | ✓ | — | — | — | — | — |
| paramedic | — | — | ✓ | — | ✓ | — | — |
| patient_flow_coordinator | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |

---

## 2. Pages — What Exists

### 2.1 Emergency Whiteboard (`/emergency/whiteboard`)
**File:** `src/pages/emergency/index.tsx` (2886 lines)

The largest page in the application. Renders the live patient board with:
- Multi-role screen modes: standard, charge nurse, physician, triage, command center, public waiting, read-only wall display
- Patient filter bar: All, Waiting, Assessment, High Risk, Reassess, EMS, Boarding
- Live stat cards: total, waiting, high-risk, boarding, reassessment due
- Attention strips: Reassessment, Referral, EMS offload
- Capacity crisis mode (auto-activates at capacity thresholds)
- Queue Intelligence Panel
- Native AI command suite (feature-flagged)
- Public waiting room kiosk display
- Department status wall display
- Command center throughput screen
- 15-second clock tick for live ETA updates

### 2.2 Reception Workspace (`/emergency/reception`)
**File:** `src/pages/emergency/ReceptionWorkspace.tsx`

Front-desk workflow hub:
- Walk-in registration
- EMS pre-arrival tracking and conversion
- Verification queue (ID check, document scan)
- Pretriage queue management
- Embedded Smart Intake
- AI triage assist panel

### 2.3 EMS Pipeline (`/emergency/ems`)
**Component:** `src/components/EMSPipeline.tsx`

Ambulance coordination:
- Inbound EMS unit tracking with ETAs
- Bay preparation workflow
- Patient conversion to ED record
- EMS offload timer monitoring (15-min target)
- Socket-based live updates (`backend/src/api/ems.socket.ts`)

### 2.4 Smart Intake (`/emergency/intake`)
**File:** `src/pages/emergency/SmartIntake.tsx`

Multi-step patient registration:
- Chief complaint capture
- Demographics and identity
- AI-assisted chief complaint classification
- Integration with reception workflow (role-aware redirect)

### 2.5 Triage Queues (`/emergency/queues`)
**File:** `src/pages/emergency/emergencyRoutePages.tsx` → `QueueRoute`

Queue management with sub-queues:
- Pretriage (reception handoff)
- Triage (acuity assignment)
- Fast-track
- Default filter: pretriage

### 2.6 Reassessment (`/emergency/reassessment`)
**File:** `src/pages/emergency/emergencyRoutePages.tsx` → `ReassessmentRoute`

Time-based patient monitoring:
- Patients with overdue or approaching reassessment timers
- Reassessment workflow completion
- Integration with whiteboard attention strip

### 2.7 Capacity & Boarding (`/emergency/capacity`, `/emergency/boarding`)
**Files:** `src/pages/emergency/emergencyRoutePages.tsx`

Capacity intelligence:
- Bed availability and occupancy
- Boarding patient management (admitted but not yet transferred)
- Capacity score and band (Green/Yellow/Orange/Red)
- Surge detection

### 2.8 Referrals (`/emergency/referrals`)
**Component:** `src/components/ReferralPanel.tsx`

Specialist referral workflow:
- Pending, accepted, delayed, completed referral tracking
- Patient-linked referral creation
- Referral attention strip on whiteboard

### 2.9 AI Copilot (`/emergency/copilot`)
**File:** `src/pages/emergency/emergencyRoutePages.tsx` → `CopilotRoute`

The AI Chief:
- Clinical question answering
- Patient context summaries
- Differential diagnosis assistance
- Calculator recommendations
- Diagnostic safety dashboard
- Chat-assisted clinical tools

### 2.10 Analytics (`/emergency/analytics`)
**File:** `src/pages/emergency/EmergencyAnalytics.tsx`

Operational analytics:
- Throughput metrics (hourly arrivals, daily volume, wait trends)
- ED performance KPIs
- Boarding duration analysis
- Staff utilization

### 2.11 Department Pulse (`/emergency/pulse`)
**File:** `src/pages/emergency/pulse/index.tsx`

Real-time operational health:
- Live throughput indicators
- Bottleneck registry with severity levels
- Active alert count
- Queue breach monitoring

### 2.12 Shift Summary (`/emergency/shift`)
**File:** `src/pages/emergency/shift/index.tsx`

End-of-shift reporting:
- Patient count summaries
- Outstanding tasks
- Handoff-ready snapshot

### 2.13 Help Hub (`/emergency/help`)
**File:** `src/pages/emergency/HelpHubPage.tsx`

In-app documentation:
- 5 tabs: This screen, My role, Full process, All topics, Shortcuts
- Role-aware playbooks
- Patient journey walkthrough
- Demo walkthrough A–K
- Keyboard shortcuts

### 2.14 Medical Tools Hub (`/emergency/tools`)
**File:** `src/pages/tools/ToolsOverview.tsx`

Clinical tool catalog:
- 242 registered tools (calculators, AI tools, diagnostic aids)
- 92 dedicated calculator forms
- 219 NLU intent profiles
- Search with filter by category

---

## 3. Services — What Exists

### 3.1 Emergency Store (`src/store/emergencyStore.ts`)
Zustand store — central state for the ED:
- patients, rooms, staff, capacity, referrals, emsArrivals
- alerts, workflowLogs, emsIncomingPatients
- emergencySettings, boardingMetrics, emergencyAnalytics
- backendAvailable, activeScenarioId

### 3.2 Operational Intelligence (`src/hooks/useOperationalIntelligence.ts`)
Aggregates data into the `centralSnapshot` used by the whiteboard:
- queueHealth (with breach detection)
- bottleneckRegistry (active bottlenecks by severity)
- boardingStatus (risk assessment)
- currentDepartmentStatus (active alerts)

### 3.3 Patient Arrival Sync (`src/services/patientArrivalBackendSync.ts`)
Normalizes patient records from backend payload into the whiteboard model.

### 3.4 Reception Handoff (`src/services/receptionHandoff.ts`)
Bridges intake completion to the triage queue:
- `completeIntakeHandoff` — marks patient ready for triage
- `refreshIntakeHandoffSurfaces` — updates store after handoff

### 3.5 Queue Assignment (`src/services/queueAssignment.ts`)
Determines which queue filter applies to a patient:
- `matchesWhiteboardQueueFilter` — patient ↔ filter matching

### 3.6 Navigation Service (`src/services/navigateToEmergencySurface.ts`)
Role-aware surface redirection:
- `shouldRedirectEmergencySurface` — routes intake to reception when role prefers it

### 3.7 Analytics Service (`src/services/analyticsService.ts`)
Usage event tracking (TypeScript):
- `trackEvent`, `trackPageView`, `trackError`

### 3.8 Crash Reporting (`src/services/crashReportingService.ts`)
Error boundary integration.

### 3.9 Notification Service (`src/services/notifications/`)
Push notification management.

### 3.10 Realtime Service (`src/services/realtime/`)
WebSocket/realtime event handling.

---

## 4. AI System — What Exists

### 4.1 Medical Control Plane (`backend/src/modules/medical-control-plane/`)
Three-layer AI architecture:
1. **Intent Classifier** (`intent-classifier/`) — classifies clinical queries to tool categories using pattern matching + ML
2. **Tool Orchestrator** (`tool-orchestrator/`) — routes classified intents to appropriate tools/executors
3. **Emergency Escalation** (`emergency-escalation/`) — detects critical conditions requiring immediate escalation

### 4.2 AI Gateway (`backend/src/modules/ai-gateway/`)
Multi-model routing:
- `ai-gateway.service.ts` — routes to LLM provider based on query type
- `context-builder.service.ts` — builds patient/department context for AI queries
- `response-composer.service.ts` — formats AI responses for clinical consumption

### 4.3 RAG Engine (`backend/src/modules/rag/`)
Retrieval-Augmented Generation:
- Vector database integration
- Clinical guideline embeddings
- Evidence retrieval and re-ranking

### 4.4 Clinical Intelligence (`backend/src/modules/clinical-intelligence/`)
Specialized AI modules:
- Ambient clinical scribe
- Differential diagnosis AI
- Patient summary AI
- Timeline AI
- Order set AI
- Guideline RAG
- Explainability audit

### 4.5 Native AI (`backend/src/modules/native-ai/` + `src/components/native-ai/`)
On-device AI capabilities:
- `NativeAiCommandSuitePanel` — clinical acuity dashboard, AI transparency
- IoMT (wearable) alert processing
- Virtual visit track scoring

### 4.6 Cost Optimizer (`backend/src/modules/cost-optimizer/`)
AI cost management:
- Query complexity scoring
- LLM routing optimization
- Cost prediction and budgeting

### 4.7 MoE Router (`backend/src/modules/moe-router/`)
Mixture-of-Experts routing for multi-model AI dispatch.

### 4.8 LLM Security (`backend/src/modules/llm-security/`)
Prompt injection detection and AI output safety guardrails.

### 4.9 NLU Clinical Profiles (`src/data/clinicalIntentToolCatalog.ts`)
219 intent profiles covering:
- Emergency scores (qSOFA, NEWS2, SOFA, GCS, APACHE-II)
- Cardiology (HEART, TIMI, CHA2DS2-VASc, Wells PE/DVT)
- Neurology (NIHSS, Hunt-Hess, ICH Score, FOUR)
- Pediatrics (Pediatric GCS, PEWS, Apgar, PECARN)
- Psychiatry (PHQ-9, GAD-7, Columbia, AUDIT-C)
- Clinical workflows (ACS, stroke, sepsis, DKA, PE)

---

## 5. Backend Modules Catalog

| Module | Purpose |
|--------|---------|
| `ai` | Core AI query processing, entity storage |
| `ai-gateway` | Multi-model LLM routing and response composition |
| `analytics` | Event tracking, operational metrics |
| `artifacts` | Clinical document and artifact management |
| `audit` | Tamper-evident audit log with hashing |
| `auth` | JWT, OAuth (Google, LinkedIn), biometric, 2FA |
| `automation-audit` | Automated workflow audit trail |
| `cache` | Redis/in-memory cache service |
| `chat` | Chat session management, calculator recommender |
| `clinical` | Drug database, protocol library |
| `clinical-alerts` | Clinical alert generation and management |
| `clinical-intelligence` | Specialized AI clinical services |
| `compliance` | HIPAA, GDPR compliance checks |
| `cost-optimizer` | AI query cost management |
| `ehr-audit` | EHR access audit logging |
| `email` | Transactional email (notifications, invites) |
| `emergency-os` | Core Emergency OS orchestration, patient journey |
| `encryption` | PHI column encryption, key rotation |
| `equity` | Equity/disparity analytics |
| `evaluation` | AI model evaluation and benchmarking |
| `fleet` | Ambulance/vehicle fleet management |
| `governance` | Platform governance rules |
| `hospital-map` | Physical hospital layout tracking |
| `human-review` | Human-in-the-loop AI review workflows |
| `interoperability` | FHIR/HL7/DICOM integration |
| `live-tracking` | Real-time location tracking |
| `llm-security` | Prompt injection, output safety |
| `medical-control-plane` | Intent classification + tool orchestration |
| `memory` | AI context memory (patient, session) |
| `metrics` | Prometheus/observability metrics |
| `moe-router` | Mixture-of-Experts model dispatch |
| `native-ai` | On-device/edge AI capabilities |
| `notifications` | Push notifications, alert delivery |
| `observability` | Telemetry, distributed tracing |
| `organizations` | Multi-tenant organization management |
| `permissions` | RBAC permission enforcement |
| `personalization` | User preference and workflow personalization |
| `platform-assets` | SaaS platform asset registry |
| `platform-governance` | Platform policy and governance |
| `platform-systems` | System health, feature registry |
| `privacy-center` | PHI redaction, consent management |
| `product-catalog` | SaaS product and pricing catalog |
| `rag` | Retrieval-augmented generation engine |
| `regulatory` | Regulatory compliance (FDA, HIPAA) |
| `simulation` | Clinical simulation and training scenarios |
| `subscriptions` | SaaS subscription management |
| `surveillance` | Population health surveillance |
| `telemetry` | IoT device telemetry |
| `tenant-context` | Multi-tenant context injection |
| `tool-calling` | LLM tool-call execution |
| `trackmind` | Staff activity and KPI tracking |
| `training` | Clinical training and competency platform |
| `two-factor` | TOTP-based 2FA |
| `user-activity` | User session and activity logging |
| `user-profile` | Extended user profile management |
| `users` | Core user CRUD |
| `workspace-intelligence` | Workflow intelligence and automation |
| `workspaces` | Multi-workspace management |

---

## 6. In-App Help System — Current State

**Components:**
- `src/components/help/HelpHub.tsx` — main help panel (drawer + page mode)
- `src/components/help/HelpTopicView.tsx` — topic detail renderer
- `src/components/help/HelpTrigger.tsx` — help button trigger
- `src/config/userManual.config.ts` — content source (topics, playbooks, journey)
- `src/contexts/HelpHubContext.tsx` — state management (tab, topic, open/closed)
- `src/hooks/useContextualHelp.ts` — page-aware topic resolution

**Current topics defined:**
- reception, whiteboard, triage-flow, ems, queues, reassessment, capacity, boarding, referrals, copilot, analytics, settings, tools, pulse, shift

**Gaps:**
- No dedicated playbooks for: physician, specialist, paramedic, patient flow coordinator, lab tech, quality officer, IT admin
- Missing topics: documentation, self-arrival check-in, patient room display, alert center
- No keyboard shortcut content mapped (placeholder only)

---

## 7. Existing Documentation Audit

| Document | Location | Quality | Current |
|----------|----------|---------|---------|
| Platform Inventory | `docs/PLATFORM_INVENTORY.md` | High | Yes |
| Current State Report | `docs/architecture/current-state-report.md` | High | Yes |
| User Manual | `docs/USER-MANUAL.md` | Medium | Partial |
| Architecture reports | `docs/architecture/*.md` | Medium | Partial |
| Emergency OS docs | `docs/emergency-os-*.md` | Medium | Historical |
| Door-to-doctor intelligence | `docs/door-to-doctor-intelligence.md` | High | Yes |
| Feature coverage matrix | `docs/feature-coverage-matrix.md` | High | Yes |
| SaaS bottleneck map | `docs/saas-service-bottleneck-current-service-map.md` | High | Yes |
| Gap analysis | ❌ Missing | — | — |
| Role manuals | ❌ Missing | — | — |
| Workflow specs | ❌ Missing | — | — |
| Page specifications | ❌ Missing | — | — |
| Service catalog | ❌ Missing | — | — |
| AI documentation | ❌ Missing | — | — |

---

## 8. Key Findings

### 8.1 Strengths

1. **Deep ED workflow coverage**: Reception → Triage → Whiteboard → Copilot → Analytics covers the full patient flow
2. **Role-aware UI**: 19 roles with per-route permission enforcement and role-specific screen modes
3. **Rich AI toolchain**: RAG, intent classification, cost optimization, LLM security, native AI
4. **In-app help exists**: HelpHub is functional with 5 tabs and contextual page awareness
5. **242 clinical tools**: Comprehensive calculator and workflow coverage
6. **Bottleneck registry**: Real-time operational bottleneck detection
7. **3-minute principle embedded**: The whiteboard stat bar, EMS countdown timers, and reassessment breaches all serve this mission

### 8.2 Gaps

1. **Role manuals missing**: No structured per-role guides in docs or in-app (only partial in HelpHub)
2. **Page specifications missing**: No formal page specs exist in docs/
3. **Workflow documentation missing**: No end-to-end workflow document
4. **Service catalog missing**: No structured service reference
5. **AI documentation missing**: No AI intent/safety/fallback documentation
6. **In-app playbooks incomplete**: ~7 of 19 roles have no playbook in `userManual.config.ts`
7. **3-minute response UI exists but not prominent**: The loop is implemented but not visible enough to reinforce the mission
8. **Self-arrival / patient room display undocumented**: `SelfArrivalCheckIn` and `PatientRoomDisplay` pages have no help topics

### 8.3 Product-Mission Alignment

| Mission Objective | Current State | Gap |
|-------------------|---------------|-----|
| Reduce intake time | Smart intake + reception workspace exist | Integration friction with EMS conversion flow |
| Reduce triage time | Queue system + AI assist panel | Triage acuity AI not always surfaced |
| Reduce admin burden | Copilot summarizes patients | Physician still manually composes notes |
| Reduce duplicate entry | Reception handoff bridges intake → triage | EMS → reception handoff sometimes manual |
| Improve operational visibility | Whiteboard + analytics | Command center metrics not always primary |
| Support 3-minute response | Timer strips + reassessment alerts | Timer visibility could be more prominent on cards |

---

## 9. Deliverables Index

Generated from this report:

1. `docs/PRODUCT_DISCOVERY_REPORT.md` ← **this file**
2. `docs/architecture/system-architecture.md`
3. `docs/workflows/patient-journey.md`
4. `docs/workflows/three-minute-response.md`
5. `docs/workflows/ems-offload.md`
6. `docs/pages/page-specifications.md`
7. `docs/services/service-catalog.md`
8. `docs/ai/ai-documentation.md`
9. `docs/users/executive-guide.md`
10. `docs/users/reception-guide.md`
11. `docs/users/triage-nurse-guide.md`
12. `docs/users/charge-nurse-guide.md`
13. `docs/users/physician-guide.md`
14. `docs/users/specialist-guide.md`
15. `docs/users/patient-flow-coordinator-guide.md`
16. `docs/users/administrator-guide.md`
17. `docs/users/it-admin-guide.md`
18. `docs/users/developer-guide.md`
19. `docs/users/quality-safety-guide.md`
20. `docs/gap-analysis.md`
