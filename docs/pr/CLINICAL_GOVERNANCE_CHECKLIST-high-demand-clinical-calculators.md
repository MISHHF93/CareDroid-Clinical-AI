# Clinical governance checklist — High-demand clinical calculators PR

**Purpose:** Independent clinical review before production release of CDS calculators and trauma chat workflows.

**PR title:** Add high-demand clinical calculators and workflow tools  
**Reference:** [high-demand-clinical-calculators-PR.md](./high-demand-clinical-calculators-PR.md)

---

## Governance process

- [ ] Change request linked to product roadmap item (high-demand calculator tier)
- [ ] Clinical SME assigned and review completed within policy SLA
- [ ] Version of validated literature / guideline cited in each tool documented below
- [ ] No conflict with institutional mandatory protocols (CDS is adjunct only)

---

## Per-tool clinical sign-off

| Tool | Validated instrument / source | CDS scope appropriate? | Emergency override language adequate? | SME initial / date |
|------|------------------------------|------------------------|--------------------------------------|-------------------|
| HEART Score | Six AJ, Chest 2008 | ☐ | ☐ (ACS/MI not ruled out) | |
| ABCD² | Johnston, Lancet 2007 | ☐ | ☐ (acute stroke → pathways) | |
| PECARN | Kuppermann, Lancet 2009 | ☐ | ☐ (GCS, instability, NAI) | |
| NEXUS | Hoffman / Viccellio literature | ☐ | ☐ (not clearance; unstable trauma) | |
| Braden Scale | Braden & Bergstrom | ☐ | ☐ (nursing plan adjunct) | |
| Morse Fall Scale | Morse et al. | ☐ | ☐ (fall bundle adjunct) | |
| FIB-4 | Sterling et al. / age strata | ☐ | ☐ (not biopsy substitute) | |
| BISAP | Wu et al. | ☐ | ☐ (severe disease pathways) | |
| Apgar | ACOG / neonatal resuscitation context | ☐ | ☐ (resuscitation priority) | |
| Bishop Score | Bishop 1964 / labor assessment | ☐ | ☐ (fetal distress override) | |
| Centor / McIsaac | McIsaac et al. | ☐ | ☐ (antibiotic stewardship context) | |
| Ranson Criteria | Ranson 1974 | ☐ | ☐ (historical; BISAP preferred note) | |
| Framingham | Framingham Heart Study | ☐ | ☐ (population risk; not treatment mandate) | |

---

## Universal CDS requirements

- [ ] All tools labeled **clinical decision support**; not diagnostic devices in UI copy
- [ ] No autonomous treatment, imaging order, or admission recommendations
- [ ] Disclaimers visible without scrolling on typical mobile viewport (or linked with clear affordance)
- [ ] STEP 0 / emergency gates reviewed for trauma and stroke tools
- [ ] Pediatric tool (PECARN) age-stratification language clinically accurate
- [ ] Obstetric tools (Apgar, Bishop) appropriate for L&D context

---

## Chat-assisted trauma workflows (Tier B)

- [ ] PECARN chat seed does not recommend CT or withhold CT categorically
- [ ] NEXUS chat seed states rule is **not** c-spine clearance
- [ ] Hub trauma disclaimer reviewed for ED/trauma nurse audience
- [ ] Chat workflow does not replace primary survey documentation requirements

---

## Risk & equity

- [ ] Scoring criteria do not embed biased proxies beyond published instruments
- [ ] Age/sex inputs (FIB-4, Framingham) documented where clinically required
- [ ] Non-English localization gap acknowledged for disclaimers (deferred OK if documented)

---

## Post-release monitoring (governance)

- [ ] Plan to review misroute / complaint tickets at 30 days
- [ ] Escalation path if safety copy defect reported in production
- [ ] Annual literature review date scheduled for high-risk tools (ABCD², PECARN, HEART)

---

## Approval

| Role | Name | Signature / date | Notes |
|------|------|------------------|-------|
| Clinical director / CMIO | | | |
| Nursing representative (Braden/Morse) | | | |
| ED / trauma lead (PECARN/NEXUS/HEART) | | | |
| Obstetrics lead (Apgar/Bishop) | | | |
| Compliance / CDS policy | | | |

**Release authorized:** ☐ Yes ☐ No — blockers: _______________
