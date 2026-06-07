# Role Intelligence Layer Report

## Summary

The Role Intelligence Layer makes CareDroid adapt to what each user is trying to do by role, specialty, workspace, and safe behavior signals.

The layer builds on existing profile segmentation, asset entitlement, simulation, analytics, usage metering, pack, and AI agent registry systems. It does not require raw clinical text or PHI to personalize the platform.

## Supported Roles

The initial role-aware experience covers:

- Emergency Physician
- Nurse
- Cardiologist
- Researcher
- Administrator
- Biomedical Engineer

The implementation also preserves existing profile roles such as hospitalist, ICU clinician, pediatric clinician, pharmacist, fleet operator, and medical student.

## Tracked Signals

| Signal | Safe Payload |
| --- | --- |
| Asset usage | Asset id, launch mode, route, role, specialty, workspace, source |
| Search behavior | Search length, result count, filter, role, specialty, workspace |
| AI requests | Agent/tool id, request source, role, specialty, workspace |
| Simulations completed | Scenario id, role, specialty, progress, safety score, completed flag |
| Workflows launched | Workflow or asset id, route, role, specialty, workspace, source |

The layer records coarse metadata only. It avoids patient identifiers, raw messages, free-text search content, notes, and query text.

## Intelligence Profile

Each Role Intelligence Profile exposes:

- Role identity: normalized role, display label, specialty, department, and active workspace.
- Behavioral posture: recent asset usage, search activity, AI request activity, simulation completion, and workflow launch signals.
- Discovery context: entitled assets, enabled packs, visible workspace assets, role profile, and recent tool preferences.
- Recommendation output: recommended assets, packs, simulations, and AI agents with short explanations.

## Recommendation Categories

| Recommendation | Logic |
| --- | --- |
| Recommended Assets | Use role/specialty/workspace fit, entitlement visibility, recent use, and favorites |
| Recommended Packs | Match pack role mappings, target roles, modules, included assets, organization type, and install state |
| Recommended Simulations | Match scenario target roles, specialty, category, recent completion, and next-scenario links |
| Recommended AI Agents | Match agent role awareness, workspace awareness, capabilities, and mapped asset access |

## Adaptation Acceptance

Acceptance is met when the platform becomes role-aware and adaptive across discovery, training, AI, and workflow surfaces.

Examples:

- Emergency Physicians see emergency tools, sepsis/stroke/trauma simulations, and Emergency or Clinical AI first.
- Nurses see bedside workflow tools, medication safety, abnormal lab escalation, and nursing-relevant simulations.
- Cardiologists see ACS and cardiology calculators, chest-pain simulations, and clinical guidance agents.
- Researchers see evidence, guideline, analytics, and Research AI assets prioritized.
- Administrators see governance, analytics, packs, workflow opportunities, and operations agents.
- Biomedical Engineers see medical IoT, device, telemetry, operations packs, and device-alarm simulations.

## Implementation Notes

The first implementation should compose existing frontend and backend APIs rather than introduce new persistence. Role-aware telemetry should flow through the existing analytics and usage metering paths, and recommendations should remain explainable, deterministic, and safe for clinical decision-support contexts.
