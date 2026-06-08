# Progressive Disclosure Report

Date: 2026-06-08

## Goal

Do not show everything at once.

Normal users should see the primary operating shell:

- Dashboard
- Assistant
- Tools
- Operations
- Profile

Advanced functionality should appear only when it is relevant to the active workspace, recent behavior, favorites, recommendations, or explicit search intent. Admin functionality should remain separated from the normal user shell.

## Current State

| Area | Current Behavior | Progressive Disclosure Risk |
| --- | --- | --- |
| Sidebar | Shows Dashboard, Assistant, Tools, Operations, Profile, and Settings. | Settings makes the primary shell larger than the normal-user contract. |
| Dashboard | Shows Search, Recommendations, Tools, Workflows, Simulation, Operations, plus compression shortcuts. | Dashboard can become a second full navigation menu. |
| Command Palette | Indexes primary, solution, operations, advanced, admin, and account routes. | Hidden/admin routes can appear without relevance or permission context. |
| Global Search | Indexes broad navigation destinations and feature records. | Strong discovery, but needs disclosure filtering for admin and advanced routes. |
| Tools | Strong discovery surface; recently improved alias search. | Acceptable if Tools remains the canonical advanced clinical/tool discovery surface. |
| Operations | Primary hub plus drill-downs and operations intelligence. | Acceptable if operations intelligence stays inside Operations, not primary nav. |
| Settings/Admin | Settings includes organization/admin links. | Admin surface should be separated and permission-gated. |

## Progressive Disclosure Rules

1. Primary navigation contains only Dashboard, Assistant, Tools, Operations, and Profile.
2. Settings remains reachable from Profile/account context, not as a primary shell tab.
3. Admin destinations require explicit admin permissions before appearing in search or command results.
4. Advanced destinations are hidden from the primary shell and only appear through relevant hubs, search, favorites, recent activity, recommendations, or permissions.
5. Dashboard primary actions remain focused on normal-user destinations; advanced shortcuts move into compressed/contextual sections.
6. Operations-specific intelligence stays inside Operations.
7. Tools remains the broad discovery surface for clinical tools, calculators, simulations, protocols, and AI workflows.

## Implementation Plan

1. Remove Settings from the primary sidebar and mobile nav.
2. Add shared navigation exposure helpers for permission-aware command/search filtering.
3. Filter Quick Command destination entries using the shared exposure rules.
4. Filter global search navigation destination entries using the shared exposure rules.
5. Keep dashboard primary actions to normal-user destinations while leaving Search/Recommendations in contextual launch compression.
6. Gate Settings organization/platform links behind admin-like permissions.
7. Add tests for the five-item primary shell, command/search filtering, and admin separation.

## Expected Result

Normal users land in a calm five-destination shell. They can still find advanced capabilities through Tools, Operations, Assistant, Search, recommendations, favorites, and recents when those capabilities are relevant. Admin and platform controls are not mixed into the normal user journey.
