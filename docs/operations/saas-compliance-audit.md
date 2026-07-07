# SaaS Architecture Compliance Audit

Generated: 2026-07-07 (regenerate with `npm run saas-compliance-audit:write-docs`)

## Charter reference

**Note:** `CARE_DROID_SAAS_ARCHITECTURE_CHARTER.md` was **not found** in the repository root or `docs/`. This audit applies the charter checklist from the audit request and aligns with [asset-based-platform-migration-report.md](./asset-based-platform-migration-report.md) and [caredroid-platform-transformation-roadmap.md](./caredroid-platform-transformation-roadmap.md).

### Charter rules verified

1. **Everything is an asset** — Every shipped surface maps to a canonical `platform_assets` row (or explicit product/integration asset type).
2. **Every asset belongs to a pack** — `packIds` must be non-empty on the asset record and match `asset_packs.assetIds`.
3. **Every asset can be assigned to a tenant** — Asset is reachable via `organization_entitlements` through at least one pack with `organizationTypes`.
4. **Every asset can be assigned to a workspace** — Workspace can scope the asset via `enabledToolIds`, `LEGACY_TOOL_ID_ALIASES`, or `workspaceTags`.
5. **Every asset can be assigned to a role** — Role profile or `intendedRoles` / `roleProfiles` on the asset supports entitlement filtering.
6. **Every asset has governance metadata** — `governance` JSON includes clinical risk, human review, audit, and validation status.
7. **Every asset has lifecycle status** — `lifecycle` on platform asset (`draft|beta|active|deprecated|archived`) or inventory `lifecycleState`.

## Executive summary

| Metric | Count |
|--------|------:|
| Surfaces audited | 316 |
| User-facing registry tools | 291 |
| Seeded `platform_assets` | 8 |
| Fully charter-compliant (strict) | 305 |
| Rows with ≥1 violation | 11 |
| Registry tools without platform asset row | 0 |
| Seeded assets without pack | 0 AI agents + 0 other |

### Compliance posture

CareDroid now runs a **mounted registry projection**: 291 user-facing tools in `toolInventory.js` are projected through `assetInventory.js` with pack, product, workspace, role, lifecycle, execution, and governance metadata while backend `platform_assets` remains the commercial entitlement source. **Current state: mounted with evidence** — rows that are not direct DB seeds must retain projection evidence until generated seed sync is automated.

## Violations by charter rule

### Everything is an asset (9 violations)

- **3D Medical Viewer** (`3d-viewer`, /3d-viewer) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Platform Analytics** (`platform-analytics`, /platform-analytics) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Fleet Command** (`fleet-dashboard`, /fleet/command) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Medical IoT Dashboard** (`medical-iot`, /medical-iot) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Laboratory Dashboard** (`laboratory`, /laboratory) — No `platform_assets` seed row; only `toolInventory.js` projection
- **User Welcome** (`welcome`, /welcome) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Command Whiteboard** (`dashboard`, /dashboard) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Digital Twin** (`digital-twin`, /digital-twin) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Workflow Builder** (`workflows`, /workflows) — No `platform_assets` seed row; only `toolInventory.js` projection


### Every asset belongs to a pack (0 violations)

- None

### Every asset can be assigned to a tenant (0 violations)

- None

### Every asset can be assigned to a workspace (0 violations)

- None

### Every asset can be assigned to a role (6 violations)

- **3D Medical Viewer** (`3d-viewer`, /3d-viewer) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`
- **Platform Analytics** (`platform-analytics`, /platform-analytics) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`
- **Integration Marketplace** (`integrations-marketplace`, /integrations-marketplace) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`
- **Product Catalog** (`products-catalog`, /products) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`
- **User Welcome** (`welcome`, /welcome) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`
- **Workflow Builder** (`workflows`, /workflows) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`


### Every asset has governance metadata (0 violations)

- None

### Every asset has lifecycle status (0 violations)

- None

## Critical structural violations

| ID | Severity | Description | Remediation |
|----|----------|-------------|-------------|
| STRUCT-001 | **Resolved / Monitor** | `toolInventory.js` remains launch source of truth and `assetInventory.ts` now mounts user-facing tools to packs, products, workspaces, roles, lifecycle, execution, and governance | Automate seed generation from the mounted projection to remove manual drift risk |
| STRUCT-002 | **Resolved** | AI agents are pack-mounted through the AI workflow/core platform graph | Keep AI agent pack membership covered by seed and projection tests |
| STRUCT-003 | **Resolved / Monitor** | Commercial surfaces (`/products`, `/integrations-marketplace`) are documented system/product routes and mapped to pack-backed product metadata | Add explicit product-wrapper assets if commercial pages become launchable assets |
| STRUCT-004 | **Resolved** | Inventory lifecycle now maps to platform lifecycle enum (`draft`, `beta`, `active`, `deprecated`, `archived`) | Keep admin-only as access policy instead of lifecycle |
| STRUCT-005 | **Medium** | Seeded assets use empty `roleProfiles` / `workspaceTags` (implicit “all”) — compliant for assignment API but weak for explicit policy | Populate `roleProfiles` and `workspaceTags` per pack `targetRoles` / `defaultModules` |
| STRUCT-006 | **Resolved** | `assetInventory.ts` derives non-empty `packIds`, `productIds`, workspace, role, execution, and governance metadata for mounted tools | Keep asset projection invariant tests passing |
| STRUCT-007 | **Low** | `/assistant?agent=` query now resolves through ED Copilot shell alias | Wire agent asset id to Copilot session context |

## Seeded platform assets (DB) — pack membership

Assets in `SEED_PLATFORM_ASSETS` without pack assignment:

- None

## Full compliance matrix

