## Platform inventory

*Reverse-engineered from shipped source on **2026-08-07**. Regenerate this file: `npm run inventory:write-docs`. Validate counts in-memory only (no file write): `npm run inventory:report`. Detailed wiring matrices live under `docs/` (not in repo root).*

### Summary

| Layer | Count | Primary source |
|-------|------:|----------------|
| Sidebar registry tools | 242 | `src/data/toolRegistry.ts` |
| NLU / AI clinical profiles | 219 | `src/data/clinicalIntentToolCatalog.ts` |
| Dedicated calculator UI forms | 92 | `builtinUiCalculators` in catalog |
| Calculator SPA routes | 92 | `src/routes/clinicalToolRoutes.ts` |
| Unified catalog rows (search) | 291 | `/tools/catalog` index |
| Known tool-area paths | 255 | `KNOWN_TOOL_AREA_PATHS` |
| Backend POST executors | 39 | see `REGISTERED_EXECUTOR_TOOL_IDS` in `tool-orchestrator.registry.ts` for the full, current list |
| E2E validation matrix rows | 242 | `e2eToolValidationMatrix.ts` |

### Medical tools by delivery tier

Registry tools group into disjoint tiers (see `clinicalToolIdContract.ts`):

| Tier | Count | Shipped tools |
|------|------:|---------------|
| **A** | 62 | Adjusted Body Weight, Apgar score, APRI, ASCVD 10-year risk, Asthma Severity Score, AUDIT-C, Bed Occupancy Calculator, BISAP score, Bishop score, BMI, BODE Index, Body Surface Area, Braden scale, BUN/Creatinine Ratio, CAGE, Centor / McIsaac, Child-Pugh, CKD staging (KDIGO), Columbia Suicide Severity Workflow, COPD GOLD Assessment, Creatinine Clearance (Cockcroft-Gault), CURB-65, eGFR (CKD-EPI), eGFR CKD-EPI 2021, Epworth Sleepiness Scale, Fenton Growth Chart Helper, FIB-4, Free Water Deficit, GAD-7, Gestational Age Calculator, Glasgow-Blatchford Score, HCM Sudden Death Risk, Heart Failure Staging Helper, HOMA-IR, Ideal Body Weight, Kidney Failure Risk Equation, Maddrey Discriminant Function, MDQ, MELD, MELD-Na, MMSE, MoCA Placeholder Workflow, Morse Fall Scale, Neonatal Bilirubin Risk Helper, NIHSS Summary View, PCL-5, Pediatric BP Percentile, Pediatric Dose Safety Checker, Pediatric GCS, PEWS, PHQ-9, Pneumonia Severity Index, Pregnancy Due Date Calculator, qSOFA (quick SOFA), Ranson criteria, RASS, Resource Utilization Index, Rockall Score, Staffing Ratio Calculator, STOP-Bang, Turnaround Time Calculator, Waist-to-Hip Ratio |
| **ai-system** | 12 | AI Artifacts, AI Command Center, AI Cost Optimization, AI Evaluation, AI Gateway, AI Governance, AI Memory, AI Tool Calling, AI Training Pipeline, LLM Security, MoE Router, RAG Evidence Engine |
| **B** | 38 | ACS Workflow Assistant, AKI Staging Assistant, Asthma Exacerbation Assistant, Atrial Fibrillation Assistant, Cognitive Screening Assistant, COPD GOLD, COPD Workflow Assistant, Diabetes Care Assistant, Dialysis Readiness Helper, DKA Pathway Assistant, ECG Interpretation Assistant, Electrolyte Disorder Assistant, GI Bleed Workflow Assistant, Headache Red Flag Assistant, Heart Failure Assistant, Liver Disease Assistant, Medication Dose Calculator, Mental Health Screening Assistant, Metabolic Syndrome Assistant, Neonatal Assessment Assistant, Neuro Exam Assistant, NIH Stroke Scale (NIHSS), OB Triage Assistant, Ottawa Ankle Rule, Oxygen Escalation Helper, Pancreatitis Workflow Assistant, Pediatric Sepsis Assistant, PERC, Pregnancy Workflow Assistant, Rome IV IBS, Seizure Assistant, STEMI Pathway Assistant, Stroke Workflow Assistant, Substance Use Screening Assistant, Suicide Risk Workflow Assistant, Thyroid Disorder Assistant, Ventilator Support Assistant, Vertigo HINTS Assistant |
| **C** | 101 | 3D Viewer, A-a Gradient, ABCD² score, ABG Interpreter, AI Explainability, Ambient Clinical Scribe, Anion Gap, APACHE-II, Arrhythmia Risk Classifier, Behavioral Analytics Dashboard, Canadian C-Spine Rule, Cardiac Telemetry Analyzer, Cardiology Command Center, CHA₂DS₂-VASc, CHADS2, Cirrhosis Monitoring Engine, CKD Progression Predictor, Clinical Audit, Clinical Decision Support Engine, Clinical Documentation Assistant, Clinical Knowledge Graph, Competency Platform, Continuous Glucose Command Center, Corrected Calcium, Corrected Sodium, Credentialing Platform, Crisis Escalation Audit Log, Dialysis Utilization Tracker, Differential Diagnosis Assistant, Drug Checker, Duke Treadmill Score, ECG Trend Engine, EEG Trend Dashboard, Electrolyte Trend Engine, Endocrine Monitoring System, Endoscopy Workflow Assistant, FeNa, FeUrea, Fluid Balance Monitor, FOUR Score, Framingham CHD risk, GI Command Center, GI Surveillance Dashboard, Glasgow Coma Scale (GCS), Glucose Telemetry Dashboard, GRACE ACS Risk, Growth Trend Analytics, Guideline Retrieval + Evidence Engine, HAS-BLED, HEART score, Hepatic Trend Analytics, Hunt-Hess Scale, ICH Score, Insulin Trend Engine, Intelligent Order Set Assistant, Lab Interpreter, Laboratory Dashboard, Maternal Monitoring Dashboard, Medical Simulation Suite, Metabolic Analytics, MEWS, Modified Rankin Scale, Neonatal Dashboard, Neuro Monitoring Engine, Neuro Telemetry Dashboard, Neurology Timeline AI, NEWS2, NEXUS C-Spine Rule, Osmolal Gap, PaO2/FiO2 Ratio, Patient Summary AI, Patient Timeline AI, PECARN Head Injury Rule, Pediatric Command Center, Perinatal Risk Dashboard, Population Screening Dashboard, Predictive Analytics Dashboard, Psychiatry Monitoring Dashboard, Pulmonary Trend Engine, Remote Cardiology Monitoring Dashboard, Renal Monitoring Dashboard, Research and Evidence Hub, Respiratory Command Center, Respiratory Telemetry Dashboard, Revised Trauma Score, Reynolds Risk Score Helper, ROX Index, Screening Trend Engine, Serum Osmolality, Shock Index, Simulation Competency Dashboard, Simulation Debrief Dashboard, Simulation Outcomes, Simulation Scenario Player, Sleep Apnea Analytics, SOFA Score, Stroke Command Center, TIMI (UA/NSTEMI), Ventilator Monitoring Dashboard, Wells DVT, Wells PE |
| **clinical-page** | 7 | ACLS Protocol, Antibiotic Guide, ATLS Protocol, Calculator Recommendation AI, Diagnosis Assistant, Procedure Guide, Protocol and Clinical Pathway Library |
| **fleet-A** | 3 | Fleet Command, Predictive Maintenance Engine, Route Optimization Engine |
| **fleet-B** | 1 | Dispatch Intelligence |
| **hospital-ops** | 11 | Asset Tracking Dashboard, Capacity Prediction Engine, Device Battery Intelligence, Device Fleet Management, Device Maintenance, Hospital Map, Hospital Operations Cockpit, Hospital Operations Command, Incident Command Center, Operations Hub, Telemetry Monitoring Center |
| **hospital-ops-B** | 3 | Device Recommendation Assistant, Hospital Command Assistant, Resource Allocation Assistant |
| **hub** | 1 | All calculators |
| **live-map** | 2 | Fleet Live Map, Live Tracking Map |
| **medical-iot** | 1 | Medical IoT Dashboard |

