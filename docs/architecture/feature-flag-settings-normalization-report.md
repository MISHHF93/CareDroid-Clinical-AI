# Feature Flag And Settings Normalization Report

Date: 2026-06-13

## Navigation Feature IDs

`src/config/unified-navigation.config.ts` maps each active navigation item to the feature ID used by the feature registry and role/visibility checks:

- `whiteboard` -> `emergency_whiteboard`
- `patients` -> `emergency_patients`
- `ems` -> `ems_pipeline`
- `intake` -> `smart_intake`
- `queues` -> `queue_intelligence`
- `reassessment` -> `reassessment_engine`
- `capacity` -> `capacity_intelligence`
- `boarding` -> `boarding_intelligence`
- `referrals` -> `referral_intelligence`
- `copilot` -> `ed_copilot`
- `analytics` -> `emergency_analytics`
- `settings` -> `emergency_settings`

Feature gate aliases are preserved where existing code already uses short names, such as `referral_intel` and `capacity_intel`.

## Settings Modules

`src/config/emergencySettings.config.js` now defaults to the 12 active Emergency OS modules:

- Whiteboard
- Patients
- EMS
- Smart Intake
- Queues
- Reassessment
- Capacity
- Boarding
- Referrals
- ED Copilot
- Analytics
- Settings

The settings page keeps loading, empty, error, local-save, and audit states.

## Retired Feature Records

The root feature registry still retains records such as `department_pulse`, `clinical_calculator_hub`, and `shift_summary` for compatibility with settings and historical feature coverage. Their sidebar routes resolve to `/emergency/whiteboard` so they do not advertise retired active pages.

## Remaining Review

Multiple feature/settings registries still exist across frontend and backend. This pass normalized the active Emergency OS route/nav/settings vocabulary where safe, but did not perform a broad cross-repo feature registry migration.