| Feature | Route | Inventory ID | Asset ID | Pack | Platform asset? | Lifecycle | Governance | Violations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3D Medical Viewer | /3d-viewer | 3d-viewer | 3d-viewer | core-platform | No | active | Complete (seed template) | everything-is-asset; role-assignable |
| clinical AI | /assistant?agent=agent-clinical | agent-clinical | agent-clinical | core-platform, ai-workflow-pack | Yes | active | Complete (seed template) | — |
| education AI | /assistant?agent=agent-education | agent-education | agent-education | core-platform, ai-workflow-pack | Yes | active | Complete (seed template) | — |
| emergency AI | /assistant?agent=agent-emergency | agent-emergency | agent-emergency | core-platform, ai-workflow-pack | Yes | active | Complete (seed template) | — |
| fleet AI | /assistant?agent=agent-fleet | agent-fleet | agent-fleet | core-platform, ai-workflow-pack | Yes | active | Complete (seed template) | — |
| governance AI | /assistant?agent=agent-governance | agent-governance | agent-governance | core-platform, ai-workflow-pack | Yes | active | Complete (seed template) | — |
| lab AI | /assistant?agent=agent-lab | agent-lab | agent-lab | core-platform, ai-workflow-pack | Yes | active | Complete (seed template) | — |
| operations AI | /assistant?agent=agent-operations | agent-operations | agent-operations | core-platform, ai-workflow-pack | Yes | active | Complete (seed template) | — |
| research AI | /assistant?agent=agent-research | agent-research | agent-research | core-platform, ai-workflow-pack | Yes | active | Complete (seed template) | — |
| Platform Analytics | /platform-analytics | platform-analytics | platform-analytics | governance-compliance-pack | No | active | Complete (seed template) | everything-is-asset; role-assignable |
| Integration Marketplace | /integrations-marketplace | integrations-marketplace | integrations-marketplace | core-platform | Yes | active | Complete (seed template) | role-assignable |
| Product Catalog | /products | products-catalog | products-catalog | core-platform | Yes | active | Complete (seed template) | role-assignable |
| Fleet Command | /fleet/command | fleet-dashboard | fleet-dashboard | fleet-logistics | No | active | Complete (seed template) | everything-is-asset |
| Medical IoT Dashboard | /medical-iot | medical-iot | medical-iot | medical-iot-pack | No | active | Complete (seed template) | everything-is-asset |
| Laboratory Dashboard | /laboratory | laboratory | laboratory | laboratory-intelligence | No | active | Complete (seed template) | everything-is-asset |
| Hospital Map | /hospital-map | hospital-map | hospital-map | hospital-operations, digital-twin-pack, medical-iot-pack | Yes | beta | Complete (seed template) | — |
| User Welcome | /welcome | welcome | welcome | core-platform | No | active | Complete (seed template) | everything-is-asset; role-assignable |
| Asset Pack Marketplace | /settings/organization/packs | asset-packs-marketplace | asset-packs-marketplace | core-platform | Yes | active | Complete (seed template) | — |
| Configuration Studio | /configuration-studio | configuration-studio | configuration-studio | core-platform | Yes | active | Complete (seed template) | — |
| Organization Dashboard | /organization | organization-dashboard | organization-dashboard | core-platform | Yes | active | Complete (seed template) | — |
| Organization Onboarding | /onboarding | onboarding-wizard | onboarding-wizard | core-platform | Yes | active | Complete (seed template) | — |
| Simulation Suite | /simulation | simulation-suite | simulation-suite | simulation-training-pack, ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| 3D Viewer | /3d-viewer | medical-3d-viewer | medical-3d-viewer | simulation-training-pack, research-education, core-platform | Yes | draft | Complete (seed template) | — |
| A-a Gradient | /tools/calculators/aa-gradient | aa-gradient | aa-gradient | core-platform | Yes | draft | Complete (seed template) | — |
| ABCD² score | /tools/calculators/abcd2 | abcd2 | abcd2 | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| ABG Interpreter | /tools/lab-interpreter | abg-interpreter | abg-interpreter | laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| ACLS Protocol | /protocols | acls-protocol | acls-protocol | ai-workflow-pack, core-platform, cardiology-pack, laboratory-intelligence, simulation-training-pack | Yes | draft | Complete (seed template) | — |
| ACS Workflow Assistant | /tools/cardiology/acs-workflow-assistant | acs-workflow-assistant | acs-workflow-assistant | ai-workflow-pack, core-platform, cardiology-pack | Yes | draft | Complete (seed template) | — |
| Adjusted Body Weight | /tools/calculators/adjusted-body-weight | adjusted-body-weight | adjusted-body-weight | laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| AI Artifacts | /artifacts | ai-artifacts | ai-artifacts | ai-workflow-pack, core-platform, medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| AI Command Center | /ai-command-center | ai-command-center | ai-command-center | ai-workflow-pack, core-platform, hospital-operations, digital-twin-pack, research-education | Yes | draft | Complete (seed template) | — |
| AI Cost Optimization | /costs | ai-cost-optimization | ai-cost-optimization | ai-workflow-pack, core-platform, cardiology-pack | Yes | draft | Complete (seed template) | — |
| AI Evaluation | /ai-evaluation | ai-evaluation | ai-evaluation | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| AI Explainability | /tools/ai-explainability | ai-explainability | ai-explainability | governance-compliance-pack, ai-workflow-pack, core-platform | Yes | active | Complete (seed template) | — |
| AI Gateway | /assistant | ai-gateway | ai-gateway | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| AI Governance | /ai-governance | ai-governance | ai-governance | governance-compliance-pack, ai-workflow-pack, core-platform | Yes | active | Complete (seed template) | — |
| AI Memory | /memory | ai-memory | ai-memory | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| AI Run Audit Timeline | /audit/ai | ai-run-audit-timeline | ai-run-audit-timeline | ai-workflow-pack, core-platform, governance-compliance-pack | Yes | active | Complete (seed template) | — |
| AI Tool Calling | /assistant | ai-tool-calling | ai-tool-calling | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| AI Training Pipeline | /training | ai-training | ai-training | ai-workflow-pack, core-platform, simulation-training-pack | Yes | draft | Complete (seed template) | — |
| AKI Staging Assistant | /tools/nephrology/aki-staging-assistant | aki-staging-assistant | aki-staging-assistant | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| All calculators | /tools/calculators | calculators | calculators | core-platform, emergency-medicine, emergency-department-pack, cardiology-pack | Yes | active | Complete (seed template) | — |
| Ambient Clinical Scribe | /tools/ambient-scribe | ambient-scribe | ambient-scribe | ai-workflow-pack, core-platform | Yes | active | Complete (seed template) | — |
| Anion Gap | /tools/calculators/anion-gap | anion-gap | anion-gap | core-platform | Yes | draft | Complete (seed template) | — |
| Antibiotic Guide | /tools/diagnosis | antibiotic-guide | antibiotic-guide | cardiology-pack, laboratory-intelligence, medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Anticoagulation Protocol Plugin | /protocols | plugin-anticoagulation-protocol | plugin-anticoagulation-protocol | research-education | Yes | beta | Complete (seed template) | — |
| APACHE-II | /tools/calculators/apache-ii | apache2-calculator | apache2-calculator | icu-pack | Yes | draft | Complete (seed template) | — |
| Apgar score | /tools/calculators/apgar-score | apgar-score | apgar-score | core-platform | Yes | draft | Complete (seed template) | — |
| APRI | /tools/calculators/apri | apri | apri | core-platform | Yes | draft | Complete (seed template) | — |
| Arrhythmia Risk Classifier | /tools/cardiology/arrhythmia-risk-classifier | arrhythmia-risk-classifier | arrhythmia-risk-classifier | cardiology-pack, medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| ASCVD 10-year risk | /tools/calculators/ascvd-risk | ascvd-risk | ascvd-risk | cardiology-pack | Yes | draft | Complete (seed template) | — |
| Asset Tracking Dashboard | /hospital-map | asset-tracking-dashboard | asset-tracking-dashboard | medical-iot-pack, hospital-operations, digital-twin-pack | Yes | beta | Complete (seed template) | — |
| Asthma Exacerbation Assistant | /tools/pulmonology/asthma-exacerbation-assistant | asthma-exacerbation-assistant | asthma-exacerbation-assistant | ai-workflow-pack, core-platform, laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Asthma Severity Score | /tools/calculators/asthma-severity-score | asthma-severity-score | asthma-severity-score | core-platform | Yes | draft | Complete (seed template) | — |
| ATLS Protocol | /protocols | atls-protocol | atls-protocol | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack, simulation-training-pack | Yes | draft | Complete (seed template) | — |
| Atrial Fibrillation Assistant | /tools/cardiology/atrial-fibrillation-assistant | atrial-fibrillation-assistant | atrial-fibrillation-assistant | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack, cardiology-pack, laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Audit Trail AI | /tools/audit-trail-ai | audit-trail-ai | audit-trail-ai | ai-workflow-pack, core-platform, governance-compliance-pack | Yes | active | Complete (seed template) | — |
| Audit Trail Spine | /audit | audit-trail-spine | audit-trail-spine | ai-workflow-pack, core-platform, governance-compliance-pack | Yes | active | Complete (seed template) | — |
| AUDIT-C | /tools/calculators/audit-c | audit-c | audit-c | governance-compliance-pack | Yes | draft | Complete (seed template) | — |
| Bed Occupancy Calculator | /tools/calculators/bed-occupancy-calculator | bed-occupancy-calculator | bed-occupancy-calculator | emergency-medicine, emergency-department-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Behavioral Analytics Dashboard | /tools/psychiatry/behavioral-analytics-dashboard | behavioral-analytics-dashboard | behavioral-analytics-dashboard | research-education | Yes | draft | Complete (seed template) | — |
| Bias Finding Review | /governance/equity/findings | bias-finding-review | bias-finding-review | governance-compliance-pack | Yes | beta | Complete (seed template) | — |
| BISAP score | /tools/calculators/bisap-score | bisap-score | bisap-score | core-platform | Yes | draft | Complete (seed template) | — |
| Bishop score | /tools/calculators/bishop-score | bishop-score | bishop-score | core-platform | Yes | draft | Complete (seed template) | — |
| BMI | /tools/calculators/bmi | calc-bmi | calc-bmi | core-platform | Yes | active | Complete (seed template) | — |
| BODE Index | /tools/calculators/bode-index | bode-index | bode-index | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Body Surface Area | /tools/calculators/bsa | bsa | bsa | laboratory-intelligence, research-education | Yes | draft | Complete (seed template) | — |
| Braden scale | /tools/calculators/braden-scale | braden-scale | braden-scale | core-platform | Yes | draft | Complete (seed template) | — |
| BUN/Creatinine Ratio | /tools/calculators/bun-creatinine-ratio | bun-creatinine-ratio | bun-creatinine-ratio | core-platform | Yes | draft | Complete (seed template) | — |
| CAGE | /tools/calculators/cage | cage | cage | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| Calculator Recommendation AI | /tools/calculator-recommender | calculator-recommender-ai | calculator-recommender-ai | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Canadian C-Spine Rule | /tools/calculators | canadian-c-spine | canadian-c-spine | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Capacity Command Dashboard Plugin | /operations | plugin-capacity-command-dashboard | plugin-capacity-command-dashboard | medical-iot-pack, hospital-operations, digital-twin-pack | Yes | beta | Complete (seed template) | — |
| Capacity Prediction Engine | /hospital-map | capacity-prediction-engine | capacity-prediction-engine | medical-iot-pack, fleet-logistics, hospital-operations, digital-twin-pack | Yes | beta | Complete (seed template) | — |
| Cardiac Telemetry Analyzer | /tools/cardiology/cardiac-telemetry-analyzer | cardiac-telemetry-analyzer | cardiac-telemetry-analyzer | cardiology-pack, medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Cardiology Command Center | /tools/cardiology/cardiology-command-center | cardiology-command-center | cardiology-command-center | cardiology-pack, medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Care Plan View | /patients/:patientId/care-plan | care-plan-view | care-plan-view | core-platform | Yes | beta | Complete (seed template) | — |
| Centor / McIsaac | /tools/calculators/centor-mcisaac | centor-mcisaac | centor-mcisaac | laboratory-intelligence, medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| CHA₂DS₂-VASc | /tools/calculators/chads2vasc | calc-chads2vasc | calc-chads2vasc | emergency-medicine, emergency-department-pack, cardiology-pack | Yes | draft | Complete (seed template) | — |
| CHADS2 | /tools/calculators/chads2 | chads2 | chads2 | emergency-medicine, emergency-department-pack, cardiology-pack | Yes | draft | Complete (seed template) | — |
| Child-Pugh | /tools/calculators/child-pugh | child-pugh | child-pugh | core-platform | Yes | draft | Complete (seed template) | — |
| Cirrhosis Monitoring Engine | /tools/gastroenterology/cirrhosis-monitoring-engine | cirrhosis-monitoring-engine | cirrhosis-monitoring-engine | core-platform | Yes | draft | Complete (seed template) | — |
| CKD Progression Predictor | /tools/nephrology/ckd-progression-predictor | ckd-progression-predictor | ckd-progression-predictor | core-platform | Yes | draft | Complete (seed template) | — |
| CKD staging (KDIGO) | /tools/calculators/ckd-staging | ckd-staging | ckd-staging | laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Clinical Audit | /tools/clinical-audit | clinical-audit | clinical-audit | governance-compliance-pack, ai-workflow-pack, core-platform, research-education | Yes | active | Complete (seed template) | — |
| Clinical Decision Support Engine | /clinical-decision-support | clinical-decision-support | clinical-decision-support | ai-workflow-pack, core-platform, laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Clinical Dictation | /tools/clinical-dictation | clinical-dictation | clinical-dictation | core-platform | Yes | beta | Complete (seed template) | — |
| Clinical Documentation Assistant | /documentation | clinical-documentation-assistant | clinical-documentation-assistant | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| Clinical Event AI | /patients/:patientId/events | clinical-event-ai | clinical-event-ai | ai-workflow-pack, core-platform | Yes | beta | Complete (seed template) | — |
| Clinical Governance | /governance/clinical | clinical-governance | clinical-governance | governance-compliance-pack | Yes | active | Complete (seed template) | — |
| Clinical Knowledge Graph | /knowledge-graph | clinical-knowledge-graph | clinical-knowledge-graph | research-education, ai-workflow-pack, core-platform, laboratory-intelligence, medical-iot-pack, hospital-operations, digital-twin-pack, simulation-training-pack | Yes | draft | Complete (seed template) | — |
| Clinical Reasoning Engine | /tools/clinical-reasoning-engine | clinical-reasoning-engine | clinical-reasoning-engine | core-platform | Yes | beta | Complete (seed template) | — |
| Clinical Release Gates | /governance/clinical/release-gates | clinical-release-gates | clinical-release-gates | governance-compliance-pack | Yes | active | Complete (seed template) | — |
| Clinical Safety Audit | /governance/clinical-safety | clinical-safety-audit | clinical-safety-audit | governance-compliance-pack | Yes | beta | Complete (seed template) | — |
| Clinical Safety Findings | /governance/clinical/safety-findings | clinical-safety-findings | clinical-safety-findings | governance-compliance-pack | Yes | beta | Complete (seed template) | — |
| Cognitive Screening Assistant | /tools/psychiatry/cognitive-screening-assistant | cognitive-screening-assistant | cognitive-screening-assistant | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| Columbia Suicide Severity Workflow | /tools/calculators/columbia-suicide-severity-workflow | columbia-suicide-severity-workflow | columbia-suicide-severity-workflow | core-platform | Yes | draft | Complete (seed template) | — |
| Competency Platform | /competencies | competency-platform | competency-platform | ai-workflow-pack, core-platform, simulation-training-pack | Yes | draft | Complete (seed template) | — |
| Consent Center | /patients/:patientId/consent | consent-center | consent-center | governance-compliance-pack | Yes | beta | Complete (seed template) | — |
| Consent Manager | /governance/consent | consent-manager | consent-manager | governance-compliance-pack | Yes | beta | Complete (seed template) | — |
| Continuous Glucose Command Center | /tools/endocrine/continuous-glucose-command-center | continuous-glucose-command-center | continuous-glucose-command-center | medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| COPD GOLD | /tools/calculators | copd-gold | copd-gold | core-platform | Yes | draft | Complete (seed template) | — |
| COPD GOLD Assessment | /tools/calculators/copd-gold-assessment | copd-gold-assessment | copd-gold-assessment | laboratory-intelligence, medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| COPD Workflow Assistant | /tools/pulmonology/copd-workflow-assistant | copd-workflow-assistant | copd-workflow-assistant | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| Corrected Calcium | /tools/calculators/corrected-calcium | corrected-calcium | corrected-calcium | core-platform | Yes | draft | Complete (seed template) | — |
| Corrected Sodium | /tools/calculators/corrected-sodium | corrected-sodium | corrected-sodium | core-platform | Yes | draft | Complete (seed template) | — |
| Cost Optimization Control Plane | /governance/costs | cost-optimization-control-plane | cost-optimization-control-plane | cardiology-pack, governance-compliance-pack | Yes | beta | Complete (seed template) | — |
| Creatinine Clearance (Cockcroft-Gault) | /tools/calculators/creatinine-clearance-cg | creatinine-clearance-cg | creatinine-clearance-cg | laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Credentialing Platform | /credentials | credentialing-platform | credentialing-platform | ai-workflow-pack, core-platform, simulation-training-pack, research-education | Yes | draft | Complete (seed template) | — |
| Crisis Escalation Audit Log | /tools/psychiatry/crisis-escalation-audit-log | crisis-escalation-audit-log | crisis-escalation-audit-log | governance-compliance-pack | Yes | draft | Complete (seed template) | — |
| CURB-65 | /tools/calculators/curb-65 | curb65-calculator | curb65-calculator | core-platform | Yes | draft | Complete (seed template) | — |
| Deployment Observability | /operations/observability | deployment-observability | deployment-observability | hospital-operations, digital-twin-pack | Yes | active | Complete (seed template) | — |
| Device Battery Intelligence | /medical-iot | device-battery-intelligence | device-battery-intelligence | medical-iot-pack, hospital-operations, digital-twin-pack | Yes | beta | Complete (seed template) | — |
| Device Fleet Management | /devices | device-fleet-management | device-fleet-management | medical-iot-pack, hospital-operations, fleet-logistics, digital-twin-pack | Yes | beta | Complete (seed template) | — |
| Device Maintenance | /devices | device-maintenance | device-maintenance | medical-iot-pack, ai-workflow-pack, core-platform, hospital-operations, digital-twin-pack | Yes | beta | Complete (seed template) | — |
| Device Recommendation Assistant | /tools/calculators | device-recommendation-assistant | device-recommendation-assistant | ai-workflow-pack, core-platform, medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Diabetes Care Assistant | /tools/endocrine/diabetes-care-assistant | diabetes-care-assistant | diabetes-care-assistant | ai-workflow-pack, core-platform, laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Diagnosis Assistant | /tools/diagnosis | diagnosis | diagnosis | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| Dialysis Readiness Helper | /tools/nephrology/dialysis-readiness-helper | dialysis-readiness-helper | dialysis-readiness-helper | core-platform | Yes | draft | Complete (seed template) | — |
| Dialysis Utilization Tracker | /tools/nephrology/dialysis-utilization-tracker | dialysis-utilization-tracker | dialysis-utilization-tracker | hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Differential Diagnosis Assistant | /tools/differential-ai | differential-ai | differential-ai | ai-workflow-pack, core-platform, research-education | Yes | active | Complete (seed template) | — |
| Discharge Summary AI | /tools/discharge-summary-ai | discharge-summary-ai | discharge-summary-ai | ai-workflow-pack, core-platform | Yes | beta | Complete (seed template) | — |
| Discharge Workflow Plugin | /assistant | plugin-discharge-workflow | plugin-discharge-workflow | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| Dispatch Intelligence | /tools/calculators | dispatch-ai | dispatch-ai | fleet-logistics, ai-workflow-pack, core-platform, hospital-operations, digital-twin-pack | Yes | deprecated | Complete (seed template) | — |
| DKA Pathway Assistant | /tools/endocrine/dka-pathway-assistant | dka-pathway-assistant | dka-pathway-assistant | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Drug Checker | /tools/drug-checker | drug-check | drug-check | laboratory-intelligence, medical-iot-pack, hospital-operations, digital-twin-pack | Yes | active | Complete (seed template) | — |
| Duke Treadmill Score | /tools/calculators/duke-treadmill-score | duke-treadmill-score | duke-treadmill-score | cardiology-pack | Yes | draft | Complete (seed template) | — |
| ECG Interpretation Assistant | /tools/cardiology/ecg-interpretation-assistant | ecg-interpretation-assistant | ecg-interpretation-assistant | ai-workflow-pack, core-platform, cardiology-pack, fleet-logistics | Yes | draft | Complete (seed template) | — |
| ECG Trend Engine | /tools/cardiology/ecg-trend-engine | ecg-trend-engine | ecg-trend-engine | cardiology-pack | Yes | draft | Complete (seed template) | — |
| EEG Trend Dashboard | /tools/neurology/eeg-trend-dashboard | eeg-trend-dashboard | eeg-trend-dashboard | core-platform | Yes | draft | Complete (seed template) | — |
| eGFR (CKD-EPI) | /tools/calculators/gfr | calc-gfr | calc-gfr | core-platform | Yes | active | Complete (seed template) | — |
| eGFR CKD-EPI 2021 | /tools/calculators/egfr-ckd-epi | egfr-ckd-epi | egfr-ckd-epi | laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| EHR Patient Import | /patients/import | ehr-patient-import | ehr-patient-import | core-platform | Yes | beta | Complete (seed template) | — |
| Electrolyte Disorder Assistant | /tools/nephrology/electrolyte-disorder-assistant | electrolyte-disorder-assistant | electrolyte-disorder-assistant | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| Electrolyte Trend Engine | /tools/nephrology/electrolyte-trend-engine | electrolyte-trend-engine | electrolyte-trend-engine | core-platform | Yes | draft | Complete (seed template) | — |
| Endocrine Monitoring System | /tools/endocrine/endocrine-monitoring-system | endocrine-monitoring-system | endocrine-monitoring-system | core-platform | Yes | draft | Complete (seed template) | — |
| Endoscopy Workflow Assistant | /tools/gastroenterology/endoscopy-workflow-assistant | endoscopy-workflow-assistant | endoscopy-workflow-assistant | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| Epworth Sleepiness Scale | /tools/calculators/epworth-sleepiness-scale | epworth-sleepiness-scale | epworth-sleepiness-scale | laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Equity Monitoring | /governance/equity | equity-monitoring | equity-monitoring | governance-compliance-pack, research-education | Yes | beta | Complete (seed template) | — |
| FeNa | /tools/calculators/fena | fena | fena | core-platform | Yes | draft | Complete (seed template) | — |
| Fenton Growth Chart Helper | /tools/calculators/fenton-growth-chart-helper | fenton-growth-chart-helper | fenton-growth-chart-helper | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| FeUrea | /tools/calculators/feurea | feurea | feurea | core-platform | Yes | draft | Complete (seed template) | — |
| FHIR Connector | /integrations/fhir | fhir-connector | fhir-connector | core-platform | Yes | beta | Complete (seed template) | — |
| FIB-4 | /tools/calculators/fib4 | fib4 | fib4 | core-platform | Yes | draft | Complete (seed template) | — |
| Fleet Command | /fleet/command | fleet-command | fleet-command | medical-iot-pack, fleet-logistics, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Fleet Live Map | /fleet/map | fleet-live-map | fleet-live-map | fleet-logistics, hospital-operations, digital-twin-pack | Yes | active | Complete (seed template) | — |
| Fluid Balance Monitor | /tools/nephrology/fluid-balance-monitor | fluid-balance-monitor | fluid-balance-monitor | core-platform | Yes | draft | Complete (seed template) | — |
| Fluid Resuscitation Calculator Plugin | /tools/catalog | plugin-fluid-resuscitation-calculator | plugin-fluid-resuscitation-calculator | core-platform | Yes | beta | Complete (seed template) | — |
| FOUR Score | /tools/calculators/four-score | four-score | four-score | core-platform | Yes | draft | Complete (seed template) | — |
| Framingham CHD risk | /tools/calculators/framingham-risk | framingham-risk | framingham-risk | cardiology-pack | Yes | draft | Complete (seed template) | — |
| Free Water Deficit | /tools/calculators/free-water-deficit | free-water-deficit | free-water-deficit | core-platform | Yes | draft | Complete (seed template) | — |
| GAD-7 | /tools/calculators/gad7 | gad7 | gad7 | ai-workflow-pack, core-platform, laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Gestational Age Calculator | /tools/calculators/gestational-age-calculator | gestational-age-calculator | gestational-age-calculator | core-platform | Yes | draft | Complete (seed template) | — |
| GI Bleed Workflow Assistant | /tools/gastroenterology/gi-bleed-workflow-assistant | gi-bleed-workflow-assistant | gi-bleed-workflow-assistant | ai-workflow-pack, core-platform, laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| GI Command Center | /tools/gastroenterology/gi-command-center | gi-command-center | gi-command-center | core-platform | Yes | draft | Complete (seed template) | — |
| GI Surveillance Dashboard | /tools/gastroenterology/gi-surveillance-dashboard | gi-surveillance-dashboard | gi-surveillance-dashboard | core-platform | Yes | draft | Complete (seed template) | — |
| Glasgow Coma Scale (GCS) | /tools/calculators/gcs | gcs-calculator | gcs-calculator | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Glasgow-Blatchford Score | /tools/calculators/glasgow-blatchford-score | glasgow-blatchford-score | glasgow-blatchford-score | core-platform | Yes | draft | Complete (seed template) | — |
| Glucose Telemetry Dashboard | /tools/endocrine/glucose-telemetry-dashboard | glucose-telemetry-dashboard | glucose-telemetry-dashboard | medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| GRACE ACS Risk | /tools/calculators | grace-acs | grace-acs | cardiology-pack | Yes | draft | Complete (seed template) | — |
| Growth Trend Analytics | /tools/pediatrics-obgyn/growth-trend-analytics | growth-trend-analytics | growth-trend-analytics | emergency-medicine, emergency-department-pack, research-education | Yes | draft | Complete (seed template) | — |
| Guideline Copilot AI Extension | /assistant | plugin-guideline-copilot-extension | plugin-guideline-copilot-extension | ai-workflow-pack, core-platform, research-education | Yes | active | Complete (seed template) | — |
| Guideline Retrieval + Evidence Engine | /tools/guideline-rag | guideline-rag | guideline-rag | research-education | Yes | active | Complete (seed template) | — |
| HAS-BLED | /tools/calculators/has-bled | has-bled | has-bled | emergency-medicine, emergency-department-pack, cardiology-pack, laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| HCM Sudden Death Risk | /tools/calculators/hcm-sudden-death-risk | hcm-sudden-death-risk | hcm-sudden-death-risk | cardiology-pack | Yes | draft | Complete (seed template) | — |
| Headache Red Flag Assistant | /tools/neurology/headache-red-flag-assistant | headache-red-flag-assistant | headache-red-flag-assistant | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Heart Failure Assistant | /tools/cardiology/heart-failure-assistant | heart-failure-assistant | heart-failure-assistant | ai-workflow-pack, core-platform, cardiology-pack, medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Heart Failure Staging Helper | /tools/calculators/heart-failure-staging | heart-failure-staging | heart-failure-staging | ai-workflow-pack, core-platform, cardiology-pack | Yes | draft | Complete (seed template) | — |
| HEART score | /tools/calculators/heart-score | heart-score | heart-score | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack, cardiology-pack | Yes | draft | Complete (seed template) | — |
| Hepatic Trend Analytics | /tools/gastroenterology/hepatic-trend-analytics | hepatic-trend-analytics | hepatic-trend-analytics | research-education | Yes | draft | Complete (seed template) | — |
| HL7 Bridge | /integrations/hl7 | hl7-bridge | hl7-bridge | core-platform | Yes | beta | Complete (seed template) | — |
| HOMA-IR | /tools/calculators/homa-ir | homa-ir | homa-ir | laboratory-intelligence, research-education | Yes | draft | Complete (seed template) | — |
| Hospital Command Assistant | /tools/calculators | hospital-command-assistant | hospital-command-assistant | ai-workflow-pack, core-platform, medical-iot-pack, fleet-logistics, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Hospital Map | /hospital-map | hospital-map | hospital-map | hospital-operations, digital-twin-pack, medical-iot-pack | Yes | beta | Complete (seed template) | — |
| Hospital Operations Cockpit | /hospital-map | hospital-operations-cockpit | hospital-operations-cockpit | medical-iot-pack, fleet-logistics, hospital-operations, digital-twin-pack | Yes | beta | Complete (seed template) | — |
| Hospital Operations Command | /hospital-map | hospital-operations-command | hospital-operations-command | hospital-operations, digital-twin-pack, medical-iot-pack, fleet-logistics | Yes | beta | Complete (seed template) | — |
| Human Review Queue | /review | human-review-queue | human-review-queue | core-platform | Yes | active | Complete (seed template) | — |
| Hunt-Hess Scale | /tools/calculators/hunt-hess-scale | hunt-hess-scale | hunt-hess-scale | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| ICH Score | /tools/calculators/ich-score | ich-score | ich-score | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Ideal Body Weight | /tools/calculators/ideal-body-weight | ideal-body-weight | ideal-body-weight | laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Incident Command Center | /hospital-map | incident-command-center | incident-command-center | medical-iot-pack, fleet-logistics, hospital-operations, digital-twin-pack | Yes | beta | Complete (seed template) | — |
| Insulin Trend Engine | /tools/endocrine/insulin-trend-engine | insulin-trend-engine | insulin-trend-engine | laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Intelligent Order Set Assistant | /tools/order-set-ai | order-set-ai | order-set-ai | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack, cardiology-pack, research-education | Yes | active | Complete (seed template) | — |
| Intended Use Registry | /governance/regulatory/intended-use | intended-use-registry | intended-use-registry | governance-compliance-pack | Yes | beta | Complete (seed template) | — |
| Kidney Failure Risk Equation | /tools/calculators/kfre | kfre | kfre | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| Lab Interpreter | /tools/lab-interpreter | lab-interp | lab-interp | laboratory-intelligence | Yes | active | Complete (seed template) | — |
| Lab Result Import | /patients/:patientId/labs/import | lab-result-import | lab-result-import | laboratory-intelligence | Yes | beta | Complete (seed template) | — |
| Laboratory Dashboard | /laboratory | laboratory-dashboard | laboratory-dashboard | laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Live Tracking Map | /live-map | live-tracking-map | live-tracking-map | medical-iot-pack, fleet-logistics, hospital-operations, digital-twin-pack | Yes | beta | Complete (seed template) | — |
| Liver Disease Assistant | /tools/gastroenterology/liver-disease-assistant | liver-disease-assistant | liver-disease-assistant | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| LLM Security | /security | ai-security | ai-security | governance-compliance-pack, ai-workflow-pack, core-platform | Yes | active | Complete (seed template) | — |
| Maddrey Discriminant Function | /tools/calculators/maddrey-discriminant-function | maddrey-discriminant-function | maddrey-discriminant-function | core-platform | Yes | draft | Complete (seed template) | — |
| Maternal Monitoring Dashboard | /tools/pediatrics-obgyn/maternal-monitoring-dashboard | maternal-monitoring-dashboard | maternal-monitoring-dashboard | core-platform | Yes | draft | Complete (seed template) | — |
| MDQ | /tools/calculators/mdq | mdq | mdq | ai-workflow-pack, core-platform, laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Medical IoT Dashboard | /medical-iot | medical-iot-dashboard | medical-iot-dashboard | medical-iot-pack, cardiology-pack, hospital-operations, digital-twin-pack | Yes | beta | Complete (seed template) | — |
| Medical Simulation Suite | /simulation | simulation-suite | simulation-suite | simulation-training-pack, ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Medication Dose Calculator | /tools/calculators | dose-calculator | dose-calculator | laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Medication List Import | /patients/:patientId/medications/import | medication-list-import | medication-list-import | laboratory-intelligence | Yes | beta | Complete (seed template) | — |
| MELD | /tools/calculators/meld | meld | meld | core-platform | Yes | draft | Complete (seed template) | — |
| MELD-Na | /tools/calculators/meld-na | meld-na | meld-na | core-platform | Yes | draft | Complete (seed template) | — |
| Mental Health Screening Assistant | /tools/psychiatry/mental-health-screening-assistant | mental-health-screening-assistant | mental-health-screening-assistant | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Metabolic Analytics | /tools/endocrine/metabolic-analytics | metabolic-analytics | metabolic-analytics | fleet-logistics, research-education | Yes | draft | Complete (seed template) | — |
| Metabolic Syndrome Assistant | /tools/endocrine/metabolic-syndrome-assistant | metabolic-syndrome-assistant | metabolic-syndrome-assistant | ai-workflow-pack, core-platform, cardiology-pack, fleet-logistics | Yes | draft | Complete (seed template) | — |
| MEWS | /tools/calculators/mews | mews | mews | cardiology-pack | Yes | draft | Complete (seed template) | — |
| MMSE | /tools/calculators/mmse | mmse | mmse | core-platform | Yes | draft | Complete (seed template) | — |
| MoCA Placeholder Workflow | /tools/calculators/moca-placeholder-workflow | moca-placeholder-workflow | moca-placeholder-workflow | ai-workflow-pack, core-platform, simulation-training-pack | Yes | draft | Complete (seed template) | — |
| Model Access Policy | /governance/ai-security/model-access | model-access-policy | model-access-policy | ai-workflow-pack, core-platform, governance-compliance-pack | Yes | beta | Complete (seed template) | — |
| Model Usage Dashboard | /governance/model-usage | model-usage-dashboard | model-usage-dashboard | governance-compliance-pack | Yes | beta | Complete (seed template) | — |
| Modified Rankin Scale | /tools/calculators/modified-rankin-scale | modified-rankin-scale | modified-rankin-scale | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| MoE Router | /assistant | moe-router | moe-router | ai-workflow-pack, core-platform, research-education | Yes | draft | Complete (seed template) | — |
| Morse Fall Scale | /tools/calculators/morse-fall-scale | morse-fall-scale | morse-fall-scale | core-platform | Yes | draft | Complete (seed template) | — |
| Neonatal Assessment Assistant | /tools/pediatrics-obgyn/neonatal-assessment-assistant | neonatal-assessment-assistant | neonatal-assessment-assistant | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| Neonatal Bilirubin Risk Helper | /tools/calculators/neonatal-bilirubin-risk-helper | neonatal-bilirubin-risk-helper | neonatal-bilirubin-risk-helper | core-platform | Yes | draft | Complete (seed template) | — |
| Neonatal Dashboard | /tools/pediatrics-obgyn/neonatal-dashboard | neonatal-dashboard | neonatal-dashboard | core-platform | Yes | draft | Complete (seed template) | — |
| Neuro Exam Assistant | /tools/neurology/neuro-exam-assistant | neuro-exam-assistant | neuro-exam-assistant | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| Neuro Monitoring Engine | /tools/neurology/neuro-monitoring-engine | neuro-monitoring-engine | neuro-monitoring-engine | core-platform | Yes | draft | Complete (seed template) | — |
| Neuro Telemetry Dashboard | /tools/neurology/neuro-telemetry-dashboard | neuro-telemetry-dashboard | neuro-telemetry-dashboard | emergency-medicine, emergency-department-pack, medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Neurology Timeline AI | /tools/neurology/neurology-timeline-ai | neurology-timeline-ai | neurology-timeline-ai | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| NEWS2 | /tools/calculators/news2 | news2 | news2 | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| NEXUS C-Spine Rule | /tools/calculators | nexus-cspine | nexus-cspine | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| NIH Stroke Scale (NIHSS) | /tools/calculators | nihss | nihss | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| NIHSS Summary View | /tools/calculators/nihss-summary-view | nihss-summary-view | nihss-summary-view | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| OB Triage Assistant | /tools/pediatrics-obgyn/ob-triage-assistant | ob-triage-assistant | ob-triage-assistant | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Observation And Vitals Import | /patients/:patientId/observations/import | observation-vitals-import | observation-vitals-import | medical-iot-pack, hospital-operations, digital-twin-pack | Yes | beta | Complete (seed template) | — |
| Operations Hub | /operations | digital-operations-center | digital-operations-center | hospital-operations, digital-twin-pack, medical-iot-pack, fleet-logistics | Yes | draft | Complete (seed template) | — |
| Operations Incident Center | /operations/incidents | operations-incident-center | operations-incident-center | hospital-operations, digital-twin-pack | Yes | active | Complete (seed template) | — |
| Osmolal Gap | /tools/calculators/osmolal-gap | osmolal-gap | osmolal-gap | core-platform | Yes | draft | Complete (seed template) | — |
| Ottawa Ankle Rule | /tools/calculators | ottawa-ankle | ottawa-ankle | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Oxygen Escalation Helper | /tools/pulmonology/oxygen-escalation-helper | oxygen-escalation-helper | oxygen-escalation-helper | medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Pancreatitis Workflow Assistant | /tools/gastroenterology/pancreatitis-workflow-assistant | pancreatitis-workflow-assistant | pancreatitis-workflow-assistant | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| PaO2/FiO2 Ratio | /tools/calculators/pao2-fio2-ratio | pao2-fio2-ratio | pao2-fio2-ratio | core-platform | Yes | draft | Complete (seed template) | — |
| Patient Summary AI | /tools/patient-summary-ai | patient-summary-ai | patient-summary-ai | ai-workflow-pack, core-platform, laboratory-intelligence | Yes | active | Complete (seed template) | — |
| Patient Timeline AI | /tools/timeline-ai | timeline-ai | timeline-ai | ai-workflow-pack, core-platform | Yes | active | Complete (seed template) | — |
| Patient Workspace | /patients/:patientId/workspace | patient-workspace | patient-workspace | core-platform | Yes | beta | Complete (seed template) | — |
| PCL-5 | /tools/calculators/pcl5 | pcl5 | pcl5 | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| PECARN Head Injury Rule | /tools/calculators | pecarn-head | pecarn-head | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Pediatric BP Percentile | /tools/calculators/pediatric-bp-percentile | pediatric-bp-percentile | pediatric-bp-percentile | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Pediatric Code Simulation Plugin | /simulation | plugin-pediatric-code-simulation | plugin-pediatric-code-simulation | ai-workflow-pack, core-platform, simulation-training-pack | Yes | beta | Complete (seed template) | — |
| Pediatric Command Center | /tools/pediatrics-obgyn/pediatric-command-center | pediatric-command-center | pediatric-command-center | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Pediatric Dose Safety Checker | /tools/calculators/pediatric-dose-safety-checker | pediatric-dose-safety-checker | pediatric-dose-safety-checker | emergency-medicine, emergency-department-pack, laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Pediatric GCS | /tools/calculators/pediatric-gcs | pediatric-gcs | pediatric-gcs | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Pediatric Sepsis Assistant | /tools/pediatrics-obgyn/pediatric-sepsis-assistant | pediatric-sepsis-assistant | pediatric-sepsis-assistant | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack, laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| PERC | /tools/calculators | perc | perc | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Perinatal Risk Dashboard | /tools/pediatrics-obgyn/perinatal-risk-dashboard | perinatal-risk-dashboard | perinatal-risk-dashboard | core-platform | Yes | draft | Complete (seed template) | — |
| PEWS | /tools/calculators/pews | pews | pews | cardiology-pack | Yes | draft | Complete (seed template) | — |
| PHQ-9 | /tools/calculators/phq9 | phq9 | phq9 | ai-workflow-pack, core-platform, laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Pneumonia Severity Index | /tools/calculators/pneumonia-severity-index | pneumonia-severity-index | pneumonia-severity-index | laboratory-intelligence, medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Population Screening Dashboard | /tools/psychiatry/population-screening-dashboard | population-screening-dashboard | population-screening-dashboard | core-platform | Yes | draft | Complete (seed template) | — |
| Predictive Analytics Dashboard | /predictive-analytics | predictive-analytics-dashboard | predictive-analytics-dashboard | ai-workflow-pack, hospital-operations, core-platform, emergency-medicine, emergency-department-pack, icu-pack, medical-iot-pack, fleet-logistics, digital-twin-pack, research-education | Yes | draft | Complete (seed template) | — |
| Predictive Maintenance Engine | /fleet/predictive-maintenance | predictive-maintenance | predictive-maintenance | fleet-logistics, medical-iot-pack, ai-workflow-pack, core-platform, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Pregnancy Due Date Calculator | /tools/calculators/pregnancy-due-date-calculator | pregnancy-due-date-calculator | pregnancy-due-date-calculator | core-platform | Yes | draft | Complete (seed template) | — |
| Pregnancy Workflow Assistant | /tools/pediatrics-obgyn/pregnancy-workflow-assistant | pregnancy-workflow-assistant | pregnancy-workflow-assistant | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| Prior Authorization AI | /tools/prior-auth-ai | prior-auth-ai | prior-auth-ai | ai-workflow-pack, core-platform, research-education | Yes | beta | Complete (seed template) | — |
| Privacy Center | /governance/privacy | privacy-center | privacy-center | governance-compliance-pack | Yes | beta | Complete (seed template) | — |
| Procedure Guide | /tools/procedures | procedures | procedures | ai-workflow-pack, core-platform, simulation-training-pack | Yes | draft | Complete (seed template) | — |
| Prompt Firewall | /governance/ai-security/prompt-firewall | prompt-firewall | prompt-firewall | ai-workflow-pack, core-platform, governance-compliance-pack | Yes | beta | Complete (seed template) | — |
| Protocol and Clinical Pathway Library | /protocols | protocols | protocols | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack, cardiology-pack, simulation-training-pack, research-education | Yes | draft | Complete (seed template) | — |
| Psychiatry Monitoring Dashboard | /tools/psychiatry/psychiatry-monitoring-dashboard | psychiatry-monitoring-dashboard | psychiatry-monitoring-dashboard | core-platform | Yes | draft | Complete (seed template) | — |
| Pulmonary Trend Engine | /tools/pulmonology/pulmonary-trend-engine | pulmonary-trend-engine | pulmonary-trend-engine | core-platform | Yes | draft | Complete (seed template) | — |
| qSOFA (quick SOFA) | /tools/calculators/qsofa | qsofa | qsofa | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| RAG Evidence Engine | /tools/guideline-rag | ai-rag | ai-rag | ai-workflow-pack, core-platform, research-education | Yes | draft | Complete (seed template) | — |
| Ranson criteria | /tools/calculators/ranson-criteria | ranson-criteria | ranson-criteria | core-platform | Yes | draft | Complete (seed template) | — |
| RASS | /tools/calculators/rass | rass | rass | core-platform | Yes | draft | Complete (seed template) | — |
| Referral AI | /tools/referral-ai | referral-ai | referral-ai | ai-workflow-pack, core-platform | Yes | beta | Complete (seed template) | — |
| Regulatory Classification | /governance/regulatory | regulatory-classification | regulatory-classification | governance-compliance-pack, research-education | Yes | beta | Complete (seed template) | — |
| Remote Cardiology Monitoring Dashboard | /tools/cardiology/remote-cardiology-monitoring-dashboard | remote-cardiology-monitoring-dashboard | remote-cardiology-monitoring-dashboard | cardiology-pack, medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Renal Monitoring Dashboard | /tools/nephrology/renal-monitoring-dashboard | renal-monitoring-dashboard | renal-monitoring-dashboard | core-platform | Yes | draft | Complete (seed template) | — |
| Research and Evidence Hub | /research | research-evidence-hub | research-evidence-hub | research-education, ai-workflow-pack, core-platform, simulation-training-pack | Yes | draft | Complete (seed template) | — |
| Resource Allocation Assistant | /tools/calculators | resource-allocation-assistant | resource-allocation-assistant | ai-workflow-pack, core-platform, medical-iot-pack, fleet-logistics, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Resource Utilization Index | /tools/calculators/resource-utilization-index | resource-utilization-index | resource-utilization-index | medical-iot-pack, fleet-logistics, hospital-operations, digital-twin-pack, research-education | Yes | draft | Complete (seed template) | — |
| Respiratory Command Center | /tools/pulmonology/respiratory-command-center | respiratory-command-center | respiratory-command-center | hospital-operations, digital-twin-pack, research-education | Yes | draft | Complete (seed template) | — |
| Respiratory Telemetry Dashboard | /tools/pulmonology/respiratory-telemetry-dashboard | respiratory-telemetry-dashboard | respiratory-telemetry-dashboard | medical-iot-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Revised Trauma Score | /tools/calculators/revised-trauma-score | revised-trauma-score | revised-trauma-score | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Reynolds Risk Score Helper | /tools/calculators/reynolds-risk-score | reynolds-risk-score | reynolds-risk-score | cardiology-pack | Yes | draft | Complete (seed template) | — |
| Risk Score History | /patients/:patientId/risk-history | risk-score-history | risk-score-history | core-platform | Yes | beta | Complete (seed template) | — |
| Rockall Score | /tools/calculators/rockall-score | rockall-score | rockall-score | core-platform | Yes | draft | Complete (seed template) | — |
| Rome IV IBS | /tools/calculators | rome-iv-ibs | rome-iv-ibs | core-platform | Yes | draft | Complete (seed template) | — |
| Route Optimization Engine | /fleet/route-optimizer | route-optimizer | route-optimizer | fleet-logistics, cardiology-pack, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| ROX Index | /tools/calculators/rox-index | rox-index | rox-index | icu-pack | Yes | draft | Complete (seed template) | — |
| Screening Trend Engine | /tools/psychiatry/screening-trend-engine | screening-trend-engine | screening-trend-engine | core-platform | Yes | draft | Complete (seed template) | — |
| Seizure Assistant | /tools/neurology/seizure-assistant | seizure-assistant | seizure-assistant | ai-workflow-pack, core-platform, laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Serum Osmolality | /tools/calculators/serum-osmolality | serum-osmolality | serum-osmolality | core-platform | Yes | draft | Complete (seed template) | — |
| Shock Index | /tools/calculators/shock-index | shock-index | shock-index | emergency-medicine, emergency-department-pack, cardiology-pack | Yes | draft | Complete (seed template) | — |
| Simulation Competency Dashboard | /simulation/outcomes | competency-dashboard | competency-dashboard | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack, laboratory-intelligence, hospital-operations, digital-twin-pack, simulation-training-pack, research-education | Yes | draft | Complete (seed template) | — |
| Simulation Debrief Dashboard | /simulation/sepsis-deterioration | debrief-dashboard | debrief-dashboard | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack, simulation-training-pack, research-education | Yes | draft | Complete (seed template) | — |
| Simulation Outcomes | /simulation/outcomes | simulation-outcomes | simulation-outcomes | simulation-training-pack, ai-workflow-pack, core-platform, research-education | Yes | draft | Complete (seed template) | — |
| Simulation Scenario Player | /simulation/sepsis-deterioration | scenario-player | scenario-player | simulation-training-pack, ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Sleep Apnea Analytics | /tools/pulmonology/sleep-apnea-analytics | sleep-apnea-analytics | sleep-apnea-analytics | research-education | Yes | draft | Complete (seed template) | — |
| SOAP Builder | /tools/soap-builder | soap-builder | soap-builder | core-platform | Yes | beta | Complete (seed template) | — |
| SOFA Score | /tools/calculators/sofa | sofa-score | sofa-score | emergency-medicine, emergency-department-pack, cardiology-pack | Yes | active | Complete (seed template) | — |
| Source Provenance | /integrations/source-provenance | source-provenance | source-provenance | core-platform | Yes | beta | Complete (seed template) | — |
| Staffing Ratio Calculator | /tools/calculators/staffing-ratio-calculator | staffing-ratio-calculator | staffing-ratio-calculator | hospital-operations, digital-twin-pack, research-education | Yes | draft | Complete (seed template) | — |
| STEMI Pathway Assistant | /tools/cardiology/stemi-pathway-assistant | stemi-pathway-assistant | stemi-pathway-assistant | ai-workflow-pack, core-platform, cardiology-pack | Yes | draft | Complete (seed template) | — |
| STOP-Bang | /tools/calculators/stop-bang | stop-bang | stop-bang | core-platform | Yes | draft | Complete (seed template) | — |
| Stroke Command Center | /tools/neurology/stroke-command-center | stroke-command-center | stroke-command-center | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Stroke Workflow Assistant | /tools/neurology/stroke-workflow-assistant | stroke-workflow-assistant | stroke-workflow-assistant | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Substance Use Screening Assistant | /tools/psychiatry/substance-use-screening-assistant | substance-use-screening-assistant | substance-use-screening-assistant | ai-workflow-pack, core-platform, laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Suicide Risk Workflow Assistant | /tools/psychiatry/suicide-risk-workflow-assistant | suicide-risk-workflow-assistant | suicide-risk-workflow-assistant | ai-workflow-pack, core-platform | Yes | draft | Complete (seed template) | — |
| Synthetic Patient Lab | /governance/validation/synthetic-patients | synthetic-patient-lab | synthetic-patient-lab | laboratory-intelligence, governance-compliance-pack | Yes | beta | Complete (seed template) | — |
| Telemetry Monitoring Center | /medical-iot | telemetry-monitoring | telemetry-monitoring | medical-iot-pack, hospital-operations, digital-twin-pack | Yes | beta | Complete (seed template) | — |
| Thyroid Disorder Assistant | /tools/endocrine/thyroid-disorder-assistant | thyroid-disorder-assistant | thyroid-disorder-assistant | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack, laboratory-intelligence | Yes | draft | Complete (seed template) | — |
| Timeline Live | /patients/:patientId/timeline | timeline-live | timeline-live | ai-workflow-pack, core-platform | Yes | beta | Complete (seed template) | — |
| TIMI (UA/NSTEMI) | /tools/calculators/timi-ua-nstemi | timi-ua-nstemi | timi-ua-nstemi | cardiology-pack | Yes | draft | Complete (seed template) | — |
| Turnaround Time Calculator | /tools/calculators/turnaround-time-calculator | turnaround-time-calculator | turnaround-time-calculator | medical-iot-pack, fleet-logistics, hospital-operations, digital-twin-pack | Yes | draft | Complete (seed template) | — |
| Validation Sandbox | /governance/validation | validation-sandbox | validation-sandbox | ai-workflow-pack, core-platform, simulation-training-pack, governance-compliance-pack | Yes | beta | Complete (seed template) | — |
| Ventilator Monitoring Dashboard | /tools/pulmonology/ventilator-monitoring-dashboard | ventilator-monitoring-dashboard | ventilator-monitoring-dashboard | icu-pack | Yes | draft | Complete (seed template) | — |
| Ventilator Support Assistant | /tools/pulmonology/ventilator-support-assistant | ventilator-support-assistant | ventilator-support-assistant | ai-workflow-pack, core-platform, icu-pack | Yes | draft | Complete (seed template) | — |
| Vertigo HINTS Assistant | /tools/neurology/vertigo-hints-assistant | vertigo-hints-assistant | vertigo-hints-assistant | ai-workflow-pack, core-platform, emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Waist-to-Hip Ratio | /tools/calculators/waist-hip-ratio | waist-hip-ratio | waist-hip-ratio | ai-workflow-pack, core-platform, cardiology-pack | Yes | draft | Complete (seed template) | — |
| Wells DVT | /tools/calculators | wells-dvt-calculator | wells-dvt-calculator | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Wells PE | /tools/calculators | wells-pe | wells-pe | emergency-medicine, emergency-department-pack | Yes | draft | Complete (seed template) | — |
| Why Engine | /tools/why-engine | why-engine | why-engine | core-platform | Yes | beta | Complete (seed template) | — |
| Workflow Builder AI | /tools/workflow-builder-ai | workflow-builder-ai | workflow-builder-ai | ai-workflow-pack, core-platform | Yes | beta | Complete (seed template) | — |
| Command Whiteboard | /dashboard | dashboard | dashboard | core-platform | No | active | Complete (seed template) | everything-is-asset |
| Digital Twin | /digital-twin | digital-twin | digital-twin | hospital-operations, digital-twin-pack | No | active | Complete (seed template) | everything-is-asset |
| Workflow Builder | /workflows | workflows | workflows | core-platform | No | active | Complete (seed template) | everything-is-asset; role-assignable |

## Appendix: Evidence sources

| Source | Role in audit |
|--------|----------------|
| `backend/src/modules/platform-assets/data/platform-asset-seed.data.ts` | Pack membership, role profiles, legacy workspace aliases |
| `backend/src/modules/platform-assets/entities/platform-asset.entity.ts` | Asset schema (governance, lifecycle, packIds) |
| `backend/src/modules/platform-assets/platform-assets.seed.service.ts` | Governance template applied on seed |
| `src/data/toolInventory.js` | Canonical tool registry and lifecycleState |
| `src/data/profileToolSegmentation.ts` | Role visibility heuristics |
| `src/data/assetInventory.ts` | Mounted frontend asset projection with pack/product/workspace/role/execution/governance metadata |
| `docs/feature-coverage-matrix.md` | Related coverage audit |

