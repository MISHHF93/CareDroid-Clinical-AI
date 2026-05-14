# Clinical tool catalog — implementation guide

Your environment blocked applying non-markdown code changes from this chat. When you are in **Agent mode**, implement the following so every clinical capability is **discoverable in the UI** (searchable catalog + honest counts).

## What is wrong today (root cause)

- There is **no list of 188 tools** in this repository. A search for `188` returns nothing.
- The **sidebar and `/tools` overview** render only [`src/data/toolRegistry.js`](../src/data/toolRegistry.js) (**10 entries**, including calculator shortcuts).
- The **backend tool orchestrator** registers **3** executable tools (`sofa-calculator`, `drug-interactions`, `lab-interpreter`) — see [`backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.service.ts`](../backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.service.ts).
- **NLU / intent** defines **14** clinical tool patterns in [`backend/.../tool.patterns.ts`](../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts); many have **no dedicated page** in the SPA.

If you expected “188” from marketing or another product, that set must be **imported as data** (CSV/JSON) and wired to routes; it cannot be “grep’d” from this repo.

### Why you might see “almost nothing”

- **Workspace filter** on `/tools`: a custom workspace with few `toolIds` hides cards. Default **“All Tools”** shows the full registry.
- **Sidebar** only lists `toolRegistry`; intents without pages never appear there.

## Recommended fix (UX)

1. Add [`src/data/clinicalIntentToolCatalog.js`](../src/data/clinicalIntentToolCatalog.js) — export `clinicalIntentTools` (mirror the 14 `CLINICAL_TOOL_PATTERNS` rows) and `builtinUiCalculators` (the four slugs in `Calculators.jsx`). Each intent row: `toolId`, `toolName`, `category`, `description`, `path` (or `null`), optional `sidebarToolId`, optional `chatSeed`.
2. Add [`src/pages/tools/ClinicalToolCatalog.jsx`](../src/pages/tools/ClinicalToolCatalog.jsx) + CSS — searchable tables: **Browser shortcuts** (from `toolRegistry`), **Calculator UI** (`builtinUiCalculators`), **AI clinical tools** (`clinicalIntentTools`). Actions: **Open** (navigate to `path`), **Try in chat** (`setActiveTool(sidebarToolId)` + `navigate('/dashboard')`, or `addMessage` with `chatSeed` when no page).
3. Register route **`/tools/catalog`** in [`src/App.jsx`](../src/App.jsx) (lazy load the new page).
4. Update [`src/pages/tools/ToolsOverview.jsx`](../src/pages/tools/ToolsOverview.jsx): link “**Full clinical catalog**” → `/tools/catalog`; adjust header stats so **“Tools Available”** reflects what is shown (e.g. `filteredTools.length`) and add a stat for **`clinicalIntentTools.length`** (“AI tool profiles”) to avoid implying 188 shipped tools.
5. Optional: in [`src/components/Sidebar.jsx`](../src/components/Sidebar.jsx), under Clinical Tools, add buttons **Suite** → `/tools`, **Catalog** → `/tools/catalog`.

## Sync rule

When you add a row to `CLINICAL_TOOL_PATTERNS` in the backend, add the corresponding entry to `clinicalIntentToolCatalog.js` and mention it in [`docs/clinical-tools-inventory.md`](clinical-tools-inventory.md).

---

## Appendix A — `src/data/clinicalIntentToolCatalog.js` (copy into repo)

Save the following as `src/data/clinicalIntentToolCatalog.js`:

