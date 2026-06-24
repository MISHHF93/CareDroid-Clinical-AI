# CareDroid Suite Audit

Date: 2026-06-23  
Product identity: **CareDroid** (sole external product name)  
Platform model: reception-first, whiteboard-centered ED operating platform with embedded clinical copilot

## Executive summary

The codebase is already consolidated around a single active spine (`/emergency/*` routes, `emergencyStore`, `EmergencyOsModule`). This audit maps that spine into the normalized 11-suite structure, labels maturity (live / demo / planned), and records whiteboard/patient-card linkage.

**Normalization applied in this pass:**

- External product identity unified to **CareDroid** in branding config, README, HTML title, and primary UI copy
- **AIIOS** and **Emergency OS** removed from user-facing product identity (retained as internal module/path names during migration)
- Suite taxonomy codified in `lib/features/suiteRegistry.ts`
- Feature registry enriched with suite metadata via `lib/features/featureRegistry.ts`
- Navigation items annotated with `suiteId` / `suiteLabel` in `src/config/unified-navigation.config.ts`

## Architecture spine

```text
CareDroid
├─ Frontend: Vite React SPA (src/)
│  ├─ Center: emergencyStore.ts → PatientCard → PatientDetailPanel
│  ├─ Primary route: /emergency/whiteboard
│  ├─ Role nav: unified-navigation.config.ts
│  └─ Copilot: CopilotPanel + ChatInterface (case-aware, human-reviewed)
├─ Backend: NestJS (backend/)
│  ├─ ED module: emergency-os/* under /api/emergency/*
│  └─ Extensions: fleet, telemetry, simulation, platform admin modules
└─ Shared: lib/features/, lib/ai/, lib/emergency-os/
```

## Suite map

### 1. Reception & Arrival Suite (core, live/demo)

| Feature / route | Maturity | Whiteboard link | Notes |
|---------------|----------|-----------------|-------|
| `/emergency/reception` | live | patient_card | Default landing for registration roles |
| `smart_intake` → `/emergency/intake` | demo | patient_card | Identity-safe intake, OCR, duplicate detection |
| `intake_ai_suggest` | demo | patient_card_drawer | Copilot suggests protocol chips; staff verifies |

**Connection:** Reception creates/verifies patient cards that appear on the whiteboard queue.

### 2. Emergency Whiteboard Suite (core, live)

| Feature / route | Maturity | Whiteboard link | Notes |
|---------------|----------|-----------------|-------|
| `/emergency/whiteboard` | live | board_queue_state | Primary operational surface |
| `emergency_patients` → `/emergency/patients` | live | patient_card | Patient list with deep links |
| `queue_intelligence` → `/emergency/queues` | live | board_queue_state | Bottleneck analytics |

**Connection:** `emergencyStore.patients` + `PatientCard` + `selectPatient` are the hub for all operational workflows.

### 3. Triage / Reassessment / Clinical Flow Suite (core, live/mixed)

| Feature / route | Maturity | Whiteboard link | Notes |
|---------------|----------|-----------------|-------|
| `reassessment_engine` → `/emergency/reassessment` | live | patient_card | Timer-driven reassessment flags |
| `clinical_calculator_hub` → `/emergency/tools` | live | patient_card_drawer | 19+ ED calculators (qSOFA, NEWS2, HEART, etc.) |
| Patient panels (vitals, labs, imaging, meds, visits) | preview | patient_card_drawer | API-backed when configured |

**Connection:** Calculators launch from patient card drawers and copilot tool actions.

### 4. EMS / Referral / Boarding Coordination Suite (core, live/demo)

| Feature / route | Maturity | Whiteboard link | Notes |
|---------------|----------|-----------------|-------|
| `ems_pipeline` → `/emergency/ems` | live | board_workflow_panel | Pre-arrival, offload, WebSocket feed |
| `referral_intelligence` → `/emergency/referrals` | demo | patient_card | Referral tracking per patient |
| `capacity_intelligence` → `/emergency/capacity` | live | board_workflow_panel | Room pressure, discharge readiness |
| `boarding_intelligence` → `/emergency/boarding` | demo | patient_card | Boarding visibility |
| `ems_diversion`, `inter_facility_transfer` | planned | board_workflow_panel | Preview endpoints |

### 5. Physician / Clinical Copilot Suite (core, live/demo)

| Feature | Maturity | Whiteboard link | Copilot role |
|---------|----------|-----------------|--------------|
| `ed_copilot` → `/emergency/copilot` | live | patient_card_drawer | Case-aware workflow assistant |
| `copilot_tool_actions` | demo | patient_card_drawer | Human-confirmed tool calls |
| `score_ai_assist` | demo | patient_card_drawer | Explains calculator fields |
| `protocol_suggest` | demo | patient_card_drawer | Suggests workflows/checklists |
| `handoff_brief_gen` | demo | role_view | Shift handoff narrative for review |

**Safety bounds:** Copilot does not diagnose, prescribe, assign acuity autonomously, or write to EHR. Governed by `lib/ai/safetyPolicy`, `ai-governance.service`, and prompt registry.

### 6. Charge Nurse / Command Center Suite (core, live/demo)

| Feature / route | Maturity | Whiteboard link | Notes |
|---------------|----------|-----------------|-------|
| `department_pulse` → `/emergency/pulse` | live | role_view | Read-only department summary |
| `shift_summary` → `/emergency/shift` | live | board_workflow_panel | Handoff and shift metrics |
| `shift_analytics` | demo | role_view | Throughput analytics |

### 7. Analytics / Simulation / QA Suite (core, demo/preview)

