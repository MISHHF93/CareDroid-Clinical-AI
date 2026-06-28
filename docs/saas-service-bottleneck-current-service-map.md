# SaaS Service Bottleneck Current Service Map

Generated from the current CareDroid source during the SaaS service bottleneck implementation.

## Current Service Map

| Service | Path | Purpose | Inputs | Outputs | Dependencies | Consumers | Failure modes | Latency risks | Duplication/conflicts | 3-minute loop |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CareDroid Central Node | `src/central-node/careDroidCentralNode.ts` | Aggregates ED state for command surfaces | patients, capacity, alerts, EMS, referrals, settings, backend snapshot | department status, queue health, bottleneck registry | store, arrival/triage/provider breach services | operational intelligence, dashboard, analytics, copilot | stale sync, malformed backend payload | backend polling, large local aggregation | local and backend snapshots can disagree | Yes |
| API Client | `src/services/apiClient.ts` | Shared fetch/axios wrapper with auth, tenant headers, timeout, dev fallback | path, headers, timeout, token | Response/JSON/error | app/api/auth config, backend reachability | frontend API clients | timeout, network offline, HTML/JSON mismatch, auth failure | default timeout | direct fetch/axios outside wrapper | Yes |
| Alert Engine | `src/engine/alertEngineDerived.ts` | Derives operational alerts | patients, capacity, EMS, referrals, queues, bottleneck events | deduped alerts | long-wait rescue, alert classification | emergency store | invalid queue payload, stale alert state | large patient lists | manual vs derived alert overlap | Yes |
| Operational Intelligence | `src/operational-intelligence/careDroidOperationalIntelligence.ts` | Rule-based anomaly/recommendation/model-health layer | central snapshot, settings, patients, referrals, logs | anomalies, recommendations, health, alerts | central node, Emergency OS API | analytics, copilot | backend unavailable, stale freshness | polling/backend endpoint | overlaps queue/capacity intelligence | Yes |
| Queue Intelligence Service | `src/services/queueIntelligenceService.ts` | Detects queue bottlenecks | queue state, waits, throughput, risk | queues, bottlenecks, metrics | queue definitions | queue UI, patient path, workspace pipeline | missing live queue state | local synchronous | store queue schema differs | Yes |
| Emergency Capacity Intelligence Service | `src/services/emergencyCapacityIntelligenceService.ts` | Scores capacity pressure | capacity state | score, risk, signals, recs | thresholds | capacity/analytics/pipeline | missing live feed | local synchronous | overlaps central capacity status | Yes |
| ED Copilot / AI Chief Panel | `src/components/CopilotPanel.tsx` | Builds AI Chief context and calls AI client | prompt, central snapshot, patient context | AI response, workflow log | AI client, prompt registry, operational intelligence | AppShell/copilot route | AI unavailable, backend context degraded | AI latency/prompt size | optional backend copilot route differs | Yes |
| SaaS Health API | `src/services/saasHealthApi.ts` | Reads SaaS platform health with fallback | `/api/saas-health` | health checks and fallback | apiClient | SaaS health center | endpoint unavailable | endpoint timeout | overlaps system health probes | Yes |
| Clinical Alerts API | `src/services/clinicalAlertsApi.ts` | Loads/acknowledges clinical alerts | alert API + audit metadata | clinical alerts/ack result | apiClient/capability config | ClinicalAlertsPage | unsupported backend, ack failure | fetch/ack round trip | separate from store alerts | Yes |
| Interoperability API | `src/services/interoperabilityApi.ts` | EHR/FHIR/HL7 readiness and provenance surfaces | integration requests, IDs | integration payloads | apiClient | governance/interoperability pages | FHIR mapping failure, missing identifier, external timeout | external sync waits | overlaps platform-system demo contracts | Yes |
| Notification Service | `src/services/NotificationService.ts` | Frontend notification helper | notification payloads | queued notifications/listeners | browser runtime | alert UI/tests | permission/delivery failure | delivery delay | backend Firebase also sends notifications | Yes |
| Backend Firebase Notifications | `backend/src/modules/notifications/services/firebase.service.ts` | Push notification provider | token/topic/payload | message IDs/results | Firebase Admin | backend notifications | provider down, invalid token | provider latency | frontend notification queue can diverge | Yes |

## Bottlenecks Discovered In Source

- Central node sync can run stale/local while clinical workflows keep moving.
- Clinical alerts and store operational alerts are separate lifecycles.
- Optional backend Emergency OS services are partially disconnected from active frontend store flows.
- Queue and capacity bottlenecks existed, but were not normalized into a SaaS/backend service registry.
- Active copilot prompt context included queue/capacity signals but not service health, fallback, or three-minute bottleneck risk.
- SaaS health and system health probes existed separately from ED command surfaces.

## Domain Bottlenecks Added

- AI Chief unavailable: continue manual triage and standard clinical workflow.
- Notification failure: persistent in-app banner plus manual call/page.
- EHR/FHIR delay: local intake snapshot with external data marked unavailable.
- Lab/results delay: pending status plus lab-owner notification.
- Auth/admin failure: fail closed for admin actions while preserving emergency read-only flow.
- Analytics failure: never block clinical workflow.

## Implementation Summary

- `src/services/bottleneckRegistry.ts` centralizes `BottleneckEvent`, `ServiceHealth`, service map, detection, service health, fallback, root-cause, analytics, and alert conversion.
- `src/central-node/careDroidCentralNode.ts` now publishes `bottleneckRegistry`.
- `src/engine/alertEngineDerived.ts` and `src/store/emergencyOperationalSync.ts` now turn high/critical bottleneck events into operational alerts.
- `src/components/bottlenecks/BottleneckPanels.tsx` provides ServiceHealthCard, BottleneckList, BottleneckSeverityBadge, BottleneckImpactCard, FallbackActionCard, ThreeMinuteRiskIndicator, ServiceDependencyMap, and RootCauseSummaryPanel.
- Dashboard, Alerts, Copilot/AI Chief, Analytics, and Settings now consume registry data.
- `lib/ai/careDroidAI*` includes AI Chief bottleneck intents: service bottleneck analysis, workflow delay analysis, fallback recommendation, three-minute risk projection, and operational root-cause summary.