**Tier semantics**

- **A** — Dedicated calculator form in `Calculators.tsx` (client-side scoring).
- **B** — Chat-assisted from calculators hub (structured chat seed, no standalone form).
- **C** — Full page + registered POST `/api/tools/:id/execute` (SOFA, drug checker, lab interpreter).
- **clinical-page** — Protocols, diagnosis assistant, procedure guide (chat via `POST /api/chat/message`).
- **fleet-A** — Fleet operations pages under `/fleet/*`.
- **fleet-B** — Dispatch intelligence (chat-assisted via hub).
- **hub** — Calculators overview (`/tools/calculators`).

### Built-in calculator forms (92)

- **SOFA Score** (`sofa`) — `/tools/calculators/sofa`
- **qSOFA (quick SOFA)** (`qsofa`) — `/tools/calculators/qsofa`
- **NEWS2** (`news2`) — `/tools/calculators/news2`
- **APACHE II** (`apache-ii`) — `/tools/calculators/apache-ii`
- **CURB-65** (`curb-65`) — `/tools/calculators/curb-65`
- **Glasgow Coma Scale** (`gcs`) — `/tools/calculators/gcs`
- **MEWS** (`mews`) — `/tools/calculators/mews`
- **Revised Trauma Score** (`revised-trauma-score`) — `/tools/calculators/revised-trauma-score`
- **PEWS** (`pews`) — `/tools/calculators/pews`
- **Child-Pugh** (`child-pugh`) — `/tools/calculators/child-pugh`
- **HAS-BLED** (`has-bled`) — `/tools/calculators/has-bled`
- **MELD** (`meld`) — `/tools/calculators/meld`
- **MELD-Na** (`meld-na`) — `/tools/calculators/meld-na`
- **TIMI (UA/NSTEMI)** (`timi-ua-nstemi`) — `/tools/calculators/timi-ua-nstemi`
- **ASCVD 10-year risk** (`ascvd-risk`) — `/tools/calculators/ascvd-risk`
- **CKD stage / staging (KDIGO)** (`ckd-staging`) — `/tools/calculators/ckd-staging`
- **eGFR CKD-EPI 2021** (`egfr-ckd-epi`) — `/tools/calculators/egfr-ckd-epi`
- **Creatinine Clearance Cockcroft-Gault** (`creatinine-clearance-cg`) — `/tools/calculators/creatinine-clearance-cg`
- **FeNa** (`fena`) — `/tools/calculators/fena`
- **FeUrea** (`feurea`) — `/tools/calculators/feurea`
- **Kidney Failure Risk Equation** (`kfre`) — `/tools/calculators/kfre`
- **BUN/Creatinine Ratio** (`bun-creatinine-ratio`) — `/tools/calculators/bun-creatinine-ratio`
- **Corrected Sodium** (`corrected-sodium`) — `/tools/calculators/corrected-sodium`
- **Free Water Deficit** (`free-water-deficit`) — `/tools/calculators/free-water-deficit`
- **Osmolal Gap** (`osmolal-gap`) — `/tools/calculators/osmolal-gap`
- **HOMA-IR** (`homa-ir`) — `/tools/calculators/homa-ir`
- **Corrected Calcium** (`corrected-calcium`) — `/tools/calculators/corrected-calcium`
- **Serum Osmolality** (`serum-osmolality`) — `/tools/calculators/serum-osmolality`
- **Body Surface Area** (`bsa`) — `/tools/calculators/bsa`
- **Ideal Body Weight** (`ideal-body-weight`) — `/tools/calculators/ideal-body-weight`
- **Adjusted Body Weight** (`adjusted-body-weight`) — `/tools/calculators/adjusted-body-weight`
- **Waist-to-Hip Ratio** (`waist-hip-ratio`) — `/tools/calculators/waist-hip-ratio`
- **STOP-Bang / stop bang** (`stop-bang`) — `/tools/calculators/stop-bang`
- **BODE Index** (`bode-index`) — `/tools/calculators/bode-index`
- **COPD GOLD Assessment** (`copd-gold-assessment`) — `/tools/calculators/copd-gold-assessment`
- **A-a Gradient** (`aa-gradient`) — `/tools/calculators/aa-gradient`
- **PaO2/FiO2 Ratio** (`pao2-fio2-ratio`) — `/tools/calculators/pao2-fio2-ratio`
- **ROX Index** (`rox-index`) — `/tools/calculators/rox-index`
- **Pneumonia Severity Index** (`pneumonia-severity-index`) — `/tools/calculators/pneumonia-severity-index`
- **Asthma Severity Score** (`asthma-severity-score`) — `/tools/calculators/asthma-severity-score`
- **AUDIT-C / audit c** (`audit-c`) — `/tools/calculators/audit-c`
- **PHQ-9 / phq9** (`phq9`) — `/tools/calculators/phq9`
- **GAD-7 / gad7** (`gad7`) — `/tools/calculators/gad7`
- **CAGE** (`cage`) — `/tools/calculators/cage`
- **MMSE** (`mmse`) — `/tools/calculators/mmse`
- **MoCA Placeholder Workflow** (`moca-placeholder-workflow`) — `/tools/calculators/moca-placeholder-workflow`
- **PCL-5** (`pcl5`) — `/tools/calculators/pcl5`
- **MDQ** (`mdq`) — `/tools/calculators/mdq`
- **Epworth Sleepiness Scale** (`epworth-sleepiness-scale`) — `/tools/calculators/epworth-sleepiness-scale`
- **Columbia Suicide Severity Workflow** (`columbia-suicide-severity-workflow`) — `/tools/calculators/columbia-suicide-severity-workflow`
- **HEART score** (`heart-score`) — `/tools/calculators/heart-score`
- **Centor / McIsaac** (`centor-mcisaac`) — `/tools/calculators/centor-mcisaac`
- **Bishop score** (`bishop-score`) — `/tools/calculators/bishop-score`
- **Apgar score** (`apgar-score`) — `/tools/calculators/apgar-score`
- **Gestational Age Calculator** (`gestational-age-calculator`) — `/tools/calculators/gestational-age-calculator`
- **Pediatric BP Percentile** (`pediatric-bp-percentile`) — `/tools/calculators/pediatric-bp-percentile`
- **Pregnancy Due Date Calculator** (`pregnancy-due-date-calculator`) — `/tools/calculators/pregnancy-due-date-calculator`
- **Fenton Growth Chart Helper** (`fenton-growth-chart-helper`) — `/tools/calculators/fenton-growth-chart-helper`
- **Neonatal Bilirubin Risk Helper** (`neonatal-bilirubin-risk-helper`) — `/tools/calculators/neonatal-bilirubin-risk-helper`
- **Pediatric Dose Safety Checker** (`pediatric-dose-safety-checker`) — `/tools/calculators/pediatric-dose-safety-checker`
- **Braden scale** (`braden-scale`) — `/tools/calculators/braden-scale`
- **Morse Fall Scale** (`morse-fall-scale`) — `/tools/calculators/morse-fall-scale`
- **Ranson criteria** (`ranson-criteria`) — `/tools/calculators/ranson-criteria`
- **BISAP score** (`bisap-score`) — `/tools/calculators/bisap-score`
- **FIB-4** (`fib4`) — `/tools/calculators/fib4`
- **Maddrey Discriminant Function** (`maddrey-discriminant-function`) — `/tools/calculators/maddrey-discriminant-function`
- **APRI** (`apri`) — `/tools/calculators/apri`
- **Glasgow-Blatchford Score** (`glasgow-blatchford-score`) — `/tools/calculators/glasgow-blatchford-score`
- **Rockall Score** (`rockall-score`) — `/tools/calculators/rockall-score`
- **Framingham CHD risk** (`framingham-risk`) — `/tools/calculators/framingham-risk`
- **Duke Treadmill Score** (`duke-treadmill-score`) — `/tools/calculators/duke-treadmill-score`
- **Reynolds Risk Score Helper** (`reynolds-risk-score`) — `/tools/calculators/reynolds-risk-score`
- **HCM Sudden Death Risk** (`hcm-sudden-death-risk`) — `/tools/calculators/hcm-sudden-death-risk`
- **CHADS2** (`chads2`) — `/tools/calculators/chads2`
- **Heart Failure Staging Helper** (`heart-failure-staging`) — `/tools/calculators/heart-failure-staging`
- **ABCD² score** (`abcd2`) — `/tools/calculators/abcd2`
- **Hunt-Hess Scale** (`hunt-hess-scale`) — `/tools/calculators/hunt-hess-scale`
- **ICH Score** (`ich-score`) — `/tools/calculators/ich-score`
- **FOUR Score** (`four-score`) — `/tools/calculators/four-score`
- **Modified Rankin Scale** (`modified-rankin-scale`) — `/tools/calculators/modified-rankin-scale`
- **NIHSS Summary View** (`nihss-summary-view`) — `/tools/calculators/nihss-summary-view`
- **Pediatric GCS** (`pediatric-gcs`) — `/tools/calculators/pediatric-gcs`
- **Shock Index** (`shock-index`) — `/tools/calculators/shock-index`
- **Anion Gap** (`anion-gap`) — `/tools/calculators/anion-gap`
- **RASS** (`rass`) — `/tools/calculators/rass`
- **Bed Occupancy Calculator** (`bed-occupancy-calculator`) — `/tools/calculators/bed-occupancy-calculator`
- **Staffing Ratio Calculator** (`staffing-ratio-calculator`) — `/tools/calculators/staffing-ratio-calculator`
- **Turnaround Time Calculator** (`turnaround-time-calculator`) — `/tools/calculators/turnaround-time-calculator`
- **Resource Utilization Index** (`resource-utilization-index`) — `/tools/calculators/resource-utilization-index`
- **eGFR (CKD-EPI)** (`gfr`) — `/tools/calculators/gfr`
- **BMI** (`bmi`) — `/tools/calculators/bmi`
- **CHA2DS2-VASc** (`chads2vasc`) — `/tools/calculators/chads2vasc`

