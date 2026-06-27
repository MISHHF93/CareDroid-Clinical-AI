# CareDroid Copilot Instructions

CareDroid is the AI Chief of Staff for emergency department and hospital operations. Its highest-priority mission is: "Help save a human life in the first 3 minutes of any critical alert or patient arrival." Always refine the current codebase first. Do not create a new app, replace working routes, or remove existing functionality unless explicitly requested.

Core engineering rules:
- Follow the existing React, Vite, Nest, TypeScript, routing, state, and styling patterns.
- Prefer incremental refactoring over rewrites.
- Keep AI calls centralized through the CareDroid AI node/service in `lib/ai/careDroidAI.ts`.
- Use backend `/ai/node`, frontend `src/services/careDroidAiApi.ts`, and `src/hooks/useCareDroidAI.ts` for AI workflows.
- Do not call AI providers directly from UI components.
- Use typed interfaces, exported schemas, and predictable JSON response shapes.
- Preserve existing props and routes when editing shared components.
- Keep loading, empty, and error states accessible.
- Maintain WCAG AA intent: semantic HTML, keyboard focus, labels, and status regions.
- Never hardcode secrets or expose provider keys to frontend code.
- Never log protected health information. Log only operational metadata such as intent, field names, status, timing, and confidence.

AI safety rules:
- AI is clinical decision support, not a replacement for clinicians.
- Clinical AI outputs must require clinician review.
- Recommendations must include confidence, reasoning, warnings, and next actions.
- Avoid definitive diagnosis language.
- Flag incomplete data and emergency red flags clearly.
- Provide accept, modify, dismiss, and escalate affordances in UI.
- Every clinical recommendation must require clinician review and allow clinician override.
- Never display raw AI JSON to end users.

First 3 minutes principle:
- Help staff answer: who needs help first, why are they critical, where should they go, who must be notified, what is the next safest action, what information is missing, and whether a clinician reviewed it.
- Critical arrivals and severe alerts must expose a response timer, severity, patient status, responsible role, acknowledgement state, escalation state, next action, and clinician review state.
- 0:00-0:30 capture complaint, detect red flags, mark priority, and start timer.
- 0:30-1:00 suggest ESI-style acuity, identify missing life-critical data, and notify nurse/doctor/team lead.
- 1:00-2:00 recommend routing and next safest action, and surface allergies, medications, history, and vital risks.
- 2:00-3:00 escalate if unacknowledged, generate handoff, update command center, and show clinician review required.

Supported CareDroid AI intents:
- `patient_intake_assist`
- `critical_alert_assessment`
- `three_minute_response_plan`
- `triage_recommendation`
- `patient_summary`
- `department_routing`
- `wait_time_prediction`
- `staff_resource_insight`
- `hospital_command_insight`
- `escalation_recommendation`
- `handoff_summary`

Universal AI response shape:

```json
{
  "intent": "triage_recommendation",
  "status": "success",
  "priority": "critical | high | medium | low",
  "data": {},
  "confidence": 0.87,
  "reasoning": [],
  "warnings": [],
  "redFlags": [],
  "nextActions": [],
  "assignedRole": "Responsible clinician",
  "recommendedDepartment": "Emergency Department",
  "requiresClinicianReview": true,
  "clinicianOverrideAvailable": true,
  "generatedAt": "ISO_TIMESTAMP",
  "safetyDisclaimer": "This AI output is decision support only and must be reviewed by a licensed clinician."
}
```

Frontend AI display rules:
- Use reusable AI components from `src/components/ai`.
- Do not display raw AI JSON to users.
- Show recommendation, confidence, reasoning, warnings, next actions, review requirement, and override controls.
- Use the frontend API client/hook (`src/services/careDroidAiApi.ts`, `src/hooks/useCareDroidAI.ts`) instead of scattered component fetch calls.

Testing expectations:
- Add focused tests for AI schema validation, response shape, error handling, fallback behavior, and AI card rendering.
- Keep the app buildable with frontend typecheck and Vite build.
