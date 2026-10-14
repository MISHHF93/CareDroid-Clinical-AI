# CareDroid — Clinical Evidence, Literature & Academic Claims Register

**Document Version:** 3.0.0  
**Status:** Authoritative Evidence Register & External Claims Guardrails  
**Lead Authors:** Medical Informatics Director, Emergency Medicine Physician Lead, Chief AI Ethicist  
**Classification:** Enterprise Healthcare Architecture & Regulatory Diligence  

---

## 1. Executive Summary & Evidence Mandate

CareDroid operates as a high-reliability clinical decision support (CDS) and healthcare operations platform. To maintain absolute clinical integrity, withstand technical and regulatory due diligence, and eliminate liability from ungrounded marketing claims, every algorithm, clinical calculator, risk score, and external institutional relationship is strictly bound by this register.

### Core Evidentiary Principles:
1. **Deterministic Calculation Isolation:** Validated medical scoring algorithms (CTAS, Wells, PERC, HEART, GCS, Pediatric Dosing) run on deterministic, property-tested TypeScript engines with zero stochastic generative variance.
2. **Citation Provenance:** Every calculator output, risk band, and clinical recommendation surfaces its underlying peer-reviewed literature source, publication DOI, and level of evidence.
3. **Explicit Academic & Institutional Guardrails:** External research collaborations, university projects, and hospital exploratory discussions are documented with strict, enforceable boundaries to prevent misrepresentation to investors, regulators, or clinical partners.

---

## 2. Validated Clinical Scoring Evidence Base

