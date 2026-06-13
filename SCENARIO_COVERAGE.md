# Phase 16 Scenario Coverage

Generated: 2026-06-12

Prompt: 16.1 deep source audit. This file is a read-only coverage report. No product code was changed.

State scale:

- Complete: rendered tool/workflow exists and is usable in the active UI.
- Partial: meaningful code exists, but workflow is incomplete, local-only, missing a checklist, missing persistence, or not fully scenario-specific.
- Stub: placeholder, coming-soon, demo-only, roadmap, or assistant prompt only.
- Broken: pieces exist but the active chain is disconnected or gated so the default runtime cannot use it end-to-end.
- Not started: no meaningful source implementation found.

## Scenario Coverage Table

| # | Scenario | Category | Found in code | State | Files |
| --- | --- | --- | --- | --- | --- |
| 1 | STEMI / cath lab activation | Cardiac | Yes | Partial | `config/criticalChecklists.ts`, `src/data/clinicalIntentToolCatalog.js`, `src/pages/emergency/ClinicalCalculatorHub.jsx`, `backend/src/modules/medical-control-plane/intent-classifier/patterns/emergency.patterns.ts` |
| 2 | ACS chest pain risk stratification | Cardiac | Yes | Complete | `src/utils/heartScoreCalculator.js`, `src/utils/timiUaNstemiCalculator.js`, `src/utils/graceAcsCalculator.js`, `src/pages/tools/pr8ClinicalBatchCalculators.jsx`, `src/pages/tools/sourceBackedClinicalCalculators.jsx`, `src/components/PatientCard.jsx` |
| 3 | Arrhythmia / QT / cardioversion | Cardiac | Yes | Stub | `src/data/clinicalToolIdContract.js`, `src/data/clinicalIntentToolCatalog.js`, `backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts` |
| 4 | Heart failure / BNP | Cardiac | Yes | Stub | `src/data/clinicalToolIdContract.js`, `src/pages/tools/TimelineAi.jsx`, `backend/src/modules/clinical-intelligence/dto/timeline-ai.dto.ts` |
| 5 | Dyspnea / respiratory deterioration / NEWS2 | Respiratory | Yes | Complete | `src/utils/news2Calculator.js`, `src/pages/emergency/ClinicalCalculatorHub.jsx`, `engine/triageEngine.ts`, `config/criticalChecklists.ts`, `src/components/PatientCard.jsx` |
| 6 | Pulmonary embolism / Wells PE / PERC | Respiratory | Yes | Complete | `src/utils/wellsPeCalculator.js`, `src/utils/percCalculator.js`, `src/pages/tools/sourceBackedClinicalCalculators.jsx`, `src/data/wellsPeWiring.test.js`, `src/data/percWiring.test.js` |
| 7 | Pneumonia / CURB-65 | Respiratory | Yes | Complete | `src/pages/tools/emergencyCriticalCareCalculators.jsx`, `src/utils/emergencyCriticalCareCalculators.js`, `src/pages/emergency/ClinicalCalculatorHub.jsx` |
| 8 | Asthma / COPD / peak flow | Respiratory | Yes | Partial | `src/pages/tools/pulmonologyCalculators.jsx`, `src/data/chatAssistedCalculators/copdGold.js`, `src/data/clinicalToolIdContract.js`, `src/pages/emergency/ClinicalCalculatorHub.jsx` |
| 9 | Stroke / NIHSS | Neurological | Yes | Complete | `src/utils/nihssCalculator.js`, `src/pages/tools/sourceBackedClinicalCalculators.jsx`, `src/pages/emergency/ClinicalCalculatorHub.jsx`, `config/criticalChecklists.ts` |
| 10 | TIA / ABCD2 | Neurological | Yes | Complete | `src/utils/abcd2Calculator.js`, `src/pages/tools/abcd2Calculator.jsx`, `src/data/abcd2Wiring.test.js`, `src/pages/emergency/ClinicalCalculatorHub.jsx` |
| 11 | GCS / altered mental status | Neurological | Yes | Complete | `src/pages/tools/emergencyCriticalCareCalculators.jsx`, `src/utils/emergencyCriticalCareCalculators.js`, `src/pages/emergency/ClinicalCalculatorHub.jsx`, `engine/triageEngine.ts` |
| 12 | Seizure / status epilepticus | Neurological | Yes | Stub | `src/data/emergencyPatternCatalog.js`, `src/data/clinicalIntentToolCatalog.js`, `backend/src/modules/medical-control-plane/intent-classifier/patterns/emergency.patterns.ts`, `src/data/clinicalToolIdContract.js` |
| 13 | Sepsis / qSOFA screening | Sepsis | Yes | Complete | `src/utils/qsofaCalculator.js`, `src/pages/tools/Calculators.jsx`, `src/pages/emergency/ClinicalCalculatorHub.jsx`, `engine/triageEngine.ts` |
| 14 | SOFA / septic shock organ dysfunction | Sepsis | Yes | Partial | `backend/src/modules/medical-control-plane/tool-orchestrator/services/sofa-calculator.service.ts`, `src/data/clinicalToolIdContract.js`, `src/pages/emergency/ClinicalCalculatorHub.jsx` |
| 15 | SEP-1 bundle / lactate / antibiotics / blood cultures | Sepsis | Yes | Stub | `backend/src/modules/clinical-intelligence/clinical-intelligence.service.ts`, `backend/src/modules/medical-control-plane/emergency-escalation/emergency-escalation.service.ts`, `backend/test/emergency-escalation.spec.ts`, `src/utils/drugReferenceTools.js` |
| 16 | Appendicitis / Alvarado | Abdominal | Yes | Stub | `lib/features/featureRegistry.ts`, `src/pages/emergency/ClinicalCalculatorHub.jsx` |
| 17 | GI bleed / Glasgow-Blatchford / Rockall | Abdominal | Yes | Complete | `src/pages/tools/hepatologyGiCalculators.jsx`, `src/utils/hepatologyGiCalculators.js`, `src/pages/emergency/ClinicalCalculatorHub.jsx`, `src/data/clinicalToolIdContract.js` |
| 18 | Pancreatitis / Ranson / BISAP | Abdominal | Yes | Complete | `src/pages/tools/pr8ClinicalBatchCalculators.jsx`, `src/utils/ransonCriteriaCalculator.js`, `src/utils/bisapScoreCalculator.js`, `src/pages/emergency/ClinicalCalculatorHub.jsx` |
| 19 | Bowel / general abdominal pain workflow | Abdominal | Yes | Stub | `engine/triageEngine.ts`, `src/data/emergencyOperatingSystem.js`, `src/services/workspaceDataPipelineService.js` |
| 20 | Major trauma / ATLS / FAST / shock index | Trauma | Yes | Partial | `config/criticalChecklists.ts`, `src/utils/nextWaveCalculatorUtils.js`, `src/pages/tools/emergencyCriticalCareCalculators.jsx`, `src/pages/emergency/ClinicalCalculatorHub.jsx` |
| 21 | Head injury / CT head / PECARN | Trauma | Yes | Complete | `src/utils/pecarnHeadCalculator.js`, `src/data/pecarnHeadWiring.test.js`, `src/data/clinicalToolIdContract.js`, `src/pages/tools/sourceBackedClinicalCalculators.jsx` |
| 22 | Fracture / C-spine / ankle injury | Trauma | Yes | Complete | `src/utils/canadianCSpineCalculator.js`, `src/utils/nexusCSpineCalculator.js`, `src/utils/ottawaAnkleCalculator.js`, `src/pages/tools/sourceBackedClinicalCalculators.jsx`, `store/emergencyStore.ts` |
| 23 | Laceration / wound repair | Trauma | Yes | Partial | `engine/triageEngine.ts`, `src/data/clinicalIntentRouter.js`, `src/data/protocolPathwayLibrary.js` |
| 24 | Suicide risk / Columbia workflow | Mental Health | Yes | Partial | `src/pages/tools/psychiatryScreeningCalculators.jsx`, `src/utils/psychiatryScreeningCalculators.js`, `src/data/clinicalToolIdContract.js`, `src/pages/emergency/ClinicalCalculatorHub.jsx` |
| 25 | Depression/anxiety / PHQ-9 / GAD-7 | Mental Health | Yes | Complete | `src/utils/phq9Calculator.js`, `src/utils/gad7Calculator.js`, `src/pages/tools/mentalHealthCalculators.jsx`, `src/pages/tools/Calculators.jsx` |
| 26 | Alcohol/substance / CAGE / AUDIT-C / CIWA | Mental Health | Yes | Partial | `src/utils/auditCCalculator.js`, `src/pages/tools/psychiatryScreeningCalculators.jsx`, `src/pages/tools/pr4aCalculators.jsx`, `src/data/clinicalToolIdContract.js` |
| 27 | Psychiatric agitation / psych boarding | Mental Health | Yes | Partial | `src/components/ReferralPanel.jsx`, `src/services/boardingIntelligenceEngine.js`, `store/emergencyStore.ts`, `src/data/emergencyOperatingSystem.js` |
| 28 | Pediatric dosing / Broselow / weight-based | Pediatric | Yes | Complete | `src/pages/tools/pediatricsObgynCalculators.jsx`, `src/utils/pediatricsObgynCalculators.js`, `src/utils/drugReferenceTools.js`, `src/pages/emergency/ClinicalCalculatorHub.jsx` |
| 29 | PEWS / pediatric GCS / pediatric vitals | Pediatric | Yes | Complete | `src/pages/tools/emergencyCriticalCareCalculators.jsx`, `src/utils/emergencyCriticalCareCalculators.js`, `src/pages/tools/neurologyCalculators.jsx`, `src/pages/emergency/ClinicalCalculatorHub.jsx` |
| 30 | Croup / febrile child / neonatal | Pediatric | Yes | Stub | `store/emergencyStore.ts`, `src/pages/tools/pediatricsObgynCalculators.jsx`, `src/data/clinicalToolIdContract.js` |
| 31 | Falls / frailty / elderly fall | Geriatric | Yes | Partial | `src/utils/morseFallScaleCalculator.js`, `src/pages/tools/pr8ClinicalBatchCalculators.jsx`, `src/components/EMSPipeline.jsx`, `store/emergencyStore.ts` |
| 32 | Delirium / cognition / dementia / MMSE-MoCA | Geriatric | Yes | Partial | `src/pages/tools/psychiatryScreeningCalculators.jsx`, `src/utils/psychiatryScreeningCalculators.js`, `src/data/clinicalToolIdContract.js` |
| 33 | Overdose / naloxone / antidote reference | Toxicology | Yes | Stub | `store/emergencyStore.ts`, `src/utils/drugReferenceTools.js`, `backend/src/modules/medical-control-plane/intent-classifier/patterns/emergency.patterns.ts` |
| 34 | Anaphylaxis / epinephrine / allergy | Toxicology | Yes | Partial | `config/criticalChecklists.ts`, `src/pages/tools/pediatricsObgynCalculators.jsx`, `src/utils/drugReferenceTools.js`, `store/emergencyStore.ts` |
| 35 | Capacity / surge / diversion / NEDOCS | Operational | Yes | Broken | `engine/capacityEngine.ts`, `store/emergencyStore.ts`, `src/App.jsx`, `src/pages/emergency/EmergencySettings.jsx`, `src/services/emergencySimulationScenariosService.js`, `src/services/emergencyTransportApi.js` |
| 36 | Boarding / LWBS / wait time / queue | Operational | Yes | Partial | `src/utils/longWaitRescue.js`, `src/components/QueueIntelligencePanel.jsx`, `src/services/boardingIntelligenceEngine.js`, `src/pages/emergency/EmergencyAnalytics.jsx`, `store/emergencyStore.ts` |

