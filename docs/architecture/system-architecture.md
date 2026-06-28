# CareDroid System Architecture

**Generated:** 2026-06-28  
**Source:** Reverse-engineered from production source code

---

## 1. Overview

CareDroid is a single-repository full-stack web application. There is no separate `frontend/` package — the React application lives at the repository root `src/` and the NestJS API lives in `backend/src/`.

```
CareDroid-Clinical-AI/
├── src/                    ← React 18 frontend (TypeScript)
├── backend/src/            ← NestJS 10 API (TypeScript)
├── engine/                 ← Shared computation engines (TypeScript)
├── store/                  ← Shared Zustand store definitions
├── types/                  ← Shared TypeScript type definitions
├── public/                 ← Static assets + service worker
├── scripts/                ← Build, QA, inventory scripts
├── e2e/                    ← Playwright end-to-end tests
└── docs/                   ← Product documentation
```

---

## 2. Frontend Architecture

### 2.1 Technology Stack

| Concern | Technology |
|---------|-----------|
| Framework | React 18 |
| Language | TypeScript (strict, `allowJs: false` via `tsconfig.frontend.json`) |
| Routing | React Router v6 |
| State | Zustand (stores) + React Context (app-level) |
| Build | Vite + esbuild |
| Styling | CSS Modules + Tailwind utilities |
| Testing | Vitest + Testing Library |
| E2E | Playwright |

### 2.2 Entry Point Chain

```
index.html
└── src/main.tsx
    └── <App />  (src/app/App.tsx)
        └── <ErrorBoundary>
            └── <AppProviders>     (src/app/providers.tsx)
                └── <BrowserRouter>
                    └── <AppRoutes>  (src/app/router.tsx)
```

### 2.3 Provider Stack (`src/app/providers.tsx`)

Providers nest in this order (outer → inner):
1. `ThemeProvider`
2. `UserIdentityProvider`
3. `OrganizationProvider`
4. `TenantContextProvider`
5. `WorkspaceProvider`
6. `SimulationModeProvider`
7. `NotificationProvider`
8. `HelpHubProvider`
9. `PractitionerVisibilityProvider`
10. `ConversationProvider`
11. `OfflineProvider`

### 2.4 Route Tree Structure

All active routes live inside a single `RootLayout` which renders `AppShell`:

```
/                           → EmergencyDefaultRedirect
/emergency/whiteboard       → EmergencyWhiteboard (main ED board)
/emergency/reception        → ReceptionWorkspace
/emergency/ems              → EMSPipeline
/emergency/intake           → SmartIntake (or reception redirect)
/emergency/queues           → QueueRoute
/emergency/triage           → TriageWorkspaceRoute
/emergency/reassessment     → ReassessmentRoute
/emergency/capacity         → CapacityRoute
/emergency/boarding         → BoardingRoute
/emergency/referrals        → ReferralPanel
/emergency/copilot          → CopilotRoute (AI Chief)
/emergency/documentation    → ClinicalDocumentationAssistant
/emergency/analytics        → EmergencyAnalytics
/emergency/pulse            → EmergencyDepartmentPulse
/emergency/shift            → EmergencyShiftSummary
/emergency/alerts           → ClinicalAlertsPage
/emergency/tools            → ToolsOverview
/emergency/settings         → EmergencySettings
/emergency/help             → HelpHubPage
/emergency/self-arrival     → SelfArrivalCheckIn
/emergency/room/:id         → PatientRoomDisplay
/admin/*                    → AdminOperationsShell (CareDroidRouteGuard)
/profile/*                  → Profile pages
/display/whiteboard         → WhiteboardDisplayRoute (DisplayShell, no AppShell)
```

### 2.5 AppShell Layout

`src/components/AppShell.tsx` is the master layout:

```
AppShell
├── Sidebar (navigation rail)
│   ├── Logo
│   ├── NavItems (role-filtered)
│   └── User avatar / profile
├── Header
│   ├── Breadcrumb
│   ├── Search / command palette trigger
│   ├── Notifications bell
│   └── User menu
├── Main content region (Outlet)
└── Persistent overlays
    ├── ED Copilot panel (collapsible)
    ├── HelpHub drawer
    ├── Command palette (Cmd+K)
    └── Toast notifications (Sonner)
```