| Calculator / Protocol | Primary Reference & Publication | Level of Evidence | Validated Thresholds & Clinical Scoring Bands | CareDroid Implementation Service |
| :--- | :--- | :--- | :--- | :--- |
| **Canadian Triage & Acuity Scale (CTAS)** | Beveridge R, et al. *Implementation of the Canadian Emergency Department Triage and Acuity Scale (CTAS) guidelines*. CJEM. 1999;1(3):2-10. Bullard MJ, et al. *Revisions to the CTAS guidelines*. CJEM. 2017;19(S2):S18-S27. | **Level 1** (National Canadian Standard) | • CTAS 1: Resuscitation (immediate)<br>• CTAS 2: Emergent (≤15 min)<br>• CTAS 3: Urgent (≤30 min)<br>• CTAS 4: Less Urgent (≤60 min)<br>• CTAS 5: Non-Urgent (≤120 min) | `src/services/triageEngine.ts`<br>`src/engine/triageAcuity.ts` |
| **Emergency Severity Index (ESI v4)** | Gilboy N, et al. *Emergency Severity Index (ESI): A Triage Tool for Emergency Department Care, Version 4*. Implementation Handbook. AHRQ Pub. No. 12-0014. | **Level 1** (US Standard) | 5-level acuity algorithm based on acuity, vitals stability, and expected resource utilization. | `src/engine/triageAcuity.ts` |
| **Wells Score for Pulmonary Embolism (PE)** | Wells PS, et al. *Excluding pulmonary embolism at the bedside without diagnostic imaging: management of patients with suspected PE presenting to the emergency department by using a simple clinical model and d-dimer*. Ann Intern Med. 2001;135(2):98-107. | **Level 1** (Multi-center Prospective) | • Score > 4.0: PE Likely (consider CTA)<br>• Score ≤ 4.0: PE Unlikely (consider D-dimer / PERC) | `backend/src/modules/medical-control-plane/tool-orchestrator/tools/clinical-calculator.tool.ts`<br>`src/pages/tools/Calculators.tsx` |
| **Wells Score for Deep Vein Thrombosis (DVT)** | Wells PS, et al. *Evaluation of D-dimer in the diagnosis of suspected deep-vein thrombosis*. N Engl J Med. 2003;349(13):1227-1235. | **Level 1** (Prospective Derivation & Validation) | • Score ≥ 2: DVT Likely<br>• Score < 2: DVT Unlikely | `src/pages/tools/Calculators.tsx` |
| **Pulmonary Embolism Rule-out Criteria (PERC)** | Kline JA, et al. *Clinical criteria to prevent unnecessary diagnostic testing in emergency department patients with suspected pulmonary embolism*. J Thromb Haemost. 2004;2(8):1247-1255. | **Level 1** (Prospective Multi-center) | 8 clinical criteria all negative: PE ruled out (<1.8% risk) without D-dimer or radiation exposure. | `src/pages/tools/Calculators.tsx` |
| **HEART Score for Major Adverse Cardiac Events (MACE)** | Six AJ, et al. *Chest pain in the emergency room: value of the HEART score*. Neth Heart J. 2008;16(6):191-196. Backus BE, et al. *Chest pain in the emergency department: a multicenter validation of the HEART Score*. Crit Pathw Cardiol. 2010;9(3):164-169. | **Level 1** (Prospective International Validation) | • Score 0–3: Low risk (0.9–1.7% 6-wk MACE; safe for early discharge)<br>• Score 4–6: Moderate risk (12–16.6%; admit/observe)<br>• Score 7–10: High risk (50–65%; urgent intervention) | `src/pages/tools/Calculators.tsx` |
| **Glasgow Coma Scale (GCS)** | Teasdale G, Jennett B. *Assessment of coma and impaired consciousness: a practical scale*. Lancet. 1974;2(7872):81-84. | **Level 1** (Global Trauma Standard) | Eye (1–4), Verbal (1–5), Motor (1–6); Total 3–15. Severe head injury: GCS ≤ 8 (triggers intubation alert). | `src/pages/tools/Calculators.tsx` |
| **Sequential Organ Failure Assessment (SOFA)** | Vincent JL, et al. *The SOFA (Sepsis-related Organ Failure Assessment) score to describe organ dysfunction/failure*. Intensive Care Med. 1996;22(7):707-710. Singer M, et al. *The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3)*. JAMA. 2016;315(8):801-810. | **Level 1** (International Consensus) | 0–24 score across 6 organ systems; acute change ≥ 2 points indicates in-hospital mortality risk > 10%. | `backend/src/modules/medical-control-plane/tool-orchestrator/tools/sofa-calculator.tool.ts` |
| **Quick SOFA (qSOFA)** | Seymour CW, et al. *Assessment of Clinical Criteria for Sepsis: For the Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3)*. JAMA. 2016;315(8):762-774. | **Level 1** (Large Retrospective / Prospective) | Bedside score (0–3): SBP ≤ 100, RR ≥ 22, Altered mentation (GCS < 15). Score ≥ 2 triggers **hard platform priority lock** preventing AI priority downgrade. | `src/engine/reassessmentEngine.ts`<br>`backend/src/modules/deterioration` |
| **National Early Warning Score 2 (NEWS2)** | Royal College of Physicians. *National Early Warning Score (NEWS) 2: Standardising the assessment of acute-illness severity in the NHS*. Report of a working party. London: RCP, 2017. | **Level 1** (National Health Standard) | Aggregate score 0–20. NEWS2 ≥ 7 triggers immediate critical resuscitation team dispatch. | `src/engine/reassessmentEngine.ts` |
| **Pediatric Weight-Based Medication Formularies** | Canadian Paediatric Society (CPS) *Position Statements and Practice Points*. Lexicomp *Pediatric & Neonatal Dosage Handbook*. 31st ed. Wolters Kluwer; 2024. | **Level 1** (Formulary Consensus Standard) | Weight-based mg/kg/dose or mg/kg/day with mandatory adult single-dose and 24-hour maximum hard stops. | `src/pages/tools/Calculators.tsx`<br>`src/services/clinicalOrchestratorApi.ts` |

---

## 3. Academic Collaborations & Research Scope Boundaries

To prevent misleading claims during technical due diligence, commercial discussions, and investor presentations, CareDroid maintains clear, explicit boundaries regarding academic affiliations:

### 3.1 Riipen Project Engagement
- **Nature of Relationship:** CareDroid participates in select experiential learning projects hosted on the Riipen platform.
- **Scope:** Student-led market research, interface user-testing feedback, and prototype exploration.
- **Explicit Boundary:** Riipen projects represent student academic coursework. They **do not** constitute institutional sponsorship, clinical research trials, software validation endorsements, or commercial commitments from Riipen or its participating academic institutions.

### 3.2 London Metropolitan University
- **Nature of Relationship:** Academic collaboration on student informatics research and software systems architectural evaluation.
- **Scope:** Research papers, simulated synthetic testing methodologies, and architectural code analysis.
- **Explicit Boundary:** London Metropolitan University is an academic research collaborator. The university **does not** endorse clinical efficacy, does not provide patient data, has not conducted clinical trials, and is not liable for commercial platform operations.

