# SaaS Service Bottleneck Current Service Map

Generated from the current CareDroid source during the SaaS service bottleneck implementation.

## Reuse Rule Applied

The implementation treats existing SaaS services as the backbone. `bottleneckRegistry.ts` is a normalization adapter and response-loop registry; it does not replace queue, capacity, flow, escalation, reassessment, referral, alert, auth, notification, analytics, reporting, or integration services.

Discovery command:

```powershell
rg --files src/services backend/src/services backend/src/modules lib src/config | rg "(?i)(service|api|client|config|health|alert|queue|triage|analytics|notification|auth|patient|staff|department|report|integration)"
```

Discovery scope: 844 matching service/API/config/contract candidates, including tests and support models. The detailed table below records the reusable SaaS service backbone and the files that now connect to the 3-minute response loop. Support-model and test files remain owned by their existing parent services.

## Current Service Map

| Service | Path | Purpose | Inputs | Outputs | Current consumers | Can be reused? | Needed changes | 3-minute response-loop connection |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Emergency Operating System Service | `src/services/emergencyOperatingSystemService.ts` | Composes ED SaaS backbone services | workspace automations, patient journey, queue/capacity/flow/escalation dashboards | operating-system dashboard, leadership summary, `bottleneckRegistry` | emergency OS route, dashboards, analytics | Yes | Extended safely to publish registry from child service outputs | Central composition point for intake, queue, flow, escalation, capacity, reassessment, referral |
| CareDroid Central Node | `src/central-node/careDroidCentralNode.ts` | Aggregates ED state for command surfaces | patients, capacity, alerts, EMS, referrals, settings, backend snapshot | department status, queue health, bottleneck registry | operational intelligence, dashboard, analytics, copilot | Yes | Extended with registry output | Publishes live three-minute risk, service health, and active bottlenecks |
| API Client | `src/services/apiClient.ts` | Shared fetch/axios wrapper with auth, tenant headers, timeout, dev fallback | path, headers, timeout, token | response/JSON/error | frontend API clients | Yes | Reuse as-is | API latency/failure becomes backend/service bottleneck signal |
| Alert Engine | `src/engine/alertEngineDerived.ts` | Derives operational alerts | patients, capacity, EMS, referrals, queues, bottleneck events | deduped alerts | emergency store | Yes | Extended to accept `bottleneckEvents` | Converts high/critical bottlenecks into operational alerts |
| Operational Intelligence | `src/operational-intelligence/careDroidOperationalIntelligence.ts` | Rule-based anomaly/recommendation/model-health layer | central snapshot, settings, patients, referrals, logs | anomalies, recommendations, health, alerts | analytics, copilot | Yes | Reuse central snapshot registry | Supplies AI Chief and analytics with bottleneck context |
| Emergency Flow Engine Service | `src/services/emergencyFlowEngineService.ts` | Detects stalled patients, delayed referrals, delayed reassessments, excessive waits, queue bottlenecks, boarding pressure | patient flow, queue/referral/reassessment/boarding/capacity dashboards | flow detections, stage metrics, next actions | emergency OS, flow screens | Yes | Adapt existing detections into registry | Detections become patient/workflow bottlenecks with deadlines and fallbacks |
| Emergency Escalation Engine Service | `src/services/emergencyEscalationEngineService.ts` | Escalates capacity, boarding, EMS, high-risk queue, and device/resource pressure | capacity, boarding, EMS, queue, resource dashboards | escalations, recommendations, metrics | emergency OS, command surfaces | Yes | Adapt existing escalations into registry | Escalations drive owner role, response deadline, and fallback action |
| Queue Intelligence Service | `src/services/queueIntelligenceService.ts` | Detects queue bottlenecks | queue state, waits, throughput, risk | queues, bottlenecks, metrics | queue UI, patient path, workspace pipeline | Yes | Adapt queue bottlenecks and dedupe central queue delays | Queue breaches become 3-minute workflow-risk events |
| Emergency Intake Operating System Service | `src/services/emergencyIntakeOperatingSystemService.ts` | Coordinates intake, registration completion, smart arrival, and triage-ready handoff | intake artifacts, registration state, patient answers | intake command center, triage-ready state | emergency OS, intake surfaces | Yes | Reuse as intake source | Intake gaps are routed through emergency OS and central node status |
| Reassessment Automation Service | `src/services/reassessmentAutomationService.ts` | Builds reassessment queues and recommended actions | patient state, reassessment rules | reassessment dashboard, queue items | flow engine, emergency OS, central node | Yes | Adapt queue items into registry | Overdue/high-priority reassessments trigger 3-minute nurse response |
| Referral Hub | `src/services/referralHub.ts` | Tracks referral delay and external handoff state | referral records, department status | referral dashboard, delayed referrals | flow engine, emergency OS, central node | Yes | Adapt delayed referrals into registry | External handoff delays become interoperability bottlenecks |
| Boarding Intelligence Engine | `src/services/boardingIntelligenceEngine.ts` | Scores boarding pressure and bed-management blockers | boarding patients, pending beds | boarding dashboard, score, recommendations | flow engine, escalation engine, emergency OS | Yes | Reuse via flow/escalation services | Boarding pressure contributes to capacity/flow bottlenecks |
| EMS Offload Command Center Service | `src/services/emsOffloadCommandCenterService.ts` | Tracks EMS handoff and offload pressure | EMS arrivals, handoff state, room readiness | offload dashboard, pressure metrics | escalation engine, emergency OS | Yes | Reuse via escalation engine | EMS congestion escalates to command response |
| Emergency Resource Board Service | `src/services/emergencyResourceBoardService.ts` | Surfaces room/device/resource shortages | resource availability | resource board, shortages, metrics | escalation engine, emergency OS | Yes | Reuse via escalation engine | Critical resource shortage can trigger operational bottleneck |
| Emergency Capacity Intelligence Service | `src/services/emergencyCapacityIntelligenceService.ts` | Scores ED capacity pressure | capacity state | score, risk, signals, recommendations | capacity views, analytics, pipeline, emergency OS | Yes | Adapt dashboard pressure into registry | Capacity score drives breach likelihood and flow-coordinator fallback |
| Patient Management API | `src/services/patientManagementApi.ts` | Frontend patient management API boundary | patient requests, patient identifiers | patient records/mutations | patient management surfaces | Yes | Reuse as-is | Patient API degradation is a care-flow service risk |
| Emergency Staffing API | `src/services/emergencyStaffingApi.ts` | Staff routing and staffing state | staffing requests, department IDs | staff assignments/availability | staffing/command surfaces | Yes | Reuse as-is | Staff route delay becomes manual owner assignment fallback |
| Emergency Analytics API | `src/services/emergencyAnalyticsApi.ts` | ED analytics and reporting payload boundary | filters, report requests | analytics/report data | `EmergencyAnalytics` | Yes | Reuse as reporting source | Measures bottleneck trends; does not block care workflow |
| Config Service | `src/services/configService.ts` | Runtime config normalization | env/config values | normalized runtime config | service clients, feature gates | Yes | Reuse as-is | Bad config is classified as service/config bottleneck |
| User Identity API | `src/services/userIdentityApi.ts` | Frontend identity/profile API boundary | identity requests, auth context | user identity/profile payloads | identity/profile surfaces | Yes | Reuse as-is | Auth/identity degradation preserves emergency read-only fallback |
| System Health Service | `src/services/systemHealthService.ts` | System health read model | health checks/service status | system health state | health/status surfaces | Yes | Consolidate with SaaS Health API in registry view | Health degradation appears in service health panels |
| ED Copilot / AI Chief Panel | `src/components/CopilotPanel.tsx` | Builds AI Chief context and calls AI client | prompt, central snapshot, patient context | AI response, workflow log | AppShell/copilot route | Yes | Extended with bottleneck context and intents | AI Chief can explain bottlenecks, fallbacks, and 3-minute risk |
| SaaS Health API | `src/services/saasHealthApi.ts` | Reads SaaS platform health with fallback | `/api/saas-health` | health checks and fallback | SaaS health center | Yes | Reuse in service-health view | Backend health delays are surfaced as SaaS bottlenecks |
| Clinical Alerts API | `src/services/clinicalAlertsApi.ts` | Loads/acknowledges clinical alerts | alert API, acknowledgement audit metadata | clinical alerts/ack result | `ClinicalAlertsPage` | Yes | Reuse and merge registry bottleneck alerts locally | Unacknowledged critical alerts become response-loop risk |
| Interoperability API | `src/services/interoperabilityApi.ts` | EHR/FHIR/HL7 readiness and provenance surfaces | integration requests, IDs | integration payloads | governance/interoperability pages | Yes | Reuse as integration boundary | FHIR/lab/referral delays become interoperability bottlenecks |
| Notification Service | `src/services/NotificationService.ts` | Frontend notification helper | notification payloads | queued notifications/listeners | alert UI/tests | Yes | Reuse as local notification fallback | Notification failure triggers persistent in-app/manual call fallback |
| Backend Firebase Notifications | `backend/src/modules/notifications/services/firebase.service.ts` | Push notification provider | token/topic/payload | message IDs/results | backend notifications | Yes | Reuse; do not duplicate frontend push logic | Provider latency/failure becomes notification service risk |
| Backend Auth Service | `backend/src/modules/auth/auth.service.ts` | Backend authentication/token/access service | login/register/token requests | session/JWT/authorization context | protected backend modules | Yes | Reuse as backend source of truth | Admin/auth failure fails closed while preserving emergency read-only flow |
| Backend Users Service | `backend/src/modules/users/users.service.ts` | Backend user account/profile service | user queries/mutations | user entities/profile state | auth/profile/workspace modules | Yes | Reuse as user source of truth | Identity lookup degradation affects owner routing and audit |
| Backend Clinical Alerts Service | `backend/src/modules/clinical-alerts/clinical-alerts.service.ts` | Backend clinical alert lifecycle | alert queries, acknowledgement requests | alerts/ack state | ClinicalAlertsApi | Yes | Reuse; frontend registry augments, not replaces | Alert acknowledgement state participates in 3-minute response tracking |
| Backend Emergency OS Operational Intelligence Service | `backend/src/modules/emergency-os/emergency-os.operational-intelligence.service.ts` | Backend ED operational intelligence | emergency OS state, arrival/queue signals | intelligence payloads | frontend operational intelligence | Yes | Reuse when available; frontend remains fallback | Backend intelligence enriches root-cause and recommendations |
| Backend Analytics Service | `backend/src/modules/analytics/services/analytics.service.ts` | Backend analytics/reporting | events, report queries | analytics records/reports | analytics controller/API | Yes | Reuse for reporting | Tracks trends and breach causes; not a direct blocker |
| Backend Interoperability Integration Hub Service | `backend/src/modules/interoperability/integration-hub.service.ts` | External integration hub | integration requests/events | integration status/events | interoperability modules | Yes | Reuse as backend integration source | External system latency contributes to EHR/lab/referral bottlenecks |