### NLU hub-only profiles (1)

Routed through the calculators hub without a dedicated form yet: `wells-dvt-calculator`.

Additional NLU-only chat profiles (protocol lookup, ACLS/ATLS, dose calculator, ABG, differential diagnosis, antibiotic guide, etc.) are included in the **219** NLU profiles and catalog index.

### Sidebar registry categories

| Category | Count |
|----------|------:|
| AI System | 12 |
| Calculator | 141 |
| Diagnostic | 14 |
| Education & Simulation | 7 |
| Fleet | 5 |
| Hospital Operations | 14 |
| IoT | 2 |
| Laboratory | 1 |
| Reference | 45 |
| Visualization | 1 |

### Product & platform capabilities (SPA)

Authenticated and public surface areas:

- **AI workspace** — `/home`, `/assistant`
- **Clinical tools hub** — `/tools`, `/tools/catalog`, `/tools/calculators`
- **Clinical intelligence** — `/clinical/alerts`
- **Live tracking maps** — `/live-map`, `/fleet/map`, `/hospital-map`, `/medical-iot`
- **Account & security** — `/profile`, `/profile-settings`, `/settings`, `/notifications`, `/two-factor-setup`, `/biometric-setup`, `/onboarding`, `/consent`, `/consent-history`
- **Administration (RBAC)** — `/team`, `/audit`, `/analytics`, `/costs`
- **Public & legal** — `/`, `/auth`, `/privacy`, `/terms`, `/gdpr`, `/hipaa`, `/help`, `/shared/tools/:shareId`

