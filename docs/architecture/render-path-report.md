# Render Path Report

Generated: 2026-06-12

Scope: active CareDroid Emergency OS pilot workflow only. Source of truth is `src/App.jsx`, `src/config/navigation.config.js`, `src/layout/AppShell.jsx`, and visible `/emergency/*` routes.

## Coverage Summary

| Metric | Result |
| --- | --- |
| Active Emergency OS routes registered | 12 / 12 |
| Active Emergency OS routes rendering visible content | 12 / 12 |
| Routes with loading/empty/error/unavailable state | 11 / 12 |
| Routes with direct backend hydration as primary data source | 2 / 11 clinical workflow areas |
| Store/demo-backed routes with visible fallback content | 11 / 11 clinical workflow areas |

## Active Render Chains

| Feature | Dependency chain | Render status | Break classification |
| --- | --- | --- | --- |
| Emergency Whiteboard | `Emergency Whiteboard -> EmergencyWhiteboard -> PatientCard, PatientDetailPanel, QueueIntelligencePanel, NewPatientIntake -> useEmergencyStore -> patientManagementApi optional detail APIs -> /api/patients/:id/*` | Visible. Store-backed patients, filters, stats, empty state, and backend status labels render. | Backend primary data flow not canonical. |
| Patients | `Patients -> EmergencyPatientsRoute -> EmergencyWhiteboard(defaultViewMode=list) -> useEmergencyStore -> patient detail APIs` | Fixed. Now has patient-specific title and list default instead of looking identical to the whiteboard route. | Duplicate UI reduced; still shares whiteboard component intentionally. |
| EMS Intake | `EMS -> EMSPipeline -> EMSPressureScore, EMSArrivalRow -> useEmergencyStore + emergencyTransportApi -> /api/fleet/snapshot, /api/emergency/diversion/status` | Visible. EMS arrivals and fallbacks render. Unexpected backend rejections now surface as unavailable/error state. | Real `/api/ems/*` endpoints not consumed. |
| Smart Intake | `Smart Intake -> SmartIntake -> SmartIntakeApi -> /api/emergency/intake/*` | Visible. Session/final actions now show pending/error status. | Backend session evidence/matching flow is partial; fixture remains primary UI. |
| Queue Intelligence | `Queues -> EmergencyQueueRoute -> QueueIntelligencePanel -> useEmergencyStore + loadEmergencyAnalytics -> /api/emergency/analytics fallback` | Visible. Queue pressure renders from store. | Queue backend analytics endpoint not primary source. |
| Reassessment | `Reassessment -> EmergencyReassessmentRoute -> useEmergencyStore flags -> Patients route for assessment action` | Fixed. Now renders dedicated queue, metrics, and empty state instead of relying on the whiteboard plus drawer side effect. | Real `/api/reassessment/*` endpoints not consumed. |
| Capacity | `Capacity -> EmergencyCapacityRoute -> useEmergencyStore capacity, queues, rooms, patients` | Visible. Capacity metrics, room grid, boarding, and discharge pipeline render. | `/api/capacity/dashboard` not consumed. |
| Boarding | `Boarding -> EmergencyCapacityRoute(variant=boarding) -> useEmergencyStore boarding/disposition patients` | Fixed. Now renders boarding-specific heading/copy while keeping shared capacity data. | Dedicated backend boarding endpoint absent/not consumed. |
| Referrals | `Referrals -> ReferralPanel -> ReferralRow/form/groups -> useEmergencyStore + emergencyTransportApi persistence` | Visible. Local store updates render; backend sync pending/failure state is visible. | Backend referral contract is split between `/api/referrals` and disabled `/api/emergency/referrals`. |
| ED Copilot | `Copilot -> EmergencyCopilotRoute -> ClinicalCalculatorHub + AppShell ChatInterface -> useConversation/useEmergencyStore -> /api/chat/message` | Visible. Clinical calculator hub and chat panel render. | `/api/copilot/query` exists but is not consumed by active UI. |
| Analytics | `Analytics -> EmergencyAnalytics -> useEmergencyStore.loadEmergencyAnalytics -> emergencyAnalyticsApi -> /api/emergency/analytics or local fallback` | Visible. Backend unavailable state falls back to local operational analytics. | Some analytics client exports remain unused. |
| Settings | `Settings -> SettingsRoute -> EmergencySettings -> useEmergencyStore + useFeatureStore + emergencySettingsApi` | Fixed. Feature tab now points to mounted `/settings/features`; async integration/protocol failures show visible status. | Duplicate feature draft state remains a future consolidation item. |

## Safe Fixes Applied

- Added `EmergencyPatientsRoute` using `EmergencyWhiteboard` with patient-specific title and list default.
- Added `EmergencyReassessmentRoute` with metrics, reassessment queue, and no-data state.
- Added `variant="boarding"` support for `EmergencyCapacityRoute`.
- Changed Settings feature tab from dead hash navigation to `/settings/features`.
- Added visible unavailable/error handling in `EmergencySettings`.

## Remaining Render Risks

- `SmartIntake` still renders fixture evidence/candidates rather than backend session output.
- `DepartmentPulse` is unmounted and `/emergency/pulse` redirects to analytics.
- Backend endpoints for capacity, EMS, reassessment, and copilot do not drive the visible UI.
