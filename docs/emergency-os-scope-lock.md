# Emergency OS Scope Lock

## Purpose

Freeze CareDroid development focus around the Emergency Department Operating System.

The product priority is now Emergency OS first: ED flow, queue visibility, command center, triage guidance, EMS/offload visibility, referral visibility, analytics, demo readiness, and first-customer deployment. Other code remains in the repository, but it must not pull development focus away from Emergency OS.

No code is deleted by this scope lock.

## Scope Rule

Emergency Core receives implementation priority.

Everything outside Emergency Core is treated as one of:

- Hidden from primary product surfaces.
- Roadmap only.
- Future Module.

This applies to workspace navigation, quick command, search-first discovery, profile workspace selection, product planning, demos, and first-customer implementation.

## Classification Definitions

| Classification | Meaning | Product Treatment |
| --- | --- | --- |
| Emergency Core | Required for the sellable Emergency Department Operating System pilot. | Visible, prioritized, tested, demo-ready. |
| Emergency Expansion | ED-adjacent capability that can deepen the product after the core pilot proves value. | Hidden or roadmap until Emergency Core acceptance. |
| Future Workspace | Non-ED workspace surface that may become a later workspace. | Hidden from active workspace selection; keep as Future Module. |
| Future Product | Standalone product concept outside the immediate ED OS sale. | Roadmap only; do not expand during Emergency Core work. |
| Internal Platform | Shared runtime, admin, entitlement, config, health, profile, and developer support. | Keep only as support infrastructure; do not market as product scope. |

## Emergency Core

These modules define the current development target and must receive priority.

| Module | Source / Surface | Treatment |
| --- | --- | --- |
| Emergency Workspace | `CARE_WORKSPACES.emergency`, `/workspace/emergency` | Active product workspace and default workspace. |
| ED Command Center | `/workspace/emergency/command-center`, `/workspace/emergency/dashboard` | Primary operating surface. |
| ED Director View | `/workspace/emergency/director` | Core leadership scan for throughput, boarding, EMS, staffing pressure, adoption, and ROI. |
| Charge Nurse View | `/workspace/emergency/charge-nurse` | Core operational scan for rooms, waiting patients, reassessment queue, critical alerts, and devices. |
| ED Digital Whiteboard | `/workspace/emergency/whiteboard` | Core visual patient-flow board. |
| Patient Journey Engine | Emergency patient journey model from arrival through discharge/admission | Core operating model. |
| Queue Intelligence | Waiting room, triage, high-risk, referral, admission, discharge, reassessment queues | Core visibility layer. |
| EMS Pre-Arrival / Handoff | `/workspace/emergency/pre-arrival`, `EmsPreArrivalPipelineService` | Core EMS-to-ED structured handoff visibility. |
| Door-to-Doctor Intelligence | `DoorToDoctorIntelligenceService`, `/workspace/emergency/throughput` | Core throughput proof. |
| Waiting Room Intelligence | `WaitingRoomIntelligenceService`, `/workspace/emergency/waiting-room` | Core queue proof. |
| Reassessment Queue | `ReassessmentAutomationService`, `/workspace/emergency/waiting-room` | Core safety/visibility proof. |
| EMS Offload Command Center | `EmsOffloadCommandCenterService`, `/workspace/emergency/ems` | Core EMS pressure visibility. |
| ED Copilot | Emergency AI Copilot and assistant prompts in ED context | Core workflow guidance with human review. |
| Dynamic Triage / Automated Triage Matrix | `emergency-automated-triage-matrix` | Core triage workflow. |
| ED Evidence / Protocol Retrieval | Emergency complaint routing, RAG context, protocol retrieval | Core guidance surface. |
| ED Knowledge Layer | `/workspace/emergency/knowledge` | Core search-first protocols, calculators, pathways, simulations, evidence, and workflows. |
| Emergency Analytics / KPI Layer | `EmergencyKPILayerService`, `/workspace/emergency/analytics` | Core adoption and ROI proof. |
| Automation ROI | `/workspace/emergency/automation-roi`, `AutomationROIService` | Core value proof for time saved, clicks reduced, queue impact, throughput impact, and adoption. |
| Emergency Demo Environment | `EmergencyDemoEnvironmentService`, `/workspace/emergency/demo` | Core first-customer demo path. |
| First Customer Path | `/workspace/emergency/deployment` | Core sales and rollout plan. |
| ED Calculator Bundle | qSOFA, NEWS2, HEART, Wells PE, Wells DVT, Shock Index, NIHSS, trauma and ACS support where tied to ED flow | Core only when launched from Emergency context. |
| Workspace Data Pipeline | `WorkspaceDataPipelineService` Emergency payload | Core data contract for ED OS. |

