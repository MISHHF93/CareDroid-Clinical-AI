# AI Memory Fabric Report

## Summary

The AI Memory Fabric gives CareDroid a safe way to remember operational context across organizations, workspaces, roles, users, AI agents, and artifacts.

The fabric composes existing memory, identity, workspace, personalization, activity, artifact, tenant, permission, and audit systems. It keeps AI context useful while preventing memory from crossing tenant, workspace, permission, or artifact boundaries.

## Memory Types

| Memory Type | Purpose |
| --- | --- |
| Organization memory | Tenant-level patterns such as enabled assets, adoption signals, common searches, and successful workflows |
| Workspace memory | Active workspace context, visible assets, recent workspace tools, and workflow state |
| Role memory | Role profile, specialty, department, recommended assets, and repeated role-specific behavior |
| User memory | User preferences, pinned assets, recent assets, hidden assets, and profile settings |
| AI memory | Recent assistant context, AI personalization, agent/tool selection, saved prompts, and AI-safe summaries |
| Artifact memory | Recent or referenced artifact IDs, versions, tags, relationships, and catalog context |

## Stored Signals

The fabric stores and returns safe structured memory:

- Preferences: dashboard settings, tool preferences, AI response style, profile settings, and accessibility flags.
- Pinned assets: pinned tools, favorite tools, saved tools, and role-relevant assets.
- Recent assets: recently launched tools, calculators, dashboards, simulations, maps, IoT views, and AI agents.
- Successful workflows: saved workflow IDs, successful workflow launches, completed blocks, and workflow tags.
- Common searches: sanitized search metadata such as query length, filters, counts, tags, and repeated search categories.

Raw prompts, raw clinical notes, patient identifiers, raw search text, and cross-tenant IDs should not be included in default AI memory context.

## Guardrails

| Rule | Implementation Principle |
| --- | --- |
| Tenant isolated | Memory reads and writes are scoped to server-derived tenant context, not client-provided organization IDs |
| Permission aware | Memory context only includes assets, workflows, artifacts, and AI agents visible to the requesting user |
| Auditable | Memory writes and context reads are recorded through hash-chained audit logs |
| AI-safe | Assistant requests receive sanitized summaries and IDs rather than raw sensitive text |
| Artifact-safe | Artifact memory uses references, versions, tags, and relationships unless richer content is explicitly allowed |

## AI Context Contract

The AI-facing memory context should include:

- `organizationMemory`: organization id, tenant role, enabled pack/asset counts, common searches, and successful workflows.
- `workspaceMemory`: active workspace id, workspace label, visible assets, and recent workspace assets.
- `roleMemory`: role, role profile id, specialty, department, and role-fit assets.
- `userMemory`: preferences, pinned assets, recent assets, hidden assets, and saved workflows.
- `aiMemory`: recent conversations, AI personalization, selected agent/tool, and response preferences.
- `artifactMemory`: artifact references, tags, versions, and relationship graph hints.

## Acceptance

Acceptance is met when CareDroid AI can remember useful context for the active tenant, workspace, role, user, AI agent, and artifacts without leaking information across tenant boundaries or exposing memory the user cannot access.

Examples:

- A clinician’s assistant remembers pinned calculators and recent assets only inside the current tenant/workspace.
- A workspace assistant can suggest successful workflows used in the same workspace without showing unauthorized assets.
- A role-aware assistant can use common searches and role profile preferences without storing raw search text.
- An artifact-aware assistant can reference artifact IDs, versions, and tags without exposing unrelated artifact content.
- Memory reads and writes leave an audit trail with organization, workspace, scope, type, and resource metadata.
