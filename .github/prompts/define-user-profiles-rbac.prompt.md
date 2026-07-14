# Define User Profiles & RBAC

Use this prompt when adding, modifying, or extending role-based access control in CareDroid.

## Context

CareDroid models realistic hospital roles for a virtual city hospital network (CareDroid Virtual City Health Network). The RBAC system lives in `src/lib/users/`.

## Files to read first

- `src/lib/users/userTypes.ts` — `CareDroidUserProfile` and `HospitalRole`
- `src/lib/users/permissions.ts` — `CAREDROID_PERMISSIONS` and `ROLE_PERMISSIONS`
- `src/lib/users/roleAccess.ts` — role labels, emergency role mapping, dashboard config
- `src/lib/users/demoUsers.ts` — seeded demo users
- `src/lib/users/aiChiefRouting.ts` — AI recommendation routing
- `src/hooks/useCareDroidUser.ts` — current user hook
- `src/hooks/useRolePermissions.ts` — permission checking hook

## Rules

1. Preserve the existing emergency role system in `src/config/emergencyRolePermissions.ts`. Do not remove or rename existing emergency role IDs.
2. New hospital roles go in `userTypes.ts` as additions to the `HospitalRole` union.
3. Every new role needs entries in `permissions.ts` (ROLE_PERMISSIONS), `roleAccess.ts` (labels, descriptions, emergency mapping, dashboard config), and `demoUsers.ts` (at least one demo user).
4. Permission checks must use `hasCareDroidPermission(role, permission)` or `useRolePermissions()`. Never inline array includes in components.
5. Non-clinical roles (`registration_clerk`, `lab_technician`, `radiology_technician`, `social_worker`, `security_officer`, `demo_observer`) must not have `patient:discharge`, `orders:create`, `triage:override-ai`, or `ai:override` permissions.
6. Admin roles (`super_admin`, `hospital_admin`, `it_admin`) must not automatically gain clinical permissions. Clinical permissions require explicit assignment.
7. AI Chief routing for a new alert scenario belongs in `aiChiefRouting.ts` as a new `AlertScenario` entry.
8. Demo users are in `demoUsers.ts` only. Do not create user objects in components or hooks.
9. The demo role switcher (`src/components/account/ProfileRoleSwitcher.tsx`) must only render in demo or dev mode. Use `useProfileSwitcherVisibility()` to gate it before rendering.
10. RoleBadge in `src/domain/staff/RoleBadge.tsx` must support any new role via `CAREDROID_ROLE_LABELS`.

## Hospital network

Sites: Central City Hospital, Northside Emergency Centre, Riverside General Hospital, Eastview Children's Hospital, Westbridge Women's & Trauma Centre.

Zones: Central, North, South, East, West.

Departments: Emergency Department, Triage, Registration, ICU, Cardiology, Neurology, Radiology, Laboratory, Pharmacy, Pediatrics, Obstetrics, Surgery, Mental Health, Security, Administration, IT, Patient Flow.

## Quick reference — role to emergency role mapping

| CareDroid Role | Emergency Role |
|---|---|
| super_admin, it_admin | admin |
| hospital_admin, ed_director, patient_flow_coordinator | ed_manager |
| charge_nurse | charge_nurse |
| triage_nurse, registered_nurse | triage_nurse |
| emergency_physician, attending_physician, resident_physician, specialist | physician |
| paramedic | ems_user |
| registration_clerk | registration_clerk |
| lab_technician, radiology_technician, pharmacist, social_worker, security_officer, quality_safety_officer, demo_observer | read_only_viewer |
