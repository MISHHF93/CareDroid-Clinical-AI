# Emergency Command Center Report

## Goal

Create one ED director screen that summarizes department status in under 60 seconds. The Command Center becomes the hero page for Emergency Workspace leadership.

## Route

The director screen is mounted at:

`/workspace/emergency/command-center`

## Required Sections

The Command Center shows:

- Waiting Room
- EMS Arrivals
- High Risk Queue
- Boarding Pressure
- Referral Queue
- Capacity Score
- Equipment Status
- Automation Status

## Operating Model

The Command Center aggregates Emergency Workspace intelligence instead of creating another disconnected dashboard. It should reuse:

- Queue Intelligence for waiting-room and high-risk queue status.
- EMS Pre-arrival Pipeline for inbound patients and ETA.
- Boarding Intelligence Engine for admitted patients waiting for beds.
- ReferralHub for delayed referrals and department queue pressure.
- Capacity Intelligence for department pressure and capacity score.
- Medical IoT and automation registry data for equipment and automation status.

## Acceptance Mapping

Acceptance is met when leadership can open `/workspace/emergency/command-center` and understand waiting room, EMS, high-risk patients, boarding, referrals, capacity, equipment, and automation status in under 60 seconds.
