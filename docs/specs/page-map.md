# CareDroid Page Map

All pages run inside the shared `AppShell` and expose contextual HelpHub guidance.

| Product page | Runtime route | Current implementation |
| --- | --- | --- |
| Dashboard / Hospital Command Center | `/emergency/whiteboard` | `EmergencyWhiteboard` |
| Patient Intake | `/emergency/intake`, embedded reception intake | `SmartIntake`, `ReceptionWorkspace` |
| Patient Queue | `/emergency/queues` | `QueueRoute` |
| Triage | `/emergency/reception?queue=pretriage` | `ReceptionWorkspace` triage queue |
| Patient Profile | `/emergency/patients` and patient panel | `PatientsRoute`, patient detail components |
| Critical Alerts | `/emergency/alerts` | `ClinicalAlertsPage` |
| AI Chief | `/emergency/copilot` | `CopilotRoute` |
| Staff Command | `/emergency/shift`, `/admin/staff-workflows` | shift summary and staff workflow admin |
| Departments | `/emergency/capacity` | `CapacityRoute` |
| Analytics | `/emergency/analytics` | `EmergencyAnalytics` |
| Reports | `/reports` alias to analytics | analytics/reporting view |
| Settings/Admin | `/emergency/settings`, `/admin` | `EmergencySettings`, admin operations |
| Help/User Manual | `/emergency/help` | `HelpHubPage` |

Loading is handled by `LazyRoute`. Route access is handled by `EmergencyRouteGuard` and `CareDroidRouteGuard`.
