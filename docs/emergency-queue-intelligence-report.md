# Emergency Queue Intelligence Report

## Goal

Emergency departments run on queues. Queue Intelligence gives the Emergency Workspace a deterministic operating layer that tracks queue load, wait pressure, oldest-patient risk, and throughput before bottlenecks become obvious to staff.

## Canonical Emergency Queues

CareDroid tracks these ED queues:

1. Waiting Room
2. Triage Queue
3. Provider Queue
4. Results Queue
5. Referral Queue
6. Admission Queue
7. Discharge Queue

Each queue is mapped to one or more Patient Journey Engine states so patient-flow and queue-flow signals stay aligned.

## Queue Metrics

Every queue tracks:

- `count`: active patients or tasks currently in the queue.
- `waitTime`: current median or representative wait time in minutes.
- `oldestPatient`: the oldest waiting patient or case in the queue.
- `riskLevel`: low, medium, high, or critical operational risk.
- `throughput`: patients or tasks completed per hour.

## QueueIntelligenceService Contract

`QueueIntelligenceService` provides the Emergency Workspace with:

- Canonical queue definitions and demo-safe queue state.
- Queue summaries for dashboard cards.
- Bottleneck detection using wait-time targets, queue count, oldest-patient wait, risk level, and throughput.
- Recommendations that route staff to review queues before downstream delays appear.

The service does not perform clinical actions, alter acuity, submit referrals, admit patients, or discharge patients. It identifies operational pressure and creates review context for humans.

## Dashboard Integration

The Emergency Queue Intelligence dashboard is mounted at:

`/workspace/emergency/queues`

The dashboard should show each queue with count, wait time, oldest patient, risk level, throughput, and bottleneck status. It should also summarize which queues require staff attention first.

## Acceptance Mapping

CareDroid can identify bottlenecks before staff notice them when the Emergency Workspace exposes queue bottlenecks, queue recommendations, and early-warning signals through the dashboard and workspace data pipeline.
