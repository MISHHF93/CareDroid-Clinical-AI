# Product Packaging Audit

Generated: 2026-08-06 (regenerate with `npm run product-packaging-audit:write-docs`)

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
| Seeded platform assets | 69 |
| Fully packaged (all four dimensions) | 68 |
| Packaging violations (seeded assets) | 1 |
| Missing specialty mapping | 1 |
| Missing role mapping | 0 |
| User-facing registry tools frontend-mounted | 291 |
| Frontend-mounted registry tools awaiting backend seed rows | 245 |
| User-facing registry tools without mounted asset projection | 0 |
| Nine solution packs present in seed | 9/9 |

### Strategy verdict

**PARTIAL:** 1 seeded asset(s) fail one or more packaging dimensions — see violations below.

**Backend seed backlog:** 245 user-facing tools are covered by the frontend mounted asset projection but are not yet direct backend `platform_assets` seed rows.
**Projection coverage:** All user-facing registry tools have mounted asset projection coverage.

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

| Asset ID | Solution packs | Specialty | Role | Org types | Violations |
| --- | --- | --- | --- | --- | --- |
| analytics | reception-desk, trackmind | — | registration-clerk; administrator; pack:reception-desk→registration clerk; pack:reception-desk→receptionist; pack:reception-desk→front desk; pack:trackmind→steward; pack:trackmind→racetrack admin; pack:trackmind→operations manager | hospital, clinic, ems, long_term_care, telehealth, health_system, racetrack | missing-specialty-pack |

### Missing specialty pack

- `analytics` — packs: reception-desk, trackmind

## Full seeded asset matrix