| Feature / route | Maturity | Whiteboard link | Notes |
|---------------|----------|-----------------|-------|
| `emergency_analytics` → `/emergency/analytics` | demo | role_view | Throughput, safety, EMS trends |
| `simulation_engine` → `/simulation` | preview | suite_route | Training scenarios |
| `audit_log` → `/audit` | live | platform_admin | Governance audit trail |
| QA reports in `/qa` | demo | none | Maturity/stress audit artifacts |

### 8. Fleet / Ambulance Operations Extension (extension, demo)

| Route | Maturity | Notes |
|-------|----------|-------|
| `/fleet/command`, `/fleet/map`, route optimizer, predictive maintenance | demo | `FleetModule`; EMS suite consumes fleet snapshot |

### 9. Telemetry / IoT / Digital Twin Extension (extension, demo)

| Route | Maturity | Notes |
|-------|----------|-------|
| `/medical-iot`, `/devices`, `/surveillance/nexus` | demo | TelemetryModule, SurveillanceModule |
| `/digital-twin`, `/cosmos` | demo/planned | Research/advanced surfaces |

### 10. Platform Admin / SaaS Packaging (platform, live/demo)

| Feature / route | Maturity | Notes |
|---------------|----------|-------|
| `/emergency/settings`, `/admin`, `/settings` | live | Staff, rooms, thresholds, entitlements |
| `/platform-admin`, `/billing`, feature flags | demo | Stripe, tenant admin config |
| `feature_toggles_panel` | demo | Org-scoped flags |

### 11. Integration Hub / Automation (platform, demo/planned)

| Feature / route | Maturity | Notes |
|---------------|----------|-------|
| `/integrations/hub` | demo | FHIR/HL7 readiness |
| `/workflows`, automation audit | planned | Workflow builder retained |
| MCP tooling (`mcp/`) | demo | Agent/tool integration layer |

## Legacy / non-core surfaces (retained, reclassified)

These routes exist in `App.jsx` but are **not** primary ED operating surfaces. They redirect to canonical ED routes or serve extension/admin roles:

| Surface | Classification | Disposition |
|---------|----------------|-------------|
| `/dashboard`, `/assistant`, `/patients` | legacy alias | Redirect to `/emergency/*` |
| `/trackmind`, `/enterprise-platform` | legacy extension | Non-ED vertical; keep as extension |
| `/knowledge-graph`, `/laboratory`, `/research` | legacy clinical | Reclassified to integration/education layer |
| `/ai-command-center`, `/brain` | platform AI admin | Not patient-facing copilot |
| `future-modules/_review`, `archive/` | legacy archive | Salvage-only reference |

## Whiteboard / patient-card rule compliance

**Strong compliance (live):**

- Whiteboard (`index.tsx`) renders `PatientCard` grid from `emergencyStore`
- `PatientDetailPanel` opens on `selectPatient` from any surface
- Copilot reads same patient list and operational intelligence snapshot
- Reception handoff bridges (`receptionHandoff.ts`, `intakeEncounter.ts`) create board-visible patients

**Gaps to address in future passes:**

- Some extension routes (`/fleet`, `/cosmos`) are nav-visible but not patient-card-linked — acceptable for extension layer; consider hiding from pilot nav
- Legacy pages in `src/pages/` outside `/emergency` may lack patient context — redirect-first strategy is correct
- `department_pulse` feature registry route pointed at whiteboard; nav correctly uses `/emergency/pulse`

## AI copilot positioning

| Aspect | Status |
|--------|--------|
| Product framing | CareDroid Copilot (embedded assistant) |
| Case awareness | Reads patient list, central node, operational intelligence |
| Workflow awareness | Queue, capacity, reassessment, referral recommendations |
| Human review | Required disclaimer on all prompts |
| Not positioned as | Autonomous diagnosis, prescribing, order entry, EHR writeback |

## Internal migration names (retain, do not expose)

| Internal name | Purpose |
|---------------|---------|
| `emergency-os` module paths | Backend API namespace `/api/emergency/*` |
| `emergencyStore`, `emergencyOsApi` | Canonical state/API layer |
| `EMERGENCY_OS_BRANDING` | Legacy export; now delegates to `CAREDROID_PRODUCT` |
| `CareDroid-Clinical-AI` npm package name | Repo identifier only; not user-facing |

## Normalization pass 2 (2026-06-23)

Completed in this pass:

- Pilot nav scoped to **17 core ED items**; extension surfaces (`fleet`, `cosmos`, `ai-center`, `platform`, etc.) hidden via `PILOT_EXTENSION_NAV_ITEM_IDS`
- User-facing copy normalized across ED pages, store toasts, workspace experience, onboarding/sales copy, EMS/referral panels, settings, analytics, and backend Swagger summaries
- PWA manifest and Capacitor `appName` set to **CareDroid**
- `emergencyStore` operational messages use CareDroid branding

## Recommended next steps

1. Scrub remaining internal-only references in audit/inventory data files (`src/data/*Audit*`, `src/data/*Inventory*`)
2. Wire preview patient panels (labs, imaging) into `PatientDetailPanel` tabs
3. Add suite badges to Settings → Features panel for admin visibility
4. Rename internal `emergency-os` module to `caredroid-ed` when API consumers are ready (breaking change)
5. Regenerate QA screenshot reports under `qa/patient-card-visual-qa/` after branding pass

## Verification

- Suite registry tests: `lib/features/suiteRegistry.test.ts`
- Branding source of truth: `src/config/caredroidProduct.config.ts`
- Feature + suite metadata: `lib/features/featureRegistry.ts`, `lib/features/suiteRegistry.ts`