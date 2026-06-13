# AI Safety Policy

## Policy Source

Runtime safety constants live in:

- `lib/ai/safetyPolicy.ts`
- `src/lib/ai/safety/policy.ts`

## Required Disclaimers

Clinical or patient-specific AI responses must include:

> Human review required. This is not a replacement for clinical judgment.

External-data AI responses must include:

> External health record data requires clinician review before use.

## Required Request Metadata

Patient-specific AI requests must include:

- `userId`
- `tenantId`
- `patientId` if applicable
- `encounterId` if applicable
- `purpose`
- `sourceModule`

The active frontend client now sends this envelope for ED Copilot calls. The backend Emergency AI route facade copies it into `workspaceContext.aiRequest` so downstream audit/routing layers can access it.

## Unsafe Autonomous Actions

AI must not:

- Diagnose autonomously.
- Prescribe.
- Make disposition decisions.
- Replace clinical judgment.
- Auto-triage without human review.
- Auto-merge patients.
- Auto-import external health data.
- Make autonomous identity decisions.

## Tenant Defaults

Unclear or higher-risk AI capabilities default disabled:

- Global AI: disabled by default.
- ED Copilot: enabled unless explicitly disabled.
- Smart Intake AI: disabled by default.
- Referral AI: disabled by default.
- Analytics AI: disabled by default.
- Clinical Workflow AI: disabled by default.
- Audit logging: enabled by default.
- Patient context: disabled by default.

## Safety Controls Found

- `backend/src/modules/chat/chat.service.ts`: platform governance review, intent classification, audit logging, emergency escalation logic, RAG confidence metadata.
- `backend/src/modules/ai-gateway/ai-gateway.service.ts`: run envelope, PHI flagging, human review policy, route audit.
- `lib/ai/toolRegistry.ts`: mutating tools return pending actions requiring human confirmation.
- `backend/src/services/copilot.service.ts`: blocks unsafe priority changes and includes review messaging.
- `lib/ai/safetyPolicy.ts`: central runtime disclaimer and unsafe-pattern review helper.

## Remaining Risks

- Legacy generic AI endpoints remain mounted and should be narrowed to Emergency OS or archived.
- Some older prompt templates use broad “clinical assistant” language in comments/docs/tests; active runtime prompts have been centralized.
- Durable audit logging is strongest on backend `ChatService`; frontend console audit is only a local envelope helper.
