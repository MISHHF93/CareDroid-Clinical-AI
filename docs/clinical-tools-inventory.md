# Clinical tools and calculators inventory

This document is a **living inventory** of clinical tools and medical calculators that exist **in the CareDroid application UI** today. Use it to plan feature upgrades, risk management, and alignment with standards and certifications your organization applies (specific ISO clauses and claims are **out of scope** here—only traceability placeholders).

**Canonical UI sources:** [`src/data/toolRegistry.js`](../src/data/toolRegistry.js) (sidebar and deep links) and [`src/pages/tools/Calculators.jsx`](../src/pages/tools/Calculators.jsx) (implemented calculator list and logic). Routes: [`src/App.jsx`](../src/App.jsx).

**Maintenance:** When you add or change a tool or calculator, update `toolRegistry.js`, `Calculators.jsx` (if applicable), routes in `App.jsx`, and **this file** so the inventory stays accurate.

---

## Distinct full-page clinical tools

Primary user-facing tools (each has a dedicated page component under `src/pages/tools/`, except the hub which is `Calculators.jsx`).

| Registry id | Display name | Route | Registry category | Primary implementation |
|-------------|--------------|-------|---------------------|-------------------------|
| `drug-check` | Drug Checker | `/tools/drug-checker` | Diagnostic | [`src/pages/tools/DrugChecker.jsx`](../src/pages/tools/DrugChecker.jsx) |
| `lab-interp` | Lab Interpreter | `/tools/lab-interpreter` | Diagnostic | [`src/pages/tools/LabInterpreter.jsx`](../src/pages/tools/LabInterpreter.jsx) |
| `protocols` | Clinical Protocols | `/tools/protocols` | Reference | [`src/pages/tools/Protocols.jsx`](../src/pages/tools/Protocols.jsx) |
| `diagnosis` | Diagnosis Assistant | `/tools/diagnosis` | Diagnostic | [`src/pages/tools/DiagnosisAssistant.jsx`](../src/pages/tools/DiagnosisAssistant.jsx) |
| `procedures` | Procedure Guide | `/tools/procedures` | Reference | [`src/pages/tools/ProcedureGuide.jsx`](../src/pages/tools/ProcedureGuide.jsx) |
| `calculators` | Medical Calculators (hub) | `/tools/calculators` | Calculator | [`src/pages/tools/Calculators.jsx`](../src/pages/tools/Calculators.jsx) |

**Tools overview:** [`/tools`](../src/App.jsx) → [`src/pages/tools/ToolsOverview.jsx`](../src/pages/tools/ToolsOverview.jsx) lists tools from the same registry (“Clinical Tools Suite”).

---

## Sidebar registry (complete list)

Every entry in `toolRegistry` (including shortcuts that open the calculators page with a pre-selected calculator).

| id | Name | Path | Category | Notes |
|----|------|------|----------|-------|
| `drug-check` | Drug Checker | `/tools/drug-checker` | Diagnostic | Full page |
| `lab-interp` | Lab Interpreter | `/tools/lab-interpreter` | Diagnostic | Full page |
| `sofa-score` | SOFA Score | `/tools/calculator/sofa` | Calculator | Opens calculators UI with SOFA selected (`panelTool: calculators`, `initialCalc: sofa`) |
| `calc-gfr` | eGFR (CKD-EPI) | `/tools/calculator/gfr` | Calculator | Opens calculators UI with eGFR selected (`initialCalc: gfr`) |
| `calc-bmi` | BMI | `/tools/calculator/bmi` | Calculator | Opens calculators UI with BMI selected (`initialCalc: bmi`) |
| `calc-chads2vasc` | CHA₂DS₂-VASc | `/tools/calculator/chads2vasc` | Calculator | Opens calculators UI with CHA₂DS₂-VASc selected (`initialCalc: chads2vasc`) |
| `calculators` | All calculators | `/tools/calculators` | Calculator | Hub; optional query `?calc=<slug>` (see below) |
| `protocols` | Clinical Protocols | `/tools/protocols` | Reference | Full page |
| `diagnosis` | Diagnosis Assistant | `/tools/diagnosis` | Diagnostic | Full page |
| `procedures` | Procedure Guide | `/tools/procedures` | Reference | Full page |

Legacy dashboard query params and redirects are handled in [`src/pages/Dashboard.jsx`](../src/pages/Dashboard.jsx); prefer the `/tools/...` routes above.

---

## Medical calculators (implemented)

Defined by the `CALCULATORS` array in [`Calculators.jsx`](../src/pages/tools/Calculators.jsx).