## Detailed Matches by Scenario Category

### Category 1: Cardiac

| File path | Code element found | Scenario it maps to | State |
| --- | --- | --- | --- |
| `src/utils/heartScoreCalculator.js` | `HEART_DIMENSIONS_META`, `calculateHeartScore`, `interpretHeartScore` | ACS chest pain risk stratification | Complete |
| `src/pages/tools/pr8ClinicalBatchCalculators.jsx` | `HeartScoreCalculator` rendered calculator | ACS chest pain risk stratification | Complete |
| `src/utils/timiUaNstemiCalculator.js` | `TIMI_UA_NSTEMI_CRITERIA_META`, score logic | ACS/TIMI | Complete |
| `src/utils/graceAcsCalculator.js` | `GraceKillipClass`, `computeGraceAcsRisk` | ACS/Killip/GRACE | Complete |
| `src/pages/tools/sourceBackedClinicalCalculators.jsx` | `GraceAcsCalculator`, `Killip class` field | ACS/Killip | Complete |
| `config/criticalChecklists.ts` | `type: 'stemi'`, `Activate cath lab`, ECG, aspirin, heparin checklist items | STEMI/cath lab | Partial |
| `src/data/clinicalIntentToolCatalog.js` | `stemi-pathway-assistant`, `acs-workflow-assistant`, `atrial-fibrillation-assistant` prompts | STEMI/ACS/arrhythmia | Stub |
| `src/data/clinicalToolIdContract.js` | `ecgInterpretationAssistant`, `stemiPathwayAssistant`, `atrialFibrillationAssistant`, `heartFailureAssistant`, telemetry analyzers | ECG/STEMI/arrhythmia/heart failure | Stub |
| `src/pages/tools/TimelineAi.jsx` | BNP example in labs text | Heart failure/BNP | Stub |
| `backend/src/modules/medical-control-plane/intent-classifier/patterns/emergency.patterns.ts` | ACS/STEMI emergency patterns with ECG/troponin/cath lab text | ACS/STEMI | Partial |

