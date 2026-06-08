# First ED Customer Readiness Audit

## Executive Readiness View

CareDroid's Emergency Workspace is sellable today as a frontend-led Emergency Flow Intelligence demo and first-customer pilot for throughput visibility, EMS handoff, triage standardization, ED command visibility, evidence surfacing, documentation readiness, and simulation practice. The strongest near-term offer is not autonomous clinical decision support. It is a review-required ED operations layer that organizes flow, queues, handoffs, evidence, and workflows around the ED patient journey.

## Stakeholder Lens

### ED Director

The strongest value is standardized triage, high-risk visibility, EMS-to-ED handoff support, complaint-specific evidence, and a coherent ED patient journey from arrival to discharge/admission. The ED Director can buy a pilot around flow visibility, protocol surfacing, and high-risk patient review without waiting for deep EHR integration.

### Chief Nursing Officer

The strongest value is nursing workflow support: triage intake, staffing visibility, queue awareness, documentation gaps, and simulation reinforcement. The CNO will need assurance that all outputs are human-review prompts and that no autonomous acuity, diagnosis, disposition, or staffing decisions are made.

### COO

The strongest value is throughput visibility and operational packaging: waiting room, active patients, high-risk patients, staffing status, referral queue, documentation queue, and automation analytics. The COO can sell the first phase as an ED command and readiness solution using local/demo data, then expand into integrations.

### Clinical Informatics Lead

The strongest value is a structured implementation map. Standalone capabilities can run with local/demo data and calculator tools. Production use of patient-specific queues, referrals, documentation, device alerts, prior authorization, and virtual ED requires EHR, ADT, telemetry, identity, policy, or workflow integrations.

## Capability Classification

| Capability | Classification | Can run standalone | Requires EHR access | Requires integrations | Buyer fit | First-customer note |
|---|---|---:|---:|---:|---|---|
| Automated Triage Matrix | Ready to sell | Yes | No for pilot, yes for production | Optional for pilot | ED Director, CNO, Clinical Informatics Lead | Sell as a flow-aware triage and risk-profile pilot with manual intake and clinician review. |
| RAG Evidence Retrieval | Ready to sell | Yes | No | Optional protocol library | ED Director, Clinical Informatics Lead | Sell as complaint-specific protocols, evidence, calculators, workflows, and simulations with citations/review. |
| Simulation Academy | Ready to sell | Yes | No | Optional LMS | CNO, ED Director | Sell as scenario recommendation and debrief support for sepsis, stroke, trauma, chest pain, and dyspnea. |
| ED Command Dashboard | Ready to sell | Yes with demo/local data | No for pilot, yes for live census | Optional for pilot | COO, ED Director, CNO | Sell as a command-center pilot using local/demo or CSV-fed data before live ADT/EHR. |
| Documentation Integrity | Needs wiring | Partial | Yes for production | EHR notes, orders/results, audit logs | CNO, Clinical Informatics Lead | UI and model are ready; production value depends on real note and result feeds. |
| Discharge Summary Drafting | Needs wiring | Partial | Yes for production | EHR documentation, medication reconciliation | ED Director, CNO, Clinical Informatics Lead | Can demo with pasted/verified events; production needs EHR source facts and review workflow. |
| Referral Routing | Needs integration | Partial | Yes | Provider directory, referral/transfer center, secure messaging | ED Director, COO | Sell after integration discovery; demo as a review queue and referral draft workflow. |
| Surge Staffing | Needs integration | Partial | No for pilot, yes for live acuity | Staff scheduling, bed board, ADT | COO, CNO | Requires live staffing/capacity feeds for production staffing decisions. |
| Medical IoT Monitoring | Needs integration | No for production | Optional | Device telemetry, biomed ticketing, monitor assignment | COO, CNO, Clinical Informatics Lead | Production value depends on telemetry freshness and device assignment feeds. |
| Virtual ED | Future roadmap | Partial | Yes | Telehealth, patient portal, EMS handoff, EHR encounter feed | ED Director, COO | Requires intake, identity, escalation, and routing integrations before first production sale. |
| Prior Authorization | Future roadmap | Partial | Yes | Payer policy API, EHR orders, document export | COO, Clinical Informatics Lead | Keep as enterprise roadmap unless a first customer has payer integration priority. |

## What Can Be Sold Today

- Emergency Flow Starter: qSOFA, NEWS2, HEART, Wells PE, Wells DVT, Shock Index, clinician-review risk profile, ED command visibility, and guided next workflow.
- ED Evidence Companion: complaint-specific evidence, protocols, calculators, workflows, and simulations for chest pain, stroke symptoms, sepsis concern, trauma, and shortness of breath.
- Simulation Academy Starter: ED scenario recommendations and debrief support using standalone simulation assets.
- ED Command Dashboard Pilot: waiting room, active patients, high-risk patients, alerts, staffing, referral, and documentation queue views with local/demo data.
- Documentation Readiness Demo: documentation gap and discharge summary drafting workflow using pasted or manually verified encounter facts.

## What Requires Integrations

- Referral Routing requires provider directory, transfer center, referral workflow, and secure messaging integrations.
- Surge Staffing requires staffing schedule, bed board, ADT/census, and operational command integrations.
- Medical IoT Monitoring requires device telemetry, monitor assignment, and biomedical ticketing integrations.
- Virtual ED requires telehealth, patient portal, EMS handoff, identity, and EHR encounter integrations.
- Prior Authorization requires payer policy, orders, documentation export, and EHR context integrations.

## What Requires EHR Access

- Production Documentation Integrity.
- Production Discharge Summary Drafting.
- Referral Routing tied to patient record and disposition.
- Virtual ED encounter creation and escalation.
- Prior Authorization packet generation.
- Live ED Command Dashboard using census, results, disposition, and patient-specific queues.

## What Can Run Standalone

- Triage calculator workflow with manual vitals, chief complaint, and intake data.
- Complaint-specific RAG/evidence companion using configured protocols or demo protocol content.
- Simulation Academy Starter.
- ED Command Dashboard with demo/local or manually loaded queue data.
- Documentation Readiness Demo from pasted, verified case facts.

## Top 5 Fastest-To-Market ED Offerings

1. Emergency Flow Starter.
2. ED Evidence Companion.
3. Simulation Academy Starter.
4. ED Command Dashboard Pilot.
5. Documentation Readiness Demo.

## Low-Effort Blockers To Remove

- Add first-customer readiness metadata directly to the canonical ED OS model.
- Expose readiness metadata through the workspace pipeline.
- Show readiness status on ED automation cards so buyers understand what is sellable now versus integration-dependent.
- Add tests that prevent ED capabilities from being added without readiness classification.

## Recommendation

Lead with Emergency Flow Starter as a first-customer pilot: flow-aware triage, ED evidence companion, dashboard pilot, and documentation readiness demo. Position Emergency Flow Professional and Emergency Flow Enterprise as integration expansion paths, not prerequisites for the first sale.