| Asset ID | Solution pack(s) | Specialty pack(s) | Role pack(s) | Organization type(s) | Status |
| --- | --- | --- | --- | --- | --- |
| abg-interpreter | laboratory-intelligence | laboratory | pharmacist | hospital, clinic, academic_medical_center, health_system | OK |
| acls-protocol | emergency-clinical, emergency-medicine, emergency-department-pack | emergency | pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, health_system, academic_medical_center | OK |
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
| analytics | reception-desk, trackmind | — | registration-clerk; administrator; pack:reception-desk→registration clerk; pack:reception-desk→receptionist; pack:reception-desk→front desk; pack:trackmind→steward; pack:trackmind→racetrack admin; pack:trackmind→operations manager | hospital, clinic, ems, long_term_care, telehealth, health_system, racetrack | missing-specialty-pack |
| apache2-calculator | emergency-clinical, emergency-medicine, emergency-department-pack, icu-pack | emergency, icu | pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:icu-pack→ICU clinician; pack:icu-pack→nurse | hospital, ems, health_system, academic_medical_center | OK |
| asset-tracking-dashboard | hospital-operations, digital-twin-pack | operations | pack:digital-twin-pack→administrator; pack:digital-twin-pack→biomedical engineer | hospital, health_system, academic_medical_center | OK |
| assistant | core-platform | platform | medical-student; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student | all organization types | OK |
| atls-protocol | emergency-clinical, emergency-medicine, emergency-department-pack | emergency | pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, health_system, academic_medical_center | OK |
| audit-logs | governance-compliance-pack | platform | administrator; pack:governance-compliance-pack→administrator | all organization types | OK |
| calculator-recommender-ai | laboratory-intelligence | laboratory | pharmacist | hospital, clinic, academic_medical_center, health_system | OK |
| calculators | core-platform, reception-desk | platform, emergency, pediatrics, surgery | registration-clerk; medical-student; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student; pack:reception-desk→registration clerk; pack:reception-desk→receptionist; pack:reception-desk→front desk | all organization types | OK |
| calculators-hub | core-platform, reception-desk | platform | medical-student; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student; pack:reception-desk→registration clerk; pack:reception-desk→receptionist; pack:reception-desk→front desk | all organization types | OK |
| cardiology-command-center | cardiology-pack | cardiology | pack:cardiology-pack→cardiologist; pack:cardiology-pack→hospitalist | hospital, clinic | OK |
| clinical-audit | laboratory-intelligence, governance-compliance-pack | platform, laboratory | pack:governance-compliance-pack→administrator | all organization types | OK |
| clinical-documentation-assistant | ai-workflow-pack | platform, oncology | pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist | hospital, academic_medical_center | OK |
| competencies | simulation-training-pack | research | pack:simulation-training-pack→medical student; pack:simulation-training-pack→researcher | university, hospital | OK |
| curb65-calculator | emergency-clinical, emergency-medicine, emergency-department-pack | emergency | pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, health_system, academic_medical_center | OK |
| dashboard | core-platform | platform | administrator; medical-student; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student | all organization types | OK |
| device-fleet-management | hospital-operations, medical-iot-pack | operations | pack:medical-iot-pack→biomedical engineer; pack:medical-iot-pack→administrator | hospital, health_system, academic_medical_center | OK |
| device-maintenance | hospital-operations, medical-iot-pack | operations | pack:medical-iot-pack→biomedical engineer; pack:medical-iot-pack→administrator | hospital, health_system, academic_medical_center | OK |
| differential-ai | research-education, ai-workflow-pack | platform, neurology, pediatrics, oncology, research | pack:research-education→researcher; pack:research-education→medical student; pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist | university, research_institute, academic_medical_center, hospital | OK |
| digital-operations-center | hospital-operations, digital-twin-pack | operations | pack:digital-twin-pack→administrator; pack:digital-twin-pack→biomedical engineer | hospital, health_system, academic_medical_center | OK |
| digital-twin | hospital-operations, digital-twin-pack | operations | administrator; pack:digital-twin-pack→administrator; pack:digital-twin-pack→biomedical engineer | hospital, health_system, academic_medical_center | OK |
| dispatch-ai | fleet-logistics | operations | fleet-operator | ems, hospital, health_system | OK |
| drug-check | core-platform, reception-desk | platform, emergency | nurse; pharmacist; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student; pack:reception-desk→registration clerk; pack:reception-desk→receptionist; pack:reception-desk→front desk | all organization types | OK |
| ecg-interpretation-assistant | cardiology-pack | cardiology | pack:cardiology-pack→cardiologist; pack:cardiology-pack→hospitalist | hospital, clinic | OK |
| emergency-protocols | emergency-clinical, emergency-medicine, emergency-department-pack | emergency | pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, health_system, academic_medical_center | OK |
| fleet-dashboard | trackmind, hospital-operations, fleet-logistics | operations | fleet-operator; pack:trackmind→steward; pack:trackmind→racetrack admin; pack:trackmind→operations manager | health_system, racetrack, hospital, academic_medical_center, ems | OK |
| fleet-live-map | hospital-operations, fleet-logistics | operations | fleet-operator | hospital, health_system, academic_medical_center, ems | OK |
| gcs-calculator | emergency-clinical, emergency-medicine, emergency-department-pack | emergency | emergency-physician; nurse; pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, health_system, academic_medical_center | OK |
| guideline-rag | research-education | research | researcher; pack:research-education→researcher; pack:research-education→medical student | university, research_institute, academic_medical_center | OK |
| heart-score | emergency-clinical, emergency-medicine, emergency-department-pack, cardiology-pack | emergency, cardiology | emergency-physician; pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:cardiology-pack→cardiologist; pack:cardiology-pack→hospitalist | hospital, ems, health_system, academic_medical_center, clinic | OK |
| hospital-map | emergency-clinical, trackmind, emergency-medicine, hospital-operations, emergency-department-pack, digital-twin-pack | emergency, operations | pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:trackmind→steward; pack:trackmind→racetrack admin; pack:trackmind→operations manager; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:digital-twin-pack→administrator; pack:digital-twin-pack→biomedical engineer | hospital, ems, health_system, academic_medical_center, racetrack | OK |
| hospital-operations-command | trackmind, hospital-operations | operations | fleet-operator; administrator; pack:trackmind→steward; pack:trackmind→racetrack admin; pack:trackmind→operations manager | health_system, racetrack, hospital, academic_medical_center | OK |
| incident-command-center | trackmind, hospital-operations | operations | fleet-operator; administrator; pack:trackmind→steward; pack:trackmind→racetrack admin; pack:trackmind→operations manager | health_system, racetrack, hospital, academic_medical_center | OK |
| lab-interp | core-platform, reception-desk, laboratory-intelligence, icu-pack | icu, laboratory | nurse; pharmacist; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student; pack:reception-desk→registration clerk; pack:reception-desk→receptionist; pack:reception-desk→front desk; pack:icu-pack→ICU clinician; pack:icu-pack→nurse | all organization types | OK |
| laboratory | laboratory-intelligence | laboratory | pharmacist | hospital, clinic, academic_medical_center, health_system | OK |
| live-map | hospital-operations | operations | fleet-operator; administrator | hospital, health_system, academic_medical_center | OK |
| medical-iot | medical-iot-pack | operations | administrator; pack:medical-iot-pack→biomedical engineer; pack:medical-iot-pack→administrator | hospital, health_system | OK |
| mews | emergency-clinical, emergency-medicine, emergency-department-pack, icu-pack | emergency, icu | nurse; pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:icu-pack→ICU clinician; pack:icu-pack→nurse | hospital, ems, health_system, academic_medical_center | OK |
| news2 | emergency-clinical, emergency-medicine, emergency-department-pack, icu-pack | emergency, icu | emergency-physician; nurse; pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:icu-pack→ICU clinician; pack:icu-pack→nurse | hospital, ems, health_system, academic_medical_center | OK |
| nihss | emergency-clinical, emergency-medicine, emergency-department-pack | emergency | emergency-physician; pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, health_system, academic_medical_center | OK |
| order-set-ai | ai-workflow-pack | platform, surgery | pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist | hospital, academic_medical_center | OK |
| patient-summary-ai | ai-workflow-pack | platform | pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist | hospital, academic_medical_center | OK |
| pews | emergency-clinical, emergency-medicine, emergency-department-pack | emergency | pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, health_system, academic_medical_center | OK |
| predictive-maintenance | hospital-operations, fleet-logistics | operations | fleet-operator | hospital, health_system, academic_medical_center, ems | OK |
| protocols | core-platform, reception-desk, emergency-clinical, emergency-medicine, emergency-department-pack, icu-pack | platform, emergency, icu, neurology, pediatrics, oncology, surgery | registration-clerk; emergency-physician; nurse; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student; pack:reception-desk→registration clerk; pack:reception-desk→receptionist; pack:reception-desk→front desk; pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:icu-pack→ICU clinician; pack:icu-pack→nurse | all organization types | OK |
| qsofa | emergency-clinical, emergency-medicine, emergency-department-pack | emergency | emergency-physician; pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, health_system, academic_medical_center | OK |
| research-evidence-hub | research-education | research | researcher; pack:research-education→researcher; pack:research-education→medical student | university, research_institute, academic_medical_center | OK |
| revised-trauma-score | emergency-clinical, emergency-medicine, emergency-department-pack | emergency | emergency-physician; pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, health_system, academic_medical_center | OK |
| route-optimizer | hospital-operations, fleet-logistics | operations | fleet-operator | hospital, health_system, academic_medical_center, ems | OK |
| scenario-player | emergency-clinical, emergency-medicine, emergency-department-pack, simulation-training-pack | emergency | pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:simulation-training-pack→medical student; pack:simulation-training-pack→researcher | hospital, ems, health_system, academic_medical_center, university | OK |
| search | core-platform | platform | administrator; medical-student; pack:core-platform→emergency physician; pack:core-platform→hospitalist; pack:core-platform→nurse; pack:core-platform→ICU clinician; pack:core-platform→administrator; pack:core-platform→medical student | all organization types | OK |
| simulation-suite | emergency-clinical, emergency-medicine, research-education, emergency-department-pack, simulation-training-pack | emergency, research | emergency-physician; medical-student; pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:research-education→researcher; pack:research-education→medical student; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:simulation-training-pack→medical student; pack:simulation-training-pack→researcher | hospital, ems, health_system, academic_medical_center, university, research_institute | OK |
| sofa-calculator | emergency-clinical, emergency-medicine, emergency-department-pack | emergency, icu | pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse | hospital, ems, health_system, academic_medical_center | OK |
| sofa-score | emergency-clinical, emergency-medicine, emergency-department-pack, icu-pack | emergency, icu | emergency-physician; nurse; pack:emergency-clinical→emergency physician; pack:emergency-clinical→nurse; pack:emergency-clinical→charge nurse; pack:emergency-department-pack→emergency physician; pack:emergency-department-pack→nurse; pack:icu-pack→ICU clinician; pack:icu-pack→nurse | hospital, ems, health_system, academic_medical_center | OK |
| stemi-pathway-assistant | cardiology-pack | cardiology | pack:cardiology-pack→cardiologist; pack:cardiology-pack→hospitalist | hospital, clinic | OK |
| system-config | governance-compliance-pack | platform | administrator; pack:governance-compliance-pack→administrator | all organization types | OK |
| telemetry-monitoring | trackmind, hospital-operations, medical-iot-pack | operations | administrator; pack:trackmind→steward; pack:trackmind→racetrack admin; pack:trackmind→operations manager; pack:medical-iot-pack→biomedical engineer; pack:medical-iot-pack→administrator | health_system, racetrack, hospital, academic_medical_center | OK |
| timeline-ai | ai-workflow-pack | platform | pack:ai-workflow-pack→physician; pack:ai-workflow-pack→hospitalist | hospital, academic_medical_center | OK |