### Category 2: Respiratory

| File path | Code element found | Scenario it maps to | State |
| --- | --- | --- | --- |
| `src/utils/news2Calculator.js` | NEWS2 score utilities | Dyspnea/respiratory deterioration | Complete |
| `src/pages/emergency/ClinicalCalculatorHub.jsx` | `news2`, respiratory category tools, `wells-pe`, `perc`, `curb-65` | Respiratory scenarios | Complete |
| `engine/triageEngine.ts` | severe respiratory complaint and SpO2 rules | Dyspnea/respiratory triage | Partial |
| `src/utils/wellsPeCalculator.js` | Wells PE scoring | Pulmonary embolism | Complete |
| `src/utils/percCalculator.js` | PERC rule implementation | Pulmonary embolism | Complete |
| `src/pages/tools/sourceBackedClinicalCalculators.jsx` | `WellsPeCalculator`, `PercCalculator` | PE | Complete |
| `src/pages/tools/emergencyCriticalCareCalculators.jsx` | `Curb65Calculator` | Pneumonia/CURB-65 | Complete |
| `src/pages/tools/pulmonologyCalculators.jsx` | asthma severity, COPD GOLD, BODE, PaO2/FiO2, ROX, PSI calculators | Asthma/COPD/pneumonia | Complete |
| `config/criticalChecklists.ts` | `respiratory-failure` checklist | Respiratory failure | Partial |