## Consolidation Decisions

- No replacement queue, capacity, flow, escalation, reassessment, referral, auth, notification, analytics, or integration services were created.
- `bottleneckRegistry.ts` consolidates overlapping signals into one `BottleneckEvent` contract and dedupes by event ID/severity.
- `EmergencyOperatingSystemService` now wires existing child services into the registry through `existingServiceSignals`.
- Central node/store paths continue using live store data and pass derived bottleneck events into the existing alert engine.
- Reporting and analytics services measure trend/breach causes but do not block clinical workflow.

## Bottlenecks Discovered In Source

- Central node sync can run stale/local while clinical workflows keep moving.
- Clinical alerts and store operational alerts are separate lifecycles.
- Backend Emergency OS services are partly separate from active frontend store flows.
- Queue and capacity bottlenecks existed but were not normalized into a SaaS/backend service registry.
- Active copilot prompt context included queue/capacity signals but not service health, fallback, or 3-minute bottleneck risk.
- SaaS health and system health probes existed separately from ED command surfaces.

## Domain Bottlenecks Added

- AI Chief unavailable: continue manual triage and standard clinical workflow.
- Notification failure: persistent in-app banner plus manual call/page.
- EHR/FHIR delay: local intake snapshot with external data marked unavailable.
- Lab/results delay: pending status plus lab-owner notification.
- Auth/admin failure: fail closed for admin actions while preserving emergency read-only flow.
- Analytics failure: never block clinical workflow.

## Implementation Summary

- `src/services/bottleneckRegistry.ts` centralizes `BottleneckEvent`, `ServiceHealth`, service map, detection, service health, fallback, root-cause, analytics, alert conversion, and adapters for existing flow/escalation/queue/capacity/reassessment/referral service outputs.
- `src/services/emergencyOperatingSystemService.ts` now publishes `bottleneckRegistry` using existing child service dashboards.
- `src/central-node/careDroidCentralNode.ts` now publishes `bottleneckRegistry`.
- `src/engine/alertEngineDerived.ts` and `src/store/emergencyOperationalSync.ts` now turn high/critical bottleneck events into operational alerts.
- `src/components/bottlenecks/BottleneckPanels.tsx` provides ServiceHealthCard, BottleneckList, BottleneckSeverityBadge, BottleneckImpactCard, FallbackActionCard, ThreeMinuteRiskIndicator, ServiceDependencyMap, and RootCauseSummaryPanel.
- Dashboard, Alerts, Copilot/AI Chief, Analytics, and Settings now consume registry data.
- `lib/ai/careDroidAI*` includes AI Chief bottleneck intents: service bottleneck analysis, workflow delay analysis, fallback recommendation, three-minute risk projection, and operational root-cause summary.