| Slug (`id`) | Name | In-app description / grouping | Routes | Implementation note |
|-------------|------|------------------------------|--------|---------------------|
| `sofa` | SOFA Score | Sequential Organ Failure Assessment for ICU patients; category **ICU/Critical Care** | Hub: `/tools/calculators?calc=sofa` · Deep link: `/tools/calculator/sofa` | Uses backend **`POST /api/tools/sofa-calculator/execute`** via `apiFetch` in `Calculators.jsx` |
| `gfr` | eGFR Calculator | Estimated Glomerular Filtration Rate (CKD-EPI); category **Renal** | `/tools/calculators?calc=gfr` · `/tools/calculator/gfr` | **Client-side** CKD-EPI-style calculation in `GFRCalculator` (no tool execute API in this file) |
| `bmi` | BMI Calculator | Body Mass Index and weight classification; category **General** | `/tools/calculators?calc=bmi` · `/tools/calculator/bmi` | **Client-side** in `BMICalculator` |
| `chads2vasc` | CHA2DS2-VASc | Stroke risk in atrial fibrillation; category **Cardiology** | `/tools/calculators?calc=chads2vasc` · `/tools/calculator/chads2vasc` | **Client-side** in `CHA2DS2VAScCalculator` |

---

## Standards and certification traceability (template)

No compliance claims are made here. Fill cells as your QMS / regulatory program requires (examples of common frameworks: **ISO 14971** risk management, **IEC 62304** software lifecycle, **ISO 13485** QMS, **ISO 27799** health informatics security, **HIPAA / GDPR** privacy, **SaMD** labeling and intended use).

| Entity id | ISO 14971 | IEC 62304 | ISO 13485 | ISO 27799 | HIPAA / GDPR | SaMD / labeling |
|-------------|-----------|-----------|-----------|-----------|----------------|-----------------|
| `drug-check` | TBD | TBD | TBD | TBD | TBD | TBD |
| `lab-interp` | TBD | TBD | TBD | TBD | TBD | TBD |
| `protocols` | TBD | TBD | TBD | TBD | TBD | TBD |
| `diagnosis` | TBD | TBD | TBD | TBD | TBD | TBD |
| `procedures` | TBD | TBD | TBD | TBD | TBD | TBD |
| `calculators` (hub) | TBD | TBD | TBD | TBD | TBD | TBD |
| Calculator `sofa` | TBD | TBD | TBD | TBD | TBD | TBD |
| Calculator `gfr` | TBD | TBD | TBD | TBD | TBD | TBD |
| Calculator `bmi` | TBD | TBD | TBD | TBD | TBD | TBD |
| Calculator `chads2vasc` | TBD | TBD | TBD | TBD | TBD | TBD |

---

## Known mismatches (UI vs copy, feature inventory, backend intents)

These items are **not** duplicates of the tables above; they flag drift for alignment work (marketing, AI responses, intent routing vs shipped UI).

- **[`src/data/featureInventory.js`](../src/data/featureInventory.js)** — The “Medical Calculators” entry describes **“SOFA, APACHE, CHA2DS2-VASc”**. The UI `CALCULATORS` list includes **SOFA, eGFR, BMI, CHA2DS2-VASc** only; **APACHE is not implemented** in `Calculators.jsx`.
- **Backend chat** — [`backend/src/modules/chat/chat.service.ts`](../backend/src/modules/chat/chat.service.ts) example text lists calculators such as **APACHE-II, CURB-65, qSOFA** among options; those are **not** all present as selectable calculators in the frontend `CALCULATORS` array.
- **Medical control plane / intent patterns** — [`backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts`](../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts) defines patterns for tools such as **`apache2-calculator`**, **`curb65-calculator`**, **`gcs-calculator`**, **`wells-dvt-calculator`**, **`dose-calculator`**, **`abg-interpreter`**, **`protocol-lookup`**, **`acls-protocol`**, **`atls-protocol`**, **`differential-diagnosis`**, **`antibiotic-guide`**, etc. Many of these **do not** map 1:1 to a dedicated `/tools/...` page in `App.jsx` or to the four calculator slugs in the UI. **`sofa-calculator`** and **`cha2ds2vasc-calculator`** align conceptually with UI calculators; **`lab-interpreter`** aligns with the Lab Interpreter page; **`drug-interactions`** is related to Drug Checker but uses a different id string than `drug-check`.

Use this section to decide whether to **add UI/tools**, **narrow AI and pattern catalogs** to match shipped tools, or **document** intentional backend-only behavior.
