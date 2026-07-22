# Human Profile & Experience Framework (HPEF)

**Status as of Cycle 148 (2026-07-22).**

## Why this extends the existing RBAC layer instead of replacing it

CareDroid already has a full role/permission/user-profile system, built in
June 2026: `src/lib/users/userTypes.ts` defines `HospitalRole` (23 roles —
`emergency_physician`, `charge_nurse`, `triage_nurse`, `paramedic`,
`registration_clerk`, `hospital_admin`, `it_admin`, etc.) and
`CareDroidUserProfile`, which already carries `dashboardProfile`
(`defaultRoute`, `primaryWidgets`, `secondaryWidgets`), `routeAccess`,
`permissions`, `notificationChannels`, and three separate access-scope
fields (`alertOwnershipScope`, `aiReviewScope`, `patientAccessScope`).

That covers most of what a "persona" needs. Defining a second, parallel
`personas/*.ts` role enumeration would fork the source of truth for who a
user is. Instead, `src/design-system/personas/personaUxProfiles.ts` adds
**only the fields HPEF needs that don't exist yet**: cognitive priority,
information density, and AI interaction style — keyed by the real
`HospitalRole` type, imported, not redefined.

## Coverage: 11 of 23 roles

Only roles with a real, live, already-shipped UI surface have a profile.
The other 12 `HospitalRole` values are real (used for permissions/access
control) but have no dedicated screen today, so giving them a "persona" —
cognitive priority, preferred density, etc. — would be fabricated, not
derived from actual usage.

| Role | Profile? | Why |
|---|---|---|
| `emergency_physician`, `attending_physician`, `resident_physician` | yes | Whiteboard, patient assessment surfaces live |
| `charge_nurse`, `triage_nurse`, `registered_nurse` | yes | Reception/triage/whiteboard nursing surfaces live |
| `paramedic`, `dispatcher` | yes | EMS pipeline, dispatch console live |
| `registration_clerk` | yes | Reception Command Desk live |
| `hospital_admin`, `it_admin` | yes | Admin/platform dashboards live |
| `ed_director`, `patient_flow_coordinator`, `specialist`, `ems_coordinator`, `lab_technician`, `radiology_technician`, `pharmacist`, `social_worker`, `security_officer`, `quality_safety_officer`, `super_admin`, `demo_observer` | no | Role exists for permissions; no dedicated UI surface to derive a real profile from yet |

**Personas requested but not represented at all in `HospitalRole`:**
Executive, Operations Manager, Researcher, Patient, Family Member. This is a
staff-facing operating system — there is no patient/family-facing portal
anywhere in the codebase today (confirmed by repo-wide search). Adding those
4 personas means first deciding whether CareDroid grows a patient/family
portal surface (a real product scope question) and, separately, whether
Executive/Operations Manager become new `HospitalRole` values or map onto
`hospital_admin`/`ed_director` with a different dashboard profile. Not
decided here — flagged for a product decision, not silently assumed.

## Using a persona profile

```ts
import { getPersonaUxProfile } from 'src/design-system/personas/personaUxProfiles';

const profile = getPersonaUxProfile(emergencyRole.role); // HospitalRole from useEmergencyRolePermissions()
if (profile) {
  // profile.informationDensity, profile.aiInteractionStyle, profile.primaryConcerns
}
```

Always handle the `undefined` case — most roles don't have a profile yet by
design (see coverage table above). Don't fall back to a fabricated default;
prefer the component's existing behavior when no profile is defined.

## Roadmap

1. Wire `informationDensity` into at least one real surface (candidate:
   Reception Command Desk's existing `slim`/full density toggle in
   `receptionDeskUiModel.ts` already has the mechanism — this would connect
   persona to an existing, proven density switch rather than building a new one).
2. Product decision on Patient/Family/Executive/Researcher/Operations Manager
   personas — new `HospitalRole` values vs. a separate portal surface.
3. Expand `aiInteractionStyle` from a label into an actual prompt-shaping
   parameter passed to the AI gateway per role.
