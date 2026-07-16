# Role Extension Progress (Stage I)

Template: **Reception** (`registration_clerk`) — fully characterized.

| Role | Characterization | Nest map | Screen model | Notes |
|------|------------------|----------|--------------|-------|
| registration_clerk | PASS | PASS | Reception | Golden path |
| triage_nurse | PASS (`triageRoleCharacterization.test.ts`) | PASS | triageScreenModel | Stage I |
| it_admin | PASS (no PHI) | PASS | admin screen | Stage D fix |
| charge_nurse | PASS (`clinicalRolesCharacterization.test.ts`) | PASS | charge | Stage I |
| physician | PASS (same file) | PASS | physician | Stage I |
| ems_user / dispatcher / ems_coordinator | PASS (same file) | PASS | ems | Stage I |
| ed_manager | Partial (grants exist; dedicated suite pending) | Mapped | command | Next polish |
| public_display / read_only | PASS (`displayRolesCharacterization.test.ts`) | Mapped | display | PHI-free enforced |

## Triage locks

- Grants: acuity, vitals, reassessment, queue move, intake verify, screen.triage  
- Forbidden: settings.manage  
- Nest: nurse container + PHI write, no CONFIGURE_SYSTEM  
- Queue path: pretriage → triage → waiting (registry)
