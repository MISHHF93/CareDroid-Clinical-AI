# AI Harmonization Report

Date: 2026-06-13

## Active AI Layer

The active shared AI configuration and safety layer lives in `lib/ai/*` with browser-safe re-exports under `src/lib/ai/*`. Emergency OS uses this layer for ED Copilot context, prompt registry behavior, audit logging, and safety disclaimers.

## Normalized Assistants

- ED Copilot: operational questions, patient-flow summaries, queue/capacity/boarding/EMS context.
- Smart Intake Assistant: verification support and intake summaries with human confirmation.
- Referral Summarizer: referral context and consult summary support.
- Operational Analytics Assistant: metric explanation and bottleneck summaries.
- Workflow Launcher Assistant: command/workflow launch support.

## Safety Rules

The AI layer prevents autonomous diagnosis, prescribing, disposition decisions, patient matching/merge, and external record import without review. `lib/ai/safetyPolicy.ts` provides the runtime disclaimer and unsafe-pattern review helper.

## Audit

AI/audit plumbing is centralized through `lib/ai/auditLogger.ts`, `src/lib/ai/audit/logger.ts`, backend audit services, and workflow/action logs where applicable.

## Remaining Gaps

Production model performance, trained deterioration claims, and live external-data recommendations remain demo/facade only until data provenance, clinical validation, and governance signoff are complete.
