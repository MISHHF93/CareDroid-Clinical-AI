# Orphan Detection Report

Generated: 2026-06-05 (regenerate with `npm run orphan-detection:write-docs`)

## Classification key

| Class | Meaning |
|-------|---------|
| **wire** | Reachable in product intent (nav/inventory) but missing route, import, or API contract |
| **merge** | Duplicate surface or overlapping module — consolidate |
| **quarantine** | No production consumer — archive or delete after review |
| **legacy** | Redirect, alias, gated stub, or deprecated path kept for compatibility |

## Executive summary

| Metric | Count |
|--------|------:|
| Total orphan findings | 349 |
| App.jsx routes | 212 |
| Orphan / gap routes | 181 |
| Orphan pages | 27 |
| Orphan components | 0 |
| Domain module findings (dashboard / simulation / lab / 3D) | 3 |
| Orphan services | 0 |
| Executor contract gaps | 3 |
| API orphans / stubs | 132 |
| Weakly linked markdown | 3 |
| **wire** | 216 |
| **merge** | 1 |
| **quarantine** | 4 |
| **legacy** | 128 |

## Merge candidates (explicit)

| ID | Primary | Duplicate | Note |
|----|---------|-----------|------|
| dashboard-dual-home | src/pages/CommandDashboard.jsx | src/pages/Dashboard.jsx | Assistant chat (Dashboard.jsx) vs command home (CommandDashboard.jsx); naming collision |
| pack-marketplace-dual | src/pages/organization/OrganizationPages.jsx (PackMarketplace) | /asset-packs vs /settings/organization/packs | Two pack marketplace routes |
| notification-services-dual | src/services/NotificationService.js | src/services/notifications/NotificationService.js | Duplicate notification service paths |

## Critical findings

1. **`src/pages/Onboarding.jsx`** — deprecated redirect; not mounted (org onboarding uses `CommercialPages`). Class: **quarantine**.
2. **`SimulationLaboratoryViewer.jsx`** — missing; tests and CSS reference a removed page. Class: **quarantine**.
3. **AI agents / platform APIs** — `platformAssetsApi.js` / `productCatalogApi.js` not in `frontendApiCallsInventory`. Class: **wire**.
4. **Chart/export components** (`VitalsTrendChart`, `DrugInteractionHeatmap`, `DataDisplay`, etc.) — barrel export only. Class: **quarantine** or **wire**.
5. **Dual registry** — hundreds of tools in inventory without dedicated page components (route-only). Class: **legacy** (inventory-first) unless promoting to assets.

## Orphan routes

