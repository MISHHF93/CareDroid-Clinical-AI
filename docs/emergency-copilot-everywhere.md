# Emergency Copilot Everywhere

Status: implemented

## Goal

Reduce dependency on menus by allowing Copilot to launch Emergency actions directly.

Copilot can launch:

- Calculators
- Protocols
- Workflows
- Referrals
- Simulations
- Analytics

Users can type:

- `Stroke patient`
- `Show high-risk waiting patients`

Expected outcome: users navigate instantly from command text to the correct Emergency surface.

## Command-to-Action Model

- Accept natural-language clinical or operational commands.
- Resolve complaint language to complaint workflows, calculators, and protocols.
- Resolve operational language to Emergency queues, referrals, simulations, analytics, and escalation surfaces.
- Keep actions in the same Emergency workspace shell.
- Preserve human review boundaries for clinical and AI-guided outputs.

## Implementation Notes

- Added a `Command-to-action launcher` to the shared `/workspace/emergency` command-center shell.
- Added natural-language command resolution for complaint and operational commands.
- `Stroke patient` resolves to the Stroke Symptoms pathway, including NIHSS, protocols, and workflow guidance.
- `Show high-risk waiting patients` resolves to the waiting-room risk and reassessment surface.
- Copilot can launch:
  - Calculators via triage.
  - Protocols via evidence.
  - Workflows via evidence or command center.
  - Referrals via ReferralHub.
  - Simulations via Emergency simulations.
  - Analytics via Emergency analytics.
- Commands seed a human-reviewed Copilot prompt and navigate instantly to the mapped Emergency route.
- Kept all behavior inside the existing Emergency workspace shell.

## Files Updated

- `src/pages/WorkspaceHome.jsx`
- `src/pages/WorkspaceHome.css`
- `src/pages/WorkspaceHome.test.jsx`

## Verification

- `ReadLints`: no diagnostics for updated workspace files.
- `npm run test:run -- src/pages/WorkspaceHome.test.jsx`: 34 tests passed.
