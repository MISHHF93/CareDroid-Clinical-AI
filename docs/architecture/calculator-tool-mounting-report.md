# Calculator Tool Mounting Report

Generated: 2026-06-12

## Scope
Audited calculator and clinical tool reachability through ED Copilot, Medical Tools, patient complaint workflows, patient card quick actions, command palette, search, and legacy tool paths.

## Current Route Contract

- `/emergency/tools` is the active Medical Tools route owner.
- Calculator intent opens `/emergency/tools?source=calculators&filter=calculator`, with optional `q`, `open`, and `patientId` query parameters.
- `/emergency/copilot` is the active ED Copilot/chat-assisted route. It can seed guidance, but it is no longer the calculator library route.
- Legacy calculator paths such as `/tools/calculators/:slug`, `/calculators`, and `/scores/*` redirect into `/emergency/tools` with calculator query parameters.

## Mounting Matrix

| File path | UI element name | Source page/component | Intended destination/action | Current status | Fix applied | Remaining issue |
|---|---|---|---|---|---|---|
| `src/App.jsx` | Medical Tools route | `ToolsOverview` | Mount tools and calculator intent under `/emergency/tools` inside `AppShell` | fixed | Canonical route owns Medical Tools; legacy `/tools`, `/calculators`, and score paths redirect into it | None |
| `src/pages/tools/ToolsOverview.jsx` | Clinical tool cards | `ToolsOverview` + `ClinicalCalculatorHub` | Search/filter/launch calculators with optional patient context | working | Calculator hub is embedded when calculator search params indicate calculator intent | None |
| `src/components/ClinicalCalculatorHub.tsx` | All tools button | Active calculator workspace | Clear selected tool and stay on `/emergency/tools` | fixed | Calculator intent now stays inside Medical Tools route | None |
| `src/pages/emergency/ClinicalCalculatorHub.jsx` | Save Score to Patient | Calculator workspace | Write score event and note to patient timeline | working | None | Enabled only when a real patient and result exist |
| `src/pages/emergency/ClinicalCalculatorHub.jsx` | Drug Interaction Checker | Drug reference card | Render built drug checker inside Copilot workflow hub | fixed | Embedded existing `DrugChecker` for `tool=drug-check` | None |
| `src/utils/drugReferenceTools.js` | Drug Interaction Checker metadata | Command palette and Copilot tool list | Launch via `/emergency/copilot?tool=drug-check` | fixed | Removed stale `/tools/drug-checker` active path from metadata | Older registries still mention `/tools/drug-checker` and need manual review before broad rewrite |
| `src/utils/drugReferenceTools.js` | Pediatric Emergency Drug Calculator metadata | Command palette and Copilot tool list | Launch via `/emergency/copilot?tool=pediatric-dose-safety-checker` or AppShell pediatric drawer | fixed | Removed stale `/emergency/tools?tool=...` metadata | Pediatric shortcut still opens existing dedicated AppShell calculator |
| `src/App.jsx` / `src/components/AppShell.tsx` | Command palette `OPEN_CALCULATOR` | command/event handlers | Navigate to `/emergency/tools?source=calculators&filter=calculator` with context | fixed | Rewired calculator launchers to Medical Tools calculator intent | None |
| `src/App.jsx` / `src/components/AppShell.tsx` | Chat/Copilot `ed:open-calculator` event | AppShell event listener | Navigate to `/emergency/tools?source=calculators&filter=calculator&open=...` | fixed | Calculator events preserve source, filter, `q`, `open`, and patient context | None |
| `src/components/PatientCard.jsx` | Patient detail Run Score | Patient quick action | Open patient-linked calculator hub | fixed | Routes to `/emergency/tools` with `patientId` and complaint/calculator context | None |
| `src/components/PatientCard.jsx` | Quick HEART Score | Patient score launcher | Inline calculator modal with patient save/audit | working | None | None |
| `src/components/PatientCard.jsx` | Quick qSOFA | Patient score launcher | Inline calculator modal with patient save/audit | working | None | None |
| `src/components/PatientCard.jsx` | Quick NIHSS | Patient score launcher | Inline calculator modal with patient save/audit | working | None | None |
| `src/components/ProtocolSuggestion.jsx` | Complaint protocol chips | Patient complaint workflow | Inline launch for HEART/qSOFA/NIHSS where mapped | working | None | Trauma, abdominal, respiratory, and mental health expansion remains manual review |
| `src/components/CommandPalette.jsx` | Built-in calculator commands | Command palette | Launch calculator workflow | fixed | AppShell handler now routes to `/emergency/tools?source=calculators&filter=calculator` | None |
| `src/data/searchFirstDiscovery.js` | Emergency OS search results | Search-first registry | Route to canonical Emergency OS surfaces | working/manual review | None | Calculator-specific search results are not first-class in default search mode |

## Complaint Workflow Coverage

| Complaint workflow | Current calculator/tool access | Status | Remaining issue |
|---|---|---|---|
| Chest Pain | HEART Score, ACS-related calculator inventory, patient quick score, command palette, Medical Tools hub | working | ACS workflow still spans chat/catalog metadata rather than one dedicated active page |
| Sepsis | qSOFA inline and hub, NEWS2 in hub | working/manual review | Add direct NEWS2 complaint chip if product wants it surfaced beside qSOFA |
| Stroke | NIHSS inline and hub | working | NIHSS dedicated-form vs chat-assisted metadata should be aligned later |
| Trauma | Trauma scores in hub | needs manual review | Add patient complaint chips for GCS, Shock Index, Revised Trauma Score |
| Respiratory Distress | Wells PE, PERC, ROX, PaO2/FiO2, asthma/COPD tools in hub | needs manual review | Add respiratory complaint aliases and chips |
| Abdominal Pain | Ranson, BISAP, Glasgow-Blatchford in hub | needs manual review | Add abdominal pain complaint chip mapping |
| Mental Health Crisis | PHQ-9, GAD-7, CAGE, PCL-5, Columbia workflow in hub | needs manual review | Add "Mental Health Crisis" alias to current psychiatric category patterns |

## Summary
Active calculator/tool launchers are mounted inside the current Emergency OS layout via `/emergency/tools`. ED Copilot remains available for chat-assisted guidance, while calculator deep links, command palette calculator commands, patient-context score launches, and registry launches converge on the Medical Tools calculator surface. No uncertain legacy tool files were moved because broad registry/path rewrites would affect many tests and legacy compatibility contracts.