### 2.6 Role-Aware Rendering

The whiteboard page (`/emergency/whiteboard`) renders up to 8 distinct screen modes based on the active role and URL params:

| Mode | Trigger | Layout |
|------|---------|--------|
| Standard | Default | Patient cards + filters |
| Charge Nurse | `?mode=charge` or role | Operational strips + queue |
| Physician | `?mode=physician` or role | Provider-focused card view |
| Triage | `?mode=triage` or role | Triage queue emphasis |
| Command Center | `?mode=command` or role | KPI throughput dashboard |
| Public Waiting | `?mode=waiting` | Patient-safe kiosk display |
| Read-Only Wall | `?mode=wall` | Operational status display |
| Display | `?display=1` | Auto-refresh wall mode |

### 2.7 State Architecture

```
Zustand Stores (src/store/)
├── emergencyStore.ts        ← PRIMARY: patients, capacity, alerts, settings (~5000 LOC)
├── emergencyOperationalSync.ts  ← Mutation layer: patches, escalations
└── (minor stores for UI/UX state)

React Contexts (src/contexts/)
├── UserIdentityContext    ← Current user + auth
├── OrganizationContext    ← Tenant org data
├── HelpHubContext         ← In-app help state (tab, topic, open)
├── PractitionerVisibilityContext ← Role surface visibility
├── SimulationModeContext  ← Demo/scenario active state
└── NotificationContext    ← Toast state
```

### 2.8 Configuration Layer

The `src/config/` directory contains **200+ config files** that define the behavioral rules of the application without touching UI code:

| Config File | Purpose |
|-------------|---------|
| `routes.config.ts` | Canonical route constants |
| `emergencyRolePermissions.ts` | Role → route/action permission matrix |
| `userManual.config.ts` | In-app help content (single source of truth) |
| `careDroidScreenModes.ts` | Screen mode definitions |
| `operationalMetricsModel.ts` | KPI metric definitions |
| `emergencyScreenKpiPolicy.ts` | KPI visibility per screen mode |
| `whiteboardDensityModel.ts` | Layout density rules |
| `centralControl.config.ts` | Central intake control policy |
| `receptionFirstUx.config.ts` | Reception-first UX toggle |
| `demoPersonaModel.ts` | Demo persona routing |
| `edOperationalStandards.ts` | ED operational standards |
| `ai.config.ts` | AI model configuration |
| `nativeAiThresholds.config.ts` | Native AI alert thresholds |
| `featureFlags.config.ts` | Feature flag registry |

---

## 3. Backend Architecture

### 3.1 Technology Stack

| Concern | Technology |
|---------|-----------|
| Framework | NestJS 10 |
| Language | TypeScript |
| HTTP Adapter | Express |
| Database | SQLite (dev) / PostgreSQL (prod) via TypeORM |
| Optional ODM | Mongoose (Emergency OS, enabled via `ENABLE_MONGOOSE_EMERGENCY_OS=true`) |
| Authentication | Passport.js + JWT + Google/LinkedIn OAuth |
| WebSockets | Socket.io (via `backend/src/api/ems.socket.ts`) |
| Caching | Redis (optional) |
| Testing | Jest |

### 3.2 Module Architecture

```
backend/src/
├── main.ts                 ← NestJS bootstrap
├── app.module.ts           ← Root module (imports all 51 sub-modules)
├── app.controller.ts       ← Health check endpoints
├── data-source.ts          ← TypeORM data source
├── modules/                ← 51 NestJS feature modules
├── api/                    ← Optional Express route files (Emergency OS)
├── models/                 ← Mongoose models (optional)
├── config/                 ← Configuration providers
├── database/               ← Migrations + seed scripts
├── middleware/             ← Logging, request middleware
├── common/                 ← Shared filters, decorators
└── services/               ← Service registry (Emergency OS)
```

### 3.3 Emergency OS Express Routes (Optional)

When `ENABLE_MONGOOSE_EMERGENCY_OS=true`:

