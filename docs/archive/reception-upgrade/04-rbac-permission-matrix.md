# Phase 4: Reception RBAC Permission Matrix

> Complete mapping of what the Registration Clerk can and cannot do,
> across frontend, backend, and data layers.

---

## Backend RBAC (New This Session)

### Endpoint Guards Added

| Endpoint | Method | Guard | Why |
|----------|--------|-------|-----|
| `/api/emergency/reception/snapshot` | GET | `@RequirePermission(Permission.READ_PHI)` | Reads patient PHI data |
| `/api/emergency/reception/handoff` | POST | `@RequirePermission(Permission.WRITE_PHI)` | Writes patient state transition |

### Backend Role Configuration

| Config | Value |
|--------|-------|
| Role ID | `registration-clerk` |
| Aliases | `receptionist`, `ed clerk`, `ed_clerk`, `emergency receptionist`, `front desk` |
| Asset Packs | `['core-platform', 'reception-desk']` |
| API Permissions | `READ_PHI`, `WRITE_PHI` |
| Denied Permissions | `EXPORT_PHI`, `DELETE_PHI`, `USE_CALCULATORS`, `USE_DRUG_CHECKER`, `USE_LAB_INTERPRETER`, `USE_PROTOCOLS`, `USE_AI_CHAT`, `MANAGE_USERS`, `MANAGE_ROLES`, `VIEW_AUDIT_LOGS`, `CONFIGURE_SYSTEM`, `TRIGGER_EMERGENCY_PROTOCOL`, `OVERRIDE_SAFETY_CHECKS` |

---

## Frontend Permission Matrix

### Allowed Actions (6)

| Action | Permission Key | Frontend Gate | Backend Gate |
|--------|---------------|---------------|--------------|
| Create patient | `patient.create` | `canCreatePatient` → `emergencyRole.canMutate(EMERGENCY_ACTIONS.createPatient)` | `WRITE_PHI` (via handoff) |
| Edit demographics | `patient.demographics.edit` | `receptionCapabilities.canVerifyIdentity` | `WRITE_PHI` |
| Create encounter | `encounter.create` | `receptionCapabilities.canCreateEncounter` | `WRITE_PHI` |
| Verify intake | `intake.verify` | `receptionCapabilities.canVerifyIdentity` | `WRITE_PHI` |
| Convert EMS arrival | `ems.convertArrival` | `receptionCapabilities.canConvertEmsArrival` | `WRITE_PHI` |
| Escalate to nurse | `reception.escalate` | `receptionCapabilities.canEscalateToNurse` | No backend guard (store-only) |

### Denied Actions (Explicit)

| Action | Permission Key | Denial Reason |
|--------|---------------|---------------|
| Assign triage acuity | `triage.assign_acuity` | Clinical decision — no clinical override authority |
| Write vitals | `vitals.write` | Clinical data entry |
| Write notes | `notes.write` | Clinical documentation |
| Discharge patient | `patient.discharge` | Disposition decision |
| Manage capacity | `capacity.manage` | Operational management |
| Reassign workload | `workload.reassign` | Staff management |
| Manage flags | `flags.manage` | Clinical flag management |
| Assign staff | `patient.assignStaff` | Staff management |
| Assign room | `patient.assignRoom` | Room management |
| Move queue | `queue.move` | Queue management (reception can only handoff, not reorder) |
| Run simulation | `simulation.run` | Advanced analytics |
| Manage settings | `settings.manage` | System administration |

### Route Access (8 routes)

| Route | Path | Purpose |
|-------|------|---------|
| Reception | `/emergency/reception` | Primary workspace |
| Patients | `/emergency/patients` | Patient list/detail |
| Intake | `/emergency/intake` | Standalone intake (hidden for clerk) |
| Pulse | `/emergency/pulse` | Operational pulse |
| Shift | `/emergency/shift` | Shift management |
| Alerts | `/emergency/alerts` | Alert center |
| Collaboration | `/emergency/collaboration` | Team collaboration |
| Help | `/emergency/help` | Help center |

### Screen Mode

| Mode | Value |
|------|-------|
| Screen Mode | `reception` |
| Default Landing | `/emergency/reception` |
| Slim Desk | `true` |

---

## Data Access Matrix

| Data | Read | Write | Notes |
|------|------|-------|-------|
| Patient list | Yes (store) | Indirect (via handoff) | Full patient list in store, filtered to reception states |
| Patient demographics | Yes | Yes (during intake) | firstName, lastName, dob, sex, contact |
| Patient arrival record | Yes | Yes (via arrivalControlLayer) | arrivalMode, chiefComplaint, triageAcuity |
| Patient flags | Yes (read) | No | Cannot manage flags directly |
| Alerts | Yes (store) | Indirect (via escalation) | Creates escalation alerts |
| Capacity | Yes (store) | No | Read-only for site name display |
| Workflow logs | Yes (store) | Yes (via handoff) | In-memory only, not persisted |
| Collaboration channels | No | Indirect (via workflow sync) | RECEPTION department channel |

---

## Remaining RBAC Gaps

### Gap 1: No Backend Audit Trail for Reception Operations
- **Risk:** HIPAA — PHI access not logged
- **Fix:** Persist `workflow_action_logs` to database with actor, action, patient, timestamp
- **Priority:** Critical

### Gap 2: Escalation Has No Backend Guard
- **Risk:** Any authenticated user could submit escalation via store
- **Fix:** Add `@RequirePermission(Permission.WRITE_PHI)` to escalation endpoint (if one exists) or add store-level guard
- **Priority:** High

### Gap 3: No Rate Limiting on Handoff Endpoint
- **Risk:** Double-submit or abuse
- **Fix:** Add idempotency key + rate limiting
- **Priority:** Medium

### Gap 4: Frontend-Only Permission Checks
- **Risk:** Bypass via API call
- **Status:** Mitigated by new `@RequirePermission` guards on snapshot/handoff
- **Remaining:** Other endpoints (patient list, alerts) still have no reception-specific guards
- **Priority:** Low (covered by general READ_PHI/WRITE_PHI permissions)

---

## Verification Checklist

- [x] Backend `GET /reception/snapshot` requires `READ_PHI`
- [x] Backend `POST /reception/handoff` requires `WRITE_PHI`
- [x] Frontend `canCreatePatient` gates register walk-in button
- [x] Frontend `canVerifyIdentity` gates identity check button
- [x] Frontend `canEscalateToNurse` gates escalation quick actions
- [x] Frontend `canCaptureArrivalReason` gates other arrivals button
- [x] Frontend `canOpenSmartIntake` gates smart intake overlay
- [x] `assertReceptionMutationAllowed` blocks clinical actions with guardrail message
- [x] Route access filtered by `EMERGENCY_ROLE_DEFINITIONS.registrationClerk.routes`
- [ ] Backend audit trail for reception operations (Gap 1)
- [ ] Backend escalation endpoint guard (Gap 2)
- [ ] Idempotency key on handoff (Gap 3)