| Route | Class | Evidence |
| --- | --- | --- |
| /chat | legacy | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /copilot | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /all-tools | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /clinical-tools | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /catalog | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /calculators | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /medical-simulation | legacy | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /anatomy-viewer | legacy | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /maps | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /tracking | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /live-tracking | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /fleet/live-map | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /fleet/tracking | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit-logs | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /tools/calculators/aa-gradient | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/abcd2 | wire | toolInventory route not registered in App.jsx |
| /tools/cardiology/acs-workflow-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/adjusted-body-weight | wire | toolInventory route not registered in App.jsx |
| /tools/nephrology/aki-staging-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/anion-gap | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/apache-ii | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/apgar-score | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/apri | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/ascvd-risk | wire | toolInventory route not registered in App.jsx |
| /tools/pulmonology/asthma-exacerbation-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/asthma-severity-score | wire | toolInventory route not registered in App.jsx |
| /tools/cardiology/atrial-fibrillation-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/audit-c | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/bed-occupancy-calculator | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/bisap-score | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/bishop-score | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/bmi | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/bode-index | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/bsa | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/braden-scale | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/bun-creatinine-ratio | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/cage | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/centor-mcisaac | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/chads2vasc | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/chads2 | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/child-pugh | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/ckd-staging | wire | toolInventory route not registered in App.jsx |
| /tools/psychiatry/cognitive-screening-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/columbia-suicide-severity-workflow | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/copd-gold-assessment | wire | toolInventory route not registered in App.jsx |
| /tools/pulmonology/copd-workflow-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/corrected-calcium | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/corrected-sodium | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/creatinine-clearance-cg | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/curb-65 | wire | toolInventory route not registered in App.jsx |
| /tools/endocrine/diabetes-care-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/endocrine/dka-pathway-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/duke-treadmill-score | wire | toolInventory route not registered in App.jsx |
| /tools/cardiology/ecg-interpretation-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/gfr | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/egfr-ckd-epi | wire | toolInventory route not registered in App.jsx |
| /tools/nephrology/electrolyte-disorder-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/epworth-sleepiness-scale | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/fena | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/fenton-growth-chart-helper | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/feurea | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/fib4 | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/four-score | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/framingham-risk | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/free-water-deficit | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/gad7 | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/gestational-age-calculator | wire | toolInventory route not registered in App.jsx |
| /tools/gastroenterology/gi-bleed-workflow-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/gcs | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/glasgow-blatchford-score | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/has-bled | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/hcm-sudden-death-risk | wire | toolInventory route not registered in App.jsx |
| /tools/neurology/headache-red-flag-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/cardiology/heart-failure-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/heart-failure-staging | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/heart-score | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/homa-ir | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/hunt-hess-scale | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/ich-score | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/ideal-body-weight | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/kfre | wire | toolInventory route not registered in App.jsx |
| /tools/gastroenterology/liver-disease-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/maddrey-discriminant-function | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/mdq | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/meld | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/meld-na | wire | toolInventory route not registered in App.jsx |
| /tools/psychiatry/mental-health-screening-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/endocrine/metabolic-syndrome-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/mews | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/mmse | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/moca-placeholder-workflow | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/modified-rankin-scale | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/morse-fall-scale | wire | toolInventory route not registered in App.jsx |
| /tools/pediatrics-obgyn/neonatal-assessment-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/neonatal-bilirubin-risk-helper | wire | toolInventory route not registered in App.jsx |
| /tools/neurology/neuro-exam-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/news2 | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/nihss-summary-view | wire | toolInventory route not registered in App.jsx |
| /tools/pediatrics-obgyn/ob-triage-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/osmolal-gap | wire | toolInventory route not registered in App.jsx |
| /tools/pulmonology/oxygen-escalation-helper | wire | toolInventory route not registered in App.jsx |
| /tools/gastroenterology/pancreatitis-workflow-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/pao2-fio2-ratio | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/pcl5 | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/pediatric-bp-percentile | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/pediatric-dose-safety-checker | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/pediatric-gcs | wire | toolInventory route not registered in App.jsx |
| /tools/pediatrics-obgyn/pediatric-sepsis-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/pews | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/phq9 | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/pneumonia-severity-index | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/pregnancy-due-date-calculator | wire | toolInventory route not registered in App.jsx |
| /tools/pediatrics-obgyn/pregnancy-workflow-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/qsofa | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/ranson-criteria | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/rass | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/resource-utilization-index | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/revised-trauma-score | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/reynolds-risk-score | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/rockall-score | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/rox-index | wire | toolInventory route not registered in App.jsx |
| /tools/neurology/seizure-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/serum-osmolality | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/shock-index | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/sofa | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/staffing-ratio-calculator | wire | toolInventory route not registered in App.jsx |
| /tools/cardiology/stemi-pathway-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/stop-bang | wire | toolInventory route not registered in App.jsx |
| /tools/neurology/stroke-workflow-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/psychiatry/substance-use-screening-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/psychiatry/suicide-risk-workflow-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/endocrine/thyroid-disorder-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/timi-ua-nstemi | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/turnaround-time-calculator | wire | toolInventory route not registered in App.jsx |
| /tools/neurology/vertigo-hints-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/calculators/waist-hip-ratio | wire | toolInventory route not registered in App.jsx |
| /tools/cardiology/arrhythmia-risk-classifier | wire | toolInventory route not registered in App.jsx |
| /tools/cardiology/cardiac-telemetry-analyzer | wire | toolInventory route not registered in App.jsx |
| /tools/cardiology/cardiology-command-center | wire | toolInventory route not registered in App.jsx |
| /tools/cardiology/ecg-trend-engine | wire | toolInventory route not registered in App.jsx |
| /tools/cardiology/remote-cardiology-monitoring-dashboard | wire | toolInventory route not registered in App.jsx |
| /tools/psychiatry/behavioral-analytics-dashboard | wire | toolInventory route not registered in App.jsx |
| /tools/gastroenterology/cirrhosis-monitoring-engine | wire | toolInventory route not registered in App.jsx |
| /tools/nephrology/ckd-progression-predictor | wire | toolInventory route not registered in App.jsx |
| /tools/endocrine/continuous-glucose-command-center | wire | toolInventory route not registered in App.jsx |
| /tools/psychiatry/crisis-escalation-audit-log | wire | toolInventory route not registered in App.jsx |
| /tools/nephrology/dialysis-readiness-helper | wire | toolInventory route not registered in App.jsx |
| /tools/nephrology/dialysis-utilization-tracker | wire | toolInventory route not registered in App.jsx |
| /tools/neurology/eeg-trend-dashboard | wire | toolInventory route not registered in App.jsx |
| /tools/nephrology/electrolyte-trend-engine | wire | toolInventory route not registered in App.jsx |
| /tools/endocrine/endocrine-monitoring-system | wire | toolInventory route not registered in App.jsx |
| /tools/gastroenterology/endoscopy-workflow-assistant | wire | toolInventory route not registered in App.jsx |
| /tools/nephrology/fluid-balance-monitor | wire | toolInventory route not registered in App.jsx |
| /tools/gastroenterology/gi-command-center | wire | toolInventory route not registered in App.jsx |
| /tools/gastroenterology/gi-surveillance-dashboard | wire | toolInventory route not registered in App.jsx |
| /tools/endocrine/glucose-telemetry-dashboard | wire | toolInventory route not registered in App.jsx |
| /tools/pediatrics-obgyn/growth-trend-analytics | wire | toolInventory route not registered in App.jsx |
| /tools/gastroenterology/hepatic-trend-analytics | wire | toolInventory route not registered in App.jsx |
| /tools/endocrine/insulin-trend-engine | wire | toolInventory route not registered in App.jsx |
| /tools/pediatrics-obgyn/maternal-monitoring-dashboard | wire | toolInventory route not registered in App.jsx |
| /tools/endocrine/metabolic-analytics | wire | toolInventory route not registered in App.jsx |
| /tools/pediatrics-obgyn/neonatal-dashboard | wire | toolInventory route not registered in App.jsx |
| /tools/neurology/neuro-monitoring-engine | wire | toolInventory route not registered in App.jsx |
| /tools/neurology/neuro-telemetry-dashboard | wire | toolInventory route not registered in App.jsx |
| /tools/neurology/neurology-timeline-ai | wire | toolInventory route not registered in App.jsx |
| /tools/pediatrics-obgyn/pediatric-command-center | wire | toolInventory route not registered in App.jsx |
| /tools/pediatrics-obgyn/perinatal-risk-dashboard | wire | toolInventory route not registered in App.jsx |
| /tools/psychiatry/population-screening-dashboard | wire | toolInventory route not registered in App.jsx |
| /tools/psychiatry/psychiatry-monitoring-dashboard | wire | toolInventory route not registered in App.jsx |
| /tools/pulmonology/pulmonary-trend-engine | wire | toolInventory route not registered in App.jsx |
| /tools/nephrology/renal-monitoring-dashboard | wire | toolInventory route not registered in App.jsx |
| /tools/pulmonology/respiratory-command-center | wire | toolInventory route not registered in App.jsx |
| /tools/pulmonology/respiratory-telemetry-dashboard | wire | toolInventory route not registered in App.jsx |
| /tools/psychiatry/screening-trend-engine | wire | toolInventory route not registered in App.jsx |
| /tools/pulmonology/sleep-apnea-analytics | wire | toolInventory route not registered in App.jsx |
| /tools/neurology/stroke-command-center | wire | toolInventory route not registered in App.jsx |
| /tools/pulmonology/ventilator-monitoring-dashboard | wire | toolInventory route not registered in App.jsx |
| /tools/pulmonology/ventilator-support-assistant | wire | toolInventory route not registered in App.jsx |
| /workspace | legacy | Redirect or alias route in App.jsx |
| /home | legacy | Redirect or alias route in App.jsx |
| /laboratory | legacy | Redirect or alias route in App.jsx |

