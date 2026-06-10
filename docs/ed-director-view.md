# ED Director View

## Goal

Create a leadership dashboard for Emergency Department directors at `/workspace/emergency/director`.

The view must answer one question in under 30 seconds:

Is the department healthy right now?

The dashboard is not a task workspace. It is a fast operating snapshot for wait times, boarding, EMS offload, staffing pressure, high-risk patients, and throughput.

## Route

- Route: `/workspace/emergency/director`
- Workspace: Emergency
- Audience: ED Director, COO, charge nurse leadership, operations leadership
- Mode: Leadership dashboard
- Data posture: demo/local first, live KPI/event feeds later

## Director Dashboard Contract

```js
export const EDDirectorView = Object.freeze({
  route: '/workspace/emergency/director',
  title: 'ED Director View',
  purpose: 'Show department health in under 30 seconds.',
  summaryWindow: 'current shift',
  requiredSignals: [
    'waitTimes',
    'boarding',
    'emsOffload',
    'staffingPressure',
    'highRiskPatients',
    'throughput',
  ],
});
```

Each dashboard signal must use this shape:

```js
{
  signalId: string,
  label: string,
  value: number | string,
  unit: 'minutes' | 'hours' | 'patients' | 'percent' | 'status',
  status: 'healthy' | 'watch' | 'critical',
  trend: 'improving' | 'stable' | 'worsening',
  target: number | string | null,
  source: string,
  directorInterpretation: string,
  primaryDrilldownRoute: string,
}
```

## Required Leadership Signals

| Signal | What It Answers | Source | Drilldown |
| --- | --- | --- | --- |
| Wait Times | Are patients waiting too long before triage or provider assessment? | `EmergencyKPILayer.doorToDoctor`, waiting room queue, triage queue | `/workspace/emergency/waiting-room` |
| Boarding | Are admitted patients stuck in the ED? | `EmergencyKPILayer.boardingTime`, admission queue, bed pressure | `/workspace/emergency/command-center` |
| EMS Offload | Are ambulances waiting to hand off patients? | `EmergencyKPILayer.emsOffload`, EMS Offload Command Center | `/workspace/emergency/ems` |
| Staffing Pressure | Is staffing aligned to current demand? | Waiting room count, active patients, high-risk queue, surge staffing signal | `/workspace/emergency/analytics` |
| High-Risk Patients | How many patients need urgent review? | High-risk queue, critical alerts, triage risk profiles | `/workspace/emergency/triage` |
| Throughput | Is the department moving patients through arrival, assessment, results, disposition, and discharge/admission? | `EmergencyKPILayer.lengthOfStay`, `doorToDoctor`, `dischargeTime`, queue age | `/workspace/emergency/throughput` |

## Health Summary Model

The top of the dashboard should show a single health summary:

```js
{
  departmentHealth: 'healthy' | 'watch' | 'critical',
  headline: string,
  reason: string,
  highestRiskSignal: string,
  recommendedLeadershipAction: string,
  lastUpdated: string,
  sourceState: 'demo' | 'manual' | 'live' | 'mixed' | 'stale',
}
```

Example:

```js
{
  departmentHealth: 'watch',
  headline: 'ED is under boarding and staffing pressure.',
  reason: 'Boarding time and high-risk queue are worsening while EMS offload is stable.',
  highestRiskSignal: 'boarding',
  recommendedLeadershipAction: 'Review bed pressure and staffing coverage before the next arrival peak.',
  lastUpdated: 'current shift',
  sourceState: 'demo',
}
```

## Layout

The director should understand the department in this order:

1. Overall department health.
2. Six leadership signal cards.
3. Bottleneck explanation.
4. Next leadership action.
5. Drilldown links for operational teams.

Minimum layout:

| Section | Purpose |
| --- | --- |
| Health Banner | One-line department health summary with `healthy`, `watch`, or `critical` status. |
| Signal Cards | Six cards for wait times, boarding, EMS offload, staffing pressure, high-risk patients, and throughput. |
| Bottleneck Strip | Shows the top 1-3 bottlenecks affecting flow right now. |
| Leadership Action | Recommends what leadership should review, not what the system should autonomously do. |
| Trend Snapshot | Shows whether the shift is improving, stable, or worsening. |
| Drilldowns | Links to waiting room, EMS, triage, throughput, analytics, and command center views. |

## Signal Card Requirements

Each signal card must be readable at a glance.

Required fields:

- Label.
- Current value.
- Target or threshold.
- Status color/state.
- Trend.
- One-sentence interpretation.
- Drilldown route.

Do not require the ED Director to inspect tables to understand the main health state.

## Threshold Guidance

Initial demo thresholds:

| Signal | Healthy | Watch | Critical |
| --- | --- | --- | --- |
| Wait Times | Door-to-provider at or under target | Over target or worsening | Multiple patients over target or high-risk wait detected |
| Boarding | Few admitted patients waiting | Boarding pressure rising | Boarding blocks ED capacity |
| EMS Offload | Offload near target | Ambulances waiting over target | EMS queue threatens receiving capacity |
| Staffing Pressure | Demand covered | Coverage gap or surge forecast | Staffing gap plus rising arrivals/high-risk queue |
| High-Risk Patients | High-risk queue controlled | High-risk queue growing | Critical alert or delayed high-risk review |
| Throughput | Flow stable | One journey stage bottlenecked | Multiple stages bottlenecked or LOS worsening |

Thresholds should become configurable after live customer validation.

## Data Rules

- Use `EmergencyKPILayer` for Door-to-Doctor, Length of Stay, Boarding Time, EMS Offload, Referral Delay, and Discharge Time.
- Use Emergency queue intelligence for waiting room, triage, high-risk queue, admission queue, discharge queue, and bottleneck state.
- Use EMS Offload Command Center for ambulance handoff pressure.
- Use escalation and staffing signals only as human-reviewed leadership prompts.
- Label demo, manual, stale, mixed, or live source state clearly.
- Do not calculate competing KPI definitions inside the Director view.

## Non-Goals

- No autonomous staffing decisions.
- No autonomous diversion decisions.
- No autonomous admission, discharge, referral, offload, or clinical escalation decisions.
- No detailed workflow editing.
- No full hospital operations dashboard beyond ED health.

## Acceptance

ED Director understands department health in under 30 seconds.

The `/workspace/emergency/director` dashboard has a clear health summary and six standardized leadership signals: wait times, boarding, EMS offload, staffing pressure, high-risk patients, and throughput.