Emergency Core acceptance:

- A prospect can understand ED OS from one workspace.
- ED leaders can see flow, waiting room pressure, EMS pressure, referral pressure, risk queues, analytics, and next review steps.
- Clinicians remain in control; no autonomous diagnosis, treatment, orders, disposition, offload, referral, discharge, or escalation decisions.
- The product can be demonstrated and piloted without live EHR, ADT, EMS CAD, bed board, staffing, device telemetry, or hospital-wide deployment.

## Emergency Expansion

These modules stay in the repository but do not receive priority until Emergency Core is accepted.

| Module | Source / Surface | Treatment |
| --- | --- | --- |
| Emergency Resource Board | `EmergencyResourceBoardService`, `/workspace/emergency/resources` | Roadmap; expansion after core ED flow proof. |
| Emergency Escalation Engine | `EmergencyEscalationEngineService`, `/workspace/emergency/escalations` | Roadmap; human-reviewed operational escalation only. |
| Emergency Simulation Scenarios | `EmergencySimulationScenariosService`, `/workspace/emergency/simulations` | Roadmap; training expansion after core pilot. |
| Simulation Academy | `emergency-simulation-academy` | Roadmap add-on, not core build driver. |
| Documentation Integrity | `emergency-documentation-integrity` | Roadmap add-on; requires EHR notes, orders/results, and audit feeds for production. |
| Discharge Summary Drafting | `emergency-discharge-summary-drafting` | Roadmap add-on; demo only until EHR documentation scope is approved. |
| Referral Routing Production Workflow | `emergency-referral-routing` | Core has referral visibility; production routing is expansion. |
| Surge Staffing | `emergency-surge-staffing` | Expansion; requires scheduling, census, bed board, or ADT feeds. |
| Medical IoT Monitoring in ED | `emergency-medical-iot-monitoring` | Expansion; requires device telemetry and biomedical workflow feeds. |
| Virtual ED | `emergency-virtual-ed` | Future roadmap; requires telehealth, portal, EMS handoff, identity, and encounter paths. |
| Prior Authorization | `emergency-prior-authorization` | Future roadmap; not part of ED OS pilot. |
| Optional Integrations | ADT, EHR, EMS CAD, bed board, staffing, telemetry, LMS, payer policy | Roadmap only until the core pilot proves value. |

Expansion rule:

Do not build expansion capability as if it were required for the first ED customer. Expansion modules can be demoed with local/deterministic data only when they strengthen the Emergency Core story.

## Future Workspaces

These workspace modules are not active development priorities. Keep their code, but treat them as hidden Future Modules.

| Workspace | Current Status | Scope Lock Treatment |
| --- | --- | --- |
| ICU | Existing workspace model | Hide/roadmap; do not expand during Emergency Core work. |
| Cardiology | Existing workspace model | Hide/roadmap except ED calculator/workflow reuse. |
| Laboratory | Existing workspace model and already listed in future workspace IDs | Hidden Future Module. |
| Pharmacy | Existing workspace model | Hide/roadmap except ED medication-safety references. |
| Operations | Existing workspace model | Hide/roadmap except ED command-center support. |
| Fleet | Existing workspace model and already listed in future workspace IDs | Hidden Future Module. |
| Medical IoT | Existing workspace model and already listed in future workspace IDs | Hidden Future Module. |
| Education | Existing workspace model and already listed in future workspace IDs | Hidden Future Module. |
| Research | Existing workspace model and already listed in future workspace IDs | Hidden Future Module. |
| Simulation | Existing workspace model | Hide/roadmap except ED simulation expansion. |

