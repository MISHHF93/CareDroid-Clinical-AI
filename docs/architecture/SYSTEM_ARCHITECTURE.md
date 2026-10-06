# CareDroid — System Architecture Document

**Document Version:** 2.2.0  
**Status:** Living System Architecture Specification  
**Lead Authors:** Principal Enterprise Architect, Chief AI Architect, Healthcare Systems Engineer  

---

## 1. Enterprise Architecture Overview

CareDroid is architected as a modular, high-reliability healthcare operations and clinical intelligence system. The system enforces strict architectural isolation between presentation (`src/`), backend micro-services (`backend/src/`), and external healthcare interoperability interfaces.

```mermaid
flowchart TD
    subgraph ClientLayer["1. Presentation & Experience Layer (src/)"]
        WebCockpit["Desktop Clinical Cockpit (React 18 + Vite)"]
        TabletApp["Tablet Rounding / Bedside Console"]
        MobileTriage["Mobile Triage & EMS Handoff PWA"]
        WallKiosk["Wall-mounted Department Status Board"]
    end

    subgraph ChromeLayer["2. Shell, State & Chrome Engine"]
        AppShell["AppShell + CDL 2.1 Visual Authority"]
        ZustandStore["Zustand Emergency Store (Realtime State)"]
        OfflineSync["Offline IndexDB & Resilient Buffer"]
        CommandPalette["Unified Command & Search Engine (⌘K)"]
    end

    subgraph GatewayLayer["3. Secure Gateway & Network Boundary"]
        ReverseProxy["NGINX / Cloudflare mTLS Gateway"]
        AuthGuards["JWT / Role-Based Access Control (RBAC/ABAC)"]
        WebSocketGateway["NestJS WebSocket Gateway (Sub-500ms Push)"]
    end

    subgraph ServiceLayer["4. Core Clinical Application Services (backend/src/)"]
        TriageService["Triage & Acuity Scoring Engine"]
        WhiteboardService["Department Whiteboard & Bed Tracking"]
        EmsGatewayService["EMS Telemetry & Pre-Arrival Ingestion"]
        CapacityEngine["Surge & Bed Capacity Orchestrator"]
        AuditService["Immutable Cryptographic Audit Logger"]
    end

    subgraph IntelligenceLayer["5. Clinical Intelligence & Agentic AI"]
        PediatricDosing["Deterministic Pediatric Dosing Checker"]
        ClinicalCalculators["Evidence-based Calculators (Wells, PERC, HEART)"]
        AiGateway["Clinical LLM Gateway (Gemini / Anthropic / Local)"]
        CopilotAgent["AI Clinical Scribe & Context Assistant"]
    end

    subgraph DataLayer["6. Data Persistence & Interoperability"]
        RelationalDB[(PostgreSQL / SQLite with TypeORM)]
        RedisCache[(Redis Cache & Real-time Pub/Sub)]
        FhirBridge["HL7 FHIR R4 Interoperability Gateway"]
        IotAdapter["Medical Device & Vital Monitor Telemetry Bridge"]
    end

    ClientLayer --> ChromeLayer
    ChromeLayer --> GatewayLayer
    GatewayLayer --> ServiceLayer
    ServiceLayer <--> IntelligenceLayer
    ServiceLayer <--> DataLayer
```

---

## 2. Layer-by-Layer Architectural Details

### 2.1 Layer 1: Experience & Presentation (`src/`)
- **Technology:** React 18, TypeScript 5, Vite, CSS Modules with CareDroid Design Language (CDL v2.1).
- **Core Invariant:** `src/` must **NEVER** import from `backend/src/`. Communication is exclusively over HTTP/REST and WebSockets, strictly verified by `npm run architecture:check`.
- **Display Modes:** Adaptive layout profiles automatically detect screen form factor:
  - `desktop-cockpit` (1440px+): Full multi-column view with live operational metrics rail.
  - `compact-workstation` (1024px–1280px): Collapsed navigation rail, optimized card grids.
  - `kiosk-simple-fast` (Reception / Triage Kiosk): Single-purpose high-speed intake, eliminating stacked chrome.

