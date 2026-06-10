# Emergency Automation ROI Engine

## Goal

Every Emergency OS automation must justify itself with measurable operational value.

The Automation ROI Engine turns automation usage into value evidence across:

- Time saved.
- Clicks reduced.
- Queue impact.
- Throughput impact.
- Adoption.

The engine does not make clinical or operational decisions. It measures whether human-reviewed automation support is reducing friction, improving visibility, and helping ED teams move work through the department.

## Product Surface

- Service: `AutomationROIService`
- Dashboard route: `/workspace/emergency/automation-roi`
- Primary users: ED directors, charge nurses, operations leaders, implementation teams, and customer success.
- Source posture: starts with local/demo events and upgrades to live event feeds when integrations are approved.

## AutomationROIService Contract

`AutomationROIService` is the canonical ROI layer for Emergency automations. It consumes automation events, workflow registry events, queue snapshots, and KPI summaries from `EmergencyKPILayer`.

```js
export const AutomationROIService = Object.freeze({
  getAutomationRoiDashboard() {
    return {
      route: '/workspace/emergency/automation-roi',
      summaryWindow: 'current demo shift',
      sourceState: 'demo',
      totals: {
        automationsTracked: number,
        totalRuns: number,
        adoptedAutomations: number,
        estimatedMinutesSaved: number,
        estimatedClicksReduced: number,
        queueMinutesReduced: number,
        throughputMinutesReduced: number,
      },
      automations: AutomationROIProfile[],
      metricDefinitions: AutomationROIMetricDefinitions,
      safetyStatement:
        'Automation ROI measures workflow value only. It does not validate autonomous clinical, referral, discharge, admission, or escalation decisions.',
    };
  },
});
```

Each automation profile must use this shape:

```js
{
  automationId: string,
  title: string,
  status: 'core' | 'expansion' | 'roadmap',
  measurementState: 'measured' | 'demo-estimate' | 'needs-events',
  runs: number,
  adoptionRate: number,
  timeSaved: {
    minutesPerRun: number,
    totalMinutes: number,
    source: string,
  },
  clicksReduced: {
    clicksPerRun: number,
    totalClicks: number,
    source: string,
  },
  queueImpact: {
    queueId: string,
    queueMetric: string,
    estimatedMinutesReduced: number,
    source: string,
  },
  throughputImpact: {
    kpiId: string,
    estimatedMinutesReduced: number,
    source: string,
  },
  adoption: {
    eligibleEvents: number,
    automationRuns: number,
    adoptionRate: number,
    repeatUseRate: number,
  },
  valueScore: number,
}
```

## Metric Definitions

| Metric | Definition | Required Source |
| --- | --- | --- |
| `timeSaved` | Estimated minutes saved by replacing manual search, documentation, queue review, routing, or handoff preparation. | Automation run event plus benchmark baseline. |
| `clicksReduced` | Estimated clicks avoided by launching the workflow from ED context instead of separate tools/pages. | UI event count, launch path, or demo baseline. |
| `queueImpact` | Estimated reduction in queue age, unresolved items, missing data, or blocked handoffs. | Queue snapshot before/after automation use. |
| `throughputImpact` | Estimated reduction against ED KPIs such as Door-to-Doctor, LOS, boarding, EMS offload, referral delay, or discharge time. | `EmergencyKPILayer` metric delta or demo estimate. |
| `adoption` | Share of eligible workflow opportunities where the automation was used. | Eligible event count and automation run count. |
| `valueScore` | Weighted summary score used for dashboard ranking. | Time saved, clicks reduced, queue impact, throughput impact, and adoption. |

Suggested value score:

```js
valueScore =
  timeSavedScore * 0.3 +
  clicksReducedScore * 0.15 +
  queueImpactScore * 0.25 +
  throughputImpactScore * 0.2 +
  adoptionScore * 0.1;
```

## Required Automation ROI Profiles

Every Emergency automation must have an ROI profile before it is promoted as core, expansion, or sellable.

