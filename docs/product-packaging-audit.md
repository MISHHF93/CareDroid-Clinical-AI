# Product Packaging Audit

Generated: 2026-06-05 (regenerate with `npm run product-packaging-audit:write-docs`)

## Productization model

CareDroid productization uses four packaging dimensions for every **seeded platform asset**:

| Dimension | Canonical source | Purpose |
|-----------|------------------|---------|
| **Solution pack** | `asset_packs` / `SEED_ASSET_PACKS` | Sellable entitlement bundle (install per org) |
| **Specialty pack** | `specialty_catalog` / `SEED_SPECIALTIES` | Specialty marketplace and discovery filters |
| **Role pack** | `role_profiles` + pack `targetRoles` | Role profile preferred assets and pack role targeting |
| **Organization type** | `asset_packs.organizationTypes` | Which tenant segments may install the pack |

Commercial **products** (`product-catalog`) map 1:1 to solution pack ids for the nine hospital suites below.

## Executive summary

| Metric | Count |
|--------|------:|
| Seeded platform assets | 68 |
| Fully packaged (all four dimensions) | 68 |
| Packaging violations (seeded assets) | 0 |
| Missing specialty mapping | 0 |
| Missing role mapping | 0 |
| User-facing registry tools not seeded as assets | 245 |
| Nine solution packs present in seed | 9/9 |

### Strategy verdict

**PASS (seed catalog):** All seeded platform assets have solution pack, specialty, role, and organization-type coverage.

**Inventory gap:** 245 user-facing tools exist only in `toolInventory.js` and are not yet productized into `platform_assets`.

## Nine solution packs (generated catalog)

| Marketing name | Pack ID | Product slug | Assets in pack | Linked in product |
|---------------|---------|--------------|---------------:|-------------------|
| Emergency Department Pack | `emergency-department-pack` | `emergency-department-suite` | 19 | Yes |
| ICU Pack | `icu-pack` | `icu-suite` | 6 | Yes |
| Cardiology Pack | `cardiology-pack` | `cardiology-suite` | 4 | Yes |
| Laboratory Pack | `laboratory-intelligence` | `laboratory-suite` | 5 | Yes |
| Medical IoT Pack | `medical-iot-pack` | `medical-iot-suite` | 4 | Yes |
| Digital Twin Pack | `digital-twin-pack` | `digital-twin-suite` | 4 | Yes |
| Simulation Pack | `simulation-training-pack` | `simulation-training-suite` | 3 | Yes |
| Governance Pack | `governance-compliance-pack` | `governance-compliance-suite` | 4 | Yes |
| Research Pack | `research-education` | `research-suite` | 5 | Yes |

Supporting packs (also seeded): `core-platform`, `emergency-medicine`, `hospital-operations`, `fleet-logistics`, `ai-workflow-pack`.

## Canonical sources (recommended)

| Concern | Canonical | Consumers |
|---------|-----------|-----------|
| Solution pack definitions | `backend/.../platform-asset-seed.data.ts` → `SEED_ASSET_PACKS` | DB seed, entitlements, marketplace |
| Platform asset rows | `SEED_PLATFORM_ASSETS` (derived from packs) | `platform_assets` table |
| Sellable products | `backend/.../product-catalog-seed.data.ts` → `SEED_PRODUCTS` | `/api/products`, commercial UI |
| Specialty packs | `SEED_SPECIALTIES` | `/api/specialties`, specialty pages |
| Role packs | `SEED_ROLE_PROFILES` + pack `targetRoles` | `/api/platform/me/role-profile`, recommendations |
| Org-type defaults | `DEFAULT_PACKS_BY_ORGANIZATION_TYPE` | Org onboarding, default entitlements |
| SPA tool launch (pre-asset) | `src/data/toolInventory.js` | Routes, calculators, sidebar |

## Packaging violations (seeded assets)

_None — all seeded assets satisfy four dimensions._

## Full seeded asset matrix

