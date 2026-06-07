# Customer Knowledge Base Report

## Goal

Customer training should become self-service through a tenant-aware knowledge base that gives organizations a single place to learn CareDroid onboarding, workflows, calculators, simulations, integrations, AI agents, and troubleshooting.

## Route

- `/knowledge-base`

## Required Content

- Onboarding
- Workflows
- Calculators
- Simulations
- Integrations
- AI agents
- Troubleshooting

## Implementation Scope

The knowledge base should provide searchable, structured customer education content in the frontend and a reusable search utility for the AI assistant. The assistant should search knowledge base content first and use matching training articles as context before falling back to general assistant behavior.

## Safety Rules

- Knowledge base content should be customer-safe and avoid exposing internal operational details.
- Search results should be deterministic and explainable.
- Assistant prompts should include knowledge base matches only when relevant.
- Content categories and article ids should be stable so future documentation, analytics, and support workflows can link to them.

## Acceptance Mapping

Customer training becomes self-service when customers can browse and search training content at `/knowledge-base`, and the AI assistant uses that content first when answering onboarding, workflow, calculator, simulation, integration, AI agent, and troubleshooting questions.
