# Manual QA checklist — Production hardening

Executable checklist for pre-release smoke. Source of truth in code: `src/data/e2eManualQaChecklist.js` (`flattenManualQaChecklist()`).

**Environment:** Staging or production-like build with auth enabled.  
**Duration:** ~45–60 minutes full pass; ~15 minutes minimum smoke.

---

## 1. Authentication and shell

| ID | Steps | Expected | Pass |
|----|-------|----------|------|
| login-dashboard | Sign in → dashboard → open sidebar tools | Shell loads; no console errors on navigation | ☐ |
| tools-overview | Navigate to `/tools` and `/tools/catalog` | Overview and catalog render; search/filter work | ☐ |

---

## 2. Tier A calculators (dedicated forms)

| ID | Steps | Expected | Pass |
|----|-------|----------|------|
| tier-a-disclaimer | Open PHQ-9, HAS-BLED, SOFA, ASCVD; check lead + results | Decision-support disclaimer; no treatment orders | ☐ |
| phq9-q9 | PHQ-9: set question 9 > 0 before completing | Crisis/safety messaging; screening-only framing | ☐ |
| calc-reset | Calculate → Reset on 3 Tier A tools | Inputs clear; results hidden | ☐ |

---

## 3. Tier B chat-assisted (hub launch)

| ID | Steps | Expected | Pass |
|----|-------|----------|------|
| hub-launch | Catalog → Wells PE, PERC, NIHSS, dispatch-ai | Hub/fleet path; chat seed pre-filled; orchestrator null except Tier C | ☐ |
| pe-acs-language | Wells PE / GRACE chat with sample data | No “PE ruled out” or definitive ACS diagnosis | ☐ |

---

## 4. Tier C backend executors

| ID | Steps | Expected | Pass |
|----|-------|----------|------|
| drug-checker | ≥2 medications → check | Results + disclaimer; no dose prescriptions | ☐ |
| lab-interpreter | Sample panel → interpret | Interpretation + footer disclaimer | ☐ |
| sofa-executor | SOFA page with sample vitals | Score returns; page disclaimer visible | ☐ |

---

## 5. Clinical AI pages

| ID | Steps | Expected | Pass |
|----|-------|----------|------|
| diagnosis-procedures | `/tools/diagnosis`, `/tools/procedures` + sample prompt | AI disclaimer; review framing | ☐ |
| protocols | `/tools/protocols` + ACLS summary request | Guideline support; no autonomous orders | ☐ |

---

## 6. Fleet and dispatch

| ID | Steps | Expected | Pass |
|----|-------|----------|------|
| fleet-disclaimer | Fleet Command, Route Optimizer, Predictive Maintenance | Operational decision-support disclaimer | ☐ |
| dispatch-chat | dispatch-ai from catalog | Human approval in seed; no auto-dispatch language | ☐ |

---

## 7. NLU and aliases (chat)

| ID | Steps | Expected | Pass |
|----|-------|----------|------|
| alias-phrases | Chat: “PHQ9”, “bleeding risk”, “sofa calculator”, “drug interactions” | Correct tool/route; no phantom launches | ☐ |

---

## 8. Routing edge cases

| ID | Steps | Expected | Pass |
|----|-------|----------|------|
| invalid-tool-path | Visit `/tools/not-a-real-tool-xyz` | ToolsAreaFallback / not-found; not dashboard | ☐ |
| fleet-invalid | Visit `/fleet/not-real` | Fleet/tools fallback | ☐ |

---

## Sign-off

| Tester | Build / commit | Date | Result |
|--------|----------------|------|--------|
| | | | ☐ Pass  ☐ Fail |

**Failures (link tickets):**

---