### Category 3: Neurological

| File path | Code element found | Scenario it maps to | State |
| --- | --- | --- | --- |
| `src/utils/nihssCalculator.js` | NIHSS item metadata and total/severity logic | Stroke/NIHSS | Complete |
| `src/pages/tools/sourceBackedClinicalCalculators.jsx` | `NihssCalculator` | Stroke/NIHSS | Complete |
| `config/criticalChecklists.ts` | stroke prep checklist | Stroke code prep | Partial |
| `src/utils/abcd2Calculator.js` | ABCD2 implementation | TIA | Complete |
| `src/pages/tools/abcd2Calculator.jsx` | ABCD2 calculator page | TIA | Complete |
| `src/pages/tools/emergencyCriticalCareCalculators.jsx` | `GcsCalculator` | GCS/AMS | Complete |
| `engine/triageEngine.ts` | GCS <=8 and stroke-symptom triage rules | Stroke/AMS triage | Partial |
| `src/data/emergencyPatternCatalog.js` | `Seizure / status epilepticus` pattern | Seizure/status epilepticus | Stub |
| `src/data/clinicalIntentToolCatalog.js` | `seizure-assistant`, `stroke-workflow-assistant` prompts | Seizure/stroke | Stub |
| `backend/src/modules/medical-control-plane/intent-classifier/patterns/emergency.patterns.ts` | seizure/status epilepticus emergency pattern | Seizure/status epilepticus | Stub |

