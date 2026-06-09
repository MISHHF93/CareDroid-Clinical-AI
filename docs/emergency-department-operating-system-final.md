# Emergency Department Operating System Final Report

## Goal

Unify the Emergency Workspace into a complete Emergency Department Operating System. The workspace should no longer feel like separate tools, dashboards, and automations. It should behave like one operating model for patient flow, queue flow, EMS flow, referral flow, capacity flow, boarding, discharge, copilot guidance, analytics, and sellable automation modules.

## Unified Layers

The Emergency Department Operating System unifies:

- Patient Journey Engine
- Queue Intelligence
- EMS Pipeline
- Capacity Intelligence
- Referral Intelligence
- Boarding Intelligence
- ED Copilot
- Emergency Analytics
- Emergency Automations

## EmergencyOperatingSystemService Responsibilities

`EmergencyOperatingSystemService` owns the unified ED operating payload:

- `patient flow`: patient journey states, bottlenecks, metrics, and recommendations.
- `queue flow`: waiting, triage, provider, results, referral, admission, and discharge queues.
- `referral flow`: department queues, delayed referrals, referral stages, and recommendations.
- `EMS flow`: pre-arrival queue, incoming patients, ETA, risk bundles, and handoff summaries.
- `capacity flow`: capacity score, risk level, census, spaces, boarding, EMS, and discharge candidates.
- `discharge flow`: discharge queue, discharge candidates, discharge-related automations, and boarding relief.

## Dashboard Route

The unified ED operating system is surfaced at:

`/workspace/emergency`

The Emergency root should behave as the hero page for the operating system, backed by `/workspace/emergency/command-center` and the shared Emergency Workspace data pipeline.

## SaaS Positioning

The completed Emergency Workspace is a standalone SaaS solution because it packages:

- a director command center
- clinical intent routing
- patient journey state management
- measurable queues and bottlenecks
- EMS-to-ED pre-arrival context
- referral and boarding delay measurement
- capacity scoring
- ED Copilot guidance
- analytics and ROI signals
- sellable automation marketplace modules

## Acceptance Mapping

Acceptance is met when `/workspace/emergency` exposes a single coherent Emergency Department Operating System payload and hero dashboard, not a collection of disconnected tools.
