# Clinical governance checklist — PHQ-9, GAD-7, COPD GOLD, Rome IV IBS

**Intended audience:** Clinical informatics, medical director, behavioral health lead, pulmonary/GI clinical champions, compliance.

**Product stance:** All four tools are **clinical decision support (CDS)** for licensed clinicians or authorized staff. They do **not** establish diagnoses, rule out conditions with certainty, or recommend specific treatments.

---

## 1. Tool purpose & appropriate use

| Tool | Approved use | Not approved use |
|------|--------------|------------------|
| **PHQ-9** | Depression **symptom screening** over past 2 weeks; documentation support | Sole basis for depression diagnosis; medication initiation without clinician review |
| **GAD-7** | Anxiety **symptom screening** over past 2 weeks | GAD diagnosis; replacing suicide-risk assessment (use PHQ-9 Q9 + local protocols) |
| **COPD GOLD** | **A/B/E grouping discussion** from symptoms and exacerbation history | COPD diagnosis; spirometry grading 1–4; inhaler or therapy selection |
| **Rome IV IBS** | **Criteria-aligned symptom review** for discussion | IBS diagnosis; substitute for alarm-feature workup |

- [ ] Clinical leadership accepts screening-only / support-only framing for all four tools
- [ ] Local policy maps PHQ-9/GAD-7 to your behavioral health and primary care pathways
- [ ] Pulmonary lead accepts COPD GOLD chat as **grouping support**, not GOLD 1–4 FEV1 grading
- [ ] GI lead accepts Rome tool as **criteria education**, not colonoscopy/red-flag replacement

---

## 2. Safety & escalation pathways

### Mental health

- [ ] **PHQ-9 Question 9:** Process defined when any non-zero Q9 (urgent assessment, crisis resources, documentation)
- [ ] **Crisis resources:** 988 / local equivalents reviewed; U.S.-centric copy acceptable or localized per site
- [ ] **GAD-7 severe/moderate:** Pathway for timely follow-up; link to suicide-risk assessment when indicated
- [ ] Staff trained that **low scores do not rule out suicide risk**

### COPD

- [ ] Acute exacerbation / severe respiratory distress protocol takes priority over GOLD grouping chat
- [ ] No expectation that chat output selects inhaler class or dose

### Rome IV IBS

- [ ] Alarm features (bleeding, weight loss, anemia, nocturnal symptoms, etc.) trigger **clinical evaluation**, not continued criteria chat alone
- [ ] Criteria “meet / partial / not meet” language understood as **support**, not diagnosis

---

## 3. Evidence & references

- [ ] PHQ-9 reference acceptable: Kroenke et al., J Gen Intern Med 2001
- [ ] GAD-7 reference acceptable: Spitzer et al., Arch Intern Med 2006
- [ ] COPD GOLD A/B/E framework matches current organizational standard (post-2023 GOLD report alignment)
- [ ] Rome IV criteria alignment verified with GI reference policy

---

## 4. Copy & risk language review

- [ ] Reviewed on-form disclaimers (screening only, 911/988, no emergency care via app)
- [ ] Reviewed calculator **result** interpretation text (no prescribing language)
- [ ] Reviewed **catalog** descriptions and **chat seeds** (STEP 0 gates, no diagnosis certainty)
- [ ] Reviewed hub group **leads** (COPD exacerbation priority; Rome alarm features)

**Review locations:**

- `src/pages/tools/mentalHealthCalculators.jsx`
- `src/data/clinicalIntentToolCatalog.js` (chatSeed for phq9, gad7)
- `src/data/chatAssistedCalculators/copdGold.js`, `romeIvIbs.js`
- `src/data/chatAssistedHubGroups.js` (group leads)

---

## 5. NLU & routing governance

- [ ] Catalog aliases (`depression screen`, `copd gold`, etc.) match how clinicians search at your site
- [ ] Risk of mis-routing to `differential-diagnosis` assessed; disambiguation helpers deemed sufficient
- [ ] Process for adding new aliases without clinical drift (alias sync tests + governance review)

---

## 6. Human factors & accessibility

- [ ] Keyboard-only workflow acceptable for PHQ-9 / GAD-7 in your environment
- [ ] Screen reader announcements for safety alerts deemed sufficient for your accessibility policy
- [ ] Mobile use case (bedside tablet) acceptable for Likert forms

---

## 7. Documentation & training

- [ ] Release notes / PR summary shared with clinical super-users
- [ ] Tip sheet or LMS module planned (optional): when to use PHQ-9 vs GAD-7; when to use chat vs form
- [ ] Support desk briefed on “screening only” and crisis escalation limits of the product

---

## 8. Regulatory & institutional alignment

- [ ] Fits institution’s CDS definition (clinician review required)
- [ ] HIPAA: no new PHI storage in calculator modules (client-side scoring only for Tier A)
- [ ] Meets institutional AI/chat policy for Tier B guided conversations (human review, no autonomous orders)
- [ ] IRB / QI determination: N/A for standard CDS unless your site requires otherwise — document decision

---

## 9. Monitoring & post-deployment review

- [ ] 30-day post-go-live review scheduled (mis-routing reports, safety near-misses, user feedback)
- [ ] Process to report and patch unsafe model/chat outputs for Tier B tools
- [ ] Metrics defined (optional): launches per tool, Q9-positive rate documentation (aggregate only, per privacy policy)

---

## 10. Approval

| Question | Response |
|----------|----------|
| Approved for production in current form? | ☐ Yes ☐ Yes with conditions ☐ No |
| Conditions / restrictions | |
| Effective date | |
| Review cadence (e.g. annual) | |

| Role | Name | Signature / Date |
|------|------|------------------|
| Medical director / CMIO | | |
| Behavioral health lead (PHQ-9 / GAD-7) | | |
| Pulmonary lead (COPD GOLD) | | |
| GI lead (Rome IV IBS) | | |
| Compliance / privacy (if required) | | |

---

## Appendix — severity thresholds (verification)

**PHQ-9 total score**

| Score | Category |
|-------|----------|
| 0–4 | None–minimal |
| 5–9 | Mild |
| 10–14 | Moderate |
| 15–19 | Moderately severe |
| 20–27 | Severe |
| Q9 ≥ 1 | Safety escalation (overrides presentation priority) |

**GAD-7 total score**

| Score | Category |
|-------|----------|
| 0–4 | None–minimal |
| 5–9 | Mild |
| 10–14 | Moderate (+ escalation messaging) |
| 15–21 | Severe (+ acute distress alert) |
