# Calculator Tool Mounting Report

Generated: 2026-06-12

## Scope
Audited calculator and clinical tool reachability through ED Copilot, patient complaint workflows, patient card quick actions, command palette, search, and legacy tool paths.

## Mounting Matrix

| File path | UI element name | Source page/component | Intended destination/action | Current status | Fix applied | Remaining issue |
|---|---|---|---|---|---|---|
| `src/App.jsx` | ED Copilot clinical workflow route | `EmergencyCopilotRoute` | Mount clinical tools under `/emergency/copilot` inside `AppShell` | fixed | Replaced redirect-only Copilot route with route content that renders `ClinicalCalculatorHub` | None |
| `src/pages/emergency/ClinicalCalculatorHub.jsx` | Clinical tool cards | `ClinicalCalculatorHub` | Search/filter/launch calculators with optional patient context | working | None | Broad calculator access is now inside Copilot workflow route, not exposed as a standalone library route |
| `src/pages/emergency/ClinicalCalculatorHub.jsx` | All tools button | Active calculator workspace | Clear selected tool and stay on `/emergency/copilot` | fixed | Changed from `/emergency/tools` to `/emergency/copilot` | None |
| `src/pages/emergency/ClinicalCalculatorHub.jsx` | Save Score to Patient | Calculator workspace | Write score event and note to patient timeline | working | None | Enabled only when a real patient and result exist |
| `src/pages/emergency/ClinicalCalculatorHub.jsx` | Drug Interaction Checker | Drug reference card | Render built drug checker inside Copilot workflow hub | fixed | Embedded existing `DrugChecker` for `tool=drug-check` | None |
| `src/utils/drugReferenceTools.js` | Drug Interaction Checker metadata | Command palette and Copilot tool list | Launch via `/emergency/copilot?tool=drug-check` | fixed | Removed stale `/tools/drug-checker` active path from metadata | Older registries still mention `/tools/drug-checker` and need manual review before broad rewrite |
| `src/utils/drugReferenceTools.js` | Pediatric Emergency Drug Calculator metadata | Command palette and Copilot tool list | Launch via `/emergency/copilot?tool=pediatric-dose-safety-checker` or AppShell pediatric drawer | fixed | Removed stale `/emergency/tools?tool=...` metadata | Pediatric shortcut still opens existing dedicated AppShell calculator |
| `src/layout/AppShell.jsx` | Command palette `OPEN_CALCULATOR` | `executeCommand` | Navigate to `/emergency/copilot?tool=...` | fixed | Rewired from `/emergency/tools` | None |
| `src/layout/AppShell.jsx` | Chat/Copilot `ed:open-calculator` event | AppShell event listener | Navigate to `/emergency/copilot?tool=...` | fixed | Rewired from `/emergency/tools` | None |
| `src/components/PatientCard.jsx` | Patient detail Run Score | Patient quick action | Open patient-linked calculator hub | fixed | Rewired from `/emergency/tools` to `/emergency/copilot` with `patientId` and `complaint` | None |
| `src/components/PatientCard.jsx` | Quick HEART Score | Patient score launcher | Inline calculator modal with patient save/audit | working | None | None |
| `src/components/PatientCard.jsx` | Quick qSOFA | Patient score launcher | Inline calculator modal with patient save/audit | working | None | None |
| `src/components/PatientCard.jsx` | Quick NIHSS | Patient score launcher | Inline calculator modal with patient save/audit | working | None | None |
| `src/components/ProtocolSuggestion.jsx` | Complaint protocol chips | Patient complaint workflow | Inline launch for HEART/qSOFA/NIHSS where mapped | working | None | Trauma, abdominal, respiratory, and mental health expansion remains manual review |
| `src/components/CommandPalette.jsx` | Built-in calculator commands | Command palette | Launch calculator workflow | fixed | AppShell handler now routes to mounted Copilot workflow hub | None |
| `src/data/searchFirstDiscovery.js` | Emergency OS search results | Search-first registry | Route to canonical Emergency OS surfaces | working/manual review | None | Calculator-specific search results are not first-class in default search mode |

## Complaint Workflow Coverage

| Complaint workflow | Current calculator/tool access | Status | Remaining issue |
|---|---|---|---|
| Chest Pain | HEART Score, ACS-related calculator inventory, patient quick score, command palette, Copilot hub | working | ACS workflow still spans chat/catalog metadata rather than one dedicated active page |
| Sepsis | qSOFA inline and hub, NEWS2 in hub | working/manual review | Add direct NEWS2 complaint chip if product wants it surfaced beside qSOFA |
| Stroke | NIHSS inline and hub | working | NIHSS dedicated-form vs chat-assisted metadata should be aligned later |
| Trauma | Trauma scores in hub | needs manual review | Add patient complaint chips for GCS, Shock Index, Revised Trauma Score |
| Respiratory Distress | Wells PE, PERC, ROX, PaO2/FiO2, asthma/COPD tools in hub | needs manual review | Add respiratory complaint aliases and chips |
| Abdominal Pain | Ranson, BISAP, Glasgow-Blatchford in hub | needs manual review | Add abdominal pain complaint chip mapping |
| Mental Health Crisis | PHQ-9, GAD-7, CAGE, PCL-5, Columbia workflow in hub | needs manual review | Add "Mental Health Crisis" alias to current psychiatric category patterns |

## Summary
Active calculator/tool launchers are now mounted inside the current Emergency OS layout via `/emergency/copilot`. No uncertain legacy tool files were moved because broad registry/path rewrites would affect many tests and legacy compatibility contracts.
