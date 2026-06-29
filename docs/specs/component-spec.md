# Component Spec

Shared surfaces:

- `AppShell`: single app shell for all product pages.
- `Sidebar`: canonical navigation from `NAVIGATION_ITEMS`.
- `HelpHub`: embedded role and procedure manual.
- `HelpTrigger`: contextual help launcher.
- `EmergencyRouteGuard`: route access using compiled profile.
- `PermissionGate`: component action access.
- `DemoUserSwitcher`: demo role switching with compiled identity.
- `ClinicalAlertsPage`: alert command surface.
- `CopilotRoute`: AI Chief surface.

Every new page must provide:

- loading state
- empty state
- error state
- contextual help topic
- canonical route
- canonical navigation item when user-facing
- route guard through canonical access