### Category 4: Sepsis

| File path | Code element found | Scenario it maps to | State |
| --- | --- | --- | --- |
| `src/utils/qsofaCalculator.js` | qSOFA scoring utilities | Sepsis/qSOFA | Complete |
| `src/pages/tools/Calculators.jsx` | qSOFA calculator imported and rendered | Sepsis/qSOFA | Complete |
| `src/pages/emergency/ClinicalCalculatorHub.jsx` | qSOFA, SOFA, NEWS2 sepsis category | Sepsis workflow launcher | Complete |
| `engine/triageEngine.ts` | `hasSepsis`, P2 sepsis complaint rule | Sepsis triage | Partial |
| `backend/src/modules/medical-control-plane/tool-orchestrator/services/sofa-calculator.service.ts` | SOFA backend service | SOFA/septic shock | Partial |
| `backend/src/modules/clinical-intelligence/clinical-intelligence.service.ts` | order-set labels for lactate and blood cultures | SEP-1 bundle | Stub |
| `backend/src/modules/medical-control-plane/emergency-escalation/emergency-escalation.service.ts` | recommendation: blood cultures before antibiotics | Sepsis bundle | Stub |
| `src/utils/drugReferenceTools.js` | `antibiotic-dose-guide` coming soon | Antibiotic reference | Stub |

### Category 5: Abdominal

| File path | Code element found | Scenario it maps to | State |
| --- | --- | --- | --- |
| `lib/features/featureRegistry.ts` | `Alvarado Score` feature metadata | Appendicitis/Alvarado | Stub |
| `src/pages/emergency/ClinicalCalculatorHub.jsx` | `alvarado` feature alias but no rendered calculator mapping found | Appendicitis/Alvarado | Stub |
| `src/pages/tools/hepatologyGiCalculators.jsx` | Glasgow-Blatchford and Rockall calculators | GI bleed | Complete |
| `src/utils/hepatologyGiCalculators.js` | GI calculator scoring logic | GI bleed | Complete |
| `src/pages/tools/pr8ClinicalBatchCalculators.jsx` | `RansonCriteriaCalculator`, `BisapScoreCalculator` | Pancreatitis | Complete |
| `src/utils/ransonCriteriaCalculator.js` | Ranson criteria logic | Pancreatitis | Complete |
| `src/utils/bisapScoreCalculator.js` | BISAP score logic | Pancreatitis | Complete |
| `engine/triageEngine.ts` | abdominal pain triage rule | General abdominal pain | Partial |
| `src/data/emergencyOperatingSystem.js` | abdominal pain protocol/demo metadata | Abdominal workflow | Stub |

### Category 6: Trauma

| File path | Code element found | Scenario it maps to | State |
| --- | --- | --- | --- |
| `config/criticalChecklists.ts` | `trauma` checklist, blood products, FAST ultrasound, ATLS context | Major trauma | Partial |
| `src/pages/tools/emergencyCriticalCareCalculators.jsx` | revised trauma score, GCS | Trauma severity | Complete |
| `src/pages/emergency/ClinicalCalculatorHub.jsx` | trauma category and shock index / C-spine / ankle tools | Trauma launchers | Complete |
| `src/utils/pecarnHeadCalculator.js` | PECARN head injury rule | Head injury / CT head | Complete |
| `src/utils/canadianCSpineCalculator.js` | Canadian C-spine rule | C-spine trauma | Complete |
| `src/utils/nexusCSpineCalculator.js` | NEXUS C-spine rule | C-spine trauma | Complete |
| `src/utils/ottawaAnkleCalculator.js` | Ottawa ankle/foot rules | Fracture/ankle injury | Complete |
| `engine/triageEngine.ts` | laceration requiring repair rule | Laceration | Partial |
| `store/emergencyStore.ts` | fracture/fall mock referral and EMS fall case | Fracture/fall scenario data | Partial |

