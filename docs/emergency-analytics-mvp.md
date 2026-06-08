# Emergency Analytics MVP

## Goal

Provide measurable value for the Emergency Department MVP by proving adoption, workflow lift, and return on investment from the first pilot.

The analytics surface lives at:

- `/workspace/emergency/analytics`

## MVP Measurement Model

Track only adoption events that map to sellable Emergency Flow Starter value:

- Assessments completed: completed triage or reassessment workflows that produced a clinician-reviewable ED risk profile.
- Calculators used: qSOFA, NEWS2, HEART, Wells PE, Wells DVT, Shock Index, NIHSS, or other ED calculators launched from the workspace.
- Protocol retrievals: complaint-specific protocol or evidence lookups from the ED evidence/RAG surface.
- Workflow launches: ED workflow actions opened from command center cards, triage, evidence, automations, or route-specific guidance.
- AI requests: ED Copilot or Assistant requests sent with emergency workspace context.
- Simulation completion: ED simulation practice, debrief, or academy completion events.

## ROI Story

The MVP should convert usage into buyer-facing proof:

- Adoption: clinicians are repeatedly using the workspace instead of isolated tools.
- Standardization: calculator and protocol usage show safer, more consistent review patterns.
- Time savings: workflow launches and AI requests represent avoided tool hunting, repeated lookups, and manual drafting.
- Training lift: simulation completion shows follow-through from clinical gaps into practice.
- Expansion signal: high adoption of protocol retrieval, AI requests, or simulation completion supports add-on conversations for documentation, referral routing, and Simulation Academy.

## Analytics Route Requirements

`/workspace/emergency/analytics` should present:

- A metric card for each tracked event.
- ROI and adoption summaries that a buyer can understand without raw event export.
- Clear labels that distinguish demo/local pilot data from live integrated feeds.
- A human-review posture: analytics prove usage and workflow value, not autonomous clinical quality decisions.

## MVP Acceptance

The Emergency Analytics MVP is ready when:

- The route exists at `/workspace/emergency/analytics`.
- The route shows assessments completed, calculators used, protocol retrievals, workflow launches, AI requests, and simulation completion.
- The analytics copy explains ROI and adoption in ED buyer language.
- The metrics can run on local/demo data for a first pilot and later swap to live event feeds.
