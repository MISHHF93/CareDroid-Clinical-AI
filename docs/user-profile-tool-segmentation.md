# User Profile Tool Segmentation

CareDroid now uses a profile-to-tool graph to keep large tool inventories usable as the platform grows past 150-270 tools, calculators, dashboards, maps, AI workflows, and operations modules.

## Segmentation Model

The profile model is defined in `src/data/profileToolSegmentation.js` and includes:

- `role`
- `specialty`
- `department`
- `workspace`
- `permissionLevel`
- `preferredTools`
- `recentTools`
- `pinnedTools`
- `hiddenTools`
- `clinicalAccess`
- `operationsAccess`
- `trainingLevel`
- `organizationType`

Supported role examples include emergency physician, hospitalist, cardiologist, nurse, ICU clinician, pediatric clinician, pharmacist, fleet operator, biomedical engineer, administrator, researcher, and medical student.

## Tool Metadata

Every user-facing tool projection is enriched with segmentation metadata:

- `intendedRoles`
- `specialties`
- `departments`
- `workspaceTags`
- `requiredPermissions`
- `clinicalRiskLevel`
- `defaultVisible`
- `recommendedFor`
- `hiddenFor`
- `requiresBackend`
- `requiresHumanReview`

The metadata is derived from the canonical tool inventory, category, surface, route, launch type, permission policy, risk level, aliases, and description text.

## Role Matrix

- Emergency physicians see emergency calculators and workflows first, including HEART, NIHSS, qSOFA, PERC, sepsis, trauma, and acute risk tools.
- Cardiologists see cardiology and anticoagulation tools first, including CHA2DS2-VASc, HAS-BLED, GRACE ACS, TIMI, ECG, ACS, AF, and heart failure tools.
- Nurses see clinical calculators, medication safety, lab interpretation, protocols, and bedside workflow tools, while admin/security operations remain hidden.
- Fleet operators see Fleet Command, Dispatch AI, Predictive Maintenance, Route Optimizer, and map operations tools.
- Biomedical engineers see Medical IoT, telemetry, device, system health, and operational observability tools.
- Administrators see governance, audit, security, privacy, regulatory, operations, and platform management surfaces.
- Medical students see lower-risk learning, calculator, reference, and guided clinical support tools.

## Specialty Matrix

- Cardiology: ACS, ECG, AF, anticoagulation, heart failure, cardiology command surfaces.
- Emergency medicine: HEART, PERC, Wells PE, qSOFA, NIHSS, trauma, sepsis, acute triage.
- Critical care: SOFA, qSOFA, NEWS2, ventilator, ICU, telemetry, high-acuity monitoring.
- Pediatrics: pediatric, neonatal, pregnancy, OB, and pediatric sepsis tools.
- Pharmacy: drug checker, dosing support, antibiotic and medication safety workflows.
- Operations: digital twin, hospital operations, fleet, route, dispatch, and live maps.
- Research: evidence, analytics, guideline RAG, reference, and learning-oriented tools.

## Permission Rules

- Fleet tools require operations access and are visible to fleet operators, administrators, and operational users.
- Medical IoT tools are visible to clinicians, biomedical engineers, operations users, and administrators.
- Governance, security, audit, privacy, regulatory, and observability tools are admin/protected surfaces.
- High-risk AI tools require clinical or admin permission and are marked as requiring human review.
- Hidden tools are removed from default views until the user shows them again.
- Admin users can see protected platform modules that normal clinical users cannot.

## Profile Graph Card

The dashboard renders a “Profile Tool Graph Card” inside the Home surface. It displays:

- User role
- Active workspace
- Visible tool count
- Recommended tool count
- Restricted tool count
- Pinned tool count
- Recent tool count
- Specialty coverage
- Recommended tools
- Pinned calculators
- Recent tools
- Specialty-specific tools
- Workspace-specific tools
- Assistant context suggestions

## Dashboard Integration

`src/components/ProfileToolGraphCard.jsx` builds the graph from the current identity, workspace, permissions, and tool preferences. It appears on `Dashboard.jsx` as “Your Clinical Toolkit” and launches tools through the same canonical registry launch mechanism used by `/tools`.

## /tools Integration

`/tools` now defaults to “Recommended for Me” instead of showing every tool at once. Available filters include:

- Recommended for Me
- My Specialty
- My Workspace
- Pinned
- Recent
- Restricted/Unavailable
- All
- Calculators
- Guided chat
- Verified actions
- Forms and pages
- Operations
- Medical IoT
- Hospital Ops
- Reference

Restricted tools are not shown to normal users. Hidden tools do not appear in default views.

## Profile Settings

`/profile/tool-preferences` allows users to:

- Select role
- Select specialty
- Select department
- Select default workspace
- Select training level
- Select organization type
- Choose compact/full tool view
- Pin tools
- Hide tools
- Reset recommendations

Preferences are stored through `ToolPreferencesContext` local persistence.

## AI Assistant Integration

Chat capability suggestions now accept profile context. Example defaults:

- Emergency physician: HEART, NIHSS, qSOFA, PERC.
- Cardiologist: CHA2DS2-VASc, HAS-BLED, GRACE ACS, TIMI.
- Fleet operator: Fleet Command, Dispatch AI, Predictive Maintenance, Route Optimizer.

These suggestions are generated from the same profile graph used by `/tools` and the dashboard.

## Tests Added

- `src/data/profileToolSegmentation.test.js`
- `src/contexts/ToolPreferencesContext.test.jsx`
- Updated `src/pages/tools/ToolsOverview.inventory.test.jsx`
- Updated `src/pages/Dashboard.chatLayout.test.jsx`
- Updated `src/utils/chatCapabilitySuggestions.test.js`

Coverage includes metadata existence, role filtering, specialty filtering, workspace filtering, restricted tool protection, admin visibility, recommended tools, dashboard graph rendering, pinned/hidden persistence, hidden tool suppression, and profile-aware assistant recommendations.