Future Workspace rule:

Non-ED workspace surfaces should not appear as active product choices for first-customer work. If a non-ED asset is reused, it must be framed as supporting Emergency OS, not as a separate workspace launch.

## Future Products

These product concepts are valid long-term ideas, but they are not part of the locked Emergency OS build.

| Product Concept | Treatment |
| --- | --- |
| Hospital-wide Operations OS | Future Product; not required for ED pilot. |
| Fleet / EMS Logistics Product | Future Product unless narrowed to ED EMS offload visibility. |
| Medical IoT Product | Future Product unless narrowed to ED equipment visibility. |
| Laboratory Intelligence Product | Future Product. |
| Pharmacy Safety Product | Future Product. |
| Research / Evidence Hub | Future Product except configured ED protocol retrieval. |
| Education / Simulation Platform | Future Product except ED simulation expansion. |
| AI Evaluation Product | Future Product / internal governance support. |
| Governance / Compliance Product | Future Product / internal control surface. |
| Marketplace / Asset Pack Commercialization | Future Product; do not expand before ED OS lock is accepted. |

Future Product rule:

Do not add product packaging, navigation prominence, demos, or buyer stories for these areas until Emergency Core is sellable and accepted.

## Internal Platform

These modules support the product but are not the product scope.

| Module | Treatment |
| --- | --- |
| Administration workspace | Internal Platform; hide from product narrative unless tenant setup requires it. |
| Governance workspace | Internal Platform or future governance product; keep hidden for ED OS focus. |
| AI Evaluation workspace | Internal Platform or future product; do not prioritize over ED OS. |
| Profile workspace management | Internal support; should reinforce Emergency-first workspace selection. |
| Settings | Internal support. |
| System Health | Internal support for deployment readiness. |
| Developer Catalog / Source Audit | Internal support only. |
| Entitlements, feature flags, config, sync, offline, notifications, usage metering | Internal support only. |
| Global search / search-first discovery | Internal UX support; should prioritize Emergency Core and suppress future modules. |
| Tool Library | Internal/shared surface; only ED-relevant tools should be prominent during Emergency OS focus. |

Internal Platform rule:

Maintain enough platform capability to support Emergency OS, demos, testing, and deployment. Do not turn internal support modules into new product scope during the Emergency Core lock.

## Visibility Lock

Primary product surfaces should follow this visibility order:

1. Emergency Core: visible and prioritized.
2. Emergency Expansion: hidden or roadmap-labeled.
3. Future Workspace: hidden and marked Future Module.
4. Future Product: roadmap only.
5. Internal Platform: hidden unless needed for administration, support, testing, or deployment.

This lock applies to:

- Workspace picker.
- Profile workspace management.
- Quick command launcher.
- Search-first discovery.
- Global search.
- Navigation shortcuts.
- Demo scripts.
- Product documentation.
- First-customer implementation plans.

## Development Guardrails

- Do not delete non-Emergency code.
- Do not expand non-Emergency modules while Emergency Core remains incomplete.
- Do not introduce new top-level workspace/product scope unless it directly supports Emergency OS.
- Do not let platform surfaces imply hospital-wide deployment is required.
- Do not market calculators as standalone product scope; they must support ED flow.
- Keep all clinical, operational, referral, discharge, EMS, and escalation outputs human-reviewed.
- Keep integration-heavy work as roadmap unless explicitly required for an accepted ED pilot.

## Acceptance

Development focus is locked on Emergency OS.

Emergency Core is the only active product priority. Emergency Expansion, Future Workspace, Future Product, and Internal Platform modules remain in the codebase, but their product treatment is hidden, roadmap, or future module until the Emergency Department Operating System pilot is accepted.