### Marketing / discovery feature inventory (16)

Six clinical tool prompts plus ten platform capability entries in `src/data/featureInventory.ts`:

- **AI Workflow Assistant** (AI Workflow)
- **Audit Logging** (Compliance)
- **Drug Database** (Clinical Data)
- **Offline Access** (Platform)
- **Integration Hub (Demo Adapters)** (Integrations)
- **Custom Branding** (Platform)
- **Dedicated Support** (Support)
- **SSO/SAML** (Security)
- **Team Management** (Operations)
- **AI Query Limits** (AI Usage)

### Regenerate detailed matrices

```bash
npm run e2e-matrix:write-docs      # docs/e2e-tool-validation-matrix.md
npm run contract:write-docs        # docs/architecture/backend-frontend-tool-contract.md
npm run tool-matrix:write-docs     # docs/tool-render-execute-matrix.md
npm run inventory:report           # print summary to stdout
```

## Source language harmonization

*Audited on **2026-08-07**.*

| Layer | Location | Format | Status |
|-------|----------|--------|--------|
| Frontend application | `src/` | TypeScript (`.ts` / `.tsx`) | **Canonical**; no native duplicate app |
| Backend API | `backend/src/` | TypeScript (NestJS) | **Canonical** |
| Shared engines | `src/engine/`, `src/store/` | TypeScript | **Canonical** |
| Build / QA scripts | `scripts/`, `e2e/` | Node (`.mjs`) | Tooling only; not product source |
| Service workers | `public/sw.js` | JavaScript | Required browser runtime |

`tsconfig.frontend.json` sets `allowJs: false`; run `npm run typecheck:frontend` to verify.