```js
export const EmergencyAutomationROIProfiles = Object.freeze([
  Object.freeze({
    automationId: 'emergency-automated-triage-matrix',
    title: 'Automated Triage Matrix',
    status: 'core',
    valueHypothesis:
      'Reduces triage setup time by turning arrival, vitals, chief complaint, and intake facts into a review-ready risk profile.',
    requiredMetrics: ['timeSaved', 'clicksReduced', 'queueImpact', 'throughputImpact', 'adoption'],
    primaryQueueImpact: 'triage queue age',
    primaryThroughputImpact: 'doorToDoctor',
    adoptionEvent: 'triage_risk_profile_created',
    baselineComparison: 'manual calculator selection and triage note preparation',
  }),
  Object.freeze({
    automationId: 'emergency-rag-evidence-retrieval',
    title: 'RAG Evidence Retrieval',
    status: 'core',
    valueHypothesis:
      'Reduces protocol search time and context switching by surfacing complaint-specific protocols, calculators, workflows, and simulations.',
    requiredMetrics: ['timeSaved', 'clicksReduced', 'queueImpact', 'throughputImpact', 'adoption'],
    primaryQueueImpact: 'high-risk queue review time',
    primaryThroughputImpact: 'doorToDoctor',
    adoptionEvent: 'protocol_retrieval_created',
    baselineComparison: 'manual protocol lookup and separate calculator/tool search',
  }),
  Object.freeze({
    automationId: 'emergency-referral-routing',
    title: 'Referral Routing',
    status: 'expansion',
    valueHypothesis:
      'Reduces referral delay by creating reviewable consult, transfer, specialty, and follow-up queue items with missing data checks.',
    requiredMetrics: ['timeSaved', 'clicksReduced', 'queueImpact', 'throughputImpact', 'adoption'],
    primaryQueueImpact: 'referral queue age',
    primaryThroughputImpact: 'referralDelay',
    adoptionEvent: 'referral_queue_item_created',
    baselineComparison: 'manual consult tracking, handoff drafting, and missing-data follow-up',
  }),
  Object.freeze({
    automationId: 'emergency-surge-staffing',
    title: 'Surge Staffing',
    status: 'expansion',
    valueHypothesis:
      'Reduces operational review lag by converting waiting room, acuity, active patient, disposition, and staffing signals into a surge watch summary.',
    requiredMetrics: ['timeSaved', 'clicksReduced', 'queueImpact', 'throughputImpact', 'adoption'],
    primaryQueueImpact: 'waiting room and triage backlog',
    primaryThroughputImpact: 'lengthOfStay',
    adoptionEvent: 'surge_watch_created',
    baselineComparison: 'manual capacity huddle preparation and staffing status review',
  }),
  Object.freeze({
    automationId: 'emergency-simulation-academy',
    title: 'Simulation Academy',
    status: 'expansion',
    valueHypothesis:
      'Improves training follow-through by turning ED patterns, protocol gaps, and missed calculator events into recommended simulations.',
    requiredMetrics: ['timeSaved', 'clicksReduced', 'queueImpact', 'throughputImpact', 'adoption'],
    primaryQueueImpact: 'training recommendation backlog',
    primaryThroughputImpact: 'protocol adherence proxy',
    adoptionEvent: 'simulation_recommendation_created',
    baselineComparison: 'manual training assignment and debrief preparation',
  }),
  Object.freeze({
    automationId: 'emergency-medical-iot-monitoring',
    title: 'Medical IoT Monitoring',
    status: 'expansion',
    valueHypothesis:
      'Reduces equipment-related delays by surfacing device alerts, telemetry freshness, battery risk, and biomedical review tasks.',
    requiredMetrics: ['timeSaved', 'clicksReduced', 'queueImpact', 'throughputImpact', 'adoption'],
    primaryQueueImpact: 'device alert queue age',
    primaryThroughputImpact: 'lengthOfStay',
    adoptionEvent: 'device_alert_review_created',
    baselineComparison: 'manual device status review and biomedical follow-up',
  }),
  Object.freeze({
    automationId: 'emergency-documentation-integrity',
    title: 'Documentation Integrity',
    status: 'expansion',
    valueHypothesis:
      'Reduces documentation completion time by finding missing triage facts, unsigned drafts, inconsistent result references, and disposition gaps.',
    requiredMetrics: ['timeSaved', 'clicksReduced', 'queueImpact', 'throughputImpact', 'adoption'],
    primaryQueueImpact: 'documentation queue age',
    primaryThroughputImpact: 'dischargeTime',
    adoptionEvent: 'documentation_gap_flagged',
    baselineComparison: 'manual chart completeness review and source fact checking',
  }),
  Object.freeze({
    automationId: 'emergency-discharge-summary-drafting',
    title: 'Discharge Summary Drafting',
    status: 'expansion',
    valueHypothesis:
      'Reduces discharge delay by drafting review-required discharge or admission summaries from verified ED timeline facts.',
    requiredMetrics: ['timeSaved', 'clicksReduced', 'queueImpact', 'throughputImpact', 'adoption'],
    primaryQueueImpact: 'discharge queue age',
    primaryThroughputImpact: 'dischargeTime',
    adoptionEvent: 'discharge_summary_draft_created',
    baselineComparison: 'manual discharge summary drafting and missing-data checklist creation',
  }),
  Object.freeze({
    automationId: 'emergency-virtual-ed',
    title: 'Virtual ED',
    status: 'roadmap',
    valueHypothesis:
      'Could reduce arrival and triage delay by converting remote intake into a review-ready virtual triage packet.',
    requiredMetrics: ['timeSaved', 'clicksReduced', 'queueImpact', 'throughputImpact', 'adoption'],
    primaryQueueImpact: 'pre-arrival queue age',
    primaryThroughputImpact: 'doorToDoctor',
    adoptionEvent: 'virtual_triage_packet_created',
    baselineComparison: 'manual telehealth intake review and arrival handoff preparation',
  }),
  Object.freeze({
    automationId: 'emergency-prior-authorization',
    title: 'Prior Authorization',
    status: 'roadmap',
    valueHypothesis:
      'Could reduce payer-related disposition and follow-up friction by preparing review-required authorization packets.',
    requiredMetrics: ['timeSaved', 'clicksReduced', 'queueImpact', 'throughputImpact', 'adoption'],
    primaryQueueImpact: 'authorization queue age',
    primaryThroughputImpact: 'lengthOfStay',
    adoptionEvent: 'prior_authorization_packet_created',
    baselineComparison: 'manual payer criteria lookup, packet assembly, and evidence checklist preparation',
  }),
]);
```

