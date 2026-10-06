# CareDroid — Master Implementation & Rollout Plan

**Document Version:** 2.2.0  
**Status:** Living Engineering Plan  
**Lead Authors:** Technical Program Manager, Lead Enterprise Architect  

---

## 1. Phased Engineering Execution

```mermaid
gantt
    title CareDroid Engineering Rollout
    dateFormat  YYYY-MM-DD
    section Wave 1: Core Cockpit
    CDL 2.1 Visual Authority          :done,    des1, 2026-08-01, 2026-09-30
    Frontend Redesign & Token Refresh :active,  des2, 2026-10-01, 2026-10-15
    Deterministic Pediatric CDS       :done,    des3, 2026-09-15, 2026-10-05
    section Wave 2: Regional Interop
    HL7 FHIR R4 Bridge                :         des4, 2026-11-01, 2027-01-15
    Provincial Health Card Gateway    :         des5, 2027-01-16, 2027-03-30
    section Wave 3: Predictive ML
    NEWS2 / Sepsis Early Deterioration:         des6, 2027-04-01, 2027-06-30
    LWBS Waiting Room Risk Model      :         des7, 2027-06-01, 2027-08-15
```

---

## 2. Resource & Environment Readiness

- Continuous integration verification via Lefthook and GitHub Actions (`.github/workflows/verify.yml`).
- Staging environment running Postgres on AWS Canada Central with synthetic patient data generator.
- Nightly regression suite running `npm run verify:full` and `npm run db:verify`.

---