## Orphan pages

| Page file | Class | Evidence |
| --- | --- | --- |
| src/pages/AuditLogs.jsx | legacy | import:src/pages/AuditLogs.jsx |
| src/pages/Dashboard.jsx | merge | App.jsx import |
| src/pages/fleet/FleetDashboardWidgets.jsx | legacy | import:FleetDashboardWidgets |
| src/pages/fleet/FleetPageChrome.jsx | legacy | import:./pages/fleet/FleetPageChrome |
| src/pages/fleet/PredictiveMaintenanceWidgets.jsx | legacy | import:PredictiveMaintenanceWidgets |
| src/pages/fleet/RouteOptimizerWidgets.jsx | legacy | import:RouteOptimizerWidgets |
| src/pages/legal/index.js | legacy | import:index |
| src/pages/Onboarding.jsx | quarantine | import:src/pages/Onboarding.jsx |
| src/pages/platform/components/PlatformWorkflowPrimitives.jsx | legacy | import:PlatformWorkflowPrimitives |
| src/pages/team/index.js | legacy | import:index |
| src/pages/tools/abcd2Calculator.jsx | legacy | import:abcd2Calculator |
| src/pages/tools/cardiologyCalculators.jsx | legacy | import:cardiologyCalculators |
| src/pages/tools/emergencyCriticalCareCalculators.jsx | legacy | import:emergencyCriticalCareCalculators |
| src/pages/tools/endocrineMetabolicCalculators.jsx | legacy | import:endocrineMetabolicCalculators |
| src/pages/tools/hepatologyGiCalculators.jsx | legacy | import:hepatologyGiCalculators |
| src/pages/tools/hospitalOperationsCalculators.jsx | legacy | import:hospitalOperationsCalculators |
| src/pages/tools/mentalHealthCalculators.jsx | legacy | import:src/pages/tools/mentalHealthCalculators.jsx |
| src/pages/tools/nephrologyCalculators.jsx | legacy | import:nephrologyCalculators |
| src/pages/tools/neurologyCalculators.jsx | legacy | import:neurologyCalculators |
| src/pages/tools/nextWaveCalculators.jsx | legacy | import:nextWaveCalculators |
| src/pages/tools/pediatricsObgynCalculators.jsx | legacy | import:pediatricsObgynCalculators |
| src/pages/tools/pr4aCalculators.jsx | legacy | import:src/pages/tools/pr4aCalculators.jsx |
| src/pages/tools/pr8ClinicalBatchCalculators.jsx | legacy | import:pr8ClinicalBatchCalculators |
| src/pages/tools/psychiatryScreeningCalculators.jsx | legacy | import:psychiatryScreeningCalculators |
| src/pages/tools/pulmonologyCalculators.jsx | legacy | import:pulmonologyCalculators |
| src/pages/tools/sourceBackedClinicalCalculators.jsx | legacy | import:sourceBackedClinicalCalculators |
| src/pages/tools/ToolPageLayout.jsx | legacy | import:src/pages/tools/ToolPageLayout.jsx |

