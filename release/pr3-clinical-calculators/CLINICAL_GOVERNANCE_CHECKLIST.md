# Clinical governance checklist — PR3 clinical calculators

**Purpose:** Clinical informatics sign-off for GRACE ACS, NIHSS, Canadian C-Spine Rule, and Ottawa Ankle Rule as **decision support only** (Tier B chat-assisted).

**Automated gates:** `clinicalSafetyGuardrails.test.js`, `pr3UxSafetyAccessibility.test.js`, `pr3TenAreaCoverage.test.js`, `auditChatSeed()` on NLU profiles.

**Scope:** Prognosis / severity / imaging decision support — not diagnosis, clearance, treatment, or dosing.

---

## Global (all PR3 tools)

- [ ] Every surface states **clinical decision support only** (registry, hub group lead, chat seed, launch `aria-label`)
- [ ] No copy claims FDA clearance, definitive diagnosis, or autonomous treatment orders
- [ ] No `POST /tools/:id/execute` — scores not server-attested in this release
- [ ] `backendExecutable: false` on all four NLU profiles
- [ ] Launch from catalog/hub routes user to **dashboard** so emergency STEP 0 guidance is visible in chat (not hidden on hub-only URL)

---

## GRACE ACS (`grace-acs`)

- [ ] STEP 0: unstable ACS, STEMI, shock, arrest, sustained arrhythmia before GRACE
- [ ] Risk stratification support only — **not** ACS diagnosis
- [ ] Does **not** confirm or exclude acute coronary syndrome
- [ ] No antiplatelet, anticoagulant, cath lab, or revascularization directives in seed
- [ ] Emergency ACS pathways prioritized over chat completion
- [ ] GRACE 2.0 scope: admission in-hospital and 6-month mortality estimates

| Reviewer | Date | Approved |
|----------|------|----------|
| | | ☐ |

---

## NIH Stroke Scale (`nihss`)

- [ ] STEP 0: suspected acute stroke → emergency stroke pathway before chat
- [ ] Does **not** replace urgent stroke evaluation, imaging, or treatment decisions
- [ ] No IV tPA, thrombectomy, or mg/kg dosing in seed
- [ ] Low or incomplete NIHSS does **not** exclude LVO or hemorrhage
- [ ] Guided workflow covers NIHSS domains without implying treatment eligibility

| Reviewer | Date | Approved |
|----------|------|----------|
| | | ☐ |

---

## Canadian C-Spine Rule (`canadian-c-spine`)

- [ ] Applicability: alert, stable adult blunt neck trauma
- [ ] STEP 0: unstable patients, GCS &lt;15, cord injury, penetrating trauma → full trauma evaluation
- [ ] Does **not** “clear” the cervical spine
- [ ] Must not delay primary survey or urgently indicated imaging
- [ ] Intoxication / unreliable exam called out

| Reviewer | Date | Approved |
|----------|------|----------|
| | | ☐ |

---

## Ottawa Ankle Rule (`ottawa-ankle`)

- [ ] Scope: **acute** ankle/foot injury
- [ ] STEP 0 hard stops: neurovascular compromise, open fracture, deformity, dislocation, compartment concern, multisystem trauma
- [ ] Does **not** prove absence of fracture
- [ ] Pediatric caveat (validated primarily in adults)
- [ ] Ankle vs foot radiograph criteria preserved

| Reviewer | Date | Approved |
|----------|------|----------|
| | | ☐ |

---

## NLU & alias governance

- [ ] `stroke scale` → NIHSS (not Canadian C-Spine)
- [ ] `c spine rule` / cervical aliases → Canadian C-Spine (not NIHSS)
- [ ] GRACE aliases do not collide with Wells PE / TIMI in sample utterances

---

## Automated verification

```bash
npm test -- --run \
  src/data/clinicalSafetyGuardrails.test.js \
  src/data/pr3UxSafetyAccessibility.test.js \
  src/data/pr3TenAreaCoverage.test.js \
  src/data/pr3Comprehensive.test.js
```

- [ ] `auditChatSeed` reports no critical issues for all four PR3 NLU rows
- [ ] Stroke/trauma seeds include `URGENT_CARE` guardrail patterns

---

## Clinical sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Clinical lead / CMIO delegate | | | |
| ED / trauma champion (optional) | | | |
| Neurology / stroke champion (optional) | | | |
| Safety reviewer (optional) | | | |

**Release approval:** ☐ Approved for production  ☐ Approved with documented exceptions  ☐ Not approved

**Exceptions (if any):**

```text
[Tool id, concern, mitigation, expiry date]
```
