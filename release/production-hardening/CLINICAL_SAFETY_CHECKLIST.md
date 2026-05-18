# Clinical safety checklist — Production hardening release

**Purpose:** Verify decision-support framing, crisis pathways, and absence of treatment/diagnostic overreach.  
**Automated gate:** `clinicalSafetyGuardrails.test.js` + `buildClinicalSafetyComplianceReport()` → `riskLevel: low`.

---

## Global

- [ ] Every clinical tool page shows **decision support only** disclaimer (`ClinicalDecisionSupportDisclaimer` / calculator leads).
- [ ] No UI copy states FDA clearance, definitive diagnosis, or autonomous treatment orders.
- [ ] AI documentation tools (diagnosis, procedures, protocols) state **clinician review required**.

---

## Mental health (PHQ-9, GAD-7)

- [ ] PHQ-9: Question 9 non-zero triggers **immediate safety** messaging before routine scoring.
- [ ] Crisis resources referenced (e.g. **988** where applicable).
- [ ] Copy uses **screening only** — does not diagnose depression/anxiety or recommend medications.
- [ ] GAD-7: Severe distress / suicidal ideation routes to urgent evaluation pathways.

---

## Cardiovascular / PE / ACS

- [ ] Wells PE & PERC: Pre-test probability language only; **no** “PE confirmed/excluded.”
- [ ] GRACE ACS: Emergency ACS care prioritized in seed; no treatment directives (anticoag, cath, thrombolysis).
- [ ] TIMI: Risk stratification only; no revascularization mandates.

---

## Anticoagulation context

- [ ] HAS-BLED: Explicit **no start/stop/switch** therapy language.
- [ ] CHA₂DS₂-VASc: Stroke-risk **discussion** labels; no “anticoagulation recommended/strongly recommended.”
- [ ] Drug interaction checker: Educational interactions only; disclaimer on dosing/prescribing.

---

## Trauma / stroke / emergency

- [ ] NIHSS: Does not delay emergency stroke pathways.
- [ ] ATLS / ACLS protocol seeds: Urgent care prioritized over chat completion.
- [ ] Canadian C-Spine: Does not “clear” c-spine; unstable patients excluded.

---

## Screening calculators (PR4A, STOP-BANG, AUDIT-C)

- [ ] ASCVD: Risk estimate for prevention **discussion**; no statin orders.
- [ ] CKD staging: Does not establish chronicity or recommend dialysis/drugs.
- [ ] STOP-BANG / AUDIT-C: Screening only; no OSA diagnosis or CPAP/detox orders.

---

## Labs & dosing

- [ ] Lab interpreter: Context-dependent; qualified provider judgment required.
- [ ] Dose-calculator NLU: **No** mg/kg or patient-specific dose calculations.

---

## Automated verification

```bash
npx vitest run src/data/clinicalSafetyGuardrails.test.js src/data/clinicalCatalogLaunch.test.js
```

- [ ] Compliance report: `failing: 0`, `criticalIssues: 0`.

---

## Clinical sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Clinical lead / CMIO delegate | | | |
| Safety reviewer (optional) | | | |