## Orphan components

_None detected._

## Dashboards

_None detected._

## Simulations

| Module | Class | Evidence |
| --- | --- | --- |
| src/pages/SimulationLaboratoryViewer.jsx | quarantine | Referenced in tests/docs but page module never existed; only .css remains |

## Laboratory modules

_None detected._

## 3D viewer code

_None detected._

## Orphan services

_None detected._

## Orphan executors

| Tool ID | Class | Evidence |
| --- | --- | --- |
| sofa-score | wire | Inventory claims REGISTERED executor but not in orchestrator registry |
| drug-check | wire | Inventory claims REGISTERED executor but not in orchestrator registry |
| lab-interp | wire | Inventory claims REGISTERED executor but not in orchestrator registry |

## Orphan APIs

| API | Class | Evidence |
| --- | --- | --- |
| chat-messages-sync | legacy | Gated stub — intentional no-op until backend exists |
| chat-conversations-sync | legacy | Gated stub — intentional no-op until backend exists |
| tools-share-results | legacy | Gated stub — intentional no-op until backend exists |
| notifications-stream | legacy | Gated stub — intentional no-op until backend exists |
| notifications-send-channel | legacy | Gated stub — intentional no-op until backend exists |
| team-users | legacy | Gated stub — intentional no-op until backend exists |
| team-user-update | legacy | Gated stub — intentional no-op until backend exists |
| team-user-delete | legacy | Gated stub — intentional no-op until backend exists |
| team-invite | legacy | Gated stub — intentional no-op until backend exists |
| bulk-sync | legacy | Gated stub — intentional no-op until backend exists |
| clinical-alerts-stream | legacy | Gated stub — intentional no-op until backend exists |
| exports-pdf | legacy | Gated stub — intentional no-op until backend exists |
| exports-excel | legacy | Gated stub — intentional no-op until backend exists |
| reports-generate | legacy | Gated stub — intentional no-op until backend exists |
| reports-schedule-create | legacy | Gated stub — intentional no-op until backend exists |
| reports-schedule-cancel | legacy | Gated stub — intentional no-op until backend exists |
| GET /api/auth/verify-email | legacy | Backend-only route (no SPA client) |
| GET /api/auth/google | legacy | Backend-only route (no SPA client) |
| GET /api/auth/google/callback | legacy | Backend-only route (no SPA client) |
| GET /api/auth/linkedin | legacy | Backend-only route (no SPA client) |
| GET /api/auth/linkedin/callback | legacy | Backend-only route (no SPA client) |
| GET /api/auth/oidc | legacy | Backend-only route (no SPA client) |
| GET /api/auth/saml | legacy | Backend-only route (no SPA client) |
| GET /api/auth/me | legacy | Backend-only route (no SPA client) |
| DELETE /api/auth/biometric/delete/:deviceId | legacy | Backend-only route (no SPA client) |
| GET /api/auth/biometric/available | legacy | Backend-only route (no SPA client) |
| GET /api/workspaces/:workspaceId | legacy | Backend-only route (no SPA client) |
| GET /api/workspaces/:workspaceId/members | legacy | Backend-only route (no SPA client) |
| POST /api/workspaces/:workspaceId/invitations | legacy | Backend-only route (no SPA client) |
| GET /api/workspaces/:workspaceId/tools | legacy | Backend-only route (no SPA client) |
| PATCH /api/workspaces/:workspaceId/tools | legacy | Backend-only route (no SPA client) |
| GET /api/organizations | legacy | Backend-only route (no SPA client) |
| POST /api/organizations | legacy | Backend-only route (no SPA client) |
| GET /api/organizations/:organizationId | legacy | Backend-only route (no SPA client) |
| PATCH /api/organizations/:organizationId | legacy | Backend-only route (no SPA client) |
| GET /api/organizations/current | legacy | Backend-only route (no SPA client) |
| POST /api/organizations/onboarding | legacy | Backend-only route (no SPA client) |
| GET /api/organizations/:organizationId/outcomes | legacy | Backend-only route (no SPA client) |
| PATCH /api/organizations/:organizationId/configuration | legacy | Backend-only route (no SPA client) |
| POST /api/organizations/:organizationId/integrations/request | legacy | Backend-only route (no SPA client) |
| GET /api/products | legacy | Backend-only route (no SPA client) |
| GET /api/products/pack-map | legacy | Backend-only route (no SPA client) |
| GET /api/products/:slug | legacy | Backend-only route (no SPA client) |
| GET /api/products/:slug/assets | legacy | Backend-only route (no SPA client) |
| GET /api/commercial-plans | legacy | Backend-only route (no SPA client) |
| GET /api/commercial-plans/:id | legacy | Backend-only route (no SPA client) |
| GET /api/specialties | legacy | Backend-only route (no SPA client) |
| GET /api/specialties/:slug | legacy | Backend-only route (no SPA client) |
| GET /api/care-pathways | legacy | Backend-only route (no SPA client) |
| GET /api/care-pathways/:slug | legacy | Backend-only route (no SPA client) |
| GET /api/agents | legacy | Backend-only route (no SPA client) |
| GET /api/integrations-marketplace | legacy | Backend-only route (no SPA client) |
| GET /api/maturity-assessments/questionnaire | legacy | Backend-only route (no SPA client) |
| POST /api/maturity-assessments | legacy | Backend-only route (no SPA client) |
| GET /api/platform/context | legacy | Backend-only route (no SPA client) |
| GET /api/platform/users/me/assets | legacy | Backend-only route (no SPA client) |
| GET /api/platform/users/me/recommendations | legacy | Backend-only route (no SPA client) |
| POST /api/platform/users/me/pinned-assets | legacy | Backend-only route (no SPA client) |
| POST /api/platform/users/me/hidden-assets | legacy | Backend-only route (no SPA client) |
| PATCH /api/platform/me/role-profile | legacy | Backend-only route (no SPA client) |
| GET /api/platform/assets | legacy | Backend-only route (no SPA client) |
| GET /api/platform/packs | legacy | Backend-only route (no SPA client) |
| GET /api/platform/packs/:packId | legacy | Backend-only route (no SPA client) |
| GET /api/platform/role-profiles | legacy | Backend-only route (no SPA client) |
| GET /api/platform/role-profiles/:id | legacy | Backend-only route (no SPA client) |
| GET /api/platform/organizations/:organizationId/entitlements | legacy | Backend-only route (no SPA client) |
| POST /api/platform/organizations/:organizationId/packs/:packId/install | legacy | Backend-only route (no SPA client) |
| POST /api/platform/organizations/:organizationId/packs/:packId/remove | legacy | Backend-only route (no SPA client) |
| PATCH /api/platform/assets/:assetId/lifecycle | legacy | Backend-only route (no SPA client) |
| GET /api/platform/digital-twin | legacy | Backend-only route (no SPA client) |
| GET /api/platform/organizations/:organizationId/analytics | legacy | Backend-only route (no SPA client) |
| GET /api/activity/me | legacy | Backend-only route (no SPA client) |
| GET /api/activity/me/summary | legacy | Backend-only route (no SPA client) |
| GET /api/activity/workspaces/:workspaceId | legacy | Backend-only route (no SPA client) |
| GET /api/personalization/me/recommendations | legacy | Backend-only route (no SPA client) |
| DELETE /api/personalization/me/saved-prompts/:promptId | legacy | Backend-only route (no SPA client) |
| POST /api/artifacts | legacy | Backend-only route (no SPA client) |
| GET /api/artifacts/:id | legacy | Backend-only route (no SPA client) |
| PATCH /api/artifacts/:id | legacy | Backend-only route (no SPA client) |
| GET /api/memory/short | legacy | Backend-only route (no SPA client) |
| GET /api/memory/long | legacy | Backend-only route (no SPA client) |
| GET /api/memory/clinical | legacy | Backend-only route (no SPA client) |
| POST /api/two-factor/verify | legacy | Backend-only route (no SPA client) |
| GET /api/subscriptions/config | legacy | Backend-only route (no SPA client) |
| POST /api/subscriptions/webhook | legacy | Backend-only route (no SPA client) |
| POST /api/chat/message-3d | legacy | Backend-only route (no SPA client) |
| POST /api/tools/execute | legacy | Backend-only route (no SPA client) |
| POST /api/tool-calling/execute | legacy | Backend-only route (no SPA client) |
| GET /api/tool-calling/catalog | legacy | Backend-only route (no SPA client) |
| GET /api/tool-calling/resolve | legacy | Backend-only route (no SPA client) |
| GET /api/tool-calling/logs | legacy | Backend-only route (no SPA client) |
| POST /api/cost-optimizer/route | legacy | Backend-only route (no SPA client) |
| GET /api/evaluation/metrics | legacy | Backend-only route (no SPA client) |
| GET /api/evaluation/runs | legacy | Backend-only route (no SPA client) |
| GET /api/drugs/categories | legacy | Backend-only route (no SPA client) |
| GET /api/drugs/:id | legacy | Backend-only route (no SPA client) |
| GET /api/products | wire | Platform/product API not listed in frontendApiCallsInventory |
| GET /api/products/pack-map | wire | Platform/product API not listed in frontendApiCallsInventory |
| GET /api/products/:slug | wire | Platform/product API not listed in frontendApiCallsInventory |
| GET /api/products/:slug/assets | wire | Platform/product API not listed in frontendApiCallsInventory |
| GET /api/platform/context | wire | Platform/product API not listed in frontendApiCallsInventory |
| GET /api/platform/users/me/assets | wire | Platform/product API not listed in frontendApiCallsInventory |
| GET /api/platform/users/me/recommendations | wire | Platform/product API not listed in frontendApiCallsInventory |
| POST /api/platform/users/me/pinned-assets | wire | Platform/product API not listed in frontendApiCallsInventory |
| POST /api/platform/users/me/hidden-assets | wire | Platform/product API not listed in frontendApiCallsInventory |
| PATCH /api/platform/me/role-profile | wire | Platform/product API not listed in frontendApiCallsInventory |
| GET /api/platform/assets | wire | Platform/product API not listed in frontendApiCallsInventory |
| GET /api/platform/packs | wire | Platform/product API not listed in frontendApiCallsInventory |
| GET /api/platform/packs/:packId | wire | Platform/product API not listed in frontendApiCallsInventory |
| GET /api/platform/role-profiles | wire | Platform/product API not listed in frontendApiCallsInventory |
| GET /api/platform/role-profiles/:id | wire | Platform/product API not listed in frontendApiCallsInventory |
| GET /api/platform/organizations/:organizationId/entitlements | wire | Platform/product API not listed in frontendApiCallsInventory |
| POST /api/platform/organizations/:organizationId/packs/:packId/install | wire | Platform/product API not listed in frontendApiCallsInventory |
| POST /api/platform/organizations/:organizationId/packs/:packId/remove | wire | Platform/product API not listed in frontendApiCallsInventory |
| PATCH /api/platform/assets/:assetId/lifecycle | wire | Platform/product API not listed in frontendApiCallsInventory |
| GET /api/platform/digital-twin | wire | Platform/product API not listed in frontendApiCallsInventory |
| GET /api/platform/organizations/:organizationId/analytics | wire | Platform/product API not listed in frontendApiCallsInventory |
| GET /api/platform-governance/consent/:patientId | wire | Platform/product API not listed in frontendApiCallsInventory |
| POST /api/platform-governance/consent/:patientId/:scope | wire | Platform/product API not listed in frontendApiCallsInventory |
| POST /api/platform-governance/gate/evaluate | wire | Platform/product API not listed in frontendApiCallsInventory |

_… and 12 more API rows._

## Orphan markdown (weak inbound links)

| Doc | Class | Evidence |
| --- | --- | --- |
| docs/asset-pack-productization-plan.md | quarantine | No inbound links from README, src, or other docs |
| docs/navigation-reduction-plan.md | quarantine | No inbound links from README, src, or other docs |
| docs/saas-bottleneck-implementation-audit.md | legacy | No inbound links from README, src, or other docs |

## Appendix

- Prior manual scan: [unwired-orphan-code-scan.md](./unwired-orphan-code-scan.md)
- Backend-only exposure: [orphaned-backend-functions.md](./orphaned-backend-functions.md)
- Generator: `src/data/orphanDetectionAudit.js`

