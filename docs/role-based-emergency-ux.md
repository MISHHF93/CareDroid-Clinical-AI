# Role-Based Emergency UX

Status: implemented

## Goal

Optimize the Emergency Workspace by role while keeping a single shared workspace shell.

Roles:

- ED Physician
- Charge Nurse
- Triage Nurse
- Resident
- ED Director

Each role should get:

- Personalized dashboard
- Personalized actions
- Personalized recommendations

Constraint: use the same Emergency workspace shell. Do not create separate apps.

## UX Rules

- Personalize the first scan by role, not by duplicating the workspace.
- Keep Emergency navigation, routes, AI assistant context, and shared operating data intact.
- Surface role-specific actions where they reduce cognitive load.
- Keep recommendations tied to human-reviewed clinical and operational workflows.
- Allow role switching inside `/workspace/emergency` so teams stay in the same workspace.

## Implementation Notes

- Added role personalization inside the shared `/workspace/emergency` command-center shell.
- Added role tabs for ED Physician, Charge Nurse, Triage Nurse, Resident, and ED Director.
- Each role now has:
  - A personalized dashboard slice.
  - A personalized action set.
  - Personalized recommendations.
- Kept routing inside the existing Emergency workspace and existing subpages.
- Preserved existing dedicated Emergency views such as Director, Charge Nurse, Triage, Whiteboard, and Evidence.
- Kept AI prompts human-reviewed and workspace-scoped.

## Files Updated

- `src/pages/WorkspaceHome.jsx`
- `src/pages/WorkspaceHome.css`
- `src/pages/WorkspaceHome.test.jsx`

## Verification

- `ReadLints`: no diagnostics for updated workspace files.
- `npm run test:run -- src/pages/WorkspaceHome.test.jsx`: 33 tests passed.
