/**
 * Tier-B chat-assisted Dispatch Intelligence (calculators hub launch; no dedicated form).
 * Recommends assignments and prioritization — human dispatcher retains authority.
 */

export const DISPATCH_AI_TOOL_ID = 'dispatch-ai';

export const dispatchAiChatConfig = {
  toolId: DISPATCH_AI_TOOL_ID,
  name: 'Dispatch Intelligence',
  hubPath: '/tools/calculators',
  registryId: DISPATCH_AI_TOOL_ID,
  category: 'fleet',
  description:
    'Conversational dispatch decision support: vehicle assignment options, request prioritization, bottleneck review, and suggested actions. Does not auto-assign vehicles or override dispatcher judgment.',
  chatSeed: `Help me work through a fleet dispatch scenario using a guided, conversational workflow. You are decision support only — a human dispatcher must approve every assignment and action.

STEP 0 — Safety and authority (state up front)
- You do NOT have authority to assign vehicles, cancel trips, change ETAs in live systems, or override institutional dispatch policy.
- All recommendations are options for human review, not automated orders.
- If there is imminent patient harm, public-safety risk, or 911/emergency involvement, prioritize emergency protocols and escalation — do not delay urgent response to finish this chat.

Collect context in turn (ask clarifying questions if data is missing):

1) Open requests / jobs
   - List pending requests (pickup/delivery/service), locations, required arrival or completion windows, and special requirements (equipment, capacity, credentials).

2) Fleet availability snapshot
   - Available vs occupied vs maintenance vehicles, approximate location or zone, energy/fuel if relevant, driver shift limits.

3) Priorities and constraints
   - Clinical or operational priority (urgent / high / routine), SLA targets, traffic or weather notes, and any must-not-miss windows.

4) Known bottlenecks
   - Backlogged zones, repeated delays, maintenance holds, staffing gaps, or recurring late routes.

Then provide structured output:

A) Recommended vehicle assignment OPTIONS (rank 2–3 with pros/cons)
   - Match capacity, proximity, priority fit, and time windows
   - Flag mismatches (range, maintenance, driver hours)

B) Request prioritization queue
   - Ordered list with brief rationale (urgency, window risk, dependency chains)

C) Bottleneck indicators
   - What patterns suggest congestion or failure (e.g. zone saturation, slip risk)

D) Suggested dispatch ACTIONS for human approval
   - Examples: reassign idle unit, split batch, call ahead, defer low priority, escalate maintenance
   - Label each as "suggested — requires dispatcher approval"

Close with limitations: data may be incomplete; verify against Fleet Command / dispatch system of record before acting.`,
  guidedCriteria: [
    'open requests and time windows',
    'fleet availability snapshot',
    'priority and SLA constraints',
    'bottleneck patterns',
  ],
};