| Asset ID | Solution pack(s) | Specialty pack(s) | Role pack(s) | Organization type(s) | Status |
| --- | --- | --- | --- | --- | --- |
| abg-interpreter | laboratory-intelligence | laboratory | pharmacist | hospital, clinic, academic_medical_center, health_system | OK |
| acls-protocol | emergency-medicine, emergency-department-pack | emergency | pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, academic_medical_center, health_system | OK |
| agent-clinical | core-platform, ai-workflow-pack | platform, emergency, icu, cardiology | pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student; pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist; role:ai-agent-default | all organization types | OK |
| agent-education | core-platform, ai-workflow-pack | research | pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student; pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist; role:ai-agent-default | all organization types | OK |
| agent-emergency | core-platform, ai-workflow-pack | emergency | pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student; pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist; role:ai-agent-default | all organization types | OK |
| agent-fleet | core-platform, ai-workflow-pack | operations | pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student; pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist; role:ai-agent-default | all organization types | OK |
| agent-governance | core-platform, ai-workflow-pack | platform | pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student; pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist; role:ai-agent-default | all organization types | OK |
| agent-lab | core-platform, ai-workflow-pack | laboratory | pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student; pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist; role:ai-agent-default | all organization types | OK |
| agent-operations | core-platform, ai-workflow-pack | platform, operations | pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student; pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist; role:ai-agent-default | all organization types | OK |
| agent-research | core-platform, ai-workflow-pack | research | pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student; pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist; role:ai-agent-default | all organization types | OK |
| ai-explainability | research-education, governance-compliance-pack | research | administrator; researcher; pack:research-education→researcher; pack:research-education→medical student; pack:governance-compliance-pack→administrator | all organization types | OK |
| ambient-scribe | ai-workflow-pack | platform | pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist | hospital, academic_medical_center | OK |
| apache2-calculator | emergency-medicine, emergency-department-pack, icu-pack | emergency, icu | pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:icu-pack→ICU clinician; pack:icu-pack→nurse | hospital, ems, academic_medical_center, health_system | OK |
| asset-tracking-dashboard | hospital-operations, digital-twin-pack | operations | pack:digital-twin-pack→administrator; pack:digital-twin-pack→biomedical engineer | hospital, health_system, academic_medical_center | OK |
| assistant | core-platform | platform | medical-student; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student | all organization types | OK |
| atls-protocol | emergency-medicine, emergency-department-pack | emergency | pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, academic_medical_center, health_system | OK |
| audit-logs | governance-compliance-pack | platform | administrator; pack:governance-compliance-pack→administrator | all organization types | OK |
| calculator-recommender-ai | laboratory-intelligence | laboratory | pharmacist | hospital, clinic, academic_medical_center, health_system | OK |
| calculators | core-platform | platform, emergency, pediatrics, surgery | medical-student; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student | all organization types | OK |
| calculators-hub | core-platform | platform | medical-student; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student | all organization types | OK |
| cardiology-command-center | cardiology-pack | cardiology | pack:cardiology-pack→cardiologist; pack:cardiology-pack→hospitalist | hospital, clinic | OK |
| clinical-audit | laboratory-intelligence, governance-compliance-pack | platform, laboratory | pack:governance-compliance-pack→administrator | all organization types | OK |
| clinical-documentation-assistant | ai-workflow-pack | platform, oncology | pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist | hospital, academic_medical_center | OK |
| competencies | simulation-training-pack | research | pack:simulation-training-pack→medical student; pack:simulation-training-pack→researcher | university, hospital | OK |
| curb65-calculator | emergency-medicine, emergency-department-pack | emergency | pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, academic_medical_center, health_system | OK |
| dashboard | core-platform | platform | administrator; medical-student; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student | all organization types | OK |
| device-fleet-management | hospital-operations, medical-iot-pack | operations | pack:medical-iot-pack→biomedical engineer; pack:medical-iot-pack→administrator | hospital, health_system, academic_medical_center | OK |
| device-maintenance | hospital-operations, medical-iot-pack | operations | pack:medical-iot-pack→biomedical engineer; pack:medical-iot-pack→administrator | hospital, health_system, academic_medical_center | OK |
| differential-ai | research-education, ai-workflow-pack | platform, neurology, pediatrics, oncology, research | pack:research-education→researcher; pack:research-education→medical student; pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist | university, research_institute, academic_medical_center, hospital | OK |
| digital-operations-center | hospital-operations, digital-twin-pack | operations | pack:digital-twin-pack→administrator; pack:digital-twin-pack→biomedical engineer | hospital, health_system, academic_medical_center | OK |
| digital-twin | hospital-operations, digital-twin-pack | operations | administrator; pack:digital-twin-pack→administrator; pack:digital-twin-pack→biomedical engineer | hospital, health_system, academic_medical_center | OK |
| dispatch-ai | fleet-logistics | operations | fleet-operator | ems, hospital, health_system | OK |
| drug-check | core-platform | platform, emergency | nurse; pharmacist; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student | all organization types | OK |
| ecg-interpretation-assistant | cardiology-pack | cardiology | pack:cardiology-pack→cardiologist; pack:cardiology-pack→hospitalist | hospital, clinic | OK |
| emergency-protocols | emergency-medicine, emergency-department-pack | emergency | pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, academic_medical_center, health_system | OK |
| fleet-dashboard | hospital-operations, fleet-logistics | operations | fleet-operator | hospital, health_system, academic_medical_center, ems | OK |
| fleet-live-map | hospital-operations, fleet-logistics | operations | fleet-operator | hospital, health_system, academic_medical_center, ems | OK |
| gcs-calculator | emergency-medicine, emergency-department-pack | emergency | emergency-physician; nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, academic_medical_center, health_system | OK |
| guideline-rag | research-education | research | researcher; pack:research-education→researcher; pack:research-education→medical student | university, research_institute, academic_medical_center | OK |
| heart-score | emergency-medicine, emergency-department-pack, cardiology-pack | emergency, cardiology | emergency-physician; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:cardiology-pack→cardiologist; pack:cardiology-pack→hospitalist | hospital, ems, academic_medical_center, health_system, clinic | OK |
| hospital-map | emergency-medicine, hospital-operations, emergency-department-pack, digital-twin-pack | emergency, operations | pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:digital-twin-pack→administrator; pack:digital-twin-pack→biomedical engineer | hospital, ems, academic_medical_center, health_system | OK |
| hospital-operations-command | hospital-operations | operations | fleet-operator; administrator | hospital, health_system, academic_medical_center | OK |
| incident-command-center | hospital-operations | operations | fleet-operator; administrator | hospital, health_system, academic_medical_center | OK |
| lab-interp | core-platform, laboratory-intelligence, icu-pack | icu, laboratory | nurse; pharmacist; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student; pack:icu-pack→ICU clinician; pack:icu-pack→nurse | all organization types | OK |
| laboratory | laboratory-intelligence | laboratory | pharmacist | hospital, clinic, academic_medical_center, health_system | OK |
| live-map | hospital-operations | operations | fleet-operator; administrator | hospital, health_system, academic_medical_center | OK |
| medical-iot | medical-iot-pack | operations | administrator; pack:medical-iot-pack→biomedical engineer; pack:medical-iot-pack→administrator | hospital, health_system | OK |
| mews | emergency-medicine, emergency-department-pack, icu-pack | emergency, icu | nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:icu-pack→ICU clinician; pack:icu-pack→nurse | hospital, ems, academic_medical_center, health_system | OK |
| news2 | emergency-medicine, emergency-department-pack, icu-pack | emergency, icu | emergency-physician; nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:icu-pack→ICU clinician; pack:icu-pack→nurse | hospital, ems, academic_medical_center, health_system | OK |
| nihss | emergency-medicine, emergency-department-pack | emergency | emergency-physician; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, academic_medical_center, health_system | OK |
| order-set-ai | ai-workflow-pack | platform, surgery | pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist | hospital, academic_medical_center | OK |
| patient-summary-ai | ai-workflow-pack | platform | pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist | hospital, academic_medical_center | OK |
| pews | emergency-medicine, emergency-department-pack | emergency | pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, academic_medical_center, health_system | OK |
| predictive-maintenance | hospital-operations, fleet-logistics | operations | fleet-operator | hospital, health_system, academic_medical_center, ems | OK |
| protocols | core-platform, emergency-medicine, emergency-department-pack, icu-pack | platform, emergency, icu, neurology, pediatrics, oncology, surgery | emergency-physician; nurse; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:icu-pack→ICU clinician; pack:icu-pack→nurse | all organization types | OK |
| qsofa | emergency-medicine, emergency-department-pack | emergency | emergency-physician; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, academic_medical_center, health_system | OK |
| research-evidence-hub | research-education | research | researcher; pack:research-education→researcher; pack:research-education→medical student | university, research_institute, academic_medical_center | OK |
| revised-trauma-score | emergency-medicine, emergency-department-pack | emergency | emergency-physician; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, academic_medical_center, health_system | OK |
| route-optimizer | hospital-operations, fleet-logistics | operations | fleet-operator | hospital, health_system, academic_medical_center, ems | OK |
| scenario-player | emergency-medicine, emergency-department-pack, simulation-training-pack | emergency | pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:simulation-training-pack→medical student; pack:simulation-training-pack→researcher | hospital, ems, academic_medical_center, health_system, university | OK |
| search | core-platform | platform | administrator; medical-student; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student | all organization types | OK |
| simulation-suite | emergency-medicine, research-education, emergency-department-pack, simulation-training-pack | emergency, research | emergency-physician; medical-student; pack:research-education→researcher; pack:research-education→medical student; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:simulation-training-pack→medical student; pack:simulation-training-pack→researcher | hospital, ems, academic_medical_center, health_system, university, research_institute | OK |
| sofa-calculator | emergency-medicine, emergency-department-pack | emergency, icu | pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, academic_medical_center, health_system | OK |
| sofa-score | emergency-medicine, emergency-department-pack, icu-pack | emergency, icu | emergency-physician; nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:icu-pack→ICU clinician; pack:icu-pack→nurse | hospital, ems, academic_medical_center, health_system | OK |
| stemi-pathway-assistant | cardiology-pack | cardiology | pack:cardiology-pack→cardiologist; pack:cardiology-pack→hospitalist | hospital, clinic | OK |
| system-config | governance-compliance-pack | platform | administrator; pack:governance-compliance-pack→administrator | all organization types | OK |
| telemetry-monitoring | hospital-operations, medical-iot-pack | operations | administrator; pack:medical-iot-pack→biomedical engineer; pack:medical-iot-pack→administrator | hospital, health_system, academic_medical_center | OK |
| timeline-ai | ai-workflow-pack | platform | pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist | hospital, academic_medical_center | OK |