### Category 7: Mental Health

| File path | Code element found | Scenario it maps to | State |
| --- | --- | --- | --- |
| `src/pages/tools/psychiatryScreeningCalculators.jsx` | `ColumbiaSuicideSeverityWorkflow` | Suicide risk | Partial |
| `src/utils/psychiatryScreeningCalculators.js` | Columbia workflow compute function | Suicide risk | Partial |
| `src/pages/tools/mentalHealthCalculators.jsx` | PHQ-9 and GAD-7 calculator UI | Depression/anxiety | Complete |
| `src/utils/phq9Calculator.js` | PHQ-9 scoring | Depression | Complete |
| `src/utils/gad7Calculator.js` | GAD-7 scoring | Anxiety | Complete |
| `src/pages/tools/pr4aCalculators.jsx` | AUDIT-C calculator imported/rendered | Alcohol screen | Complete |
| `src/pages/tools/psychiatryScreeningCalculators.jsx` | CAGE calculator, MMSE, PCL-5, MDQ | Substance/cognitive/psych screening | Partial |
| `src/data/clinicalToolIdContract.js` | mental-health assistant and crisis/escalation tool IDs | Mental health workflow | Stub |
| `src/services/boardingIntelligenceEngine.js` | Psychiatry boarder in demo boarding state | Psychiatric boarding | Partial |
| `src/components/ReferralPanel.jsx` | Psychiatry referral department | Psychiatry consult | Partial |

### Category 8: Pediatric

| File path | Code element found | Scenario it maps to | State |
| --- | --- | --- | --- |
| `src/pages/tools/pediatricsObgynCalculators.jsx` | `PediatricEmergencyDrugCalculator`, Broselow note, drug dose table | Pediatric dosing | Complete |
| `src/utils/drugReferenceTools.js` | built pediatric dose safety checker | Pediatric dosing | Complete |
| `src/pages/tools/emergencyCriticalCareCalculators.jsx` | PEWS calculator | PEWS | Complete |
| `src/pages/tools/neurologyCalculators.jsx` | Pediatric GCS calculator | Pediatric GCS | Complete |
| `src/pages/tools/pediatricsObgynCalculators.jsx` | neonatal bilirubin, Fenton growth, pediatric BP percentile | Neonatal/pediatric reference | Partial |
| `store/emergencyStore.ts` | pt-002 fever/barking cough pediatric fixture | Croup/febrile child | Stub |
| `config/criticalChecklists.ts` | pediatric arrest checklist with Broselow item | Pediatric critical care | Partial |

### Category 9: Geriatric

| File path | Code element found | Scenario it maps to | State |
| --- | --- | --- | --- |
| `src/utils/morseFallScaleCalculator.js` | Morse fall score | Falls | Complete |
| `src/pages/tools/pr8ClinicalBatchCalculators.jsx` | `MorseFallScaleCalculator` and `BradenScaleCalculator` | Falls/frailty-adjacent screening | Complete |
| `store/emergencyStore.ts` | elderly fall EMS fixture and older adult patients | Elderly/falls | Partial |
| `src/pages/tools/psychiatryScreeningCalculators.jsx` | MMSE and MoCA placeholder workflow | Cognitive/dementia screening | Partial |
| `src/utils/psychiatryScreeningCalculators.js` | MMSE/MoCA workflow compute logic | Cognitive/dementia screening | Partial |

### Category 10: Toxicology

