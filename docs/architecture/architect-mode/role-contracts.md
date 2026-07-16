# Role Contracts — FE Emergency Roles ↔ Nest UserRole

**Stage:** A (gap map)  
**Server authority:** Nest `Permission` enum + JWT claims  
**Client ED authority:** `EMERGENCY_ROLE_IDS` + `emergencyPermissionRegistry`  
**Problem:** Nest `UserRole` has **4** values; FE operational roles have **12**. Without a mapping layer, demos either open-access or deny valid work.

## Nest UserRole (server entity)

Source: `backend/src/modules/users/entities/user.entity.ts`

| UserRole | Value string |
|----------|--------------|
| PHYSICIAN | `physician` |
| NURSE | `nurse` |
| STUDENT | `student` |
| ADMIN | `admin` |

Permissions per role: `backend/src/modules/auth/config/role-permissions.config.ts`

## FE Emergency roles

Source: `src/config/emergencyRolePermissions.ts`

| Emergency role id | Label | Intended clinical cluster |
|-------------------|-------|---------------------------|
| admin | Admin | Full ED + settings |
| it_admin | IT Admin | System config |
| ed_manager | ED Manager | Ops + analytics |
| charge_nurse | Charge Nurse | Queue, assign, capacity |
| triage_nurse | Triage Nurse | Triage acuity |
| physician | Physician | Full clinical |
| registration_clerk | Registration Clerk | **Reception reference** |
| ems_user | EMS User | Prehospital / arrival |
| dispatcher | Dispatcher | Dispatch console |
| ems_coordinator | EMS Coordinator | EMS bay / handoff |
| read_only_viewer | Read-Only Display | Boards |
| public_display | Public Display | Public waitboard |

## Proposed mapping (Stage D implement — not yet code)

| Emergency role | Nest UserRole (auth container) | Minimum Nest permissions (intent) |
|----------------|--------------------------------|-------------------------------------|
| physician | PHYSICIAN | READ/WRITE/EXPORT PHI, tools, AI, emergency protocol, audit view |
| triage_nurse, charge_nurse | NURSE | READ/WRITE PHI, tools, AI, protocol, sentinel ack |
| registration_clerk | NURSE *or* custom claim set | READ/WRITE PHI (demographics/intake), limited clinical tools, AI assist |
| ems_user, dispatcher, ems_coordinator | NURSE *or* EMS claim pack | READ/WRITE PHI arrival, EMS, limited tools |
| ed_manager | ADMIN or PHYSICIAN+ops | VIEW_ANALYTICS, capacity, governance view |
| admin, it_admin | ADMIN | MANAGE_USERS, CONFIGURE_SYSTEM, … |
| student (platform) | STUDENT | Tools only, no real PHI |
| read_only_viewer, public_display | STUDENT-like + display perms | No WRITE_PHI; display permissions only |

**Implementation rule:** Do **not** collapse FE roles into 4 UI roles. Keep emergency roles as UX; map each to a **permission set** stored in JWT custom claims or server-side role-permission expansion.

## Reception contract (golden path)

| Field | Value |
|-------|--------|
| Emergency role | `registration_clerk` |
| Primary route | Reception workspace (`/emergency/reception` family) |
| Primary actions | createPatient, editDemographics, createEncounter, verifyIntake, receptionEscalate, emsConvert/handoff (subset), copilotUse |
| Must not | Full disposition discharge without nursing/physician path; manage system settings |
| Screen mode | Reception screen / minimal chrome when configured |
| Audit | Every intake create/verify/EMS convert must be observable |

## Role extension order (Stage I)

1. registration_clerk (Reception) — characterize first  
2. triage_nurse  
3. charge_nurse / nurse  
4. physician  
5. ems_* / dispatcher  
6. ed_manager / operations  
7. admin / it_admin  
8. analytics consumers  
9. AI governance roles  

## Tests required (Stage D)

- Unit: every EMERGENCY_ROLE_ID → non-empty permission list  
- Unit: registration_clerk can intake actions; cannot CONFIGURE_SYSTEM  
- Integration: JWT without READ_PHI cannot hit PHI routes  
- E2E: role switch does not grant open-access (fix prior flaky demo mode)
