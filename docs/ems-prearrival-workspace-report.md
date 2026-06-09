# EMS Pre-Arrival Workspace Report

## Goal

Create the EMS to ED pipeline so the Emergency Workspace starts the patient journey before arrival. The ED should receive structured context early enough to prepare triage, rooms, staff, equipment, and protocols before the patient reaches the door.

## Pre-Arrival Workflow

The EMS pre-arrival workflow is:

1. EMS Assessment
2. Complaint
3. Vitals
4. Risk Profile
5. ED Notification
6. Arrival

This workflow feeds the Patient Journey Engine's `arrival` state and gives the ED structured context before the patient enters the department.

## Required Features

The Emergency Workspace pre-arrival surface must include:

- `pre-arrival queue`: incoming EMS cases awaiting ED arrival.
- `incoming patients`: named or case-labeled inbound patients.
- `ETA`: estimated arrival timing and urgency.
- `risk score bundle`: reviewable risk indicators from complaint, vitals, and protocols.
- `handoff summary`: structured EMS to ED summary for clinicians.

## Workspace Route

The EMS pre-arrival dashboard is mounted at:

`/workspace/emergency/pre-arrival`

The route stays inside the existing Emergency Workspace shell and does not create a separate EMS application.

## Safety And Review Model

The EMS to ED pipeline prepares context only. It does not diagnose, assign final acuity, place orders, admit patients, discharge patients, or write to external systems without human review. All risk bundles and handoff summaries are review prompts for ED staff.

## Acceptance Mapping

Acceptance is met when `/workspace/emergency/pre-arrival` shows incoming patients with ETA, risk score bundle, and handoff summary, and the Emergency Workspace data pipeline exposes this structured pre-arrival context before patient arrival.
