# Emergency Flow Intelligence Operating Report

## Goal

Transform the Emergency Workspace from a collection of emergency-adjacent tools into a sellable Emergency Flow Intelligence Platform. The platform must run as a workspace mode inside the existing CareDroid AppShell and Sidebar, with one canonical patient journey, one emergency automation model, and one operational dashboard.

## Canonical Emergency Patient Journey

Emergency Flow Intelligence is anchored to this journey:

Patient -> Arrival -> Registration -> Triage -> Clinical Assessment -> Orders -> Results -> Disposition -> Discharge/Admission

Every emergency automation maps to one or more journey stages:

- Automated Triage Matrix: Arrival, Registration, Triage, Clinical Assessment.
- Referral Routing: Clinical Assessment, Results, Disposition.
- Surge Staffing: Arrival, Triage, Clinical Assessment, Disposition.
- Simulation Academy: Triage, Clinical Assessment, Disposition.
- Medical IoT Monitoring: Triage, Clinical Assessment, Results.
- Documentation Integrity: Registration, Clinical Assessment, Orders, Results, Disposition, Discharge/Admission.
- RAG Evidence Retrieval: Triage, Clinical Assessment, Orders, Results, Disposition.
- Virtual ED: Arrival, Registration, Triage, Clinical Assessment, Disposition.
- Discharge Summary Drafting: Results, Disposition, Discharge/Admission.
- Prior Authorization: Disposition, Discharge/Admission.

## Emergency Automation Registry

Each ED automation must define trigger, inputs, outputs, required assets, required AI, required integrations, human review requirement, and workspace visibility. The registry is not a launch list; it is an operating contract that tells the workspace when an automation appears, what data it needs, what it can produce, and where human review is mandatory.

Automation availability by tier:

- Emergency Flow Starter: Automated Triage Matrix, Documentation Integrity, RAG Evidence Retrieval, Discharge Summary Drafting.
- Emergency Flow Professional: Starter plus Referral Routing, Surge Staffing, Simulation Academy, Medical IoT Monitoring, Virtual ED.
- Emergency Flow Enterprise: Professional plus Prior Authorization and expanded enterprise integrations.

## Emergency Dashboard

The Emergency dashboard should expose only ED operating surfaces:

- Waiting Room
- Active Patients
- High-Risk Patients
- Critical Alerts
- Device Alerts
- Staffing Status
- Referral Queue
- Documentation Queue

Unrelated enterprise, billing, governance, and global platform widgets should stay outside the emergency dashboard. Those remain available through their own workspaces or top-level routes.

## Emergency Subpages

Emergency Flow Intelligence uses the existing workspace route owner:

- `/workspace/emergency/dashboard`
- `/workspace/emergency/triage`
- `/workspace/emergency/patients`
- `/workspace/emergency/referrals`
- `/workspace/emergency/documentation`
- `/workspace/emergency/evidence`
- `/workspace/emergency/simulations`
- `/workspace/emergency/iot`
- `/workspace/emergency/analytics`
- `/workspace/emergency/automations`

These are workspace subpages, not a separate application.

## Triage Orchestrator

The orchestrator collects vitals, chief complaint, and intake data, then recommends calculator execution for qSOFA, NEWS2, HEART, Wells PE, Wells DVT, and Shock Index. It generates a risk profile for clinician review. It must not diagnose, disposition, or make autonomous clinical decisions.

## RAG And AI Orchestration

When a complaint is entered, the ED OS surfaces emergency-context evidence:

- Chest Pain: ACS protocols, HEART, ECG/troponin workflows, chest pain simulations.
- Stroke Symptoms: stroke window workflows, NIHSS, imaging/escalation evidence, stroke simulations.
- Sepsis Concern: sepsis protocols, qSOFA, NEWS2, lactate/culture workflow, sepsis simulations.
- Trauma: trauma primary survey, Shock Index, Revised Trauma Score, ATLS simulation context.
- Shortness of Breath: respiratory distress evidence, Wells PE, NEWS2, oxygen escalation, airway simulations.

All AI outputs are recommendations for human review, with traceable evidence and workflow context.

## Acceptance Model

The Emergency Workspace behaves as a sellable Emergency Department SaaS solution when:

- The dashboard is ED-specific and journey-driven.
- The ten ED automations share the same patient journey model.
- Triage, evidence retrieval, documentation, referral, IoT, simulation, staffing, virtual ED, discharge, and prior authorization workflows are presented as connected operating capabilities.
- The existing AppShell and Sidebar remain the single frontend shell.
- Analytics track triage volume, calculator utilization, referral volume, documentation drafts, AI recommendation acceptance, automation execution, and simulation completion.
