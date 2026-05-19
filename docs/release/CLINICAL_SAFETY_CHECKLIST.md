# Clinical safety checklist — release gate

Canonical automation: `npm run test:safety-compliance`  
Reference: `docs/clinical-safety-compliance.md`, `src/data/clinicalSafetyGuardrails.js`

## Decision support framing

- [ ] Every clinical tool surface states **decision support only** (not diagnosis)
- [ ] `ToolPageLayout` renders `ClinicalDecisionSupportDisclaimer` with correct variant (clinical / drug / AI doc)
- [ ] Clinical Tool Catalog shows shared disclaimer banner
- [ ] Calculator hub lead (`Calculators.jsx`) unchanged in protective intent

## Mental health (PHQ-9 / GAD-7)

- [ ] Crisis language present (e.g. 988 / urgent evaluation) in NLU seeds and form UI
- [ ] **Screening only** — no diagnostic or medication recommendations in copy
- [ ] Question 9 / self-harm pathways documented in manual QA if UI changed

## Trauma / stroke / urgent care

- [ ] NIHSS, Canadian C-spine, Ottawa ankle, ACLS/ATLS seeds warn **not to delay** emergency care
- [ ] No language implying definitive clearance or ruled-out stroke/ACS from score alone

## PE / ACS (Wells PE, PERC, GRACE, TIMI)

- [ ] No “PE confirmed/ruled out” or “confirmed ACS” phrasing in seeds or UI
- [ ] Stratification / pre-test probability framing only
- [ ] No imaging or anticoagulation **orders** in chat seeds

## Anticoagulation (HAS-BLED, CHA₂DS₂-VASc)

- [ ] No “start/stop/switch anticoagulation” directives in seeds or calculator results
- [ ] CHA₂DS₂-VASc UI avoids “Anticoagulation strongly recommended” / “No anticoagulation recommended”

## Dosing

- [ ] Dose-calculator NLU forbids mg/kg and patient-specific dose calculation
- [ ] No new weight-based dosing logic in frontend or backend executors
- [ ] Drug checker disclaimer: no dose start/stop/switch recommendations

## AI documentation (DDx, antibiotic guide, protocols)

- [ ] Human / clinician review required before clinical use
- [ ] Outputs framed as support lists, not definitive diagnosis

## Backend executors (clinical outputs)

- [ ] SOFA, drug-check, lab-interpreter results include educational disclaimers
- [ ] Lab interpreter: context-dependent, qualified provider evaluation
- [ ] Drug checker: interaction education only

## Automated verification (required)

```bash
npm run test:safety-compliance
npm run safety-compliance:report   # must show riskLevel: low
```

## Manual spot-check (recommended)

- [ ] Open PHQ-9 → verify crisis block visible
- [ ] Open drug checker → run 2-drug check → read footer disclaimer
- [ ] Launch Wells PE from catalog → read chat seed tail for PE guardrails

## Sign-off

| Checker | Date | Pass |
|---------|------|------|
| | | |

**Do not approve release if any automated safety test fails or if protective copy was weakened.**