| File | Routes |
|------|--------|
| `api/capacity.routes.ts` | `GET/POST /api/capacity` |
| `api/copilot.routes.ts` | `POST /api/copilot` |
| `api/ems.routes.ts` | EMS arrival management |
| `api/reassessment.routes.ts` | Reassessment queue |
| `api/smart-intake.routes.ts` | Patient intake |
| `api/ems.socket.ts` | WebSocket for EMS real-time |

### 3.4 Database Architecture

```
TypeORM (Active for NestJS modules)
├── Users entity
├── Organization entity
├── AuditLog entity (with HMAC hashing)
├── EncryptedColumn entity (PHI columns)
├── AnalyticsEvent entity
├── Artifact + ArtifactVersion entities
├── AIQuery entity
├── Subscription entity
└── 40+ additional entities

Mongoose (Optional, Emergency OS only)
├── Patient model
├── PatientJourney model
└── SmartIntake model
```

### 3.5 Authentication Flow

```
Frontend → POST /api/auth/login (or OAuth callback)
         ← JWT access token + refresh token
         
All requests → Bearer token in Authorization header
Backend     → JwtStrategy validates token
            → AuthorizationGuard enforces permissions
            → TwoFactorEnforcementGuard (if 2FA enabled)
```

---

## 4. AI Architecture

### 4.1 Medical Control Plane

The AI system is orchestrated through a three-layer control plane:

```
User Query
    │
    ▼
Intent Classifier (intent-classifier/)
    │  Pattern matching + ML classification
    │  219 clinical intent profiles
    │
    ▼
Tool Orchestrator (tool-orchestrator/)
    │  Routes to appropriate tool or LLM
    │  Tool safety pre-flight checks
    │
    ▼
Emergency Escalation (emergency-escalation/)
    │  Critical pattern detection
    │  Alert generation for human review
    │
    ▼
AI Gateway (ai-gateway/)
    │  Multi-model LLM dispatch
    │  Context builder (patient + department)
    │  Response composer (clinical formatting)
    │
    ▼
Clinical Response
```

### 4.2 Tool Execution Flow

```
Clinical Query → Intent Classifier
              → Tool ID resolved
              → Tool Orchestrator checks safety
              → Backend executes tool (SOFA, drug-check, lab-interp)
              → Response composed with evidence attribution
              → Audit logged (AI query entity)
              → Confidence scored
              → Returned to frontend with safety notice
```

### 4.3 RAG Pipeline

```
Clinical Question
    │
    ▼
Query Embedding (text-embedding-ada-002 or equivalent)
    │
    ▼
Vector Search (Pinecone / in-memory)
    │  Top-K clinical guideline chunks
    │
    ▼
Reranker (cross-encoder reranking)
    │
    ▼
Context Assembly (patient data + guidelines)
    │
    ▼
LLM Generation with citations
```

### 4.4 Native AI (On-Device)

```
NativeAiCommandSuitePanel (frontend)
    ├── ClinicalAcuityDashboard (feature-flagged)
    └── AITransparencyDashboard (feature-flagged)
    
Backend: backend/src/modules/native-ai/
    ├── IoMT alert processing (wearable data)
    ├── VVT scoring (virtual visit triage)
    └── BRAG forecast (10-hour crowding forecast)
```

---

## 5. Component Hierarchy

```
AppShell
├── Sidebar
│   ├── NavItem (×12 core items)
│   └── UserMenu
├── Header
├── Main (Outlet)
│   ├── EmergencyWhiteboard (/)
│   │   ├── CriticalAlertBanner
│   │   ├── StatCards (total/waiting/high-risk/boarding/reassess)
│   │   ├── CapacityCrisisMode
│   │   ├── AttentionStrips
│   │   │   ├── EmsAttentionStrip
│   │   │   ├── ReassessmentAttentionStrip
│   │   │   └── ReferralAttentionStrip
│   │   ├── WhiteboardOpsDetailStrip
│   │   ├── ChargeNurseOperationalStrip
│   │   ├── PhysicianOperationalStrip
│   │   ├── QueueIntelligencePanel
│   │   └── WhiteboardView
│   │       └── PatientCard (×N)
│   ├── ReceptionWorkspace
│   │   ├── EmsPreArrivalSection
│   │   ├── ReceptionSearchHint
│   │   ├── VerificationQueue
│   │   ├── PretriageQueue
│   │   └── AiTriageAssistPanel
│   ├── EMSPipeline
│   │   ├── AmbulanceCard (×N)
│   │   ├── EmsOffloadTrackerPanel
│   │   └── HandoffChecklist
│   ├── ToolsOverview
│   │   ├── ToolCard (×242)
│   │   └── ClinicalCalculatorHub
│   └── (other pages...)
└── Overlays
    ├── CopilotPanel (persistent)
    ├── HelpHub (drawer)
    ├── CommandPalette
    └── Toasts
```