| File path | Code element found | Scenario it maps to | State |
| --- | --- | --- | --- |
| `store/emergencyStore.ts` | suspected opioid overdose EMS fixture | Overdose | Partial |
| `src/utils/drugReferenceTools.js` | `antidote-reference` coming soon | Antidote/toxicology | Stub |
| `backend/src/modules/medical-control-plane/intent-classifier/patterns/emergency.patterns.ts` | overdose/anaphylaxis emergency patterns | Toxicology/anaphylaxis | Stub |
| `config/criticalChecklists.ts` | `anaphylaxis` checklist with epinephrine item | Anaphylaxis | Partial |
| `src/pages/tools/pediatricsObgynCalculators.jsx` | epinephrine dosing rows | Epinephrine reference | Partial |
| `src/components/PatientCard.jsx` | backend allergy tab normalization and critical allergy display support | Allergy | Partial |

### Category 11: Operational

| File path | Code element found | Scenario it maps to | State |
| --- | --- | --- | --- |
| `engine/capacityEngine.ts` | capacity score, risk bands, boarding/EMS/reassessment deductions | Capacity/crowding | Partial |
| `store/emergencyStore.ts` | local queues, capacity, room state, admissions, discharge, EMS, alerts | Operational ED flow | Partial |
| `src/App.jsx` | `/emergency/capacity`, `/emergency/boarding`, `/emergency/queues`, `/emergency/reassessment` routes | Operational routes | Partial |
| `src/components/QueueIntelligencePanel.jsx` | queue rows, bottleneck alert rendering | Queue/wait time | Complete |
| `src/utils/longWaitRescue.js` | long wait thresholds and LWBS risk phase | LWBS/wait time | Partial |
| `src/services/boardingIntelligenceEngine.js` | boarding risk score and boarder demo data | Boarding | Partial |
| `src/pages/emergency/EmergencyAnalytics.jsx` | local fallback analytics charts | Operational analytics | Partial |
| `src/services/emergencyTransportApi.js` | guarded diversion status client disabled by capability | Diversion | Broken |
| `src/services/emergencySimulationScenariosService.js` | mass casualty, sepsis surge, EMS overload, boarding crisis scenarios | Surge/crowding | Stub |
| `src/pages/emergency/EmergencySettings.jsx` | threshold settings including EMS offload target | Operational settings | Partial |

## Notable Missing or Weak Terms

- `NEDOCS`: no active implementation found beyond operational/capacity concepts.
- `CIWA`: no calculator/workflow implementation found in active source; alcohol tools are AUDIT-C and CAGE.
- `Alvarado`: feature alias/metadata exists, but no active calculator implementation found.
- `Cincinnati Stroke Scale`: no active triage screen implementation found; stroke coverage is NIHSS/checklist/protocol metadata.
- `tPA/thrombolysis checklist`: stroke prompts/checklists exist, but no full thrombolysis eligibility workflow found.
- `Naloxone`: overdose fixture exists, but no naloxone protocol or dosing workflow found.
- `Peak flow`: asthma/COPD tooling exists, but peak-flow-specific ED workflow was not found.

## Master Gap Summary

The strongest Phase 16 coverage is calculator/tool coverage: HEART, TIMI, GRACE, Wells PE, PERC, CURB-65, NEWS2, NIHSS, ABCD2, GCS, GI bleed scores, Ranson/BISAP, PEWS, pediatric dosing, Morse falls, PHQ-9, GAD-7, and several operations calculators are present and rendered through the calculators hub or ED clinical tool surface.

The weakest Phase 16 coverage is scenario workflow depth. Many time-critical conditions have calculators and prompts, but lack complete ED scenario state: no durable protocol activation model, no checklist/timer persistence, no active bundle tracking, and no backend KPI/event source for door-to-ECG, door-to-needle, antibiotics timing, LWBS, diversion, or NEDOCS.

Priority for Phase 16.2 and beyond should be: register the complete/partial scenarios first, expose stubs honestly in the toggle panel, and build missing workflow state for STEMI, sepsis bundle, stroke code, mental health/substance use, pediatric safety, and operational LWBS/capacity.
