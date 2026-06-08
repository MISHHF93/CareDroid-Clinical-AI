# Emergency MVP Packaging Report

## Goal

Reduce the Emergency Department Solution to the smallest sellable package that can be piloted without deep EHR, ADT, device, staffing, referral, or payer integrations.

## Smallest Sellable Package

### Emergency Core

Emergency Core is the MVP package. It contains only:

- qSOFA
- NEWS2
- HEART
- Wells PE
- Wells DVT
- Shock Index
- AI Assistant
- Protocol Retrieval
- Workflow Guidance
- Workspace Dashboard

This package is pricing-ready because it can be positioned as a standalone ED triage and workflow-guidance layer with clinician review. It does not require autonomous clinical decisions, live EHR writes, or production device integrations to demonstrate value.

## Why These Capabilities Stay In Core

| Capability | Reason it belongs in Emergency Core | Dependency posture |
|---|---|---|
| qSOFA | High-value sepsis screening calculator for triage standardization. | Standalone/manual input. |
| NEWS2 | Broad deterioration screening score for abnormal vitals. | Standalone/manual input. |
| HEART | Chest pain triage and risk workflow support. | Standalone/manual input. |
| Wells PE | Pulmonary embolism risk workflow support. | Standalone/manual input. |
| Wells DVT | DVT risk workflow support and VTE context. | Standalone/manual input. |
| Shock Index | Simple hemodynamic risk signal for trauma, bleeding, and instability. | Standalone/manual input. |
| AI Assistant | Workspace-aware guidance and routing surface. | Available with current assistant flow. |
| Protocol Retrieval | Complaint-specific protocol and evidence surfacing. | Can start with configured/demo protocol content. |
| Workflow Guidance | Routes clinicians to calculators, protocols, review steps, and next workflows. | Standalone guidance, no autonomous action. |
| Workspace Dashboard | ED-specific command surface for the MVP story. | Can run with local/demo or manually loaded data. |

## Optional Add-Ons

Everything outside Emergency Core becomes optional:

- Documentation Integrity
- Discharge Summary Drafting
- Referral Routing
- Surge Staffing
- Simulation Academy
- Medical IoT Monitoring
- Virtual ED
- Prior Authorization

These add-ons are valuable, but they introduce EHR, ADT, documentation, staffing, device telemetry, LMS, telehealth, transfer center, secure messaging, or payer-policy dependencies. They should be sold as expansion modules after Emergency Core is accepted.

## Pricing-Ready Metadata

| Field | Emergency Core |
|---|---|
| Package ID | `emergency-core-mvp` |
| Product | Emergency Department Solution |
| Buyer | ED Director, Chief Nursing Officer, COO, Clinical Informatics Lead |
| Positioning | Standalone ED triage, evidence, workflow guidance, and dashboard pilot |
| Billing metric | Per ED site per month, with optional clinician-seat metric |
| Trial posture | 30-60 day pilot with manual/local data and no EHR writeback |
| Implementation dependency | Low |
| EHR dependency | Not required for MVP pilot |
| Integration dependency | Not required for MVP pilot |
| Human review | Required for every clinical output |
| Upgrade path | Add documentation, referrals, staffing, IoT, virtual ED, simulation, and prior authorization modules |

## Packaging Rule

Emergency Core must remain narrow. If a capability requires patient-specific EHR data, external workflow submission, device telemetry, payer policy access, telehealth intake, or staffing system integration, it is not part of Core. It belongs in an add-on or higher-tier expansion bundle.

## Recommendation

Lead first customer conversations with Emergency Core. Sell it as a low-integration ED operating pilot that standardizes triage calculators, surfaces protocol guidance, and demonstrates ED workspace value quickly. Use optional add-ons to expand after buyer validation.
