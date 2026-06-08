# Executive Command Center Report

## Goal

The Executive Command Center gives hospital leadership a 60-second view of platform value, adoption, operational readiness, and enterprise risk.

The dashboard is designed for C-suite review. It should answer four questions quickly:

- Is the organization healthy?
- Are teams adopting the platform?
- Are automation, AI, simulation, fleet, and Medical IoT capabilities producing value?
- Are compliance, security, and operational risks visible before they become leadership escalations?

## Route

- `/executive`

## Executive KPI Strip

The top KPI strip summarizes the value story before executives read the detailed panels:

- Active Users: users represented by the customer success and organization analytics snapshot.
- Active Departments: departments configured through tenant administration or platform context.
- Adoption Score: organization adoption percentage from the organization intelligence profile.
- Automation Utilization: workflow completions and dashboard engagement as a proxy for repeatable automation.
- Training Completion: simulation completion activity for clinical education and readiness programs.
- Device Availability: Medical IoT devices currently reporting as available or online.
- Fleet Availability: fleet assets available for dispatch or service.

## Dashboard Widgets

The first implementation should render the requested widgets as concise executive panels:

- Organization Health: customer success health score, health status, retention risk, and adoption posture.
- Workspace Adoption: active workspaces and workspace usage distribution.
- Asset Pack Adoption: enabled packs, enabled assets, and pack usage.
- AI Usage: AI usage totals and AI-related usage distribution.
- Simulation Completion: training completion counts and simulation readiness.
- Fleet Health: fleet availability, utilization, maintenance, and alert pressure.
- Medical IoT Health: connected devices, offline devices, active alerts, and telemetry source state.
- Compliance Status: regulatory and audit readiness from platform governance surfaces.
- Security Status: AI security and security summary readiness from governance surfaces.
- Operational Alerts: active warnings from notifications, fleet telemetry, Medical IoT telemetry, compliance, and security.

## Data Sources

The dashboard should compose existing client-side services rather than introducing a new backend contract:

- `buildOrganizationIntelligenceProfile` for adoption, departments, workspaces, packs, AI usage, simulation completion, workflow completion, active users, recommendations, and organization health posture.
- `PlatformAssetsApi.getOrganizationAnalytics`, `PlatformAssetsApi.getCustomerSuccessDashboard`, and `PlatformAssetsApi.getTenantAdministration` for organization and customer success source data.
- `fetchFleetCommandSnapshot` for fleet summary, availability, utilization, maintenance, and visualizations.
- `fetchMedicalIotSnapshot` for device telemetry, connectivity, and device alerts.
- `fetchPlatformGovernanceSurface` for regulatory, audit, privacy, observability, and AI security status.
- `useNotifications` for current operational alerts already surfaced in the application shell.

## 60-Second Reading Flow

The layout should support the following leadership scan:

1. Start with the KPI strip to understand platform reach, adoption, training, automation, and asset availability.
2. Review Organization Health, Workspace Adoption, Asset Pack Adoption, AI Usage, and Simulation Completion to understand value realization.
3. Review Fleet Health and Medical IoT Health to understand operational readiness.
4. Review Compliance Status, Security Status, and Operational Alerts to identify risks needing executive attention.

## Safety And Source Rules

- The page is decision support for leadership and operations review only.
- It must not claim to make autonomous clinical, dispatch, staffing, regulatory, or security decisions.
- Source state should be explicit when a service is using demo, fallback, unsupported, or local data.
- Empty states should show missing telemetry honestly instead of fabricating adoption, compliance, security, device, or fleet activity.

## Acceptance Mapping

Acceptance is met when an executive can open `/executive` and understand the platform value story in 60 seconds: adoption, automation, training, fleet readiness, device readiness, compliance posture, security posture, and active operational alerts are all visible above the fold or one short scroll away.
