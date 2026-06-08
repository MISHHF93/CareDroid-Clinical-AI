# Workflow Mining Engine Report

## Goal

The workflow mining engine learns how users actually use the CareDroid platform. It converts behavioral traces into evidence for UX improvements, product decisions, and workflow simplification.

## Route

Workflow mining is available at `/workflow-mining`.

## Analyzed Signals

The engine analyzes:

- Page transitions: ordered route movement across a user session.
- AI launches: assistant, agent, or AI-tool launches within a journey.
- Workflow launches: workflow builder, protocol, automation, and task-flow launches.
- Tool usage: calculator, clinical tool, dashboard, and operational tool interactions.
- Search behavior: search queries, repeated searches, zero-result searches, and searches followed by abandonment.

## Generated Output

The engine generates:

- Most Common User Journeys: ranked journey paths with frequency, conversion, and completion evidence.
- Friction: repeated searches, slow handoffs, high abandonment, or backtracking.
- Dead ends: paths that frequently terminate without a useful next action.
- Unnecessary clicks: loops, redundant page transitions, and repeated navigation hops before task completion.

## Journey Model

Each mined journey includes:

- `id`: stable journey identifier.
- `title`: human-readable journey name.
- `steps`: ordered page, search, AI, workflow, or tool events.
- `frequency`: observed journey count.
- `completionRate`: percent of journeys that reach a useful completion event.
- `frictionSignals`: evidence explaining where users struggle.
- `recommendations`: UX actions tied to observed behavior.

## Acceptance

UX improvements become evidence-based when CareDroid can show the most common journeys, explain where users get stuck, identify unnecessary clicks, and recommend concrete interface or workflow improvements grounded in behavioral data.

## Verification

Verification should cover:

- Page transitions, AI launches, workflow launches, tool usage, and search behavior are represented in the model.
- Most Common User Journeys are ranked by observed frequency.
- Friction, dead ends, and unnecessary clicks are generated.
- `/workflow-mining` renders journey evidence and UX recommendations.
