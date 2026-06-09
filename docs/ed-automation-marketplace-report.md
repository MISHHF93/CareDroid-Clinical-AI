# ED Automation Marketplace Report

## Goal

Package Emergency Workspace automations as sellable SaaS modules. The automation page should help buyers, operators, and implementation teams understand what each module does, whether it is enabled, what tier it belongs to, where it appears, and what ROI it can produce.

## Marketplace Categories

Emergency automations are packaged into these categories:

- Triage
- Referral
- Documentation
- EMS
- Capacity
- Boarding
- Equipment
- Discharge

## Required Automation Fields

Each marketplace module exposes:

- `enabled`: whether the automation is available for use.
- `disabled`: whether it is unavailable or blocked.
- `subscriptionTier`: starter, professional, enterprise, or equivalent package level.
- `workspaceVisibility`: Emergency Workspace surfaces where the module appears.
- `roiEstimate`: time, throughput, revenue, or coordination value estimate for buyers.

## Dashboard Route

The marketplace is mounted at:

`/workspace/emergency/automations`

The route stays inside the existing Emergency Workspace and builds on the automation registry rather than creating a separate application.

## Acceptance Mapping

Acceptance is met when Emergency automations appear as sellable modules grouped by category, with enablement state, subscription tier, workspace visibility, and ROI estimates visible on `/workspace/emergency/automations`.