### 3.3 Arizona State University (ASU) PhD Team
- **Nature of Relationship:** Advanced research exploration in AI decision support systems, cognitive workload modeling, and distributed agent architectures.
- **Scope:** Theoretical modeling, mathematical optimization of emergency room patient flow, and publication of peer-reviewed computational methodologies.
- **Explicit Boundary:** ASU researchers participate in an academic and scientific advisory capacity. This relationship **does not** constitute an institutional clinical trial, FDA/Health Canada investigational device study (IDE/ITA), or official university commercial endorsement.

---

## 4. Healthcare System Discovery & Engagement Boundaries

CareDroid engages with leading healthcare institutions to observe acute care workflows and refine its user-centered design. The following boundaries delineate informal discovery from binding institutional agreements:

### 4.1 Humber River Health (Toronto, ON)
- **Status:** Preliminary Technology Discovery & Digital Workflow Observation.
- **Permitted Scope:** Discussion with digital health and innovation stakeholders regarding command-centre workflows, closed-loop communications, and acute care bottleneck analysis.
- **Strict Guardrails:**
  - **No Active Clinical Trial:** CareDroid is not deployed in active clinical trials at Humber River Health.
  - **No Patient Data:** Zero Humber River Health patient records, PHI, or telemetry have been accessed or processed.
  - **No Enterprise Procurement Contract:** Discovery dialogues do not constitute an executed Master Services Agreement (MSA) or software purchase order.

### 4.2 Sinai Health (Toronto, ON)
- **Status:** Exploratory Clinical Workflow Dialogue.
- **Permitted Scope:** Information gathering with emergency department clinical leaders regarding triage cognitive load, documentation friction, and resident workflow efficiency.
- **Strict Guardrails:**
  - **No Binding Commercial Agreement:** No commercial contract or software deployment agreement is executed.
  - **No Institutional Review Board (IRB) Clearance:** No active human-subjects research protocol is active under Sinai Health's Research Ethics Board (REB).
  - All requirements gathered represent voluntary clinical observations without institutional endorsement.

### 4.3 University Health Network (UHN, Toronto, ON)
- **Status:** Academic, Clinical Informatics & Symposium Dialogue.
- **Permitted Scope:** Participation in healthcare innovation symposia, general academic feedback on AI safety architectures, and public medical informatics discussions.
- **Strict Guardrails:**
  - CareDroid is an independent corporate entity. UHN is **not** an investor, commercial partner, or regulatory sponsor.
  - No deployment of CareDroid software within UHN hospitals (Toronto General, Toronto Western, Princess Margaret, etc.) is authorized without formal RFP award, REB clearance, and executed institutional data-sharing agreements.

---

## 5. Regulatory Claim Boundaries & Prohibited Statements

Under Health Canada, US FDA, and international medical device regulations, CareDroid strictly enforces the following claim boundaries across all corporate, technical, and marketing collateral:

### Prohibited Claims:
1. **Autonomous Medical Diagnosis:** CareDroid must NEVER be described as "diagnosing diseases," "curing conditions," or "replacing physicians." CareDroid is an assistive clinical decision support and healthcare operations tool.
2. **Autonomous Prescribing:** CareDroid must NEVER claim to "prescribe medications" or "adjust dosages autonomously." All dosing calculators provide calculated recommendations requiring explicit licensed practitioner verification and sign-off.
3. **FDA / Health Canada Clearance Status:** CareDroid must NEVER state that it is "approved" or "cleared" by Health Canada or the US FDA until formal 510(k), De Novo, or Medical Device Licence (MDL) documentation has been officially granted. Current status must be accurately described as *"Designed for Class II SaMD and Section 520(o) Non-Device CDS regulatory alignment."*
4. **Guaranteed Wait-Time Reductions:** Marketing materials must never guarantee absolute metric improvements (e.g. "Guaranteed 50% drop in door-to-doctor time"). Claims must refer to "targeted pilot metrics" or "modeled operational capacity enhancements."

---

*This Evidence Register is subject to quarterly review by the CareDroid Clinical Governance Committee.*