## Frontend-mounted registry tools awaiting backend seed rows (sample)

### Backlog by route area

| Route area | Count |
| --- | ---: |
| calculator tools | 96 |
| other routed tools | 32 |
| governance workflow | 16 |
| neurology tools | 10 |
| patient workflow | 10 |
| endocrine tools | 9 |
| pediatrics-obgyn tools | 9 |
| psychiatry tools | 9 |
| pulmonology tools | 9 |
| gastroenterology tools | 8 |
| nephrology tools | 8 |
| cardiology tools | 7 |
| assistant workflow | 5 |
| operations workflow | 3 |
| diagnosis tools | 2 |
| audit-trail-ai tools | 1 |
| clinical-dictation tools | 1 |
| clinical-reasoning-engine tools | 1 |
| discharge-summary-ai tools | 1 |
| guideline-rag tools | 1 |
| prior-auth-ai tools | 1 |
| procedures tools | 1 |
| referral-ai tools | 1 |
| soap-builder tools | 1 |
| tool catalog | 1 |
| why-engine tools | 1 |
| workflow-builder-ai tools | 1 |

### Sample rows

Total: 245 user-facing tools have frontend mounted asset projection coverage but are not direct backend `platform_assets` seed rows.

- **A-a Gradient** (`aa-gradient`) — /tools/calculators/aa-gradient — mounted projection OK
- **ABCD² score** (`abcd2`) — /tools/calculators/abcd2 — mounted projection OK
- **ACS Workflow Assistant** (`acs-workflow-assistant`) — /tools/cardiology/acs-workflow-assistant — mounted projection OK
- **Adjusted Body Weight** (`adjusted-body-weight`) — /tools/calculators/adjusted-body-weight — mounted projection OK
- **AKI Staging Assistant** (`aki-staging-assistant`) — /tools/nephrology/aki-staging-assistant — mounted projection OK
- **Anion Gap** (`anion-gap`) — /tools/calculators/anion-gap — mounted projection OK
- **Apgar score** (`apgar-score`) — /tools/calculators/apgar-score — mounted projection OK
- **APRI** (`apri`) — /tools/calculators/apri — mounted projection OK
- **ASCVD 10-year risk** (`ascvd-risk`) — /tools/calculators/ascvd-risk — mounted projection OK
- **Asthma Exacerbation Assistant** (`asthma-exacerbation-assistant`) — /tools/pulmonology/asthma-exacerbation-assistant — mounted projection OK
- **Asthma Severity Score** (`asthma-severity-score`) — /tools/calculators/asthma-severity-score — mounted projection OK
- **Atrial Fibrillation Assistant** (`atrial-fibrillation-assistant`) — /tools/cardiology/atrial-fibrillation-assistant — mounted projection OK
- **AUDIT-C** (`audit-c`) — /tools/calculators/audit-c — mounted projection OK
- **Bed Occupancy Calculator** (`bed-occupancy-calculator`) — /tools/calculators/bed-occupancy-calculator — mounted projection OK
- **BISAP score** (`bisap-score`) — /tools/calculators/bisap-score — mounted projection OK
- **Bishop score** (`bishop-score`) — /tools/calculators/bishop-score — mounted projection OK
- **BMI** (`calc-bmi`) — /tools/calculators/bmi — mounted projection OK
- **BODE Index** (`bode-index`) — /tools/calculators/bode-index — mounted projection OK
- **Body Surface Area** (`bsa`) — /tools/calculators/bsa — mounted projection OK
- **Braden scale** (`braden-scale`) — /tools/calculators/braden-scale — mounted projection OK
- **BUN/Creatinine Ratio** (`bun-creatinine-ratio`) — /tools/calculators/bun-creatinine-ratio — mounted projection OK
- **CAGE** (`cage`) — /tools/calculators/cage — mounted projection OK
- **Canadian C-Spine Rule** (`canadian-c-spine`) — /tools/calculators — mounted projection OK
- **Centor / McIsaac** (`centor-mcisaac`) — /tools/calculators/centor-mcisaac — mounted projection OK
- **CHA₂DS₂-VASc** (`calc-chads2vasc`) — /tools/calculators/chads2vasc — mounted projection OK
- **CHADS2** (`chads2`) — /tools/calculators/chads2 — mounted projection OK
- **Child-Pugh** (`child-pugh`) — /tools/calculators/child-pugh — mounted projection OK
- **CKD staging (KDIGO)** (`ckd-staging`) — /tools/calculators/ckd-staging — mounted projection OK
- **Cognitive Screening Assistant** (`cognitive-screening-assistant`) — /tools/psychiatry/cognitive-screening-assistant — mounted projection OK
- **Columbia Suicide Severity Workflow** (`columbia-suicide-severity-workflow`) — /tools/calculators/columbia-suicide-severity-workflow — mounted projection OK
- **COPD GOLD** (`copd-gold`) — /tools/calculators — mounted projection OK
- **COPD GOLD Assessment** (`copd-gold-assessment`) — /tools/calculators/copd-gold-assessment — mounted projection OK
- **COPD Workflow Assistant** (`copd-workflow-assistant`) — /tools/pulmonology/copd-workflow-assistant — mounted projection OK
- **Corrected Calcium** (`corrected-calcium`) — /tools/calculators/corrected-calcium — mounted projection OK
- **Corrected Sodium** (`corrected-sodium`) — /tools/calculators/corrected-sodium — mounted projection OK
- **Creatinine Clearance (Cockcroft-Gault)** (`creatinine-clearance-cg`) — /tools/calculators/creatinine-clearance-cg — mounted projection OK
- **Diabetes Care Assistant** (`diabetes-care-assistant`) — /tools/endocrine/diabetes-care-assistant — mounted projection OK
- **DKA Pathway Assistant** (`dka-pathway-assistant`) — /tools/endocrine/dka-pathway-assistant — mounted projection OK
- **Duke Treadmill Score** (`duke-treadmill-score`) — /tools/calculators/duke-treadmill-score — mounted projection OK
- **eGFR (CKD-EPI)** (`calc-gfr`) — /tools/calculators/gfr — mounted projection OK
- **eGFR CKD-EPI 2021** (`egfr-ckd-epi`) — /tools/calculators/egfr-ckd-epi — mounted projection OK
- **Electrolyte Disorder Assistant** (`electrolyte-disorder-assistant`) — /tools/nephrology/electrolyte-disorder-assistant — mounted projection OK
- **Epworth Sleepiness Scale** (`epworth-sleepiness-scale`) — /tools/calculators/epworth-sleepiness-scale — mounted projection OK
- **FeNa** (`fena`) — /tools/calculators/fena — mounted projection OK
- **Fenton Growth Chart Helper** (`fenton-growth-chart-helper`) — /tools/calculators/fenton-growth-chart-helper — mounted projection OK
- **FeUrea** (`feurea`) — /tools/calculators/feurea — mounted projection OK
- **FIB-4** (`fib4`) — /tools/calculators/fib4 — mounted projection OK
- **Fluid Resuscitation Calculator Plugin** (`plugin-fluid-resuscitation-calculator`) — /tools/catalog — mounted projection OK
- **FOUR Score** (`four-score`) — /tools/calculators/four-score — mounted projection OK
- **Framingham CHD risk** (`framingham-risk`) — /tools/calculators/framingham-risk — mounted projection OK
- … and 195 more

## Remediation playbook

1. **Solution pack** — Add asset id to appropriate `SEED_ASSET_PACKS[].assetIds` (or `core-platform` for universal tools).
2. **Specialty pack** — Add asset id to `SEED_SPECIALTIES[].assetIds` for each relevant specialty slug.
3. **Role pack** — Add to `SEED_ROLE_PROFILES[].preferredAssetIds` and/or pack `targetRoles` for role targeting.
4. **Organization type** — Ensure at least one containing pack lists the tenant segment in `organizationTypes`.
5. **Backend seed backlog** — Promote high-value mounted projection rows into backend `platform_assets` seed rows when they need entitlement enforcement, billing, or marketplace ownership.

## Appendix

- Validation service: `ProductCatalogValidationService` (post-seed reference checks)
- Related: [solution-packs.md](./solution-packs.md), [saas-compliance-audit.md](./saas-compliance-audit.md)
- Generator: `src/data/productPackagingAudit.ts`

