# Permission Matrix — Nest × FE Emergency Actions

**Stage:** A draft  
**Nest source:** `backend/src/modules/auth/enums/permission.enum.ts`  
**FE source:** `EMERGENCY_ACTIONS` / `EMERGENCY_PERMISSION_KEYS` in `emergencyRolePermissions.ts` + registry

## Nest Permission groups (summary)

| Group | Permissions |
|-------|-------------|
| PHI | READ_PHI, WRITE_PHI, EXPORT_PHI, DELETE_PHI |
| Clinical tools | USE_CALCULATORS, USE_DRUG_CHECKER, USE_LAB_INTERPRETER, USE_PROTOCOLS, USE_AI_CHAT |
| Users | MANAGE_USERS, MANAGE_ROLES, VIEW_USERS |
| Audit | VIEW_AUDIT_LOGS, EXPORT_AUDIT_LOGS, VERIFY_AUDIT_INTEGRITY, VIEW_PHI_AUDIT |
| Admin | CONFIGURE_SYSTEM, MANAGE_ENCRYPTION, MANAGE_SUBSCRIPTIONS, VIEW_ANALYTICS, … |
| Governance / AI security | VIEW_GOVERNANCE, MANAGE_CLINICAL_POLICY, VIEW_AI_SECURITY, … |
| Sentinel | VIEW_SENTINEL_COMMAND, ACK_SENTINEL_ALARMS, REVIEW_SENTINEL_AI, … |
| Emergency | TRIGGER_EMERGENCY_PROTOCOL (and related) |

## FE emergency action keys (sample)

| Action key | Intent | Nest permission(s) needed (target mapping) |
|------------|--------|-----------------------------------------------|
| patientCreate | New patient / temp chart | WRITE_PHI |
| patientDemographicsEdit | Identity fields | WRITE_PHI |
| encounterCreate | Encounter open | WRITE_PHI |
| intakeVerify | Verify identity | WRITE_PHI + audit |
| triageAssignAcuity | ESI/CTAS assign | WRITE_PHI + clinical |
| queueMove | Move queue stage | WRITE_PHI |
| reassessmentComplete | Reassessment done | WRITE_PHI |
| vitalsWrite | Vitals entry | WRITE_PHI |
| notesWrite | Clinical note | WRITE_PHI |
| flagsManage | Clinical flags | WRITE_PHI |
| patientAssignStaff / Room | Assignment | WRITE_PHI |
| patientEscalate / receptionEscalate | Escalation | WRITE_PHI + protocol |
| patientDischarge | Disposition | WRITE_PHI |
| emsPrepareBay / emsConvertArrival / emsHandoffComplete | EMS chain | WRITE_PHI |
| referralCreate / transferManage | Transfer | WRITE_PHI |
| capacityManage / boardingManage | Ops | VIEW_OPERATIONS + WRITE where mutating |
| workloadReassign | Charge duties | WRITE_PHI |
| copilotUse | Copilot | USE_AI_CHAT |
| analyticsView | Analytics | VIEW_ANALYTICS |
| simulationRun | Sim | config-dependent |
| settingsManage | Settings | CONFIGURE_SYSTEM |
| displayPublic* | Public boards | limited / no PHI export |

## Gap status

| Gap | Severity | Stage |
|-----|----------|-------|
| No shared TypeScript module mapping FE action → Nest Permission | High | D |
| registration_clerk not a Nest UserRole | High | D |
| Express routes may not enforce same Permission set as Nest | High | D |
| Platform asset entitlements separate third matrix | Medium | D |
| Public display must never receive full PHI payloads | High | D + tests |

## Verification commands (Stage D)

```
npx vitest run src/config/emsHandoffPermission.contract.test.ts
# add: src/config/emergencyNestPermissionMap.test.ts (to create)
cd backend && npm test -- --testPathPattern="auth|runtime-auth|role-permissions"
```