```javascript
/**
 * Catalog of clinical tools the NLU layer can recognize (mirrors backend patterns).
 * Keep in sync with:
 * backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts
 */

export const clinicalIntentTools = [
  { toolId: 'sofa-calculator', toolName: 'SOFA Score Calculator', category: 'calculator', description: 'Sequential Organ Failure Assessment (ICU sepsis / organ dysfunction).', path: '/tools/calculator/sofa', sidebarToolId: 'sofa-score' },
  { toolId: 'apache2-calculator', toolName: 'APACHE-II Score', category: 'calculator', description: 'ICU mortality prediction (no dedicated calculator page yet).', path: null, sidebarToolId: null, chatSeed: 'Help me estimate an APACHE-II score. I will provide age, vitals, labs, and GCS as available.' },
  { toolId: 'cha2ds2vasc-calculator', toolName: 'CHA2DS2-VASc Score', category: 'calculator', description: 'Stroke risk in non-valvular atrial fibrillation.', path: '/tools/calculator/chads2vasc', sidebarToolId: 'calc-chads2vasc' },
  { toolId: 'curb65-calculator', toolName: 'CURB-65 Score', category: 'calculator', description: 'CAP severity (no dedicated calculator page yet).', path: null, sidebarToolId: null, chatSeed: 'Help me apply CURB-65 for pneumonia severity using confusion, urea, RR, BP, and age.' },
  { toolId: 'gcs-calculator', toolName: 'Glasgow Coma Scale', category: 'calculator', description: 'Level of consciousness scoring.', path: null, sidebarToolId: null, chatSeed: 'Help me score and interpret the Glasgow Coma Scale from eye, verbal, and motor responses.' },
  { toolId: 'wells-dvt-calculator', toolName: 'Wells DVT Score', category: 'calculator', description: 'Pre-test probability for DVT.', path: null, sidebarToolId: null, chatSeed: 'Help me complete a Wells score for suspected DVT using my clinical findings.' },
  { toolId: 'drug-interactions', toolName: 'Drug Interaction Checker', category: 'checker', description: 'Drug–drug interaction and contraindication context.', path: '/tools/drug-checker', sidebarToolId: 'drug-check' },
  { toolId: 'dose-calculator', toolName: 'Medication Dose Calculator', category: 'calculator', description: 'Dosing from patient factors.', path: '/tools/calculators', sidebarToolId: 'calculators' },
  { toolId: 'lab-interpreter', toolName: 'Lab Results Interpreter', category: 'interpreter', description: 'Interpretation of labs and panels.', path: '/tools/lab-interpreter', sidebarToolId: 'lab-interp' },
  { toolId: 'abg-interpreter', toolName: 'ABG Interpreter', category: 'interpreter', description: 'ABG and acid–base (closest page: Lab Interpreter).', path: '/tools/lab-interpreter', sidebarToolId: 'lab-interp' },
  { toolId: 'protocol-lookup', toolName: 'Clinical Protocol Lookup', category: 'protocol', description: 'Evidence-based protocols and pathways.', path: '/tools/protocols', sidebarToolId: 'protocols' },
  { toolId: 'acls-protocol', toolName: 'ACLS Protocol', category: 'protocol', description: 'Resuscitation algorithms.', path: '/tools/protocols', sidebarToolId: 'protocols' },
  { toolId: 'atls-protocol', toolName: 'ATLS Protocol', category: 'protocol', description: 'Trauma algorithms.', path: '/tools/protocols', sidebarToolId: 'protocols' },
  { toolId: 'differential-diagnosis', toolName: 'Differential Diagnosis Generator', category: 'reference', description: 'Symptom-based differentials.', path: '/tools/diagnosis', sidebarToolId: 'diagnosis' },
  { toolId: 'antibiotic-guide', toolName: 'Antibiotic Selection Guide', category: 'reference', description: 'Empiric antimicrobial choice.', path: '/tools/diagnosis', sidebarToolId: 'diagnosis' },
];

export const builtinUiCalculators = [
  { id: 'sofa', name: 'SOFA Score', description: 'ICU organ dysfunction.', path: '/tools/calculator/sofa', calcQuery: '/tools/calculators?calc=sofa', implementation: 'UI + POST /api/tools/sofa-calculator/execute' },
  { id: 'gfr', name: 'eGFR (CKD-EPI)', description: 'Kidney function estimate.', path: '/tools/calculator/gfr', calcQuery: '/tools/calculators?calc=gfr', implementation: 'Client-side in Calculators.jsx' },
  { id: 'bmi', name: 'BMI', description: 'Body mass index.', path: '/tools/calculator/bmi', calcQuery: '/tools/calculators?calc=bmi', implementation: 'Client-side in Calculators.jsx' },
  { id: 'chads2vasc', name: 'CHA2DS2-VASc', description: 'AF stroke risk.', path: '/tools/calculator/chads2vasc', calcQuery: '/tools/calculators?calc=chads2vasc', implementation: 'Client-side in Calculators.jsx' },
];
```

## Appendix B — Counts to show users (honest copy)

| Layer | Approximate count | Where |
|--------|-------------------|--------|
| Sidebar / suite shortcuts | 10 | `toolRegistry.js` |
| Calculator UIs with forms | 4 | `Calculators.jsx` `CALCULATORS` |
| Backend executable tools | 3 | `ToolOrchestratorService.initializeRegistry` |
| NLU clinical tool profiles | 14 | `CLINICAL_TOOL_PATTERNS` |

If you need **188** (or any large number), that is a **content import** task: add a JSON catalog, pagination, and routing strategy; it is not discoverable by grepping this repo today.