## Dashboard Requirements

`/workspace/emergency/automation-roi` must answer one question: which automations are creating measurable ED value?

The dashboard should show:

- Total estimated minutes saved.
- Total clicks reduced.
- Queue minutes reduced.
- Throughput minutes reduced.
- Automation adoption rate.
- Top value-producing automations.
- Low-adoption automations that need workflow redesign.
- Automations with missing measurement events.
- ROI by workflow, queue, and KPI.

Minimum cards:

| Card | Purpose |
| --- | --- |
| Automation Value Summary | Total minutes saved, clicks reduced, queue impact, throughput impact, and adoption. |
| Automation Ranking | Sort automations by `valueScore`. |
| Adoption Funnel | Eligible events, automation launches, completed runs, repeat usage. |
| Queue Impact | Queue age or blocked-work reduction by automation. |
| Throughput Impact | KPI movement linked to automation use. |
| Measurement Gaps | Automations missing eligible events, run events, queue snapshots, or KPI links. |

## Event Model

Every automation needs these events:

| Event | Required Fields |
| --- | --- |
| `automation_eligible` | `automationId`, `workflowId`, `queueId`, `kpiId`, `timestamp`, `sourceState` |
| `automation_started` | `automationId`, `workflowId`, `userRole`, `entrySurface`, `timestamp` |
| `automation_completed` | `automationId`, `workflowId`, `durationSeconds`, `outputsCreated`, `timestamp` |
| `automation_accepted` | `automationId`, `workflowId`, `reviewerRole`, `acceptedOutputCount`, `timestamp` |
| `automation_dismissed` | `automationId`, `workflowId`, `reason`, `timestamp` |
| `queue_snapshot` | `queueId`, `beforeAgeMinutes`, `afterAgeMinutes`, `automationId`, `timestamp` |
| `kpi_snapshot` | `kpiId`, `beforeValue`, `afterValue`, `automationId`, `timestamp` |

Adoption is calculated as:

```js
adoptionRate = automation_completed / automation_eligible;
repeatUseRate = usersWithMultipleRuns / usersWithAnyRun;
```

## Measurement Rules

- No automation can be promoted without a value hypothesis.
- No automation can be called successful without adoption.
- Time saved and clicks reduced may start as demo estimates, but must be labeled by source state.
- Queue impact must identify the queue being improved.
- Throughput impact must map to a canonical `EmergencyKPILayer` metric when applicable.
- Low adoption is a product signal, not a user failure.
- Clinical correctness is not measured by this service; all outputs remain human-reviewed.

## Acceptance

Every automation has measurable value.

The Emergency OS has a canonical `AutomationROIService` contract and `/workspace/emergency/automation-roi` dashboard target that require each automation to report time saved, clicks reduced, queue impact, throughput impact, and adoption before it can justify continued priority.