## Registry tools not productized (sample)

Total: 245 user-facing tools without a `platform_assets` row.

- **A-a Gradient** (`aa-gradient`) — /tools/calculators/aa-gradient
- **ABCD² score** (`abcd2`) — /tools/calculators/abcd2
- **ACS Workflow Assistant** (`acs-workflow-assistant`) — /tools/cardiology/acs-workflow-assistant
- **Adjusted Body Weight** (`adjusted-body-weight`) — /tools/calculators/adjusted-body-weight
- **AKI Staging Assistant** (`aki-staging-assistant`) — /tools/nephrology/aki-staging-assistant
- **Anion Gap** (`anion-gap`) — /tools/calculators/anion-gap
- **Apgar score** (`apgar-score`) — /tools/calculators/apgar-score
- **APRI** (`apri`) — /tools/calculators/apri
- **ASCVD 10-year risk** (`ascvd-risk`) — /tools/calculators/ascvd-risk
- **Asthma Exacerbation Assistant** (`asthma-exacerbation-assistant`) — /tools/pulmonology/asthma-exacerbation-assistant
- **Asthma Severity Score** (`asthma-severity-score`) — /tools/calculators/asthma-severity-score
- **Atrial Fibrillation Assistant** (`atrial-fibrillation-assistant`) — /tools/cardiology/atrial-fibrillation-assistant
- **AUDIT-C** (`audit-c`) — /tools/calculators/audit-c
- **Bed Occupancy Calculator** (`bed-occupancy-calculator`) — /tools/calculators/bed-occupancy-calculator
- **BISAP score** (`bisap-score`) — /tools/calculators/bisap-score
- **Bishop score** (`bishop-score`) — /tools/calculators/bishop-score
- **BMI** (`calc-bmi`) — /tools/calculators/bmi
- **BODE Index** (`bode-index`) — /tools/calculators/bode-index
- **Body Surface Area** (`bsa`) — /tools/calculators/bsa
- **Braden scale** (`braden-scale`) — /tools/calculators/braden-scale
- **BUN/Creatinine Ratio** (`bun-creatinine-ratio`) — /tools/calculators/bun-creatinine-ratio
- **CAGE** (`cage`) — /tools/calculators/cage
- **Canadian C-Spine Rule** (`canadian-c-spine`) — /tools/calculators
- **Centor / McIsaac** (`centor-mcisaac`) — /tools/calculators/centor-mcisaac
- **CHA₂DS₂-VASc** (`calc-chads2vasc`) — /tools/calculators/chads2vasc
- **CHADS2** (`chads2`) — /tools/calculators/chads2
- **Child-Pugh** (`child-pugh`) — /tools/calculators/child-pugh
- **CKD staging (KDIGO)** (`ckd-staging`) — /tools/calculators/ckd-staging
- **Cognitive Screening Assistant** (`cognitive-screening-assistant`) — /tools/psychiatry/cognitive-screening-assistant
- **Columbia Suicide Severity Workflow** (`columbia-suicide-severity-workflow`) — /tools/calculators/columbia-suicide-severity-workflow
- **COPD GOLD** (`copd-gold`) — /tools/calculators
- **COPD GOLD Assessment** (`copd-gold-assessment`) — /tools/calculators/copd-gold-assessment
- **COPD Workflow Assistant** (`copd-workflow-assistant`) — /tools/pulmonology/copd-workflow-assistant
- **Corrected Calcium** (`corrected-calcium`) — /tools/calculators/corrected-calcium
- **Corrected Sodium** (`corrected-sodium`) — /tools/calculators/corrected-sodium
- **Creatinine Clearance (Cockcroft-Gault)** (`creatinine-clearance-cg`) — /tools/calculators/creatinine-clearance-cg
- **Diabetes Care Assistant** (`diabetes-care-assistant`) — /tools/endocrine/diabetes-care-assistant
- **DKA Pathway Assistant** (`dka-pathway-assistant`) — /tools/endocrine/dka-pathway-assistant
- **Duke Treadmill Score** (`duke-treadmill-score`) — /tools/calculators/duke-treadmill-score
- **eGFR (CKD-EPI)** (`calc-gfr`) — /tools/calculators/gfr
- **eGFR CKD-EPI 2021** (`egfr-ckd-epi`) — /tools/calculators/egfr-ckd-epi
- **Electrolyte Disorder Assistant** (`electrolyte-disorder-assistant`) — /tools/nephrology/electrolyte-disorder-assistant
- **Epworth Sleepiness Scale** (`epworth-sleepiness-scale`) — /tools/calculators/epworth-sleepiness-scale
- **FeNa** (`fena`) — /tools/calculators/fena
- **Fenton Growth Chart Helper** (`fenton-growth-chart-helper`) — /tools/calculators/fenton-growth-chart-helper
- **FeUrea** (`feurea`) — /tools/calculators/feurea
- **FIB-4** (`fib4`) — /tools/calculators/fib4
- **Fluid Resuscitation Calculator Plugin** (`plugin-fluid-resuscitation-calculator`) — /tools/catalog
- **FOUR Score** (`four-score`) — /tools/calculators/four-score
- **Framingham CHD risk** (`framingham-risk`) — /tools/calculators/framingham-risk
- … and 195 more

## Remediation playbook

1. **Solution pack** — Add asset id to appropriate `SEED_ASSET_PACKS[].assetIds` (or `core-platform` for universal tools).
2. **Specialty pack** — Add asset id to `SEED_SPECIALTIES[].assetIds` for each relevant specialty slug.
3. **Role pack** — Add to `SEED_ROLE_PROFILES[].preferredAssetIds` and/or pack `targetRoles` for role targeting.
4. **Organization type** — Ensure at least one containing pack lists the tenant segment in `organizationTypes`.
5. **Inventory backlog** — Backfill `platform_assets` from `toolInventory.js` before claiming full SaaS productization.

## Appendix

- Validation service: `ProductCatalogValidationService` (post-seed reference checks)
- Related: [solution-packs.md](./solution-packs.md), [saas-compliance-audit.md](./saas-compliance-audit.md)
- Generator: `src/data/productPackagingAudit.js`