### 2.2 Layer 2: Real-time State & Shell Management
- **Emergency Store:** Powered by Zustand (`src/store/emergencyStore.ts`), maintaining reactive in-memory state for active encounters, beds, inbound ambulances, and department alarms.
- **WebSocket Protocol:** Listens on persistent bi-directional channel (`emergencyOsApi`), receiving delta updates:
  - `PATIENT_ARRIVED`, `VITALS_UPDATED`, `ACUITY_ASSIGNED`, `BED_TRANSFERRED`, `ORDER_PLACED`, `SEPSIS_ALERT`.
- **Local Resilience:** Buffered offline state commits to IndexedDB when network reachability drops, playing back queued mutations upon reconnection.

### 2.3 Layer 3: Backend Services (`backend/src/`)
- **Technology:** NestJS, TypeScript, TypeORM.
- **Modularity:** Isolated feature modules (`TriageModule`, `SurveillanceModule`, `UserProfileModule`, `CapacityModule`, `AuditModule`).
- **Security & Authorization:** Every API route is guarded by `@UseGuards(RolesGuard)` and `@UseGuards(ProfileSegregationGuard)`. Dev bypasses in production are prohibited.

### 2.4 Layer 4: Clinical Intelligence & Deterministic Calculators
- **Strict Separation of Determinism vs. Heuristics:**
  - **Numeric Calculations (Pediatric Dosing, Creatinine Clearance, GCS):** 100% deterministic code paths. Zero LLM involvement.
  - **Documentation & Summarization:** Clinical Copilot assists in drafting structured H&P notes using strictly grounded patient context, requiring explicit human clinician sign-off.
- **Evidence Provenance:** Every calculator links to peer-reviewed evidence (e.g. *Stiell et al., Annals of Emergency Medicine*).

### 2.5 Layer 5: Data Persistence & Interoperability
- **Primary Relational Store:** PostgreSQL in production (SQLite for dev/test synchronization).
- **FHIR Gateway:** Translates internal encounter, patient, and observation entities into standard HL7 FHIR R4 resources (`Encounter`, `Patient`, `Observation`, `ServiceRequest`).

---

## 3. Deployment & High Availability Topology

```mermaid
graph LR
    subgraph DMZ["Edge / CDN / DMZ"]
        Cloudflare["Cloudflare Enterprise (WAF + DDoS + SSL)"]
    end

    subgraph AppCluster["High Availability Kubernetes Cluster"]
        Pod1["CareDroid Node 1 (NestJS)"]
        Pod2["CareDroid Node 2 (NestJS)"]
        PodN["CareDroid Node N (Autoscaling)"]
    end

    subgraph DataCluster["Managed Data Cluster"]
        PGPrimary["PostgreSQL Primary (Multi-AZ)"]
        PGReplica["PostgreSQL Read Replica"]
        RedisCluster["Redis Sentinel Cluster"]
    end

    Cloudflare --> Pod1
    Cloudflare --> Pod2
    Cloudflare --> PodN

    Pod1 --> PGPrimary
    Pod2 --> PGPrimary
    PodN --> PGPrimary

    Pod1 -.-> PGReplica
    Pod2 -.-> PGReplica
    PodN -.-> PGReplica

    Pod1 <--> RedisCluster
    Pod2 <--> RedisCluster
    PodN <--> RedisCluster
```

---

## 4. Architectural Non-Negotiables & Verification Gates

1. **Zero Cross-Boundary Imports:** Enforced by `npm run architecture:check` in CI.
2. **Page Inventory Pinning:** Enforced by `src/data/pageDispositionFixture.ts` to prevent rogue page sprawl.
3. **Database Migration Verification:** `npm run db:verify` executes migrations on Docker Postgres to guarantee zero schema drift against TypeORM entity definitions.
4. **WCAG 2.2 AA Contrast Enforcement:** Automated headless contrast verification across all severity alerts and pill components.

---

