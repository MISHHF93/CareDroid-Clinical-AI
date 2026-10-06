# CareDroid — Hospital Pilot Readiness & Deployment Protocol

**Document Version:** 2.2.0  
**Status:** Living Commercialization & Pilot Specification  
**Lead Authors:** Chief Commercial Officer, Clinical Pilot Director  

---

## 1. Pilot Phasing Strategy

CareDroid pilots deploy across three sequential clinical phases to ensure zero disruption to hospital operations:

```
[Phase 0: Shadow Mode] (Weeks 1–4)
├── System ingests HL7 feeds and vital streams in read-only background mode
├── Algorithm evaluations run in parallel without clinician-facing output
└── Validation of CTAS concordance against historical nurse triage decisions (>95% target)

[Phase 1: Assisted Pilot] (Weeks 5–12)
├── CareDroid deployed to a single acute care pod (e.g. Pod B - 12 beds)
├── Clinicians interact directly with Whiteboard, Pediatric Dosing, and Triage CDS
└── Weekly clinical feedback and safety review sessions with Department Chief

[Phase 2: Full Department Operations] (Weeks 13–24)
├── Full emergency department rollout (All pods, reception desk, ambulance bay)
├── Integration with hospital inpatient bed management for boarding optimization
└── Formal measurement against primary KPIs (Door-to-doctor time, LWBS, ambulance offload)
```

---

## 2. Pilot Readiness Checklist

- [x] Full RBAC/ABAC role segregation operational (`src/lib/users/canonicalAccess.ts`).
- [x] Zero cross-boundary architectural leakage (`npm run architecture:check` passes).
- [x] Immutable cryptographic audit trail active for all triage overrides and order signatures.
- [x] 100% WCAG 2.2 AA accessibility and contrast compliance verified across all responsive viewports.
- [x] Local-first offline resilience verified via network simulation tests.
- [x] Clinical Data Safety and Ethics Board charter finalized.

---