---

## 6. Permission Model

### 6.1 Role Registry

Defined in `src/lib/users/userTypes.ts`:

```typescript
type HospitalRole =
  | 'super_admin'         // Full system access
  | 'hospital_admin'      // Hospital-wide admin
  | 'ed_director'         // ED director + analytics
  | 'charge_nurse'        // ED operations lead
  | 'triage_nurse'        // Triage + assessment
  | 'registered_nurse'    // Patient care
  | 'emergency_physician' // ED physician
  | 'attending_physician' // Attending physician
  | 'resident_physician'  // Resident
  | 'specialist'          // Specialty consult
  | 'paramedic'           // EMS/ambulance
  | 'registration_clerk'  // Reception only
  | 'patient_flow_coordinator' // Flow management
  | 'lab_technician'      // Lab results
  | 'radiology_technician'// Radiology
  | 'pharmacist'          // Medications
  | 'social_worker'       // Social services
  | 'security_officer'    // Security
  | 'it_admin'            // IT + systems
  | 'quality_safety_officer' // QA + safety
  | 'demo_observer'       // Demo only
```

### 6.2 ED Route Role Matrix

Enforced by `EmergencyRouteGuard` in `src/app/router.tsx`:

| Route | charge_nurse | physician | triage_nurse | registration_clerk | ed_director | paramedic |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|
| whiteboard | ✓ | ✓ | ✓ | ✗ (→reception) | ✓ | ✗ |
| reception | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ |
| ems | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ |
| intake | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ |
| queues | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ |
| reassessment | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |
| capacity | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| boarding | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| referrals | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| copilot | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| analytics | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| settings | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |

---

## 7. Known Technical Debt

| Item | Location | Risk |
|------|----------|------|
| Large monolithic store | `src/store/emergencyStore.ts` (~5000 LOC) | High — hard to test in isolation |
| Dual user context | `UserContext` + `UserIdentityContext` | Medium — potential stale state |
| 200+ config files | `src/config/` | Medium — discoverability |
| Mixed Mongoose/TypeORM | `backend/src/modules/` + `backend/src/models/` | Medium — dual ORM |
| Optional Express routes | `backend/src/api/*.routes.ts` | Low — disabled by default |
| Legacy redirect routes | `src/app/router.tsx` | Low — cleanup opportunity |
| Backend stubs | Several modules have empty implementations | High — misleading API surface |

---

## 8. Performance Characteristics

### Frontend
- All page routes are lazy-loaded with `lazyWithRetry`
- 15-second interval clock tick for EMS ETAs and freshness
- Stable display snapshots for wall-mount screens (prevent flicker)
- `useMemo` pervasively on computation-heavy whiteboard derivations

### Backend
- Redis cache available (optional) via `cache.module.ts`
- Mongoose path disabled unless MongoDB env configured
- TypeORM connection pool for PostgreSQL production
- NestJS global exception filter (`api-exception.filter.ts`)

---

## 9. Security Architecture

| Layer | Implementation |
|-------|---------------|
| Authentication | JWT + refresh tokens, OAuth2 |
| Authorization | RBAC via `AuthorizationGuard` + `@Permissions()` decorator |
| 2FA | TOTP via `two-factor.module.ts` |
| Biometrics | `biometric.controller.ts` + `biometric.service.ts` |
| PHI Encryption | `encryption.module.ts` with key rotation |
| Audit Log | HMAC-hashed tamper-evident logs |
| LLM Security | Prompt injection detection (`llm-security.module.ts`) |
| PHI Redaction | `privacy-center.module.ts` for display redaction |
| Emergency Access | Break-glass access via `emergency-access.service.ts` |
